import { useAtomValue } from "@effect/atom-react";
import { executeAtomQuery, squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import type { EnvironmentId } from "@t3tools/contracts";
import { MicIcon, SquareIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { appAtomRegistry } from "../../rpc/atomRegistry";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { useSplitPane } from "../split/splitPaneContext";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogFooter,
} from "../ui/dialog";
import { DiscordTip, shouldShowDiscordTip } from "./DiscordTip";
import { DiscordWalkthrough } from "./DiscordWalkthrough";
import { VoiceSetup } from "./VoiceSetup";
import { recordVoice, voiceAudioBase64 } from "./recordVoice";

export function ComposerVoiceButton({
  environmentId,
  disabled,
  onText,
  globalTrigger = false,
}: {
  environmentId: EnvironmentId;
  disabled: boolean;
  onText: (text: string) => boolean;
  /** Answer the OS-wide dictation trigger (desktop) when this composer's pane is active. */
  globalTrigger?: boolean;
}) {
  const [state, setState] = useState<"idle" | "starting" | "listening" | "writing">("idle");
  const [setup, setSetup] = useState(false);
  const [discordTip, setDiscordTip] = useState(false);
  const [discordSteps, setDiscordSteps] = useState(false);
  const [error, setError] = useState("");
  const [retainedText, setRetainedText] = useState("");
  const [seconds, setSeconds] = useState(0);
  const recording = useRef<ReturnType<typeof recordVoice> | null>(null);
  const active = useRef(true);
  const busy = useRef(false);
  // A global stop can arrive while the mic is still opening; apply it once the recording exists.
  const opening = useRef(false);
  const pendingEnd = useRef<"stop" | "cancel" | null>(null);
  const { active: paneActive } = useSplitPane();
  const insert = useRef(onText);
  useEffect(() => {
    insert.current = onText;
  }, [onText]);
  const transcribe = useAtomCommand(serverEnvironment.transcribeVoice, { reportFailure: false });
  const clear = useAtomCommand(serverEnvironment.clearVoiceKey, { reportFailure: false });
  const allowed = useAtomValue(serverEnvironment.transcribeVoice.permissionAtom(environmentId));
  const canClear = useAtomValue(serverEnvironment.clearVoiceKey.permissionAtom(environmentId));
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      recording.current?.cancel();
    };
  }, []);
  useEffect(() => {
    if (state !== "listening") return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);
  const start = async (viaGlobal = false) => {
    if (busy.current) {
      if (viaGlobal) void window.desktopBridge?.dictationEnded?.();
      return;
    }
    busy.current = true;
    opening.current = true;
    setError("");
    setState("starting");
    try {
      const status = await executeAtomQuery(
        appAtomRegistry,
        serverEnvironment.voiceStatus({ environmentId, input: {} }),
        { refresh: true, reportFailure: false },
      );
      if (!active.current) return;
      if (status._tag !== "Success")
        throw new Error("Voice status is unavailable. Reconnect this computer and try again.");
      if (!status.value.keyConfigured) {
        setSetup(true);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Microphone access needs the desktop app or an HTTPS connection.");
      }
      void shouldShowDiscordTip().then((show) => active.current && setDiscordTip(show));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const session = recordVoice(stream);
      recording.current = session;
      opening.current = false;
      if (pendingEnd.current) session[pendingEnd.current]();
      setSeconds(0);
      setState("listening");
      const blob = await session.result;
      recording.current = null;
      if (!blob || !active.current) return;
      setState("writing");
      const audioBase64 = await voiceAudioBase64(blob);
      if (!active.current) return;
      const result = await transcribe({
        environmentId,
        input: { audioBase64, mimeType: blob.type, polish: true },
      });
      if (!active.current) return;
      if (result._tag === "Success") {
        if (!insert.current(`${result.value.text} `)) setRetainedText(result.value.text);
      } else if (result._tag === "Failure") throw squashAtomCommandFailure(result);
    } catch (failure) {
      if (active.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Voice failed. Check microphone access and try again.",
        );
    } finally {
      busy.current = false;
      opening.current = false;
      pendingEnd.current = null;
      if (active.current) setState("idle");
      // Releases the Discord mute key at once when setup, the mic or the transcription failed.
      if (viaGlobal) void window.desktopBridge?.dictationEnded?.();
    }
  };
  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  });
  useEffect(() => {
    if (!globalTrigger || !paneActive) return;
    return window.desktopBridge?.onMenuAction((action) => {
      if (action === "dictation-start") return void startRef.current(true);
      const end =
        action === "dictation-stop" ? "stop" : action === "dictation-cancel" ? "cancel" : null;
      if (!end) return;
      if (recording.current) recording.current[end]();
      else if (opening.current) pendingEnd.current = end;
    });
  }, [globalTrigger, paneActive]);
  return (
    <>
      <div className="relative flex items-center gap-1">
        <Button
          type="button"
          variant={state === "listening" ? "destructive" : "ghost"}
          size="icon"
          disabled={
            state === "starting" ||
            state === "writing" ||
            (state === "idle" && (disabled || !allowed))
          }
          aria-label={
            state === "listening"
              ? "Stop dictation"
              : state === "writing"
                ? "Writing dictation"
                : "Dictate a prompt"
          }
          title={state === "listening" ? `Stop dictation (${seconds}s)` : "Dictate a prompt"}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => (state === "listening" ? recording.current?.stop() : void start())}
        >
          {state === "listening" ? (
            <SquareIcon aria-hidden className="size-4" />
          ) : (
            <MicIcon aria-hidden className="size-4" />
          )}
        </Button>
        {state !== "idle" && (
          <span role="status" className="text-xs text-muted-foreground">
            {state === "listening"
              ? `${seconds}s`
              : state === "writing"
                ? "Writing..."
                : "Opening mic..."}
          </span>
        )}
        {discordTip && (
          <DiscordTip
            onOpen={() => {
              setDiscordTip(false);
              setDiscordSteps(true);
            }}
            onDismiss={() => setDiscordTip(false)}
          />
        )}
        {(error || retainedText) && (
          <div className="absolute bottom-full right-0 z-20 mb-2 w-72 rounded-lg border bg-popover p-3 text-sm shadow-lg">
            {error && <p role="alert">{error}</p>}
            {retainedText && (
              <>
                <p>Dictation is ready. Insert it when the composer is available.</p>
                <textarea
                  aria-label="Saved dictation"
                  readOnly
                  value={retainedText}
                  className="mt-2 w-full"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (onText(`${retainedText} `)) setRetainedText("");
                  }}
                >
                  Insert text
                </Button>
              </>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setError("");
                setRetainedText("");
              }}
            >
              Dismiss
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSetup(true)}>
              Voice setup
            </Button>
          </div>
        )}
      </div>
      <DiscordWalkthrough open={discordSteps} onOpenChange={setDiscordSteps} />
      <Dialog open={setup} onOpenChange={setSetup}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Set up voice</DialogTitle>
            <DialogDescription>Connect your Groq key to dictate in Leonidas.</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <VoiceSetup environmentId={environmentId} onReady={() => setSetup(false)} />
          </DialogPanel>
          {canClear && (
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  const result = await clear({ environmentId, input: {} });
                  if (result._tag === "Success") setSetup(false);
                  else setError("The key could not be removed. Try again.");
                }}
              >
                Remove saved key
              </Button>
            </DialogFooter>
          )}
        </DialogPopup>
      </Dialog>
    </>
  );
}
