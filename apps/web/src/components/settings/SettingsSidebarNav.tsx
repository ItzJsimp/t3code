import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
} from "react";
import {
  ArchiveIcon,
  BotIcon,
  CalendarClockIcon,
  CpuIcon,
  createLucideIcon,
  FileDiffIcon,
  FlaskConicalIcon,
  FolderTreeIcon,
  GitBranchIcon,
  GlobeIcon,
  InfoIcon,
  KeyboardIcon,
  LifeBuoyIcon,
  MessageSquareTextIcon,
  MessageSquareWarningIcon,
  MessagesSquareIcon,
  MonitorIcon,
  PaletteIcon,
  PanelsTopLeftIcon,
  ScrollTextIcon,
  SearchIcon,
  ServerIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SmartphoneIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Kbd } from "../ui/kbd";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInput,
} from "../ui/sidebar";
import { SidebarUpdatePill } from "../sidebar/SidebarUpdatePill";
import { openStuck, STUCK_ENABLED } from "../community/stuckStore";
import { openReleaseHistoryDialog } from "../desktop/ReleaseHistoryDialog";
import { FEEDBACK_ENABLED } from "../feedback/feedbackRelay";
import { openFeedback } from "../feedback/feedbackStore";
import { scrollToSettingsTarget } from "./settingsLayout";
import {
  searchSettings,
  isSettingsOverviewVisible,
  SETTINGS_NAV_GROUPS,
  SETTINGS_SECTION_LABELS,
  type SettingsPath,
  type SettingsSearchItem,
} from "./settingsSearch";
import { useAvailableSettingsSearchItems } from "./useAvailableSettingsSearchItems";
import { validateSettingsScopeSearch } from "./settingsScope";

const SnapShotIcon = createLucideIcon("snap-shot", [
  [
    "path",
    {
      d: "M8 3H6a3 3 0 0 0-3 3v2M16 3h2a3 3 0 0 1 3 3v2M21 16v2a3 3 0 0 1-3 3h-2M8 21H6a3 3 0 0 1-3-3v-2",
      key: "capture-frame",
    },
  ],
  ["rect", { width: "10", height: "8", x: "7", y: "8", rx: "2", key: "window" }],
  ["circle", { cx: "12", cy: "12", r: "1.5", key: "lens" }],
]);

const T3ConnectSidebarSignIn = lazy(() =>
  import("../clerk/T3ConnectSidebarSignIn").then((module) => ({
    default: module.T3ConnectSidebarSignIn,
  })),
);
const T3ConnectSidebarAvatar = lazy(() =>
  import("../clerk/T3ConnectSidebarSignIn").then((module) => ({
    default: module.T3ConnectSidebarAvatar,
  })),
);

const SETTINGS_SECTION_ICONS: Readonly<
  Record<SettingsPath, ComponentType<{ className?: string }>>
> = {
  "/settings/general": Settings2Icon,
  "/settings/appearance": PaletteIcon,
  "/settings/chat": MessageSquareTextIcon,
  "/settings/diffs": FileDiffIcon,
  "/settings/projects": PanelsTopLeftIcon,
  "/settings/keybindings": KeyboardIcon,
  "/settings/snap-shot": SnapShotIcon,
  "/settings/providers": BotIcon,
  "/settings/models": CpuIcon,
  "/settings/threads": MessagesSquareIcon,
  "/settings/browser": GlobeIcon,
  "/settings/devices": SmartphoneIcon,
  "/settings/scheduled-tasks": CalendarClockIcon,
  "/settings/source-control": GitBranchIcon,
  "/settings/worktrees": FolderTreeIcon,
  "/settings/environments": ServerIcon,
  "/settings/access": ShieldCheckIcon,
  "/settings/maintenance": WrenchIcon,
  "/settings/labs": FlaskConicalIcon,
  "/settings/about": InfoIcon,
  "/settings/archived": ArchiveIcon,
};

// Detail pages without a nav entry highlight the page that links to them.
const SETTINGS_DETAIL_PAGE_PARENTS: Readonly<Record<string, SettingsPath>> = {
  "/settings/open-source-licenses": "/settings/about",
};

function SettingsSectionIcon({ to }: { to: SettingsPath }) {
  const Icon = SETTINGS_SECTION_ICONS[to];
  return <Icon className="mt-0.5 size-3.5 shrink-0 text-sidebar-muted-foreground/60" />;
}

// 44 px touch rows on phones, where `/settings` is the section list.
const ROW_CLASS_NAME = "max-md:h-11";

export function SettingsSidebarNav({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const currentHash = useLocation({ select: (location) => location.hash });
  const currentSearch = useLocation({ select: (location) => location.search });
  const scopeSearch = useMemo(() => validateSettingsScopeSearch(currentSearch), [currentSearch]);
  const navGroups = useMemo(
    () =>
      SETTINGS_NAV_GROUPS.map((group) => ({
        ...group,
        paths: group.paths.filter(
          (to) => to !== "/settings/projects" || isSettingsOverviewVisible(scopeSearch),
        ),
      })).filter((group) => group.paths.length > 0),
    [scopeSearch],
  );
  const activePath = SETTINGS_DETAIL_PAGE_PARENTS[pathname] ?? pathname;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  // Below md the nav is an icon rail; searching expands it over the page.
  const [compactSearchOpen, setCompactSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const searchableItems = useAvailableSettingsSearchItems(scopeSearch);
  const results = useMemo(() => searchSettings(query, searchableItems), [query, searchableItems]);
  const isSearching = query.trim().length > 0;
  const hasResults = results.length > 0;

  useEffect(() => {
    setActiveResultIndex((index) => Math.min(index, Math.max(results.length - 1, 0)));
  }, [results.length]);

  useEffect(() => {
    const result = results[activeResultIndex];
    if (!result) return;
    document
      .getElementById(`settings-search-result-${result.id}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeResultIndex, results]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const isFindShortcut =
        event.key.toLowerCase() === "f" &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey;
      const isSlashShortcut =
        event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!isFindShortcut && !isSlashShortcut) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        ((isSlashShortcut &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)) ||
          // Preserve dialog and popup focus traps, and let shortcut recorders
          // capture the keypress without moving focus into the sidebar search.
          // The settings modal itself is a dialog and owns these shortcuts.
          target.closest(
            '[role="dialog"]:not([data-app-modal]), [aria-modal="true"]:not([data-app-modal]), [data-slot$="popup"]:not([data-app-modal]), [data-keybinding-capture]',
          ) !== null)
      ) {
        return;
      }

      event.preventDefault();
      setCompactSearchOpen(true);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSectionClick = useCallback(
    (to: SettingsPath) => {
      void navigate({
        to,
        hash: "",
        // From the phone list, push so back returns to the list.
        replace: pathname !== "/settings",
        hashScrollIntoView: false,
      });
    },
    [navigate, pathname],
  );
  const clearSearch = useCallback(() => {
    setQuery("");
    setActiveResultIndex(0);
  }, []);
  const handleSearchResultClick = useCallback(
    (item: SettingsSearchItem) => {
      clearSearch();
      setCompactSearchOpen(false);
      const targetId = item.targetId ?? item.id;
      if (pathname === item.to && currentHash.replace(/^#/, "") === targetId) {
        scrollToSettingsTarget(targetId);
        return;
      }
      void navigate({
        to: item.to,
        hash: targetId,
        replace: pathname !== "/settings",
        hashScrollIntoView: false,
        state: { settingsTargetHighlight: true },
      });
    },
    [clearSearch, currentHash, navigate, pathname],
  );
  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape" && isSearching) {
        event.preventDefault();
        event.stopPropagation();
        clearSearch();
        return;
      }
      if (results.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveResultIndex((index) => (index + 1) % results.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveResultIndex((index) => (index - 1 + results.length) % results.length);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const result = results[activeResultIndex];
        if (result) handleSearchResultClick(result);
      }
    },
    [activeResultIndex, clearSearch, handleSearchResultClick, isSearching, results],
  );
  // Below md `/settings` is the full-width labeled list; a section hides the nav.
  const onPhoneList = pathname === "/settings";
  const expanded = compactSearchOpen || onPhoneList;
  const labelClassName = cn("truncate", !expanded && "max-md:sr-only");
  return (
    <nav
      aria-label="Settings sections"
      data-settings-nav=""
      className={cn(
        "flex w-60 shrink-0 flex-col border-e bg-sidebar text-sidebar-foreground",
        onPhoneList
          ? "max-md:w-full max-md:border-e-0"
          : compactSearchOpen
            ? "max-md:absolute max-md:inset-y-0 max-md:start-0 max-md:z-10 max-md:w-full"
            : "max-md:hidden",
      )}
    >
      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <div className="flex flex-col gap-2">
            <div
              className={cn(
                "flex h-8 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground",
                !expanded && "max-md:hidden",
              )}
            >
              <SearchIcon className="size-4 shrink-0 text-sidebar-muted-foreground/80" />
              <SidebarInput
                ref={searchInputRef}
                nativeInput
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.currentTarget.value);
                  setActiveResultIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setCompactSearchOpen(true)}
                onBlur={() => {
                  if (!isSearching) setCompactSearchOpen(false);
                }}
                placeholder="Search"
                aria-label="Search settings"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isSearching && hasResults}
                aria-controls={isSearching && hasResults ? "settings-search-results" : undefined}
                aria-activedescendant={
                  isSearching && results[activeResultIndex]
                    ? `settings-search-result-${results[activeResultIndex].id}`
                    : undefined
                }
                className="min-w-0 flex-1"
              />
              {isSearching ? (
                <Button
                  type="button"
                  size="icon-micro"
                  variant="ghost-muted"
                  className="shrink-0"
                  aria-label="Clear settings search"
                  onClick={() => {
                    clearSearch();
                    searchInputRef.current?.focus();
                  }}
                >
                  <XIcon className="size-3" />
                </Button>
              ) : (
                <Kbd>/</Kbd>
              )}
            </div>
            {isSearching && results.length === 0 ? (
              <p
                role="status"
                className="px-2 py-6 text-center text-xs text-sidebar-muted-foreground"
              >
                No settings found. Try other words.
              </p>
            ) : null}
            {isSearching ? (
              <SidebarMenu
                id={hasResults ? "settings-search-results" : undefined}
                role={hasResults ? "listbox" : undefined}
                aria-label={hasResults ? "Settings search results" : undefined}
              >
                {results.map((item, index) => (
                  <SidebarMenuItem key={item.id} role="presentation">
                    <SidebarMenuButton
                      id={`settings-search-result-${item.id}`}
                      role="option"
                      aria-selected={index === activeResultIndex}
                      tabIndex={-1}
                      size="sm"
                      isActive={index === activeResultIndex}
                      className="h-auto min-h-10 items-start"
                      onMouseMove={() => setActiveResultIndex(index)}
                      onClick={() => handleSearchResultClick(item)}
                    >
                      <SettingsSectionIcon to={item.to} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-sidebar-foreground">
                          {item.title}
                        </span>
                        <span className="block truncate text-2xs text-sidebar-muted-foreground/75">
                          {SETTINGS_SECTION_LABELS[item.to]}
                        </span>
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <>
                {expanded ? null : (
                  <SidebarMenu className="md:hidden">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        aria-label="Search settings"
                        onClick={() => setCompactSearchOpen(true)}
                      >
                        <SearchIcon />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                )}
                {navGroups.map((group, index) => (
                  <div
                    key={group.heading ?? index}
                    data-settings-nav-group={group.heading ?? ""}
                    className="flex flex-col gap-0.5 max-md:border-t max-md:border-sidebar-border max-md:pt-2 max-md:first:border-t-0 max-md:first:pt-0"
                  >
                    {group.heading ? (
                      <p
                        className={cn(
                          "px-2 pt-2 pb-1 text-2xs font-medium tracking-wide text-sidebar-muted-foreground uppercase",
                          !expanded && "max-md:hidden",
                        )}
                      >
                        {group.heading}
                      </p>
                    ) : null}
                    <SidebarMenu>
                      {group.paths.map((to) => {
                        const Icon = SETTINGS_SECTION_ICONS[to];
                        const isActive = activePath === to || activePath.startsWith(`${to}/`);
                        return (
                          <SidebarMenuItem key={to}>
                            <SidebarMenuButton
                              data-settings-section={to}
                              className={ROW_CLASS_NAME}
                              isActive={isActive}
                              aria-current={isActive ? "page" : undefined}
                              onClick={() => handleSectionClick(to)}
                            >
                              <Icon />
                              <span className={labelClassName}>{SETTINGS_SECTION_LABELS[to]}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                      {index === navGroups.length - 1 ? (
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            className={ROW_CLASS_NAME}
                            isActive={pathname === "/system-care"}
                            onClick={() => void navigate({ to: "/system-care" })}
                          >
                            <MonitorIcon />
                            <span className={labelClassName}>This PC</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ) : null}
                    </SidebarMenu>
                  </div>
                ))}
                <div className="flex flex-col gap-0.5 max-md:border-t max-md:border-sidebar-border max-md:pt-2">
                  <p
                    className={cn(
                      "px-2 pt-2 pb-1 text-2xs font-medium tracking-wide text-sidebar-muted-foreground uppercase",
                      !expanded && "max-md:hidden",
                    )}
                  >
                    Help
                  </p>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        className={ROW_CLASS_NAME}
                        onClick={openReleaseHistoryDialog}
                      >
                        <ScrollTextIcon />
                        <span className={labelClassName}>What changed</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {STUCK_ENABLED ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          className={ROW_CLASS_NAME}
                          onClick={() => openStuck("button")}
                        >
                          <LifeBuoyIcon />
                          <span className={labelClassName}>I&apos;m stuck</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : null}
                    {FEEDBACK_ENABLED ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          className={ROW_CLASS_NAME}
                          onClick={() => openFeedback({ source: "sidebar" })}
                        >
                          <MessageSquareWarningIcon />
                          <span className={labelClassName}>Send feedback</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : null}
                  </SidebarMenu>
                </div>
              </>
            )}
          </div>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="max-md:hidden">
        <Suspense fallback={null}>
          <T3ConnectSidebarSignIn />
        </Suspense>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <SidebarMenu className="flex-row flex-wrap items-center">
              <SidebarUpdatePill />
            </SidebarMenu>
          </div>
          <Suspense fallback={null}>
            <T3ConnectSidebarAvatar />
          </Suspense>
        </div>
      </SidebarFooter>
    </nav>
  );
}
