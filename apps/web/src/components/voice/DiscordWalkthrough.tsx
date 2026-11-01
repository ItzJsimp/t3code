import type { DiscordSetupStatus } from "@t3tools/contracts";
import { CheckCircle2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";

const COUNTDOWN_SECONDS = 5;

export function DiscordWalkthrough({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState<DiscordSetupStatus | null>(null);
  const [counting, setCounting] = useState(0);
  const check = useCallback(async () => {
    try {
      setStatus((await window.desktopBridge?.discordSetupStatus?.()) ?? null);
    } catch {
      setStatus(null);
    }
  }, []);
  // The bind is made in the Discord window, so check again whenever the user comes back here.
  useEffect(() => {
    if (!open) return;
    void check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [open, check]);
  useEffect(() => {
    if (counting === 0) return;
    const timer = setTimeout(() => {
      if (counting === 1) void window.desktopBridge?.tapDiscordKey?.()?.then(check, check);
      setCounting(counting - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [counting, check]);
  const done = status?.bind === "done";
  const hiddenKey = status?.hiddenKey ?? "F24";
  // This component stays mounted when the dialog closes, so stop a running countdown here.
  const change = (next: boolean) => {
    if (!next) setCounting(0);
    onOpenChange(next);
  };
  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Mute Discord while you dictate</DialogTitle>
          <DialogDescription>
            Bind one hidden key in Discord. Leonidas then mutes you in calls while you dictate.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {done ? (
            <div className="space-y-4" role="status">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2Icon aria-hidden className="size-5 text-success" />
                Done. Discord mutes you while you dictate.
              </p>
              <Button type="button" onClick={() => change(false)}>
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <ol aria-label="Discord setup steps" className="list-decimal space-y-3 pl-5 text-sm">
                <li>
                  In Discord, click the gear next to your name. Open <strong>Keybinds</strong>.
                </li>
                <li>
                  Click <strong>Add a Keybind</strong>. Set Action to <strong>Push to Mute</strong>.
                </li>
                <li>
                  Click the keybind box, then click <strong>Record Keybind</strong>.
                </li>
                <li>
                  Click <strong>Send the key</strong> below. Then click back to Discord. Discord
                  shows <strong>{hiddenKey}</strong>. Click <strong>Stop Recording</strong>.
                </li>
              </ol>
              <Button
                type="button"
                variant="outline"
                disabled={counting > 0 || !window.desktopBridge?.tapDiscordKey}
                onClick={() => setCounting(COUNTDOWN_SECONDS)}
              >
                {counting > 0 ? `Sending in ${counting}...` : "Send the key"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Your keyboard has no {hiddenKey} key. Leonidas presses it for you after a short
                countdown.
              </p>
              {status?.wisprRunning && (
                <p role="status" className="text-sm">
                  Wispr Flow is running and can take the same dictation keys. If dictation does not
                  start, set your Leonidas shortcut to Ctrl+Alt+Space in Settings, Voice.
                </p>
              )}
              {status?.bind === "unknown" && (
                <p role="status" className="text-xs text-muted-foreground">
                  Leonidas cannot read the Discord settings, so it cannot confirm the bind. Click
                  Check again after step 4.
                </p>
              )}
              <Button type="button" variant="ghost" onClick={() => void check()}>
                Check again
              </Button>
            </div>
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
