import { Button } from "../ui/button";

const SEEN_KEY = "leonidas.discordTipSeen";

/**
 * True once: when Discord runs and the hidden bind is not confirmed. Marks the tip seen as it
 * answers, so it never shows twice. Never shows when the bind exists.
 */
export async function shouldShowDiscordTip(): Promise<boolean> {
  if (localStorage.getItem(SEEN_KEY)) return false;
  try {
    const status = await window.desktopBridge?.discordSetupStatus?.();
    if (!status?.discordRunning || status.bind === "done") return false;
  } catch {
    return false;
  }
  localStorage.setItem(SEEN_KEY, "1");
  return true;
}

export function DiscordTip({ onOpen, onDismiss }: { onOpen: () => void; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="absolute bottom-full right-0 z-20 mb-2 w-72 rounded-lg border bg-popover p-3 text-sm shadow-lg"
    >
      <p>Discord is open. Set it up once and it mutes you while you dictate.</p>
      <div className="mt-2 flex gap-2">
        <Button type="button" size="sm" onClick={onOpen}>
          Set up Discord
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
}
