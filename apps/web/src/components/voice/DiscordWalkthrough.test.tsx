// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { shouldShowDiscordTip } from "./DiscordTip";
import { DiscordWalkthrough } from "./DiscordWalkthrough";

const bridge = {
  discordSetupStatus: vi.fn(),
  tapDiscordKey: vi.fn(),
};
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  bridge.tapDiscordKey.mockResolvedValue(undefined);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("desktopBridge", bridge);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const text = () => document.body.textContent ?? "";
const button = (label: string) =>
  [...document.body.querySelectorAll("button")].find((b) => b.textContent?.startsWith(label));
async function open() {
  await act(async () =>
    root.render(<DiscordWalkthrough open onOpenChange={(value) => void value} />),
  );
}

it("shows the steps while the bind is missing", async () => {
  bridge.discordSetupStatus.mockResolvedValue({
    discordRunning: true,
    wisprRunning: false,
    bind: "missing",
  });
  await open();
  expect(text()).toContain("Push to Mute");
  expect(button("Done")).toBeUndefined();
});

it("shows Done when the bind exists", async () => {
  bridge.discordSetupStatus.mockResolvedValue({
    discordRunning: true,
    wisprRunning: false,
    bind: "done",
  });
  await open();
  expect(text()).toContain("Done. Discord mutes you while you dictate.");
  expect(button("Done")).toBeDefined();
});

it("moves to Done after Check again finds the bind", async () => {
  bridge.discordSetupStatus
    .mockResolvedValueOnce({ discordRunning: true, wisprRunning: false, bind: "missing" })
    .mockResolvedValue({ discordRunning: true, wisprRunning: false, bind: "done" });
  await open();
  await act(async () => button("Check again")!.click());
  expect(text()).toContain("Done. Discord mutes you");
});

it("warns when Wispr Flow runs", async () => {
  bridge.discordSetupStatus.mockResolvedValue({
    discordRunning: true,
    wisprRunning: true,
    bind: "missing",
  });
  await open();
  expect(text()).toContain("Ctrl+Alt+Space");
});

it("taps the key after the countdown", async () => {
  bridge.discordSetupStatus.mockResolvedValue({
    discordRunning: true,
    wisprRunning: false,
    bind: "missing",
  });
  await open();
  vi.useFakeTimers();
  await act(async () => button("Send the key")!.click());
  expect(bridge.tapDiscordKey).not.toHaveBeenCalled();
  // One second per act: React re-renders between ticks, and each tick arms the next timer.
  for (let second = 0; second < 5; second++)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
  expect(bridge.tapDiscordKey).toHaveBeenCalledTimes(1);
});

it("shows the tip once, only when Discord runs without the bind", async () => {
  bridge.discordSetupStatus.mockResolvedValue({
    discordRunning: true,
    wisprRunning: false,
    bind: "missing",
  });
  expect(await shouldShowDiscordTip()).toBe(true);
  expect(await shouldShowDiscordTip()).toBe(false);
});

it("never shows the tip when the bind exists or Discord is closed", async () => {
  bridge.discordSetupStatus.mockResolvedValueOnce({
    discordRunning: true,
    wisprRunning: false,
    bind: "done",
  });
  expect(await shouldShowDiscordTip()).toBe(false);
  bridge.discordSetupStatus.mockResolvedValueOnce({
    discordRunning: false,
    wisprRunning: false,
    bind: "missing",
  });
  expect(await shouldShowDiscordTip()).toBe(false);
});

it("names the key the platform helper sends", async () => {
  bridge.discordSetupStatus.mockResolvedValue({
    discordRunning: true,
    wisprRunning: false,
    hiddenKey: "F19",
    bind: "unknown",
  });
  await open();
  expect(text()).toContain("F19");
  expect(text()).not.toContain("F24");
});
