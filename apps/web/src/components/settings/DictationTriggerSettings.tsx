import {
  resolveDictationTriggers,
  type DictationTriggerName,
} from "@t3tools/shared/dictationTrigger";
import { useEffect, useRef, useState } from "react";

import { useClientSettings, useUpdateClientSettings } from "../../hooks/useSettings";
import { isWindowsPlatform } from "../../lib/utils";
import { Button } from "../ui/button";
import { SettingsRow } from "./settingsLayout";
import {
  comboFromMouseButton,
  recordKey,
  triggerConflictMessage,
  type RecorderState,
} from "./dictationTriggerRecorder.logic";

const ROWS: ReadonlyArray<{
  readonly name: DictationTriggerName;
  readonly title: string;
  readonly description: string;
}> = [
  {
    name: "toggle",
    title: "Start and stop shortcut",
    description: "Press once to start dictating, press again to stop.",
  },
  {
    name: "hold",
    title: "Hold-to-talk shortcut",
    description: "Dictate while you hold these keys. Pressing any other key cancels.",
  },
  {
    name: "mouse",
    title: "Mouse button",
    description: "A side button or the wheel. It does not also go Back in other apps.",
  },
];

const SAVED_KEYS = {
  toggle: "dictationToggleKey",
  hold: "dictationHoldKey",
  mouse: "dictationMouseKey",
} as const;

/** Settings → Voice: record the global dictation shortcuts. Windows desktop only for now. */
export function DictationTriggerSettings() {
  const updateSettings = useUpdateClientSettings();
  const saved = useClientSettings((s) => ({
    toggle: s.dictationToggleKey,
    hold: s.dictationHoldKey,
    mouse: s.dictationMouseKey,
    mode: s.dictationMode,
  }));
  const current = resolveDictationTriggers("win32", saved);
  const [recording, setRecording] = useState<DictationTriggerName | null>(null);
  const [error, setError] = useState<{ name: DictationTriggerName; message: string } | null>(null);
  // The listeners below must see the latest values without re-subscribing on every key.
  const latest = useRef({ current, updateSettings });
  latest.current = { current, updateSettings };

  // The global hook would eat the very keys being recorded, and start a dictation.
  useEffect(() => {
    if (recording === null) return;
    void window.desktopBridge?.pauseDictationHotkey?.(true);
    return () => void window.desktopBridge?.pauseDictationHotkey?.(false);
  }, [recording]);

  useEffect(() => {
    if (recording === null) return;
    let state: RecorderState = { mods: [] };
    const finish = (combo: string) => {
      const message = triggerConflictMessage(latest.current.current, recording, combo);
      if (message === null) {
        void latest.current.updateSettings({ [SAVED_KEYS[recording]]: combo });
        setError(null);
      } else {
        setError({ name: recording, message });
      }
      setRecording(null);
    };
    const onKey = (kind: "down" | "up") => (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (kind === "down" && event.key === "Escape") return setRecording(null);
      if (recording === "mouse") return;
      const step = recordKey(state, kind, event);
      state = step.state;
      if (step.error) {
        setError({ name: recording, message: step.error });
        setRecording(null);
      } else if (step.combo) finish(step.combo);
    };
    const onMouse = (event: MouseEvent) => {
      if (recording !== "mouse") return;
      const combo = comboFromMouseButton(event.button);
      if (combo === null) return;
      event.preventDefault();
      event.stopPropagation();
      finish(combo);
    };
    const down = onKey("down");
    const up = onKey("up");
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    window.addEventListener("mousedown", onMouse, true);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      window.removeEventListener("mousedown", onMouse, true);
    };
  }, [recording]);

  if (!window.desktopBridge || !isWindowsPlatform(navigator.platform)) return null;

  return (
    <>
      {ROWS.map(({ name, title, description }) => (
        <SettingsRow
          key={name}
          title={title}
          description={
            <>
              {description}
              {error?.name === name ? (
                <span role="alert" className="mt-1 block text-destructive-foreground">
                  {error.message}
                </span>
              ) : null}
            </>
          }
          control={
            <div className="flex items-center gap-2">
              <kbd className="rounded-md border bg-muted px-2 py-1 text-xs">
                {recording === name
                  ? name === "mouse"
                    ? "Press a mouse button..."
                    : "Press the keys..."
                  : current[name]}
              </kbd>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setRecording(recording === name ? null : name);
                }}
              >
                {recording === name ? "Cancel" : "Record"}
              </Button>
            </div>
          }
        />
      ))}
      <SettingsRow
        title="Mouse button mode"
        description="Toggle: click to start, click to stop. Hold: dictate while the button is down."
        control={
          <div className="flex gap-2">
            {(["toggle", "hold"] as const).map((mode) => (
              <Button
                key={mode}
                size="xs"
                variant={saved.mode === mode ? "default" : "outline"}
                aria-pressed={saved.mode === mode}
                onClick={() => void updateSettings({ dictationMode: mode })}
              >
                {mode === "toggle" ? "Toggle" : "Hold"}
              </Button>
            ))}
          </div>
        }
      />
      <SettingsRow
        title="Reset dictation shortcuts"
        description="Go back to Ctrl+Win+Space, Ctrl+Win and Mouse4."
        control={
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setError(null);
              void updateSettings({
                dictationToggleKey: "",
                dictationHoldKey: "",
                dictationMouseKey: "",
                dictationMode: "toggle",
              });
            }}
          >
            Reset
          </Button>
        }
      />
    </>
  );
}
