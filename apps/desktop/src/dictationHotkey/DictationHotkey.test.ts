import { defaultDictationTriggers } from "@t3tools/shared/dictationTrigger";
import { Effect, Stream } from "effect";
import { describe, expect, it } from "@effect/vitest";

import { parseHookLine, runDictationHotkey } from "./DictationHotkey.ts";

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
});
