// @effect-diagnostics nodeBuiltinImport:off - the reader copies real files, so the test uses a real temp folder.
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { describe, expect, it } from "@effect/vitest";

import { checkHiddenBind, storeTexts } from "./discordBind.ts";

// Shape copied from a real Discord Local Storage "keybinds" record (Discord 1.0.9266, 2026-10-31),
// cut to the bindings that matter. F24 is key code 135.
const record = (extra: string) =>
  `.._https://discord.com..keybinds...{"_state":{"73":{"id":"73","enabled":true,"action":"SAVE_SCREENSHOT","shortcut":[[0,123,1]],"managed":true,"params":{}},"79":{"id":"79","enabled":true,"action":"TOGGLE_MUTE","shortcut":[[1,4,"0:0"]],"managed":false,"params":{}}${extra}},"_version":5}..META:https://discord.com`;

const BOUND = `,"128":{"id":"128","enabled":true,"action":"PUSH_TO_MUTE","shortcut":[[0,135,"0:0"]],"managed":false,"params":{}}`;
const OTHER_KEY = BOUND.replace("135", "134");
const DISABLED = BOUND.replace('"enabled":true', '"enabled":false');

describe("checkHiddenBind", () => {
  it("is done when Push to Mute is bound to F24 alone", () => {
    expect(checkHiddenBind([record(BOUND)])).toBe("done");
  });

  it("is missing when no bind uses F24, another key does, or the bind is off", () => {
    expect(checkHiddenBind([record("")])).toBe("missing");
    expect(checkHiddenBind([record(OTHER_KEY)])).toBe("missing");
    expect(checkHiddenBind([record(DISABLED)])).toBe("missing");
  });

  it("uses the newest record in a file, so a removed bind is not found", () => {
    expect(checkHiddenBind([record(BOUND) + record("")])).toBe("missing");
    expect(checkHiddenBind([record("") + record(BOUND)])).toBe("done");
  });

  it("skips a record cut off by a write in progress and uses the one before it", () => {
    const cut = record(BOUND).slice(0, -80);
    expect(checkHiddenBind([record(BOUND) + cut])).toBe("done");
  });

  it("uses the first file that holds a record, and is unknown when none does", () => {
    expect(checkHiddenBind(["no keybinds here", record(BOUND)])).toBe("done");
    expect(checkHiddenBind(["no keybinds here"])).toBe("unknown");
    expect(checkHiddenBind([])).toBe("unknown");
  });
});

describe("storeTexts", () => {
  it("reads logs before tables, newest number first, from a copy, and skips a locked file", async () => {
    const dir = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "discord-ldb-test-"));
    try {
      for (const [name, text] of [
        ["000010.ldb", "table10"],
        ["000012.ldb", "table12"],
        ["000011.log", "log11"],
        ["LOCK", "x"],
        ["000013.ldb", "locked"],
      ] as const) {
        await NodeFSP.writeFile(NodePath.join(dir, name), text);
      }
      const texts = await Array.fromAsync(
        storeTexts(dir, {
          copyFile: async (from, to) => {
            if (from.endsWith("000013.ldb")) throw new Error("EBUSY");
            await NodeFSP.copyFile(from, to);
          },
        }),
      );
      expect(texts).toEqual(["log11", "table12", "table10"]);
    } finally {
      await NodeFSP.rm(dir, { recursive: true, force: true });
    }
  });

  it("returns nothing when the folder does not exist", async () => {
    expect(
      await Array.fromAsync(storeTexts(NodePath.join(NodeOS.tmpdir(), "no-such-discord-folder"))),
    ).toEqual([]);
  });
});
