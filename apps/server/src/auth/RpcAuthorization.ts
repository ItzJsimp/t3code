import {
  CLIENT_GUARDED_RPC_SCOPES,
  type DeviceListInput,
  clientRpcRequiredScopes,
  authScopeRequiredResponse,
  AssetCreateUrlInput,
  AuthAccessReadScope,
  ServerSettingsPatch,
  ProviderInstanceMutation,
  requiredScopesForServerSettingsPatch,
  requiredScopesForProjectMutation,
  ProjectMutation,
  AuthSettingsWriteScope,
  AuthProvidersManageScope,
  AuthEnvironmentMaintainScope,
  AuthFilesystemReadScope,
  AuthFilesystemWriteScope,
  AuthDiagnosticsReadScope,
  AuthReleaseReadScope,
  AuthOrchestrationOperateScope,
  AuthOrchestrationReadScope,
  AuthPreviewOperateScope,
  AuthRelayReadScope,
  AuthRelayWriteScope,
  AuthTerminalOperateScope,
  ORCHESTRATION_V2_WS_METHODS,
  AuthTerminalReadScope,
  type AuthEnvironmentScope,
  EnvironmentAuthorizationError,
  RpcScopeAuthorization,
  WS_METHODS,
  WsRpcGroup,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Layer from "effect/Layer";
import type * as RpcGroup from "effect/rpc/RpcGroup";

type WsRpcMethod = RpcGroup.Rpcs<typeof WsRpcGroup>["_tag"];

/**
 * Keep authorization coverage coupled to the RPC group itself. Adding an RPC to
 * `WsRpcGroup` without choosing a scope is a type error instead of a production
 * runtime failure.
 */
export const RPC_REQUIRED_SCOPES = {
  [WS_METHODS.savedItemsList]: AuthOrchestrationReadScope,
  [WS_METHODS.savedItemsGet]: AuthOrchestrationReadScope,
  [WS_METHODS.scribeGetStatus]: AuthOrchestrationReadScope,
  [WS_METHODS.scribeListHistory]: AuthOrchestrationReadScope,
  [WS_METHODS.voiceLogMemoryReview]: AuthOrchestrationReadScope,
  [WS_METHODS.scribeGetInsights]: AuthOrchestrationReadScope,
  [WS_METHODS.scribeGetGoals]: AuthOrchestrationReadScope,
  [WS_METHODS.scribeGetDictionary]: AuthOrchestrationReadScope,
  [WS_METHODS.scribeListSuggestions]: AuthOrchestrationReadScope,
  [WS_METHODS.scribeGetSettings]: AuthOrchestrationReadScope,
  [WS_METHODS.scribeListDevices]: AuthOrchestrationReadScope,
  [WS_METHODS.scribeSubscribeEvents]: AuthOrchestrationReadScope,
  [WS_METHODS.voiceGetStatus]: AuthOrchestrationReadScope,
  ...CLIENT_GUARDED_RPC_SCOPES,
  [ORCHESTRATION_V2_WS_METHODS.dispatchCommand]: AuthOrchestrationOperateScope,
  [ORCHESTRATION_V2_WS_METHODS.getWorkflowScript]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.stopWorkflow]: AuthOrchestrationOperateScope,
  [ORCHESTRATION_V2_WS_METHODS.getTurnDiff]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.getFullThreadDiff]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.searchThreads]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.searchThread]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.searchThreadStream]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.getArchivedShellSnapshot]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.getThreadProjection]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.getThreadContextBreakdown]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.getTurnItem]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.launchThread]: AuthOrchestrationOperateScope,
  [ORCHESTRATION_V2_WS_METHODS.subscribeArchivedShell]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.subscribeShell]: AuthOrchestrationReadScope,
  [ORCHESTRATION_V2_WS_METHODS.subscribeThread]: AuthOrchestrationReadScope,
  [WS_METHODS.projectsMutate]: AuthOrchestrationOperateScope,
  [WS_METHODS.serverProbe]: AuthOrchestrationReadScope,
  [WS_METHODS.serverGetConfig]: AuthOrchestrationReadScope,
  [WS_METHODS.serverRefreshProviders]: AuthOrchestrationReadScope,
  [WS_METHODS.serverUpdateProvider]: AuthProvidersManageScope,
  [WS_METHODS.providerAuthStart]: AuthProvidersManageScope,
  [WS_METHODS.providerConsumeResetCredit]: AuthProvidersManageScope,
  [WS_METHODS.providerAuthComplete]: AuthProvidersManageScope,
  [WS_METHODS.chatGptReconnectProfile]: AuthProvidersManageScope,
  [WS_METHODS.chatGptImportProfile]: AuthProvidersManageScope,
  [WS_METHODS.chatGptHandoffSubscribe]: AuthProvidersManageScope,
  [WS_METHODS.codexAuthCallbackSubscribe]: AuthProvidersManageScope,
  [WS_METHODS.providerAuthRespond]: AuthProvidersManageScope,
  [WS_METHODS.providerAuthCancel]: AuthProvidersManageScope,
  [WS_METHODS.providerAuthLogout]: AuthProvidersManageScope,
  [WS_METHODS.providerAuthSubscribe]: AuthProvidersManageScope,
  [WS_METHODS.providerInstallStart]: AuthProvidersManageScope,
  [WS_METHODS.providerInstallCancel]: AuthProvidersManageScope,
  [WS_METHODS.providerInstallSubscribe]: AuthOrchestrationReadScope,
  [WS_METHODS.providerInstallRemove]: AuthProvidersManageScope,
  [WS_METHODS.serverUpdateServer]: AuthEnvironmentMaintainScope,
  [WS_METHODS.serverUpdateServerWithProgress]: AuthEnvironmentMaintainScope,
  [WS_METHODS.serverCommitDesktopUpdate]: AuthEnvironmentMaintainScope,
  [WS_METHODS.serverUpsertKeybinding]: AuthSettingsWriteScope,
  [WS_METHODS.serverRemoveKeybinding]: AuthSettingsWriteScope,
  [WS_METHODS.serverGetStorageCleanupReport]: AuthOrchestrationReadScope,
  [WS_METHODS.serverGetSettings]: AuthOrchestrationReadScope,
  [WS_METHODS.serverUpdateSettings]: AuthSettingsWriteScope,
  [WS_METHODS.serverTestApiKey]: AuthSettingsWriteScope,
  [WS_METHODS.serverSearchAcpRegistry]: AuthOrchestrationReadScope,
  [WS_METHODS.serverPrepareAcpRegistryAgent]: AuthProvidersManageScope,
  [WS_METHODS.serverUninstallAcpRegistryManagedBinary]: AuthProvidersManageScope,
  [WS_METHODS.serverAcceptAcpRegistryUrlAuth]: AuthProvidersManageScope,
  [WS_METHODS.serverListAcpRegistrySessions]: AuthOrchestrationReadScope,
  [WS_METHODS.serverImportAcpRegistrySession]: AuthOrchestrationOperateScope,
  [WS_METHODS.serverDeleteAcpRegistrySession]: AuthOrchestrationOperateScope,
  [WS_METHODS.serverListAcpRegistryProviders]: AuthOrchestrationReadScope,
  [WS_METHODS.serverSetAcpRegistryProvider]: AuthProvidersManageScope,
  [WS_METHODS.serverDisableAcpRegistryProvider]: AuthProvidersManageScope,
  [WS_METHODS.serverLogoutAcpRegistry]: AuthProvidersManageScope,
  [WS_METHODS.serverDiscoverSourceControl]: AuthOrchestrationReadScope,
  [WS_METHODS.serverGetTraceDiagnostics]: AuthDiagnosticsReadScope,
  [WS_METHODS.serverGetProcessDiagnostics]: AuthDiagnosticsReadScope,
  // Load-balancing new threads reads host load; that is part of operating
  // threads, not of inspecting diagnostics.
  [WS_METHODS.serverGetHostResources]: AuthOrchestrationReadScope,
  [WS_METHODS.serverGetProcessResourceHistory]: AuthDiagnosticsReadScope,
  [WS_METHODS.serverGetResourceTelemetryHistory]: AuthDiagnosticsReadScope,
  [WS_METHODS.serverRetryResourceTelemetry]: AuthDiagnosticsReadScope,
  [WS_METHODS.serverGetUsageSummary]: AuthDiagnosticsReadScope,
  [WS_METHODS.serverRefreshUsageRates]: AuthDiagnosticsReadScope,
  // Public data about models, read when choosing one for a thread.
  [WS_METHODS.serverGetModelBenchmarks]: AuthOrchestrationReadScope,
  [WS_METHODS.serverGetModelBenchmarkCatalog]: AuthOrchestrationReadScope,
  [WS_METHODS.serverGetModelRunStats]: AuthOrchestrationReadScope,
  [WS_METHODS.serverSignalProcess]: AuthEnvironmentMaintainScope,
  [WS_METHODS.serverReportClientActivity]: AuthOrchestrationReadScope,
  [WS_METHODS.serverReportHostPowerState]: AuthEnvironmentMaintainScope,
  [WS_METHODS.serverGetBackgroundPolicy]: AuthOrchestrationReadScope,
  [WS_METHODS.scheduledTasksList]: AuthOrchestrationReadScope,
  [WS_METHODS.scheduledTasksSubscribe]: AuthOrchestrationReadScope,
  [WS_METHODS.secretsAnswerRequest]: AuthOrchestrationOperateScope,
  // Delivery logs hold request bodies, so they need the same scope as the URL.
  [WS_METHODS.scheduledTasksListWebhookDeliveries]: AuthOrchestrationOperateScope,
  [WS_METHODS.scheduledTasksGetWebhookDelivery]: AuthOrchestrationOperateScope,
  [WS_METHODS.cloudGetRelayClientStatus]: AuthRelayReadScope,
  [WS_METHODS.cloudInstallRelayClient]: AuthRelayWriteScope,
  [WS_METHODS.pullRequestsList]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsListStats]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsSummary]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsRouting]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsRoutingIdentity]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsStack]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsLinkedThreads]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsDetail]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsPreview]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsChecks]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsActivity]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsThreadComments]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsDiffFileContents]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsFilesViewed]: AuthOrchestrationReadScope,
  // Read scope like the reads it un-caches: refreshing is part of reading, and a read-only
  // client pressing refresh must not be told it may not look again.
  [WS_METHODS.pullRequestsInvalidate]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsReportState]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsSubscribeRefreshes]: AuthOrchestrationReadScope,
  // The candidate list is a read like the detail beside it; asking somebody for a review is a
  // write like every other one.
  [WS_METHODS.pullRequestsReviewerCandidates]: AuthOrchestrationReadScope,
  [WS_METHODS.pullRequestsLabelCandidates]: AuthOrchestrationReadScope,
  [WS_METHODS.sourceControlLookupRepository]: AuthOrchestrationReadScope,
  [WS_METHODS.subscribeProjectClones]: AuthOrchestrationReadScope,
  [WS_METHODS.projectsListEntries]: AuthFilesystemReadScope,
  [WS_METHODS.taskBoardList]: AuthOrchestrationReadScope,
  [WS_METHODS.taskBoardSubscribeCompletions]: AuthOrchestrationReadScope,
  [WS_METHODS.subagentsSubscribeSpawnApprovals]: AuthOrchestrationReadScope,
  [WS_METHODS.subagentsList]: AuthOrchestrationReadScope,
  [WS_METHODS.subagentsRespondSpawnApproval]: AuthOrchestrationOperateScope,
  [WS_METHODS.subagentsUpdate]: AuthOrchestrationOperateScope,
  [WS_METHODS.subagentsCreate]: AuthOrchestrationOperateScope,
  [WS_METHODS.focusSubscribe]: AuthOrchestrationReadScope,
  [WS_METHODS.eventsSubscribe]: AuthOrchestrationReadScope,
  [WS_METHODS.eventsAppend]: AuthOrchestrationOperateScope,
  [WS_METHODS.marketingList]: AuthOrchestrationReadScope,
  [WS_METHODS.marketingDecide]: AuthFilesystemWriteScope,
  [WS_METHODS.contentList]: AuthOrchestrationReadScope,
  [WS_METHODS.contentHistory]: AuthOrchestrationReadScope,
  [WS_METHODS.contentMove]: AuthFilesystemWriteScope,
  [WS_METHODS.contentSaveScript]: AuthFilesystemWriteScope,
  [WS_METHODS.contentPairingAccept]: AuthFilesystemWriteScope,
  [WS_METHODS.contentPairingStart]: AuthFilesystemWriteScope,
  [WS_METHODS.contentSync]: AuthFilesystemWriteScope,
  [WS_METHODS.contentDecideDeal]: AuthFilesystemWriteScope,
  [WS_METHODS.contentCreateDeal]: AuthFilesystemWriteScope,
  [WS_METHODS.focusUpdate]: AuthOrchestrationOperateScope,
  [WS_METHODS.focusAttachment]: AuthOrchestrationReadScope,
  [WS_METHODS.taskBoardCreate]: AuthOrchestrationOperateScope,
  [WS_METHODS.taskBoardClaim]: AuthOrchestrationOperateScope,
  [WS_METHODS.taskBoardRelease]: AuthOrchestrationOperateScope,
  [WS_METHODS.taskBoardComplete]: AuthOrchestrationOperateScope,
  [WS_METHODS.taskBoardUpdate]: AuthOrchestrationOperateScope,
  [WS_METHODS.taskBoardWorkspace]: AuthOrchestrationReadScope,
  [WS_METHODS.taskBoardCardUpdate]: AuthOrchestrationOperateScope,
  [WS_METHODS.taskBoardCardCreate]: AuthOrchestrationOperateScope,
  [WS_METHODS.taskBoardShare]: AuthOrchestrationOperateScope,
  [WS_METHODS.taskBoardAiosDetect]: AuthOrchestrationReadScope,
  [WS_METHODS.taskBoardHome]: AuthOrchestrationReadScope,
  [WS_METHODS.taskBoardHomePriorityToggle]: AuthOrchestrationOperateScope,
  [WS_METHODS.aiosFolderList]: AuthOrchestrationReadScope,
  [WS_METHODS.aiosUsageShape]: AuthOrchestrationReadScope,
  [WS_METHODS.aiosDirection]: AuthOrchestrationReadScope,
  [WS_METHODS.aiosWorkspacesList]: AuthOrchestrationReadScope,
  [WS_METHODS.aiosWorkspacesInit]: AuthOrchestrationOperateScope,
  [WS_METHODS.aiosWorkspacePicturesList]: AuthOrchestrationReadScope,
  [WS_METHODS.aiosWorkspacePictureSet]: AuthOrchestrationOperateScope,
  [WS_METHODS.aiosWorkspacePictureRemove]: AuthOrchestrationOperateScope,
  [WS_METHODS.areaSyncJoin]: AuthOrchestrationOperateScope,
  [WS_METHODS.areaSyncSync]: AuthOrchestrationOperateScope,
  [WS_METHODS.areaSyncStatus]: AuthOrchestrationReadScope,
  [WS_METHODS.workspacePackWidgets]: AuthOrchestrationReadScope,
  [WS_METHODS.workspacePackOrg]: AuthOrchestrationReadScope,
  [WS_METHODS.workspacePackOrgChange]: AuthOrchestrationOperateScope,
  [WS_METHODS.workspacePackOrgDecide]: AuthOrchestrationOperateScope,
  [WS_METHODS.taskBoardHomeWeather]: AuthOrchestrationReadScope,
  [WS_METHODS.taskBoardHomeNews]: AuthOrchestrationReadScope,
  [WS_METHODS.releaseStatusRuns]: AuthReleaseReadScope,
  [WS_METHODS.layaUsage]: AuthOrchestrationReadScope,
  [WS_METHODS.ponytailUsage]: AuthOrchestrationReadScope,
  [WS_METHODS.ponytailCodexHooks]: AuthOrchestrationOperateScope,
  [WS_METHODS.taskBoardAiosConfirm]: AuthOrchestrationOperateScope,
  [WS_METHODS.hardwareGetInventory]: AuthDiagnosticsReadScope,
  [WS_METHODS.hardwareGetHistory]: AuthDiagnosticsReadScope,
  [WS_METHODS.calendarEvents]: AuthOrchestrationReadScope,
  [WS_METHODS.calendarTestLink]: AuthOrchestrationReadScope,
  [WS_METHODS.calendarAddLink]: AuthSettingsWriteScope,
  [WS_METHODS.calendarRemove]: AuthSettingsWriteScope,
  [WS_METHODS.calendarGoogleSetClient]: AuthSettingsWriteScope,
  [WS_METHODS.calendarGoogleConnect]: AuthSettingsWriteScope,
  [WS_METHODS.calendarGoogleSelect]: AuthSettingsWriteScope,
  [WS_METHODS.hardwareGetLimits]: AuthDiagnosticsReadScope,
  [WS_METHODS.hardwareGetStatus]: AuthDiagnosticsReadScope,
  [WS_METHODS.hardwareSetLimit]: AuthSettingsWriteScope,
  [WS_METHODS.hardwareAcknowledgeAlert]: AuthOrchestrationOperateScope,
  [WS_METHODS.hardwareSetDeepSensors]: AuthSettingsWriteScope,
  [WS_METHODS.hardwarePrepareAgent]: AuthOrchestrationOperateScope,
  [WS_METHODS.inboxDrop]: AuthOrchestrationOperateScope,
  [WS_METHODS.inboxUndo]: AuthOrchestrationOperateScope,
  [WS_METHODS.devPreviewStatus]: AuthOrchestrationReadScope,
  // Starting runs the project's own dev script, which is shell access.
  [WS_METHODS.devPreviewStart]: AuthTerminalOperateScope,
  [WS_METHODS.devPreviewStop]: AuthOrchestrationOperateScope,
  [WS_METHODS.imagesSubscribe]: AuthOrchestrationReadScope,
  [WS_METHODS.imagesGenerate]: AuthOrchestrationOperateScope,
  [WS_METHODS.imagesCancel]: AuthOrchestrationOperateScope,
  [WS_METHODS.imagesKeep]: AuthOrchestrationOperateScope,
  [WS_METHODS.imagesRetry]: AuthOrchestrationOperateScope,
  [WS_METHODS.imagesSetBaseUrl]: AuthSettingsWriteScope,
  [WS_METHODS.localModelsSubscribe]: AuthOrchestrationReadScope,
  [WS_METHODS.localModelsPull]: AuthOrchestrationOperateScope,
  [WS_METHODS.localModelsCancelPull]: AuthOrchestrationOperateScope,
  [WS_METHODS.localModelsRun]: AuthOrchestrationOperateScope,
  [WS_METHODS.localModelsStop]: AuthOrchestrationOperateScope,
  [WS_METHODS.localModelsSpeedTest]: AuthOrchestrationOperateScope,
  [WS_METHODS.localModelsStartOllama]: AuthOrchestrationOperateScope,
  [WS_METHODS.localModelsAdvice]: AuthOrchestrationReadScope,
  [WS_METHODS.localModelsCompare]: AuthOrchestrationOperateScope,
  [WS_METHODS.localModelsComparePick]: AuthOrchestrationOperateScope,
  [WS_METHODS.localModelsTokenReport]: AuthOrchestrationOperateScope,
  [WS_METHODS.localModelsDelete]: AuthOrchestrationOperateScope,
  [WS_METHODS.filesList]: AuthOrchestrationReadScope,
  [WS_METHODS.filesDelete]: AuthOrchestrationOperateScope,
  [WS_METHODS.subagentRunsList]: AuthOrchestrationReadScope,
  [WS_METHODS.threadSweepRun]: AuthOrchestrationOperateScope,
  [WS_METHODS.threadSweepHandoff]: AuthOrchestrationOperateScope,
  [WS_METHODS.projectsPromptCandidates]: AuthFilesystemReadScope,
  [WS_METHODS.projectsPredictPrompt]: AuthFilesystemReadScope,
  [WS_METHODS.projectsCancelPromptPrediction]: AuthFilesystemReadScope,
  [WS_METHODS.projectsReadFile]: AuthFilesystemReadScope,
  [WS_METHODS.projectsSearchContents]: AuthFilesystemReadScope,
  [WS_METHODS.projectsSearchEntries]: AuthFilesystemReadScope,
  [WS_METHODS.replyStylesList]: AuthFilesystemReadScope,
  [WS_METHODS.projectsWriteFile]: AuthFilesystemWriteScope,
  [WS_METHODS.layaSetup]: AuthFilesystemWriteScope,
  [WS_METHODS.projectsEnsureScratch]: AuthOrchestrationOperateScope,
  [WS_METHODS.projectsCreateNew]: AuthOrchestrationOperateScope,
  [WS_METHODS.shellOpenInEditor]: AuthOrchestrationOperateScope,
  [WS_METHODS.filesystemBrowse]: AuthFilesystemReadScope,
  [WS_METHODS.filesystemGetMetadata]: AuthFilesystemReadScope,
  [WS_METHODS.filesystemInspectFolder]: AuthFilesystemReadScope,
  [WS_METHODS.agentSessionsScan]: AuthOrchestrationReadScope,
  [WS_METHODS.agentSessionsImport]: AuthOrchestrationOperateScope,
  [WS_METHODS.assetsCreateUrl]: AuthOrchestrationReadScope,
  [WS_METHODS.assetsPersistChatAttachments]: AuthOrchestrationOperateScope,
  [WS_METHODS.attachmentsCreateUploadUrl]: AuthOrchestrationOperateScope,
  [WS_METHODS.attachmentsDelete]: AuthOrchestrationOperateScope,
  [WS_METHODS.providerUploadFeedback]: AuthOrchestrationOperateScope,
  // An app's tool calls can change things on its server, like a user action.
  [WS_METHODS.mcpAppsCallTool]: AuthOrchestrationOperateScope,
  [WS_METHODS.mcpAppsToolInfo]: AuthOrchestrationReadScope,
  [WS_METHODS.mcpAppsReadResource]: AuthOrchestrationReadScope,
  [WS_METHODS.mcpAppsUpdateModelContext]: AuthOrchestrationOperateScope,
  [WS_METHODS.subscribeVcsStatus]: AuthOrchestrationReadScope,
  [WS_METHODS.subscribeWorktreeSetup]: AuthOrchestrationReadScope,
  [WS_METHODS.worktreeSetupCancel]: AuthOrchestrationOperateScope,
  [WS_METHODS.subscribeResourceTelemetry]: AuthDiagnosticsReadScope,
  [WS_METHODS.subscribeHardware]: AuthDiagnosticsReadScope,
  [WS_METHODS.vcsRefreshStatus]: AuthOrchestrationReadScope,
  [WS_METHODS.gitResolvePullRequest]: AuthOrchestrationReadScope,
  [WS_METHODS.vcsListRefs]: AuthOrchestrationReadScope,
  [WS_METHODS.reviewGetDiffPreview]: AuthFilesystemReadScope,
  [WS_METHODS.reviewGetDiffFileContents]: AuthFilesystemReadScope,
  [WS_METHODS.terminalOpen]: AuthTerminalOperateScope,
  [WS_METHODS.terminalAttach]: AuthTerminalOperateScope,
  [WS_METHODS.terminalObserve]: AuthTerminalReadScope,
  [WS_METHODS.terminalWrite]: AuthTerminalOperateScope,
  [WS_METHODS.terminalResize]: AuthTerminalOperateScope,
  [WS_METHODS.terminalClear]: AuthTerminalOperateScope,
  [WS_METHODS.terminalRestart]: AuthTerminalOperateScope,
  [WS_METHODS.terminalClose]: AuthTerminalOperateScope,
  [WS_METHODS.subscribeTerminalEvents]: AuthTerminalReadScope,
  [WS_METHODS.subscribeTerminalMetadata]: AuthTerminalReadScope,
  [WS_METHODS.previewOpen]: AuthPreviewOperateScope,
  [WS_METHODS.previewNavigate]: AuthPreviewOperateScope,
  [WS_METHODS.previewResize]: AuthPreviewOperateScope,
  [WS_METHODS.previewAdjust]: AuthPreviewOperateScope,
  [WS_METHODS.previewRefresh]: AuthPreviewOperateScope,
  [WS_METHODS.previewClose]: AuthPreviewOperateScope,
  [WS_METHODS.previewList]: AuthOrchestrationReadScope,
  [WS_METHODS.previewClearProfile]: AuthPreviewOperateScope,
  [WS_METHODS.previewReportProfiles]: AuthPreviewOperateScope,
  [WS_METHODS.previewReportStatus]: AuthPreviewOperateScope,
  [WS_METHODS.previewStopLocalServer]: AuthTerminalOperateScope,
  [WS_METHODS.subscribePreviewEvents]: AuthOrchestrationReadScope,
  [WS_METHODS.subscribeDiscoveredLocalServers]: AuthOrchestrationReadScope,
  [WS_METHODS.localVmList]: AuthOrchestrationReadScope,
  [WS_METHODS.localVmScreenshot]: AuthOrchestrationReadScope,
  [WS_METHODS.localVmConnect]: AuthOrchestrationOperateScope,
  [WS_METHODS.localVmPause]: AuthOrchestrationOperateScope,
  [WS_METHODS.localVmRelease]: AuthOrchestrationOperateScope,
  [WS_METHODS.localVmInput]: AuthOrchestrationOperateScope,
  [WS_METHODS.deviceConfigure]: AuthSettingsWriteScope,
  [WS_METHODS.deviceTestHost]: AuthSettingsWriteScope,
  [WS_METHODS.deviceList]: AuthOrchestrationReadScope,
  [WS_METHODS.deviceOpen]: AuthOrchestrationOperateScope,
  [WS_METHODS.deviceClose]: AuthOrchestrationOperateScope,
  [WS_METHODS.deviceShutdown]: AuthOrchestrationOperateScope,
  [WS_METHODS.deviceDetail]: AuthOrchestrationReadScope,
  [WS_METHODS.deviceAction]: AuthOrchestrationOperateScope,
  [WS_METHODS.subscribeDeviceState]: AuthOrchestrationReadScope,
  [WS_METHODS.subscribeServerConfig]: AuthOrchestrationReadScope,
  [WS_METHODS.subscribeServerLifecycle]: AuthOrchestrationReadScope,
  [WS_METHODS.subscribeAuthAccess]: AuthAccessReadScope,
  [WS_METHODS.subscribeBackgroundPolicy]: AuthOrchestrationReadScope,
} as const satisfies Readonly<Record<WsRpcMethod, AuthEnvironmentScope>>;

export function requiredScopeForRpcMethod(method: string): AuthEnvironmentScope {
  if (!Object.hasOwn(RPC_REQUIRED_SCOPES, method)) {
    throw new Error(`RPC method ${method} has no declared authorization scope.`);
  }
  const requiredScope = RPC_REQUIRED_SCOPES[method as WsRpcMethod];
  if (requiredScope === undefined) {
    throw new Error(`RPC method ${method} has no declared authorization scope.`);
  }
  return requiredScope;
}

export const rpcAuthorizationError = (requiredScope: AuthEnvironmentScope) =>
  new EnvironmentAuthorizationError({
    message: `The authenticated token is missing required scope: ${requiredScope}.`,
    ...authScopeRequiredResponse(requiredScope),
  });

const SettingsUpdate = Schema.Struct({
  patch: ServerSettingsPatch,
  providerInstanceMutation: Schema.optionalKey(ProviderInstanceMutation),
});

const requiredScopesForSettingsUpdate = (payload: unknown) => {
  const input = Schema.decodeUnknownSync(SettingsUpdate)(payload);
  const scopes = requiredScopesForServerSettingsPatch(input.patch);
  if (input.providerInstanceMutation === undefined) return scopes;
  // An atomic provider mutation carries an empty patch unless it also changes settings.
  return Object.values(input.patch).every((value) => value === undefined)
    ? [AuthProvidersManageScope]
    : [...new Set([...scopes, AuthProvidersManageScope])];
};

const decodeProjectMutation = Schema.decodeUnknownSync(ProjectMutation);

const requiredScopesForRpcCall = (
  method: string,
  payload: unknown,
): ReadonlyArray<AuthEnvironmentScope> => {
  if (method === WS_METHODS.serverRetryResourceTelemetry) {
    return [AuthEnvironmentMaintainScope, AuthDiagnosticsReadScope];
  }
  if (method === WS_METHODS.assetsCreateUrl) {
    const { resource } = Schema.decodeUnknownSync(AssetCreateUrlInput)(payload);
    return [
      resource._tag === "workspace-file" ||
      resource._tag === "media-file" ||
      resource._tag === "draft-workspace-file"
        ? AuthFilesystemReadScope
        : AuthOrchestrationReadScope,
    ];
  }
  if (method === WS_METHODS.serverUpdateSettings) return requiredScopesForSettingsUpdate(payload);
  if (method === WS_METHODS.projectsMutate) {
    return requiredScopesForProjectMutation(decodeProjectMutation(payload));
  }
  const guarded = clientRpcRequiredScopes(method, payload);
  if (guarded.length > 0) return guarded;
  return [requiredScopeForRpcMethod(method)];
};

/** Authorizes every RPC on one connection against that connection's session scopes. */
export const layer = (scopes: ReadonlyArray<AuthEnvironmentScope>) =>
  Layer.succeed(RpcScopeAuthorization)((effect, { rpc, payload }) => {
    const requiredScopes = requiredScopesForRpcCall(rpc._tag, payload);
    const requiredScope = requiredScopes.find((scope) => !scopes.includes(scope));
    return requiredScope === undefined ? effect : Effect.fail(rpcAuthorizationError(requiredScope));
  });

/** Retrying can install or restart tools even though ordinary listing is readable. */
export const requiredScopeForDeviceList = (input: DeviceListInput): AuthEnvironmentScope =>
  input.retryHostId || input.updateTool
    ? AuthOrchestrationOperateScope
    : AuthOrchestrationReadScope;
