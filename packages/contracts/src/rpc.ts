import { ReleaseStatus } from "./releaseStatus.ts";
import {
  OrchestrationV2SearchThreadError,
  OrchestrationV2SearchThreadInput,
  OrchestrationV2SearchThreadResult,
} from "./orchestrationV2.ts";
import { OrchestrationDispatchCommandError } from "./orchestrationDispatch.ts";
import {
  MarketingDecideInput,
  MarketingDecideOutput,
  MarketingListInput,
  MarketingListResult,
  MarketingRpcError,
} from "./marketing.ts";
import {
  ContentHistoryInput,
  ContentHistoryResult,
  ContentListInput,
  ContentListResult,
  ContentMoveInput,
  ContentRpcError,
  ContentSaveScriptInput,
  ContentPairingAcceptInput,
  ContentPairingStartInput,
  ContentSyncInput,
  ContentDecideDealInput,
  ContentCreateDealInput,
  ContentWriteResult,
  ContentPairingAcceptResult,
  ContentPairingCode,
  ContentSyncResult,
  ContentDecideDealResult,
  ContentDealWriteResult,
} from "./content.ts";
import { EventsAppendInput, EventsSubscribeInput, FeedEventError, FeedUpdate } from "./events.ts";
import {
  McpAppCallToolInput,
  McpAppCallToolResult,
  McpAppReadResourceInput,
  McpAppReadResourceResult,
  McpAppRequestError,
  McpAppToolInfo,
  McpAppToolInfoInput,
  McpAppUpdateModelContextInput,
} from "./mcpApps.ts";
import {
  ChatGptReconnectProfileInput,
  ChatGptReconnectProfile,
  ChatGptImportProfileInput,
  ChatGptHandoffInput,
  ChatGptHandoffState,
} from "./providerSetup.ts";
import {
  TaskBoardSnapshot,
  TaskBoardReadError,
  TaskBoardTask,
  TaskBoardListInput,
  TaskBoardCreateInput,
  TaskBoardClaimInput,
  TaskBoardReleaseInput,
  TaskBoardCompleteInput,
  TaskBoardCompletions,
  FocusAttachment,
  FocusAttachmentInput,
  FocusSnapshot,
  AiosUsageShape,
  FocusSubscribeInput,
  AiosDirection,
  FocusUpdateInput,
  TaskBoardUpdateInput,
  TaskBoardOperationError,
  TaskBoardWorkspaceInput,
  TaskBoardWorkspaceSnapshot,
  TaskBoardCardUpdateInput,
  TaskBoardCardCreateInput,
  InboxDrop,
  InboxDropInput,
  InboxUndoInput,
  TaskBoardShareInput,
  TaskBoardAiosConfirmInput,
  TaskBoardAiosDetectInput,
  TaskBoardAiosDetectResult,
  TaskBoardHome,
  TaskBoardHomeInput,
  TaskBoardHomePriorityToggleInput,
  TaskBoardHomePriorityToggleResult,
  AiosFolderListInput,
  AiosFolderList,
  AiosWorkspaceScopeInput,
  AiosWorkspacesListResult,
  WorkspacePackWidgetsResult,
  WorkspaceOrgResult,
  WorkspaceOrgChangeInput,
  WorkspaceOrgDecideInput,
  WorkspaceOrgActionResult,
  AiosWorkspaceSummary,
  AiosWorkspaceInitInput,
  TaskBoardHomeNews,
  LayaUsage,
  PonytailCodexHooks,
  PonytailCodexHooksInput,
  PonytailUsage,
  TaskBoardHomeWeather,
  TaskBoardHomeWeatherInput,
} from "./taskBoard.ts";
import {
  WorkspacePictureError,
  WorkspacePictureRemoveInput,
  WorkspacePicturesListResult,
  WorkspacePictureSetInput,
} from "./workspacePictures.ts";
import {
  AreaSyncJoinResult,
  AreaSyncScopeInput,
  AreaSyncStatusResult,
  AreaSyncSyncResult,
} from "./areaSync.ts";
import {
  HardwareAcknowledgeAlertInput,
  HardwareAlert,
  HardwareHistory,
  HardwareHistoryInput,
  HardwareInventory,
  HardwareInventoryInput,
  HardwareLimitsResult,
  HardwareLiveEvent,
  HardwareSetDeepSensorsInput,
  HardwareSetLimitInput,
  HardwarePrepareAgentInput,
  HardwarePrepareAgentResult,
  HardwarePcStatus,
  HardwareWatchError,
  HardwareWatchStatus,
} from "./hardwareWatch.ts";
import { DevPreviewError, DevPreviewInput, DevPreviewState } from "./devPreview.ts";
import {
  FilesDeleteInput,
  FilesDeleteResult,
  FilesError,
  FilesListInput,
  FilesListResult,
  SubagentRunsError,
  SubagentRunsInput,
  SubagentRunsResult,
} from "./archive.ts";
import {
  ImagesCancelInput,
  ImagesError,
  ImagesGenerateInput,
  ImagesGenerateResult,
  ImagesKeepInput,
  ImagesRetryInput,
  ImagesSetBaseUrlInput,
  ImagesState,
  ImagesSubscribeInput,
} from "./images.ts";
import {
  LocalModelsActionResult,
  LocalModelsAdvice,
  LocalModelsCompareInput,
  LocalModelsCompareResult,
  LocalModelsError,
  LocalModelsModelInput,
  LocalModelsPickInput,
  LocalModelsPickResult,
  LocalModelsTokenReport,
  LocalModelsTokenReportInput,
  LocalModelsPullInput,
  LocalModelsStartInput,
  LocalModelsState,
} from "./localModels.ts";
import * as Schema from "effect/Schema";
import { ReplyStylesListInput, ReplyStylesListResult } from "./replyStyle.ts";
import {
  SavedItem,
  SavedItemError,
  SavedItemCreateInput,
  SavedItemGetInput,
  SavedItemImportInput,
  SavedItemLaunchInput,
  SavedItemListInput,
  SavedItemListResult,
  SavedItemScheduleInput,
  SavedItemTaskInput,
  SavedItemTransitionInput,
  SavedItemUpdateInput,
} from "./savedItem.ts";
import * as Rpc from "effect/rpc/Rpc";
import * as RpcGroup from "effect/rpc/RpcGroup";
import * as RpcMiddleware from "effect/rpc/RpcMiddleware";
import { NonNegativeInt, TrimmedNonEmptyString } from "./baseSchemas.ts";
import {
  CodexAuthCallbackInput,
  CodexAuthCallbackState,
  ProviderAuthCancelInput,
  ProviderAuthCompleteInput,
  ProviderAuthState,
  ProviderAuthStartInput,
  ProviderAuthRespondInput,
  ProviderInstallCancelInput,
  ProviderInstallState,
  ProviderSetupError,
  ProviderSetupInput,
} from "./providerSetup.ts";

import {
  AcpRegistryAcceptUrlAuthInput,
  AcpRegistryAcceptUrlAuthResult,
  AcpRegistryDeleteSessionInput,
  AcpRegistryDeleteSessionResult,
  AcpRegistryDisableProviderInput,
  AcpRegistryDisableProviderResult,
  AcpRegistryImportSessionInput,
  AcpRegistryImportSessionResult,
  AcpRegistryListSessionsInput,
  AcpRegistryListSessionsResult,
  AcpRegistryListProvidersInput,
  AcpRegistryListProvidersResult,
  AcpRegistryLogoutInput,
  AcpRegistryLogoutResult,
  AcpRegistryManagedBinaryUninstallInput,
  AcpRegistryManagedBinaryUninstallResult,
  AcpRegistryOperationError,
  AcpRegistryPrepareInput,
  AcpRegistryPrepareResult,
  AcpRegistrySearchInput,
  AcpRegistrySearchResult,
  AcpRegistrySetProviderInput,
  AcpRegistrySetProviderResult,
} from "./acpRegistry.ts";
import { ExternalLauncherError, LaunchEditorInput } from "./editor.ts";
import {
  AuthAccessStreamError,
  AuthAccessStreamEvent,
  EnvironmentAuthorizationError,
} from "./auth.ts";
import {
  BackgroundPolicySnapshot,
  ClientActivityReportInput,
  HostPowerSnapshot,
} from "./background.ts";
import {
  FilesystemGetMetadataInput,
  FilesystemGetMetadataResult,
  FilesystemBrowseInput,
  FilesystemBrowseResult,
  FilesystemBrowseError,
  FilesystemInspectFolderInput,
  FilesystemInspectFolderResult,
} from "./filesystem.ts";
import { LayaSetupInput, LayaSetupResult } from "./laya.ts";
import {
  ThreadHandoffInput,
  ThreadHandoffResult,
  ThreadSweepInput,
  ThreadSweepResult,
} from "./threadSweep.ts";
import {
  AgentSessionImportInput,
  AgentSessionImportProjectChangedError,
  AgentSessionImportProjectNotFoundError,
  AgentSessionImportResult,
  AgentSessionScanInput,
  AgentSessionScanResult,
  AgentSessionScanError,
} from "./agentSessions.ts";
import {
  AssetAccessError,
  AssetCreateUrlInput,
  AssetCreateUrlResult,
  AttachmentCreateUploadUrlInput,
  AttachmentCreateUploadUrlResult,
  AttachmentDeleteInput,
  AttachmentUploadSigningKeyError,
} from "./assets.ts";
import {
  PersistChatAttachmentsError,
  PersistChatAttachmentsInput,
  PersistChatAttachmentsResult,
} from "./chatAttachment.ts";
import {
  OrchestrationGetFullThreadDiffError,
  OrchestrationGetTurnDiffError,
} from "./checkpointDiff.ts";
import {
  WorktreeSetupCancelInput,
  WorktreeSetupCancelResult,
  WorktreeSetupStreamEvent,
  WorktreeSetupSubscribeInput,
} from "./worktreeSetup.ts";
import {
  GitActionProgressEvent,
  VcsSwitchRefInput,
  VcsSwitchRefResult,
  GitCommandError,
  VcsCreateRefInput,
  VcsCreateRefResult,
  VcsCreateWorktreeInput,
  VcsCreateWorktreeResult,
  VcsInitInput,
  VcsListRefsInput,
  VcsListRefsResult,
  GitManagerServiceError,
  GitPreparePullRequestThreadInput,
  GitPreparePullRequestThreadResult,
  VcsPullInput,
  GitPullRequestRefInput,
  VcsPullResult,
  VcsRemoveWorktreeInput,
  GitResolvePullRequestResult,
  GitRunStackedActionInput,
  VcsStatusInput,
  VcsStatusSubscriptionInput,
  VcsStatusResult,
  VcsStatusStreamEvent,
} from "./git.ts";
import {
  ReviewDiffFileContentsInput,
  ReviewDiffFileContentsResult,
  ReviewDiffPreviewError,
  ReviewDiffPreviewInput,
  ReviewDiffPreviewResult,
} from "./review.ts";
import { KeybindingsConfigError } from "./keybindings.ts";
import {
  OrchestrationSearchThreadsError,
  OrchestrationSearchThreadsInput,
  OrchestrationSearchThreadsResult,
} from "./threadSearch.ts";
import {
  ProviderUploadFeedbackError,
  ProviderUploadFeedbackInput,
  ProviderUploadFeedbackResult,
} from "./provider.ts";
import { ProviderInstanceId, ProviderInstanceMutation } from "./providerInstance.ts";
import {
  PullRequestActionInput,
  PullRequestActivity,
  PullRequestCommentInput,
  PullRequestCommentUpdateInput,
  PullRequestDetail,
  PullRequestPreview,
  PullRequestChecks,
  PullRequestDiffFileContentsInput,
  PullRequestDiffFileContentsResult,
  PullRequestFilesViewedResult,
  PullRequestInvalidateInput,
  PullRequestReportStateInput,
  PullRequestListInput,
  PullRequestListResult,
  PullRequestListStatsInput,
  PullRequestListStatsResult,
  PullRequestOperationError,
  PullRequestReactionInput,
  PullRequestRef,
  PullRequestRoutingResult,
  PullRequestRoutingIdentityInput,
  PullRequestRoutingIdentityResult,
  PullRequestStack,
  PullRequestLinkedThreadsResult,
  PullRequestSummary,
  PullRequestReviewerCandidateList,
  PullRequestReviewerRequestInput,
  PullRequestLabelCandidateList,
  PullRequestLabelChangeInput,
  PullRequestSetFilesViewedInput,
  PullRequestSubmitReviewInput,
  PullRequestThreadCommentsInput,
  PullRequestThreadCommentsResult,
  PullRequestThreadReplyInput,
  PullRequestThreadResolutionInput,
  PullRequestUnavailableError,
  PullRequestUpdateInput,
} from "./pullRequest.ts";
import {
  RelayClientInstallFailedError,
  RelayClientInstallProgressEventSchema,
  RelayClientStatusSchema,
} from "./relayClient.ts";
import {
  ORCHESTRATION_V2_WS_METHODS,
  OrchestrationGetWorkflowScriptError,
  OrchestrationV2StopWorkflowError,
  OrchestrationV2DispatchCommandError,
  OrchestrationV2GetShellSnapshotError,
  OrchestrationV2GetThreadProjectionError,
  OrchestrationV2RpcSchemas,
  OrchestrationV2ThreadLaunchError,
} from "./orchestrationV2.ts";
import { ThreadContextBreakdownError } from "./contextBreakdown.ts";
import {
  ProjectCreateNewInput,
  ProjectCreateNewResult,
  ProjectEnsureScratchResult,
  ProjectListEntriesError,
  ProjectListEntriesInput,
  ProjectListEntriesResult,
  ProjectReadFileError,
  ProjectReadFileInput,
  ProjectReadFileResult,
  ProjectSearchContentsError,
  ProjectSearchContentsInput,
  ProjectSearchContentsResult,
  ProjectSearchEntriesError,
  ProjectSearchEntriesInput,
  ProjectSearchEntriesResult,
  ProjectWriteFileError,
  ProjectWriteFileInput,
  ProjectWriteFileResult,
} from "./project.ts";
import {
  TerminalAttachInput,
  TerminalObserveInput,
  TerminalAttachStreamEvent,
  TerminalClearInput,
  TerminalCloseInput,
  TerminalError,
  TerminalEvent,
  TerminalMetadataStreamEvent,
  TerminalOpenInput,
  TerminalResizeInput,
  TerminalRestartInput,
  TerminalSessionSnapshot,
  TerminalWriteInput,
} from "./terminal.ts";
import {
  DiscoveredLocalServerList,
  ConfiguredLocalServerUrls,
  PreviewCloseInput,
  PreviewError,
  PreviewEvent,
  PreviewListInput,
  PreviewListResult,
  PreviewClearProfileError,
  PreviewClearProfileInput,
  PreviewReportProfilesInput,
  PreviewNavigateInput,
  PreviewStopLocalServerError,
  PreviewStopLocalServerInput,
  PreviewOpenInput,
  PreviewRefreshInput,
  PreviewReportStatusInput,
  PreviewResizeInput,
  PreviewAdjustInput,
  PreviewSessionSnapshot,
} from "./preview.ts";
import {
  LocalVmConnectInput,
  LocalVmPauseInput,
  LocalVmTarget,
  LocalVmInput,
  LocalVmState,
  LocalVmSession,
  LocalVmScreenshotResult,
  LocalVmError,
} from "./localVm.ts";
import {
  DeviceActionInput,
  DeviceCloseInput,
  DeviceConfigureInput,
  DeviceDetail,
  DeviceDetailInput,
  DeviceError,
  DeviceListInput,
  SshDeviceHostConfig,
  DeviceHostSummary,
  DeviceOpenInput,
  DeviceServiceState,
  DeviceSession,
  DeviceShutdownInput,
} from "./device.ts";
import {} from "./previewAutomation.ts";
import {
  ServerConfigStreamEvent,
  DesktopUpdateCommitInput,
  OtlpEndpointCheckInput,
  OtlpEndpointCheckResult,
  ServerConfig,
  ServerProviderUpdateError,
  ServerProviderUpdateInput,
  ServerLifecycleStreamEvent,
  ServerRemoveKeybindingInput,
  ServerRemoveKeybindingResult,
  ServerProviderUpdatedPayload,
  ServerSelfUpdateError,
  ServerSelfUpdateInput,
  ServerSelfUpdateProgressEvent,
  ServerSelfUpdateResult,
  ServerTraceDiagnosticsResult,
  ServerProcessDiagnosticsResult,
  ServerProcessResourceHistoryInput,
  ServerProcessResourceHistoryResult,
  ServerSignalProcessInput,
  ServerSignalProcessResult,
  ServerUpsertKeybindingInput,
  ServerUpsertKeybindingResult,
} from "./server.ts";
import {
  HostResourcesSnapshot,
  ResourceTelemetryHistory,
  ResourceTelemetryHistoryInput,
  ResourceTelemetryRetryResult,
  ResourceTelemetrySnapshot,
} from "./resourceTelemetry.ts";
import {
  UsageLimitSourceError,
  ProviderConsumeResetCreditInput,
  ProviderConsumeResetCreditResult,
} from "./providerUsageLimits.ts";
import { UsagePricing, UsageReadError, UsageSummary, UsageSummaryInput } from "./usage.ts";
import { TestApiKeyInput, TestApiKeyResult } from "./apiKeys.ts";
import {
  CalendarActionResult,
  CalendarAddLinkInput,
  CalendarEventsInput,
  CalendarEventsResult,
  CalendarGoogleClientInput,
  CalendarGoogleConnectResult,
  CalendarGoogleSelectInput,
  CalendarLinkInput,
  CalendarRemoveInput,
} from "./calendar.ts";
import {
  ModelBenchmarkCatalog,
  ModelBenchmarkReport,
  ModelBenchmarkReportInput,
  ModelRunStats,
} from "./modelBenchmarks.ts";
import {
  StorageCleanupReport,
  ServerSettings,
  ServerSettingsError,
  ServerSettingsPatch,
} from "./settings.ts";
import {
  ScheduledTaskDeleteInput,
  ScheduledTaskDeleteResult,
  ScheduledTaskError,
  ScheduledTaskListInput,
  ScheduledTaskListResult,
  ScheduledTaskRunNowInput,
  ScheduledTaskRotateWebhookTokenInput,
  ScheduledTaskListWebhookDeliveriesInput,
  ScheduledTaskListWebhookDeliveriesResult,
  ScheduledTaskGetWebhookDeliveryInput,
  ScheduledTaskGetWebhookDeliveryResult,
  ScheduledTaskRunNowResult,
  ScheduledTaskSetEnabledInput,
  ScheduledTaskUpsertInput,
  ScheduledTaskMutationResult,
} from "./scheduledTask.ts";
import { SecretRequestAnswerInput, SecretRequestError } from "./secretRequest.ts";
import {
  SubagentCatalog,
  SubagentCatalogEntry,
  SubagentCreateInput,
  SubagentEditError,
  SubagentSpawnApprovalError,
  SubagentSpawnApprovals,
  SubagentSpawnRespondInput,
  SubagentUpdateInput,
} from "./subagentSpawn.ts";
import {
  ProjectCloneActionInput,
  ProjectCloneActionResult,
  ProjectCloneListEvent,
  ProjectCloneStartInput,
  ProjectCloneStartResult,
  ProjectCloneSubscribeInput,
} from "./projectClone.ts";
import {
  SourceControlCloneRepositoryInput,
  SourceControlCloneRepositoryResult,
  SourceControlDiscoveryResult,
  SourceControlPublishRepositoryInput,
  SourceControlPublishRepositoryResult,
  SourceControlRepositoryError,
  SourceControlRepositoryInfo,
  SourceControlRepositoryLookupInput,
} from "./sourceControl.ts";
import { VcsError } from "./vcs.ts";
import { Project, ProjectMutation, ProjectMutationError } from "./project.ts";
import {
  VoiceError,
  VoiceSetGroqKeyInput,
  VoiceStatus,
  VoiceTranscribeInput,
  VoiceTranscribeResult,
} from "./voice.ts";
import {
  VoiceLogMemoryReview,
  VoiceLogMemoryApproveInput,
  VoiceLogMemoryError,
} from "./voiceLogMemory.ts";
import {
  ScribeCommandResult,
  ScribeDeleteHistoryInput,
  ScribeDeleteHistoryResult,
  ScribeDevices,
  ScribeDictionary,
  ScribeEngineError,
  ScribeGoals,
  ScribeGroqKey,
  ScribeHistoryPage,
  ScribeInsights,
  ScribeListHistoryInput,
  ScribeLiveEvent,
  ScribeRejectSuggestionInput,
  ScribePatchSettingsInput,
  ScribePatchSettingsResult,
  ScribeRejectSuggestionResult,
  ScribeSetGroqKeyInput,
  ScribeSettings,
  ScribeStartInput,
  ScribeStatsInput,
  ScribeStopInput,
  ScribeSuggestionList,
} from "./scribe.ts";

export const ScribeStatusSnapshot = Schema.Struct({
  service: Schema.Literal("leonidas-scribe"),
  apiVersion: Schema.Literal(1),
  state: Schema.Literals(["ready", "listening", "processing", "mic_error"]),
  sampledAt: Schema.String,
});

export const ScribeStatusResult = Schema.Union([
  Schema.Struct({ status: Schema.Literal("available"), snapshot: ScribeStatusSnapshot }),
  Schema.Struct({
    status: Schema.Literal("unavailable"),
    reason: Schema.Literals(["offline", "timeout", "invalid_response", "stale", "http_error"]),
  }),
]);
export type ScribeStatusResult = typeof ScribeStatusResult.Type;

export const WS_METHODS = {
  scribeGetStatus: "scribe.getStatus",
  scribeStart: "scribe.start",
  scribeStop: "scribe.stop",
  voiceLogMemoryReview: "voiceLogMemory.review",
  voiceLogMemoryApprove: "voiceLogMemory.approve",
  scribeListHistory: "scribe.listHistory",
  scribeDeleteHistory: "scribe.deleteHistory",
  scribeGetInsights: "scribe.getInsights",
  scribeGetGoals: "scribe.getGoals",
  scribeGetDictionary: "scribe.getDictionary",
  scribePutDictionary: "scribe.putDictionary",
  scribeListSuggestions: "scribe.listSuggestions",
  scribeRejectSuggestion: "scribe.rejectSuggestion",
  scribeGetSettings: "scribe.getSettings",
  scribePatchSettings: "scribe.patchSettings",
  scribeListDevices: "scribe.listDevices",
  scribeGetGroqKey: "scribe.getGroqKey",
  scribeSetGroqKey: "scribe.setGroqKey",
  scribeClearGroqKey: "scribe.clearGroqKey",
  scribeSubscribeEvents: "scribe.subscribeEvents",
  voiceGetStatus: "voice.getStatus",
  voiceSetGroqKey: "voice.setGroqKey",
  voiceClearGroqKey: "voice.clearGroqKey",
  voiceTranscribe: "voice.transcribe",
  // Project registry methods
  projectsList: "projects.list",
  projectsAdd: "projects.add",
  projectsRemove: "projects.remove",
  projectsListEntries: "projects.listEntries",
  projectsReadFile: "projects.readFile",
  taskBoardList: "taskBoard.list",
  taskBoardCreate: "taskBoard.create",
  taskBoardClaim: "taskBoard.claim",
  taskBoardRelease: "taskBoard.release",
  taskBoardComplete: "taskBoard.complete",
  taskBoardSubscribeCompletions: "taskBoard.subscribeCompletions",
  subagentsSubscribeSpawnApprovals: "subagents.subscribeSpawnApprovals",
  subagentsRespondSpawnApproval: "subagents.respondSpawnApproval",
  subagentsList: "subagents.list",
  subagentsUpdate: "subagents.update",
  subagentsCreate: "subagents.create",
  taskBoardUpdate: "taskBoard.update",
  taskBoardWorkspace: "taskBoard.workspace",
  taskBoardCardUpdate: "taskBoard.cardUpdate",
  taskBoardCardCreate: "taskBoard.cardCreate",
  taskBoardShare: "taskBoard.share",
  taskBoardAiosDetect: "taskBoard.aiosDetect",
  taskBoardAiosConfirm: "taskBoard.aiosConfirm",
  taskBoardHome: "taskBoard.home",
  taskBoardHomePriorityToggle: "taskBoard.homePriorityToggle",
  aiosFolderList: "taskBoard.aiosFolderList",
  aiosUsageShape: "taskBoard.aiosUsageShape",
  aiosDirection: "taskBoard.aiosDirection",
  aiosWorkspacesList: "aiosWorkspaces.list",
  aiosWorkspacesInit: "aiosWorkspaces.init",
  aiosWorkspacePicturesList: "aiosWorkspaces.picturesList",
  aiosWorkspacePictureSet: "aiosWorkspaces.pictureSet",
  aiosWorkspacePictureRemove: "aiosWorkspaces.pictureRemove",
  areaSyncJoin: "areaSync.join",
  areaSyncSync: "areaSync.sync",
  areaSyncStatus: "areaSync.status",
  workspacePackWidgets: "workspacePack.widgets",
  workspacePackOrg: "workspacePack.org",
  workspacePackOrgChange: "workspacePack.orgChange",
  workspacePackOrgDecide: "workspacePack.orgDecide",
  taskBoardHomeWeather: "taskBoard.homeWeather",
  taskBoardHomeNews: "taskBoard.homeNews",
  releaseStatusRuns: "releaseStatus.runs",
  layaUsage: "laya.usage",
  ponytailUsage: "ponytail.usage",
  calendarEvents: "calendar.events",
  calendarTestLink: "calendar.testLink",
  calendarAddLink: "calendar.addLink",
  calendarRemove: "calendar.remove",
  calendarGoogleSetClient: "calendar.googleSetClient",
  calendarGoogleConnect: "calendar.googleConnect",
  calendarGoogleSelect: "calendar.googleSelect",
  ponytailCodexHooks: "ponytail.codexHooks",
  focusSubscribe: "focus.subscribe",
  eventsSubscribe: "events.subscribe",
  eventsAppend: "events.append",
  marketingList: "marketing.list",
  marketingDecide: "marketing.decide",
  contentList: "content.list",
  contentHistory: "content.history",
  contentMove: "content.move",
  contentSaveScript: "content.saveScript",
  contentPairingAccept: "content.pairingAccept",
  contentPairingStart: "content.pairingStart",
  contentSync: "content.sync",
  contentDecideDeal: "content.decideDeal",
  contentCreateDeal: "content.createDeal",
  focusUpdate: "focus.update",
  focusAttachment: "focus.attachment",
  hardwareGetInventory: "hardware.getInventory",
  hardwareGetHistory: "hardware.getHistory",
  hardwareGetLimits: "hardware.getLimits",
  hardwareSetLimit: "hardware.setLimit",
  hardwareAcknowledgeAlert: "hardware.acknowledgeAlert",
  hardwareSetDeepSensors: "hardware.setDeepSensors",
  hardwarePrepareAgent: "hardware.prepareAgent",
  hardwareGetStatus: "hardware.getStatus",
  inboxDrop: "inbox.drop",
  inboxUndo: "inbox.undo",
  devPreviewStatus: "devPreview.status",
  devPreviewStart: "devPreview.start",
  devPreviewStop: "devPreview.stop",
  imagesSubscribe: "images.subscribe",
  imagesGenerate: "images.generate",
  imagesCancel: "images.cancel",
  imagesKeep: "images.keep",
  imagesRetry: "images.retry",
  imagesSetBaseUrl: "images.setBaseUrl",
  localModelsSubscribe: "localModels.subscribe",
  localModelsPull: "localModels.pull",
  localModelsCancelPull: "localModels.cancelPull",
  localModelsRun: "localModels.run",
  localModelsStop: "localModels.stop",
  localModelsSpeedTest: "localModels.speedTest",
  localModelsStartOllama: "localModels.startOllama",
  localModelsAdvice: "localModels.advice",
  localModelsCompare: "localModels.compare",
  localModelsComparePick: "localModels.comparePick",
  localModelsTokenReport: "localModels.tokenReport",
  localModelsDelete: "localModels.delete",
  filesList: "files.list",
  filesDelete: "files.delete",
  subagentRunsList: "subagentRuns.list",
  projectsPromptCandidates: "projects.promptCandidates",
  projectsPredictPrompt: "projects.predictPrompt",
  projectsCancelPromptPrediction: "projects.cancelPromptPrediction",
  projectsSearchContents: "projects.searchContents",
  projectsSearchEntries: "projects.searchEntries",
  replyStylesList: "replyStyles.list",
  projectsWriteFile: "projects.writeFile",
  projectsMutate: "projects.mutate",
  projectsEnsureScratch: "projects.ensureScratch",
  projectsCreateNew: "projects.createNew",

  // Shell methods
  shellOpenInEditor: "shell.openInEditor",

  // Filesystem methods
  filesystemBrowse: "filesystem.browse",
  filesystemGetMetadata: "filesystem.getMetadata",
  filesystemInspectFolder: "filesystem.inspectFolder",
  layaSetup: "laya.setup",
  threadSweepRun: "threadSweep.run",
  threadSweepHandoff: "threadSweep.handoff",
  agentSessionsScan: "agentSessions.scan",
  agentSessionsImport: "agentSessions.import",
  assetsCreateUrl: "assets.createUrl",
  assetsPersistChatAttachments: "assets.persistChatAttachments",
  attachmentsCreateUploadUrl: "attachments.createUploadUrl",
  attachmentsDelete: "attachments.delete",

  // MCP Apps methods
  mcpAppsCallTool: "mcpApps.callTool",
  mcpAppsToolInfo: "mcpApps.toolInfo",
  mcpAppsReadResource: "mcpApps.readResource",
  mcpAppsUpdateModelContext: "mcpApps.updateModelContext",

  // Provider methods
  providerUploadFeedback: "provider.uploadFeedback",
  providerAuthStart: "provider.auth.start",
  providerConsumeResetCredit: "provider.consumeResetCredit",
  providerAuthComplete: "provider.auth.complete",
  chatGptReconnectProfile: "provider.chatgpt.reconnect-profile",
  chatGptImportProfile: "provider.chatgpt.import-profile",
  chatGptHandoffSubscribe: "provider.chatgpt.handoff.subscribe",
  codexAuthCallbackSubscribe: "provider.codex.auth-callback.subscribe",
  providerAuthRespond: "provider.auth.respond",
  providerAuthCancel: "provider.auth.cancel",
  providerAuthLogout: "provider.auth.logout",
  providerAuthSubscribe: "provider.auth.subscribe",
  providerInstallStart: "provider.install.start",
  providerInstallCancel: "provider.install.cancel",
  providerInstallSubscribe: "provider.install.subscribe",
  providerInstallRemove: "provider.install.remove",

  // VCS methods
  vcsPull: "vcs.pull",
  vcsRefreshStatus: "vcs.refreshStatus",
  vcsListRefs: "vcs.listRefs",
  vcsCreateWorktree: "vcs.createWorktree",
  vcsRemoveWorktree: "vcs.removeWorktree",
  vcsCreateRef: "vcs.createRef",
  vcsSwitchRef: "vcs.switchRef",
  vcsInit: "vcs.init",

  // Git workflow methods
  gitRunStackedAction: "git.runStackedAction",
  gitResolvePullRequest: "git.resolvePullRequest",
  gitPreparePullRequestThread: "git.preparePullRequestThread",

  // Review methods
  reviewGetDiffPreview: "review.getDiffPreview",
  reviewGetDiffFileContents: "review.getDiffFileContents",

  // Terminal methods
  terminalOpen: "terminal.open",
  terminalAttach: "terminal.attach",
  terminalObserve: "terminal.observe",
  terminalWrite: "terminal.write",
  terminalResize: "terminal.resize",
  terminalClear: "terminal.clear",
  terminalRestart: "terminal.restart",
  terminalClose: "terminal.close",

  // Preview methods
  previewOpen: "preview.open",
  previewNavigate: "preview.navigate",
  previewResize: "preview.resize",
  previewAdjust: "preview.adjust",
  previewRefresh: "preview.refresh",
  previewClose: "preview.close",
  previewList: "preview.list",
  previewClearProfile: "preview.clearProfile",
  previewReportProfiles: "preview.reportProfiles",
  previewReportStatus: "preview.reportStatus",
  previewStopLocalServer: "preview.stopLocalServer",

  localVmList: "localVm.list",
  localVmConnect: "localVm.connect",
  localVmPause: "localVm.pause",
  localVmRelease: "localVm.release",
  localVmScreenshot: "localVm.screenshot",
  localVmInput: "localVm.input",
  // Device methods
  deviceConfigure: "device.configure",
  deviceList: "device.list",
  deviceTestHost: "device.testHost",
  deviceOpen: "device.open",
  deviceClose: "device.close",
  deviceShutdown: "device.shutdown",
  deviceDetail: "device.detail",
  deviceAction: "device.action",

  // Server meta
  serverProbe: "server.probe",
  serverGetConfig: "server.getConfig",
  serverRefreshProviders: "server.refreshProviders",
  serverUpdateProvider: "server.updateProvider",
  serverUpdateServer: "server.updateServer",
  serverUpdateServerWithProgress: "server.updateServerWithProgress",
  serverCommitDesktopUpdate: "server.commitDesktopUpdate",
  serverUpsertKeybinding: "server.upsertKeybinding",
  serverRemoveKeybinding: "server.removeKeybinding",
  serverRunStorageCleanup: "server.runStorageCleanup",
  serverGetStorageCleanupReport: "server.getStorageCleanupReport",
  serverGetSettings: "server.getSettings",
  serverUpdateSettings: "server.updateSettings",
  serverTestApiKey: "server.testApiKey",
  serverDiscoverSourceControl: "server.discoverSourceControl",
  serverSearchAcpRegistry: "server.searchAcpRegistry",
  serverPrepareAcpRegistryAgent: "server.prepareAcpRegistryAgent",
  serverUninstallAcpRegistryManagedBinary: "server.uninstallAcpRegistryManagedBinary",
  serverAcceptAcpRegistryUrlAuth: "server.acceptAcpRegistryUrlAuth",
  serverListAcpRegistrySessions: "server.listAcpRegistrySessions",
  serverImportAcpRegistrySession: "server.importAcpRegistrySession",
  serverDeleteAcpRegistrySession: "server.deleteAcpRegistrySession",
  serverListAcpRegistryProviders: "server.listAcpRegistryProviders",
  serverSetAcpRegistryProvider: "server.setAcpRegistryProvider",
  serverDisableAcpRegistryProvider: "server.disableAcpRegistryProvider",
  serverLogoutAcpRegistry: "server.logoutAcpRegistry",
  serverGetTraceDiagnostics: "server.getTraceDiagnostics",
  serverGetProcessDiagnostics: "server.getProcessDiagnostics",
  serverGetHostResources: "server.getHostResources",
  serverGetProcessResourceHistory: "server.getProcessResourceHistory",
  serverGetResourceTelemetryHistory: "server.getResourceTelemetryHistory",
  serverRetryResourceTelemetry: "server.retryResourceTelemetry",
  serverCheckOtlpEndpoint: "server.checkOtlpEndpoint",
  serverSignalProcess: "server.signalProcess",
  serverReportClientActivity: "server.reportClientActivity",
  serverReportHostPowerState: "server.reportHostPowerState",
  serverGetBackgroundPolicy: "server.getBackgroundPolicy",
  serverGetUsageSummary: "server.getUsageSummary",
  serverRefreshUsageRates: "server.refreshUsageRates",
  serverGetModelBenchmarks: "server.getModelBenchmarks",
  serverGetModelBenchmarkCatalog: "server.getModelBenchmarkCatalog",
  serverGetModelRunStats: "server.getModelRunStats",

  // Scheduled tasks
  scheduledTasksList: "scheduledTasks.list",
  savedItemsList: "savedItems.list",
  savedItemsGet: "savedItems.get",
  savedItemsCreate: "savedItems.create",
  savedItemsUpdate: "savedItems.update",
  savedItemsTransition: "savedItems.transition",
  savedItemsImport: "savedItems.import",
  savedItemsLaunch: "savedItems.launch",
  savedItemsSchedule: "savedItems.schedule",
  savedItemsSaveTask: "savedItems.saveTask",
  scheduledTasksSubscribe: "scheduledTasks.subscribe",
  scheduledTasksUpsert: "scheduledTasks.upsert",
  scheduledTasksSetEnabled: "scheduledTasks.setEnabled",
  scheduledTasksDelete: "scheduledTasks.delete",
  scheduledTasksRunNow: "scheduledTasks.runNow",
  scheduledTasksRotateWebhookToken: "scheduledTasks.rotateWebhookToken",
  secretsAnswerRequest: "secrets.answerRequest",
  scheduledTasksListWebhookDeliveries: "scheduledTasks.listWebhookDeliveries",
  scheduledTasksGetWebhookDelivery: "scheduledTasks.getWebhookDelivery",

  // Cloud environment methods
  cloudGetRelayClientStatus: "cloud.getRelayClientStatus",
  cloudInstallRelayClient: "cloud.installRelayClient",

  // Pull request methods
  pullRequestsList: "pullRequests.list",
  pullRequestsListStats: "pullRequests.listStats",
  pullRequestsSummary: "pullRequests.summary",
  pullRequestsRouting: "pullRequests.routing",
  pullRequestsRoutingIdentity: "pullRequests.routingIdentity",
  pullRequestsStack: "pullRequests.stack",
  pullRequestsLinkedThreads: "pullRequests.linkedThreads",
  pullRequestsDetail: "pullRequests.detail",
  pullRequestsPreview: "pullRequests.preview",
  pullRequestsChecks: "pullRequests.checks",
  pullRequestsActivity: "pullRequests.activity",
  pullRequestsThreadComments: "pullRequests.threadComments",
  pullRequestsDiffFileContents: "pullRequests.diffFileContents",
  pullRequestsFilesViewed: "pullRequests.filesViewed",
  pullRequestsSetFilesViewed: "pullRequests.setFilesViewed",
  pullRequestsRunAction: "pullRequests.runAction",
  pullRequestsUpdate: "pullRequests.update",
  pullRequestsComment: "pullRequests.comment",
  pullRequestsUpdateComment: "pullRequests.updateComment",
  pullRequestsSubmitReview: "pullRequests.submitReview",
  pullRequestsReplyToThread: "pullRequests.replyToThread",
  pullRequestsSetThreadResolution: "pullRequests.setThreadResolution",
  pullRequestsSetReaction: "pullRequests.setReaction",
  pullRequestsInvalidate: "pullRequests.invalidate",
  pullRequestsReportState: "pullRequests.reportState",
  pullRequestsSubscribeRefreshes: "pullRequests.subscribeRefreshes",
  pullRequestsReviewerCandidates: "pullRequests.reviewerCandidates",
  pullRequestsRequestReviewers: "pullRequests.requestReviewers",
  pullRequestsLabelCandidates: "pullRequests.labelCandidates",
  pullRequestsSetLabels: "pullRequests.setLabels",

  // Source control methods
  sourceControlLookupRepository: "sourceControl.lookupRepository",
  sourceControlCloneRepository: "sourceControl.cloneRepository",
  sourceControlPublishRepository: "sourceControl.publishRepository",
  projectCloneStart: "projectClone.start",
  projectCloneCancel: "projectClone.cancel",
  projectCloneRetry: "projectClone.retry",
  subscribeProjectClones: "subscribeProjectClones",

  // Streaming subscriptions
  subscribeVcsStatus: "subscribeVcsStatus",
  subscribeWorktreeSetup: "subscribeWorktreeSetup",
  worktreeSetupCancel: "worktreeSetup.cancel",
  subscribeTerminalEvents: "subscribeTerminalEvents",
  subscribeTerminalMetadata: "subscribeTerminalMetadata",
  subscribePreviewEvents: "subscribePreviewEvents",
  subscribeDiscoveredLocalServers: "subscribeDiscoveredLocalServers",
  subscribeDeviceState: "subscribeDeviceState",
  subscribeServerConfig: "subscribeServerConfig",
  subscribeServerLifecycle: "subscribeServerLifecycle",
  subscribeAuthAccess: "subscribeAuthAccess",
  subscribeBackgroundPolicy: "subscribeBackgroundPolicy",
  subscribeResourceTelemetry: "subscribeResourceTelemetry",
  subscribeHardware: "subscribeHardware",
} as const;

const WsServerUpsertKeybindingRpc = Rpc.make(WS_METHODS.serverUpsertKeybinding, {
  payload: ServerUpsertKeybindingInput,
  success: ServerUpsertKeybindingResult,
  error: Schema.Union([KeybindingsConfigError, EnvironmentAuthorizationError]),
});

const WsServerRemoveKeybindingRpc = Rpc.make(WS_METHODS.serverRemoveKeybinding, {
  payload: ServerRemoveKeybindingInput,
  success: ServerRemoveKeybindingResult,
  error: Schema.Union([KeybindingsConfigError, EnvironmentAuthorizationError]),
});

const WsServerProbeRpc = Rpc.make(WS_METHODS.serverProbe, {
  payload: Schema.Struct({}),
  success: Schema.Struct({}),
  error: EnvironmentAuthorizationError,
});

const WsServerGetConfigRpc = Rpc.make(WS_METHODS.serverGetConfig, {
  payload: Schema.Struct({}),
  success: ServerConfig,
  error: Schema.Union([KeybindingsConfigError, ServerSettingsError, EnvironmentAuthorizationError]),
});

const WsServerRefreshProvidersRpc = Rpc.make(WS_METHODS.serverRefreshProviders, {
  payload: Schema.Struct({
    /**
     * When supplied, only refresh this specific provider instance. When
     * omitted, refresh all configured instances — the legacy `refresh()`
     * behaviour retained for transports that still dispatch untargeted
     * refreshes.
     */
    instanceId: Schema.optional(ProviderInstanceId),
    cwd: Schema.optional(TrimmedNonEmptyString),
    /** With `instanceId` and `cwd`: rescan the workspace's skills and slash
     * commands even when a snapshot for that cwd already exists. */
    fresh: Schema.optional(Schema.Boolean),
    /** Explicit user request: bypass T3-owned caches and rediscover models.
     * Background status refreshes must not open agent sessions. */
    refreshModels: Schema.optional(Schema.Boolean),
  }),
  success: ServerProviderUpdatedPayload,
  error: Schema.Union([EnvironmentAuthorizationError, ProviderSetupError]),
});

const WsServerUpdateProviderRpc = Rpc.make(WS_METHODS.serverUpdateProvider, {
  payload: ServerProviderUpdateInput,
  success: ServerProviderUpdatedPayload,
  error: Schema.Union([ServerProviderUpdateError, EnvironmentAuthorizationError]),
});

const ProviderSetupRpcError = Schema.Union([ProviderSetupError, EnvironmentAuthorizationError]);

const WsProviderConsumeResetCreditRpc = Rpc.make(WS_METHODS.providerConsumeResetCredit, {
  payload: ProviderConsumeResetCreditInput,
  success: ProviderConsumeResetCreditResult,
  error: Schema.Union([ProviderSetupError, UsageLimitSourceError, EnvironmentAuthorizationError]),
});

const WsProviderAuthStartRpc = Rpc.make(WS_METHODS.providerAuthStart, {
  payload: ProviderAuthStartInput,
  success: ProviderAuthState,
  error: ProviderSetupRpcError,
});

const WsProviderAuthRespondRpc = Rpc.make(WS_METHODS.providerAuthRespond, {
  payload: ProviderAuthRespondInput,
  success: ProviderAuthState,
  error: ProviderSetupRpcError,
});

const WsProviderAuthCompleteRpc = Rpc.make(WS_METHODS.providerAuthComplete, {
  payload: ProviderAuthCompleteInput,
  success: ProviderAuthState,
  error: ProviderSetupRpcError,
});

const WsChatGptReconnectProfileRpc = Rpc.make(WS_METHODS.chatGptReconnectProfile, {
  payload: ChatGptReconnectProfileInput,
  success: Schema.NullOr(ChatGptReconnectProfile),
  error: ProviderSetupRpcError,
});
const WsChatGptImportProfileRpc = Rpc.make(WS_METHODS.chatGptImportProfile, {
  payload: ChatGptImportProfileInput,
  success: ProviderAuthState,
  error: ProviderSetupRpcError,
});
const WsChatGptHandoffSubscribeRpc = Rpc.make(WS_METHODS.chatGptHandoffSubscribe, {
  payload: ChatGptHandoffInput,
  success: ChatGptHandoffState,
  error: ProviderSetupRpcError,
  stream: true,
});
const WsCodexAuthCallbackSubscribeRpc = Rpc.make(WS_METHODS.codexAuthCallbackSubscribe, {
  payload: CodexAuthCallbackInput,
  success: CodexAuthCallbackState,
  error: ProviderSetupRpcError,
  stream: true,
});

const WsProviderAuthCancelRpc = Rpc.make(WS_METHODS.providerAuthCancel, {
  payload: ProviderAuthCancelInput,
  success: ProviderAuthState,
  error: ProviderSetupRpcError,
});

const WsProviderAuthLogoutRpc = Rpc.make(WS_METHODS.providerAuthLogout, {
  payload: ProviderSetupInput,
  success: ProviderAuthState,
  error: ProviderSetupRpcError,
});

const WsProviderAuthSubscribeRpc = Rpc.make(WS_METHODS.providerAuthSubscribe, {
  payload: ProviderSetupInput,
  success: ProviderAuthState,
  error: ProviderSetupRpcError,
  stream: true,
});

const WsProviderInstallStartRpc = Rpc.make(WS_METHODS.providerInstallStart, {
  payload: ProviderSetupInput,
  success: ProviderInstallState,
  error: ProviderSetupRpcError,
});

const WsProviderInstallCancelRpc = Rpc.make(WS_METHODS.providerInstallCancel, {
  payload: ProviderInstallCancelInput,
  success: ProviderInstallState,
  error: ProviderSetupRpcError,
});

const WsProviderInstallSubscribeRpc = Rpc.make(WS_METHODS.providerInstallSubscribe, {
  payload: ProviderSetupInput,
  success: ProviderInstallState,
  error: ProviderSetupRpcError,
  stream: true,
});

const WsProviderInstallRemoveRpc = Rpc.make(WS_METHODS.providerInstallRemove, {
  payload: ProviderSetupInput,
  success: ProviderInstallState,
  error: ProviderSetupRpcError,
});

const WsServerUpdateServerRpc = Rpc.make(WS_METHODS.serverUpdateServer, {
  payload: ServerSelfUpdateInput,
  success: ServerSelfUpdateResult,
  error: Schema.Union([ServerSelfUpdateError, EnvironmentAuthorizationError]),
});

const WsServerUpdateServerWithProgressRpc = Rpc.make(WS_METHODS.serverUpdateServerWithProgress, {
  payload: ServerSelfUpdateInput,
  success: ServerSelfUpdateProgressEvent,
  error: Schema.Union([ServerSelfUpdateError, EnvironmentAuthorizationError]),
  stream: true,
});

const WsServerCommitDesktopUpdateRpc = Rpc.make(WS_METHODS.serverCommitDesktopUpdate, {
  payload: DesktopUpdateCommitInput,
  success: ServerSelfUpdateResult,
  error: Schema.Union([ServerSelfUpdateError, EnvironmentAuthorizationError]),
});

const WsServerRunStorageCleanupRpc = Rpc.make(WS_METHODS.serverRunStorageCleanup, {
  payload: Schema.Struct({}),
  success: StorageCleanupReport,
  error: Schema.Union([ServerSettingsError, EnvironmentAuthorizationError]),
});
const WsServerGetStorageCleanupReportRpc = Rpc.make(WS_METHODS.serverGetStorageCleanupReport, {
  payload: Schema.Struct({}),
  success: Schema.NullOr(StorageCleanupReport),
  stream: true,
  error: EnvironmentAuthorizationError,
});

const WsServerGetSettingsRpc = Rpc.make(WS_METHODS.serverGetSettings, {
  payload: Schema.Struct({}),
  success: ServerSettings,
  error: Schema.Union([ServerSettingsError, EnvironmentAuthorizationError]),
});

const WsServerTestApiKeyRpc = Rpc.make(WS_METHODS.serverTestApiKey, {
  payload: TestApiKeyInput,
  success: TestApiKeyResult,
  error: EnvironmentAuthorizationError,
});

const WsServerUpdateSettingsRpc = Rpc.make(WS_METHODS.serverUpdateSettings, {
  payload: Schema.Struct({
    patch: ServerSettingsPatch,
    providerInstanceMutation: Schema.optionalKey(ProviderInstanceMutation),
  }),
  success: ServerSettings,
  error: Schema.Union([ServerSettingsError, EnvironmentAuthorizationError]),
});

const WsServerDiscoverSourceControlRpc = Rpc.make(WS_METHODS.serverDiscoverSourceControl, {
  payload: Schema.Struct({}),
  success: SourceControlDiscoveryResult,
  error: EnvironmentAuthorizationError,
});

const WsServerSearchAcpRegistryRpc = Rpc.make(WS_METHODS.serverSearchAcpRegistry, {
  payload: AcpRegistrySearchInput,
  success: AcpRegistrySearchResult,
  error: Schema.Union([AcpRegistryOperationError, EnvironmentAuthorizationError]),
});

const WsServerPrepareAcpRegistryAgentRpc = Rpc.make(WS_METHODS.serverPrepareAcpRegistryAgent, {
  payload: AcpRegistryPrepareInput,
  success: AcpRegistryPrepareResult,
  error: Schema.Union([AcpRegistryOperationError, EnvironmentAuthorizationError]),
});

const WsServerUninstallAcpRegistryManagedBinaryRpc = Rpc.make(
  WS_METHODS.serverUninstallAcpRegistryManagedBinary,
  {
    payload: AcpRegistryManagedBinaryUninstallInput,
    success: AcpRegistryManagedBinaryUninstallResult,
    error: Schema.Union([AcpRegistryOperationError, EnvironmentAuthorizationError]),
  },
);

const WsServerAcceptAcpRegistryUrlAuthRpc = Rpc.make(WS_METHODS.serverAcceptAcpRegistryUrlAuth, {
  payload: AcpRegistryAcceptUrlAuthInput,
  success: AcpRegistryAcceptUrlAuthResult,
  error: EnvironmentAuthorizationError,
});

const WsServerListAcpRegistrySessionsRpc = Rpc.make(WS_METHODS.serverListAcpRegistrySessions, {
  payload: AcpRegistryListSessionsInput,
  success: AcpRegistryListSessionsResult,
  error: Schema.Union([AcpRegistryOperationError, EnvironmentAuthorizationError]),
});

const WsServerImportAcpRegistrySessionRpc = Rpc.make(WS_METHODS.serverImportAcpRegistrySession, {
  payload: AcpRegistryImportSessionInput,
  success: AcpRegistryImportSessionResult,
  error: Schema.Union([AcpRegistryOperationError, EnvironmentAuthorizationError]),
});

const WsServerDeleteAcpRegistrySessionRpc = Rpc.make(WS_METHODS.serverDeleteAcpRegistrySession, {
  payload: AcpRegistryDeleteSessionInput,
  success: AcpRegistryDeleteSessionResult,
  error: Schema.Union([AcpRegistryOperationError, EnvironmentAuthorizationError]),
});

const WsServerListAcpRegistryProvidersRpc = Rpc.make(WS_METHODS.serverListAcpRegistryProviders, {
  payload: AcpRegistryListProvidersInput,
  success: AcpRegistryListProvidersResult,
  error: Schema.Union([AcpRegistryOperationError, EnvironmentAuthorizationError]),
});

const WsServerSetAcpRegistryProviderRpc = Rpc.make(WS_METHODS.serverSetAcpRegistryProvider, {
  payload: AcpRegistrySetProviderInput,
  success: AcpRegistrySetProviderResult,
  error: Schema.Union([AcpRegistryOperationError, EnvironmentAuthorizationError]),
});

const WsServerDisableAcpRegistryProviderRpc = Rpc.make(
  WS_METHODS.serverDisableAcpRegistryProvider,
  {
    payload: AcpRegistryDisableProviderInput,
    success: AcpRegistryDisableProviderResult,
    error: Schema.Union([AcpRegistryOperationError, EnvironmentAuthorizationError]),
  },
);

const WsServerLogoutAcpRegistryRpc = Rpc.make(WS_METHODS.serverLogoutAcpRegistry, {
  payload: AcpRegistryLogoutInput,
  success: AcpRegistryLogoutResult,
  error: Schema.Union([AcpRegistryOperationError, EnvironmentAuthorizationError]),
});

const WsServerGetTraceDiagnosticsRpc = Rpc.make(WS_METHODS.serverGetTraceDiagnostics, {
  payload: Schema.Struct({}),
  success: ServerTraceDiagnosticsResult,
  error: EnvironmentAuthorizationError,
});

const WsServerGetProcessDiagnosticsRpc = Rpc.make(WS_METHODS.serverGetProcessDiagnostics, {
  payload: Schema.Struct({}),
  success: ServerProcessDiagnosticsResult,
  error: EnvironmentAuthorizationError,
});

const WsServerGetHostResourcesRpc = Rpc.make(WS_METHODS.serverGetHostResources, {
  payload: Schema.Struct({}),
  success: HostResourcesSnapshot,
  error: EnvironmentAuthorizationError,
});

const WsServerGetProcessResourceHistoryRpc = Rpc.make(WS_METHODS.serverGetProcessResourceHistory, {
  payload: ServerProcessResourceHistoryInput,
  success: ServerProcessResourceHistoryResult,
  error: EnvironmentAuthorizationError,
});

const WsServerGetResourceTelemetryHistoryRpc = Rpc.make(
  WS_METHODS.serverGetResourceTelemetryHistory,
  {
    payload: ResourceTelemetryHistoryInput,
    success: ResourceTelemetryHistory,
    error: EnvironmentAuthorizationError,
  },
);

const WsServerRetryResourceTelemetryRpc = Rpc.make(WS_METHODS.serverRetryResourceTelemetry, {
  payload: Schema.Struct({}),
  success: ResourceTelemetryRetryResult,
  error: EnvironmentAuthorizationError,
});

const WsServerCheckOtlpEndpointRpc = Rpc.make(WS_METHODS.serverCheckOtlpEndpoint, {
  payload: OtlpEndpointCheckInput,
  success: OtlpEndpointCheckResult,
  error: EnvironmentAuthorizationError,
});

const WsServerGetUsageSummaryRpc = Rpc.make(WS_METHODS.serverGetUsageSummary, {
  payload: UsageSummaryInput,
  success: UsageSummary,
  error: Schema.Union([EnvironmentAuthorizationError, UsageReadError]),
});

/**
 * Refetches the model rate table ahead of its daily TTL, so a model released
 * since the last fetch gets priced. The next usage summary uses the new table.
 */
/**
 * Public benchmark results for the models the client can run. The server
 * fetches and caches them, so remote clients never call the publisher.
 */
const WsServerGetModelBenchmarksRpc = Rpc.make(WS_METHODS.serverGetModelBenchmarks, {
  payload: ModelBenchmarkReportInput,
  success: ModelBenchmarkReport,
  error: EnvironmentAuthorizationError,
});

const WsServerGetModelRunStatsRpc = Rpc.make(WS_METHODS.serverGetModelRunStats, {
  payload: Schema.Struct({}),
  success: ModelRunStats,
  error: EnvironmentAuthorizationError,
});

const WsServerGetModelBenchmarkCatalogRpc = Rpc.make(WS_METHODS.serverGetModelBenchmarkCatalog, {
  payload: Schema.Struct({}),
  success: ModelBenchmarkCatalog,
  error: EnvironmentAuthorizationError,
});

const WsServerRefreshUsageRatesRpc = Rpc.make(WS_METHODS.serverRefreshUsageRates, {
  payload: Schema.Struct({}),
  success: UsagePricing,
  error: EnvironmentAuthorizationError,
});

const WsServerSignalProcessRpc = Rpc.make(WS_METHODS.serverSignalProcess, {
  payload: ServerSignalProcessInput,
  success: ServerSignalProcessResult,
  error: EnvironmentAuthorizationError,
});

const WsCloudGetRelayClientStatusRpc = Rpc.make(WS_METHODS.cloudGetRelayClientStatus, {
  payload: Schema.Struct({}),
  success: RelayClientStatusSchema,
  error: EnvironmentAuthorizationError,
});

const WsCloudInstallRelayClientRpc = Rpc.make(WS_METHODS.cloudInstallRelayClient, {
  payload: Schema.Struct({}),
  success: RelayClientInstallProgressEventSchema,
  error: Schema.Union([RelayClientInstallFailedError, EnvironmentAuthorizationError]),
  stream: true,
});

const WsServerReportClientActivityRpc = Rpc.make(WS_METHODS.serverReportClientActivity, {
  payload: ClientActivityReportInput,
  error: EnvironmentAuthorizationError,
});

const WsServerReportHostPowerStateRpc = Rpc.make(WS_METHODS.serverReportHostPowerState, {
  payload: HostPowerSnapshot,
  error: EnvironmentAuthorizationError,
});

const WsServerGetBackgroundPolicyRpc = Rpc.make(WS_METHODS.serverGetBackgroundPolicy, {
  payload: Schema.Struct({}),
  success: BackgroundPolicySnapshot,
  error: EnvironmentAuthorizationError,
});

const PullRequestRpcError = Schema.Union([
  PullRequestUnavailableError,
  PullRequestOperationError,
  EnvironmentAuthorizationError,
]);

const WsPullRequestsListRpc = Rpc.make(WS_METHODS.pullRequestsList, {
  payload: PullRequestListInput,
  success: PullRequestListResult,
  error: PullRequestRpcError,
});

/**
 * The line counts for rows already on the page. Its own call because on GitHub the pair costs
 * 40-60% of the listing read that answers everything else on the row, so the rows arrive first
 * and their stats a moment later.
 */
const WsPullRequestsListStatsRpc = Rpc.make(WS_METHODS.pullRequestsListStats, {
  payload: PullRequestListStatsInput,
  success: PullRequestListStatsResult,
  error: PullRequestRpcError,
});

const WsPullRequestsRoutingRpc = Rpc.make(WS_METHODS.pullRequestsRouting, {
  payload: PullRequestRef,
  success: PullRequestRoutingResult,
  error: PullRequestRpcError,
});

const WsPullRequestsRoutingIdentityRpc = Rpc.make(WS_METHODS.pullRequestsRoutingIdentity, {
  payload: PullRequestRoutingIdentityInput,
  success: PullRequestRoutingIdentityResult,
  error: PullRequestRpcError,
});

const WsPullRequestsSummaryRpc = Rpc.make(WS_METHODS.pullRequestsSummary, {
  payload: PullRequestRef,
  success: PullRequestSummary,
  error: PullRequestRpcError,
});

const WsPullRequestsStackRpc = Rpc.make(WS_METHODS.pullRequestsStack, {
  payload: PullRequestRef,
  success: Schema.NullOr(PullRequestStack),
  error: PullRequestRpcError,
});

const WsPullRequestsLinkedThreadsRpc = Rpc.make(WS_METHODS.pullRequestsLinkedThreads, {
  payload: PullRequestRef,
  success: PullRequestLinkedThreadsResult,
  error: PullRequestRpcError,
});

const WsPullRequestsDetailRpc = Rpc.make(WS_METHODS.pullRequestsDetail, {
  payload: PullRequestRef,
  success: PullRequestDetail,
  error: PullRequestRpcError,
});

const WsPullRequestsPreviewRpc = Rpc.make(WS_METHODS.pullRequestsPreview, {
  payload: PullRequestRef,
  success: PullRequestPreview,
  error: PullRequestRpcError,
});

const WsPullRequestsChecksRpc = Rpc.make(WS_METHODS.pullRequestsChecks, {
  payload: PullRequestRef,
  success: Schema.NullOr(PullRequestChecks),
  error: PullRequestRpcError,
});

const WsPullRequestsActivityRpc = Rpc.make(WS_METHODS.pullRequestsActivity, {
  payload: PullRequestRef,
  success: PullRequestActivity,
  error: PullRequestRpcError,
});

const WsPullRequestsThreadCommentsRpc = Rpc.make(WS_METHODS.pullRequestsThreadComments, {
  payload: PullRequestThreadCommentsInput,
  success: PullRequestThreadCommentsResult,
  error: PullRequestRpcError,
});

const WsPullRequestsDiffFileContentsRpc = Rpc.make(WS_METHODS.pullRequestsDiffFileContents, {
  payload: PullRequestDiffFileContentsInput,
  success: PullRequestDiffFileContentsResult,
  error: PullRequestRpcError,
});

const WsPullRequestsFilesViewedRpc = Rpc.make(WS_METHODS.pullRequestsFilesViewed, {
  payload: PullRequestRef,
  success: PullRequestFilesViewedResult,
  error: PullRequestRpcError,
});

const WsPullRequestsSetFilesViewedRpc = Rpc.make(WS_METHODS.pullRequestsSetFilesViewed, {
  payload: PullRequestSetFilesViewedInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsPullRequestsRunActionRpc = Rpc.make(WS_METHODS.pullRequestsRunAction, {
  payload: PullRequestActionInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsPullRequestsUpdateRpc = Rpc.make(WS_METHODS.pullRequestsUpdate, {
  payload: PullRequestUpdateInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsPullRequestsCommentRpc = Rpc.make(WS_METHODS.pullRequestsComment, {
  payload: PullRequestCommentInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsPullRequestsUpdateCommentRpc = Rpc.make(WS_METHODS.pullRequestsUpdateComment, {
  payload: PullRequestCommentUpdateInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsPullRequestsSubmitReviewRpc = Rpc.make(WS_METHODS.pullRequestsSubmitReview, {
  payload: PullRequestSubmitReviewInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsPullRequestsReplyToThreadRpc = Rpc.make(WS_METHODS.pullRequestsReplyToThread, {
  payload: PullRequestThreadReplyInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsPullRequestsSetThreadResolutionRpc = Rpc.make(WS_METHODS.pullRequestsSetThreadResolution, {
  payload: PullRequestThreadResolutionInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsPullRequestsSetReactionRpc = Rpc.make(WS_METHODS.pullRequestsSetReaction, {
  payload: PullRequestReactionInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsPullRequestsInvalidateRpc = Rpc.make(WS_METHODS.pullRequestsInvalidate, {
  payload: PullRequestInvalidateInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsPullRequestsReportStateRpc = Rpc.make(WS_METHODS.pullRequestsReportState, {
  payload: PullRequestReportStateInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsPullRequestsSubscribeRefreshesRpc = Rpc.make(WS_METHODS.pullRequestsSubscribeRefreshes, {
  payload: Schema.Struct({}),
  success: NonNegativeInt,
  error: EnvironmentAuthorizationError,
  stream: true,
});

/**
 * Read on its own rather than as part of the detail: the people who may be asked are only wanted
 * once somebody opens the menu, and reading them with every change request would spend a request
 * per host on a list nobody looked at.
 */
const WsPullRequestsReviewerCandidatesRpc = Rpc.make(WS_METHODS.pullRequestsReviewerCandidates, {
  payload: PullRequestRef,
  success: PullRequestReviewerCandidateList,
  error: PullRequestRpcError,
});

const WsPullRequestsRequestReviewersRpc = Rpc.make(WS_METHODS.pullRequestsRequestReviewers, {
  payload: PullRequestReviewerRequestInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

/** Read when the label menu opens, for the same reason the reviewer candidates are. */
const WsPullRequestsLabelCandidatesRpc = Rpc.make(WS_METHODS.pullRequestsLabelCandidates, {
  payload: PullRequestRef,
  success: PullRequestLabelCandidateList,
  error: PullRequestRpcError,
});

const WsPullRequestsSetLabelsRpc = Rpc.make(WS_METHODS.pullRequestsSetLabels, {
  payload: PullRequestLabelChangeInput,
  success: Schema.Void,
  error: PullRequestRpcError,
});

const WsSourceControlLookupRepositoryRpc = Rpc.make(WS_METHODS.sourceControlLookupRepository, {
  payload: SourceControlRepositoryLookupInput,
  success: SourceControlRepositoryInfo,
  error: Schema.Union([SourceControlRepositoryError, EnvironmentAuthorizationError]),
});

const WsSourceControlCloneRepositoryRpc = Rpc.make(WS_METHODS.sourceControlCloneRepository, {
  payload: SourceControlCloneRepositoryInput,
  success: SourceControlCloneRepositoryResult,
  error: Schema.Union([SourceControlRepositoryError, EnvironmentAuthorizationError]),
});

// Clone-backed project creation. `start` returns once the project exists and
// the clone is running; progress arrives on the subscription.
const WsProjectCloneStartRpc = Rpc.make(WS_METHODS.projectCloneStart, {
  payload: ProjectCloneStartInput,
  success: ProjectCloneStartResult,
  error: Schema.Union([
    SourceControlRepositoryError,
    OrchestrationDispatchCommandError,
    EnvironmentAuthorizationError,
  ]),
});

const WsProjectCloneCancelRpc = Rpc.make(WS_METHODS.projectCloneCancel, {
  payload: ProjectCloneActionInput,
  success: ProjectCloneActionResult,
  error: EnvironmentAuthorizationError,
});

const WsProjectCloneRetryRpc = Rpc.make(WS_METHODS.projectCloneRetry, {
  payload: ProjectCloneActionInput,
  success: ProjectCloneActionResult,
  error: Schema.Union([SourceControlRepositoryError, EnvironmentAuthorizationError]),
});

const WsSubscribeProjectClonesRpc = Rpc.make(WS_METHODS.subscribeProjectClones, {
  payload: ProjectCloneSubscribeInput,
  success: ProjectCloneListEvent,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsSourceControlPublishRepositoryRpc = Rpc.make(WS_METHODS.sourceControlPublishRepository, {
  payload: SourceControlPublishRepositoryInput,
  success: SourceControlPublishRepositoryResult,
  error: Schema.Union([SourceControlRepositoryError, EnvironmentAuthorizationError]),
});

const WsProjectsSearchEntriesRpc = Rpc.make(WS_METHODS.projectsSearchEntries, {
  payload: ProjectSearchEntriesInput,
  success: ProjectSearchEntriesResult,
  error: Schema.Union([ProjectSearchEntriesError, EnvironmentAuthorizationError]),
});

const WsReplyStylesListRpc = Rpc.make(WS_METHODS.replyStylesList, {
  payload: ReplyStylesListInput,
  success: ReplyStylesListResult,
  error: EnvironmentAuthorizationError,
});

const WsProjectsSearchContentsRpc = Rpc.make(WS_METHODS.projectsSearchContents, {
  payload: ProjectSearchContentsInput,
  success: ProjectSearchContentsResult,
  error: Schema.Union([ProjectSearchContentsError, EnvironmentAuthorizationError]),
});

const WsProjectsListEntriesRpc = Rpc.make(WS_METHODS.projectsListEntries, {
  payload: ProjectListEntriesInput,
  success: ProjectListEntriesResult,
  error: Schema.Union([ProjectListEntriesError, EnvironmentAuthorizationError]),
});

const WsTaskBoardListRpc = Rpc.make(WS_METHODS.taskBoardList, {
  payload: TaskBoardListInput,
  success: TaskBoardSnapshot,
  error: Schema.Union([TaskBoardReadError, EnvironmentAuthorizationError]),
});

const WsTaskBoardCreateRpc = Rpc.make(WS_METHODS.taskBoardCreate, {
  payload: TaskBoardCreateInput,
  success: TaskBoardTask,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsTaskBoardClaimRpc = Rpc.make(WS_METHODS.taskBoardClaim, {
  payload: TaskBoardClaimInput,
  success: TaskBoardTask,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsTaskBoardReleaseRpc = Rpc.make(WS_METHODS.taskBoardRelease, {
  payload: TaskBoardReleaseInput,
  success: TaskBoardTask,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsTaskBoardCompleteRpc = Rpc.make(WS_METHODS.taskBoardComplete, {
  payload: TaskBoardCompleteInput,
  success: TaskBoardTask,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsTaskBoardSubscribeCompletionsRpc = Rpc.make(WS_METHODS.taskBoardSubscribeCompletions, {
  payload: Schema.Struct({}),
  success: TaskBoardCompletions,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsSubagentsSubscribeSpawnApprovalsRpc = Rpc.make(
  WS_METHODS.subagentsSubscribeSpawnApprovals,
  {
    payload: Schema.Struct({}),
    success: SubagentSpawnApprovals,
    error: EnvironmentAuthorizationError,
    stream: true,
  },
);

const WsSubagentsRespondSpawnApprovalRpc = Rpc.make(WS_METHODS.subagentsRespondSpawnApproval, {
  payload: SubagentSpawnRespondInput,
  success: Schema.Struct({}),
  error: Schema.Union([SubagentSpawnApprovalError, EnvironmentAuthorizationError]),
});

const WsSubagentsListRpc = Rpc.make(WS_METHODS.subagentsList, {
  payload: AiosWorkspaceScopeInput,
  success: SubagentCatalog,
  error: EnvironmentAuthorizationError,
});

const WsSubagentsUpdateRpc = Rpc.make(WS_METHODS.subagentsUpdate, {
  payload: SubagentUpdateInput,
  success: SubagentCatalogEntry,
  error: Schema.Union([SubagentEditError, EnvironmentAuthorizationError]),
});

const WsSubagentsCreateRpc = Rpc.make(WS_METHODS.subagentsCreate, {
  payload: SubagentCreateInput,
  success: SubagentCatalogEntry,
  error: Schema.Union([SubagentEditError, EnvironmentAuthorizationError]),
});

const WsTaskBoardUpdateRpc = Rpc.make(WS_METHODS.taskBoardUpdate, {
  payload: TaskBoardUpdateInput,
  success: TaskBoardTask,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsTaskBoardWorkspaceRpc = Rpc.make(WS_METHODS.taskBoardWorkspace, {
  payload: TaskBoardWorkspaceInput,
  success: TaskBoardWorkspaceSnapshot,
  error: Schema.Union([TaskBoardReadError, EnvironmentAuthorizationError]),
});

const WsDevPreviewStatusRpc = Rpc.make(WS_METHODS.devPreviewStatus, {
  payload: DevPreviewInput,
  success: DevPreviewState,
  error: Schema.Union([DevPreviewError, EnvironmentAuthorizationError]),
});

const WsDevPreviewStartRpc = Rpc.make(WS_METHODS.devPreviewStart, {
  payload: DevPreviewInput,
  success: DevPreviewState,
  error: Schema.Union([DevPreviewError, EnvironmentAuthorizationError]),
});

const WsDevPreviewStopRpc = Rpc.make(WS_METHODS.devPreviewStop, {
  payload: DevPreviewInput,
  success: DevPreviewState,
  error: Schema.Union([DevPreviewError, EnvironmentAuthorizationError]),
});

const ImagesRpcError = Schema.Union([ImagesError, EnvironmentAuthorizationError]);

/** The Images panel state: source status, models and the queue with its finished images. */
const WsImagesSubscribeRpc = Rpc.make(WS_METHODS.imagesSubscribe, {
  payload: ImagesSubscribeInput,
  success: ImagesState,
  error: ImagesRpcError,
  stream: true,
});

const WsImagesGenerateRpc = Rpc.make(WS_METHODS.imagesGenerate, {
  payload: ImagesGenerateInput,
  success: ImagesGenerateResult,
  error: ImagesRpcError,
});

const WsImagesCancelRpc = Rpc.make(WS_METHODS.imagesCancel, {
  payload: ImagesCancelInput,
  success: Schema.Struct({ cancelled: Schema.Number }),
  error: ImagesRpcError,
});

const WsImagesKeepRpc = Rpc.make(WS_METHODS.imagesKeep, {
  payload: ImagesKeepInput,
  success: Schema.Struct({ kept: Schema.Boolean }),
  error: ImagesRpcError,
});

const WsImagesRetryRpc = Rpc.make(WS_METHODS.imagesRetry, {
  payload: ImagesRetryInput,
  success: Schema.Struct({ queued: Schema.Number }),
  error: ImagesRpcError,
});

const WsImagesSetBaseUrlRpc = Rpc.make(WS_METHODS.imagesSetBaseUrl, {
  payload: ImagesSetBaseUrlInput,
  success: Schema.Struct({ baseUrl: Schema.String }),
  error: ImagesRpcError,
});

const LocalModelsRpcError = Schema.Union([LocalModelsError, EnvironmentAuthorizationError]);

/** The Models tab state: Ollama status, this PC's capacity and one row per model. */
const WsLocalModelsSubscribeRpc = Rpc.make(WS_METHODS.localModelsSubscribe, {
  payload: Schema.Struct({}),
  success: LocalModelsState,
  error: LocalModelsRpcError,
  stream: true,
});

const WsLocalModelsPullRpc = Rpc.make(WS_METHODS.localModelsPull, {
  payload: LocalModelsPullInput,
  success: LocalModelsActionResult,
  error: LocalModelsRpcError,
});

const WsLocalModelsCancelPullRpc = Rpc.make(WS_METHODS.localModelsCancelPull, {
  payload: LocalModelsModelInput,
  success: LocalModelsActionResult,
  error: LocalModelsRpcError,
});

const WsLocalModelsRunRpc = Rpc.make(WS_METHODS.localModelsRun, {
  payload: LocalModelsModelInput,
  success: LocalModelsActionResult,
  error: LocalModelsRpcError,
});

const WsLocalModelsStopRpc = Rpc.make(WS_METHODS.localModelsStop, {
  payload: LocalModelsModelInput,
  success: LocalModelsActionResult,
  error: LocalModelsRpcError,
});

const WsLocalModelsSpeedTestRpc = Rpc.make(WS_METHODS.localModelsSpeedTest, {
  payload: LocalModelsModelInput,
  success: LocalModelsActionResult,
  error: LocalModelsRpcError,
});

const WsLocalModelsStartOllamaRpc = Rpc.make(WS_METHODS.localModelsStartOllama, {
  payload: LocalModelsStartInput,
  success: LocalModelsActionResult,
  error: LocalModelsRpcError,
});

const WsLocalModelsAdviceRpc = Rpc.make(WS_METHODS.localModelsAdvice, {
  payload: LocalModelsStartInput,
  success: LocalModelsAdvice,
  error: LocalModelsRpcError,
});

const WsLocalModelsCompareRpc = Rpc.make(WS_METHODS.localModelsCompare, {
  payload: LocalModelsCompareInput,
  success: LocalModelsCompareResult,
  error: LocalModelsRpcError,
});

const WsLocalModelsComparePickRpc = Rpc.make(WS_METHODS.localModelsComparePick, {
  payload: LocalModelsPickInput,
  success: LocalModelsPickResult,
  error: LocalModelsRpcError,
});

const WsLocalModelsTokenReportRpc = Rpc.make(WS_METHODS.localModelsTokenReport, {
  payload: LocalModelsTokenReportInput,
  success: LocalModelsTokenReport,
  error: LocalModelsRpcError,
});

const WsLocalModelsDeleteRpc = Rpc.make(WS_METHODS.localModelsDelete, {
  payload: LocalModelsModelInput,
  success: LocalModelsActionResult,
  error: LocalModelsRpcError,
});

/** Lists the files the app keeps for chats: attachments, uploads and rendered pages. */
const WsFilesListRpc = Rpc.make(WS_METHODS.filesList, {
  payload: FilesListInput,
  success: FilesListResult,
  error: Schema.Union([FilesError, EnvironmentAuthorizationError]),
});

/** Deletes one stored file. A file that a chat still shows stays. */
const WsFilesDeleteRpc = Rpc.make(WS_METHODS.filesDelete, {
  payload: FilesDeleteInput,
  success: FilesDeleteResult,
  error: Schema.Union([FilesError, EnvironmentAuthorizationError]),
});

/** Every subagent run: live ones and history, from the stored run events. */
const WsSubagentRunsListRpc = Rpc.make(WS_METHODS.subagentRunsList, {
  payload: SubagentRunsInput,
  success: SubagentRunsResult,
  error: Schema.Union([SubagentRunsError, EnvironmentAuthorizationError]),
});

const WsTaskBoardCardUpdateRpc = Rpc.make(WS_METHODS.taskBoardCardUpdate, {
  payload: TaskBoardCardUpdateInput,
  success: TaskBoardTask,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsTaskBoardCardCreateRpc = Rpc.make(WS_METHODS.taskBoardCardCreate, {
  payload: TaskBoardCardCreateInput,
  success: TaskBoardTask,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsInboxDropRpc = Rpc.make(WS_METHODS.inboxDrop, {
  payload: InboxDropInput,
  success: InboxDrop,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsInboxUndoRpc = Rpc.make(WS_METHODS.inboxUndo, {
  payload: InboxUndoInput,
  success: Schema.Struct({ removed: Schema.Boolean }),
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsTaskBoardAiosDetectRpc = Rpc.make(WS_METHODS.taskBoardAiosDetect, {
  payload: TaskBoardAiosDetectInput,
  success: TaskBoardAiosDetectResult,
  error: Schema.Union([TaskBoardReadError, EnvironmentAuthorizationError]),
});

const WsTaskBoardAiosConfirmRpc = Rpc.make(WS_METHODS.taskBoardAiosConfirm, {
  payload: TaskBoardAiosConfirmInput,
  success: TaskBoardAiosDetectResult,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsAiosWorkspacesListRpc = Rpc.make(WS_METHODS.aiosWorkspacesList, {
  payload: Schema.Struct({}),
  success: AiosWorkspacesListResult,
  error: Schema.Union([TaskBoardReadError, EnvironmentAuthorizationError]),
});

const WsWorkspacePackWidgetsRpc = Rpc.make(WS_METHODS.workspacePackWidgets, {
  payload: AiosWorkspaceScopeInput,
  success: WorkspacePackWidgetsResult,
  error: EnvironmentAuthorizationError,
});

const WsWorkspacePackOrgRpc = Rpc.make(WS_METHODS.workspacePackOrg, {
  payload: AiosWorkspaceScopeInput,
  success: WorkspaceOrgResult,
  error: EnvironmentAuthorizationError,
});

const WsWorkspacePackOrgChangeRpc = Rpc.make(WS_METHODS.workspacePackOrgChange, {
  payload: WorkspaceOrgChangeInput,
  success: WorkspaceOrgActionResult,
  error: EnvironmentAuthorizationError,
});

const WsWorkspacePackOrgDecideRpc = Rpc.make(WS_METHODS.workspacePackOrgDecide, {
  payload: WorkspaceOrgDecideInput,
  success: WorkspaceOrgActionResult,
  error: EnvironmentAuthorizationError,
});

const WsAiosWorkspacesInitRpc = Rpc.make(WS_METHODS.aiosWorkspacesInit, {
  payload: AiosWorkspaceInitInput,
  success: AiosWorkspaceSummary,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsAiosWorkspacePicturesListRpc = Rpc.make(WS_METHODS.aiosWorkspacePicturesList, {
  payload: Schema.Struct({}),
  success: WorkspacePicturesListResult,
  error: Schema.Union([WorkspacePictureError, EnvironmentAuthorizationError]),
});

const WsAiosWorkspacePictureSetRpc = Rpc.make(WS_METHODS.aiosWorkspacePictureSet, {
  payload: WorkspacePictureSetInput,
  success: Schema.Void,
  error: Schema.Union([WorkspacePictureError, EnvironmentAuthorizationError]),
});

const WsAiosWorkspacePictureRemoveRpc = Rpc.make(WS_METHODS.aiosWorkspacePictureRemove, {
  payload: WorkspacePictureRemoveInput,
  success: Schema.Void,
  error: Schema.Union([WorkspacePictureError, EnvironmentAuthorizationError]),
});

const WsAreaSyncJoinRpc = Rpc.make(WS_METHODS.areaSyncJoin, {
  payload: AreaSyncScopeInput,
  success: AreaSyncJoinResult,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsAreaSyncSyncRpc = Rpc.make(WS_METHODS.areaSyncSync, {
  payload: AreaSyncScopeInput,
  success: AreaSyncSyncResult,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsAreaSyncStatusRpc = Rpc.make(WS_METHODS.areaSyncStatus, {
  payload: AreaSyncScopeInput,
  success: AreaSyncStatusResult,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsTaskBoardHomeRpc = Rpc.make(WS_METHODS.taskBoardHome, {
  payload: TaskBoardHomeInput,
  success: TaskBoardHome,
  error: Schema.Union([TaskBoardReadError, EnvironmentAuthorizationError]),
});

const WsTaskBoardHomePriorityToggleRpc = Rpc.make(WS_METHODS.taskBoardHomePriorityToggle, {
  payload: TaskBoardHomePriorityToggleInput,
  success: TaskBoardHomePriorityToggleResult,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsAiosFolderListRpc = Rpc.make(WS_METHODS.aiosFolderList, {
  payload: AiosFolderListInput,
  success: AiosFolderList,
  error: Schema.Union([TaskBoardReadError, EnvironmentAuthorizationError]),
});

const WsAiosUsageShapeRpc = Rpc.make(WS_METHODS.aiosUsageShape, {
  payload: AiosWorkspaceScopeInput,
  success: AiosUsageShape,
  error: EnvironmentAuthorizationError,
});

const WsAiosDirectionRpc = Rpc.make(WS_METHODS.aiosDirection, {
  payload: AiosWorkspaceScopeInput,
  success: AiosDirection,
  error: Schema.Union([TaskBoardReadError, EnvironmentAuthorizationError]),
});

const WsTaskBoardHomeWeatherRpc = Rpc.make(WS_METHODS.taskBoardHomeWeather, {
  payload: TaskBoardHomeWeatherInput,
  success: TaskBoardHomeWeather,
  error: EnvironmentAuthorizationError,
});

const WsTaskBoardHomeNewsRpc = Rpc.make(WS_METHODS.taskBoardHomeNews, {
  payload: Schema.Struct({}),
  success: TaskBoardHomeNews,
  error: EnvironmentAuthorizationError,
});

const WsReleaseStatusRunsRpc = Rpc.make(WS_METHODS.releaseStatusRuns, {
  payload: Schema.Struct({}),
  success: ReleaseStatus,
  error: EnvironmentAuthorizationError,
});

const WsCalendarEventsRpc = Rpc.make(WS_METHODS.calendarEvents, {
  payload: CalendarEventsInput,
  success: CalendarEventsResult,
  error: EnvironmentAuthorizationError,
});

const WsCalendarTestLinkRpc = Rpc.make(WS_METHODS.calendarTestLink, {
  payload: CalendarLinkInput,
  success: CalendarActionResult,
  error: EnvironmentAuthorizationError,
});

const WsCalendarAddLinkRpc = Rpc.make(WS_METHODS.calendarAddLink, {
  payload: CalendarAddLinkInput,
  success: CalendarActionResult,
  error: EnvironmentAuthorizationError,
});

const WsCalendarRemoveRpc = Rpc.make(WS_METHODS.calendarRemove, {
  payload: CalendarRemoveInput,
  success: CalendarActionResult,
  error: EnvironmentAuthorizationError,
});

const WsCalendarGoogleSetClientRpc = Rpc.make(WS_METHODS.calendarGoogleSetClient, {
  payload: CalendarGoogleClientInput,
  success: CalendarActionResult,
  error: EnvironmentAuthorizationError,
});

const WsCalendarGoogleConnectRpc = Rpc.make(WS_METHODS.calendarGoogleConnect, {
  payload: Schema.Struct({}),
  success: CalendarGoogleConnectResult,
  error: EnvironmentAuthorizationError,
});

const WsCalendarGoogleSelectRpc = Rpc.make(WS_METHODS.calendarGoogleSelect, {
  payload: CalendarGoogleSelectInput,
  success: CalendarActionResult,
  error: EnvironmentAuthorizationError,
});

const WsPonytailUsageRpc = Rpc.make(WS_METHODS.ponytailUsage, {
  payload: Schema.Struct({}),
  success: PonytailUsage,
  error: EnvironmentAuthorizationError,
});

const WsPonytailCodexHooksRpc = Rpc.make(WS_METHODS.ponytailCodexHooks, {
  payload: PonytailCodexHooksInput,
  success: PonytailCodexHooks,
  error: EnvironmentAuthorizationError,
});

const WsLayaUsageRpc = Rpc.make(WS_METHODS.layaUsage, {
  payload: Schema.Struct({}),
  success: LayaUsage,
  error: EnvironmentAuthorizationError,
});

const WsTaskBoardShareRpc = Rpc.make(WS_METHODS.taskBoardShare, {
  payload: TaskBoardShareInput,
  success: TaskBoardSnapshot,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

/** The event feed: recent months on subscribe, then new and folded events as files change. */
const WsEventsSubscribeRpc = Rpc.make(WS_METHODS.eventsSubscribe, {
  payload: EventsSubscribeInput,
  success: FeedUpdate,
  error: EnvironmentAuthorizationError,
  stream: true,
});

/** Appends one event that the app writes; the folder watch delivers it to subscribers. */
const WsEventsAppendRpc = Rpc.make(WS_METHODS.eventsAppend, {
  payload: EventsAppendInput,
  success: Schema.Struct({ id: Schema.String }),
  error: Schema.Union([FeedEventError, EnvironmentAuthorizationError]),
});

/** Reads the Marketing screens: the queue, the posts and the metrics of the open workspace. */
const WsMarketingListRpc = Rpc.make(WS_METHODS.marketingList, {
  payload: MarketingListInput,
  success: MarketingListResult,
  error: Schema.Union([MarketingRpcError, EnvironmentAuthorizationError]),
});

/** A person approves or rejects tickets. No agent access level holds the scope this needs. */
const WsMarketingDecideRpc = Rpc.make(WS_METHODS.marketingDecide, {
  payload: MarketingDecideInput,
  success: MarketingDecideOutput,
  error: Schema.Union([MarketingRpcError, EnvironmentAuthorizationError]),
});

/** Reads the Content screen: every folder deal and its videos in the open workspace. */
const WsContentListRpc = Rpc.make(WS_METHODS.contentList, {
  payload: ContentListInput,
  success: ContentListResult,
  error: Schema.Union([ContentRpcError, EnvironmentAuthorizationError]),
});

/** The latest agent draft of one video, to show beside the script as it is now. */
const WsContentHistoryRpc = Rpc.make(WS_METHODS.contentHistory, {
  payload: ContentHistoryInput,
  success: ContentHistoryResult,
  error: Schema.Union([ContentRpcError, EnvironmentAuthorizationError]),
});

/** A person moves a video: approve, request changes, mark filmed or undo. No agent access level holds this scope. */
const WsContentMoveRpc = Rpc.make(WS_METHODS.contentMove, {
  payload: ContentMoveInput,
  success: ContentWriteResult,
  error: Schema.Union([ContentRpcError, EnvironmentAuthorizationError]),
});

/** A person edits a script. No agent access level holds this scope. */
const WsContentSaveScriptRpc = Rpc.make(WS_METHODS.contentSaveScript, {
  payload: ContentSaveScriptInput,
  success: ContentWriteResult,
  error: Schema.Union([ContentRpcError, EnvironmentAuthorizationError]),
});

/** A person starts a deal by hand. No agent access level holds this scope. */
const WsContentCreateDealRpc = Rpc.make(WS_METHODS.contentCreateDeal, {
  payload: ContentCreateDealInput,
  success: ContentDealWriteResult,
  error: Schema.Union([ContentRpcError, EnvironmentAuthorizationError]),
});

/** A person confirms or dismisses a proposed deal. No agent access level holds this scope. */
const WsContentDecideDealRpc = Rpc.make(WS_METHODS.contentDecideDeal, {
  payload: ContentDecideDealInput,
  success: ContentDecideDealResult,
  error: Schema.Union([ContentRpcError, EnvironmentAuthorizationError]),
});

/** A person shares the deal files with the other computer: save, pull, push. No agent access level holds this scope. */
const WsContentSyncRpc = Rpc.make(WS_METHODS.contentSync, {
  payload: ContentSyncInput,
  success: ContentSyncResult,
  error: Schema.Union([ContentRpcError, EnvironmentAuthorizationError]),
});

/** A person makes a pairing code so another computer can verify approvals. No agent access level holds this scope. */
const WsContentPairingStartRpc = Rpc.make(WS_METHODS.contentPairingStart, {
  payload: ContentPairingStartInput,
  success: ContentPairingCode,
  error: Schema.Union([ContentRpcError, EnvironmentAuthorizationError]),
});

/** A person enters a pairing code from another computer. No agent access level holds this scope. */
const WsContentPairingAcceptRpc = Rpc.make(WS_METHODS.contentPairingAccept, {
  payload: ContentPairingAcceptInput,
  success: ContentPairingAcceptResult,
  error: Schema.Union([ContentRpcError, EnvironmentAuthorizationError]),
});

const WsFocusSubscribeRpc = Rpc.make(WS_METHODS.focusSubscribe, {
  payload: FocusSubscribeInput,
  success: FocusSnapshot,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsFocusUpdateRpc = Rpc.make(WS_METHODS.focusUpdate, {
  payload: FocusUpdateInput,
  success: FocusSnapshot,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const WsFocusAttachmentRpc = Rpc.make(WS_METHODS.focusAttachment, {
  payload: FocusAttachmentInput,
  success: FocusAttachment,
  error: Schema.Union([TaskBoardReadError, TaskBoardOperationError, EnvironmentAuthorizationError]),
});

const HardwareRpcError = Schema.Union([HardwareWatchError, EnvironmentAuthorizationError]);

const WsHardwareGetInventoryRpc = Rpc.make(WS_METHODS.hardwareGetInventory, {
  payload: HardwareInventoryInput,
  success: HardwareInventory,
  error: HardwareRpcError,
});

const WsHardwareGetHistoryRpc = Rpc.make(WS_METHODS.hardwareGetHistory, {
  payload: HardwareHistoryInput,
  success: HardwareHistory,
  error: HardwareRpcError,
});

const WsHardwareGetLimitsRpc = Rpc.make(WS_METHODS.hardwareGetLimits, {
  payload: Schema.Struct({}),
  success: HardwareLimitsResult,
  error: HardwareRpcError,
});

const WsHardwareSetLimitRpc = Rpc.make(WS_METHODS.hardwareSetLimit, {
  payload: HardwareSetLimitInput,
  success: HardwareLimitsResult,
  error: HardwareRpcError,
});

const WsHardwareAcknowledgeAlertRpc = Rpc.make(WS_METHODS.hardwareAcknowledgeAlert, {
  payload: HardwareAcknowledgeAlertInput,
  success: HardwareAlert,
  error: HardwareRpcError,
});

const WsHardwareSetDeepSensorsRpc = Rpc.make(WS_METHODS.hardwareSetDeepSensors, {
  payload: HardwareSetDeepSensorsInput,
  success: HardwareWatchStatus,
  error: HardwareRpcError,
});

const WsHardwarePrepareAgentRpc = Rpc.make(WS_METHODS.hardwarePrepareAgent, {
  payload: HardwarePrepareAgentInput,
  success: HardwarePrepareAgentResult,
  error: HardwareRpcError,
});

const WsHardwareGetStatusRpc = Rpc.make(WS_METHODS.hardwareGetStatus, {
  payload: Schema.Struct({}),
  success: HardwarePcStatus,
  error: HardwareRpcError,
});

/** Status and alerts; `live` adds samples and raises sampling to once a second while subscribed. */
const WsSubscribeHardwareRpc = Rpc.make(WS_METHODS.subscribeHardware, {
  payload: Schema.Struct({ live: Schema.Boolean }),
  success: HardwareLiveEvent,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsProjectsPromptCandidatesRpc = Rpc.make(WS_METHODS.projectsPromptCandidates, {
  payload: Schema.Struct({ cwd: Schema.String }),
  success: Schema.Array(
    Schema.Struct({ text: Schema.String, count: Schema.Number, lastSeen: Schema.Number }),
  ),
  error: EnvironmentAuthorizationError,
});

const WsProjectsPredictPromptRpc = Rpc.make(WS_METHODS.projectsPredictPrompt, {
  payload: Schema.Struct({
    cwd: Schema.String,
    messages: Schema.Array(
      Schema.Struct({
        role: Schema.Literals(["user", "assistant"]),
        text: Schema.String.check(Schema.isMaxLength(3000)),
      }),
    ).check(Schema.isMaxLength(6)),
    draft: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2000))),
    personalExamples: Schema.optionalKey(
      Schema.Array(Schema.String.check(Schema.isMaxLength(300))).check(Schema.isMaxLength(5)),
    ),
    sessionId: Schema.optionalKey(
      Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
    ),
  }),
  success: Schema.Struct({ prompt: Schema.NullOr(Schema.String) }),
  error: EnvironmentAuthorizationError,
});

const WsProjectsCancelPromptPredictionRpc = Rpc.make(WS_METHODS.projectsCancelPromptPrediction, {
  payload: Schema.Struct({
    sessionId: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
  }),
  success: Schema.Void,
  error: EnvironmentAuthorizationError,
});

const WsProjectsReadFileRpc = Rpc.make(WS_METHODS.projectsReadFile, {
  payload: ProjectReadFileInput,
  success: ProjectReadFileResult,
  error: Schema.Union([ProjectReadFileError, EnvironmentAuthorizationError]),
});

const WsProjectsWriteFileRpc = Rpc.make(WS_METHODS.projectsWriteFile, {
  payload: ProjectWriteFileInput,
  success: ProjectWriteFileResult,
  error: Schema.Union([ProjectWriteFileError, EnvironmentAuthorizationError]),
});

const WsProjectsMutateRpc = Rpc.make(WS_METHODS.projectsMutate, {
  payload: ProjectMutation,
  success: Project,
  error: Schema.Union([ProjectMutationError, EnvironmentAuthorizationError]),
});

// Finds or creates the Scratch project rooted at ServerConfig.scratchWorkspaceRoot.
const WsProjectsEnsureScratchRpc = Rpc.make(WS_METHODS.projectsEnsureScratch, {
  payload: Schema.Struct({}),
  success: ProjectEnsureScratchResult,
  error: Schema.Union([OrchestrationDispatchCommandError, EnvironmentAuthorizationError]),
});

// Makes a folder under ServerConfig.newProjectsRoot with a first commit, then the project.
const WsProjectsCreateNewRpc = Rpc.make(WS_METHODS.projectsCreateNew, {
  payload: ProjectCreateNewInput,
  success: ProjectCreateNewResult,
  error: Schema.Union([OrchestrationDispatchCommandError, EnvironmentAuthorizationError]),
});

const WsShellOpenInEditorRpc = Rpc.make(WS_METHODS.shellOpenInEditor, {
  payload: LaunchEditorInput,
  error: Schema.Union([ExternalLauncherError, EnvironmentAuthorizationError]),
});

const WsFilesystemGetMetadataRpc = Rpc.make(WS_METHODS.filesystemGetMetadata, {
  payload: FilesystemGetMetadataInput,
  success: FilesystemGetMetadataResult,
  error: EnvironmentAuthorizationError,
});

const WsFilesystemBrowseRpc = Rpc.make(WS_METHODS.filesystemBrowse, {
  payload: FilesystemBrowseInput,
  success: FilesystemBrowseResult,
  error: Schema.Union([FilesystemBrowseError, EnvironmentAuthorizationError]),
});

const WsLayaSetupRpc = Rpc.make(WS_METHODS.layaSetup, {
  payload: LayaSetupInput,
  success: LayaSetupResult,
  error: EnvironmentAuthorizationError,
});

const WsThreadSweepRunRpc = Rpc.make(WS_METHODS.threadSweepRun, {
  payload: ThreadSweepInput,
  success: ThreadSweepResult,
  error: EnvironmentAuthorizationError,
});

const WsThreadSweepHandoffRpc = Rpc.make(WS_METHODS.threadSweepHandoff, {
  payload: ThreadHandoffInput,
  success: ThreadHandoffResult,
  error: EnvironmentAuthorizationError,
});

const WsFilesystemInspectFolderRpc = Rpc.make(WS_METHODS.filesystemInspectFolder, {
  payload: FilesystemInspectFolderInput,
  success: FilesystemInspectFolderResult,
  error: Schema.Union([FilesystemBrowseError, EnvironmentAuthorizationError]),
});

const WsAgentSessionsScanRpc = Rpc.make(WS_METHODS.agentSessionsScan, {
  payload: AgentSessionScanInput,
  success: AgentSessionScanResult,
  error: Schema.Union([AgentSessionScanError, EnvironmentAuthorizationError]),
});

const WsAgentSessionsImportRpc = Rpc.make(WS_METHODS.agentSessionsImport, {
  payload: AgentSessionImportInput,
  success: AgentSessionImportResult,
  error: Schema.Union([
    AgentSessionImportProjectChangedError,
    AgentSessionImportProjectNotFoundError,
    AgentSessionScanError,
    EnvironmentAuthorizationError,
  ]),
});

const WsAssetsCreateUrlRpc = Rpc.make(WS_METHODS.assetsCreateUrl, {
  payload: AssetCreateUrlInput,
  success: AssetCreateUrlResult,
  error: Schema.Union([AssetAccessError, EnvironmentAuthorizationError]),
});

const WsAssetsPersistChatAttachmentsRpc = Rpc.make(WS_METHODS.assetsPersistChatAttachments, {
  payload: PersistChatAttachmentsInput,
  success: PersistChatAttachmentsResult,
  error: Schema.Union([PersistChatAttachmentsError, EnvironmentAuthorizationError]),
});

const WsAttachmentsCreateUploadUrlRpc = Rpc.make(WS_METHODS.attachmentsCreateUploadUrl, {
  payload: AttachmentCreateUploadUrlInput,
  success: AttachmentCreateUploadUrlResult,
  error: Schema.Union([AttachmentUploadSigningKeyError, EnvironmentAuthorizationError]),
});

const WsAttachmentsDeleteRpc = Rpc.make(WS_METHODS.attachmentsDelete, {
  payload: AttachmentDeleteInput,
  error: EnvironmentAuthorizationError,
});

const WsMcpAppsCallToolRpc = Rpc.make(WS_METHODS.mcpAppsCallTool, {
  payload: McpAppCallToolInput,
  success: McpAppCallToolResult,
  error: Schema.Union([McpAppRequestError, EnvironmentAuthorizationError]),
});

const WsMcpAppsToolInfoRpc = Rpc.make(WS_METHODS.mcpAppsToolInfo, {
  payload: McpAppToolInfoInput,
  success: McpAppToolInfo,
  error: Schema.Union([McpAppRequestError, EnvironmentAuthorizationError]),
});

const WsMcpAppsUpdateModelContextRpc = Rpc.make(WS_METHODS.mcpAppsUpdateModelContext, {
  payload: McpAppUpdateModelContextInput,
  error: Schema.Union([McpAppRequestError, EnvironmentAuthorizationError]),
});

const WsMcpAppsReadResourceRpc = Rpc.make(WS_METHODS.mcpAppsReadResource, {
  payload: McpAppReadResourceInput,
  success: McpAppReadResourceResult,
  error: Schema.Union([McpAppRequestError, EnvironmentAuthorizationError]),
});

const WsProviderUploadFeedbackRpc = Rpc.make(WS_METHODS.providerUploadFeedback, {
  payload: ProviderUploadFeedbackInput,
  success: ProviderUploadFeedbackResult,
  error: Schema.Union([ProviderUploadFeedbackError, EnvironmentAuthorizationError]),
});

const WsSubscribeVcsStatusRpc = Rpc.make(WS_METHODS.subscribeVcsStatus, {
  payload: VcsStatusSubscriptionInput,
  success: VcsStatusStreamEvent,
  error: Schema.Union([GitManagerServiceError, EnvironmentAuthorizationError]),
  stream: true,
});

const WsVcsPullRpc = Rpc.make(WS_METHODS.vcsPull, {
  payload: VcsPullInput,
  success: VcsPullResult,
  error: Schema.Union([GitCommandError, EnvironmentAuthorizationError]),
});

const WsVcsRefreshStatusRpc = Rpc.make(WS_METHODS.vcsRefreshStatus, {
  payload: VcsStatusInput,
  success: VcsStatusResult,
  error: Schema.Union([GitManagerServiceError, EnvironmentAuthorizationError]),
});

const WsSubscribeWorktreeSetupRpc = Rpc.make(WS_METHODS.subscribeWorktreeSetup, {
  payload: WorktreeSetupSubscribeInput,
  success: WorktreeSetupStreamEvent,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsWorktreeSetupCancelRpc = Rpc.make(WS_METHODS.worktreeSetupCancel, {
  payload: WorktreeSetupCancelInput,
  success: WorktreeSetupCancelResult,
  error: EnvironmentAuthorizationError,
});

const WsGitRunStackedActionRpc = Rpc.make(WS_METHODS.gitRunStackedAction, {
  payload: GitRunStackedActionInput,
  success: GitActionProgressEvent,
  error: Schema.Union([GitManagerServiceError, EnvironmentAuthorizationError]),
  stream: true,
});

const WsGitResolvePullRequestRpc = Rpc.make(WS_METHODS.gitResolvePullRequest, {
  payload: GitPullRequestRefInput,
  success: GitResolvePullRequestResult,
  error: Schema.Union([GitManagerServiceError, EnvironmentAuthorizationError]),
});

const WsGitPreparePullRequestThreadRpc = Rpc.make(WS_METHODS.gitPreparePullRequestThread, {
  payload: GitPreparePullRequestThreadInput,
  success: GitPreparePullRequestThreadResult,
  error: Schema.Union([GitManagerServiceError, EnvironmentAuthorizationError]),
});

const WsVcsListRefsRpc = Rpc.make(WS_METHODS.vcsListRefs, {
  payload: VcsListRefsInput,
  success: VcsListRefsResult,
  error: Schema.Union([GitCommandError, EnvironmentAuthorizationError]),
});

const WsVcsCreateWorktreeRpc = Rpc.make(WS_METHODS.vcsCreateWorktree, {
  payload: VcsCreateWorktreeInput,
  success: VcsCreateWorktreeResult,
  error: Schema.Union([GitCommandError, EnvironmentAuthorizationError]),
});

const WsVcsRemoveWorktreeRpc = Rpc.make(WS_METHODS.vcsRemoveWorktree, {
  payload: VcsRemoveWorktreeInput,
  error: Schema.Union([GitCommandError, EnvironmentAuthorizationError]),
});

const WsVcsCreateRefRpc = Rpc.make(WS_METHODS.vcsCreateRef, {
  payload: VcsCreateRefInput,
  success: VcsCreateRefResult,
  error: Schema.Union([GitCommandError, EnvironmentAuthorizationError]),
});

const WsVcsSwitchRefRpc = Rpc.make(WS_METHODS.vcsSwitchRef, {
  payload: VcsSwitchRefInput,
  success: VcsSwitchRefResult,
  error: Schema.Union([GitCommandError, EnvironmentAuthorizationError]),
});

const WsVcsInitRpc = Rpc.make(WS_METHODS.vcsInit, {
  payload: VcsInitInput,
  error: Schema.Union([VcsError, EnvironmentAuthorizationError]),
});

/**
 * Ephemeral live diff preview for compact/mobile surfaces.
 * Not the persisted T3 Review model. Future review sessions should use
 * review.open* + review.getSnapshot.
 */
const WsReviewGetDiffPreviewRpc = Rpc.make(WS_METHODS.reviewGetDiffPreview, {
  payload: ReviewDiffPreviewInput,
  success: ReviewDiffPreviewResult,
  error: Schema.Union([ReviewDiffPreviewError, EnvironmentAuthorizationError]),
});

const WsReviewGetDiffFileContentsRpc = Rpc.make(WS_METHODS.reviewGetDiffFileContents, {
  payload: ReviewDiffFileContentsInput,
  success: ReviewDiffFileContentsResult,
  error: Schema.Union([ReviewDiffPreviewError, EnvironmentAuthorizationError]),
});

const WsTerminalOpenRpc = Rpc.make(WS_METHODS.terminalOpen, {
  payload: TerminalOpenInput,
  success: TerminalSessionSnapshot,
  error: Schema.Union([TerminalError, EnvironmentAuthorizationError]),
});

const WsTerminalAttachRpc = Rpc.make(WS_METHODS.terminalAttach, {
  payload: TerminalAttachInput,
  success: TerminalAttachStreamEvent,
  error: Schema.Union([TerminalError, EnvironmentAuthorizationError]),
  stream: true,
});

const WsTerminalObserveRpc = Rpc.make(WS_METHODS.terminalObserve, {
  payload: TerminalObserveInput,
  success: TerminalAttachStreamEvent,
  error: Schema.Union([TerminalError, EnvironmentAuthorizationError]),
  stream: true,
});

const WsTerminalWriteRpc = Rpc.make(WS_METHODS.terminalWrite, {
  payload: TerminalWriteInput,
  error: Schema.Union([TerminalError, EnvironmentAuthorizationError]),
});

const WsTerminalResizeRpc = Rpc.make(WS_METHODS.terminalResize, {
  payload: TerminalResizeInput,
  error: Schema.Union([TerminalError, EnvironmentAuthorizationError]),
});

const WsTerminalClearRpc = Rpc.make(WS_METHODS.terminalClear, {
  payload: TerminalClearInput,
  error: Schema.Union([TerminalError, EnvironmentAuthorizationError]),
});

const WsTerminalRestartRpc = Rpc.make(WS_METHODS.terminalRestart, {
  payload: TerminalRestartInput,
  success: TerminalSessionSnapshot,
  error: Schema.Union([TerminalError, EnvironmentAuthorizationError]),
});

const WsTerminalCloseRpc = Rpc.make(WS_METHODS.terminalClose, {
  payload: TerminalCloseInput,
  error: Schema.Union([TerminalError, EnvironmentAuthorizationError]),
});

const WsPreviewOpenRpc = Rpc.make(WS_METHODS.previewOpen, {
  payload: PreviewOpenInput,
  success: PreviewSessionSnapshot,
  error: Schema.Union([PreviewError, EnvironmentAuthorizationError]),
});

const WsPreviewNavigateRpc = Rpc.make(WS_METHODS.previewNavigate, {
  payload: PreviewNavigateInput,
  success: PreviewSessionSnapshot,
  error: Schema.Union([PreviewError, EnvironmentAuthorizationError]),
});

const WsPreviewResizeRpc = Rpc.make(WS_METHODS.previewResize, {
  payload: PreviewResizeInput,
  success: PreviewSessionSnapshot,
  error: Schema.Union([PreviewError, EnvironmentAuthorizationError]),
});

const WsPreviewAdjustRpc = Rpc.make(WS_METHODS.previewAdjust, {
  payload: PreviewAdjustInput,
  success: PreviewSessionSnapshot,
  error: Schema.Union([PreviewError, EnvironmentAuthorizationError]),
});

const WsPreviewRefreshRpc = Rpc.make(WS_METHODS.previewRefresh, {
  payload: PreviewRefreshInput,
  error: Schema.Union([PreviewError, EnvironmentAuthorizationError]),
});

const WsPreviewCloseRpc = Rpc.make(WS_METHODS.previewClose, {
  payload: PreviewCloseInput,
  error: Schema.Union([PreviewError, EnvironmentAuthorizationError]),
});

const WsPreviewListRpc = Rpc.make(WS_METHODS.previewList, {
  payload: PreviewListInput,
  success: PreviewListResult,
  error: EnvironmentAuthorizationError,
});

const WsPreviewClearProfileRpc = Rpc.make(WS_METHODS.previewClearProfile, {
  payload: PreviewClearProfileInput,
  error: Schema.Union([PreviewClearProfileError, EnvironmentAuthorizationError]),
});

const WsPreviewReportProfilesRpc = Rpc.make(WS_METHODS.previewReportProfiles, {
  payload: PreviewReportProfilesInput,
  error: EnvironmentAuthorizationError,
});

const WsPreviewReportStatusRpc = Rpc.make(WS_METHODS.previewReportStatus, {
  payload: PreviewReportStatusInput,
  error: Schema.Union([PreviewError, EnvironmentAuthorizationError]),
});

const WsSubscribePreviewEventsRpc = Rpc.make(WS_METHODS.subscribePreviewEvents, {
  payload: Schema.Struct({}),
  success: PreviewEvent,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsPreviewStopLocalServerRpc = Rpc.make(WS_METHODS.previewStopLocalServer, {
  payload: PreviewStopLocalServerInput,
  error: Schema.Union([PreviewStopLocalServerError, EnvironmentAuthorizationError]),
});

const WsSubscribeDiscoveredLocalServersRpc = Rpc.make(WS_METHODS.subscribeDiscoveredLocalServers, {
  payload: Schema.Struct({
    configuredUrls: Schema.optional(ConfiguredLocalServerUrls),
  }),
  success: DiscoveredLocalServerList,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsScribeGetStatusRpc = Rpc.make(WS_METHODS.scribeGetStatus, {
  payload: Schema.Struct({}),
  success: ScribeStatusResult,
  error: EnvironmentAuthorizationError,
});

const WsScribeStartRpc = Rpc.make(WS_METHODS.scribeStart, {
  payload: ScribeStartInput,
  success: ScribeCommandResult,
  error: Schema.Union([ScribeEngineError, EnvironmentAuthorizationError]),
});

const WsScribeStopRpc = Rpc.make(WS_METHODS.scribeStop, {
  payload: ScribeStopInput,
  success: ScribeCommandResult,
  error: Schema.Union([ScribeEngineError, EnvironmentAuthorizationError]),
});

const WsVoiceLogMemoryReviewRpc = Rpc.make(WS_METHODS.voiceLogMemoryReview, {
  payload: Schema.Struct({}),
  success: VoiceLogMemoryReview,
  error: Schema.Union([VoiceLogMemoryError, EnvironmentAuthorizationError]),
});
const WsVoiceLogMemoryApproveRpc = Rpc.make(WS_METHODS.voiceLogMemoryApprove, {
  payload: VoiceLogMemoryApproveInput,
  success: VoiceLogMemoryReview,
  error: Schema.Union([VoiceLogMemoryError, EnvironmentAuthorizationError]),
});

const WsScribeListHistoryRpc = Rpc.make(WS_METHODS.scribeListHistory, {
  payload: ScribeListHistoryInput,
  success: ScribeHistoryPage,
  error: Schema.Union([ScribeEngineError, EnvironmentAuthorizationError]),
});

const WsScribeDeleteHistoryRpc = Rpc.make(WS_METHODS.scribeDeleteHistory, {
  payload: ScribeDeleteHistoryInput,
  success: ScribeDeleteHistoryResult,
  error: Schema.Union([ScribeEngineError, EnvironmentAuthorizationError]),
});

const ScribeRpcError = Schema.Union([ScribeEngineError, EnvironmentAuthorizationError]);

const WsScribeGetInsightsRpc = Rpc.make(WS_METHODS.scribeGetInsights, {
  payload: ScribeStatsInput,
  success: ScribeInsights,
  error: ScribeRpcError,
});

const WsScribeGetGoalsRpc = Rpc.make(WS_METHODS.scribeGetGoals, {
  payload: ScribeStatsInput,
  success: ScribeGoals,
  error: ScribeRpcError,
});

const WsScribeGetDictionaryRpc = Rpc.make(WS_METHODS.scribeGetDictionary, {
  payload: Schema.Struct({}),
  success: ScribeDictionary,
  error: ScribeRpcError,
});

const WsScribePutDictionaryRpc = Rpc.make(WS_METHODS.scribePutDictionary, {
  payload: ScribeDictionary,
  success: ScribeDictionary,
  error: ScribeRpcError,
});

const WsScribeListSuggestionsRpc = Rpc.make(WS_METHODS.scribeListSuggestions, {
  payload: Schema.Struct({}),
  success: ScribeSuggestionList,
  error: ScribeRpcError,
});

const WsScribeRejectSuggestionRpc = Rpc.make(WS_METHODS.scribeRejectSuggestion, {
  payload: ScribeRejectSuggestionInput,
  success: ScribeRejectSuggestionResult,
  error: ScribeRpcError,
});

const WsScribeGetSettingsRpc = Rpc.make(WS_METHODS.scribeGetSettings, {
  payload: Schema.Struct({}),
  success: ScribeSettings,
  error: ScribeRpcError,
});

const WsScribePatchSettingsRpc = Rpc.make(WS_METHODS.scribePatchSettings, {
  payload: ScribePatchSettingsInput,
  success: ScribePatchSettingsResult,
  error: ScribeRpcError,
});

const WsScribeListDevicesRpc = Rpc.make(WS_METHODS.scribeListDevices, {
  payload: Schema.Struct({}),
  success: ScribeDevices,
  error: ScribeRpcError,
});

const WsScribeGetGroqKeyRpc = Rpc.make(WS_METHODS.scribeGetGroqKey, {
  payload: Schema.Struct({}),
  success: ScribeGroqKey,
  error: ScribeRpcError,
});

const WsScribeSetGroqKeyRpc = Rpc.make(WS_METHODS.scribeSetGroqKey, {
  payload: ScribeSetGroqKeyInput,
  success: Schema.Struct({}),
  error: ScribeRpcError,
});

const WsScribeClearGroqKeyRpc = Rpc.make(WS_METHODS.scribeClearGroqKey, {
  payload: Schema.Struct({}),
  success: Schema.Struct({}),
  error: ScribeRpcError,
});

const WsScribeSubscribeEventsRpc = Rpc.make(WS_METHODS.scribeSubscribeEvents, {
  payload: Schema.Struct({}),
  success: ScribeLiveEvent,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsVoiceGetStatusRpc = Rpc.make(WS_METHODS.voiceGetStatus, {
  payload: Schema.Struct({}),
  success: VoiceStatus,
  error: Schema.Union([VoiceError, EnvironmentAuthorizationError]),
});

const WsVoiceSetGroqKeyRpc = Rpc.make(WS_METHODS.voiceSetGroqKey, {
  payload: VoiceSetGroqKeyInput,
  success: VoiceStatus,
  error: Schema.Union([VoiceError, EnvironmentAuthorizationError]),
});

const WsVoiceClearGroqKeyRpc = Rpc.make(WS_METHODS.voiceClearGroqKey, {
  payload: Schema.Struct({}),
  success: VoiceStatus,
  error: Schema.Union([VoiceError, EnvironmentAuthorizationError]),
});

const WsVoiceTranscribeRpc = Rpc.make(WS_METHODS.voiceTranscribe, {
  payload: VoiceTranscribeInput,
  success: VoiceTranscribeResult,
  error: Schema.Union([VoiceError, EnvironmentAuthorizationError]),
});

const WsLocalVmListRpc = Rpc.make(WS_METHODS.localVmList, {
  payload: Schema.Struct({ inspect: Schema.optional(Schema.Boolean) }),
  success: LocalVmState,
  error: Schema.Union([LocalVmError, EnvironmentAuthorizationError]),
});

const WsLocalVmConnectRpc = Rpc.make(WS_METHODS.localVmConnect, {
  payload: LocalVmConnectInput,
  success: LocalVmSession,
  error: Schema.Union([LocalVmError, EnvironmentAuthorizationError]),
});

const WsLocalVmPauseRpc = Rpc.make(WS_METHODS.localVmPause, {
  payload: LocalVmPauseInput,
  success: LocalVmSession,
  error: Schema.Union([LocalVmError, EnvironmentAuthorizationError]),
});

const WsLocalVmReleaseRpc = Rpc.make(WS_METHODS.localVmRelease, {
  payload: LocalVmTarget,
  error: Schema.Union([LocalVmError, EnvironmentAuthorizationError]),
});

const WsLocalVmScreenshotRpc = Rpc.make(WS_METHODS.localVmScreenshot, {
  payload: LocalVmTarget,
  success: LocalVmScreenshotResult,
  error: Schema.Union([LocalVmError, EnvironmentAuthorizationError]),
});

const WsLocalVmInputRpc = Rpc.make(WS_METHODS.localVmInput, {
  payload: LocalVmInput,
  error: Schema.Union([LocalVmError, EnvironmentAuthorizationError]),
});

const WsDeviceTestHostRpc = Rpc.make(WS_METHODS.deviceTestHost, {
  payload: SshDeviceHostConfig,
  success: DeviceHostSummary,
  error: Schema.Union([DeviceError, EnvironmentAuthorizationError]),
});

const WsDeviceListRpc = Rpc.make(WS_METHODS.deviceList, {
  payload: DeviceListInput,
  success: DeviceServiceState,
  error: Schema.Union([DeviceError, EnvironmentAuthorizationError]),
});

const WsDeviceConfigureRpc = Rpc.make(WS_METHODS.deviceConfigure, {
  payload: DeviceConfigureInput,
  success: DeviceServiceState,
  error: Schema.Union([DeviceError, EnvironmentAuthorizationError]),
});

const WsDeviceOpenRpc = Rpc.make(WS_METHODS.deviceOpen, {
  payload: DeviceOpenInput,
  success: DeviceSession,
  error: Schema.Union([DeviceError, EnvironmentAuthorizationError]),
});

const WsDeviceCloseRpc = Rpc.make(WS_METHODS.deviceClose, {
  payload: DeviceCloseInput,
  error: Schema.Union([DeviceError, EnvironmentAuthorizationError]),
});

const WsDeviceShutdownRpc = Rpc.make(WS_METHODS.deviceShutdown, {
  payload: DeviceShutdownInput,
  error: Schema.Union([DeviceError, EnvironmentAuthorizationError]),
});

const WsDeviceDetailRpc = Rpc.make(WS_METHODS.deviceDetail, {
  payload: DeviceDetailInput,
  success: DeviceDetail,
  error: Schema.Union([DeviceError, EnvironmentAuthorizationError]),
});

const WsDeviceActionRpc = Rpc.make(WS_METHODS.deviceAction, {
  payload: DeviceActionInput,
  success: DeviceDetail,
  error: Schema.Union([DeviceError, EnvironmentAuthorizationError]),
});

const WsSubscribeDeviceStateRpc = Rpc.make(WS_METHODS.subscribeDeviceState, {
  payload: Schema.Struct({}),
  success: DeviceServiceState,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsOrchestrationV2DispatchCommandRpc = Rpc.make(ORCHESTRATION_V2_WS_METHODS.dispatchCommand, {
  payload: OrchestrationV2RpcSchemas.dispatchCommand.input,
  success: OrchestrationV2RpcSchemas.dispatchCommand.output,
  error: Schema.Union([OrchestrationV2DispatchCommandError, EnvironmentAuthorizationError]),
});

const WsOrchestrationV2GetTurnDiffRpc = Rpc.make(ORCHESTRATION_V2_WS_METHODS.getTurnDiff, {
  payload: OrchestrationV2RpcSchemas.getTurnDiff.input,
  success: OrchestrationV2RpcSchemas.getTurnDiff.output,
  error: Schema.Union([OrchestrationGetTurnDiffError, EnvironmentAuthorizationError]),
});

const WsOrchestrationV2GetFullThreadDiffRpc = Rpc.make(
  ORCHESTRATION_V2_WS_METHODS.getFullThreadDiff,
  {
    payload: OrchestrationV2RpcSchemas.getFullThreadDiff.input,
    success: OrchestrationV2RpcSchemas.getFullThreadDiff.output,
    error: Schema.Union([OrchestrationGetFullThreadDiffError, EnvironmentAuthorizationError]),
  },
);

const WsOrchestrationV2SearchThreadRpc = Rpc.make(ORCHESTRATION_V2_WS_METHODS.searchThread, {
  payload: OrchestrationV2SearchThreadInput,
  success: OrchestrationV2SearchThreadResult,
  error: Schema.Union([OrchestrationV2SearchThreadError, EnvironmentAuthorizationError]),
});

const WsOrchestrationV2SearchThreadStreamRpc = Rpc.make(
  ORCHESTRATION_V2_WS_METHODS.searchThreadStream,
  {
    payload: OrchestrationV2SearchThreadInput,
    success: OrchestrationV2SearchThreadResult,
    error: Schema.Union([OrchestrationV2SearchThreadError, EnvironmentAuthorizationError]),
    stream: true,
  },
);

const WsOrchestrationV2SearchThreadsRpc = Rpc.make(ORCHESTRATION_V2_WS_METHODS.searchThreads, {
  payload: OrchestrationSearchThreadsInput,
  success: OrchestrationSearchThreadsResult,
  error: Schema.Union([OrchestrationSearchThreadsError, EnvironmentAuthorizationError]),
});

const WsOrchestrationV2GetArchivedShellSnapshotRpc = Rpc.make(
  ORCHESTRATION_V2_WS_METHODS.getArchivedShellSnapshot,
  {
    payload: OrchestrationV2RpcSchemas.getArchivedShellSnapshot.input,
    success: OrchestrationV2RpcSchemas.getArchivedShellSnapshot.output,
    error: Schema.Union([OrchestrationV2GetShellSnapshotError, EnvironmentAuthorizationError]),
  },
);

const WsOrchestrationV2GetThreadProjectionRpc = Rpc.make(
  ORCHESTRATION_V2_WS_METHODS.getThreadProjection,
  {
    payload: OrchestrationV2RpcSchemas.getThreadProjection.input,
    success: OrchestrationV2RpcSchemas.getThreadProjection.output,
    error: Schema.Union([OrchestrationV2GetThreadProjectionError, EnvironmentAuthorizationError]),
  },
);

const WsOrchestrationV2StopWorkflowRpc = Rpc.make(ORCHESTRATION_V2_WS_METHODS.stopWorkflow, {
  payload: OrchestrationV2RpcSchemas.stopWorkflow.input,
  success: OrchestrationV2RpcSchemas.stopWorkflow.output,
  error: Schema.Union([OrchestrationV2StopWorkflowError, EnvironmentAuthorizationError]),
});

const WsOrchestrationV2GetWorkflowScriptRpc = Rpc.make(
  ORCHESTRATION_V2_WS_METHODS.getWorkflowScript,
  {
    payload: OrchestrationV2RpcSchemas.getWorkflowScript.input,
    success: OrchestrationV2RpcSchemas.getWorkflowScript.output,
    error: Schema.Union([OrchestrationGetWorkflowScriptError, EnvironmentAuthorizationError]),
  },
);

const WsOrchestrationV2GetTurnItemRpc = Rpc.make(ORCHESTRATION_V2_WS_METHODS.getTurnItem, {
  payload: OrchestrationV2RpcSchemas.getTurnItem.input,
  success: OrchestrationV2RpcSchemas.getTurnItem.output,
  error: Schema.Union([OrchestrationV2GetThreadProjectionError, EnvironmentAuthorizationError]),
});

const WsOrchestrationV2GetThreadContextBreakdownRpc = Rpc.make(
  ORCHESTRATION_V2_WS_METHODS.getThreadContextBreakdown,
  {
    payload: OrchestrationV2RpcSchemas.getThreadContextBreakdown.input,
    success: OrchestrationV2RpcSchemas.getThreadContextBreakdown.output,
    error: Schema.Union([ThreadContextBreakdownError, EnvironmentAuthorizationError]),
  },
);

const WsOrchestrationV2LaunchThreadRpc = Rpc.make(ORCHESTRATION_V2_WS_METHODS.launchThread, {
  payload: OrchestrationV2RpcSchemas.launchThread.input,
  success: OrchestrationV2RpcSchemas.launchThread.output,
  error: Schema.Union([OrchestrationV2ThreadLaunchError, EnvironmentAuthorizationError]),
});

const WsOrchestrationV2SubscribeArchivedShellRpc = Rpc.make(
  ORCHESTRATION_V2_WS_METHODS.subscribeArchivedShell,
  {
    payload: OrchestrationV2RpcSchemas.subscribeArchivedShell.input,
    success: OrchestrationV2RpcSchemas.subscribeArchivedShell.output,
    error: Schema.Union([OrchestrationV2GetShellSnapshotError, EnvironmentAuthorizationError]),
    stream: true,
  },
);

const WsOrchestrationV2SubscribeShellRpc = Rpc.make(ORCHESTRATION_V2_WS_METHODS.subscribeShell, {
  payload: OrchestrationV2RpcSchemas.subscribeShell.input,
  success: OrchestrationV2RpcSchemas.subscribeShell.output,
  error: Schema.Union([OrchestrationV2GetShellSnapshotError, EnvironmentAuthorizationError]),
  stream: true,
});

const WsOrchestrationV2SubscribeThreadRpc = Rpc.make(ORCHESTRATION_V2_WS_METHODS.subscribeThread, {
  payload: OrchestrationV2RpcSchemas.subscribeThread.input,
  success: OrchestrationV2RpcSchemas.subscribeThread.output,
  error: Schema.Union([OrchestrationV2GetThreadProjectionError, EnvironmentAuthorizationError]),
  stream: true,
});

const WsSubscribeTerminalEventsRpc = Rpc.make(WS_METHODS.subscribeTerminalEvents, {
  payload: Schema.Struct({}),
  success: TerminalEvent,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsSubscribeTerminalMetadataRpc = Rpc.make(WS_METHODS.subscribeTerminalMetadata, {
  payload: Schema.Struct({}),
  success: TerminalMetadataStreamEvent,
  error: EnvironmentAuthorizationError,
  stream: true,
});

export const WsSubscribeServerConfigRpc = Rpc.make(WS_METHODS.subscribeServerConfig, {
  payload: Schema.Struct({
    /**
     * Whether this client understands `environmentThemesUpdated` events.
     * Already-shipped clients decode the stream against the old event union
     * and would die on an unknown member, so the server emits the theme
     * stream only to subscribers that ask for it. Absent on old clients;
     * dropped by old servers.
     */
    environmentThemes: Schema.optional(Schema.Boolean),
    /** Whether this client understands `usageLimitSourcesUpdated` events. */
    usageLimitSources: Schema.optional(Schema.Boolean),
    /**
     * Whether this client answers `/usage-limits` itself. The server injects
     * that command into provider catalogs only for such clients; an older
     * client would send it to the provider as an ordinary prompt.
     */
    usageLimitsCommand: Schema.optional(Schema.Boolean),
  }),
  success: ServerConfigStreamEvent,
  error: Schema.Union([KeybindingsConfigError, ServerSettingsError, EnvironmentAuthorizationError]),
  stream: true,
});

const WsSubscribeServerLifecycleRpc = Rpc.make(WS_METHODS.subscribeServerLifecycle, {
  payload: Schema.Struct({}),
  success: ServerLifecycleStreamEvent,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsScheduledTasksListRpc = Rpc.make(WS_METHODS.scheduledTasksList, {
  payload: ScheduledTaskListInput,
  success: ScheduledTaskListResult,
  error: Schema.Union([ScheduledTaskError, EnvironmentAuthorizationError]),
});

const savedItemRpcError = Schema.Union([SavedItemError, EnvironmentAuthorizationError]);
const WsSavedItemsListRpc = Rpc.make(WS_METHODS.savedItemsList, {
  payload: SavedItemListInput,
  success: SavedItemListResult,
  error: savedItemRpcError,
});
const WsSavedItemsGetRpc = Rpc.make(WS_METHODS.savedItemsGet, {
  payload: SavedItemGetInput,
  success: SavedItem,
  error: savedItemRpcError,
});
const WsSavedItemsCreateRpc = Rpc.make(WS_METHODS.savedItemsCreate, {
  payload: SavedItemCreateInput,
  success: SavedItem,
  error: savedItemRpcError,
});
const WsSavedItemsUpdateRpc = Rpc.make(WS_METHODS.savedItemsUpdate, {
  payload: SavedItemUpdateInput,
  success: SavedItem,
  error: savedItemRpcError,
});
const WsSavedItemsTransitionRpc = Rpc.make(WS_METHODS.savedItemsTransition, {
  payload: SavedItemTransitionInput,
  success: SavedItem,
  error: savedItemRpcError,
});
const WsSavedItemsImportRpc = Rpc.make(WS_METHODS.savedItemsImport, {
  payload: SavedItemImportInput,
  success: SavedItem,
  error: savedItemRpcError,
});
const WsSavedItemsLaunchRpc = Rpc.make(WS_METHODS.savedItemsLaunch, {
  payload: SavedItemLaunchInput,
  success: SavedItem,
  error: savedItemRpcError,
});
const WsSavedItemsScheduleRpc = Rpc.make(WS_METHODS.savedItemsSchedule, {
  payload: SavedItemScheduleInput,
  success: SavedItem,
  error: savedItemRpcError,
});
const WsSavedItemsSaveTaskRpc = Rpc.make(WS_METHODS.savedItemsSaveTask, {
  payload: SavedItemTaskInput,
  success: SavedItem,
  error: savedItemRpcError,
});

/** Streams the full scheduled-task list: one snapshot on subscribe, then a fresh list after every change. */
const WsScheduledTasksSubscribeRpc = Rpc.make(WS_METHODS.scheduledTasksSubscribe, {
  payload: ScheduledTaskListInput,
  success: ScheduledTaskListResult,
  error: Schema.Union([ScheduledTaskError, EnvironmentAuthorizationError]),
  stream: true,
});

const WsScheduledTasksUpsertRpc = Rpc.make(WS_METHODS.scheduledTasksUpsert, {
  payload: ScheduledTaskUpsertInput,
  success: ScheduledTaskMutationResult,
  error: Schema.Union([ScheduledTaskError, EnvironmentAuthorizationError]),
});

const WsScheduledTasksSetEnabledRpc = Rpc.make(WS_METHODS.scheduledTasksSetEnabled, {
  payload: ScheduledTaskSetEnabledInput,
  success: ScheduledTaskMutationResult,
  error: Schema.Union([ScheduledTaskError, EnvironmentAuthorizationError]),
});

const WsScheduledTasksDeleteRpc = Rpc.make(WS_METHODS.scheduledTasksDelete, {
  payload: ScheduledTaskDeleteInput,
  success: ScheduledTaskDeleteResult,
  error: Schema.Union([ScheduledTaskError, EnvironmentAuthorizationError]),
});

const WsScheduledTasksRunNowRpc = Rpc.make(WS_METHODS.scheduledTasksRunNow, {
  payload: ScheduledTaskRunNowInput,
  success: ScheduledTaskRunNowResult,
  error: Schema.Union([ScheduledTaskError, EnvironmentAuthorizationError]),
});

const WsScheduledTasksRotateWebhookTokenRpc = Rpc.make(
  WS_METHODS.scheduledTasksRotateWebhookToken,
  {
    payload: ScheduledTaskRotateWebhookTokenInput,
    success: ScheduledTaskMutationResult,
    error: Schema.Union([ScheduledTaskError, EnvironmentAuthorizationError]),
  },
);

const WsSecretsAnswerRequestRpc = Rpc.make(WS_METHODS.secretsAnswerRequest, {
  payload: SecretRequestAnswerInput,
  error: Schema.Union([SecretRequestError, EnvironmentAuthorizationError]),
});

const WsScheduledTasksListWebhookDeliveriesRpc = Rpc.make(
  WS_METHODS.scheduledTasksListWebhookDeliveries,
  {
    payload: ScheduledTaskListWebhookDeliveriesInput,
    success: ScheduledTaskListWebhookDeliveriesResult,
    error: Schema.Union([ScheduledTaskError, EnvironmentAuthorizationError]),
  },
);

const WsScheduledTasksGetWebhookDeliveryRpc = Rpc.make(
  WS_METHODS.scheduledTasksGetWebhookDelivery,
  {
    payload: ScheduledTaskGetWebhookDeliveryInput,
    success: ScheduledTaskGetWebhookDeliveryResult,
    error: Schema.Union([ScheduledTaskError, EnvironmentAuthorizationError]),
  },
);

const WsSubscribeAuthAccessRpc = Rpc.make(WS_METHODS.subscribeAuthAccess, {
  payload: Schema.Struct({}),
  success: AuthAccessStreamEvent,
  error: Schema.Union([AuthAccessStreamError, EnvironmentAuthorizationError]),
  stream: true,
});

const WsSubscribeBackgroundPolicyRpc = Rpc.make(WS_METHODS.subscribeBackgroundPolicy, {
  payload: Schema.Struct({}),
  success: BackgroundPolicySnapshot,
  error: EnvironmentAuthorizationError,
  stream: true,
});

const WsSubscribeResourceTelemetryRpc = Rpc.make(WS_METHODS.subscribeResourceTelemetry, {
  payload: Schema.Struct({}),
  success: ResourceTelemetrySnapshot,
  error: EnvironmentAuthorizationError,
  stream: true,
});

/**
 * Checks the connection's scopes against the scope each RPC declares, before
 * the handler runs. Every RPC in `WsRpcGroup` carries it, so a handler cannot
 * be added without authorization.
 */
export class RpcScopeAuthorization extends RpcMiddleware.Service<RpcScopeAuthorization>()(
  "t3/contracts/RpcScopeAuthorization",
  { error: EnvironmentAuthorizationError },
) {}

export const WsRpcGroup = RpcGroup.make(
  WsSavedItemsListRpc,
  WsSavedItemsGetRpc,
  WsSavedItemsCreateRpc,
  WsSavedItemsUpdateRpc,
  WsSavedItemsTransitionRpc,
  WsSavedItemsImportRpc,
  WsSavedItemsLaunchRpc,
  WsSavedItemsScheduleRpc,
  WsSavedItemsSaveTaskRpc,
  WsScribeGetStatusRpc,
  WsScribeStartRpc,
  WsScribeStopRpc,
  WsVoiceLogMemoryReviewRpc,
  WsVoiceLogMemoryApproveRpc,
  WsScribeListHistoryRpc,
  WsScribeDeleteHistoryRpc,
  WsScribeGetInsightsRpc,
  WsScribeGetGoalsRpc,
  WsScribeGetDictionaryRpc,
  WsScribePutDictionaryRpc,
  WsScribeListSuggestionsRpc,
  WsScribeRejectSuggestionRpc,
  WsScribeGetSettingsRpc,
  WsScribePatchSettingsRpc,
  WsScribeListDevicesRpc,
  WsScribeGetGroqKeyRpc,
  WsScribeSetGroqKeyRpc,
  WsScribeClearGroqKeyRpc,
  WsScribeSubscribeEventsRpc,
  WsVoiceGetStatusRpc,
  WsVoiceSetGroqKeyRpc,
  WsVoiceClearGroqKeyRpc,
  WsVoiceTranscribeRpc,
  WsServerProbeRpc,
  WsServerGetConfigRpc,
  WsServerRefreshProvidersRpc,
  WsServerUpdateProviderRpc,
  WsProviderConsumeResetCreditRpc,
  WsProviderAuthStartRpc,
  WsProviderAuthCompleteRpc,
  WsChatGptReconnectProfileRpc,
  WsChatGptImportProfileRpc,
  WsChatGptHandoffSubscribeRpc,
  WsCodexAuthCallbackSubscribeRpc,
  WsProviderAuthRespondRpc,
  WsProviderAuthCancelRpc,
  WsProviderAuthLogoutRpc,
  WsProviderAuthSubscribeRpc,
  WsProviderInstallStartRpc,
  WsProviderInstallCancelRpc,
  WsProviderInstallSubscribeRpc,
  WsProviderInstallRemoveRpc,
  WsServerUpdateServerRpc,
  WsServerUpdateServerWithProgressRpc,
  WsServerCommitDesktopUpdateRpc,
  WsServerUpsertKeybindingRpc,
  WsServerRemoveKeybindingRpc,
  WsServerRunStorageCleanupRpc,
  WsServerGetStorageCleanupReportRpc,
  WsServerGetSettingsRpc,
  WsServerUpdateSettingsRpc,
  WsServerTestApiKeyRpc,
  WsServerDiscoverSourceControlRpc,
  WsServerSearchAcpRegistryRpc,
  WsServerPrepareAcpRegistryAgentRpc,
  WsServerUninstallAcpRegistryManagedBinaryRpc,
  WsServerAcceptAcpRegistryUrlAuthRpc,
  WsServerListAcpRegistrySessionsRpc,
  WsServerImportAcpRegistrySessionRpc,
  WsServerDeleteAcpRegistrySessionRpc,
  WsServerListAcpRegistryProvidersRpc,
  WsServerSetAcpRegistryProviderRpc,
  WsServerDisableAcpRegistryProviderRpc,
  WsServerLogoutAcpRegistryRpc,
  WsServerGetTraceDiagnosticsRpc,
  WsServerGetProcessDiagnosticsRpc,
  WsServerGetHostResourcesRpc,
  WsServerGetProcessResourceHistoryRpc,
  WsServerGetResourceTelemetryHistoryRpc,
  WsServerRetryResourceTelemetryRpc,
  WsServerCheckOtlpEndpointRpc,
  WsServerGetUsageSummaryRpc,
  WsServerRefreshUsageRatesRpc,
  WsServerGetModelBenchmarksRpc,
  WsServerGetModelBenchmarkCatalogRpc,
  WsServerGetModelRunStatsRpc,
  WsServerSignalProcessRpc,
  WsScheduledTasksListRpc,
  WsScheduledTasksSubscribeRpc,
  WsScheduledTasksUpsertRpc,
  WsScheduledTasksSetEnabledRpc,
  WsScheduledTasksDeleteRpc,
  WsScheduledTasksRunNowRpc,
  WsScheduledTasksRotateWebhookTokenRpc,
  WsSecretsAnswerRequestRpc,
  WsScheduledTasksListWebhookDeliveriesRpc,
  WsScheduledTasksGetWebhookDeliveryRpc,
  WsServerReportClientActivityRpc,
  WsServerReportHostPowerStateRpc,
  WsServerGetBackgroundPolicyRpc,
  WsCloudGetRelayClientStatusRpc,
  WsCloudInstallRelayClientRpc,
  WsPullRequestsListRpc,
  WsPullRequestsListStatsRpc,
  WsPullRequestsSummaryRpc,
  WsPullRequestsRoutingRpc,
  WsPullRequestsRoutingIdentityRpc,
  WsPullRequestsStackRpc,
  WsPullRequestsLinkedThreadsRpc,
  WsPullRequestsDetailRpc,
  WsPullRequestsPreviewRpc,
  WsPullRequestsChecksRpc,
  WsPullRequestsActivityRpc,
  WsPullRequestsThreadCommentsRpc,
  WsPullRequestsDiffFileContentsRpc,
  WsPullRequestsFilesViewedRpc,
  WsPullRequestsSetFilesViewedRpc,
  WsPullRequestsRunActionRpc,
  WsPullRequestsUpdateRpc,
  WsPullRequestsCommentRpc,
  WsPullRequestsUpdateCommentRpc,
  WsPullRequestsSubmitReviewRpc,
  WsPullRequestsReplyToThreadRpc,
  WsPullRequestsSetThreadResolutionRpc,
  WsPullRequestsSetReactionRpc,
  WsPullRequestsInvalidateRpc,
  WsPullRequestsReportStateRpc,
  WsPullRequestsSubscribeRefreshesRpc,
  WsPullRequestsReviewerCandidatesRpc,
  WsPullRequestsRequestReviewersRpc,
  WsPullRequestsLabelCandidatesRpc,
  WsPullRequestsSetLabelsRpc,
  WsSourceControlLookupRepositoryRpc,
  WsSourceControlCloneRepositoryRpc,
  WsSourceControlPublishRepositoryRpc,
  WsProjectCloneStartRpc,
  WsProjectCloneCancelRpc,
  WsProjectCloneRetryRpc,
  WsSubscribeProjectClonesRpc,
  WsProjectsListEntriesRpc,
  WsProjectsReadFileRpc,
  WsTaskBoardListRpc,
  WsTaskBoardCreateRpc,
  WsTaskBoardClaimRpc,
  WsTaskBoardReleaseRpc,
  WsTaskBoardCompleteRpc,
  WsTaskBoardSubscribeCompletionsRpc,
  WsSubagentsSubscribeSpawnApprovalsRpc,
  WsSubagentsRespondSpawnApprovalRpc,
  WsSubagentsListRpc,
  WsSubagentsUpdateRpc,
  WsSubagentsCreateRpc,
  WsFocusSubscribeRpc,
  WsEventsSubscribeRpc,
  WsEventsAppendRpc,
  WsMarketingListRpc,
  WsMarketingDecideRpc,
  WsContentListRpc,
  WsContentHistoryRpc,
  WsContentMoveRpc,
  WsContentSaveScriptRpc,
  WsContentPairingAcceptRpc,
  WsContentPairingStartRpc,
  WsContentSyncRpc,
  WsContentDecideDealRpc,
  WsContentCreateDealRpc,
  WsFocusUpdateRpc,
  WsFocusAttachmentRpc,
  WsTaskBoardUpdateRpc,
  WsTaskBoardWorkspaceRpc,
  WsTaskBoardCardUpdateRpc,
  WsTaskBoardCardCreateRpc,
  WsTaskBoardShareRpc,
  WsTaskBoardAiosDetectRpc,
  WsTaskBoardAiosConfirmRpc,
  WsTaskBoardHomeRpc,
  WsTaskBoardHomePriorityToggleRpc,
  WsAiosFolderListRpc,
  WsAiosWorkspacesListRpc,
  WsAiosWorkspacesInitRpc,
  WsAiosWorkspacePicturesListRpc,
  WsAiosWorkspacePictureSetRpc,
  WsAiosWorkspacePictureRemoveRpc,
  WsAreaSyncJoinRpc,
  WsAreaSyncSyncRpc,
  WsAreaSyncStatusRpc,
  WsWorkspacePackWidgetsRpc,
  WsWorkspacePackOrgRpc,
  WsWorkspacePackOrgChangeRpc,
  WsWorkspacePackOrgDecideRpc,
  WsAiosUsageShapeRpc,
  WsAiosDirectionRpc,
  WsTaskBoardHomeWeatherRpc,
  WsTaskBoardHomeNewsRpc,
  WsReleaseStatusRunsRpc,
  WsLayaUsageRpc,
  WsPonytailUsageRpc,
  WsCalendarEventsRpc,
  WsCalendarTestLinkRpc,
  WsCalendarAddLinkRpc,
  WsCalendarRemoveRpc,
  WsCalendarGoogleSetClientRpc,
  WsCalendarGoogleConnectRpc,
  WsCalendarGoogleSelectRpc,
  WsPonytailCodexHooksRpc,
  WsHardwareGetInventoryRpc,
  WsHardwareGetHistoryRpc,
  WsHardwareGetLimitsRpc,
  WsHardwareSetLimitRpc,
  WsHardwareAcknowledgeAlertRpc,
  WsHardwareSetDeepSensorsRpc,
  WsHardwarePrepareAgentRpc,
  WsHardwareGetStatusRpc,
  WsSubscribeHardwareRpc,
  WsInboxDropRpc,
  WsInboxUndoRpc,
  WsDevPreviewStatusRpc,
  WsDevPreviewStartRpc,
  WsDevPreviewStopRpc,
  WsImagesSubscribeRpc,
  WsImagesGenerateRpc,
  WsImagesCancelRpc,
  WsImagesKeepRpc,
  WsImagesRetryRpc,
  WsImagesSetBaseUrlRpc,
  WsLocalModelsSubscribeRpc,
  WsLocalModelsPullRpc,
  WsLocalModelsCancelPullRpc,
  WsLocalModelsRunRpc,
  WsLocalModelsStopRpc,
  WsLocalModelsSpeedTestRpc,
  WsLocalModelsStartOllamaRpc,
  WsLocalModelsAdviceRpc,
  WsLocalModelsCompareRpc,
  WsLocalModelsComparePickRpc,
  WsLocalModelsTokenReportRpc,
  WsLocalModelsDeleteRpc,
  WsFilesListRpc,
  WsFilesDeleteRpc,
  WsSubagentRunsListRpc,
  WsProjectsPromptCandidatesRpc,
  WsProjectsPredictPromptRpc,
  WsProjectsCancelPromptPredictionRpc,
  WsProjectsSearchContentsRpc,
  WsProjectsSearchEntriesRpc,
  WsReplyStylesListRpc,
  WsProjectsEnsureScratchRpc,
  WsProjectsCreateNewRpc,
  WsProjectsWriteFileRpc,
  WsProjectsMutateRpc,
  WsShellOpenInEditorRpc,
  WsFilesystemBrowseRpc,
  WsFilesystemGetMetadataRpc,
  WsFilesystemInspectFolderRpc,
  WsLayaSetupRpc,
  WsThreadSweepRunRpc,
  WsThreadSweepHandoffRpc,
  WsAgentSessionsScanRpc,
  WsAgentSessionsImportRpc,
  WsAssetsCreateUrlRpc,
  WsAssetsPersistChatAttachmentsRpc,
  WsAttachmentsCreateUploadUrlRpc,
  WsAttachmentsDeleteRpc,
  WsMcpAppsCallToolRpc,
  WsMcpAppsToolInfoRpc,
  WsMcpAppsReadResourceRpc,
  WsMcpAppsUpdateModelContextRpc,
  WsProviderUploadFeedbackRpc,
  WsSubscribeVcsStatusRpc,
  WsSubscribeWorktreeSetupRpc,
  WsWorktreeSetupCancelRpc,
  WsVcsPullRpc,
  WsVcsRefreshStatusRpc,
  WsGitRunStackedActionRpc,
  WsGitResolvePullRequestRpc,
  WsGitPreparePullRequestThreadRpc,
  WsVcsListRefsRpc,
  WsVcsCreateWorktreeRpc,
  WsVcsRemoveWorktreeRpc,
  WsVcsCreateRefRpc,
  WsVcsSwitchRefRpc,
  WsVcsInitRpc,
  WsReviewGetDiffPreviewRpc,
  WsReviewGetDiffFileContentsRpc,
  WsTerminalOpenRpc,
  WsTerminalAttachRpc,
  WsTerminalObserveRpc,
  WsTerminalWriteRpc,
  WsTerminalResizeRpc,
  WsTerminalClearRpc,
  WsTerminalRestartRpc,
  WsTerminalCloseRpc,
  WsSubscribeTerminalEventsRpc,
  WsSubscribeTerminalMetadataRpc,
  WsPreviewOpenRpc,
  WsPreviewNavigateRpc,
  WsPreviewResizeRpc,
  WsPreviewAdjustRpc,
  WsPreviewRefreshRpc,
  WsPreviewCloseRpc,
  WsPreviewListRpc,
  WsPreviewClearProfileRpc,
  WsPreviewReportProfilesRpc,
  WsPreviewReportStatusRpc,
  WsSubscribePreviewEventsRpc,
  WsPreviewStopLocalServerRpc,
  WsSubscribeDiscoveredLocalServersRpc,
  WsLocalVmListRpc,
  WsLocalVmConnectRpc,
  WsLocalVmPauseRpc,
  WsLocalVmReleaseRpc,
  WsLocalVmScreenshotRpc,
  WsLocalVmInputRpc,
  WsDeviceConfigureRpc,
  WsDeviceListRpc,
  WsDeviceTestHostRpc,
  WsDeviceOpenRpc,
  WsDeviceCloseRpc,
  WsDeviceShutdownRpc,
  WsDeviceDetailRpc,
  WsDeviceActionRpc,
  WsSubscribeDeviceStateRpc,
  WsSubscribeServerConfigRpc,
  WsSubscribeServerLifecycleRpc,
  WsSubscribeAuthAccessRpc,
  WsSubscribeBackgroundPolicyRpc,
  WsSubscribeResourceTelemetryRpc,
  WsOrchestrationV2DispatchCommandRpc,
  WsOrchestrationV2GetWorkflowScriptRpc,
  WsOrchestrationV2StopWorkflowRpc,
  WsOrchestrationV2GetTurnItemRpc,
  WsOrchestrationV2GetTurnDiffRpc,
  WsOrchestrationV2GetFullThreadDiffRpc,
  WsOrchestrationV2SearchThreadsRpc,
  WsOrchestrationV2SearchThreadRpc,
  WsOrchestrationV2SearchThreadStreamRpc,
  WsOrchestrationV2GetArchivedShellSnapshotRpc,
  WsOrchestrationV2GetThreadProjectionRpc,
  WsOrchestrationV2GetThreadContextBreakdownRpc,
  WsOrchestrationV2LaunchThreadRpc,
  WsOrchestrationV2SubscribeArchivedShellRpc,
  WsOrchestrationV2SubscribeShellRpc,
  WsOrchestrationV2SubscribeThreadRpc,
).middleware(RpcScopeAuthorization);
