import { describe, expect, it } from "@effect/vitest";

import { detectRunningApps, parseTasklist } from "./runningApps.ts";

const TASKLIST = [
  '"System Idle Process","0","Services","0","8 K"',
  '"Discord.exe","9084","Console","1","210,552 K"',
  '"Discord.exe","1420","Console","1","95,100 K"',
  '"Wispr Flow.exe","7712","Console","1","180,000 K"',
].join("\r\n");

describe("parseTasklist", () => {
  it("returns the image name of each CSV row", () => {
    expect(parseTasklist(TASKLIST)).toEqual([
      "System Idle Process",
      "Discord.exe",
      "Discord.exe",
      "Wispr Flow.exe",
    ]);
  });
});

describe("detectRunningApps", () => {
  it("finds Discord, its preview builds, and Wispr Flow", () => {
    expect(detectRunningApps(parseTasklist(TASKLIST))).toEqual({ discord: true, wispr: true });
    expect(detectRunningApps(["DiscordPTB.exe"])).toEqual({ discord: true, wispr: false });
    expect(detectRunningApps(["DiscordCanary.exe"]).discord).toBe(true);
  });

  it("reports neither when neither runs, and ignores look-alike names", () => {
    expect(detectRunningApps(["chrome.exe", "discord-notes.exe"])).toEqual({
      discord: false,
      wispr: false,
    });
  });
});
