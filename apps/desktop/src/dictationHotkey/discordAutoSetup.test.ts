// @effect-diagnostics nodeBuiltinImport:off - fixtures are real files in a temp directory.
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "@effect/vitest";

import {
  autoSetupDiscordBind,
  crc32c,
  encodeBatch,
  frameRecord,
  readLog,
  type AutoSetupDeps,
} from "./discordAutoSetup.ts";
import { checkHiddenBind } from "./discordBind.ts";

const KEY = Buffer.from("_https://discord.com\u0000\u0001keybinds", "latin1");
const PRE =
  '{"_state":{"79":{"id":"79","enabled":true,"action":"TOGGLE_MUTE","shortcut":[[1,4,"0:0"]],"managed":false,"params":{}}},"_version":5}';
const value = (text: string) => Buffer.concat([Buffer.of(1), Buffer.from(text, "latin1")]);
const text = (buf: Buffer) => buf.toString("latin1");

/** A log built the way LevelDB writes one: records appended with 1 put each, sequence rising. */
function logOf(...texts: string[]): Buffer {
  let file = Buffer.alloc(0);
  texts.forEach((t, i) => {
    file = Buffer.concat([
      file,
      frameRecord(encodeBatch(BigInt(100 + i), KEY, value(t)), file.length),
    ]);
  });
  return file;
}

let dir: string;
let deps: AutoSetupDeps;
beforeEach(async () => {
  const root = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "autosetup-test-"));
  dir = NodePath.join(root, "leveldb");
  await NodeFSP.mkdir(dir);
  await NodeFSP.writeFile(NodePath.join(dir, "LOCK"), "");
  deps = {
    dir,
    isDiscordRunning: async () => false,
    now: () => "2026-10-31T12:00:00.000Z",
    appendFile: (path, data) => NodeFSP.appendFile(path, data),
  };
});
afterEach(() => NodeFSP.rm(NodePath.dirname(dir), { recursive: true, force: true }));
const logPath = () => NodePath.join(dir, "7.log");
const write = (buf: Buffer) => NodeFSP.writeFile(logPath(), buf);

describe("log format", () => {
  it("matches the standard CRC32C check value", () => {
    expect(crc32c(Buffer.from("123456789"))).toBe(0xe3069283);
  });

  it("writes the masked CRC a real Discord log uses", () => {
    // 0x5857b90b: masked CRC32C of type 1 + "hello", from the reference implementation that
    // validated every record of a real Discord log.
    const record = frameRecord(Buffer.from("hello"), 0);
    expect(record.readUInt32LE(0)).toBe(0x5857b90b);
    expect(record.readUInt16LE(4)).toBe(5);
    expect(record[6]).toBe(1);
  });

  it("round-trips records across block boundaries, padding and fragments", () => {
    const big = "x".repeat(70_000);
    const file = logOf(PRE, big, PRE, big, PRE);
    const log = readLog(file)!;
    expect(log.entries).toHaveLength(5);
    expect(log.nextSequence).toBe(105n);
    expect(text(log.entries[1]!.value).length).toBe(70_001);
  });

  it("pads a block that has fewer than 7 bytes left", () => {
    const fill = logOf("a".repeat(32710));
    expect(fill.length).toBe(32768 - 3); // precondition: 3 bytes left in the block
    const record = frameRecord(Buffer.from("z"), fill.length);
    expect([...record.subarray(0, 3)]).toEqual([0, 0, 0]);
    expect(record.length).toBe(3 + 7 + 1);
    const file = Buffer.concat([
      fill,
      frameRecord(encodeBatch(500n, KEY, value(PRE)), fill.length),
    ]);
    expect(readLog(file)!.entries).toHaveLength(2);
  });

  it("rejects a flipped byte and a torn tail", () => {
    const file = logOf(PRE, PRE);
    const flipped = Buffer.from(file);
    flipped[20] = flipped[20]! ^ 0xff;
    expect(readLog(flipped)).toBeUndefined();
    expect(readLog(file.subarray(0, file.length - 3))).toBeUndefined();
  });
});

describe("autoSetupDiscordBind", () => {
  it("appends the bind, keeps the old bytes, backs up, and Discord's own check sees it", async () => {
    const original = logOf(PRE);
    await write(original);
    const result = await autoSetupDiscordBind(deps);
    expect(result.status).toBe("done");
    const after = await NodeFSP.readFile(logPath());
    expect(after.subarray(0, original.length).equals(original)).toBe(true);
    const log = readLog(after)!;
    expect(log.nextSequence).toBe(102n); // continued after the old record
    expect(checkHiddenBind([text(after)])).toBe("done");
    const newest = log.entries.at(-1)!;
    expect(newest.key.equals(KEY)).toBe(true);
    expect(JSON.parse(text(newest.value).slice(1))._state["80"]).toEqual({
      id: "80",
      enabled: true,
      action: "PUSH_TO_MUTE",
      shortcut: [[0, 135, "0:0"]],
      managed: false,
      params: {},
    });
    const backup = (result as { backup: string }).backup;
    expect((await NodeFSP.readFile(NodePath.join(backup, "7.log"))).equals(original)).toBe(true);
  });

  it("refuses while Discord runs and writes nothing", async () => {
    const original = logOf(PRE);
    await write(original);
    const result = await autoSetupDiscordBind({ ...deps, isDiscordRunning: async () => true });
    expect(result).toEqual({ status: "refused", reason: "discord-running" });
    expect((await NodeFSP.readFile(logPath())).equals(original)).toBe(true);
  });

  it("changes nothing when the bind already exists", async () => {
    const bound = PRE.replace(
      "}}},",
      '}},"128":{"id":"128","enabled":true,"action":"PUSH_TO_MUTE","shortcut":[[0,135,"0:0"]],"managed":false,"params":{}}},',
    );
    const original = logOf(bound);
    await write(original);
    expect(await autoSetupDiscordBind(deps)).toEqual({ status: "already" });
    expect((await NodeFSP.readFile(logPath())).equals(original)).toBe(true);
  });

  it.each([
    [
      "a corrupt record",
      () => {
        const b = Buffer.from(logOf(PRE));
        b[30] = b[30]! ^ 1;
        return b;
      },
    ],
    [
      "a log with no keybinds record",
      () => frameRecord(encodeBatch(1n, Buffer.from("other"), value("{}")), 0),
    ],
    ["an unknown keybinds version", () => logOf(PRE.replace('"_version":5', '"_version":6'))],
    ["a text that does not round-trip", () => logOf(PRE.replace('"_state":', '"_state": '))],
  ])("falls back without writing on %s", async (_name, make) => {
    const original = make();
    await write(original);
    expect(await autoSetupDiscordBind(deps)).toEqual({
      status: "fallback",
      reason: "unknown-format",
    });
    expect((await NodeFSP.readFile(logPath())).equals(original)).toBe(true);
  });

  it("returns failed, and writes nothing, when the backup cannot be made", async () => {
    const original = logOf(PRE);
    await write(original);
    // A file where the backup folder must go makes mkdir fail.
    await NodeFSP.writeFile(
      NodePath.join(NodePath.dirname(dir), "leonidas-discord-backup-2026-10-31T12-00-00-000Z"),
      "in the way",
    );
    expect(await autoSetupDiscordBind(deps)).toEqual({ status: "failed", restored: true });
    expect((await NodeFSP.readFile(logPath())).equals(original)).toBe(true);
  });

  it("restores the backup when the write fails part way", async () => {
    const original = logOf(PRE);
    await write(original);
    const result = await autoSetupDiscordBind({
      ...deps,
      appendFile: async (path) => {
        await NodeFSP.appendFile(path, Buffer.from("garbage"));
        throw new Error("disk full");
      },
    });
    expect(result).toEqual({ status: "failed", restored: true });
    expect((await NodeFSP.readFile(logPath())).equals(original)).toBe(true);
  });

  it("restores the backup when the written log does not verify", async () => {
    const original = logOf(PRE);
    await write(original);
    const result = await autoSetupDiscordBind({
      ...deps,
      appendFile: (path) => NodeFSP.appendFile(path, Buffer.from("not a record")),
    });
    expect(result).toEqual({ status: "failed", restored: true });
    expect((await NodeFSP.readFile(logPath())).equals(original)).toBe(true);
  });
});
