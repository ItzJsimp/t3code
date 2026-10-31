import { describe, expect, it } from "vite-plus/test";

import {
  comboFromMouseButton,
  recordKey,
  triggerConflictMessage,
  type KeyEventLike,
} from "./dictationTriggerRecorder.logic";

const ev = (over: Partial<KeyEventLike>): KeyEventLike => ({
  key: "",
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...over,
});

describe("recordKey", () => {
  it("records modifiers plus a key as soon as the key goes down", () => {
    const step = recordKey(
      { mods: ["Ctrl"] },
      "down",
      ev({ key: " ", ctrlKey: true, metaKey: true }),
    );
    expect(step.combo).toBe("Ctrl+Win+Space");
  });

  it("records letters, digits and function keys", () => {
    expect(
      recordKey({ mods: [] }, "down", ev({ key: "d", ctrlKey: true, altKey: true })).combo,
    ).toBe("Ctrl+Alt+D");
    expect(recordKey({ mods: [] }, "down", ev({ key: "F9" })).combo).toBe("F9");
  });

  it("refuses a bare letter, which would take over normal typing", () => {
    const step = recordKey({ mods: [] }, "down", ev({ key: "a" }));
    expect(step.combo).toBeUndefined();
    expect(step.error).toMatch(/Ctrl, Alt, Shift or Win/);
  });

  it("refuses F24, which Leonidas keeps for Discord", () => {
    expect(recordKey({ mods: [] }, "down", ev({ key: "F24" })).error).toBeDefined();
  });

  it("remembers modifiers while they are held and records them when they are all released", () => {
    let step = recordKey({ mods: [] }, "down", ev({ key: "Control", ctrlKey: true }));
    step = recordKey(step.state, "down", ev({ key: "Meta", ctrlKey: true, metaKey: true }));
    expect(step.combo).toBeUndefined();
    step = recordKey(step.state, "up", ev({ key: "Meta", ctrlKey: true }));
    expect(step.combo).toBeUndefined();
    step = recordKey(step.state, "up", ev({ key: "Control" }));
    expect(step.combo).toBe("Ctrl+Win");
  });

  it("refuses a single modifier alone, which would fire on every press of it", () => {
    let step = recordKey({ mods: [] }, "down", ev({ key: "Control", ctrlKey: true }));
    step = recordKey(step.state, "up", ev({ key: "Control" }));
    expect(step.combo).toBeUndefined();
    expect(step.error).toBeDefined();
  });
});

describe("comboFromMouseButton", () => {
  it("maps the side buttons and the wheel, and ignores left and right", () => {
    expect(comboFromMouseButton(3)).toBe("Mouse4");
    expect(comboFromMouseButton(4)).toBe("Mouse5");
    expect(comboFromMouseButton(1)).toBe("Middle");
    expect(comboFromMouseButton(0)).toBeNull();
    expect(comboFromMouseButton(2)).toBeNull();
  });
});

describe("triggerConflictMessage", () => {
  const current = { toggle: "Ctrl+Win+Space", hold: "Ctrl+Win", mouse: "Mouse4" };

  it("accepts a free combo", () => {
    expect(triggerConflictMessage(current, "toggle", "Ctrl+Alt+D")).toBeNull();
  });

  it("rejects a combo another trigger already uses, in any order", () => {
    expect(triggerConflictMessage(current, "toggle", "Win+Ctrl")).toMatch(/already/i);
  });

  it("rejects the Discord key", () => {
    expect(triggerConflictMessage(current, "toggle", "F24")).toMatch(/Discord/);
  });
});
