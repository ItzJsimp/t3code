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
import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import * as NodeChildProcess from "node:child_process";
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

// shortcut: module-level handles to the single running hook; move into a service if a second consumer appears.
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
let applyPause: Effect.Effect<void> = Effect.void;
let latestConfig: { triggers: DictationTriggers; mode: DictationTriggerMode } | undefined;
let paused = false;
let acknowledged = false;
let startCount = 0;

/** How long the hook waits for a composer to take a start before it ends the dictation itself. */
const START_ACK_TIMEOUT = "3 seconds";
const EMPTY_CONFIG = "config ||";

const currentConfigLine = () =>
  paused || !latestConfig ? EMPTY_CONFIG : configLine(latestConfig.triggers);

/** A composer took the start action, so it will end the dictation (and call dictationEnded). */
export const acknowledgeDictationStart = Effect.sync(() => {
  acknowledged = true;
});

/** New triggers or mode from settings, applied to the running hook with no restart. */
export const reconfigureDictationHotkey = (
  triggers: DictationTriggers,
  mode: DictationTriggerMode,
) =>
  Effect.suspend(() => {
    latestConfig = { triggers, mode };
    return applyConfig(triggers, mode);
  });

/** The Settings recorder is capturing keys: no trigger may match, so a recorded combo starts nothing. */
export const setDictationHotkeyPaused = (next: boolean) =>
  Effect.suspend(() => {
    paused = next;
    return applyPause;
  });

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
  latestConfig = { triggers: options.triggers, mode: options.mode };
  yield* helper.send(currentConfigLine());
  sendToHelper = helper.send;
  let state: DictationTriggerState = idleDictationTrigger;
  let mode = options.mode;
  endActive = Effect.suspend(() => {
    if (state.kind === "idle") return Effect.void;
    state = idleDictationTrigger;
    return helper.send("mute up");
  });
  // A dictation the renderer still runs must be told to stop, or it keeps recording unmuted.
  const stopAndNotify = Effect.suspend(() => {
    if (state.kind === "idle") return Effect.void;
    state = idleDictationTrigger;
    return helper.send("mute up").pipe(Effect.andThen(options.onAction("stop")));
  });
  // A held trigger from the old set would never see its release, so end that dictation first.
  const resend = stopAndNotify.pipe(
    Effect.andThen(Effect.suspend(() => helper.send(currentConfigLine()))),
  );
  applyConfig = (_triggers, nextMode) => {
    mode = nextMode;
    return resend;
  };
  applyPause = resend;
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
      const send = helper
        .send(action === "start" ? "mute down" : "mute up")
        .pipe(Effect.andThen(options.onAction(action)));
      if (action !== "start") return send;
      acknowledged = false;
      const id = ++startCount;
      // Only a composer in the active pane answers a start. With none (another page, a split
      // pane, a window that only revealed), nothing would end this dictation and Discord
      // would stay muted until the next press.
      const watchdog = Effect.sleep(START_ACK_TIMEOUT).pipe(
        Effect.andThen(
          Effect.suspend(() =>
            id === startCount && !acknowledged && state.kind !== "idle" ? endActive : Effect.void,
          ),
        ),
        Effect.forkDetach,
        Effect.asVoid,
      );
      return send.pipe(Effect.andThen(watchdog));
    }),
    Effect.ensuring(
      Effect.sync(() => {
        endActive = Effect.void;
        sendToHelper = () => Effect.void;
        applyConfig = () => Effect.void;
        applyPause = Effect.void;
      }).pipe(Effect.andThen(helper.send("mute up"))),
    ),
  );
});

const MAX_FAST_FAILURES = 5;
const STABLE_RUN_MS = 30_000;
const RESTART_BASE_MS = 1000;

/**
 * Runs the hook and restarts it after an exit or crash, with a doubling delay. A run that lasted
 * long enough resets the count; repeated fast failures (no PowerShell, no Swift tools) stop it.
 */
export const superviseDictationHotkey = Effect.fn("DictationHotkey.supervise")(function* <E, R>(
  spawn: Effect.Effect<InputHookHelper, E, R>,
  options: {
    readonly triggers: DictationTriggers;
    readonly mode: DictationTriggerMode;
    readonly onAction: (action: DictationTriggerAction) => Effect.Effect<void>;
  },
) {
  let failures = 0;
  while (failures < MAX_FAST_FAILURES) {
    const [elapsed] = yield* Effect.timed(
      Effect.scoped(
        spawn.pipe(
          // A restart uses the settings saved since the last start, not the ones from launch.
          Effect.flatMap((helper) => runDictationHotkey(helper, { ...options, ...latestConfig })),
        ),
      ).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("dictation hotkey stopped", { cause: Cause.pretty(cause) }),
        ),
      ),
    );
    failures = Duration.toMillis(elapsed) > STABLE_RUN_MS ? 1 : failures + 1;
    if (failures >= MAX_FAST_FAILURES) break;
    yield* Effect.sleep(Duration.millis(RESTART_BASE_MS * 2 ** (failures - 1)));
  }
  yield* Effect.logError("dictation hotkey gave up after repeated failures");
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
  // `swift` without the Command Line Tools opens a system install prompt; ask first, quietly.
  const hasTools = yield* Effect.promise(
    () =>
      new Promise<boolean>((resolve) =>
        NodeChildProcess.execFile("xcode-select", ["-p"], (error) => resolve(!error)),
      ),
  );
  if (!hasTools)
    return yield* Effect.die(
      "Xcode Command Line Tools are missing; the macOS dictation hook needs them",
    );
  const file = NodePath.join(NodeOS.tmpdir(), "leonidas-dictation-hook.swift");
  yield* Effect.promise(() => NodeFSP.writeFile(file, MAC_INPUT_HOOK_SCRIPT));
  return yield* spawnInputHook("/usr/bin/swift", [file], environment);
});
