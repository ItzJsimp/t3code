// @effect-diagnostics nodeBuiltinImport:off - one short script file write for the macOS helper.
import type { ClientSettings } from "@t3tools/contracts";
import {
  idleDictationTrigger,
  resolveDictationTriggers,
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

import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { MAC_INPUT_HOOK_SCRIPT } from "./macInputHookScript.ts";
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

// shortcut: one module-level handle to the single running hook; move into a service if a second consumer appears.
let endActive: Effect.Effect<void> = Effect.void;

let sendToHelper: (line: string) => Effect.Effect<void> = () => Effect.void;

/** Taps the hidden Discord key (F24) once, so Discord's keybind recorder can capture it. */
export const tapHiddenKey = Effect.suspend(() =>
  sendToHelper("mute down").pipe(
    Effect.andThen(Effect.sleep(150)),
    Effect.andThen(sendToHelper("mute up")),
  ),
);

/** The renderer finished (or failed) a dictation: reset the trigger and release F24 now. */
export const endActiveDictation = Effect.suspend(() => endActive);

let applyConfig: (
  triggers: DictationTriggers,
  mode: DictationTriggerMode,
) => Effect.Effect<void> = () => Effect.void;

/** New triggers or mode from settings, applied to the running hook with no restart. */
export const reconfigureDictationHotkey = (
  triggers: DictationTriggers,
  mode: DictationTriggerMode,
) => Effect.suspend(() => applyConfig(triggers, mode));

/** The triggers and mode to run for the saved client settings (blank values mean the defaults). */
export const dictationConfigFromSettings = (
  platform: string,
  settings: Pick<
    ClientSettings,
    "dictationToggleKey" | "dictationHoldKey" | "dictationMouseKey" | "dictationMode"
  >,
) => ({
  triggers: resolveDictationTriggers(platform, {
    toggle: settings.dictationToggleKey,
    hold: settings.dictationHoldKey,
    mouse: settings.dictationMouseKey,
  }),
  mode: settings.dictationMode,
});

export const sameDictationConfig = (
  a: ReturnType<typeof dictationConfigFromSettings>,
  b: ReturnType<typeof dictationConfigFromSettings>,
) =>
  a.mode === b.mode &&
  a.triggers.toggle === b.triggers.toggle &&
  a.triggers.hold === b.triggers.hold &&
  a.triggers.mouse === b.triggers.mouse;

const configLine = (triggers: DictationTriggers) =>
  `config ${triggers.toggle}|${triggers.hold}|${triggers.mouse}`;

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
  yield* helper.send(configLine(options.triggers));
  sendToHelper = helper.send;
  let state: DictationTriggerState = idleDictationTrigger;
  let mode = options.mode;
  endActive = Effect.suspend(() => {
    if (state.kind === "idle") return Effect.void;
    state = idleDictationTrigger;
    return helper.send("mute up");
  });
  applyConfig = (triggers, nextMode) => {
    mode = nextMode;
    // A held trigger from the old set would never see its release, so end that dictation first.
    return endActive.pipe(Effect.andThen(helper.send(configLine(triggers))));
  };
  yield* helper.lines.pipe(
    Stream.runForEach((line) => {
      const event = parseHookLine(line.trim());
      if (!event) {
        return line.startsWith("error")
          ? Effect.logWarning(`dictation hook: ${line}`)
          : Effect.void;
      }
      const next = stepDictationTrigger(state, event, mode);
      state = next.state;
      const action = next.action;
      if (!action) return Effect.void;
      return helper
        .send(action === "start" ? "mute down" : "mute up")
        .pipe(Effect.andThen(options.onAction(action)));
    }),
    Effect.ensuring(
      Effect.sync(() => {
        endActive = Effect.void;
        sendToHelper = () => Effect.void;
        applyConfig = () => Effect.void;
      }).pipe(Effect.andThen(helper.send("mute up"))),
    ),
  );
});

/**
 * Starts a hook helper process. EOF on its stdin (our scope closing) ends it, and the finalizer
 * asks it to quit first so it can release the hidden Discord key.
 */
const spawnInputHook = Effect.fn("DictationHotkey.spawnInputHook")(function* (
  command: string,
  args: ReadonlyArray<string>,
  environment: Record<string, string | undefined>,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const input = yield* Queue.unbounded<string>();
  const handle = yield* spawner.spawn(
    ChildProcess.make(command, [...args], {
      env: environment,
      stdin: Stream.fromQueue(input).pipe(
        Stream.map((line) => `${line}\n`),
        Stream.encodeText,
      ),
    }),
  );
  yield* handle.stderr.pipe(Stream.runDrain, Effect.ignore, Effect.forkScoped);
  // Runs before the spawner's kill: let the helper release the hidden key so Discord never stays muted.
  yield* Effect.addFinalizer(() =>
    Queue.offer(input, "quit").pipe(
      Effect.andThen(handle.exitCode.pipe(Effect.timeout("1 second"))),
      Effect.ignore,
    ),
  );
  const helper: InputHookHelper = {
    // A broken pipe just ends the stream; the run then releases the key and stops.
    lines: handle.stdout.pipe(Stream.decodeText(), Stream.splitLines, Stream.ignore),
    send: (line) => Queue.offer(input, line).pipe(Effect.asVoid),
  };
  return helper;
});

/** Starts the hidden PowerShell hook helper. */
export const spawnWindowsInputHook = Effect.fn("DictationHotkey.spawnWindowsInputHook")(function* (
  environment: Record<string, string | undefined>,
) {
  const windowsRoot = environment.SystemRoot ?? environment.WINDIR;
  const powershell = windowsRoot
    ? `${windowsRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    : "powershell.exe";
  return yield* spawnInputHook(
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
    environment,
  );
});

/**
 * Starts the Swift hook helper through the system `swift` interpreter.
 * shortcut: needs the Xcode Command Line Tools and takes a second or two to start; ship a
 * prebuilt universal binary in the app bundle before this reaches every Mac user.
 */
export const spawnMacInputHook = Effect.fn("DictationHotkey.spawnMacInputHook")(function* (
  environment: Record<string, string | undefined>,
) {
  const file = NodePath.join(NodeOS.tmpdir(), "leonidas-dictation-hook.swift");
  yield* Effect.promise(() => NodeFSP.writeFile(file, MAC_INPUT_HOOK_SCRIPT));
  return yield* spawnInputHook("/usr/bin/swift", [file], environment);
});
