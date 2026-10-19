/**
 * Global dictation triggers: turns trigger events from the OS input hook into
 * start, stop and cancel. The hook matches keys and reports only `down`/`up`
 * for a configured trigger, or `other` for any other key while one is held.
 */

export type DictationTriggerName = "toggle" | "hold" | "mouse";
export type DictationTriggerMode = "toggle" | "hold";
export type DictationTriggerAction = "start" | "stop" | "cancel";

export type DictationTriggerEvent =
  | { readonly type: "down" | "up"; readonly trigger: DictationTriggerName }
  | { readonly type: "other" };

export type DictationTriggerState =
  | { readonly kind: "idle" }
  | { readonly kind: "toggled" }
  | { readonly kind: "holding"; readonly trigger: DictationTriggerName };

export type DictationTriggers = Readonly<Record<DictationTriggerName, string>>;

/** Held down in Discord as Push to Mute while dictation runs. A plain key, so typing is unchanged. */
export const DISCORD_MUTE_KEY = "F24";

export const idleDictationTrigger: DictationTriggerState = { kind: "idle" };

const IDLE = { state: idleDictationTrigger } as const;

export function stepDictationTrigger(
  state: DictationTriggerState,
  event: DictationTriggerEvent,
  mode: DictationTriggerMode,
): { readonly state: DictationTriggerState; readonly action?: DictationTriggerAction } {
  if (event.type === "other") {
    return state.kind === "holding" ? { ...IDLE, action: "cancel" } : { state };
  }
  const holdStyle = event.trigger === "hold" || (event.trigger === "mouse" && mode === "hold");

  if (event.type === "up") {
    return state.kind === "holding" && state.trigger === event.trigger
      ? { ...IDLE, action: "stop" }
      : { state };
  }
  switch (state.kind) {
    case "idle":
      return holdStyle
        ? { state: { kind: "holding", trigger: event.trigger }, action: "start" }
        : { state: { kind: "toggled" }, action: "start" };
    case "toggled":
      return { ...IDLE, action: "stop" };
    case "holding":
      // Ctrl+Win then Space: keep the running dictation, now hands-free.
      return holdStyle ? { state } : { state: { kind: "toggled" } };
  }
}

/** Wispr Flow defaults (docs.wisprflow.ai), plus Mouse 4. */
export function defaultDictationTriggers(platform: string): DictationTriggers {
  return platform === "darwin"
    ? { toggle: "Fn+Space", hold: "Fn", mouse: "Mouse4" }
    : { toggle: "Ctrl+Win+Space", hold: "Ctrl+Win", mouse: "Mouse4" };
}

const normalize = (combo: string) =>
  combo
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .sort()
    .join("+");

/** Returns the first trigger that repeats an earlier one or uses the hidden Discord key. */
export function findTriggerConflict(triggers: DictationTriggers): DictationTriggerName | undefined {
  const taken = new Set([normalize(DISCORD_MUTE_KEY)]);
  for (const name of ["toggle", "hold", "mouse"] as const) {
    const key = normalize(triggers[name]);
    if (taken.has(key)) return name;
    taken.add(key);
  }
  return undefined;
}
