// @effect-diagnostics nodeBuiltinImport:off - one short `tasklist` call, no Effect runtime needed.
import * as NodeChildProcess from "node:child_process";

export interface RunningApps {
  readonly discord: boolean;
  readonly wispr: boolean;
}

/** The first CSV column of `tasklist /FO CSV /NH` is the image name. */
export const parseTasklist = (output: string): ReadonlyArray<string> =>
  output
    .split(/\r?\n/)
    .map((line) => /^"([^"]*)"/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined);

export const detectRunningApps = (names: ReadonlyArray<string>): RunningApps => ({
  discord: names.some((n) => /^discord(ptb|canary)?\.exe$/i.test(n)),
  wispr: names.some((n) => /^wispr ?flow.*\.exe$/i.test(n)),
});

// shortcut: Windows only (tasklist). The macOS slice adds `ps` when it lands.
export const listProcessNames = (): Promise<ReadonlyArray<string>> =>
  new Promise((resolve) => {
    NodeChildProcess.execFile(
      "tasklist",
      ["/FO", "CSV", "/NH"],
      { timeout: 10_000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      // A failed lookup reads as "nothing running", so setup still shows the tip.
      (error, stdout) => resolve(error ? [] : parseTasklist(stdout)),
    );
  });
