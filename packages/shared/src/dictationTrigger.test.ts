import { describe, expect, it } from "vitest";

import {
  DISCORD_MUTE_KEY,
  defaultDictationTriggers,
  findTriggerConflict,
  idleDictationTrigger,
  stepDictationTrigger,
  type DictationTriggerEvent,
  type DictationTriggerState,
} from "./dictationTrigger.ts";

function run(events: ReadonlyArray<DictationTriggerEvent>, mode: "toggle" | "hold" = "toggle") {
  let state: DictationTriggerState = idleDictationTrigger;
  const actions: string[] = [];
  for (const event of events) {
    const next = stepDictationTrigger(state, event, mode);
    state = next.state;
    if (next.action) actions.push(next.action);
  }
  return actions;
}

describe("stepDictationTrigger", () => {
  it("toggle trigger starts on the first press and stops on the second", () => {
    expect(
      run([
        { type: "down", trigger: "toggle" },
        { type: "up", trigger: "toggle" },
        { type: "down", trigger: "toggle" },
        { type: "up", trigger: "toggle" },
      ]),
    ).toEqual(["start", "stop"]);
  });

  it("hold trigger starts on press and stops on release", () => {
    expect(
      run([
        { type: "down", trigger: "hold" },
        { type: "up", trigger: "hold" },
      ]),
    ).toEqual(["start", "stop"]);
  });

  it("another key during a hold cancels it, so shortcuts keep working", () => {
    expect(
      run([{ type: "down", trigger: "hold" }, { type: "other" }, { type: "up", trigger: "hold" }]),
    ).toEqual(["start", "cancel"]);
  });

  it("hold then the toggle key (Ctrl+Win then Space) keeps recording as a toggle dictation", () => {
    expect(
      run([
        { type: "down", trigger: "hold" },
        { type: "down", trigger: "toggle" },
        { type: "up", trigger: "hold" },
        { type: "down", trigger: "toggle" },
      ]),
    ).toEqual(["start", "stop"]);
  });

  it("the mouse button follows the chosen mode", () => {
    const clicks: DictationTriggerEvent[] = [
      { type: "down", trigger: "mouse" },
      { type: "up", trigger: "mouse" },
    ];
    expect(run(clicks, "toggle")).toEqual(["start"]);
    expect(run(clicks, "hold")).toEqual(["start", "stop"]);
  });

  it("ignores stray releases and other keys while idle", () => {
    expect(run([{ type: "up", trigger: "hold" }, { type: "other" }])).toEqual([]);
  });
});

describe("defaultDictationTriggers", () => {
  it("copies the Wispr Flow keys on each OS and adds Mouse 4", () => {
    expect(defaultDictationTriggers("win32")).toEqual({
      toggle: "Ctrl+Win+Space",
      hold: "Ctrl+Win",
      mouse: "Mouse4",
    });
    expect(defaultDictationTriggers("darwin")).toEqual({
      toggle: "Fn+Space",
      hold: "Fn",
      mouse: "Mouse4",
    });
  });
});

describe("findTriggerConflict", () => {
  it("accepts the defaults", () => {
    expect(findTriggerConflict(defaultDictationTriggers("win32"))).toBeUndefined();
  });

  it("rejects two triggers on the same key", () => {
    expect(
      findTriggerConflict({ toggle: "Ctrl+Alt+Space", hold: "Alt+Ctrl+Space", mouse: "Mouse4" }),
    ).toBe("hold");
  });

  it("rejects the hidden Discord key", () => {
    expect(
      findTriggerConflict({ toggle: DISCORD_MUTE_KEY, hold: "Ctrl+Win", mouse: "Mouse4" }),
    ).toBe("toggle");
  });
});
