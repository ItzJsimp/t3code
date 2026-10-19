# Discord mute while dictating

Card: `discord-auto-mute-while-dictating` (AIOS tasks). Spike: `apps/desktop/scripts/discord-mute-spike.ps1`.

## Decision: go

Leonidas holds one hidden key down while dictation runs. Discord binds that key to **Push to Mute**. Proven on Windows 11 with Discord 1.0.9261 on 2026-10-19.

## Findings

- **Hidden key is F24 alone.** A modifier combo (Ctrl+Shift+Alt+F13) held for the whole dictation would change every key the user types meanwhile. F24 has no physical key on most keyboards and does not auto-repeat when sent.
- **Discord accepts a sent key.** Its keybind recorder saved F24 sent with `keybd_event` from another process. A held F24 muted the user in a live voice channel for 15 s and unmuted on key up.
- **Push to Mute, not Toggle Mute.** Leonidas cannot read Discord's mute state. A held key cannot drift out of step; a toggle can.
- **Hook in a helper process, not ffi-rs.** A low-level hook needs a message loop on the thread that installs it, and its callback blocks all system input while it runs. A hidden PowerShell process with a compiled C# hook owns its own loop. Over 100 synthetic Mouse 4 events: all seen and eaten (no Back), median 0.013 ms, max 0.026 ms per call.
- **Read stdin as a raw stream.** With `-File`, the PowerShell host reads the first stdin line before C# `Console.In` sees it. `Console.OpenStandardInput()` gets every line.
- **The hook ignores injected input** (`LLMHF_INJECTED`), so our own sent keys never trigger it. The spike has an `-AcceptInjected` switch for tests only.

## Walkthrough consequence

The user cannot press F24 on a normal keyboard. The walkthrough tells them to click Record in Discord, then Leonidas sends F24 after a short countdown.
