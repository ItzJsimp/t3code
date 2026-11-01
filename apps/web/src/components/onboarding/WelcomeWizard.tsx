import { VoiceStep } from "./VoiceStep";
import { AiLevelStep } from "./AiLevelStep";
import { AgentsStep } from "./AgentsStep";
import { StepShell } from "./StepShell";
import { useAuth } from "@clerk/react";

import type { EnvironmentId, ProjectId, ScopedProjectRef } from "@t3tools/contracts";
import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { CommandId, AuthOrchestrationOperateScope } from "@t3tools/contracts";

import { ArrowRightIcon, ChevronRightIcon, CloudIcon, LinkIcon, MonitorIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { hasCloudPublicConfig } from "../../cloud/publicConfig";
import { PRIVACY_POLICY_URL } from "../../legalLinks";
import { useT3ConnectAuthPrompt } from "../clerk/useT3ConnectAuthPrompt";
import { useCompleteOnboarding } from "../../onboarding/firstRun";
import {
  partitionOnboardingProjects,
  onboardingProjectKey,
  resolveOnboardingLandingProject,
  resolveOnboardingProjectId,
} from "../../onboarding/projectImport.logic";

import { newProjectId } from "../../lib/utils";
import { agentSessionImport } from "../../state/agentSessions";
import { readProjects, useProjects } from "../../state/entities";
import { environmentCatalog } from "../../connection/catalog";
import { useEnvironments, usePrimaryEnvironment } from "../../state/environments";
import {
  isOnboardingRelayEnvironment,
  resolveOnboardingSetup,
} from "../../onboarding/targetEnvironment.logic";
import { useProjectScans } from "../../onboarding/useProjectScans";
import { projectEnvironment } from "../../state/projects";

import { readEnvironmentScope, useEnvironmentsWithScope } from "../../state/session";

import { useAtomCommand } from "../../state/use-atom-command";
import { connectPairing } from "../../connection/onboarding";

import { ChatGptWelcomeCoordinator } from "../settings/ChatGptWelcomeCoordinator";

import { CloudEnvironmentConnectRows } from "../cloud/CloudEnvironmentConnectList";
import { presentSavedCloudEnvironmentConnection } from "../cloud/cloudEnvironmentConnectionPresentation";

import { T3Wordmark } from "../T3Wordmark";

import { ClaudeInstallPill } from "./ClaudeInstallPill";
import { LeonidasAiosStep } from "./LeonidasAiosStep";
import { LeonidasGoalsStep } from "./LeonidasGoalsStep";
import { ApiKeysStep } from "./ApiKeysStep";
import { LeonidasLayaStep } from "./LeonidasLayaStep";
import { LeonidasSkillsStep } from "./LeonidasSkillsStep";
import { ImportCandidateList } from "./ImportCandidateList";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { CommandBlock } from "../CommandBlock";
import { Checkbox } from "../ui/checkbox";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Spinner } from "../ui/spinner";
import { sendUsageEvent } from "../../lib/usageAnalytics/sendUsageEvent";
import { WizardPanel, WizardSteps, WizardPopup, WizardHeader } from "../ui/wizard";
import { Dialog } from "../ui/dialog";
import { toastManager } from "../ui/toast";
import { cn } from "../../lib/utils";

/**
 * First-run welcome wizard. Rendered over the workspace at `/welcome` on a
 * fresh install (no completed-onboarding flag, empty workspace). Flow per the
 * onboarding overhaul spec: connection choice → sign-in/pair (remote paths) →
 * managed Codex setup or an inline CLI terminal → project import → main screen.
 * Every step past the connection gate is skippable; the whole wizard is
 * re-runnable by clearing the flag.
 */

type WizardStep =
  | "welcome"
  | "connection"
  | "agents"
  | "voice"
  | "level"
  | "skills"
  | "laya"
  | "keys"
  | "import"
  | "aios";
const STEP_ORDER: readonly WizardStep[] = [
  "welcome",
  "connection",
  "agents",
  "voice",
  "level",
  "skills",
  "laya",
  "keys",
  "import",
  "aios",
];
/** Usage events for the setup funnel. Step ids only; sendUsageEvent checks consent. */
function useWizardUsageEvents(step: WizardStep) {
  const stepRef = useRef(step);
  stepRef.current = step;
  const previousStep = useRef<WizardStep | null>(null);
  useEffect(() => {
    if (previousStep.current === null) sendUsageEvent("setup_started");
    else if (previousStep.current !== step) {
      sendUsageEvent("setup_step_completed", { step: previousStep.current });
    }
    previousStep.current = step;
  }, [step]);
  useEffect(() => {
    const onPageHide = () => sendUsageEvent("setup_abandoned_at_step", { step: stepRef.current });
    if (typeof window === "undefined") return;
    window.addEventListener("pagehide", onPageHide);
    // Leaving the wizard after it finished unmounts it; only a real close counts.
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);
}

const NO_ENVIRONMENTS: readonly EnvironmentId[] = [];

const ONBOARDING_STAGES = [
  "Welcome",
  "Connect",
  "AI",
  "Voice",
  "Level",
  "Skills",
  "Safety",
  "Keys",
  "Projects",
  "AIOS",
] as const;
const SCAN_LIMIT_MESSAGE = "Scan limit reached. Some projects or conversations may be missing.";

export function WelcomeWizard({
  localAvailable,
  onDone,
  resumeEnvironmentId,
}: {
  /** Whether this client is authenticated to the server serving the app. */
  readonly localAvailable: boolean;
  readonly resumeEnvironmentId?: EnvironmentId | undefined;
  readonly onDone: (projectRef?: ScopedProjectRef) => void | Promise<void>;
}) {
  const completeOnboarding = useCompleteOnboarding();
  const [step, setStep] = useState<WizardStep>(resumeEnvironmentId ? "agents" : "welcome");
  const { environments } = useEnvironments();
  const [selection, setSelection] = useState<ReadonlySet<EnvironmentId> | null>(null);
  const autoSelectedComputers = useRef(new Set<EnvironmentId>());
  const [setupIds, setSetupIds] = useState<readonly EnvironmentId[]>(
    resumeEnvironmentId ? [resumeEnvironmentId] : [],
  );
  const [isImporting, setIsImporting] = useState(false);
  const finishingPromiseRef = useRef<Promise<boolean> | null>(null);
  const completionErrorToastIdRef = useRef<ReturnType<typeof toastManager.add> | null>(null);
  const primaryEnvironment = usePrimaryEnvironment();
  const setEnvironmentEnabled = useAtomCommand(environmentCatalog.setEnabled, {
    reportFailure: false,
  });
  // A new user who finds "This computer" switched off cannot chat or add an AI. Switch
  // it on once, before the steps need it.
  const turnedOnPrimary = useRef(false);
  useEffect(() => {
    if (!primaryEnvironment || primaryEnvironment.entry.enabled || turnedOnPrimary.current) return;
    turnedOnPrimary.current = true;
    void setEnvironmentEnabled({ environmentId: primaryEnvironment.environmentId, enabled: true });
  }, [primaryEnvironment, setEnvironmentEnabled]);
  useEffect(() => {
    const newComputers = environments.filter(
      (environment) => !autoSelectedComputers.current.has(environment.environmentId),
    );
    if (newComputers.length === 0) return;
    for (const environment of newComputers) {
      autoSelectedComputers.current.add(environment.environmentId);
    }
    // A computer the user switched off stays unselected until they pick it.
    const enabledComputers = newComputers.filter((environment) => environment.entry.enabled);
    if (enabledComputers.length === 0) return;
    setSelection(
      (current) =>
        new Set([
          ...(current ?? []),
          ...enabledComputers.map((environment) => environment.environmentId),
        ]),
    );
  }, [environments]);
  const selectedIds =
    selection ?? new Set(primaryEnvironment ? [primaryEnvironment.environmentId] : []);
  const scans = useProjectScans(step === "import" ? setupIds : NO_ENVIRONMENTS);
  const isLoadingProjects =
    step === "import" &&
    scans.every((scan) => scan.data === null) &&
    scans.some((scan) => scan.isPending);
  const startSetup = (ids: readonly EnvironmentId[]) => {
    if (ids.length === 0) return;
    setSetupIds(ids);
    setStep("agents");
  };
  // One computer with nothing to choose skips Connect; its privacy notice moves to Welcome.
  const soloSetup = resolveOnboardingSetup(environments, selectedIds);
  const skipConnect =
    environments.length === 1 && !hasCloudPublicConfig() && soloSetup.environmentIds.length === 1;
  const stageIndex = STEP_ORDER.indexOf(step);
  useWizardUsageEvents(step);
  const goBack = () => {
    const previous = STEP_ORDER[stageIndex - 1] ?? "welcome";
    setStep(previous === "connection" && skipConnect ? "welcome" : previous);
  };
  const finish = useCallback(
    (projectRef?: ScopedProjectRef, importWarning?: string, importedThreadCount = 0) => {
      if (finishingPromiseRef.current !== null) return finishingPromiseRef.current;
      if (completionErrorToastIdRef.current !== null) {
        toastManager.close(completionErrorToastIdRef.current);
        completionErrorToastIdRef.current = null;
      }

      const completion = completeOnboarding()
        .then(async () => {
          if (completionErrorToastIdRef.current !== null) {
            toastManager.close(completionErrorToastIdRef.current);
            completionErrorToastIdRef.current = null;
          }
          await onDone(projectRef);
          if (importWarning) {
            toastManager.add({
              type: "warning",
              title: "Some chat history was not imported",
              description: importWarning,
              timeout: 0,
            });
          } else if (importedThreadCount > 0) {
            toastManager.add({
              type: "success",
              title: `Imported ${importedThreadCount} ${importedThreadCount === 1 ? "chat" : "chats"}`,
            });
          }
          return true;
        })
        .catch(() => {
          const errorToast = {
            type: "error",
            title: "Could not finish setup",
            description: "Leonidas could not save your settings. Try again.",
          } as const;
          if (completionErrorToastIdRef.current === null) {
            completionErrorToastIdRef.current = toastManager.add(errorToast);
          } else {
            toastManager.update(completionErrorToastIdRef.current, errorToast);
          }
          return false;
        })
        .finally(() => {
          if (finishingPromiseRef.current === completion) {
            finishingPromiseRef.current = null;
          }
        });
      finishingPromiseRef.current = completion;
      return completion;
    },
    [completeOnboarding, onDone],
  );

  // AIOS is the last step because its setup chat leaves the wizard. The import
  // result waits here until the user finishes or leaves from that step.
  const importResultRef = useRef<{
    readonly projectRef: ScopedProjectRef | undefined;
    readonly warning: string | undefined;
    readonly threadCount: number;
  } | null>(null);
  const completeImport = useCallback(
    async (projectRef?: ScopedProjectRef, warning?: string, threadCount = 0) => {
      importResultRef.current = { projectRef, warning, threadCount };
      setIsImporting(false);
      setStep("aios");
      return true;
    },
    [],
  );
  const finishFromAios = (landOnImportedProject: boolean) => {
    const result = importResultRef.current;
    return finish(
      landOnImportedProject ? result?.projectRef : undefined,
      result?.warning,
      result?.threadCount ?? 0,
    );
  };

  return (
    <Dialog open disablePointerDismissal onOpenChange={(_, event) => event.cancel()}>
      <WizardPopup
        size="wide"
        bottomStickOnMobile={false}
        showCloseButton={false}
        initialFocus={() => document.getElementById("onboarding-pairing-url") ?? true}
      >
        <WizardHeader
          title="Set up Leonidas"
          identity={
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2" role="img" aria-label="Leonidas">
                <T3Wordmark className="size-6 shrink-0" aria-hidden />
                <span className="text-xl font-medium tracking-tight text-foreground">Leonidas</span>
              </div>
              <Button
                size="xs"
                variant="ghost-muted"
                disabled={isImporting}
                onClick={() => void finishFromAios(false)}
              >
                Skip setup
              </Button>
            </div>
          }
        >
          <WizardSteps
            steps={ONBOARDING_STAGES}
            currentStep={stageIndex}
            isStepDisabled={(index) =>
              isImporting ||
              index >= stageIndex ||
              (step === "aios" && STEP_ORDER[index] === "import")
            }
            onStepChange={(index) => {
              if (isImporting || index > stageIndex) return;
              if (step === "aios" && STEP_ORDER[index] === "import") return;
              setStep(STEP_ORDER[index] ?? "connection");
            }}
          />
        </WizardHeader>
        {step !== "agents" && setupIds[0] ? (
          <ClaudeInstallPill environmentId={setupIds[0]} onOpenAgents={() => setStep("agents")} />
        ) : null}

        <WizardPanel holdHeight={isLoadingProjects} stableHeight>
          {step === "welcome" ? (
            <LeonidasGoalsStep
              onContinue={() =>
                skipConnect ? startSetup(soloSetup.environmentIds) : setStep("connection")
              }
            />
          ) : step === "connection" ? (
            <ConnectionStep
              expandPairingInitially={!localAvailable && !hasCloudPublicConfig()}
              selectedIds={selectedIds}
              autoSelectedComputers={autoSelectedComputers.current}
              onSelectionChange={setSelection}
              onToggleEnvironment={(environmentId, checked) =>
                setSelection((current) => {
                  const next = new Set(current ?? selectedIds);
                  if (checked) next.add(environmentId);
                  else next.delete(environmentId);
                  return next;
                })
              }
              onContinue={() =>
                startSetup(resolveOnboardingSetup(environments, selectedIds).environmentIds)
              }
              onPaired={(environmentId) => {
                setSelection(new Set([...selectedIds, environmentId]));
              }}
            />
          ) : step === "agents" ? (
            <AgentsStep
              environmentIds={setupIds}
              onBack={goBack}
              onContinue={() => setStep("voice")}
            />
          ) : step === "voice" ? (
            <VoiceStep
              environmentId={setupIds[0]}
              onBack={goBack}
              onContinue={() => setStep("level")}
            />
          ) : step === "level" ? (
            <AiLevelStep
              environmentId={setupIds[0]}
              onBack={goBack}
              onContinue={() => setStep("skills")}
            />
          ) : step === "skills" ? (
            <LeonidasSkillsStep
              environmentId={setupIds[0]}
              onBack={goBack}
              onContinue={() => setStep("laya")}
            />
          ) : step === "laya" ? (
            <LeonidasLayaStep
              environmentId={setupIds[0]}
              onBack={goBack}
              onContinue={() => setStep("keys")}
            />
          ) : step === "keys" ? (
            <ApiKeysStep
              environmentId={setupIds[0]}
              onBack={goBack}
              onContinue={() => setStep("import")}
            />
          ) : step === "import" ? (
            <ImportStep
              scans={scans}
              isImporting={isImporting}
              setIsImporting={setIsImporting}
              onDone={completeImport}
            />
          ) : (
            <LeonidasAiosStep
              environmentId={setupIds[0]}
              onBack={() => setStep("skills")}
              onContinue={() => void finishFromAios(true)}
              onLeave={() => finishFromAios(false)}
            />
          )}
        </WizardPanel>
      </WizardPopup>
      <ChatGptWelcomeCoordinator />
    </Dialog>
  );
}

// ── Step 1: connection choice ────────────────────────────────

function ConnectionStep({
  autoSelectedComputers,
  expandPairingInitially,
  selectedIds,
  onSelectionChange,
  onToggleEnvironment,
  onContinue,
  onPaired,
}: {
  readonly autoSelectedComputers: Set<EnvironmentId>;
  readonly expandPairingInitially: boolean;
  readonly selectedIds: ReadonlySet<EnvironmentId>;
  readonly onSelectionChange: (ids: ReadonlySet<EnvironmentId>) => void;
  readonly onToggleEnvironment: (environmentId: EnvironmentId, checked: boolean) => void;
  readonly onContinue: () => void;
  readonly onPaired: (environmentId: EnvironmentId) => void;
}) {
  const { environments } = useEnvironments();
  const cloudEnabled = hasCloudPublicConfig();
  const directEnvironments = environments.filter(
    (environment) => !cloudEnabled || !isOnboardingRelayEnvironment(environment),
  );
  const [pairingOpen, setPairingOpen] = useState(expandPairingInitially);
  const [isPairing, setIsPairing] = useState(false);
  const { ready, skippedIds } = resolveOnboardingSetup(environments, selectedIds);
  const skippedLabels = environments
    .filter((environment) => skippedIds.includes(environment.environmentId))
    .map((environment) => environment.label);
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (
      ready &&
      (document.activeElement === document.body ||
        document.activeElement?.getAttribute("role") === "dialog")
    ) {
      continueRef.current?.focus();
    }
  }, [ready]);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Connect your computers
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        Choose one or more computers. We will set up AI accounts and projects on each one.
      </p>
      {directEnvironments.length > 0 ? (
        <fieldset className="mt-5 space-y-2">
          <legend className="sr-only">Computers to set up</legend>
          {directEnvironments.map((environment) => (
            <label
              key={environment.environmentId}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-3"
            >
              <Checkbox
                checked={selectedIds.has(environment.environmentId)}
                onCheckedChange={(checked) => {
                  const next = new Set(selectedIds);
                  if (checked) next.add(environment.environmentId);
                  else next.delete(environment.environmentId);
                  onSelectionChange(next);
                }}
              />
              <MonitorIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-sm font-medium break-words">
                    {environment.label}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {presentSavedCloudEnvironmentConnection(environment.connection).buttonLabel}
                  </span>
                </span>
                {environment.displayUrl ? (
                  <span className="mt-0.5 block text-xs break-all text-muted-foreground">
                    {environment.displayUrl}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      <div className="mt-4 space-y-2">
        {cloudEnabled ? (
          <ConnectAccountOption
            autoSelectedComputers={autoSelectedComputers}
            disabled={isPairing}
            selectedIds={selectedIds}
            onToggleEnvironment={onToggleEnvironment}
          />
        ) : null}
        <div className="rounded-lg border border-border bg-background">
          <Collapsible open={pairingOpen} onOpenChange={setPairingOpen}>
            <CollapsibleTrigger
              disabled={isPairing}
              render={
                <Button
                  variant="ghost"
                  size="sm-multiline"
                  className="min-h-14 w-full justify-start"
                />
              }
            >
              <LinkIcon className="size-4 text-muted-foreground" />
              <span className="flex-1 text-left">Add a computer</span>
              <ChevronRightIcon
                className={cn("size-4 text-muted-foreground", pairingOpen && "rotate-90")}
              />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <div className="px-3 pb-3">
                <PairingForm
                  isPairing={isPairing}
                  setIsPairing={setIsPairing}
                  onPaired={(environmentId) => {
                    setPairingOpen(false);
                    onPaired(environmentId);
                    requestAnimationFrame(() => continueRef.current?.focus());
                  }}
                />
              </div>
            </CollapsiblePanel>
          </Collapsible>
        </div>
      </div>
      {skippedLabels.length > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Not connected, so setup skips {skippedLabels.join(", ")}. You can set{" "}
          {skippedLabels.length === 1 ? "it" : "them"} up later from Settings.
        </p>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
          Leonidas collects anonymous usage data to help us improve it. To read more about how your
          data is used and how to opt out, see our{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            privacy policy
          </a>
          .
        </p>
        <Button
          className="shrink-0 self-end"
          ref={continueRef}
          autoFocus={!expandPairingInitially}
          disabled={!ready || isPairing}
          onClick={onContinue}
        >
          Continue
          <ArrowRightIcon className="size-3.5" />
        </Button>
      </div>
    </>
  );
}

function ConnectAccountOption({
  autoSelectedComputers,
  disabled,
  selectedIds,
  onToggleEnvironment,
}: {
  readonly autoSelectedComputers: Set<EnvironmentId>;
  readonly disabled: boolean;
  readonly selectedIds: ReadonlySet<EnvironmentId>;
  readonly onToggleEnvironment: (environmentId: EnvironmentId, checked: boolean) => void;
}) {
  const { environments } = useEnvironments();
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { openAuthPrompt } = useT3ConnectAuthPrompt();
  const [expanded, setExpanded] = useState(true);
  const [discoveryReady, setDiscoveryReady] = useState(false);
  const onDiscoveryReady = useCallback(() => setDiscoveryReady(true), []);

  return (
    <div className="rounded-lg border border-border bg-background">
      <Collapsible open={expanded && !!isSignedIn && discoveryReady} onOpenChange={setExpanded}>
        <CollapsibleTrigger
          disabled={disabled || !isLoaded}
          onClick={(event) => {
            if (!isSignedIn) {
              event.preventDefault();
              setExpanded(true);
              openAuthPrompt();
            }
          }}
          render={
            <Button variant="ghost" size="sm-multiline" className="min-h-14 w-full justify-start" />
          }
        >
          <CloudIcon className="size-4 text-muted-foreground" />
          <span className="flex-1 text-left">Remote access</span>
          <span className="text-xs text-muted-foreground">
            {!isLoaded
              ? "Loading sign-in…"
              : !isSignedIn
                ? "Sign in"
                : !discoveryReady
                  ? "Loading computers…"
                  : null}
          </span>
          <ChevronRightIcon
            className={cn("size-4 text-muted-foreground", expanded && isSignedIn && "rotate-90")}
          />
        </CollapsibleTrigger>
        <CollapsiblePanel keepMounted>
          <div className="px-3 pb-3">
            <div className="mb-3 space-y-1.5">
              {isSignedIn ? (
                <CloudEnvironmentConnectRows
                  primaryEnvironmentId={null}
                  savedEnvironments={environments}
                  showSavedEnvironments
                  onDiscoveryReady={onDiscoveryReady}
                  selection={{ selectedIds, onChange: onToggleEnvironment, autoSelectedComputers }}
                  refreshWhileEmpty
                  empty={
                    <p className="py-3 text-sm text-muted-foreground">No computers linked yet.</p>
                  }
                />
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Run this on each computer you want to connect.
            </p>
            <CommandBlock command="npx t3 connect" className="mt-3" />
            <p className="mt-3 text-xs text-muted-foreground">
              Keep Leonidas open. Then select the computers you want to set up above.
            </p>
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </div>
  );
}

// ── Step 2′: Direct pairing ──────────────────────────────────

/**
 * Register a computer in this browser using a server-minted pairing link.
 */
export function PairingForm({
  isPairing,
  setIsPairing,
  onPaired,
}: {
  readonly isPairing: boolean;
  readonly setIsPairing: (value: boolean) => void;
  readonly onPaired: (environmentId: EnvironmentId) => void;
}) {
  const connectPairingEnvironment = useAtomCommand(connectPairing, { reportFailure: false });
  const [pairingUrl, setPairingUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const submit = async () => {
    if (isPairing || pairingUrl.trim().length === 0) return;
    setIsPairing(true);
    setErrorMessage("");
    const result = await connectPairingEnvironment({ pairingUrl: pairingUrl.trim() });
    if (!mountedRef.current) return;
    setIsPairing(false);
    if (result._tag === "Success") {
      onPaired(result.value);
      return;
    }
    if (isAtomCommandInterrupted(result)) return;
    const cause = squashAtomCommandFailure(result);
    setErrorMessage(
      cause instanceof Error ? cause.message : "Could not connect. Check the link and try again.",
    );
  };

  return (
    <>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div>
          <label className="block text-sm text-muted-foreground" htmlFor="onboarding-pairing-url">
            Connection link
          </label>
          <Input
            id="onboarding-pairing-url"
            autoFocus
            aria-invalid={errorMessage.length > 0}
            aria-describedby={errorMessage ? "onboarding-pairing-error" : undefined}
            className="mt-2"
            size="lg"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            nativeInput
            readOnly={isPairing}
            placeholder="https://your-server:5230/pair#token=…"
            value={pairingUrl}
            onChange={(event) => setPairingUrl(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                (event.nativeEvent.isComposing || event.keyCode === 229)
              ) {
                event.preventDefault();
              }
            }}
          />
        </div>
        {errorMessage ? (
          <Alert id="onboarding-pairing-error" variant="error">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <Collapsible>
          <div className="flex items-center justify-between gap-3">
            <CollapsibleTrigger
              type="button"
              className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronRightIcon className="size-3.5 group-data-panel-open:rotate-90" />
              Need a connection link?
            </CollapsibleTrigger>
            <Button type="submit" disabled={isPairing || pairingUrl.trim().length === 0}>
              {isPairing ? "Connecting..." : "Connect"}
            </Button>
          </div>
          <CollapsiblePanel>
            <p className="pt-3 text-sm text-muted-foreground">
              Run this on the computer that has your project.
            </p>
            <CommandBlock command="npx t3 pair" className="mt-2" />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Start Leonidas on that computer first, or run{" "}
              <code className="font-mono">npx t3 serve</code>. On a Tailscale network, run{" "}
              <code className="font-mono">npx t3 pair --tailscale</code> instead.
            </p>
          </CollapsiblePanel>
        </Collapsible>
      </form>
    </>
  );
}

// ── Step 4: import ───────────────────────────────────────────

const IMPORT_PERMISSION_MESSAGE = "This connection cannot import projects or chat history.";

function ImportStep({
  scans,
  isImporting,
  setIsImporting,
  onDone,
}: {
  readonly scans: ReturnType<typeof useProjectScans>;
  readonly isImporting: boolean;
  readonly setIsImporting: (value: boolean) => void;
  readonly onDone: (
    projectRef?: ScopedProjectRef,
    importWarning?: string,
    importedThreadCount?: number,
  ) => Promise<boolean>;
}) {
  const { environments } = useEnvironments();
  const writableEnvironments = useEnvironmentsWithScope(scans, AuthOrchestrationOperateScope);
  const createProject = useAtomCommand(projectEnvironment.create, { reportFailure: false });
  const importThreads = useAtomCommand(agentSessionImport, { reportFailure: false });
  const projects = useProjects();
  const [selectedPaths, setSelectedPaths] = useState<ReadonlySet<string> | null>(null);
  const importWarningRef = useRef("");
  const importedThreadCountRef = useRef(0);
  const [landingProject, setLandingProject] = useState<ScopedProjectRef | null>(null);
  // Keep project creation attempts separate from completed history imports so both can retry.
  const importedProjectsRef = useRef(new Map<string, ScopedProjectRef>());
  const projectsWithImportedHistoryRef = useRef(new Map<string, ScopedProjectRef>());
  const lastImportSelectionRef = useRef<ReadonlyArray<string>>([]);
  const projectAttemptsRef = useRef(
    new Map<string, { readonly projectId: ProjectId; readonly commandId: CommandId }>(),
  );
  const importGenerationRef = useRef(0);

  // Ignore command completions after leaving the import step.
  useEffect(() => {
    importGenerationRef.current += 1;
    return () => {
      importGenerationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (
      landingProject !== null &&
      projects.some(
        (project) =>
          project.id === landingProject.projectId &&
          project.environmentId === landingProject.environmentId,
      )
    ) {
      setLandingProject(null);
      void onDone(landingProject, importWarningRef.current, importedThreadCountRef.current).then(
        (completed) => {
          if (!completed) setIsImporting(false);
        },
      );
    }
  }, [landingProject, onDone, projects, setIsImporting]);

  const { available: candidates, recent } = useMemo(
    () =>
      partitionOnboardingProjects(
        scans.flatMap((scan) =>
          (scan.data?.candidates ?? []).map((candidate) => ({
            ...candidate,
            environmentId: scan.environmentId,
            key: onboardingProjectKey(scan.environmentId, candidate.path),
          })),
        ),
      ),
    [scans],
  );
  // A computer with no Claude Code or Codex history has nothing to pick, so skip the step.
  const autoSkippedRef = useRef(false);
  useEffect(() => {
    if (autoSkippedRef.current || scans.length === 0 || candidates.length > 0) return;
    if (!scans.every((scan) => scan.data !== null && scan.error === null)) return;
    autoSkippedRef.current = true;
    void onDone();
  }, [scans, candidates, onDone]);
  const selectedKeys = useMemo(
    () => selectedPaths ?? new Set(recent.map((candidate) => candidate.key)),
    [selectedPaths, recent],
  );
  const selected = candidates.filter((candidate) => selectedKeys.has(candidate.key));

  const canImport = selected.every((candidate) =>
    writableEnvironments.has(candidate.environmentId),
  );
  const [importError, setImportError] = useState("");
  const visibleImportError = !canImport
    ? IMPORT_PERMISSION_MESSAGE
    : importError === IMPORT_PERMISSION_MESSAGE
      ? ""
      : importError;

  const finishAfterImport = () => {
    const projectRef = resolveOnboardingLandingProject(
      lastImportSelectionRef.current,
      projectsWithImportedHistoryRef.current,
      importedProjectsRef.current,
    );
    if (projectRef === undefined) {
      void onDone(undefined, importWarningRef.current, importedThreadCountRef.current);
      return;
    }
    setIsImporting(true);
    setLandingProject(projectRef);
  };

  const runImport = async (selection: typeof candidates) => {
    if (isImporting) return;
    const hasAccess = () =>
      selection.every((candidate) =>
        readEnvironmentScope(candidate.environmentId, AuthOrchestrationOperateScope),
      );
    const stopForDeniedAccess = () => {
      setIsImporting(false);
      setImportError(IMPORT_PERMISSION_MESSAGE);
    };
    if (!hasAccess()) {
      stopForDeniedAccess();
      return;
    }
    if (selection.length === 0) {
      void onDone();
      return;
    }
    setIsImporting(true);
    importWarningRef.current = "";
    importedThreadCountRef.current = 0;
    lastImportSelectionRef.current = selection.map((candidate) => candidate.key);
    const importGeneration = importGenerationRef.current;
    const importedProjects = importedProjectsRef.current;
    const projectAttempts = projectAttemptsRef.current;
    // Interrupted imports are neither failures nor successes — the command was
    // superseded or the environment dropped — but they still didn't land, so
    // they must not read as "imported everything". Retries skip paths that
    // already landed this session (re-creating them would only trip the
    // duplicate-root invariant and read as a failure).
    let importedProjectsCount =
      importedProjects.size > 0
        ? selection.filter((candidate) => importedProjects.has(candidate.key)).length
        : 0;
    let importedThreadCount = 0;
    let skippedThreadCount = 0;
    const refreshEnvironments = new Set<EnvironmentId>();
    for (const candidate of selection) {
      const { environmentId } = candidate;
      if (
        importGeneration !== importGenerationRef.current ||
        importedProjects !== importedProjectsRef.current
      ) {
        return;
      }
      if (!hasAccess()) {
        stopForDeniedAccess();
        return;
      }
      if (importedProjects.has(candidate.key)) continue;
      let projectId = resolveOnboardingProjectId(readProjects(), environmentId, candidate);
      if (projectId === null) {
        let attempt = projectAttempts.get(candidate.key);
        if (attempt === undefined) {
          const nextProjectId = newProjectId();
          attempt = {
            projectId: nextProjectId,
            commandId: CommandId.make(`onboarding:project:create:${nextProjectId}`),
          };
          projectAttempts.set(candidate.key, attempt);
        }
        projectId = attempt.projectId;
        const result = await createProject({
          environmentId,
          input: {
            projectId,
            commandId: attempt.commandId,
            title: candidate.title,
            workspaceRoot: candidate.path,
            createWorkspaceRootIfMissing: false,
            defaultModelSelection: null,
          },
        });
        if (
          importGeneration !== importGenerationRef.current ||
          importedProjects !== importedProjectsRef.current
        ) {
          return;
        }
        if (result._tag !== "Success") {
          if (!isAtomCommandInterrupted(result)) {
            projectAttempts.delete(candidate.key);
            refreshEnvironments.add(environmentId);
          }
          continue;
        }
      }

      if (!hasAccess()) {
        stopForDeniedAccess();
        return;
      }
      const threadImportResult = await importThreads({
        environmentId,
        input: { projectId, expectedWorkspaceRoot: candidate.path },
      });
      if (
        importGeneration !== importGenerationRef.current ||
        importedProjects !== importedProjectsRef.current
      ) {
        return;
      }
      if (threadImportResult._tag === "Success") {
        importedThreadCount += threadImportResult.value.importedCount;
        skippedThreadCount += threadImportResult.value.skippedCount;
        if (threadImportResult.value.importedCount > 0) {
          projectsWithImportedHistoryRef.current.set(
            candidate.key,
            scopeProjectRef(environmentId, projectId),
          );
        }
        if (threadImportResult.value.skippedCount === 0) {
          importedProjectsCount += 1;
          importedProjects.set(candidate.key, scopeProjectRef(environmentId, projectId));
        }
      } else if (!isAtomCommandInterrupted(threadImportResult)) {
        projectAttempts.delete(candidate.key);
        refreshEnvironments.add(environmentId);
      }
    }
    for (const scan of scans) {
      if (refreshEnvironments.has(scan.environmentId)) scan.refresh();
    }
    setIsImporting(false);
    importedThreadCountRef.current = importedThreadCount;
    if (importedProjectsCount < selection.length) {
      if (importedThreadCount > 0 && skippedThreadCount > 0) {
        importWarningRef.current = `Imported ${importedThreadCount} ${importedThreadCount === 1 ? "chat" : "chats"}. ${skippedThreadCount} ${skippedThreadCount === 1 ? "chat" : "chats"} could not be imported.`;
      } else if (skippedThreadCount > 0) {
        importWarningRef.current = `${skippedThreadCount} ${skippedThreadCount === 1 ? "chat" : "chats"} could not be imported.`;
      } else if (importedThreadCount > 0) {
        importWarningRef.current = `Imported ${importedThreadCount} ${importedThreadCount === 1 ? "chat" : "chats"}. Some chat history could not be imported.`;
      } else {
        importWarningRef.current = "Could not import chat history. Try again later.";
      }
    }
    finishAfterImport();
  };

  if (scans.every((scan) => scan.data === null) && scans.some((scan) => scan.isPending)) {
    return (
      <div className="flex h-full min-h-40 flex-col">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your projects</h1>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6">
          <Spinner size="lg" tone="muted" />
          <p className="text-center text-sm text-muted-foreground">
            Looking for projects from Claude Code and Codex…
          </p>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost-muted" onClick={() => void onDone()}>
            Skip importing projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <StepShell
      title="Import your projects"
      description="Import projects and chats from Claude Code and Codex on your selected computers."
    >
      {candidates.length > 0 ? (
        <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span role="status">
            {selected.length} of {candidates.length} selected
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              disabled={isImporting || selected.length === candidates.length}
              onClick={() => setSelectedPaths(new Set(candidates.map((item) => item.key)))}
            >
              Select all
            </Button>
            <Button
              variant="ghost"
              size="xs"
              disabled={isImporting || selected.length === 0}
              onClick={() => setSelectedPaths(new Set())}
            >
              Select none
            </Button>
          </div>
        </div>
      ) : null}
      <ScrollArea scrollFade className="mt-2 h-auto max-h-80">
        <div className="space-y-5 pr-3">
          {scans.map((scan) => {
            const scanCandidates = candidates.filter(
              (candidate) => candidate.environmentId === scan.environmentId,
            );
            const label =
              environments.find((environment) => environment.environmentId === scan.environmentId)
                ?.label ?? "Computer";
            return (
              <fieldset
                key={scan.environmentId}
                className="min-w-0 space-y-0.5"
                disabled={isImporting}
              >
                {scans.length > 1 ? (
                  <legend className="mb-2 text-sm font-medium">{label}</legend>
                ) : null}
                {scan.isPending && scan.data === null ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                    <Spinner size="md" />
                    Looking for projects…
                  </div>
                ) : scan.error !== null ? (
                  <div
                    role="alert"
                    className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
                  >
                    <span>Could not check projects. {scan.error}</span>
                    <Button variant="ghost" size="sm" onClick={scan.refresh}>
                      Retry
                    </Button>
                  </div>
                ) : scanCandidates.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">
                    No Claude Code or Codex projects found. Select "Skip importing projects" to
                    continue.
                  </p>
                ) : null}
                {scan.data?.truncated ? (
                  <p className="text-xs text-muted-foreground" role="status">
                    {SCAN_LIMIT_MESSAGE}
                  </p>
                ) : null}
                <ImportCandidateList
                  candidates={scanCandidates}
                  selectedKeys={selectedKeys}
                  onSelectionChange={setSelectedPaths}
                />
              </fieldset>
            );
          })}
        </div>
      </ScrollArea>
      {visibleImportError ? (
        <p className="mt-3 text-sm text-destructive">{visibleImportError}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <Button variant="ghost-muted" disabled={isImporting} onClick={finishAfterImport}>
          Skip importing projects
        </Button>
        <Button
          autoFocus
          disabled={!canImport || isImporting || selected.length === 0}
          onClick={() => void runImport(selected)}
        >
          {isImporting
            ? "Importing…"
            : `Import ${selected.length} ${selected.length === 1 ? "project" : "projects"}`}
        </Button>
      </div>
    </StepShell>
  );
}
