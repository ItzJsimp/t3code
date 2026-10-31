import { findTriggerConflict } from "@t3tools/shared/dictationTrigger";
import type { DictationTriggerName, DictationTriggers } from "@t3tools/shared/dictationTrigger";

/** The parts of a keyboard event the recorder reads. */
export interface KeyEventLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
}

export interface RecorderState {
  /** Every modifier held since recording began, in Ctrl, Alt, Shift, Win order. */
  readonly mods: ReadonlyArray<string>;
}

export interface RecorderStep {
  readonly state: RecorderState;
  readonly combo?: string;
  readonly error?: string;
}

const MODIFIER_KEYS = new Set(["Control", "Alt", "Shift", "Meta"]);
const ORDER = ["Ctrl", "Alt", "Shift", "Win"];

const modifiersOf = (e: KeyEventLike): string[] =>
  [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", e.metaKey && "Win"].filter(
    (m): m is string => m !== false,
  );

const union = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) =>
  ORDER.filter((m) => a.includes(m) || b.includes(m));

/** Names the Windows hook understands: Space, F1 to F23 (F24 is Discord's), letters and digits. */
function keyName(key: string): string | null {
  if (key === " ") return "Space";
  if (/^F([1-9]|1\d|2[0-3])$/.test(key)) return key;
  return /^[a-zA-Z0-9]$/.test(key) ? key.toUpperCase() : null;
}

const NEEDS_MODIFIER = "Hold Ctrl, Alt, Shift or Win with it, so normal typing keeps working.";
const NEEDS_TWO = "Hold at least two of Ctrl, Alt, Shift and Win, or add a key.";

/** One keyboard event of a recording. A combo or an error ends it; otherwise it goes on. */
export function recordKey(
  state: RecorderState,
  kind: "down" | "up",
  event: KeyEventLike,
): RecorderStep {
  if (MODIFIER_KEYS.has(event.key)) {
    if (kind === "down") return { state: { mods: union(state.mods, modifiersOf(event)) } };
    if (modifiersOf(event).length > 0) return { state };
    return state.mods.length >= 2
      ? { state, combo: state.mods.join("+") }
      : { state, error: NEEDS_TWO };
  }
  if (kind === "up") return { state };
  const name = keyName(event.key);
  if (name === null)
    return { state, error: "That key cannot be used. Try a letter, a digit, Space or F1 to F23." };
  const mods = union(state.mods, modifiersOf(event));
  const isFunctionKey = name.startsWith("F") && name.length > 1;
  if (mods.length === 0 && !isFunctionKey) return { state, error: NEEDS_MODIFIER };
  return { state, combo: [...mods, name].join("+") };
}

/** DOM mouse `button` numbers: 1 is the wheel, 3 and 4 are the side buttons. Left and right stay free. */
export function comboFromMouseButton(button: number): string | null {
  return button === 3 ? "Mouse4" : button === 4 ? "Mouse5" : button === 1 ? "Middle" : null;
}

/** An error to show when `combo` cannot replace `name`'s trigger, or null. */
export function triggerConflictMessage(
  current: DictationTriggers,
  name: DictationTriggerName,
  combo: string,
): string | null {
  const conflict = findTriggerConflict({ ...current, [name]: combo });
  if (conflict === undefined) return null;
  return conflict === name && /^f24$/i.test(combo.trim())
    ? "F24 is reserved for Discord. Pick another."
    : "Another dictation shortcut already uses that. Pick another.";
}
