// @effect-diagnostics nodeBuiltinImport:off - plain async file work on the Discord store: back up, append, verify.
import * as DateTime from "effect/DateTime";
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";

import { checkHiddenBind, discordStoreDir, HIDDEN_KEY_CODE } from "./discordBind.ts";
import { detectRunningApps, listProcessNames } from "./runningApps.ts";

/**
 * Adds the hidden Push to Mute bind to Discord's Local Storage while Discord is closed.
 * The store is a LevelDB: a new write is one more record appended to the active `.log` file
 * (32 KiB blocks, CRC32C-masked records, a write batch with a sequence number per record).
 * Anything this code does not recognise falls back to the walkthrough and writes nothing.
 * Format confirmed against a real Discord 1.0.9266 log (every record's CRC matched).
 */

const BLOCK = 32768;
const HEADER = 7;
const KEYBINDS_SUFFIX = Buffer.from("\u0000\u0001keybinds", "latin1");
const LATIN1_VALUE_MARKER = 0x01; // Chromium Local Storage: 0x01 = Latin-1 text, 0x00 = UTF-16
const KNOWN_KEYBINDS_VERSION = 5;

export type AutoSetupResult =
  | { readonly status: "done"; readonly backup: string }
  | { readonly status: "already" }
  | { readonly status: "refused"; readonly reason: "discord-running" | "store-locked" }
  | { readonly status: "fallback"; readonly reason: "unknown-format" }
  | { readonly status: "failed"; readonly restored: boolean };

export interface AutoSetupDeps {
  readonly dir: string;
  readonly isDiscordRunning: () => Promise<boolean>;
  /** The current time as an ISO string; named into the backup folder. */
  readonly now: () => string;
  readonly appendFile: (path: string, data: Buffer) => Promise<void>;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0x82f63b78 : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32c(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** LevelDB stores the CRC32C of type byte plus data, rotated and offset so a CRC of CRCs stays sound. */
function maskedCrc(type: number, body: Uint8Array): number {
  const crc = crc32c(Buffer.concat([Buffer.of(type), body]));
  return (((crc >>> 15) | (crc << 17)) + 0xa282ead8) >>> 0;
}

function readVarint(buf: Buffer, at: number): { value: number; next: number } | undefined {
  let value = 0;
  for (let shift = 0, i = at; i < buf.length && shift < 35; shift += 7, i++) {
    const byte = buf[i]!;
    value += (byte & 0x7f) * 2 ** shift;
    if (!(byte & 0x80)) return { value, next: i + 1 };
  }
  return undefined;
}

function varint(value: number): Buffer {
  const bytes: number[] = [];
  let rest = value;
  while (rest >= 0x80) {
    bytes.push((rest % 0x80) | 0x80);
    rest = Math.floor(rest / 0x80);
  }
  bytes.push(rest);
  return Buffer.from(bytes);
}

interface Entry {
  readonly put: boolean;
  readonly key: Buffer;
  readonly value: Buffer;
}

/** The puts and deletes of one write batch, or undefined if the batch is malformed. */
function parseBatch(batch: Buffer): ReadonlyArray<Entry> | undefined {
  if (batch.length < 12) return undefined;
  const count = batch.readUInt32LE(8);
  const entries: Entry[] = [];
  let at = 12;
  for (let n = 0; n < count; n++) {
    const tag = batch[at++];
    if (tag !== 0 && tag !== 1) return undefined;
    const keyLength = readVarint(batch, at);
    if (!keyLength) return undefined;
    const key = batch.subarray(keyLength.next, keyLength.next + keyLength.value);
    at = keyLength.next + keyLength.value;
    let value: Buffer = Buffer.alloc(0);
    if (tag === 1) {
      const valueLength = readVarint(batch, at);
      if (!valueLength) return undefined;
      value = batch.subarray(valueLength.next, valueLength.next + valueLength.value);
      at = valueLength.next + valueLength.value;
    }
    if (at > batch.length) return undefined;
    entries.push({ put: tag === 1, key, value });
  }
  return at === batch.length ? entries : undefined;
}

export interface LogContents {
  readonly entries: ReadonlyArray<Entry>;
  readonly nextSequence: bigint;
}

/** Every record of a LevelDB log, or undefined if any CRC or structure check fails. */
export function readLog(data: Buffer): LogContents | undefined {
  const entries: Entry[] = [];
  let nextSequence = 0n;
  let pending: Buffer[] | undefined;
  const takeBatch = (batch: Buffer) => {
    const parsed = parseBatch(batch);
    if (!parsed) return false;
    entries.push(...parsed);
    const end = batch.readBigUInt64LE(0) + BigInt(batch.readUInt32LE(8));
    if (end > nextSequence) nextSequence = end;
    return true;
  };
  let pos = 0;
  while (pos < data.length) {
    const left = BLOCK - (pos % BLOCK);
    if (left < HEADER) {
      pos += left; // block trailer padding
      continue;
    }
    if (pos + HEADER > data.length) return undefined;
    const crc = data.readUInt32LE(pos);
    const length = data.readUInt16LE(pos + 4);
    const type = data[pos + 6]!;
    if (type === 0 && length === 0) {
      pos += left; // zero padding
      continue;
    }
    if (length > left - HEADER || pos + HEADER + length > data.length) return undefined;
    const body = data.subarray(pos + HEADER, pos + HEADER + length);
    if (maskedCrc(type, body) !== crc) return undefined;
    if (type === 1 && !pending) {
      if (!takeBatch(body)) return undefined;
    } else if (type === 2 && !pending) pending = [body];
    else if (type === 3 && pending) pending.push(body);
    else if (type === 4 && pending) {
      if (!takeBatch(Buffer.concat([...pending, body]))) return undefined;
      pending = undefined;
    } else return undefined;
    pos += HEADER + length;
  }
  return pending ? undefined : { entries, nextSequence };
}

/** One write batch with a single put. */
export function encodeBatch(sequence: bigint, key: Buffer, value: Buffer): Buffer {
  const head = Buffer.alloc(12);
  head.writeBigUInt64LE(sequence, 0);
  head.writeUInt32LE(1, 8);
  return Buffer.concat([head, Buffer.of(1), varint(key.length), key, varint(value.length), value]);
}

/** The log bytes that append `batch` to a file that is `fileLength` bytes long. */
export function frameRecord(batch: Buffer, fileLength: number): Buffer {
  const out: Buffer[] = [];
  let pos = fileLength % BLOCK;
  let rest = batch;
  let first = true;
  for (;;) {
    let left = BLOCK - pos;
    if (left < HEADER) {
      out.push(Buffer.alloc(left));
      pos = 0;
      left = BLOCK;
    }
    const body = rest.subarray(0, left - HEADER);
    const last = body.length === rest.length;
    const type = first && last ? 1 : first ? 2 : last ? 4 : 3;
    const header = Buffer.alloc(HEADER);
    header.writeUInt32LE(maskedCrc(type, body), 0);
    header.writeUInt16LE(body.length, 4);
    header[6] = type;
    out.push(header, body);
    if (last) return Buffer.concat(out);
    pos = (pos + HEADER + body.length) % BLOCK;
    rest = rest.subarray(body.length);
    first = false;
  }
}

/** The newest keybinds put in the log: its exact key and its text, or undefined. */
function newestKeybinds(entries: ReadonlyArray<Entry>): { key: Buffer; text: string } | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i]!;
    if (!e.put || !e.key.subarray(-KEYBINDS_SUFFIX.length).equals(KEYBINDS_SUFFIX)) continue;
    if (e.value[0] !== LATIN1_VALUE_MARKER) return undefined;
    return { key: e.key, text: e.value.subarray(1).toString("latin1") };
  }
  return undefined;
}

/** The keybinds text plus the hidden Push to Mute bind, or undefined if the shape is unknown. */
function withHiddenBind(text: string): string | undefined {
  let state: { _version?: unknown; _state?: Record<string, unknown> };
  try {
    state = JSON.parse(text);
  } catch {
    return undefined;
  }
  // A text that does not survive a round trip would be rewritten differently: do not touch it.
  if (JSON.stringify(state) !== text) return undefined;
  if (
    state._version !== KNOWN_KEYBINDS_VERSION ||
    !state._state ||
    typeof state._state !== "object"
  )
    return undefined;
  const ids = Object.keys(state._state).map(Number);
  if (ids.some((id) => !Number.isInteger(id))) return undefined;
  const id = String(Math.max(0, ...ids) + 1);
  state._state[id] = {
    id,
    enabled: true,
    action: "PUSH_TO_MUTE",
    shortcut: [[0, HIDDEN_KEY_CODE, "0:0"]],
    managed: false,
    params: {},
  };
  const result = JSON.stringify(state);
  return /^[\u0000-ÿ]*$/.test(result) ? result : undefined;
}

export const defaultAutoSetupDeps = (): AutoSetupDeps => ({
  dir: discordStoreDir(),
  // shortcut: Windows only, like the rest of the Discord store code. Add macOS with its store path.
  isDiscordRunning: async () => detectRunningApps(await listProcessNames("win32")).discord,
  now: () => DateTime.formatIso(DateTime.nowUnsafe()),
  appendFile: (path, data) => NodeFSP.appendFile(path, data),
});

export async function autoSetupDiscordBind(
  deps: AutoSetupDeps = defaultAutoSetupDeps(),
): Promise<AutoSetupResult> {
  if (await deps.isDiscordRunning()) return { status: "refused", reason: "discord-running" };
  // Discord holds an OS lock on this file while it runs, so a failed open means do not write.
  try {
    await (await NodeFSP.open(NodePath.join(deps.dir, "LOCK"), "r+")).close();
  } catch {
    return { status: "refused", reason: "store-locked" };
  }
  const unknown = { status: "fallback", reason: "unknown-format" } as const;
  let logName: string | undefined;
  try {
    logName = (await NodeFSP.readdir(deps.dir))
      .filter((n) => /^\d+\.log$/.test(n))
      .toSorted((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10))[0];
  } catch {
    return unknown;
  }
  if (!logName) return unknown;
  const logPath = NodePath.join(deps.dir, logName);
  const original = await NodeFSP.readFile(logPath).catch(() => undefined);
  const log = original && readLog(original);
  const keybinds = log && newestKeybinds(log.entries);
  if (!log || !keybinds) return unknown;
  if (checkHiddenBind([keybinds.text]) === "done") return { status: "already" };
  const updated = withHiddenBind(keybinds.text);
  if (!updated) return unknown;

  const stamp = deps.now().replaceAll(/[:.]/g, "-");
  const backup = NodePath.join(deps.dir, "..", `leonidas-discord-backup-${stamp}`, logName);
  await NodeFSP.mkdir(NodePath.dirname(backup), { recursive: true });
  await NodeFSP.copyFile(logPath, backup);
  try {
    const value = Buffer.concat([Buffer.of(LATIN1_VALUE_MARKER), Buffer.from(updated, "latin1")]);
    await deps.appendFile(
      logPath,
      frameRecord(encodeBatch(log.nextSequence, keybinds.key, value), original.length),
    );
    // Verify what is on disk: the old bytes unchanged, every CRC valid, the bind now found.
    const after = await NodeFSP.readFile(logPath);
    const reread = readLog(after);
    const newest = reread && newestKeybinds(reread.entries);
    if (
      !after.subarray(0, original.length).equals(original) ||
      !newest ||
      checkHiddenBind([newest.text]) !== "done"
    )
      throw new Error("verify failed");
    return { status: "done", backup: NodePath.dirname(backup) };
  } catch {
    const restored = await NodeFSP.copyFile(backup, logPath).then(
      () => true,
      () => false,
    );
    return { status: "failed", restored };
  }
}
