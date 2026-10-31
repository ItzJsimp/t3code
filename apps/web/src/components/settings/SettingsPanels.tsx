import { CacheSettings } from "./CacheSettings";
import { OWN_YOUR_BRAIN_LINE } from "../../onboarding/ownYourBrain";
import { ApiKeysSettings } from "./ApiKeysSettings";
import { LeaderboardSettings } from "./LeaderboardSettings";
import { UsageAnalyticsSettings } from "./UsageAnalyticsSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import { FoldedSettingsSection } from "./FoldedSettingsSection";
import { StorageSections } from "./StorageSettings";
import { SkillFoldersEditor } from "./SkillFoldersEditor";
import { useSkillFoldersMirror } from "./useSkillFoldersMirror";
import { ResetSectionButton } from "./ResetSectionButton";
import { LoginItemSettings } from "./LoginItemSettings";
import { ReasoningEffortSettings } from "./ReasoningEffortSettings";
import { SettingsBackupSettings } from "./SettingsBackupSettings";
import { SettingsGroup } from "./SettingsGroup";
import { useScopedSettingsWriteAllowed } from "./useScopedSettings";
import { Spinner } from "~/components/ui/spinner";
import {
  NotificationQuietHoursSettings,
  NotificationSettings,
  NotificationVolumeSettings,
  UsageWarningSettings,
} from "./NotificationSettings";
import { PRIVACY_POLICY_URL } from "../../legalLinks";
import { ArchiveIcon, ArchiveX, CheckIcon, ChevronRightIcon, SettingsIcon } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type BackgroundActivityProfile,
  type DesktopUpdateChannel,
  ProviderDriverKind,
  type ProviderInstanceId,
  type ScopedThreadRef,
  type SidebarProjectGroupingMode,
} from "@t3tools/contracts";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { presentThreadShell } from "@t3tools/client-runtime/state/shell";
import {
  isAtomCommandInterrupted,
  settlePromise,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import {
  DEFAULT_ENVIRONMENT_IDENTIFICATION_MODE,
  DEFAULT_UNIFIED_SETTINGS,
  type ChatWidth,
  type DiffLayout,
  type EnvironmentIdentificationMode,
  MAX_APPEARANCE_CONTRAST,
  MAX_CODE_FONT_SIZE,
  MAX_GLASS_OPACITY,
  MAX_INTERFACE_FONT_SIZE,
  MAX_PANEL_ANIMATION_DURATION_MS,
  MAX_PROMPT_FONT_SIZE,
  MAX_SIDEBAR_AUTO_SETTLE_AFTER_DAYS,
  MAX_TERMINAL_FONT_SIZE,
  MIN_CODE_FONT_SIZE,
  MIN_APPEARANCE_CONTRAST,
  MIN_GLASS_OPACITY,
  MIN_INTERFACE_FONT_SIZE,
  MIN_PANEL_ANIMATION_DURATION_MS,
  MIN_PROMPT_FONT_SIZE,
  MIN_SIDEBAR_AUTO_SETTLE_AFTER_DAYS,
  type ResponseStreamingMode,
  MIN_TERMINAL_FONT_SIZE,
  type QuitConfirmationMode,
  SidebarProjectSortOrder,
} from "@t3tools/contracts/settings";
import { resolveServerBackgroundActivitySettings } from "@t3tools/shared/backgroundActivitySettings";
import { EFFICIENCY_PROFILES } from "@t3tools/shared/efficiencyProfile";
import { createModelSelection } from "@t3tools/shared/model";
import { EFFECTIVE_SERVER_SETTINGS_DEFAULTS } from "@t3tools/shared/serverSettings";
import * as Duration from "effect/Duration";
import * as Equal from "effect/Equal";
import * as Schema from "effect/Schema";
import { APP_VERSION_LABEL, HOSTED_APP_CHANNEL, HOSTED_APP_CHANNEL_LABEL } from "../../branding";
import { IS_NIGHTLY_BUILD, NightlyMobileBetaRow } from "../NightlyMobileBeta";
import { CliCommandSettingsRow } from "./CliCommandSettingsRow";
import { DictationTriggerSettings } from "./DictationTriggerSettings";
import { VoiceSettingsRow } from "./VoiceSettingsRow";
import { WallpaperSettings } from "./WallpaperSettings";
import {
  canCheckForUpdate,
  getDesktopUpdateButtonTooltip,
  getDesktopUpdateInstallConfirmationMessage,
  isDesktopUpdateButtonDisabled,
  resolveDesktopUpdateButtonAction,
} from "../../components/desktopUpdate.logic";
import { checkForDesktopUpdateWithFeedback } from "../desktopUpdate.toast";
import { requestWhatsNewPreview } from "../desktop/whatsNewPreview";
import { ReleaseHistoryButton } from "../desktop/ReleaseHistoryButton";
import { ProviderModelPicker } from "../chat/ProviderModelPicker";
import { TraitsPicker } from "../chat/TraitsPicker";
import {
  resolveEnvironmentIdentificationPillLabel,
  useEnvironmentStageLabel,
} from "../SidebarStageBackdrop";
import { isElectron } from "../../env";
import { buildHostedChannelSelectionUrl, type HostedAppChannel } from "../../hostedPairing";
import { useCustomThemes } from "../../hooks/useCustomThemes";
import {
  readAppearanceModePreference,
  readThemeHalves,
  readThemePreference,
  useTheme,
} from "../../hooks/useTheme";
import { DEFAULT_LEONIDAS_GLOW_STRENGTH, useLeonidasAtmosphere } from "../../leonidasAtmosphere";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import {
  useScopedSettings,
  useScopedSettingsMixed,
  useUpdateScopedSettings,
} from "./useScopedSettings";
import { useScopedModelDisabledReason } from "./useScopedModelAvailability";
import { useSettingsScope } from "./SettingsScopeContext";
import { ProjectDefaultsSettings } from "./ProjectDefaultsSettings";
import { PromptPredictionSettings } from "./PromptPredictionSettings";
import { SnoozePresetsRow } from "./SnoozePresetsSettings";
import { ThreadTitleInstructionsSettings } from "./ThreadTitleInstructionsSettings";
import { useThreadActions } from "../../hooks/useThreadActions";
import { useDesktopUpdateState, useUpdateWhenSafeStore } from "../../state/desktopUpdate";
import {
  getCustomModelOptionsByInstance,
  resolveAppModelSelectionState,
  selectsPlanAgent,
} from "../../modelSelection";
import {
  applyProviderInstanceSettings,
  deriveProviderInstanceEntries,
  sortProviderInstanceEntries,
} from "../../providerInstances";
import { ensureLocalApi, readLocalApi } from "../../localApi";
import { isMacPlatform } from "../../lib/utils";
import { EMPTY_SERVER_PROVIDERS } from "../../state/server";
import { useArchivedThreadSnapshots } from "../../lib/archivedThreadsState";
import { formatRelativeTimeLabel } from "../../timestampFormat";
import { Button } from "../ui/button";
import { setOnboardingSimActive } from "../onboarding/sim/onboardingSim.flag";
import { startSetupPreview } from "../../onboarding/setupPreview";
import {
  EMPTY_SETUP_STATE,
  SETUP_STATE_STORAGE_KEY,
  SetupStateSchema,
  brainScore,
  openSetupItems,
} from "../../onboarding/setupState.logic";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { DraftInput } from "../ui/draft-input";
import { SubagentModelPicker } from "./SubagentModelPicker";
import { Input } from "../ui/input";
import {
  DEFAULT_CODE_FONT_STACK,
  DEFAULT_SANS_FONT_STACK,
  isFontFamilyAvailable,
  isMonospaceFamily,
  resolveDefaultFamilyLabel,
  resolveTerminalFontPreference,
  resolveTerminalFontSizePreference,
  TYPOGRAPHY_ADVANCED_STORAGE_KEY,
} from "../../appearanceFonts";
import { CodeFontPreview, PromptFontPreview, TerminalFontPreview } from "./SettingsFontPreviews";
import { discoverInstalledFonts, FontFamilyPicker, useFontEnumeration } from "./FontFamilyPicker";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "../ui/number-field";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { ScopedSwitch } from "./ScopedSwitch";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { ThemeLibrary } from "./ThemeSettings";
import {
  backgroundActivityOverrideSettings,
  backgroundActivitySharedPolicySettings,
  durationToSeconds,
  getChangedBrowserSettingLabels,
  getChangedTypographySettingLabels,
  normalizeIntervalSeconds,
  PROVIDER_HEALTH_INTERVAL_STEP_SECONDS,
  hasChangedBackgroundActivitySettings,
  isProjectGroupingEnabled,
  projectGroupingModeFromToggle,
  readLastEnabledProjectGroupingMode,
  rememberEnabledProjectGroupingMode,
  resolveBackgroundActivityProfileOption,
} from "./SettingsPanels.logic";
import {
  PolicyTooltip,
  SETTINGS_PICKER_TRIGGER_CLASSNAME,
  SettingResetButton,
  SettingsPageContainer,
  SettingsRow,
  SettingsSection,
  useSettingsSearchTarget,
  useSettingsSearchTargetId,
} from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import { ProjectFavicon } from "../ProjectFavicon";
import { PanelAnimationsPreview } from "./PanelAnimationsPreview";
import { userErrorToastFields } from "~/lib/userErrorToast";

const ENVIRONMENT_IDENTIFICATION_LABELS: Record<EnvironmentIdentificationMode, string> = {
  artwork: "Artwork",
  pill: "Version label",
  none: "None",
};

const RESPONSE_STREAMING_MODE_LABELS: Record<ResponseStreamingMode, string> = {
  turn: "Wait for the full reply",
  paragraph: "Show finished paragraphs",
};

const RESPONSE_STREAMING_MODE_DESCRIPTIONS: Record<ResponseStreamingMode, string> = {
  turn: "Text appears when the AI finishes its reply.",
  paragraph: "Each paragraph or code block appears as soon as it is complete.",
};

const SIDEBAR_PROJECT_SORT_ORDER_LABELS: Record<SidebarProjectSortOrder, string> = {
  updated_at: "Last message from you",
  created_at: "Date created",
  manual: "Manual",
};
const isSidebarProjectSortOrder = Schema.is(SidebarProjectSortOrder);

const TIMESTAMP_FORMAT_LABELS = {
  locale: "System default",
  "12-hour": "12-hour",
  "24-hour": "24-hour",
} as const;

const CHAT_WIDTH_LABELS: Record<ChatWidth, string> = {
  comfortable: "Comfortable",
  wide: "Wide",
  full: "Full",
};

const DIFF_LAYOUT_LABELS: Record<DiffLayout, string> = {
  stacked: "Stacked",
  split: "Split",
};

const QUIT_CONFIRMATION_MODE_LABELS: Record<QuitConfirmationMode, string> = {
  direct: "Direct",
  hold: "Hold",
  "double-click": "Double press",
};

const BACKGROUND_ACTIVITY_PROFILE_LABELS: Record<BackgroundActivityProfile, string> = {
  balanced: "Balanced",
  performance: "Performance",
  "battery-saver": "Battery saver",
};

type BackgroundActivityProfileOption = BackgroundActivityProfile | "advanced";

const BACKGROUND_ACTIVITY_PROFILE_OPTION_LABELS: Record<BackgroundActivityProfileOption, string> = {
  ...BACKGROUND_ACTIVITY_PROFILE_LABELS,
  advanced: "Advanced",
};

const BACKGROUND_ACTIVITY_PROFILE_DESCRIPTIONS: Record<BackgroundActivityProfile, string> = {
  balanced:
    "Pauses background checks when you are away, the computer is locked, or it is in low power mode.",
  performance: "Lets background checks run while any device is connected.",
  "battery-saver": "Also pauses background checks when a computer or device runs on battery.",
};

const ADVANCED_BACKGROUND_ACTIVITY_DESCRIPTION = "Uses your own times.";

const DEFAULT_DRIVER_KIND = ProviderDriverKind.make("codex");
const BACKGROUND_ACTIVITY_BOOLEAN_OVERRIDES: ReadonlyArray<{
  readonly key:
    | "pauseWhenHostLocked"
    | "pauseWhenHostLowPower"
    | "pauseWhenClientLowPower"
    | "pauseWhenOnBattery";
  readonly label: string;
}> = [
  { key: "pauseWhenHostLocked", label: "Pause when the computer is locked" },
  { key: "pauseWhenHostLowPower", label: "Pause when the computer is in low power mode" },
  { key: "pauseWhenClientLowPower", label: "Pause when the device is in low power mode" },
  { key: "pauseWhenOnBattery", label: "Pause on battery" },
];

function resetBackgroundActivitySettings() {
  return {
    backgroundActivity: DEFAULT_UNIFIED_SETTINGS.backgroundActivity,
  };
}

function backgroundActivityProfileSettings(profile: BackgroundActivityProfile) {
  return {
    backgroundActivity: {
      schemaVersion: 1 as const,
      profile,
      overrides: {},
    },
  };
}

function AboutVersionTitle() {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span>Version</span>
      <code className="text-2xs font-medium text-muted-foreground">{APP_VERSION_LABEL}</code>
    </span>
  );
}

/** Dev only: replay first-run setup as a brand-new user with one click. */
function NewUserSetupPreviewRow() {
  const [setup] = useLocalStorage(SETUP_STATE_STORAGE_KEY, EMPTY_SETUP_STATE, SetupStateSchema);
  const status =
    setup.startedAt === null
      ? "Setup not run yet on this browser."
      : `Now: brain strength ${brainScore(setup)} / 100, ${openSetupItems(setup).length} steps open, tour ${setup.tourSeen ? "seen" : "not seen"}.`;
  return (
    <SettingsRow
      title="Preview new-user setup"
      description={`Walk through the 3 setup screens, the tour and the checklist as a new user. Nothing is saved, and your setup comes back when you end the preview. ${status} Dev builds only.`}
      control={
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              startSetupPreview();
              // A full load makes every screen start from the fresh preview state.
              window.location.assign("/welcome");
            }}
          >
            Walk through new setup
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOnboardingSimActive(true)}>
            Old wizard test
          </Button>
        </div>
      }
    />
  );
}

function AboutVersionSection() {
  const autoUpdateWhenSafe = useUpdateWhenSafeStore((store) => store.autoUpdateWhenSafe);
  const setAutoUpdateWhenSafe = useUpdateWhenSafeStore((store) => store.setAutoUpdateWhenSafe);
  const updateState = useDesktopUpdateState();
  const [isChangingUpdateChannel, setIsChangingUpdateChannel] = useState(false);
  const [isUpdateActionPending, setIsUpdateActionPending] = useState(false);

  const hasDesktopBridge = typeof window !== "undefined" && Boolean(window.desktopBridge);
  const selectedUpdateChannel = updateState?.channel ?? "latest";
  const selectedHostedAppChannel = hasDesktopBridge ? null : HOSTED_APP_CHANNEL;
  // Show the beta app links as soon as someone picks Nightly, before the update installs.
  const showNightlyMobileBeta =
    IS_NIGHTLY_BUILD || (hasDesktopBridge && selectedUpdateChannel === "nightly");

  const handleUpdateChannelChange = useCallback(
    (channel: DesktopUpdateChannel) => {
      const bridge = window.desktopBridge;
      if (
        !bridge ||
        typeof bridge.setUpdateChannel !== "function" ||
        channel === selectedUpdateChannel
      ) {
        return;
      }

      setIsChangingUpdateChannel(true);
      void bridge
        .setUpdateChannel(channel)
        .catch((error: unknown) => {
          toastManager.add(
            stackedThreadToast({
              type: "error",
              title: "Could not change the update type",
              ...userErrorToastFields(error),
            }),
          );
        })
        .finally(() => {
          setIsChangingUpdateChannel(false);
        });
    },
    [selectedUpdateChannel],
  );

  const handleButtonClick = useCallback(async () => {
    const bridge = window.desktopBridge;
    if (!bridge) return;

    const action = updateState ? resolveDesktopUpdateButtonAction(updateState) : "none";

    if (action === "download") {
      void bridge.downloadUpdate().catch((error: unknown) => {
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Could not download update",
            ...userErrorToastFields(error),
          }),
        );
      });
      return;
    }

    if (action === "install") {
      if (isUpdateActionPending) return;
      setIsUpdateActionPending(true);
      let confirmed = false;
      try {
        confirmed = await ensureLocalApi().dialogs.confirm(
          getDesktopUpdateInstallConfirmationMessage(
            updateState ?? { availableVersion: null, downloadedVersion: null },
          ),
        );
      } catch (error) {
        setIsUpdateActionPending(false);
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Could not confirm update",
            ...userErrorToastFields(error),
          }),
        );
        return;
      }
      if (!confirmed) {
        setIsUpdateActionPending(false);
        return;
      }
      void bridge
        .installUpdate()
        .catch((error: unknown) => {
          toastManager.add(
            stackedThreadToast({
              type: "error",
              title: "Could not install update",
              ...userErrorToastFields(error),
            }),
          );
        })
        .finally(() => setIsUpdateActionPending(false));
      return;
    }

    if (typeof bridge.checkForUpdate !== "function") return;
    void checkForDesktopUpdateWithFeedback(bridge)
      .then((result) => {
        if (!result.checked) {
          toastManager.add(
            stackedThreadToast({
              type: "error",
              title: "Could not check for updates",
              description:
                result.state.message ??
                "This version of Leonidas cannot update by itself. Download the new version from the website.",
            }),
          );
        }
      })
      .catch((error: unknown) => {
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Could not check for updates",
            ...userErrorToastFields(error),
          }),
        );
      });
  }, [isUpdateActionPending, updateState]);

  const action = updateState ? resolveDesktopUpdateButtonAction(updateState) : "none";
  const buttonTooltip = updateState ? getDesktopUpdateButtonTooltip(updateState) : null;
  const buttonDisabled =
    action === "none"
      ? !canCheckForUpdate(updateState)
      : isDesktopUpdateButtonDisabled(updateState);

  const actionLabel: Record<string, string> = { download: "Download", install: "Install" };
  const statusLabel: Record<string, string> = {
    checking: "Checking…",
    downloading: "Downloading…",
    "up-to-date": "Up to date",
  };
  const buttonLabel =
    actionLabel[action] ?? statusLabel[updateState?.status ?? ""] ?? "Check for updates";
  const description =
    action === "download" || action === "install"
      ? "Update available."
      : "This is the current version of Leonidas.";

  return (
    <>
      <SettingsRow
        id={searchableSetting("app-version").id}
        title={<AboutVersionTitle />}
        description={description}
        control={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={buttonDisabled || isUpdateActionPending}
                  onClick={handleButtonClick}
                >
                  {buttonLabel}
                </Button>
              }
            />
            {buttonTooltip ? <TooltipPopup>{buttonTooltip}</TooltipPopup> : null}
          </Tooltip>
        }
      />
      <SettingsRow
        title="What is new"
        description="Read the latest update notes. Open a guided chat for any change."
        control={
          <Button size="sm" variant="outline" onClick={requestWhatsNewPreview}>
            Preview
          </Button>
        }
      />
      {import.meta.env.DEV ? <NewUserSetupPreviewRow /> : null}
      {hasDesktopBridge ? (
        <SettingsRow
          title="Install updates when the AI finishes"
          description="Restart this device by itself when an update is ready and no AI work runs."
          control={
            <Switch
              checked={autoUpdateWhenSafe}
              onCheckedChange={setAutoUpdateWhenSafe}
              aria-label="Install updates when the AI finishes"
            />
          }
        />
      ) : null}
      {hasDesktopBridge ? (
        <SettingsRow
          {...searchableSetting("update-track")}
          description="Use stable updates or nightly updates. You can switch back at any time."
          control={
            <Select
              value={selectedUpdateChannel}
              onValueChange={(value) => {
                handleUpdateChannelChange(value as DesktopUpdateChannel);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-40"
                aria-label="Update type"
                disabled={isChangingUpdateChannel}
              >
                <SelectValue>
                  {selectedUpdateChannel === "nightly" ? "Nightly" : "Stable"}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup align="end" alignItemWithTrigger={false}>
                <SelectItem hideIndicator value="latest">
                  Stable
                </SelectItem>
                <SelectItem hideIndicator value="nightly">
                  Nightly
                </SelectItem>
              </SelectPopup>
            </Select>
          }
        />
      ) : selectedHostedAppChannel ? (
        <SettingsRow
          {...searchableSetting("update-track")}
          description="Changes which version of the hosted app you get."
          control={
            <Select
              value={selectedHostedAppChannel}
              onValueChange={(value) => {
                if (value === selectedHostedAppChannel) return;
                window.location.assign(
                  buildHostedChannelSelectionUrl({ channel: value as HostedAppChannel }),
                );
              }}
            >
              <SelectTrigger size="sm" className="w-full sm:w-40" aria-label="Update type">
                <SelectValue>{HOSTED_APP_CHANNEL_LABEL}</SelectValue>
              </SelectTrigger>
              <SelectPopup align="end" alignItemWithTrigger={false}>
                <SelectItem hideIndicator value="latest">
                  Latest
                </SelectItem>
                <SelectItem hideIndicator value="nightly">
                  Nightly
                </SelectItem>
              </SelectPopup>
            </Select>
          }
        />
      ) : null}
      {showNightlyMobileBeta ? <NightlyMobileBetaRow /> : null}
      {hasDesktopBridge ? <CliCommandSettingsRow /> : null}
    </>
  );
}

export function useSettingsRestore(onRestored?: () => void) {
  const {
    theme,
    setTheme,
    followSystem,
    setFollowSystem,
    setThemeHalf,
    clearThemeHalves,
    themeHalves,
  } = useTheme();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();

  const isTextGenerationModelDirty = !Equal.equals(
    settings.textGenerationModelSelection ?? null,
    DEFAULT_UNIFIED_SETTINGS.textGenerationModelSelection ?? null,
  );
  const isBackgroundActivityDirty = hasChangedBackgroundActivitySettings(settings);
  const isPromptPredictionDirty =
    settings.promptPredictionMode !== DEFAULT_UNIFIED_SETTINGS.promptPredictionMode ||
    settings.promptPredictionLocalModel !== DEFAULT_UNIFIED_SETTINGS.promptPredictionLocalModel ||
    settings.promptPredictionCloudRequestLimit !==
      DEFAULT_UNIFIED_SETTINGS.promptPredictionCloudRequestLimit ||
    !Equal.equals(
      settings.promptPredictionModelSelection,
      DEFAULT_UNIFIED_SETTINGS.promptPredictionModelSelection,
    );

  const changedSettingLabels = useMemo(
    () => [
      ...(theme !== "system" ? ["Theme"] : []),
      ...(!followSystem ? ["Follow system"] : []),
      ...(themeHalves !== null ? ["Theme mix"] : []),
      ...(settings.appearanceContrast !== DEFAULT_UNIFIED_SETTINGS.appearanceContrast
        ? ["Interface contrast"]
        : []),
      ...(settings.glassOpacity !== DEFAULT_UNIFIED_SETTINGS.glassOpacity ? ["Glass opacity"] : []),
      ...(settings.diffColorScheme !== DEFAULT_UNIFIED_SETTINGS.diffColorScheme
        ? ["Colors for changes"]
        : []),
      ...(settings.chatWidth !== DEFAULT_UNIFIED_SETTINGS.chatWidth ? ["Chat width"] : []),
      ...(settings.panelAnimationDurationMs !== DEFAULT_UNIFIED_SETTINGS.panelAnimationDurationMs
        ? ["Panel animations"]
        : []),
      ...(settings.environmentIdentificationMode !==
      DEFAULT_UNIFIED_SETTINGS.environmentIdentificationMode
        ? ["Build label"]
        : []),
      ...(settings.timestampFormat !== DEFAULT_UNIFIED_SETTINGS.timestampFormat
        ? ["Time format"]
        : []),
      ...(settings.cacheMutedWarnings.length > 0 || settings.cacheNoticesSnoozedUntil > 0
        ? ["Cache warnings"]
        : []),
      ...(settings.notificationMode !== DEFAULT_UNIFIED_SETTINGS.notificationMode
        ? ["Chat notifications"]
        : []),
      ...(settings.inAppNotificationsEnabled !== DEFAULT_UNIFIED_SETTINGS.inAppNotificationsEnabled
        ? ["In-app notifications"]
        : []),
      ...(settings.sidebarThreadPreviewCount !== DEFAULT_UNIFIED_SETTINGS.sidebarThreadPreviewCount
        ? ["Visible chats"]
        : []),
      ...(settings.sidebarProjectGroupingMode !==
      DEFAULT_UNIFIED_SETTINGS.sidebarProjectGroupingMode
        ? ["Project grouping"]
        : []),
      ...(settings.sidebarProjectSortOrder !== DEFAULT_UNIFIED_SETTINGS.sidebarProjectSortOrder
        ? ["Project order"]
        : []),
      ...(settings.sidebarWorkingShelfEnabled !==
      DEFAULT_UNIFIED_SETTINGS.sidebarWorkingShelfEnabled
        ? ["Working section"]
        : []),
      ...(settings.sidebarAutoSettleAfterDays !==
      DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleAfterDays
        ? ["Mark inactive chats as done"]
        : []),
      ...(settings.sidebarAutoSettleOnMerge !== DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleOnMerge
        ? ["Mark merged chats as done"]
        : []),
      ...(settings.autoResumeLimitedThreads !== DEFAULT_UNIFIED_SETTINGS.autoResumeLimitedThreads
        ? ["Continue paused chats when the limit ends"]
        : []),
      ...(settings.snoozeLimitedThreads !== DEFAULT_UNIFIED_SETTINGS.snoozeLimitedThreads
        ? ["Pause chats that reach a usage limit"]
        : []),
      ...(!Equal.equals(settings.snoozePresets, DEFAULT_UNIFIED_SETTINGS.snoozePresets)
        ? ["Snooze options"]
        : []),
      ...(settings.wordWrap !== DEFAULT_UNIFIED_SETTINGS.wordWrap ? ["Word wrap"] : []),
      ...(settings.persistComposerContextStrip !==
      DEFAULT_UNIFIED_SETTINGS.persistComposerContextStrip
        ? ["Message box context"]
        : []),
      ...getChangedTypographySettingLabels(settings),
      ...(settings.diffFilesCollapsed !== DEFAULT_UNIFIED_SETTINGS.diffFilesCollapsed
        ? ["Default state of changed files"]
        : []),
      ...(settings.diffIgnoreWhitespace !== DEFAULT_UNIFIED_SETTINGS.diffIgnoreWhitespace
        ? ["Hide space-only changes"]
        : []),
      ...(settings.diffLayout !== DEFAULT_UNIFIED_SETTINGS.diffLayout ? ["Layout of changes"] : []),
      ...(settings.proactivePanelsEnabled !== DEFAULT_UNIFIED_SETTINGS.proactivePanelsEnabled
        ? ["Proactive panels"]
        : []),
      ...(settings.showSkillsInSlashMenu !== DEFAULT_UNIFIED_SETTINGS.showSkillsInSlashMenu
        ? ["Show skills in slash menu"]
        : []),
      ...(settings.composerCollapseOnScroll !== DEFAULT_UNIFIED_SETTINGS.composerCollapseOnScroll
        ? ["Shrink the message box when you scroll"]
        : []),
      ...(settings.composerPromptPredictionEnabled !==
      DEFAULT_UNIFIED_SETTINGS.composerPromptPredictionEnabled
        ? ["Message prediction"]
        : []),
      ...(settings.composerRichTextEnabled !== DEFAULT_UNIFIED_SETTINGS.composerRichTextEnabled
        ? ["Rich text message box"]
        : []),
      ...(settings.sendShortcut !== DEFAULT_UNIFIED_SETTINGS.sendShortcut ? ["Send shortcut"] : []),
      ...(settings.efficiencyProfile !== DEFAULT_UNIFIED_SETTINGS.efficiencyProfile
        ? ["Efficiency profile"]
        : []),
      ...(settings.followUpBehavior !== DEFAULT_UNIFIED_SETTINGS.followUpBehavior
        ? ["Sending a message during a reply"]
        : []),
      ...(settings.responseStreamingMode !== DEFAULT_UNIFIED_SETTINGS.responseStreamingMode
        ? ["Show replies as they are written"]
        : []),
      ...(settings.enableProviderUpdateChecks !==
      DEFAULT_UNIFIED_SETTINGS.enableProviderUpdateChecks
        ? ["AI service update checks"]
        : []),
      ...(settings.continueThreadsAfterServerUpdate !==
      EFFECTIVE_SERVER_SETTINGS_DEFAULTS.continueThreadsAfterServerUpdate
        ? ["Continue chats after restarts"]
        : []),
      ...(isBackgroundActivityDirty ? ["Background activity"] : []),
      ...(settings.defaultThreadEnvMode !== DEFAULT_UNIFIED_SETTINGS.defaultThreadEnvMode
        ? ["Where new chats start"]
        : []),
      ...(settings.newWorktreesStartFromOrigin !==
      DEFAULT_UNIFIED_SETTINGS.newWorktreesStartFromOrigin
        ? ["New separate copies start from origin"]
        : []),
      ...(settings.addProjectBaseDirectory !== DEFAULT_UNIFIED_SETTINGS.addProjectBaseDirectory
        ? ["Start folder for Add project"]
        : []),
      ...(settings.confirmThreadUnpin !== DEFAULT_UNIFIED_SETTINGS.confirmThreadUnpin
        ? ["Unpin confirmation"]
        : []),
      ...(settings.confirmThreadArchive !== DEFAULT_UNIFIED_SETTINGS.confirmThreadArchive
        ? ["Archive confirmation"]
        : []),
      ...(settings.confirmThreadDelete !== DEFAULT_UNIFIED_SETTINGS.confirmThreadDelete
        ? ["Delete confirmation"]
        : []),
      ...(settings.confirmQuit !== DEFAULT_UNIFIED_SETTINGS.confirmQuit ? ["Quit shortcut"] : []),
      ...(isTextGenerationModelDirty ? ["Model for writing text"] : []),
      ...(settings.threadTitleInstructions !== DEFAULT_UNIFIED_SETTINGS.threadTitleInstructions
        ? ["Thread title instructions"]
        : []),
      ...(isPromptPredictionDirty ? ["Prediction source and limit"] : []),
      ...getChangedBrowserSettingLabels(settings),
      ...(settings.enableAgentBrowserAccess !== DEFAULT_UNIFIED_SETTINGS.enableAgentBrowserAccess
        ? ["AI browser access"]
        : []),
    ],
    [
      isTextGenerationModelDirty,
      isPromptPredictionDirty,
      isBackgroundActivityDirty,
      settings.browserDefaultViewport,
      settings.browserDefaultZoomFactor,
      settings.browserDefaultAppearance,
      settings.browserRecordingFrameRate,
      settings.browserRecordingShowKeyPresses,
      settings.browserRecordingShowMousePresses,
      settings.browserLinkTarget,
      settings.browserAutoShowFloatingPreview,
      settings.appearanceContrast,
      settings.diffColorScheme,
      settings.chatWidth,
      settings.enableAgentBrowserAccess,
      settings.confirmQuit,
      settings.confirmThreadArchive,
      settings.confirmThreadDelete,
      settings.confirmThreadUnpin,
      settings.composerCollapseOnScroll,
      settings.composerPromptPredictionEnabled,
      settings.composerRichTextEnabled,
      settings.sendShortcut,
      settings.followUpBehavior,
      settings.efficiencyProfile,
      settings.addProjectBaseDirectory,
      settings.defaultThreadEnvMode,
      settings.newWorktreesStartFromOrigin,
      settings.diffFilesCollapsed,
      settings.diffIgnoreWhitespace,
      settings.diffLayout,
      settings.proactivePanelsEnabled,
      settings.environmentIdentificationMode,
      settings.fontFamilyCode,
      settings.fontFamilyComposer,
      settings.fontFamilySans,
      settings.fontFamilyTerminal,
      settings.fontSizeCode,
      settings.fontSizeInterface,
      settings.fontSizePrompt,
      settings.fontSizeTerminal,
      settings.glassOpacity,
      settings.panelAnimationDurationMs,
      settings.responseStreamingMode,
      settings.persistComposerContextStrip,
      settings.enableProviderUpdateChecks,
      settings.continueThreadsAfterServerUpdate,
      settings.sidebarAutoSettleAfterDays,
      settings.sidebarAutoSettleOnMerge,
      settings.autoResumeLimitedThreads,
      settings.snoozeLimitedThreads,
      settings.snoozePresets,
      settings.threadTitleInstructions,
      settings.sidebarProjectGroupingMode,
      settings.sidebarProjectSortOrder,
      settings.sidebarWorkingShelfEnabled,
      settings.sidebarThreadPreviewCount,
      settings.showSkillsInSlashMenu,
      settings.timestampFormat,
      settings.cacheMutedWarnings,
      settings.cacheNoticesSnoozedUntil,
      settings.notificationMode,
      settings.inAppNotificationsEnabled,
      settings.wordWrap,
      followSystem,
      theme,
      themeHalves,
    ],
  );

  const restoreDefaults = useCallback(async () => {
    if (changedSettingLabels.length === 0) return;
    const api = readLocalApi();
    const confirmed = await (api ?? ensureLocalApi()).dialogs.confirm(
      ["Restore default settings?", `This will reset: ${changedSettingLabels.join(", ")}.`].join(
        "\n",
      ),
      { variant: "destructive" },
    );
    if (!confirmed) return;

    // Only touch the theme keys that are actually dirty, so a theme-storage
    // failure cannot block restoring unrelated settings. Preferences are
    // re-read after the confirmation dialog: they may have changed (another
    // tab, an OS flip) while it was open, and rollback must restore the live
    // values rather than the ones captured at render time.
    let previousTheme = theme;
    try {
      previousTheme = readThemePreference();
    } catch {
      // Storage is unreadable; the render-time value is the best rollback.
    }
    // The mix may have changed while the confirmation dialog was open; both
    // the dirty check and the rollback must see the live value.
    const liveHalves = readThemeHalves();
    const needsThemeReset = previousTheme !== "system";
    const needsMixReset = liveHalves !== null;
    // Same for the appearance mode: trusting the render-time value would skip
    // the reset and report success while a non-system mode stayed in storage.
    const needsFollowSystemReset = readAppearanceModePreference(previousTheme) !== "system";
    const notifyThemeRestoreFailure = () => {
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: "Could not restore the theme settings",
          description: "Try again.",
        }),
      );
    };
    // Rollback restores the base preference first (which clears any mix) and
    // then re-applies the captured mix on top, so no failure path can leave
    // the pair of keys half-restored.
    const previousHalves = liveHalves;
    const rollbackThemeState = () => {
      if (needsThemeReset) setTheme(previousTheme);
      if (previousHalves?.light) setThemeHalf("light", previousHalves.light);
      if (previousHalves?.dark) setThemeHalf("dark", previousHalves.dark);
    };
    if (needsThemeReset && !setTheme("system")) {
      notifyThemeRestoreFailure();
      return;
    }
    if (needsMixReset && !clearThemeHalves()) {
      rollbackThemeState();
      notifyThemeRestoreFailure();
      return;
    }
    if (needsFollowSystemReset && !setFollowSystem(true)) {
      rollbackThemeState();
      notifyThemeRestoreFailure();
      return;
    }
    updateSettings({
      appearanceContrast: DEFAULT_UNIFIED_SETTINGS.appearanceContrast,
      diffColorScheme: DEFAULT_UNIFIED_SETTINGS.diffColorScheme,
      chatWidth: DEFAULT_UNIFIED_SETTINGS.chatWidth,
      timestampFormat: DEFAULT_UNIFIED_SETTINGS.timestampFormat,
      cacheMutedWarnings: DEFAULT_UNIFIED_SETTINGS.cacheMutedWarnings,
      cacheNoticesSnoozedUntil: DEFAULT_UNIFIED_SETTINGS.cacheNoticesSnoozedUntil,
      notificationMode: DEFAULT_UNIFIED_SETTINGS.notificationMode,
      inAppNotificationsEnabled: DEFAULT_UNIFIED_SETTINGS.inAppNotificationsEnabled,
      wordWrap: DEFAULT_UNIFIED_SETTINGS.wordWrap,
      persistComposerContextStrip: DEFAULT_UNIFIED_SETTINGS.persistComposerContextStrip,
      diffFilesCollapsed: DEFAULT_UNIFIED_SETTINGS.diffFilesCollapsed,
      diffIgnoreWhitespace: DEFAULT_UNIFIED_SETTINGS.diffIgnoreWhitespace,
      diffLayout: DEFAULT_UNIFIED_SETTINGS.diffLayout,
      proactivePanelsEnabled: DEFAULT_UNIFIED_SETTINGS.proactivePanelsEnabled,
      showSkillsInSlashMenu: DEFAULT_UNIFIED_SETTINGS.showSkillsInSlashMenu,
      composerCollapseOnScroll: DEFAULT_UNIFIED_SETTINGS.composerCollapseOnScroll,
      composerPromptPredictionEnabled: DEFAULT_UNIFIED_SETTINGS.composerPromptPredictionEnabled,
      composerRichTextEnabled: DEFAULT_UNIFIED_SETTINGS.composerRichTextEnabled,
      sendShortcut: DEFAULT_UNIFIED_SETTINGS.sendShortcut,
      followUpBehavior: DEFAULT_UNIFIED_SETTINGS.followUpBehavior,
      efficiencyProfile: DEFAULT_UNIFIED_SETTINGS.efficiencyProfile,
      composerAutoRoutePreference: DEFAULT_UNIFIED_SETTINGS.composerAutoRoutePreference,
      environmentIdentificationMode: DEFAULT_UNIFIED_SETTINGS.environmentIdentificationMode,
      glassOpacity: DEFAULT_UNIFIED_SETTINGS.glassOpacity,
      panelAnimationDurationMs: DEFAULT_UNIFIED_SETTINGS.panelAnimationDurationMs,
      sidebarThreadPreviewCount: DEFAULT_UNIFIED_SETTINGS.sidebarThreadPreviewCount,
      sidebarProjectGroupingMode: DEFAULT_UNIFIED_SETTINGS.sidebarProjectGroupingMode,
      sidebarProjectSortOrder: DEFAULT_UNIFIED_SETTINGS.sidebarProjectSortOrder,
      sidebarWorkingShelfEnabled: DEFAULT_UNIFIED_SETTINGS.sidebarWorkingShelfEnabled,
      sidebarAutoSettleAfterDays: DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleAfterDays,
      sidebarAutoSettleOnMerge: DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleOnMerge,
      autoResumeLimitedThreads: DEFAULT_UNIFIED_SETTINGS.autoResumeLimitedThreads,
      snoozeLimitedThreads: DEFAULT_UNIFIED_SETTINGS.snoozeLimitedThreads,
      snoozePresets: DEFAULT_UNIFIED_SETTINGS.snoozePresets,
      responseStreamingMode: DEFAULT_UNIFIED_SETTINGS.responseStreamingMode,
      enableProviderUpdateChecks: DEFAULT_UNIFIED_SETTINGS.enableProviderUpdateChecks,
      continueThreadsAfterServerUpdate:
        EFFECTIVE_SERVER_SETTINGS_DEFAULTS.continueThreadsAfterServerUpdate,
      backgroundActivity: DEFAULT_UNIFIED_SETTINGS.backgroundActivity,
      backgroundActivityProfile: DEFAULT_UNIFIED_SETTINGS.backgroundActivityProfile,
      automaticGitFetchInterval: DEFAULT_UNIFIED_SETTINGS.automaticGitFetchInterval,
      providerHealthRefreshInterval: DEFAULT_UNIFIED_SETTINGS.providerHealthRefreshInterval,
      defaultThreadEnvMode: DEFAULT_UNIFIED_SETTINGS.defaultThreadEnvMode,
      newWorktreesStartFromOrigin: DEFAULT_UNIFIED_SETTINGS.newWorktreesStartFromOrigin,
      addProjectBaseDirectory: DEFAULT_UNIFIED_SETTINGS.addProjectBaseDirectory,
      confirmThreadArchive: DEFAULT_UNIFIED_SETTINGS.confirmThreadArchive,
      confirmThreadDelete: DEFAULT_UNIFIED_SETTINGS.confirmThreadDelete,
      confirmThreadUnpin: DEFAULT_UNIFIED_SETTINGS.confirmThreadUnpin,
      confirmQuit: DEFAULT_UNIFIED_SETTINGS.confirmQuit,
      textGenerationModelSelection: DEFAULT_UNIFIED_SETTINGS.textGenerationModelSelection,
      threadTitleInstructions: DEFAULT_UNIFIED_SETTINGS.threadTitleInstructions,
      promptPredictionMode: DEFAULT_UNIFIED_SETTINGS.promptPredictionMode,
      promptPredictionLocalModel: DEFAULT_UNIFIED_SETTINGS.promptPredictionLocalModel,
      promptPredictionModelSelection: DEFAULT_UNIFIED_SETTINGS.promptPredictionModelSelection,
      promptPredictionCloudRequestLimit: DEFAULT_UNIFIED_SETTINGS.promptPredictionCloudRequestLimit,
      fontFamilySans: DEFAULT_UNIFIED_SETTINGS.fontFamilySans,
      fontFamilyComposer: DEFAULT_UNIFIED_SETTINGS.fontFamilyComposer,
      fontFamilyCode: DEFAULT_UNIFIED_SETTINGS.fontFamilyCode,
      fontFamilyTerminal: DEFAULT_UNIFIED_SETTINGS.fontFamilyTerminal,
      fontSizeInterface: DEFAULT_UNIFIED_SETTINGS.fontSizeInterface,
      fontSizePrompt: DEFAULT_UNIFIED_SETTINGS.fontSizePrompt,
      fontSizeCode: DEFAULT_UNIFIED_SETTINGS.fontSizeCode,
      fontSizeTerminal: DEFAULT_UNIFIED_SETTINGS.fontSizeTerminal,
      browserDefaultViewport: DEFAULT_UNIFIED_SETTINGS.browserDefaultViewport,
      browserDefaultZoomFactor: DEFAULT_UNIFIED_SETTINGS.browserDefaultZoomFactor,
      browserDefaultAppearance: DEFAULT_UNIFIED_SETTINGS.browserDefaultAppearance,
      browserRecordingFrameRate: DEFAULT_UNIFIED_SETTINGS.browserRecordingFrameRate,
      browserRecordingShowKeyPresses: DEFAULT_UNIFIED_SETTINGS.browserRecordingShowKeyPresses,
      browserRecordingShowMousePresses: DEFAULT_UNIFIED_SETTINGS.browserRecordingShowMousePresses,
      browserLinkTarget: DEFAULT_UNIFIED_SETTINGS.browserLinkTarget,
      browserAutoShowFloatingPreview: DEFAULT_UNIFIED_SETTINGS.browserAutoShowFloatingPreview,
      // Re-granted like any other default. The confirmation dialog lists it by
      // name, so a user restoring defaults is told the agent regains access
      // rather than discovering it later.
      enableAgentBrowserAccess: DEFAULT_UNIFIED_SETTINGS.enableAgentBrowserAccess,
    });
    onRestored?.();
  }, [
    changedSettingLabels,
    clearThemeHalves,
    onRestored,
    setFollowSystem,
    setTheme,
    setThemeHalf,
    theme,
    themeHalves,
    updateSettings,
  ]);

  return {
    changedSettingLabels,
    restoreDefaults,
  };
}

function BackgroundActivityAdvancedDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const canWriteSettings = useScopedSettingsWriteAllowed();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const resolvedBackgroundActivity = resolveServerBackgroundActivitySettings(settings);
  const activeProfile = resolvedBackgroundActivity.profile;
  const automaticGitFetchIntervalSeconds = durationToSeconds(
    resolvedBackgroundActivity.automaticGitFetchInterval,
  );
  const providerHealthRefreshIntervalSeconds = durationToSeconds(
    resolvedBackgroundActivity.providerHealthRefreshInterval,
  );
  const hostPowerMonitorActiveIntervalSeconds = durationToSeconds(
    resolvedBackgroundActivity.hostPowerMonitorActiveInterval,
  );
  const hostPowerMonitorIdleIntervalSeconds = durationToSeconds(
    resolvedBackgroundActivity.hostPowerMonitorIdleInterval,
  );

  return (
    <Dialog open={open && canWriteSettings} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Background Activity</DialogTitle>
          <DialogDescription>
            Change the shared power policy and the times for background checks.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <fieldset
            disabled={!canWriteSettings}
            className="min-w-0 overflow-hidden rounded-xl border bg-card text-card-foreground"
          >
            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-medium">Shared policy</div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Decides if background work can run when a check time comes.
                </p>
              </div>
              <Select
                value={activeProfile}
                onValueChange={(value) => {
                  if (
                    value === "balanced" ||
                    value === "performance" ||
                    value === "battery-saver"
                  ) {
                    updateSettings({
                      backgroundActivity: backgroundActivitySharedPolicySettings(settings, value),
                    });
                  }
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full sm:w-40"
                  aria-label="Shared power policy"
                >
                  <SelectValue>{BACKGROUND_ACTIVITY_PROFILE_LABELS[activeProfile]}</SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  <SelectItem hideIndicator value="balanced">
                    {BACKGROUND_ACTIVITY_PROFILE_LABELS.balanced}
                  </SelectItem>
                  <SelectItem hideIndicator value="performance">
                    {BACKGROUND_ACTIVITY_PROFILE_LABELS.performance}
                  </SelectItem>
                  <SelectItem hideIndicator value="battery-saver">
                    {BACKGROUND_ACTIVITY_PROFILE_LABELS["battery-saver"]}
                  </SelectItem>
                </SelectPopup>
              </Select>
            </div>

            <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-medium">
                  {searchableSetting("git-fetch-interval").title}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Check the remote branches in the background.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NumberField
                  value={automaticGitFetchIntervalSeconds}
                  min={0}
                  step={5}
                  size="sm"
                  className="w-32"
                  onValueChange={(value) =>
                    updateSettings(
                      backgroundActivityOverrideSettings(
                        settings.backgroundActivity,
                        resolvedBackgroundActivity,
                        {
                          automaticGitFetchInterval: Duration.seconds(
                            normalizeIntervalSeconds(value),
                          ),
                        },
                      ),
                    )
                  }
                >
                  <NumberFieldGroup>
                    <NumberFieldDecrement aria-label="Decrease Git fetch interval" />
                    <NumberFieldInput aria-label="Git fetch interval in seconds" />
                    <NumberFieldIncrement aria-label="Increase Git fetch interval" />
                  </NumberFieldGroup>
                </NumberField>
                <span className="text-xs text-muted-foreground">seconds</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-medium">Provider health interval</div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Check which AI services are available, their versions, sign-in, and models.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NumberField
                  value={providerHealthRefreshIntervalSeconds}
                  min={0}
                  step={PROVIDER_HEALTH_INTERVAL_STEP_SECONDS}
                  size="sm"
                  className="w-32"
                  onValueChange={(value) =>
                    updateSettings(
                      backgroundActivityOverrideSettings(
                        settings.backgroundActivity,
                        resolvedBackgroundActivity,
                        {
                          providerHealthRefreshInterval: Duration.seconds(
                            normalizeIntervalSeconds(value),
                          ),
                        },
                      ),
                    )
                  }
                >
                  <NumberFieldGroup>
                    <NumberFieldDecrement aria-label="Decrease AI service check time" />
                    <NumberFieldInput aria-label="AI service check time in seconds" />
                    <NumberFieldIncrement aria-label="Increase AI service check time" />
                  </NumberFieldGroup>
                </NumberField>
                <span className="text-xs text-muted-foreground">seconds</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-medium">Host power monitor</div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Check the power state of the computer while devices are in use.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NumberField
                  value={hostPowerMonitorActiveIntervalSeconds}
                  min={5}
                  step={5}
                  size="sm"
                  className="w-32"
                  onValueChange={(value) =>
                    updateSettings(
                      backgroundActivityOverrideSettings(
                        settings.backgroundActivity,
                        resolvedBackgroundActivity,
                        {
                          hostPowerMonitorActiveInterval: Duration.seconds(
                            normalizeIntervalSeconds(value, 5),
                          ),
                        },
                      ),
                    )
                  }
                >
                  <NumberFieldGroup>
                    <NumberFieldDecrement aria-label="Decrease active power check time" />
                    <NumberFieldInput aria-label="Active power check time in seconds" />
                    <NumberFieldIncrement aria-label="Increase active power check time" />
                  </NumberFieldGroup>
                </NumberField>
                <span className="text-xs text-muted-foreground">seconds</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-medium">Idle host monitor</div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Check the power state of the computer while no device is in use.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NumberField
                  value={hostPowerMonitorIdleIntervalSeconds}
                  min={5}
                  step={30}
                  size="sm"
                  className="w-32"
                  onValueChange={(value) =>
                    updateSettings(
                      backgroundActivityOverrideSettings(
                        settings.backgroundActivity,
                        resolvedBackgroundActivity,
                        {
                          hostPowerMonitorIdleInterval: Duration.seconds(
                            normalizeIntervalSeconds(value, 5),
                          ),
                        },
                      ),
                    )
                  }
                >
                  <NumberFieldGroup>
                    <NumberFieldDecrement aria-label="Decrease idle power check time" />
                    <NumberFieldInput aria-label="Idle power check time in seconds" />
                    <NumberFieldIncrement aria-label="Increase idle power check time" />
                  </NumberFieldGroup>
                </NumberField>
                <span className="text-xs text-muted-foreground">seconds</span>
              </div>
            </div>

            <div className="grid gap-0 border-t sm:grid-cols-2">
              {BACKGROUND_ACTIVITY_BOOLEAN_OVERRIDES.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 sm:border-r sm:even:border-r-0"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <Switch
                    checked={resolvedBackgroundActivity[key]}
                    onCheckedChange={(checked) =>
                      updateSettings(
                        backgroundActivityOverrideSettings(
                          settings.backgroundActivity,
                          resolvedBackgroundActivity,
                          {
                            [key]: Boolean(checked),
                          },
                        ),
                      )
                    }
                    aria-label={label}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </DialogPanel>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={!canWriteSettings}
            onClick={() => updateSettings(resetBackgroundActivitySettings())}
          >
            Reset all
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export function AppearanceSettingsPanel() {
  const {
    appearanceMode,
    refreshTheme,
    resolvedTheme,
    setAppearanceMode,
    setTheme,
    setThemeHalf,
    theme,
    themeHalves,
  } = useTheme();
  const { glowStrength, setGlowStrength, setShowGrid, showGrid } = useLeonidasAtmosphere();
  const customThemes = useCustomThemes();
  const [isImportThemeOpen, setIsImportThemeOpen] = useState(false);
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const environmentStageLabel = useEnvironmentStageLabel();
  const showEnvironmentIdentification =
    resolveEnvironmentIdentificationPillLabel(environmentStageLabel) !== null;
  const isLeonidasTheme =
    (theme === "system" || theme === "light" || theme === "dark" || theme === "leonidas") &&
    themeHalves === null;
  const glassOpacityRatio =
    (settings.glassOpacity - MIN_GLASS_OPACITY) / (MAX_GLASS_OPACITY - MIN_GLASS_OPACITY);
  const glassOpacitySliderStyle = {
    "--settings-slider-progress": `${glassOpacityRatio * 100}%`,
    "--settings-slider-fill-offset": `${0.5 - glassOpacityRatio}rem`,
  } as CSSProperties;
  const appearanceContrastRatio =
    (settings.appearanceContrast - MIN_APPEARANCE_CONTRAST) /
    (MAX_APPEARANCE_CONTRAST - MIN_APPEARANCE_CONTRAST);
  const appearanceContrastSliderStyle = {
    "--settings-slider-progress": `${appearanceContrastRatio * 100}%`,
    "--settings-slider-fill-offset": `${0.5 - appearanceContrastRatio}rem`,
  } as CSSProperties;
  const panelAnimationDurationRatio =
    (settings.panelAnimationDurationMs - MIN_PANEL_ANIMATION_DURATION_MS) /
    (MAX_PANEL_ANIMATION_DURATION_MS - MIN_PANEL_ANIMATION_DURATION_MS);
  const panelAnimationDurationSliderStyle = {
    "--settings-slider-progress": `${panelAnimationDurationRatio * 100}%`,
    "--settings-slider-fill-offset": `${0.5 - panelAnimationDurationRatio}rem`,
  } as CSSProperties;

  return (
    <SettingsPageContainer>
      <SettingsSection id="appearance" title="Colors & themes" variant="plain" hideTitle>
        <div id={searchableSetting("theme").id}>
          <ThemeLibrary
            appearanceMode={appearanceMode}
            customThemes={customThemes}
            initialAppearance={resolvedTheme}
            refreshTheme={refreshTheme}
            isImportOpen={isImportThemeOpen}
            setAppearanceMode={setAppearanceMode}
            setTheme={setTheme}
            setThemeHalf={setThemeHalf}
            theme={theme}
            themeHalves={themeHalves}
            onImportOpenChange={setIsImportThemeOpen}
          />
        </div>
      </SettingsSection>

      <WallpaperSettings />

      <SettingsSection id="appearance-interface" title="Interface">
        <SettingsRow
          {...searchableSetting("setting-appearance-contrast")}
          description="Adjust the contrast of colors and borders across the interface."
          resetAction={
            settings.appearanceContrast !== DEFAULT_UNIFIED_SETTINGS.appearanceContrast ? (
              <SettingResetButton
                label="interface contrast"
                onClick={() =>
                  updateSettings({
                    appearanceContrast: DEFAULT_UNIFIED_SETTINGS.appearanceContrast,
                  })
                }
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center gap-3 sm:w-52">
              <output
                className="min-w-12 rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium tabular-nums text-foreground"
                htmlFor="appearance-contrast"
              >
                {settings.appearanceContrast}%
              </output>
              <input
                aria-label="Interface contrast"
                className="settings-slider min-w-0 flex-1"
                id="appearance-contrast"
                max={MAX_APPEARANCE_CONTRAST}
                min={MIN_APPEARANCE_CONTRAST}
                onChange={(event) => {
                  const appearanceContrast = Number(event.currentTarget.value);
                  if (
                    Number.isInteger(appearanceContrast) &&
                    appearanceContrast >= MIN_APPEARANCE_CONTRAST &&
                    appearanceContrast <= MAX_APPEARANCE_CONTRAST
                  ) {
                    updateSettings({ appearanceContrast });
                  }
                }}
                step={5}
                style={appearanceContrastSliderStyle}
                type="range"
                value={settings.appearanceContrast}
              />
            </div>
          }
        />

        <SettingsRow
          {...searchableSetting("setting-glass-opacity")}
          description="Higher values make menus, dialogs, and the message box more solid."
          resetAction={
            settings.glassOpacity !== DEFAULT_UNIFIED_SETTINGS.glassOpacity ? (
              <SettingResetButton
                label="glass opacity"
                onClick={() =>
                  updateSettings({ glassOpacity: DEFAULT_UNIFIED_SETTINGS.glassOpacity })
                }
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center gap-3 sm:w-52">
              <output
                className="min-w-12 rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium tabular-nums text-foreground"
                htmlFor="glass-opacity"
              >
                {settings.glassOpacity}%
              </output>
              <input
                aria-label="Glass opacity"
                className="settings-slider min-w-0 flex-1"
                id="glass-opacity"
                max={MAX_GLASS_OPACITY}
                min={MIN_GLASS_OPACITY}
                onChange={(event) => {
                  const glassOpacity = Number(event.currentTarget.value);
                  if (
                    Number.isInteger(glassOpacity) &&
                    glassOpacity >= MIN_GLASS_OPACITY &&
                    glassOpacity <= MAX_GLASS_OPACITY
                  ) {
                    updateSettings({ glassOpacity });
                  }
                }}
                step={5}
                style={glassOpacitySliderStyle}
                type="range"
                value={settings.glassOpacity}
              />
            </div>
          }
        />

        <SettingsRow
          {...searchableSetting("setting-leonidas-grid")}
          aria-disabled={!isLeonidasTheme}
          description="Show the grid behind the work area in the Leonidas theme."
          control={
            <Switch
              aria-label="Show Leonidas grid"
              checked={showGrid}
              disabled={!isLeonidasTheme}
              onCheckedChange={(checked) => setShowGrid(Boolean(checked))}
            />
          }
        />

        <SettingsRow
          {...searchableSetting("setting-leonidas-glow")}
          aria-disabled={!isLeonidasTheme}
          description="Change the red glow in the Leonidas theme."
          resetAction={
            glowStrength !== DEFAULT_LEONIDAS_GLOW_STRENGTH ? (
              <SettingResetButton
                label="crimson glow"
                disabled={!isLeonidasTheme}
                onClick={() => setGlowStrength(DEFAULT_LEONIDAS_GLOW_STRENGTH)}
              />
            ) : null
          }
          control={
            <div className="flex w-full items-center gap-3 sm:w-52">
              <output
                className="min-w-12 rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium tabular-nums text-foreground"
                htmlFor="leonidas-glow"
              >
                {glowStrength}%
              </output>
              <input
                aria-label="Crimson glow"
                className="settings-slider min-w-0 flex-1"
                disabled={!isLeonidasTheme}
                id="leonidas-glow"
                max={100}
                min={0}
                onChange={(event) => setGlowStrength(Number(event.currentTarget.value))}
                step={5}
                style={
                  {
                    "--settings-slider-progress": `${glowStrength}%`,
                    "--settings-slider-fill-offset": `${0.5 - glowStrength / 100}rem`,
                  } as CSSProperties
                }
                type="range"
                value={glowStrength}
              />
            </div>
          }
        />

        <SettingsRow
          {...searchableSetting("setting-leonidas-reset")}
          description="Return to the Leonidas theme with the grid on and the crimson glow at its default. Light or dark mode stays as it is."
          control={
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setTheme("leonidas");
                setShowGrid(true);
                setGlowStrength(DEFAULT_LEONIDAS_GLOW_STRENGTH);
              }}
            >
              Reset to Leonidas
            </Button>
          }
        />

        {showEnvironmentIdentification ? (
          <SettingsRow
            {...searchableSetting("environment-identification")}
            description="Choose how Leonidas shows that this is a Dev or Nightly build."
            resetAction={
              settings.environmentIdentificationMode !== DEFAULT_ENVIRONMENT_IDENTIFICATION_MODE ? (
                <SettingResetButton
                  label="build label"
                  onClick={() =>
                    updateSettings({
                      environmentIdentificationMode: DEFAULT_ENVIRONMENT_IDENTIFICATION_MODE,
                    })
                  }
                />
              ) : null
            }
            control={
              <Select
                value={settings.environmentIdentificationMode}
                onValueChange={(value) => {
                  if (value === "artwork" || value === "pill" || value === "none") {
                    updateSettings({ environmentIdentificationMode: value });
                  }
                }}
              >
                <SelectTrigger size="sm" className="w-full sm:w-40" aria-label="Build label">
                  <SelectValue>
                    {ENVIRONMENT_IDENTIFICATION_LABELS[settings.environmentIdentificationMode]}
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  {Object.entries(ENVIRONMENT_IDENTIFICATION_LABELS).map(([value, label]) => (
                    <SelectItem hideIndicator key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            }
          />
        ) : null}

        <SettingsRow
          {...searchableSetting("diff-color-scheme")}
          description="Choose colors for added and removed lines, including the counts."
          resetAction={
            settings.diffColorScheme !== DEFAULT_UNIFIED_SETTINGS.diffColorScheme ? (
              <SettingResetButton
                label="colors for changes"
                onClick={() =>
                  updateSettings({ diffColorScheme: DEFAULT_UNIFIED_SETTINGS.diffColorScheme })
                }
              />
            ) : null
          }
          control={
            <div className="w-full sm:w-40">
              <Select
                value={settings.diffColorScheme}
                onValueChange={(value) => {
                  if (value === "red-green" || value === "blue-orange")
                    updateSettings({ diffColorScheme: value });
                }}
              >
                <SelectTrigger size="sm" className="w-full min-w-0" aria-label="Colors for changes">
                  <span
                    aria-hidden="true"
                    className={
                      settings.diffColorScheme === "blue-orange"
                        ? "flex shrink-0 flex-row-reverse gap-1"
                        : "flex shrink-0 gap-1"
                    }
                  >
                    <span className="size-2 rounded-full bg-diff-deletion" />
                    <span className="size-2 rounded-full bg-diff-addition" />
                  </span>
                  <SelectValue>
                    {settings.diffColorScheme === "blue-orange" ? "Blue & orange" : "Red & green"}
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  <SelectItem value="red-green">Red & green (default)</SelectItem>
                  <SelectItem value="blue-orange">Blue & orange</SelectItem>
                </SelectPopup>
              </Select>
            </div>
          }
        />

        <SettingsRow
          {...searchableSetting("composer-context")}
          description="Keep the branch and separate copy controls below the message box after a chat starts."
          resetAction={
            settings.persistComposerContextStrip !==
            DEFAULT_UNIFIED_SETTINGS.persistComposerContextStrip ? (
              <SettingResetButton
                label="message box context"
                onClick={() =>
                  updateSettings({
                    persistComposerContextStrip:
                      DEFAULT_UNIFIED_SETTINGS.persistComposerContextStrip,
                  })
                }
              />
            ) : null
          }
          control={
            <Switch
              checked={settings.persistComposerContextStrip}
              onCheckedChange={(checked) =>
                updateSettings({ persistComposerContextStrip: Boolean(checked) })
              }
              aria-label="Keep the message box context visible in active chats"
            />
          }
        />

        <SettingsRow
          {...searchableSetting("chat-width")}
          description="Set how wide messages and the message box can be on large screens."
          resetAction={
            settings.chatWidth !== DEFAULT_UNIFIED_SETTINGS.chatWidth ? (
              <SettingResetButton
                label="chat width"
                onClick={() => updateSettings({ chatWidth: DEFAULT_UNIFIED_SETTINGS.chatWidth })}
              />
            ) : null
          }
          control={
            <div className="w-full sm:w-40">
              <Select
                value={settings.chatWidth}
                onValueChange={(value) => {
                  if (value === "comfortable" || value === "wide" || value === "full")
                    updateSettings({ chatWidth: value });
                }}
              >
                <SelectTrigger size="sm" className="w-full min-w-0" aria-label="Chat width">
                  <SelectValue>{CHAT_WIDTH_LABELS[settings.chatWidth]}</SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  <SelectItem value="comfortable">Comfortable (default)</SelectItem>
                  <SelectItem value="wide">Wide</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectPopup>
              </Select>
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection id="motion" title="Motion">
        <SettingsRow
          {...searchableSetting("panel-animations")}
          description="Set how fast panels open and close."
          control={
            <div className="grid w-full grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 sm:w-auto sm:grid-cols-[7rem_13rem] sm:gap-4">
              <PanelAnimationsPreview durationMs={settings.panelAnimationDurationMs} />
              <div className="flex w-full items-center gap-3">
                <output
                  className="min-w-16 rounded-md bg-muted px-2 py-1 text-center font-mono text-xs font-medium tabular-nums text-foreground"
                  htmlFor="panel-animation-duration"
                >
                  {settings.panelAnimationDurationMs} ms
                </output>
                <input
                  aria-label="Panel animation duration"
                  className="settings-slider min-w-0 flex-1"
                  id="panel-animation-duration"
                  max={MAX_PANEL_ANIMATION_DURATION_MS}
                  min={MIN_PANEL_ANIMATION_DURATION_MS}
                  onChange={(event) => {
                    const panelAnimationDurationMs = Number(event.currentTarget.value);
                    if (
                      Number.isInteger(panelAnimationDurationMs) &&
                      panelAnimationDurationMs >= MIN_PANEL_ANIMATION_DURATION_MS &&
                      panelAnimationDurationMs <= MAX_PANEL_ANIMATION_DURATION_MS
                    ) {
                      updateSettings({ panelAnimationDurationMs });
                    }
                  }}
                  step={25}
                  style={panelAnimationDurationSliderStyle}
                  type="range"
                  value={settings.panelAnimationDurationMs}
                />
              </div>
            </div>
          }
          resetAction={
            settings.panelAnimationDurationMs !==
            DEFAULT_UNIFIED_SETTINGS.panelAnimationDurationMs ? (
              <SettingResetButton
                label="panel animations"
                onClick={() =>
                  updateSettings({
                    panelAnimationDurationMs: DEFAULT_UNIFIED_SETTINGS.panelAnimationDurationMs,
                  })
                }
              />
            ) : null
          }
        />
      </SettingsSection>

      <TypographySection />
    </SettingsPageContainer>
  );
}

function useFontDefaultFamilies() {
  const settings = useScopedSettings();
  // An unset preference shows the font it resolves to on this machine; the
  // default stacks are the platform's own faces, so the name is probed, not
  // hardcoded.
  const defaults = useMemo(
    () => ({
      sans: resolveDefaultFamilyLabel(DEFAULT_SANS_FONT_STACK) ?? "System default",
      code: resolveDefaultFamilyLabel(DEFAULT_CODE_FONT_STACK) ?? "System monospace",
    }),
    [],
  );
  return {
    sans: defaults.sans,
    code: defaults.code,
    // The composer inherits whatever the interface preference resolves to.
    interfaceFamily: settings.fontFamilySans.trim() || defaults.sans,
  };
}

function InterfaceFontRow({ preview }: { preview?: ReactNode }) {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const defaults = useFontDefaultFamilies();
  return (
    <FontFamilySettingsRow
      {...searchableSetting("interface-font")}
      description="Everything outside code blocks and the terminal."
      defaultFamily={defaults.sans}
      defaultValue={DEFAULT_UNIFIED_SETTINGS.fontFamilySans}
      value={settings.fontFamilySans}
      onValueChange={(fontFamilySans) => updateSettings({ fontFamilySans })}
      onReset={() =>
        updateSettings({
          fontFamilySans: DEFAULT_UNIFIED_SETTINGS.fontFamilySans,
          fontSizeInterface: DEFAULT_UNIFIED_SETTINGS.fontSizeInterface,
        })
      }
      size={{
        label: "Interface font size",
        min: MIN_INTERFACE_FONT_SIZE,
        max: MAX_INTERFACE_FONT_SIZE,
        value: settings.fontSizeInterface,
        defaultValue: DEFAULT_UNIFIED_SETTINGS.fontSizeInterface,
        onChange: (fontSizeInterface) => updateSettings({ fontSizeInterface }),
      }}
      {...(preview !== undefined ? { preview } : {})}
    />
  );
}

function PromptFontRow() {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const defaults = useFontDefaultFamilies();
  return (
    <FontFamilySettingsRow
      {...searchableSetting("prompt-font")}
      description="Only the box where you write messages. A mono font works well here."
      defaultFamily={defaults.interfaceFamily}
      defaultValue={DEFAULT_UNIFIED_SETTINGS.fontFamilyComposer}
      value={settings.fontFamilyComposer}
      onValueChange={(fontFamilyComposer) => updateSettings({ fontFamilyComposer })}
      onReset={() =>
        updateSettings({
          fontFamilyComposer: DEFAULT_UNIFIED_SETTINGS.fontFamilyComposer,
          fontSizePrompt: DEFAULT_UNIFIED_SETTINGS.fontSizePrompt,
        })
      }
      size={{
        label: "Message font size",
        min: MIN_PROMPT_FONT_SIZE,
        max: MAX_PROMPT_FONT_SIZE,
        value: settings.fontSizePrompt,
        defaultValue: DEFAULT_UNIFIED_SETTINGS.fontSizePrompt,
        onChange: (fontSizePrompt) => updateSettings({ fontSizePrompt }),
      }}
      preview={<PromptFontPreview />}
    />
  );
}

function CodeFontRow({
  title,
  description = "Code blocks, changes, and file previews.",
  preview,
}: {
  title?: string;
  description?: string;
  preview?: ReactNode;
}) {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const defaults = useFontDefaultFamilies();
  return (
    <FontFamilySettingsRow
      {...searchableSetting("code-font")}
      {...(title !== undefined ? { title } : {})}
      description={description}
      defaultFamily={defaults.code}
      defaultValue={DEFAULT_UNIFIED_SETTINGS.fontFamilyCode}
      value={settings.fontFamilyCode}
      onValueChange={(fontFamilyCode) => updateSettings({ fontFamilyCode })}
      onReset={() =>
        updateSettings({
          fontFamilyCode: DEFAULT_UNIFIED_SETTINGS.fontFamilyCode,
          fontSizeCode: DEFAULT_UNIFIED_SETTINGS.fontSizeCode,
        })
      }
      requireMonospace
      size={{
        label: "Code font size",
        min: MIN_CODE_FONT_SIZE,
        max: MAX_CODE_FONT_SIZE,
        value: settings.fontSizeCode,
        defaultValue: DEFAULT_UNIFIED_SETTINGS.fontSizeCode,
        onChange: (fontSizeCode) => updateSettings({ fontSizeCode }),
      }}
      preview={preview ?? <CodeFontPreview />}
    />
  );
}

function TerminalFontRow() {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const defaults = useFontDefaultFamilies();
  return (
    <FontFamilySettingsRow
      {...searchableSetting("terminal-font")}
      description="Terminal output. Code blocks and changes have their own size."
      defaultFamily={defaults.code}
      defaultValue={DEFAULT_UNIFIED_SETTINGS.fontFamilyTerminal}
      value={settings.fontFamilyTerminal}
      onValueChange={(fontFamilyTerminal) => updateSettings({ fontFamilyTerminal })}
      onReset={() =>
        updateSettings({
          fontFamilyTerminal: DEFAULT_UNIFIED_SETTINGS.fontFamilyTerminal,
          fontSizeTerminal: DEFAULT_UNIFIED_SETTINGS.fontSizeTerminal,
        })
      }
      requireMonospace
      size={{
        label: "Terminal font size",
        min: MIN_TERMINAL_FONT_SIZE,
        max: MAX_TERMINAL_FONT_SIZE,
        value: settings.fontSizeTerminal,
        defaultValue: DEFAULT_UNIFIED_SETTINGS.fontSizeTerminal,
        onChange: (fontSizeTerminal) => updateSettings({ fontSizeTerminal }),
      }}
      preview={
        <TerminalFontPreview
          family={resolveTerminalFontPreference({
            advanced: true,
            code: settings.fontFamilyCode,
            terminal: settings.fontFamilyTerminal,
          })}
          size={settings.fontSizeTerminal}
        />
      }
    />
  );
}

function FontSmoothingRow() {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  if (!isMacPlatform(navigator.platform)) return null;
  return (
    <SettingsRow
      {...searchableSetting("font-smoothing")}
      description="Use thinner gray text smoothing instead of the macOS default."
      resetAction={
        settings.fontSmoothing !== DEFAULT_UNIFIED_SETTINGS.fontSmoothing ? (
          <SettingResetButton
            label="font smoothing"
            onClick={() =>
              updateSettings({ fontSmoothing: DEFAULT_UNIFIED_SETTINGS.fontSmoothing })
            }
          />
        ) : null
      }
      control={
        <Switch
          checked={settings.fontSmoothing}
          onCheckedChange={(checked) => updateSettings({ fontSmoothing: Boolean(checked) })}
          aria-label="Font smoothing"
        />
      }
    />
  );
}

function WordWrapRow() {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  return (
    <SettingsRow
      {...searchableSetting("word-wrap")}
      description="Wrap long lines in code blocks, tables, changes, and file previews by default."
      resetAction={
        settings.wordWrap !== DEFAULT_UNIFIED_SETTINGS.wordWrap ? (
          <SettingResetButton
            label="word wrapping"
            onClick={() => updateSettings({ wordWrap: DEFAULT_UNIFIED_SETTINGS.wordWrap })}
          />
        ) : null
      }
      control={
        <Switch
          checked={settings.wordWrap}
          onCheckedChange={(checked) => updateSettings({ wordWrap: Boolean(checked) })}
          aria-label="Wrap code, tables, changes, and file previews by default"
        />
      }
    />
  );
}

function FontSettingsGroup() {
  return (
    <>
      <InterfaceFontRow />
      <PromptFontRow />
      <CodeFontRow />
      <TerminalFontRow />
      <FontSmoothingRow />
    </>
  );
}

/**
 * The two-font view: one sans, one monospace. The prompt follows the
 * interface font and the terminal follows the monospace font, so the demos
 * under each row show every surface the choice reaches.
 */
function SimpleFontRows() {
  const settings = useScopedSettings();
  return (
    <>
      <InterfaceFontRow preview={<PromptFontPreview />} />
      <CodeFontRow
        title="Monospace font"
        description="Code blocks, changes, file previews, and the terminal."
        preview={
          <>
            <CodeFontPreview />
            <TerminalFontPreview
              family={resolveTerminalFontPreference({
                advanced: false,
                code: settings.fontFamilyCode,
                terminal: settings.fontFamilyTerminal,
              })}
              size={resolveTerminalFontSizePreference({
                advanced: false,
                code: settings.fontSizeCode,
                terminal: settings.fontSizeTerminal,
              })}
            />
          </>
        }
      />
    </>
  );
}

// Font smoothing only renders on macOS, so a search jump to it elsewhere
// must not flip the section - the target would never mount to be scrolled to.
const ADVANCED_TYPOGRAPHY_TARGET_IDS: ReadonlySet<string> = new Set([
  "prompt-font",
  "terminal-font",
  ...(typeof navigator !== "undefined" && isMacPlatform(navigator.platform)
    ? ["font-smoothing"]
    : []),
]);

/**
 * The two-font view by default - one sans, one monospace, each cascading to
 * every surface it reaches - with an Advanced switch in the section header
 * that reveals the per-surface override rows. The choice persists locally,
 * and a settings-search jump to an override row flips Advanced on so the
 * target exists to scroll to.
 */
function TypographySection() {
  const [advanced, setAdvanced] = useLocalStorage(
    TYPOGRAPHY_ADVANCED_STORAGE_KEY,
    false,
    Schema.Boolean,
  );
  const searchTargetId = useSettingsSearchTargetId();
  // Flip Advanced on once per search jump so the hidden target can mount and
  // scroll; tracking the handled id lets the user turn it back off without
  // the still-set target immediately re-expanding the section.
  const lastExpandedTargetRef = useRef<string | null>(null);
  useEffect(() => {
    if (searchTargetId === null || !ADVANCED_TYPOGRAPHY_TARGET_IDS.has(searchTargetId)) return;
    if (lastExpandedTargetRef.current === searchTargetId) return;
    lastExpandedTargetRef.current = searchTargetId;
    setAdvanced(true);
  }, [searchTargetId, setAdvanced]);
  return (
    <SettingsSection
      id="typography"
      title="Typography"
      headerAction={
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
          Advanced
          <Switch
            checked={advanced}
            onCheckedChange={(checked) => setAdvanced(Boolean(checked))}
            aria-label="Show advanced typography settings"
          />
        </label>
      }
    >
      {advanced ? <FontSettingsGroup /> : <SimpleFontRows />}
      <WordWrapRow />
    </SettingsSection>
  );
}

function FontFamilySettingsRow({
  id,
  title,
  description,
  defaultFamily,
  defaultValue,
  preview,
  value,
  onValueChange,
  onReset,
  requireMonospace = false,
  size,
}: {
  id?: string;
  title: string;
  description: string;
  /** What an unset preference renders as, e.g. "Menlo". */
  defaultFamily: string;
  /** The persisted family value supplied by the unified settings defaults. */
  defaultValue: string;
  preview?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  onReset: () => void;
  requireMonospace?: boolean;
  size: {
    label: string;
    min: number;
    max: number;
    value: number;
    defaultValue: number;
    onChange: (v: number) => void;
  };
}) {
  const trimmed = value.trim();
  // The fallback input edits a draft; the preference only commits once typing
  // pauses and the text probes as an available font (or is an explicit
  // clear), so the current font holds and nothing reflows mid-word.
  const [draft, setDraft] = useState(value);
  const [draftSettled, setDraftSettled] = useState(true);
  const commitTimerRef = useRef<number | null>(null);
  const lastValueRef = useRef(value);
  if (lastValueRef.current !== value) {
    // The committed value changed externally (hydration, reset, picker
    // selection); adopt it and drop any pending commit of a stale draft.
    lastValueRef.current = value;
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    setDraft(value);
    setDraftSettled(true);
  }
  useEffect(
    () => () => {
      if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    },
    [],
  );
  const acceptsFamily = (candidate: string) =>
    isFontFamilyAvailable(candidate) && (!requireMonospace || isMonospaceFamily(candidate));
  const commitDraft = (next: string) => {
    setDraftSettled(true);
    // A rejected name stays in the field, flagged: the terminal would silently
    // fall back to its default, so the row must not claim it took the value.
    if (next.trim().length === 0 || acceptsFamily(next)) {
      onValueChange(next);
    }
  };
  const flushDraft = () => {
    if (commitTimerRef.current === null) return;
    window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = null;
    commitDraft(draft);
  };
  const draftTrimmed = draft.trim();
  // Flag an unknown name only once typing pauses, and never for an empty
  // field - that is the starting state, not a rejected entry.
  const draftPending = draftSettled && draftTrimmed.length > 0 && draftTrimmed !== trimmed;
  const resetToDefault = () => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    setDraft(defaultValue);
    setDraftSettled(true);
    onReset();
  };
  const resetAction =
    value !== defaultValue || size.value !== size.defaultValue ? (
      <SettingResetButton label={title.toLowerCase()} onClick={resetToDefault} />
    ) : null;
  const fontEnumeration = useFontEnumeration();
  // Everyone starts on the plain input; focusing it is the user gesture that
  // runs font discovery. Where the engine can enumerate, the control then
  // upgrades to the picker - popped open when the swap happens under focus,
  // so the interaction continues without a second click.
  const inputFocusedRef = useRef(false);
  const familyControl =
    fontEnumeration.status === "granted" ? (
      <FontFamilyPicker
        ariaLabel={`${title} family`}
        defaultFamily={defaultFamily}
        selectedFamily={trimmed}
        requireMonospace={requireMonospace}
        initialOpen={inputFocusedRef.current}
        onSelect={onValueChange}
      />
    ) : (
      <Input
        size="sm"
        aria-label={`${title} family`}
        aria-invalid={draftPending || undefined}
        autoCapitalize="off"
        autoComplete="off"
        className="min-w-0 flex-1"
        maxLength={200}
        onFocus={() => {
          inputFocusedRef.current = true;
          discoverInstalledFonts();
        }}
        onBlur={() => {
          inputFocusedRef.current = false;
          flushDraft();
        }}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setDraft(next);
          setDraftSettled(false);
          if (commitTimerRef.current !== null) {
            window.clearTimeout(commitTimerRef.current);
          }
          commitTimerRef.current = window.setTimeout(() => {
            commitTimerRef.current = null;
            commitDraft(next);
          }, 400);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") flushDraft();
          if (event.key === "Escape") {
            // Discard uncommitted typing without closing the settings page,
            // which is what an unhandled Escape does.
            event.preventDefault();
            event.stopPropagation();
            if (commitTimerRef.current !== null) {
              window.clearTimeout(commitTimerRef.current);
              commitTimerRef.current = null;
            }
            setDraft(value);
            setDraftSettled(true);
          }
        }}
        placeholder={defaultFamily}
        spellCheck={false}
        value={draft}
      />
    );
  const control = (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">{familyControl}</div>
      <Select
        value={String(size.value)}
        onValueChange={(next) => {
          if (typeof next !== "string") return;
          const parsed = Number(next);
          if (Number.isInteger(parsed) && parsed >= size.min && parsed <= size.max) {
            size.onChange(parsed);
          }
        }}
      >
        <SelectTrigger size="sm" className="w-22 shrink-0" aria-label={size.label}>
          <SelectValue>{size.value} px</SelectValue>
        </SelectTrigger>
        <SelectPopup align="end" alignItemWithTrigger={false}>
          {Array.from({ length: size.max - size.min + 1 }, (_, index) => size.min + index).map(
            (px) => (
              <SelectItem hideIndicator key={px} value={String(px)}>
                {px} px
              </SelectItem>
            ),
          )}
        </SelectPopup>
      </Select>
    </div>
  );
  return (
    <SettingsRow
      {...(id !== undefined ? { id } : {})}
      title={title}
      description={description}
      resetAction={resetAction}
      control={control}
    >
      {preview}
    </SettingsRow>
  );
}

const AUTO_SETTLE_DEFAULT_DAYS = DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleAfterDays ?? 3;

function AutoSettleDaysInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (days: number) => void;
}) {
  // Local draft so the field can be emptied mid-edit; the setting only moves
  // on valid input and snaps back to the persisted value on blur.
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <Input
      size="sm"
      type="number"
      min={MIN_SIDEBAR_AUTO_SETTLE_AFTER_DAYS}
      max={MAX_SIDEBAR_AUTO_SETTLE_AFTER_DAYS}
      className="w-full sm:w-24"
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        // Number(), not parseInt: "3.5" must be rejected (not truncated to a
        // committed 3 while the field shows 3.5) — commit only when the
        // persisted value matches the displayed one.
        const parsed = Number(event.target.value);
        if (
          Number.isInteger(parsed) &&
          parsed >= MIN_SIDEBAR_AUTO_SETTLE_AFTER_DAYS &&
          parsed <= MAX_SIDEBAR_AUTO_SETTLE_AFTER_DAYS
        ) {
          onCommit(parsed);
        }
      }}
      onBlur={() => setDraft(String(value))}
      aria-label="Days of no activity before a chat is marked as done"
    />
  );
}

// The legacy rows sit behind the fold, so a settings-search jump has to
// expand the section before its target can mount and scroll.
const LEGACY_FEATURE_TARGET_IDS: ReadonlySet<string> = new Set([
  "legacy-plan-mode",
  "legacy-sidebar",
]);

/**
 * Retired features kept only for users who still depend on them. Collapsed by
 * default so they stay out of the everyday settings path; a settings-search
 * jump to one of the rows unfolds the section.
 */
function LegacyFeaturesSection() {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const [open, setOpen] = useState(false);
  const searchTargetId = useSettingsSearchTargetId();
  const targetRef = useSettingsSearchTarget<HTMLElement>("legacy-features");
  // Unfold once per search jump; tracking the handled id lets the user fold
  // the section back up without the still-set target immediately reopening it.
  const lastExpandedTargetRef = useRef<string | null>(null);
  useEffect(() => {
    if (searchTargetId === null) {
      // A handled jump clears the target; forgetting it here lets a later
      // jump to the same row expand the section again.
      lastExpandedTargetRef.current = null;
      return;
    }
    if (!LEGACY_FEATURE_TARGET_IDS.has(searchTargetId)) return;
    if (lastExpandedTargetRef.current === searchTargetId) return;
    lastExpandedTargetRef.current = searchTargetId;
    setOpen(true);
  }, [searchTargetId]);

  return (
    <section id="legacy-features" ref={targetRef} tabIndex={-1} className="space-y-2.5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="group flex min-h-8 w-full items-center gap-2 px-3 sm:px-4">
          <h2 className="text-sm font-normal text-foreground/70 transition-colors group-hover:text-foreground">
            Legacy features
          </h2>
          <ChevronRightIcon className="size-4 text-muted-foreground transition-transform duration-200 group-data-panel-open:rotate-90" />
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <SettingsGroup>
            <SettingsRow
              {...searchableSetting("legacy-plan-mode")}
              description="Bring back Build/Plan, /plan, /default, and Shift+Tab. When off, Leonidas uses build mode."
              control={
                <Switch
                  checked={settings.planModeEnabled}
                  onCheckedChange={(checked) => {
                    updateSettings({ planModeEnabled: Boolean(checked) });
                  }}
                  aria-label="Plan mode (legacy)"
                />
              }
            />
            <SettingsRow
              {...searchableSetting("legacy-sidebar")}
              description="Bring back a chat tree for each project instead of the flat sidebar."
              control={
                <Switch
                  checked={settings.legacySidebarEnabled}
                  onCheckedChange={(checked) =>
                    updateSettings({ legacySidebarEnabled: Boolean(checked) })
                  }
                  aria-label="Sidebar (legacy)"
                />
              }
            />
          </SettingsGroup>
        </CollapsiblePanel>
      </Collapsible>
    </section>
  );
}

function SettingsPagePanel({ page }: { readonly page: SettingsPage }) {
  const modifierLabel = isMacPlatform(navigator.platform) ? "⌘" : "Ctrl";
  const sendShortcutOptions = [
    { value: "enter", label: "Enter" },
    { value: "mod-enter-multiline", label: `${modifierLabel} + Enter for multiline messages` },
    { value: "mod-enter", label: `${modifierLabel} + Enter always` },
  ] as const;
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const navigate = useNavigate();
  const { scope, environment, connectedEnvironments } = useSettingsScope();
  // The representative environment supplies the provider list for pickers;
  // a fanned-out model choice is validated against every target before it
  // is written. Per-machine tuning (background activity overrides) still
  // needs exactly one environment.
  const environmentId = environment?.environmentId ?? null;
  const mirrorSkillFolders = useSkillFoldersMirror(environmentId, settings.aiosRoot);
  const isEnvironmentScope = scope.environmentIds.length === 1 && environmentId !== null;
  const hasServerTargets = connectedEnvironments.length > 0;
  const [backgroundActivityDialogOpen, setBackgroundActivityDialogOpen] = useState(false);
  const mixedResponseStreamingMode = useScopedSettingsMixed(["responseStreamingMode"]);
  const lastEnabledProjectGroupingMode = useRef<SidebarProjectGroupingMode>(
    readLastEnabledProjectGroupingMode(),
  );
  const serverProviders = environment?.serverConfig?.providers ?? EMPTY_SERVER_PROVIDERS;
  const supportsAutoSettlement =
    connectedEnvironments.length > 0 &&
    connectedEnvironments.every(
      (target) => target.serverConfig?.environment.capabilities.threadAutoSettlement === true,
    );
  const supportsRestartContinuation =
    connectedEnvironments.length > 0 &&
    connectedEnvironments.every(
      (target) => target.serverConfig?.environment.capabilities.threadRestartContinuation === true,
    );

  const textGenerationProviders = serverProviders.filter(
    (provider) => provider.supportsTextGeneration !== false,
  );
  const textGenerationModelSelection = resolveAppModelSelectionState(
    settings,
    textGenerationProviders,
  );
  const textGenInstanceId = textGenerationModelSelection.instanceId;
  const textGenModel = textGenerationModelSelection.model;
  const textGenModelOptions = textGenerationModelSelection.options;
  const textGenerationModelInstanceEntries = sortProviderInstanceEntries(
    applyProviderInstanceSettings(deriveProviderInstanceEntries(textGenerationProviders), settings),
  );
  const hasTextGenerationProvider = textGenerationModelInstanceEntries.some(
    (entry) => entry.enabled && entry.isAvailable,
  );
  const textGenInstanceEntry = textGenerationModelInstanceEntries.find(
    (entry) => entry.instanceId === textGenInstanceId,
  );
  const textGenProvider: ProviderDriverKind =
    textGenInstanceEntry?.driverKind ?? DEFAULT_DRIVER_KIND;
  const textGenerationModelOptionsByInstance = getCustomModelOptionsByInstance(
    settings,
    textGenerationProviders,
    textGenInstanceId,
    textGenModel,
  );
  const isTextGenerationModelDirty = !Equal.equals(
    settings.textGenerationModelSelection ?? null,
    DEFAULT_UNIFIED_SETTINGS.textGenerationModelSelection ?? null,
  );
  const textGenerationModelDisabledReason = useScopedModelDisabledReason(
    settings,
    textGenerationModelInstanceEntries,
  );
  const resolvedBackgroundActivity = resolveServerBackgroundActivitySettings(settings);
  const activeBackgroundActivityProfile = resolvedBackgroundActivity.profile;
  const backgroundActivityProfileOption = resolveBackgroundActivityProfileOption(settings);
  const mixedBackgroundActivity = useScopedSettingsMixed(["backgroundActivity"]);
  const mixedAddProjectBaseDirectory = useScopedSettingsMixed(["addProjectBaseDirectory"]);
  const mixedTextGenerationModel = useScopedSettingsMixed(["textGenerationModelSelection"]);
  const backgroundActivityDescription =
    backgroundActivityProfileOption === "advanced"
      ? `${ADVANCED_BACKGROUND_ACTIVITY_DESCRIPTION} Shared policy: ${
          BACKGROUND_ACTIVITY_PROFILE_LABELS[activeBackgroundActivityProfile]
        }.`
      : BACKGROUND_ACTIVITY_PROFILE_DESCRIPTIONS[resolvedBackgroundActivity.profile];
  const canResetBackgroundActivity = !Equal.equals(
    settings.backgroundActivity,
    DEFAULT_UNIFIED_SETTINGS.backgroundActivity,
  );

  return (
    <SettingsPageContainer>
      {page === "general" ? (
        <>
          <SettingsSection id="organization" title="Organization">
            <SettingsRow
              {...searchableSetting("project-grouping")}
              description="Put matching projects from different computers in one group."
              resetAction={
                settings.sidebarProjectGroupingMode !==
                DEFAULT_UNIFIED_SETTINGS.sidebarProjectGroupingMode ? (
                  <SettingResetButton
                    label="project grouping"
                    onClick={() =>
                      updateSettings({
                        sidebarProjectGroupingMode:
                          DEFAULT_UNIFIED_SETTINGS.sidebarProjectGroupingMode,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Switch
                  checked={isProjectGroupingEnabled(settings.sidebarProjectGroupingMode)}
                  onCheckedChange={(checked) => {
                    if (!checked && settings.sidebarProjectGroupingMode !== "separate") {
                      lastEnabledProjectGroupingMode.current = settings.sidebarProjectGroupingMode;
                      rememberEnabledProjectGroupingMode(settings.sidebarProjectGroupingMode);
                    }
                    updateSettings({
                      sidebarProjectGroupingMode: projectGroupingModeFromToggle(
                        checked,
                        lastEnabledProjectGroupingMode.current,
                      ),
                    });
                  }}
                  aria-label="Project grouping"
                />
              }
            />
            <SettingsRow
              {...searchableSetting("project-order")}
              description="The order of projects in the sidebar project list and the command palette."
              resetAction={
                settings.sidebarProjectSortOrder !==
                DEFAULT_UNIFIED_SETTINGS.sidebarProjectSortOrder ? (
                  <SettingResetButton
                    label="project order"
                    onClick={() =>
                      updateSettings({
                        sidebarProjectSortOrder: DEFAULT_UNIFIED_SETTINGS.sidebarProjectSortOrder,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Select
                  value={settings.sidebarProjectSortOrder}
                  onValueChange={(value) => {
                    if (isSidebarProjectSortOrder(value)) {
                      updateSettings({ sidebarProjectSortOrder: value });
                    }
                  }}
                >
                  <SelectTrigger size="sm" className="w-full sm:w-44" aria-label="Project order">
                    <SelectValue>
                      {SIDEBAR_PROJECT_SORT_ORDER_LABELS[settings.sidebarProjectSortOrder]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPopup align="end" alignItemWithTrigger={false}>
                    {SidebarProjectSortOrder.literals.map((sortOrder) => (
                      <SelectItem hideIndicator key={sortOrder} value={sortOrder}>
                        {SIDEBAR_PROJECT_SORT_ORDER_LABELS[sortOrder]}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              }
            />

            <SettingsRow
              {...searchableSetting("working-shelf")}
              description="Put chats that are working or being watched in a Working section. They go back to the top of the inbox when they need you."
              resetAction={
                settings.sidebarWorkingShelfEnabled !==
                DEFAULT_UNIFIED_SETTINGS.sidebarWorkingShelfEnabled ? (
                  <SettingResetButton
                    label="working section"
                    onClick={() =>
                      updateSettings({
                        sidebarWorkingShelfEnabled:
                          DEFAULT_UNIFIED_SETTINGS.sidebarWorkingShelfEnabled,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Switch
                  checked={settings.sidebarWorkingShelfEnabled}
                  onCheckedChange={(checked) =>
                    updateSettings({ sidebarWorkingShelfEnabled: Boolean(checked) })
                  }
                  aria-label="Working section (beta)"
                />
              }
            />

            <SettingsRow
              {...searchableSetting("time-format")}
              description="System default follows the clock setting of your browser or computer."
              resetAction={
                settings.timestampFormat !== DEFAULT_UNIFIED_SETTINGS.timestampFormat ? (
                  <SettingResetButton
                    label="time format"
                    onClick={() =>
                      updateSettings({
                        timestampFormat: DEFAULT_UNIFIED_SETTINGS.timestampFormat,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Select
                  value={settings.timestampFormat}
                  onValueChange={(value) => {
                    if (value === "locale" || value === "12-hour" || value === "24-hour") {
                      updateSettings({ timestampFormat: value });
                    }
                  }}
                >
                  <SelectTrigger size="sm" className="w-full sm:w-40" aria-label="Timestamp format">
                    <SelectValue>{TIMESTAMP_FORMAT_LABELS[settings.timestampFormat]}</SelectValue>
                  </SelectTrigger>
                  <SelectPopup align="end" alignItemWithTrigger={false}>
                    <SelectItem hideIndicator value="locale">
                      {TIMESTAMP_FORMAT_LABELS.locale}
                    </SelectItem>
                    <SelectItem hideIndicator value="12-hour">
                      {TIMESTAMP_FORMAT_LABELS["12-hour"]}
                    </SelectItem>
                    <SelectItem hideIndicator value="24-hour">
                      {TIMESTAMP_FORMAT_LABELS["24-hour"]}
                    </SelectItem>
                  </SelectPopup>
                </Select>
              }
            />
            <SettingsRow
              {...searchableSetting("unpin-confirmation")}
              description="Ask before a chat leaves the pinned section."
              resetAction={
                settings.confirmThreadUnpin !== DEFAULT_UNIFIED_SETTINGS.confirmThreadUnpin ? (
                  <SettingResetButton
                    label="unpin confirmation"
                    onClick={() =>
                      updateSettings({
                        confirmThreadUnpin: DEFAULT_UNIFIED_SETTINGS.confirmThreadUnpin,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Switch
                  checked={settings.confirmThreadUnpin}
                  onCheckedChange={(checked) =>
                    updateSettings({ confirmThreadUnpin: Boolean(checked) })
                  }
                  aria-label="Confirm chat unpinning"
                />
              }
            />

            <SettingsRow
              {...searchableSetting("archive-confirmation")}
              description="Ask for a second click on the archive button before Leonidas archives a chat."
              resetAction={
                settings.confirmThreadArchive !== DEFAULT_UNIFIED_SETTINGS.confirmThreadArchive ? (
                  <SettingResetButton
                    label="archive confirmation"
                    onClick={() =>
                      updateSettings({
                        confirmThreadArchive: DEFAULT_UNIFIED_SETTINGS.confirmThreadArchive,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Switch
                  checked={settings.confirmThreadArchive}
                  onCheckedChange={(checked) =>
                    updateSettings({ confirmThreadArchive: Boolean(checked) })
                  }
                  aria-label="Confirm chat archiving"
                />
              }
            />

            <SettingsRow
              {...searchableSetting("delete-confirmation")}
              description="Ask before deleting a chat and its history."
              resetAction={
                settings.confirmThreadDelete !== DEFAULT_UNIFIED_SETTINGS.confirmThreadDelete ? (
                  <SettingResetButton
                    label="delete confirmation"
                    onClick={() =>
                      updateSettings({
                        confirmThreadDelete: DEFAULT_UNIFIED_SETTINGS.confirmThreadDelete,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Switch
                  checked={settings.confirmThreadDelete}
                  onCheckedChange={(checked) =>
                    updateSettings({ confirmThreadDelete: Boolean(checked) })
                  }
                  aria-label="Confirm chat deletion"
                />
              }
            />

            {isElectron ? (
              <SettingsRow
                {...searchableSetting("quit-confirmation")}
                description="Hold mode also quits when you press twice, fast."
                resetAction={
                  settings.confirmQuit !== DEFAULT_UNIFIED_SETTINGS.confirmQuit ? (
                    <SettingResetButton
                      label="quit shortcut behavior"
                      onClick={() =>
                        updateSettings({ confirmQuit: DEFAULT_UNIFIED_SETTINGS.confirmQuit })
                      }
                    />
                  ) : null
                }
                control={
                  <Select
                    value={settings.confirmQuit}
                    onValueChange={(value) => {
                      if (value === "direct" || value === "hold" || value === "double-click") {
                        updateSettings({ confirmQuit: value });
                      }
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full sm:w-40"
                      aria-label="Quit shortcut behavior"
                    >
                      <SelectValue>
                        {QUIT_CONFIRMATION_MODE_LABELS[settings.confirmQuit]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPopup align="end" alignItemWithTrigger={false}>
                      {Object.entries(QUIT_CONFIRMATION_MODE_LABELS).map(([value, label]) => (
                        <SelectItem hideIndicator key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                }
              />
            ) : null}
            <LoginItemSettings />
          </SettingsSection>
          <SettingsSection id="voice" title="Voice">
            <VoiceSettingsRow />
            <DictationTriggerSettings />
          </SettingsSection>
          <SettingsSection id="usage-sharing" title="Privacy">
            <UsageAnalyticsSettings />
            <LeaderboardSettings />
          </SettingsSection>
          <FoldedSettingsSection
            id="notifications"
            title="Notifications"
            control={
              <ResetSectionButton
                label="notification"
                keys={[
                  "notificationMode",
                  "inAppNotificationsEnabled",
                  "notificationQuietHoursEnabled",
                  "notificationQuietHoursStart",
                  "notificationQuietHoursEnd",
                  "notificationVolume",
                  "usageWarningPercent",
                ]}
              />
            }
          >
            <NotificationSettings />
            <NotificationQuietHoursSettings />
            <NotificationVolumeSettings />
            <UsageWarningSettings />
            <SettingsRow
              {...searchableSetting("in-app-notifications")}
              description="Show a small notice when another chat finishes, fails, or needs your answer or approval while this app is in front."
              control={
                <Switch
                  checked={settings.inAppNotificationsEnabled}
                  onCheckedChange={(checked) =>
                    updateSettings({ inAppNotificationsEnabled: checked })
                  }
                  aria-label="In-app notifications"
                />
              }
            />
          </FoldedSettingsSection>
          <FoldedSettingsSection id="api-keys" title="API keys">
            <ApiKeysSettings />
          </FoldedSettingsSection>
        </>
      ) : null}
      {page === "chat" ? (
        <>
          <SettingsSection id="messaging" title="Sending">
            <SettingsRow
              {...searchableSetting("send-shortcut")}
              description="Choose when Enter sends a message or adds a new line"
              resetAction={
                settings.sendShortcut !== DEFAULT_UNIFIED_SETTINGS.sendShortcut ? (
                  <SettingResetButton
                    label="send shortcut"
                    onClick={() =>
                      updateSettings({ sendShortcut: DEFAULT_UNIFIED_SETTINGS.sendShortcut })
                    }
                  />
                ) : null
              }
              control={
                <Select
                  value={settings.sendShortcut}
                  onValueChange={(value) => {
                    const option = sendShortcutOptions.find((option) => option.value === value);
                    if (option) updateSettings({ sendShortcut: option.value });
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-auto min-w-0 max-w-full"
                    aria-label="Send shortcut"
                  >
                    <SelectValue>
                      {
                        sendShortcutOptions.find((option) => option.value === settings.sendShortcut)
                          ?.label
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPopup align="end" alignItemWithTrigger={false}>
                    {sendShortcutOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center justify-between gap-4">
                          {option.label}
                          {settings.sendShortcut === option.value && (
                            <CheckIcon aria-hidden="true" />
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              }
            />
            <SettingsRow
              {...searchableSetting("follow-up-behavior")}
              description={
                "Choose what happens when you send a message while the AI works. A message can wait, or it can go to the AI right now. " +
                (settings.sendShortcut === "mod-enter-multiline"
                  ? `Press ${modifierLabel} + Enter for single-line messages or ${modifierLabel} + Shift + Enter for multiline messages to do the opposite for one message.`
                  : `Press ${modifierLabel}${settings.sendShortcut === "mod-enter" ? " + Shift" : ""} + Enter to do the opposite for one message.`)
              }
              resetAction={
                settings.followUpBehavior !== DEFAULT_UNIFIED_SETTINGS.followUpBehavior ? (
                  <SettingResetButton
                    label="follow-up behavior"
                    onClick={() =>
                      updateSettings({
                        followUpBehavior: DEFAULT_UNIFIED_SETTINGS.followUpBehavior,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Select
                  value={settings.followUpBehavior}
                  onValueChange={(value) => {
                    if (value === "queue" || value === "steer") {
                      updateSettings({ followUpBehavior: value });
                    }
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-auto min-w-0"
                    aria-label="Follow-up behavior"
                  >
                    <SelectValue>
                      {settings.followUpBehavior === "queue" ? "Queue" : "Steer"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPopup align="end" alignItemWithTrigger={false}>
                    <SelectItem value="queue">Queue</SelectItem>
                    <SelectItem value="steer">Steer</SelectItem>
                  </SelectPopup>
                </Select>
              }
            />
          </SettingsSection>
          <SettingsSection
            id="composer"
            title="Message box"
            headerAction={
              <ResetSectionButton
                label="composer"
                keys={[
                  "showSkillsInSlashMenu",
                  "skillFolders",
                  "composerPromptPredictionEnabled",
                  "composerRichTextEnabled",
                  "composerCollapseOnScroll",
                ]}
              />
            }
          >
            <SettingsRow
              {...searchableSetting("skills-in-slash-menu")}
              description="Also show skills in the / menu. Skills always show when you type $."
              resetAction={
                settings.showSkillsInSlashMenu !==
                DEFAULT_UNIFIED_SETTINGS.showSkillsInSlashMenu ? (
                  <SettingResetButton
                    label="skills in slash menu"
                    onClick={() =>
                      updateSettings({
                        showSkillsInSlashMenu: DEFAULT_UNIFIED_SETTINGS.showSkillsInSlashMenu,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Switch
                  checked={settings.showSkillsInSlashMenu}
                  onCheckedChange={(checked) =>
                    updateSettings({ showSkillsInSlashMenu: Boolean(checked) })
                  }
                  aria-label="Show skills in slash menu"
                />
              }
            />
            <SettingsRow
              {...searchableSetting("skill-folders")}
              description="Put skills in your own folders. The / menu shows each folder as one row. Skills with a category or a source also group themselves."
            >
              <SkillFoldersEditor
                prefs={settings.skillFolders}
                aiosRoot={settings.aiosRoot}
                availableSkills={serverProviders.flatMap((provider) => provider.skills)}
                onChange={(skillFolders) => {
                  updateSettings({ skillFolders });
                  mirrorSkillFolders(skillFolders);
                }}
              />
            </SettingsRow>
            <SettingsRow
              {...searchableSetting("prompt-prediction")}
              description="Finish your draft with help from this chat and your past messages. Tab accepts it. Escape hides it."
              control={
                <Switch
                  checked={settings.composerPromptPredictionEnabled}
                  onCheckedChange={(checked) =>
                    updateSettings({ composerPromptPredictionEnabled: Boolean(checked) })
                  }
                  aria-label="Message prediction"
                />
              }
            />

            <PromptPredictionSettings />
            <SettingsRow
              {...searchableSetting("composer-rich-text")}
              description="Show formatted Markdown as you type."
              resetAction={
                settings.composerRichTextEnabled !==
                DEFAULT_UNIFIED_SETTINGS.composerRichTextEnabled ? (
                  <SettingResetButton
                    label="rich text message box"
                    onClick={() =>
                      updateSettings({
                        composerRichTextEnabled: DEFAULT_UNIFIED_SETTINGS.composerRichTextEnabled,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Switch
                  checked={settings.composerRichTextEnabled}
                  onCheckedChange={(checked) =>
                    updateSettings({ composerRichTextEnabled: Boolean(checked) })
                  }
                  aria-label="Rich text message box"
                />
              }
            />
            <SettingsRow
              {...searchableSetting("composer-collapse")}
              description="Shrink the message box of an existing chat to one line when you scroll the chat. Click the message box or start to type to make it big again."
              resetAction={
                settings.composerCollapseOnScroll !==
                DEFAULT_UNIFIED_SETTINGS.composerCollapseOnScroll ? (
                  <SettingResetButton
                    label="shrink the message box on scroll"
                    onClick={() =>
                      updateSettings({
                        composerCollapseOnScroll: DEFAULT_UNIFIED_SETTINGS.composerCollapseOnScroll,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Switch
                  checked={settings.composerCollapseOnScroll}
                  onCheckedChange={(checked) =>
                    updateSettings({ composerCollapseOnScroll: Boolean(checked) })
                  }
                  aria-label="Shrink the message box on scroll"
                />
              }
            />
          </SettingsSection>
        </>
      ) : null}
      {page === "diffs" ? (
        <>
          <SettingsSection
            id="diffs"
            title="Changes"
            headerAction={
              <ResetSectionButton
                label="diff"
                keys={["diffIgnoreWhitespace", "diffFilesCollapsed", "diffLayout"]}
              />
            }
          >
            <SettingsRow
              {...searchableSetting("hide-whitespace-changes")}
              description="Choose if the changes panel hides edits that only change spaces."
              resetAction={
                settings.diffIgnoreWhitespace !== DEFAULT_UNIFIED_SETTINGS.diffIgnoreWhitespace ? (
                  <SettingResetButton
                    label="space-only changes"
                    onClick={() =>
                      updateSettings({
                        diffIgnoreWhitespace: DEFAULT_UNIFIED_SETTINGS.diffIgnoreWhitespace,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Switch
                  checked={settings.diffIgnoreWhitespace}
                  onCheckedChange={(checked) =>
                    updateSettings({ diffIgnoreWhitespace: Boolean(checked) })
                  }
                  aria-label="Hide space-only changes by default"
                />
              }
            />
            <SettingsRow
              {...searchableSetting("default-diff-file-state")}
              description="Open changed files expanded or collapsed when you open changes or the Code tab of a pull request."
              resetAction={
                settings.diffFilesCollapsed !== DEFAULT_UNIFIED_SETTINGS.diffFilesCollapsed ? (
                  <SettingResetButton
                    label="default state of changed files"
                    onClick={() =>
                      updateSettings({
                        diffFilesCollapsed: DEFAULT_UNIFIED_SETTINGS.diffFilesCollapsed,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Select
                  value={settings.diffFilesCollapsed ? "collapsed" : "expanded"}
                  onValueChange={(value) => {
                    if (value === "expanded" || value === "collapsed") {
                      updateSettings({ diffFilesCollapsed: value === "collapsed" });
                    }
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-full sm:w-40"
                    aria-label="Default state of changed files"
                  >
                    <SelectValue>
                      {settings.diffFilesCollapsed ? "Collapsed" : "Expanded"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPopup align="end" alignItemWithTrigger={false}>
                    <SelectItem hideIndicator value="expanded">
                      Expanded
                    </SelectItem>
                    <SelectItem hideIndicator value="collapsed">
                      Collapsed
                    </SelectItem>
                  </SelectPopup>
                </Select>
              }
            />
            <SettingsRow
              {...searchableSetting("diff-layout")}
              description="Show changes stacked or side by side. The switch in the changes toolbar also changes this."
              resetAction={
                settings.diffLayout !== DEFAULT_UNIFIED_SETTINGS.diffLayout ? (
                  <SettingResetButton
                    label="layout of changes"
                    onClick={() =>
                      updateSettings({ diffLayout: DEFAULT_UNIFIED_SETTINGS.diffLayout })
                    }
                  />
                ) : null
              }
              control={
                <Select
                  value={settings.diffLayout}
                  onValueChange={(value) => {
                    if (value === "stacked" || value === "split") {
                      updateSettings({ diffLayout: value });
                    }
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-full sm:w-40"
                    aria-label="Layout of changes"
                  >
                    <SelectValue>{DIFF_LAYOUT_LABELS[settings.diffLayout]}</SelectValue>
                  </SelectTrigger>
                  <SelectPopup align="end" alignItemWithTrigger={false}>
                    <SelectItem hideIndicator value="stacked">
                      {DIFF_LAYOUT_LABELS.stacked}
                    </SelectItem>
                    <SelectItem hideIndicator value="split">
                      {DIFF_LAYOUT_LABELS.split}
                    </SelectItem>
                  </SelectPopup>
                </Select>
              }
            />
          </SettingsSection>
          <SettingsSection id="panels" title="Panels">
            <SettingsRow
              {...searchableSetting("proactive-panels")}
              description="Open linked pull requests first. If there is none, open Changes when the AI edits at least 3 files or 50 lines."
              resetAction={
                settings.proactivePanelsEnabled !==
                DEFAULT_UNIFIED_SETTINGS.proactivePanelsEnabled ? (
                  <SettingResetButton
                    label="proactive panels"
                    onClick={() =>
                      updateSettings({
                        proactivePanelsEnabled: DEFAULT_UNIFIED_SETTINGS.proactivePanelsEnabled,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Switch
                  checked={settings.proactivePanelsEnabled}
                  onCheckedChange={(checked) =>
                    updateSettings({ proactivePanelsEnabled: Boolean(checked) })
                  }
                  aria-label="Proactive panels"
                />
              }
            />
          </SettingsSection>
        </>
      ) : null}
      {page === "threads" ? (
        <>
          <ProjectDefaultsSettings category="general" />
          <SettingsSection id="chats" title="Chats">
            <SettingsRow
              serverScoped
              {...searchableSetting("auto-resume-limited-threads")}
              description="Continue a chat that stopped at a usage limit when the limit resets. Each chat can cancel its plan to continue."
              settingKeys={["autoResumeLimitedThreads"]}
              control={
                <ScopedSwitch
                  settingKeys={["autoResumeLimitedThreads"]}
                  checked={settings.autoResumeLimitedThreads}
                  onCheckedChange={(checked) =>
                    updateSettings({ autoResumeLimitedThreads: Boolean(checked) })
                  }
                  aria-label="Continue paused chats when the limit ends"
                />
              }
            />
            <SettingsRow
              serverScoped
              {...searchableSetting("snooze-limited-threads")}
              description="Pause a chat that stopped at a usage limit until the limit resets. Use it with the setting above to continue when the chat wakes."
              settingKeys={["snoozeLimitedThreads"]}
              control={
                <ScopedSwitch
                  settingKeys={["snoozeLimitedThreads"]}
                  checked={settings.snoozeLimitedThreads}
                  onCheckedChange={(checked) =>
                    updateSettings({ snoozeLimitedThreads: Boolean(checked) })
                  }
                  aria-label="Pause chats that reach a usage limit"
                />
              }
            />
            <SnoozePresetsRow />
            {supportsAutoSettlement ? (
              <>
                <SettingsRow
                  serverScoped
                  settingKeys={["sidebarAutoSettleOnMerge"]}
                  {...searchableSetting("auto-settle-merged-threads")}
                  description="Mark a chat as done when its pull request merges. A closed pull request also marks its chat as done."
                  resetAction={
                    settings.sidebarAutoSettleOnMerge !==
                    DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleOnMerge ? (
                      <SettingResetButton
                        label="marking merged chats as done"
                        onClick={() =>
                          updateSettings({
                            sidebarAutoSettleOnMerge:
                              DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleOnMerge,
                          })
                        }
                      />
                    ) : null
                  }
                  control={
                    <ScopedSwitch
                      settingKeys={["sidebarAutoSettleOnMerge"]}
                      checked={settings.sidebarAutoSettleOnMerge}
                      onCheckedChange={(checked) =>
                        updateSettings({ sidebarAutoSettleOnMerge: Boolean(checked) })
                      }
                      aria-label="Mark merged chats as done"
                    />
                  }
                />

                <SettingsRow
                  serverScoped
                  settingKeys={["sidebarAutoSettleAfterDays"]}
                  {...searchableSetting("auto-settle-inactive-threads")}
                  description="A chat in the sidebar with no activity for this long is marked as done by itself."
                  resetAction={
                    settings.sidebarAutoSettleAfterDays !==
                    DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleAfterDays ? (
                      <SettingResetButton
                        label="marking inactive chats as done"
                        onClick={() =>
                          updateSettings({
                            sidebarAutoSettleAfterDays:
                              DEFAULT_UNIFIED_SETTINGS.sidebarAutoSettleAfterDays,
                          })
                        }
                      />
                    ) : null
                  }
                  control={
                    <ScopedSwitch
                      settingKeys={["sidebarAutoSettleAfterDays"]}
                      checked={settings.sidebarAutoSettleAfterDays !== null}
                      onCheckedChange={(checked) =>
                        updateSettings({
                          sidebarAutoSettleAfterDays: checked ? AUTO_SETTLE_DEFAULT_DAYS : null,
                        })
                      }
                      aria-label="Mark inactive chats as done"
                    />
                  }
                />
                {settings.sidebarAutoSettleAfterDays !== null ? (
                  <SettingsRow
                    serverScoped
                    settingKeys={["sidebarAutoSettleAfterDays"]}
                    title={searchableSetting("days-before-auto-settle").title}
                    description="New activity in a done chat brings it back."
                    control={
                      <AutoSettleDaysInput
                        value={settings.sidebarAutoSettleAfterDays}
                        onCommit={(days) => updateSettings({ sidebarAutoSettleAfterDays: days })}
                      />
                    }
                  />
                ) : null}
              </>
            ) : null}
            <SettingsRow
              serverScoped
              settingKeys={["addProjectBaseDirectory"]}
              {...searchableSetting("add-project-starts-in")}
              description='Leave empty to start in "~/" when the Add project window opens.'
              resetAction={
                settings.addProjectBaseDirectory !==
                DEFAULT_UNIFIED_SETTINGS.addProjectBaseDirectory ? (
                  <SettingResetButton
                    label="start folder for Add project"
                    onClick={() =>
                      updateSettings({
                        addProjectBaseDirectory: DEFAULT_UNIFIED_SETTINGS.addProjectBaseDirectory,
                      })
                    }
                  />
                ) : null
              }
              control={
                <DraftInput
                  size="sm"
                  className="w-full sm:w-72"
                  value={mixedAddProjectBaseDirectory ? "" : settings.addProjectBaseDirectory}
                  onCommit={(next) => updateSettings({ addProjectBaseDirectory: next })}
                  placeholder={mixedAddProjectBaseDirectory ? "Mixed" : "~/"}
                  spellCheck={false}
                  aria-label="Start folder for Add project"
                />
              }
            />
          </SettingsSection>
          <SettingsSection id="behavior" title="AI">
            <ReasoningEffortSettings />
            <SettingsRow
              {...searchableSetting("efficiency-profile")}
              description={EFFICIENCY_PROFILES[settings.efficiencyProfile].description}
              resetAction={
                settings.efficiencyProfile !== DEFAULT_UNIFIED_SETTINGS.efficiencyProfile ? (
                  <SettingResetButton
                    label="efficiency profile"
                    onClick={() =>
                      updateSettings({
                        efficiencyProfile: DEFAULT_UNIFIED_SETTINGS.efficiencyProfile,
                        composerAutoRoutePreference:
                          EFFICIENCY_PROFILES[DEFAULT_UNIFIED_SETTINGS.efficiencyProfile]
                            .routePreference,
                      })
                    }
                  />
                ) : null
              }
              control={
                <Select
                  value={settings.efficiencyProfile}
                  onValueChange={(value) => {
                    if (value === "economy" || value === "balanced" || value === "max") {
                      updateSettings({
                        efficiencyProfile: value,
                        composerAutoRoutePreference: EFFICIENCY_PROFILES[value].routePreference,
                      });
                    }
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-auto min-w-0"
                    aria-label="Efficiency profile"
                  >
                    <SelectValue>
                      {EFFICIENCY_PROFILES[settings.efficiencyProfile].label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPopup align="end" alignItemWithTrigger={false}>
                    {(["economy", "balanced", "max"] as const).map((value) => (
                      <SelectItem key={value} value={value}>
                        {EFFICIENCY_PROFILES[value].label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              }
            />
            <SettingsRow
              serverScoped
              settingKeys={["textGenerationModelSelection"]}
              {...searchableSetting("text-generation-model")}
              description="Used for chat titles and other text that the AI writes on connected devices. The source control settings can use a different model."
              resetAction={
                hasServerTargets && isTextGenerationModelDirty ? (
                  <SettingResetButton
                    label="model for writing text"
                    onClick={() =>
                      updateSettings({
                        textGenerationModelSelection:
                          DEFAULT_UNIFIED_SETTINGS.textGenerationModelSelection,
                      })
                    }
                  />
                ) : null
              }
              control={
                !hasServerTargets ? (
                  <span className="text-sm text-muted-foreground">
                    Connect a computer to choose its model for writing text.
                  </span>
                ) : !hasTextGenerationProvider ? (
                  <span className="text-sm text-muted-foreground">
                    No AI service can write text yet. Add an AI account first.
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <ProviderModelPicker
                      environmentId={environmentId}
                      activeInstanceId={textGenInstanceId}
                      model={textGenModel}
                      lockedProvider={null}
                      instanceEntries={textGenerationModelInstanceEntries}
                      modelOptionsByInstance={textGenerationModelOptionsByInstance}
                      triggerClassName={SETTINGS_PICKER_TRIGGER_CLASSNAME}
                      {...(mixedTextGenerationModel ? { triggerLabel: "Mixed" } : {})}
                      getModelDisabledReason={textGenerationModelDisabledReason}
                      {...(environmentId
                        ? {
                            onOpenProviderSetup: (instanceId: ProviderInstanceId) => {
                              void navigate({
                                to: "/settings/providers",
                                search: { environmentId, instanceId },
                              });
                            },
                          }
                        : {})}
                      onInstanceModelChange={(instanceId, model) => {
                        const reason = textGenerationModelDisabledReason(instanceId, model);
                        if (reason) {
                          toastManager.add({
                            type: "error",
                            title: "Model for writing text not saved",
                            description: reason,
                          });
                          return;
                        }
                        updateSettings({
                          textGenerationModelSelection: resolveAppModelSelectionState(
                            {
                              ...settings,
                              textGenerationModelSelection: createModelSelection(instanceId, model),
                            },
                            textGenerationProviders,
                          ),
                        });
                      }}
                    />
                    {textGenInstanceEntry ? (
                      <TraitsPicker
                        provider={textGenProvider}
                        models={
                          // Use the exact instance's models (rather than the
                          // first-kind-match) so a custom text-gen instance like
                          // `codex_personal` gets its own model list, not the
                          // default Codex one.
                          textGenInstanceEntry?.models ?? []
                        }
                        model={textGenModel}
                        prompt=""
                        onPromptChange={() => {}}
                        modelOptions={textGenModelOptions}
                        allowPromptInjectedEffort={false}
                        planModeEnabled={
                          settings.planModeEnabled || selectsPlanAgent(textGenModelOptions)
                        }
                        triggerClassName={SETTINGS_PICKER_TRIGGER_CLASSNAME}
                        onModelOptionsChange={(nextOptions) => {
                          updateSettings({
                            textGenerationModelSelection: resolveAppModelSelectionState(
                              {
                                ...settings,
                                textGenerationModelSelection: createModelSelection(
                                  textGenInstanceId,
                                  textGenModel,
                                  nextOptions,
                                ),
                              },
                              textGenerationProviders,
                            ),
                          });
                        }}
                      />
                    ) : null}
                  </div>
                )
              }
            />
            <ThreadTitleInstructionsSettings />
            <AdvancedSettings
              targetIds={[
                searchableSetting("route-light-delegated-tasks").id,
                searchableSetting("subagent-free-tier-models").id,
                searchableSetting("response-streaming").id,
              ]}
            >
              <SettingsRow
                serverScoped
                {...searchableSetting("route-light-delegated-tasks")}
                description="Send helper jobs that name no model to the cheapest capable model. Switch accounts near their usage limit."
                settingKeys={["routeLightDelegatedTasks"]}
                control={
                  <ScopedSwitch
                    settingKeys={["routeLightDelegatedTasks"]}
                    checked={settings.routeLightDelegatedTasks}
                    onCheckedChange={(checked) =>
                      updateSettings({ routeLightDelegatedTasks: Boolean(checked) })
                    }
                    aria-label="Send helper work to the cheapest capable model"
                  />
                }
              />
              <SettingsRow
                serverScoped
                {...searchableSetting("subagent-free-tier-models")}
                description="A helper on a ticked model starts at once. Any other model shows a confirm card first. A model-tiers.json file in your AIOS overrides this list."
                settingKeys={["subagentFreeTierModels"]}
                control={
                  <SubagentModelPicker
                    providers={serverProviders}
                    selected={settings.subagentFreeTierModels}
                    onChange={(next) => updateSettings({ subagentFreeTierModels: next })}
                    aria-label="Helper models that start without asking"
                  />
                }
              />
              <SettingsRow
                serverScoped
                settingKeys={["responseStreamingMode"]}
                {...searchableSetting("response-streaming")}
                description={
                  mixedResponseStreamingMode
                    ? "The chosen places use different modes."
                    : RESPONSE_STREAMING_MODE_DESCRIPTIONS[settings.responseStreamingMode]
                }
                resetAction={
                  settings.responseStreamingMode !==
                  DEFAULT_UNIFIED_SETTINGS.responseStreamingMode ? (
                    <SettingResetButton
                      label="response streaming"
                      onClick={() =>
                        updateSettings({
                          responseStreamingMode: DEFAULT_UNIFIED_SETTINGS.responseStreamingMode,
                        })
                      }
                    />
                  ) : null
                }
                control={
                  <Select
                    value={mixedResponseStreamingMode ? null : settings.responseStreamingMode}
                    onValueChange={(value) => {
                      if (value === "turn" || value === "paragraph") {
                        updateSettings({ responseStreamingMode: value });
                      }
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full sm:w-56"
                      aria-label="Show replies as they are written"
                    >
                      <SelectValue>
                        {(value: ResponseStreamingMode | null) =>
                          value === null ? "Mixed" : RESPONSE_STREAMING_MODE_LABELS[value]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPopup align="end" alignItemWithTrigger={false}>
                      <SelectItem hideIndicator value="turn">
                        {RESPONSE_STREAMING_MODE_LABELS.turn}
                      </SelectItem>
                      <SelectItem hideIndicator value="paragraph">
                        {RESPONSE_STREAMING_MODE_LABELS.paragraph}
                      </SelectItem>
                    </SelectPopup>
                  </Select>
                }
              />
            </AdvancedSettings>
          </SettingsSection>
        </>
      ) : null}
      {page === "worktrees" ? (
        <>
          <SettingsSection id="worktree-start" title="New separate copies">
            <SettingsRow
              serverScoped
              settingKeys={["newWorktreesStartFromOrigin"]}
              {...searchableSetting("start-from-origin")}
              description="Makes the separate copy from the newest matching branch on origin, not from your local branch."
              resetAction={
                settings.newWorktreesStartFromOrigin !==
                DEFAULT_UNIFIED_SETTINGS.newWorktreesStartFromOrigin ? (
                  <SettingResetButton
                    label="new separate copies start from origin"
                    onClick={() =>
                      updateSettings({
                        newWorktreesStartFromOrigin:
                          DEFAULT_UNIFIED_SETTINGS.newWorktreesStartFromOrigin,
                      })
                    }
                  />
                ) : null
              }
              control={
                <ScopedSwitch
                  settingKeys={["newWorktreesStartFromOrigin"]}
                  checked={settings.newWorktreesStartFromOrigin}
                  onCheckedChange={(checked) =>
                    updateSettings({ newWorktreesStartFromOrigin: Boolean(checked) })
                  }
                  aria-label="Start new separate copies from origin by default"
                />
              }
            />
          </SettingsSection>
          <StorageSections view="worktrees" />
        </>
      ) : null}
      {page === "maintenance" ? (
        <>
          <SettingsSection id="settings-backup-section" title="Settings backup">
            <SettingsBackupSettings />
          </SettingsSection>
          <SettingsSection id="cache" title="Cache">
            <CacheSettings />
          </SettingsSection>
          <SettingsSection id="upkeep" title="Upkeep">
            <SettingsRow
              serverScoped
              settingKeys={["enableProviderUpdateChecks"]}
              {...searchableSetting("provider-update-checks")}
              description="Check if a newer version of an installed AI service program is available."
              resetAction={
                settings.enableProviderUpdateChecks !==
                DEFAULT_UNIFIED_SETTINGS.enableProviderUpdateChecks ? (
                  <SettingResetButton
                    label="AI service update checks"
                    onClick={() =>
                      updateSettings({
                        enableProviderUpdateChecks:
                          DEFAULT_UNIFIED_SETTINGS.enableProviderUpdateChecks,
                      })
                    }
                  />
                ) : null
              }
              control={
                <ScopedSwitch
                  settingKeys={["enableProviderUpdateChecks"]}
                  checked={settings.enableProviderUpdateChecks}
                  onCheckedChange={(checked) =>
                    updateSettings({ enableProviderUpdateChecks: Boolean(checked) })
                  }
                  aria-label="Check AI service versions"
                />
              }
            />
            <AdvancedSettings
              targetIds={[
                searchableSetting("continue-threads-after-server-update").id,
                searchableSetting("background-activity").id,
              ]}
            >
              <SettingsRow
                {...searchableSetting("continue-threads-after-server-update")}
                serverScoped
                settingKeys={["continueThreadsAfterServerUpdate"]}
                description="Continue stopped chats by themselves after an update, a crash, or a restart of the chosen computers."
                status={
                  !supportsRestartContinuation
                    ? "All chosen computers must support this."
                    : undefined
                }
                resetAction={
                  supportsRestartContinuation &&
                  settings.continueThreadsAfterServerUpdate !==
                    EFFECTIVE_SERVER_SETTINGS_DEFAULTS.continueThreadsAfterServerUpdate ? (
                    <SettingResetButton
                      label="continue chats after restarts"
                      onClick={() =>
                        updateSettings({
                          continueThreadsAfterServerUpdate:
                            EFFECTIVE_SERVER_SETTINGS_DEFAULTS.continueThreadsAfterServerUpdate,
                        })
                      }
                    />
                  ) : null
                }
                control={
                  <ScopedSwitch
                    settingKeys={["continueThreadsAfterServerUpdate"]}
                    checked={settings.continueThreadsAfterServerUpdate}
                    disabled={!supportsRestartContinuation}
                    onCheckedChange={(checked) =>
                      updateSettings({ continueThreadsAfterServerUpdate: Boolean(checked) })
                    }
                    aria-label="Continue chats after restarts"
                  />
                }
              />
              <SettingsRow
                serverScoped
                settingKeys={["backgroundActivity"]}
                id={searchableSetting("background-activity").id}
                title={
                  <span className="inline-flex items-center gap-1.5">
                    {searchableSetting("background-activity").title}
                    <PolicyTooltip>
                      This shared policy decides if background work can run. This includes Git
                      checks and AI service checks. It decides when the time for each check comes.
                    </PolicyTooltip>
                  </span>
                }
                description={backgroundActivityDescription}
                resetAction={
                  canResetBackgroundActivity ? (
                    <SettingResetButton
                      label="background activity"
                      onClick={() => updateSettings(resetBackgroundActivitySettings())}
                    />
                  ) : null
                }
                control={
                  <>
                    <Select
                      value={mixedBackgroundActivity ? null : backgroundActivityProfileOption}
                      onValueChange={(value) => {
                        if (value === "advanced") {
                          if (isEnvironmentScope) setBackgroundActivityDialogOpen(true);
                          return;
                        }
                        if (
                          value === "balanced" ||
                          value === "performance" ||
                          value === "battery-saver"
                        ) {
                          updateSettings(backgroundActivityProfileSettings(value));
                        }
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-full sm:w-40"
                        aria-label="Background activity profile"
                      >
                        <SelectValue>
                          {(value: BackgroundActivityProfileOption | null) =>
                            value === null
                              ? "Mixed"
                              : BACKGROUND_ACTIVITY_PROFILE_OPTION_LABELS[value]
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectPopup align="end" alignItemWithTrigger={false}>
                        <SelectItem hideIndicator value="balanced">
                          {BACKGROUND_ACTIVITY_PROFILE_LABELS.balanced}
                        </SelectItem>
                        <SelectItem hideIndicator value="performance">
                          {BACKGROUND_ACTIVITY_PROFILE_LABELS.performance}
                        </SelectItem>
                        <SelectItem hideIndicator value="battery-saver">
                          {BACKGROUND_ACTIVITY_PROFILE_LABELS["battery-saver"]}
                        </SelectItem>
                        <SelectItem hideIndicator value="advanced" disabled={!isEnvironmentScope}>
                          {isEnvironmentScope
                            ? BACKGROUND_ACTIVITY_PROFILE_OPTION_LABELS.advanced
                            : `${BACKGROUND_ACTIVITY_PROFILE_OPTION_LABELS.advanced} (one computer)`}
                        </SelectItem>
                      </SelectPopup>
                    </Select>
                    {backgroundActivityProfileOption === "advanced" && isEnvironmentScope ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="outline"
                              aria-label="Configure advanced background activity"
                              onClick={() => setBackgroundActivityDialogOpen(true)}
                            >
                              <SettingsIcon className="size-4" />
                            </Button>
                          }
                        />
                        <TooltipPopup side="top">Configure background activity</TooltipPopup>
                      </Tooltip>
                    ) : null}
                    <BackgroundActivityAdvancedDialog
                      open={backgroundActivityDialogOpen && isEnvironmentScope}
                      onOpenChange={setBackgroundActivityDialogOpen}
                    />
                  </>
                }
              />
            </AdvancedSettings>
          </SettingsSection>
          <StorageSections view="maintenance" />
        </>
      ) : null}
      {page === "about" ? (
        <SettingsSection id="about" title="About">
          <SettingsRow title="Your AI, your files" description={OWN_YOUR_BRAIN_LINE} />
          <SettingsRow
            title="Updates and update notes"
            description="See what changed in every version."
            control={<ReleaseHistoryButton />}
          />
          {isElectron || HOSTED_APP_CHANNEL ? (
            <AboutVersionSection />
          ) : (
            <>
              <SettingsRow
                id={searchableSetting("app-version").id}
                title={<AboutVersionTitle />}
                description="This is the current version of Leonidas."
              />
              {IS_NIGHTLY_BUILD ? <NightlyMobileBetaRow /> : null}
            </>
          )}
          <SettingsRow
            {...searchableSetting("privacy-policy")}
            description="How we handle your data, including the anonymous usage data Leonidas collects."
            control={
              <Button
                render={<a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer noopener" />}
                size="sm"
                variant="outline"
              >
                View policy
              </Button>
            }
          />
          <SettingsRow
            {...searchableSetting("open-source-licenses")}
            description="Notices for the parts, images, and extra tools that Leonidas uses."
            control={
              <Button
                render={<Link to="/settings/open-source-licenses" />}
                size="sm"
                variant="outline"
              >
                View licenses
              </Button>
            }
          />
        </SettingsSection>
      ) : null}
      {page === "labs" ? <LegacyFeaturesSection /> : null}
    </SettingsPageContainer>
  );
}

export type SettingsPage =
  | "general"
  | "chat"
  | "diffs"
  | "threads"
  | "worktrees"
  | "maintenance"
  | "about"
  | "labs";

export function GeneralSettingsPanel() {
  return <SettingsPagePanel page="general" />;
}

export function ChatSettingsPanel() {
  return <SettingsPagePanel page="chat" />;
}

export function DiffsSettingsPanel() {
  return <SettingsPagePanel page="diffs" />;
}

export function ThreadsSettingsPanel() {
  return <SettingsPagePanel page="threads" />;
}

export function WorktreesSettingsPanel() {
  return <SettingsPagePanel page="worktrees" />;
}

export function MaintenanceSettingsPanel() {
  return <SettingsPagePanel page="maintenance" />;
}

export function AboutSettingsPanel() {
  return <SettingsPagePanel page="about" />;
}

export function LabsSettingsPanel() {
  return <SettingsPagePanel page="labs" />;
}

export function ArchivedThreadsPanel() {
  const { scope } = useSettingsScope();
  const { unarchiveThread, confirmAndDeleteThread } = useThreadActions();
  const {
    snapshots: archivedSnapshots,
    error: archiveError,
    isLoading: isLoadingArchive,
    refresh: refreshArchivedThreads,
  } = useArchivedThreadSnapshots(scope.environmentIds);

  const archivedGroups = useMemo(() => {
    const selectedProjectKeys =
      scope.kind === "project" || scope.kind === "checkout"
        ? new Set(scope.members.map((member) => `${member.environmentId}:${member.id}`))
        : null;
    const projectsByEnvironmentAndId = new Map(
      archivedSnapshots.flatMap(({ environmentId, snapshot }) =>
        snapshot.projects
          .filter(
            (project) =>
              selectedProjectKeys === null ||
              selectedProjectKeys.has(`${environmentId}:${project.id}`),
          )
          .map(
            (project) => [`${environmentId}:${project.id}`, { ...project, environmentId }] as const,
          ),
      ),
    );
    const threads = archivedSnapshots.flatMap(({ environmentId, snapshot }) =>
      snapshot.threads.map((thread) => presentThreadShell(environmentId, thread)),
    );

    const archivedProjects = Array.from(projectsByEnvironmentAndId.values());
    const groups: Array<{
      readonly project: (typeof archivedProjects)[number];
      readonly threads: Array<(typeof threads)[number]>;
    }> = [];
    for (const project of archivedProjects) {
      const projectThreads: Array<(typeof threads)[number]> = [];
      for (const thread of threads) {
        if (thread.projectId === project.id && thread.environmentId === project.environmentId) {
          projectThreads.push(thread);
        }
      }
      if (projectThreads.length > 0) {
        groups.push({
          project,
          threads: projectThreads.toSorted((left, right) => {
            const leftKey = left.archivedAt ?? left.createdAt;
            const rightKey = right.archivedAt ?? right.createdAt;
            return rightKey.localeCompare(leftKey) || right.id.localeCompare(left.id);
          }),
        });
      }
    }
    return groups;
  }, [archivedSnapshots, scope]);

  const handleArchivedThreadContextMenu = useCallback(
    async (threadRef: ScopedThreadRef, position: { x: number; y: number }) => {
      const api = readLocalApi();
      if (!api) return;
      const clicked = await api.contextMenu.show(
        [
          { id: "unarchive", label: "Unarchive" },
          { id: "delete", label: "Delete", destructive: true },
        ],
        position,
      );

      if (clicked === "unarchive") {
        const result = await unarchiveThread(threadRef);
        if (result._tag === "Success") {
          refreshArchivedThreads();
        } else if (!isAtomCommandInterrupted(result)) {
          const error = squashAtomCommandFailure(result);
          toastManager.add(
            stackedThreadToast({
              type: "error",
              title: "Could not unarchive the chat",
              ...userErrorToastFields(error),
            }),
          );
        }
        return;
      }

      if (clicked === "delete") {
        const result = await confirmAndDeleteThread(threadRef);
        if (result._tag === "Success") {
          refreshArchivedThreads();
        } else if (!isAtomCommandInterrupted(result)) {
          const error = squashAtomCommandFailure(result);
          toastManager.add(
            stackedThreadToast({
              type: "error",
              title: "Failed to delete thread",
              ...userErrorToastFields(error),
            }),
          );
        }
      }
    },
    [confirmAndDeleteThread, refreshArchivedThreads, unarchiveThread],
  );

  return (
    <SettingsPageContainer>
      {archivedGroups.length === 0 ? (
        <SettingsSection
          id={isLoadingArchive ? undefined : searchableSetting("archive").id}
          title={searchableSetting("archive").title}
        >
          <SettingsRow
            title={
              <span className="inline-flex items-center gap-2">
                {isLoadingArchive ? (
                  <Spinner size="sm" tone="muted" />
                ) : (
                  <ArchiveIcon className="size-3.5 text-muted-foreground" />
                )}
                {isLoadingArchive
                  ? "Loading archived chats"
                  : archiveError
                    ? "Could not load archived chats. Try again."
                    : "No archived chats"}
              </span>
            }
            description={
              isLoadingArchive
                ? "Checking the connected computers."
                : (archiveError ?? "No archived chats yet. Archived chats show here.")
            }
          />
        </SettingsSection>
      ) : (
        archivedGroups.map(({ project, threads: projectThreads }, index) => (
          <SettingsSection
            key={`${project.environmentId}:${project.id}`}
            id={index === 0 ? searchableSetting("archive").id : undefined}
            title={project.title}
            icon={<ProjectFavicon project={project} />}
          >
            {projectThreads.map((thread) => (
              <SettingsRow
                key={thread.id}
                onContextMenu={(event) => {
                  event.preventDefault();
                  void (async () => {
                    const result = await settlePromise(() =>
                      handleArchivedThreadContextMenu(
                        scopeThreadRef(thread.environmentId, thread.id),
                        {
                          x: event.clientX,
                          y: event.clientY,
                        },
                      ),
                    );
                    if (result._tag === "Failure") {
                      const error = squashAtomCommandFailure(result);
                      toastManager.add(
                        stackedThreadToast({
                          type: "error",
                          title: "The archived chat action failed",
                          ...userErrorToastFields(error),
                        }),
                      );
                    }
                  })();
                }}
                title={thread.title}
                description={
                  <>
                    Archived {formatRelativeTimeLabel(thread.archivedAt ?? thread.createdAt)}
                    {" \u00b7 Created "}
                    {formatRelativeTimeLabel(thread.createdAt)}
                  </>
                }
                control={
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="shrink-0"
                    onClick={() => {
                      void (async () => {
                        const result = await unarchiveThread(
                          scopeThreadRef(thread.environmentId, thread.id),
                        );
                        if (result._tag === "Success") {
                          refreshArchivedThreads();
                          return;
                        }
                        if (!isAtomCommandInterrupted(result)) {
                          const error = squashAtomCommandFailure(result);
                          toastManager.add(
                            stackedThreadToast({
                              type: "error",
                              title: "Could not unarchive the chat",
                              ...userErrorToastFields(error),
                            }),
                          );
                        }
                      })();
                    }}
                  >
                    <ArchiveX className="size-3.5" />
                    <span>Unarchive</span>
                  </Button>
                }
              />
            ))}
          </SettingsSection>
        ))
      )}
    </SettingsPageContainer>
  );
}
