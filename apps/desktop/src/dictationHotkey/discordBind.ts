// @effect-diagnostics nodeBuiltinImport:off - plain async file reads of a copied Discord store.
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

/** done: Push to Mute is bound to the hidden key. missing: it is not. unknown: the store could not be read. */
export type BindCheck = "done" | "missing" | "unknown";

const HIDDEN_KEY_CODE = 135; // F24, the key Leonidas holds down while it dictates.
const RECORD_START = '{"_state":{';

interface Binding {
  readonly enabled?: boolean;
  readonly action?: string;
  readonly shortcut?: ReadonlyArray<ReadonlyArray<unknown>>;
}

/** The text of the JSON object that starts at `start`, or undefined if it is cut off. */
function objectAt(text: string, start: number): string | undefined {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return undefined;
}

/** The newest complete keybinds record in one file, or undefined. A write in progress may cut the last one. */
function newestBindings(text: string): ReadonlyArray<Binding> | undefined {
  for (
    let at = text.lastIndexOf(RECORD_START);
    at >= 0;
    at = text.lastIndexOf(RECORD_START, at - 1)
  ) {
    const json = objectAt(text, at);
    if (json === undefined) continue;
    try {
      const state = (JSON.parse(json) as { _state?: Record<string, Binding> })._state;
      if (state !== undefined) return Object.values(state);
    } catch {
      // A damaged record: try the one before it.
    }
  }
  return undefined;
}

/**
 * Whether Discord has Push to Mute bound to F24 alone. `texts` is newest file first; the first
 * file with a record decides, so a bind that was later removed is not found in an older file.
 */
export function checkHiddenBind(texts: ReadonlyArray<string>): BindCheck {
  for (const text of texts) {
    const bindings = newestBindings(text);
    if (bindings === undefined) continue;
    return bindings.some(
      (b) =>
        b.enabled === true &&
        b.action === "PUSH_TO_MUTE" &&
        b.shortcut?.length === 1 &&
        b.shortcut[0]?.[0] === 0 &&
        b.shortcut[0]?.[1] === HIDDEN_KEY_CODE,
    )
      ? "done"
      : "missing";
  }
  return "unknown";
}

export const discordStoreDir = (): string =>
  NodePath.join(
    process.env.APPDATA ?? NodePath.join(NodeOS.homedir(), "AppData", "Roaming"),
    "discord",
    "Local Storage",
    "leveldb",
  );

/**
 * Reads the Discord store through a copy, never the live files, so a file Discord holds open
 * cannot fail the check or be changed by it. Logs come first (newest writes), then tables, each
 * newest number first. A file that cannot be copied is skipped.
 */
export async function* storeTexts(
  dir: string = discordStoreDir(),
  io: { readonly copyFile: (from: string, to: string) => Promise<void> } = {
    copyFile: NodeFSP.copyFile,
  },
): AsyncGenerator<string> {
  let names: string[];
  try {
    names = await NodeFSP.readdir(dir);
  } catch {
    return;
  }
  const rank = (name: string) => (name.endsWith(".log") ? 1 : 0) * 1e12 + Number.parseInt(name, 10);
  const files = names
    .filter((n) => /^\d+\.(log|ldb)$/.test(n))
    .toSorted((a, b) => rank(b) - rank(a));
  const copyDir = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "leonidas-discord-store-"));
  try {
    for (const name of files) {
      const copy = NodePath.join(copyDir, name);
      let text: string;
      try {
        await io.copyFile(NodePath.join(dir, name), copy);
        text = await NodeFSP.readFile(copy, "latin1");
      } catch {
        // Locked or removed while we looked: the next file may still answer.
        continue;
      }
      yield text;
    }
  } finally {
    await NodeFSP.rm(copyDir, { recursive: true, force: true });
  }
}

/** Reads one file at a time, newest first, and stops at the first one that holds a record. */
export async function checkDiscordBind(): Promise<BindCheck> {
  for await (const text of storeTexts()) {
    const result = checkHiddenBind([text]);
    if (result !== "unknown") return result;
  }
  return "unknown";
}
