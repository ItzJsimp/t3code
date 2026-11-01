import { defaultDictationTriggers } from "@t3tools/shared/dictationTrigger";
import { Effect, Fiber, Queue, Stream } from "effect";
import { describe, expect, it } from "@effect/vitest";
import * as TestClock from "effect/testing/TestClock";

import {
  acknowledgeDictationStart,
  endActiveDictation,
  parseHookLine,
  reconfigureDictationHotkey,
  runDictationHotkey,
  setDictationHotkeyPaused,
  superviseDictationHotkey,
} from "./DictationHotkey.ts";

const drive = Effect.fn(function* (lines: string[], mode: "toggle" | "hold" = "toggle") {
  const sent: string[] = [];
  const actions: string[] = [];
  yield* runDictationHotkey(
    {
      lines: Stream.fromIterable(lines),
      send: (line) => Effect.sync(() => void sent.push(line)),
    },
    {
      triggers: defaultDictationTriggers("win32"),
      mode,
      onAction: (action) => Effect.sync(() => void actions.push(action)),
    },
  );
  return { sent, actions };
});

describe("parseHookLine", () => {
  it("reads trigger events and ignores the rest", () => {
    expect(parseHookLine("down toggle")).toEqual({ type: "down", trigger: "toggle" });
    expect(parseHookLine("up mouse")).toEqual({ type: "up", trigger: "mouse" });
    expect(parseHookLine("other")).toEqual({ type: "other" });
    expect(parseHookLine("ready")).toBeUndefined();
    expect(parseHookLine("down space")).toBeUndefined();
  });
});

describe("runDictationHotkey", () => {
  it.effect("sends the trigger config first", () =>
    Effect.gen(function* () {
      const { sent } = yield* drive(["ready"]);
      expect(sent[0]).toBe("config Ctrl+Win+Space|Ctrl+Win|Mouse4");
    }),
  );

  it.effect("holds the Discord key from start to stop", () =>
    Effect.gen(function* () {
      const { sent, actions } = yield* drive(["ready", "down mouse", "up mouse", "down mouse"]);
      expect(actions).toEqual(["start", "stop"]);
      expect(sent.slice(1, 3)).toEqual(["mute down", "mute up"]);
    }),
  );

  it.effect("releases the Discord key on cancel", () =>
    Effect.gen(function* () {
      const { sent, actions } = yield* drive(["down hold", "other", "up hold"]);
      expect(actions).toEqual(["start", "cancel"]);
      expect(sent.slice(1, 3)).toEqual(["mute down", "mute up"]);
    }),
  );

  it.effect("releases the Discord key when the hook ends mid-dictation", () =>
    Effect.gen(function* () {
      const { sent } = yield* drive(["down toggle"]);
      expect(sent.at(-1)).toBe("mute up");
    }),
  );

  it.effect("a renderer end releases the Discord key and resets the trigger", () =>
    Effect.gen(function* () {
      const lines = yield* Queue.unbounded<string>();
      const sent: string[] = [];
      const actions: string[] = [];
      const run = yield* runDictationHotkey(
        {
          lines: Stream.fromQueue(lines),
          send: (line) => Effect.sync(() => void sent.push(line)),
        },
        {
          triggers: defaultDictationTriggers("win32"),
          mode: "toggle",
          onAction: (action) => Effect.sync(() => void actions.push(action)),
        },
      ).pipe(Effect.forkChild);
      yield* Queue.offer(lines, "down toggle");
      yield* Effect.yieldNow;
      yield* endActiveDictation;
      // The next press starts a new dictation instead of stopping the failed one.
      yield* Queue.offer(lines, "down toggle");
      yield* Effect.yieldNow;
      yield* Fiber.interrupt(run);
      expect(actions).toEqual(["start", "start"]);
      expect(sent.slice(1, 4)).toEqual(["mute down", "mute up", "mute down"]);
    }),
  );
});

describe("reconfigureDictationHotkey", () => {
  it.effect("sends the new triggers and applies the new mode without a restart", () =>
    Effect.gen(function* () {
      const lines = yield* Queue.unbounded<string>();
      const sent: string[] = [];
      const actions: string[] = [];
      const run = yield* runDictationHotkey(
        { lines: Stream.fromQueue(lines), send: (line) => Effect.sync(() => void sent.push(line)) },
        {
          triggers: defaultDictationTriggers("win32"),
          mode: "toggle",
          onAction: (action) => Effect.sync(() => void actions.push(action)),
        },
      ).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* reconfigureDictationHotkey(
        { toggle: "Ctrl+Alt+D", hold: "Ctrl+Win", mouse: "Mouse5" },
        "hold",
      );
      expect(sent.at(-1)).toBe("config Ctrl+Alt+D|Ctrl+Win|Mouse5");
      // In hold mode the mouse button dictates only while it is down.
      yield* Queue.offer(lines, "down mouse");
      yield* Queue.offer(lines, "up mouse");
      yield* Effect.yieldNow;
      yield* Fiber.interrupt(run);
      expect(actions).toEqual(["start", "stop"]);
    }),
  );

  it.effect("does nothing when the hook is not running", () =>
    Effect.gen(function* () {
      yield* reconfigureDictationHotkey(defaultDictationTriggers("win32"), "toggle");
    }),
  );
});

/** A hook that stays open: lines are fed by the test. */
const openHook = Effect.fn(function* () {
  const lines = yield* Queue.unbounded<string>();
  const sent: string[] = [];
  const actions: string[] = [];
  const run = yield* runDictationHotkey(
    { lines: Stream.fromQueue(lines), send: (line) => Effect.sync(() => void sent.push(line)) },
    {
      triggers: defaultDictationTriggers("win32"),
      mode: "toggle",
      onAction: (action) => Effect.sync(() => void actions.push(action)),
    },
  ).pipe(Effect.forkChild);
  yield* Effect.yieldNow;
  return { lines, sent, actions, run };
});

describe("start acknowledgement", () => {
  it.effect("releases the Discord key when no composer takes the start", () =>
    Effect.gen(function* () {
      const { lines, sent, run } = yield* openHook();
      yield* Queue.offer(lines, "down toggle");
      yield* Effect.yieldNow;
      expect(sent.at(-1)).toBe("mute down");
      yield* TestClock.adjust("3 seconds");
      expect(sent.at(-1)).toBe("mute up");
      // The reset trigger means the next press starts a fresh dictation.
      yield* Queue.offer(lines, "down toggle");
      yield* Effect.yieldNow;
      expect(sent.at(-1)).toBe("mute down");
      yield* Fiber.interrupt(run);
    }),
  );

  it.effect("keeps the Discord key down when a composer acknowledged the start", () =>
    Effect.gen(function* () {
      const { lines, sent, run } = yield* openHook();
      yield* Queue.offer(lines, "down toggle");
      yield* Effect.yieldNow;
      yield* acknowledgeDictationStart;
      yield* TestClock.adjust("5 seconds");
      expect(sent.filter((line) => line === "mute up")).toEqual([]);
      yield* Fiber.interrupt(run);
    }),
  );

  it.effect("does not end a newer dictation because an older start went unanswered", () =>
    Effect.gen(function* () {
      const { lines, sent, run } = yield* openHook();
      yield* Queue.offer(lines, "down toggle");
      yield* Effect.yieldNow;
      yield* TestClock.adjust("2 seconds");
      yield* Queue.offer(lines, "down toggle"); // stop
      yield* Queue.offer(lines, "down toggle"); // start again
      yield* Effect.yieldNow;
      yield* acknowledgeDictationStart;
      yield* TestClock.adjust("2 seconds"); // the first watchdog fires here
      expect(sent.at(-1)).toBe("mute down");
      yield* Fiber.interrupt(run);
    }),
  );
});

describe("changing triggers while dictating", () => {
  it.effect("stops the dictation the renderer is running, not just the mute key", () =>
    Effect.gen(function* () {
      const { lines, sent, actions, run } = yield* openHook();
      yield* Queue.offer(lines, "down toggle");
      yield* Effect.yieldNow;
      yield* reconfigureDictationHotkey(
        { toggle: "Ctrl+Alt+D", hold: "Ctrl+Win", mouse: "Mouse5" },
        "toggle",
      );
      expect(actions).toEqual(["start", "stop"]);
      expect(sent.slice(-2)).toEqual(["mute up", "config Ctrl+Alt+D|Ctrl+Win|Mouse5"]);
      yield* Fiber.interrupt(run);
    }),
  );
});

describe("pausing for the Settings recorder", () => {
  it.effect("sends an empty config while paused and the saved one after", () =>
    Effect.gen(function* () {
      const { sent, run } = yield* openHook();
      yield* setDictationHotkeyPaused(true);
      expect(sent.at(-1)).toBe("config ||");
      yield* setDictationHotkeyPaused(false);
      expect(sent.at(-1)).toBe("config Ctrl+Win+Space|Ctrl+Win|Mouse4");
      yield* Fiber.interrupt(run);
    }),
  );
});

describe("superviseDictationHotkey", () => {
  const options = {
    triggers: defaultDictationTriggers("win32"),
    mode: "toggle" as const,
    onAction: () => Effect.void,
  };

  it.effect(
    "restarts the helper with a doubling delay, then gives up after repeated fast exits",
    () =>
      Effect.gen(function* () {
        let spawns = 0;
        const spawn = Effect.sync(() => {
          spawns++;
          return { lines: Stream.empty, send: () => Effect.void };
        });
        const run = yield* superviseDictationHotkey(spawn, options).pipe(Effect.forkChild);
        yield* Effect.yieldNow;
        expect(spawns).toBe(1);
        yield* TestClock.adjust("1 second");
        expect(spawns).toBe(2);
        yield* TestClock.adjust("2 seconds");
        expect(spawns).toBe(3);
        yield* TestClock.adjust("1 minute");
        expect(spawns).toBe(5);
        yield* Fiber.join(run);
      }),
  );

  it.effect("keeps restarting a helper that ran for a long time", () =>
    Effect.gen(function* () {
      let spawns = 0;
      const spawn = Effect.sync(() => {
        spawns++;
        // Lives 60 s of test time, then exits.
        return {
          lines: Stream.fromEffect(Effect.sleep("60 seconds")).pipe(Stream.drain),
          send: () => Effect.void,
        };
      });
      const run = yield* superviseDictationHotkey(spawn, options).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("10 minutes");
      expect(spawns).toBeGreaterThan(5);
      yield* Fiber.interrupt(run);
    }),
  );
});
