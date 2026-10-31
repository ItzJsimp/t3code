import {
  Navigate,
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronLeftIcon, ExternalLinkIcon, PanelsTopLeftIcon, RotateCcwIcon } from "lucide-react";
import { useIsMobile } from "../hooks/useMediaQuery";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Tooltip, TooltipTrigger, TooltipPopup } from "../components/ui/tooltip";
import { toastManager } from "../components/ui/toast";
import { SETTINGS_DOCK_MESSAGE, SETTINGS_WINDOW_NAME } from "../components/settings/settingsWindow";
import { useSettingsRestore } from "../components/settings/SettingsPanels";

import { SettingsBreadcrumb } from "../components/settings/SettingsBreadcrumb";
import { AppRouteModal, AppRouteModalClose } from "../components/AppRouteModal";
import { SettingsSidebarNav } from "../components/settings/SettingsSidebarNav";
import { resolveLegacySettingsRedirect } from "../components/settings/legacySettingsRoutes";
import { useNavigateToMainApp } from "../components/sidebar/mainAppLocation";
import {
  SettingsScopeProvider,
  useSettingsScope,
} from "../components/settings/SettingsScopeContext";
import { useEnvironments } from "../state/environments";
import { SettingsScopeNotice } from "../components/settings/SettingsScopeNotice";
import { SETTINGS_DEVICE_ONLY_PATHS } from "../components/settings/SettingsScopeSentence";
import { SettingsPageContainer } from "../components/settings/settingsLayout";
import {
  retainSettingsScope,
  validateSettingsRouteSearch,
} from "../components/settings/settingsScopeNavigation";
import {
  getSettingsSearchTargetScope,
  getThreadAutoSettlementSearchAvailability,
  isSettingsSearchScopeAvailable,
} from "../components/settings/settingsSearch";

function RestoreDeviceDefaultsButton({ onRestored }: { onRestored: () => void }) {
  const { changedSettingLabels, restoreDefaults } = useSettingsRestore(onRestored);
  return (
    <Button
      size="xs"
      variant="ghost"
      aria-label="Restore device defaults"
      disabled={changedSettingLabels.length === 0}
      onClick={() => void restoreDefaults()}
    >
      <RotateCcwIcon className="mx-1 size-3.5" />
      <span className="hidden md:inline">Restore device defaults</span>
    </Button>
  );
}

function SettingsScopeBoundary({ pathname, children }: { pathname: string; children: ReactNode }) {
  const { scope, connectedEnvironments } = useSettingsScope();
  const { environments } = useEnvironments();
  const hash = useLocation({ select: (location) => location.hash });
  const searchTarget = getSettingsSearchTargetScope(hash);
  const autoSettlementAvailability = searchTarget?.requiresThreadAutoSettlement
    ? getThreadAutoSettlementSearchAvailability(environments, scope)
    : null;
  if (
    scope.kind !== "unavailable" &&
    searchTarget &&
    autoSettlementAvailability &&
    !autoSettlementAvailability.isTargetAvailable
  ) {
    return (
      <SettingsScopeNotice
        target="environment"
        targetId={hash}
        eligibleEnvironmentIds={autoSettlementAvailability.eligibleEnvironmentIds}
      >
        {autoSettlementAvailability.eligibleEnvironmentIds.length > 0
          ? `${searchTarget.title} requires a supporting computer. Choose one to continue.`
          : `${searchTarget.title} requires a supporting computer. Connect or update a computer to continue.`}
      </SettingsScopeNotice>
    );
  }
  if (
    scope.kind !== "unavailable" &&
    searchTarget &&
    !isSettingsSearchScopeAvailable(searchTarget.scope, scope.kind)
  ) {
    const target =
      searchTarget.scope === "environment" ||
      searchTarget.scope === "project" ||
      searchTarget.scope === "checkout"
        ? searchTarget.scope
        : "all";
    return (
      <SettingsScopeNotice target={target} targetId={hash}>
        {`${searchTarget.title} is not available for the selected target. Choose its owning scope to continue.`}
      </SettingsScopeNotice>
    );
  }
  // Device-local pages ignore the scope entirely; the project page follows
  // remembered members while a grouping change replaces its URL key.
  if (SETTINGS_DEVICE_ONLY_PATHS.has(pathname) || pathname === "/settings/projects") {
    return children;
  }
  // Keep the scope sentence on screen so the selection can be changed back.
  if (scope.kind === "unavailable")
    return (
      <SettingsPageContainer>
        <p className="text-sm text-muted-foreground">{scope.message}</p>
      </SettingsPageContainer>
    );
  if (scope.kind === "environment" && connectedEnvironments.length === 0) {
    return (
      <SettingsPageContainer>
        <p className="text-sm text-muted-foreground">
          Reconnect {scope.label} to change its settings.
        </p>
      </SettingsPageContainer>
    );
  }
  return children;
}

function SettingsContentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const navigateToMainApp = useNavigateToMainApp();
  const { search, environment } = useSettingsScope();
  // Phones: /settings is the labeled section list, a section path is its page.
  const onPhoneList = isMobile && location.pathname === "/settings";
  const contentScopeKey =
    location.pathname === "/settings/providers"
      ? environment?.environmentId
      : JSON.stringify(search);
  const [restoreSignal, setRestoreSignal] = useState(0);
  const detached = window.name === SETTINGS_WINDOW_NAME;
  const toggleSettingsWindow = () => {
    if (detached && (!window.opener || window.opener.closed)) {
      window.name = "";
      void navigateToMainApp();
      return;
    }
    if (detached && window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: SETTINGS_DOCK_MESSAGE, href: window.location.href },
        window.location.origin === "null" ? "*" : window.location.origin,
      );
      window.opener.focus();
      window.close();
      return;
    }
    const settingsWindow = window.open(
      window.location.href,
      SETTINGS_WINDOW_NAME,
      "popup,width=1100,height=800",
    );
    if (!settingsWindow) {
      toastManager.add({
        type: "warning",
        title: "Settings window was blocked",
        description: "Allow popups for Leonidas, then try again.",
      });
      return;
    }
    settingsWindow.focus();
    void navigateToMainApp();
  };

  if (!isMobile && location.pathname === "/settings") {
    return <Navigate to="/settings/general" replace />;
  }

  return (
    <AppRouteModal label="Settings" fullWindow={detached}>
      <div className="relative flex min-h-0 flex-1">
        <SettingsSidebarNav pathname={location.pathname} />
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", onPhoneList && "max-md:hidden")}>
          <header className="flex h-12 shrink-0 items-center gap-3 border-b ps-2 pe-2 md:ps-5">
            <Button
              size="xs"
              variant="ghost"
              className="md:hidden"
              aria-label="Back to settings sections"
              onClick={() => void navigate({ to: "/settings" })}
            >
              <ChevronLeftIcon className="size-3.5" />
              Settings
            </Button>
            <div className="min-w-0 flex-1 overflow-hidden">
              <SettingsBreadcrumb pathname={location.pathname} />
            </div>
            <div className="ms-auto flex shrink-0 items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={toggleSettingsWindow}
                      aria-label={
                        detached
                          ? "Move settings back to the main window"
                          : "Open settings in a separate window"
                      }
                    >
                      {detached ? (
                        <PanelsTopLeftIcon className="size-3.5" />
                      ) : (
                        <ExternalLinkIcon className="size-3.5" />
                      )}
                      <span className="hidden lg:inline">
                        {detached ? "Move settings back" : "Separate window"}
                      </span>
                    </Button>
                  }
                />
                <TooltipPopup>
                  {detached
                    ? "Move settings back to the main window"
                    : "Open settings in a separate window"}
                </TooltipPopup>
              </Tooltip>
              {location.pathname === "/settings/general" ? (
                <RestoreDeviceDefaultsButton
                  onRestored={() => setRestoreSignal((value) => value + 1)}
                />
              ) : null}
              {detached ? null : <AppRouteModalClose />}
            </div>
          </header>
          <div key={`${contentScopeKey}:${restoreSignal}`} className="min-h-0 flex flex-1 flex-col">
            <SettingsScopeBoundary pathname={location.pathname}>
              <Outlet />
            </SettingsScopeBoundary>
          </div>
        </div>
      </div>
    </AppRouteModal>
  );
}

function SettingsRouteLayout() {
  const rawSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  return (
    <SettingsScopeProvider
      search={rawSearch}
      singleEnvironment={pathname === "/settings/providers"}
      onChange={(next) => {
        // Send every axis so the retain middleware sees an explicit target
        // even when the choice is "all", which is the absence of a key.
        void navigate({
          to: pathname,
          search: () => ({
            project: next.project,
            machine: next.machine,
            checkout: next.checkout,
          }),
          hash: "",
          resetScroll: false,
        });
      }}
    >
      <SettingsContentLayout />
    </SettingsScopeProvider>
  );
}

export const Route = createFileRoute("/_chat/settings")({
  validateSearch: validateSettingsRouteSearch,
  search: { middlewares: [retainSettingsScope] },
  beforeLoad: ({ location }) => {
    // Phones keep /settings as the section list, see SettingsContentLayout.
    if (location.pathname === "/settings" && !window.matchMedia("(max-width: 767px)").matches) {
      throw redirect({ to: "/settings/general", replace: true });
    }
    // Old pages were split by concern: keep their links working, with the search and hash.
    const legacyTarget = resolveLegacySettingsRedirect(location.pathname, location.hash);
    if (legacyTarget) {
      throw redirect({
        href: `${legacyTarget}${location.searchStr}${location.hash ? `#${location.hash.replace(/^#/, "")}` : ""}`,
        replace: true,
      });
    }
  },
  component: SettingsRouteLayout,
});
