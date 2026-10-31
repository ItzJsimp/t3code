// @effect-diagnostics nodeBuiltinImport:off globalDate:off - a plain async reader that shells out to gh and keeps a 10 s cache.
import * as NodeChildProcess from "node:child_process";

import type { ReleaseStatus } from "@t3tools/contracts";

import { type GhJob, type GhRun, mapRuns, MAX_RUNS } from "./mapRuns.ts";

// shortcut: repo and workflow are fixed, make them a setting when a second app ships this way.
const REPO = process.env.LEONIDAS_RELEASE_REPO ?? "ItzJsimp/leonidas-code";
const WORKFLOW = "Team release";
const FIELDS = "databaseId,status,conclusion,displayTitle,createdAt,updatedAt,headSha";

type Gh = (args: ReadonlyArray<string>) => Promise<string>;

const runGh: Gh = (args) =>
  new Promise((resolve, reject) => {
    NodeChildProcess.execFile(
      "gh",
      [...args],
      { timeout: 20_000, windowsHide: true },
      (error, stdout, stderr) =>
        error ? reject(new Error(stderr.trim() || error.message)) : resolve(stdout),
    );
  });

/**
 * Reads the newest release runs through `gh`. A finished run never changes, so its jobs are read
 * once. Calls inside `ttlMs` share one answer, so two open windows cost one round trip.
 */
export function makeReleaseStatusReader(gh: Gh = runGh, ttlMs = 10_000) {
  const finishedJobs = new Map<number, ReadonlyArray<GhJob>>();
  let held: { at: number; value: ReleaseStatus } | undefined;

  return async (): Promise<ReleaseStatus> => {
    if (held && Date.now() - held.at < ttlMs) return held.value;
    let value: ReleaseStatus;
    try {
      const rows = JSON.parse(
        await gh([
          "run",
          "list",
          "-R",
          REPO,
          "-w",
          WORKFLOW,
          "-L",
          String(MAX_RUNS),
          "--json",
          FIELDS,
        ]),
      ) as Omit<GhRun, "jobs">[];
      const runs = await Promise.all(
        rows.map(async (row): Promise<GhRun> => {
          const cached = finishedJobs.get(row.databaseId);
          if (cached) return { ...row, jobs: cached };
          const { jobs } = JSON.parse(
            await gh(["run", "view", String(row.databaseId), "-R", REPO, "--json", "jobs"]),
          ) as { jobs: GhJob[] };
          if (row.status === "completed") finishedJobs.set(row.databaseId, jobs);
          return { ...row, jobs };
        }),
      );
      // Only the listed runs can come back, so forget the rest and the map stays at 10 entries.
      for (const id of finishedJobs.keys()) {
        if (!rows.some((row) => row.databaseId === id)) finishedJobs.delete(id);
      }
      value = { runs: mapRuns(runs), error: null };
    } catch (error) {
      // Not held, so the next read retries at once.
      return { runs: [], error: error instanceof Error ? error.message : String(error) };
    }
    held = { at: Date.now(), value };
    return value;
  };
}

export const readReleaseStatus = makeReleaseStatusReader();
