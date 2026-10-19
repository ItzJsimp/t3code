import {
  idleDictationTrigger,
  stepDictationTrigger,
  type DictationTriggerAction,
  type DictationTriggerEvent,
  type DictationTriggerMode,
  type DictationTriggers,
  type DictationTriggerState,
} from "@t3tools/shared/dictationTrigger";
import * as Effect from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { WINDOWS_INPUT_HOOK_SCRIPT } from "./windowsInputHookScript.ts";

/** Menu actions the renderer turns into composer dictation start, stop and cancel. */
export const DICTATION_MENU_ACTIONS: Record<DictationTriggerAction, string> = {
  start: "dictation-start",
  stop: "dictation-stop",
  cancel: "dictation-cancel",
};

/** Line protocol of the OS input hook helper (see windowsInputHookScript.ts). */
export interface InputHookHelper {
  readonly lines: Stream.Stream<string>;
  readonly send: (line: string) => Effect.Effect<void>;
}

export function parseHookLine(line: string): DictationTriggerEvent | undefined {
  if (line === "other") return { type: "other" };
  const [type, trigger] = line.split(" ");
  if (
    (type === "down" || type === "up") &&
    (trigger === "toggle" || trigger === "hold" || trigger === "mouse")
  ) {
    return { type, trigger };
  }
  return undefined;
}

/**
 * Feeds hook lines through the trigger state machine. Holds the hidden Discord key (F24)
 * down from start until stop or cancel, so Discord Push to Mute covers the whole dictation.
 */
export const runDictationHotkey = Effect.fn("DictationHotkey.run")(function* (
  helper: InputHookHelper,
  options: {
    readonly triggers: DictationTriggers;
    readonly mode: DictationTriggerMode;
    readonly onAction: (action: DictationTriggerAction) => Effect.Effect<void>;
  },
) {
  yield* helper.send(
    `config ${options.triggers.toggle}|${options.triggers.hold}|${options.triggers.mouse}`,
  );
  let state: DictationTriggerState = idleDictationTrigger;
  yield* helper.lines.pipe(
    Stream.runForEach((line) => {
      const event = parseHookLine(line.trim());
      if (!event) {
        return line.startsWith("error")
          ? Effect.logWarning(`dictation hook: ${line}`)
          : Effect.void;
      }
      const next = stepDictationTrigger(state, event, options.mode);
      state = next.state;
      const action = next.action;
      if (!action) return Effect.void;
      return helper
        .send(action === "start" ? "mute down" : "mute up")
        .pipe(Effect.andThen(options.onAction(action)));
    }),
    Effect.ensuring(helper.send("mute up")),
  );
});

/** Starts the hidden PowerShell hook helper. EOF on its stdin (our scope closing) ends it. */
export const spawnWindowsInputHook = Effect.fn("DictationHotkey.spawnWindowsInputHook")(function* (
  environment: Record<string, string | undefined>,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const input = yield* Queue.unbounded<string>();
  const windowsRoot = environment.SystemRoot ?? environment.WINDIR;
  const powershell = windowsRoot
    ? `${windowsRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    : "powershell.exe";
  const handle = yield* spawner.spawn(
    ChildProcess.make(
      powershell,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-Command",
        WINDOWS_INPUT_HOOK_SCRIPT,
      ],
      {
        env: environment,
        stdin: Stream.fromQueue(input).pipe(
          Stream.map((line) => `${line}\n`),
          Stream.encodeText,
        ),
      },
    ),
  );
  yield* handle.stderr.pipe(Stream.runDrain, Effect.ignore, Effect.forkScoped);
  // Runs before the spawner's kill: let the helper release F24 so Discord never stays muted.
  yield* Effect.addFinalizer(() =>
    Queue.offer(input, "quit").pipe(
      Effect.andThen(handle.exitCode.pipe(Effect.timeout("1 second"))),
      Effect.ignore,
    ),
  );
  const helper: InputHookHelper = {
    // A broken pipe just ends the stream; the run then releases F24 and stops.
    lines: handle.stdout.pipe(Stream.decodeText(), Stream.splitLines, Stream.ignore),
    send: (line) => Queue.offer(input, line).pipe(Effect.asVoid),
  };
  return helper;
});
