/** `gh run list` fields joined with the `jobs` field of `gh run view --json jobs`. */
export interface GhStep {
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly number: number;
}
export interface GhJob {
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly steps: ReadonlyArray<GhStep>;
}
export interface GhRun {
  readonly databaseId: number;
  readonly displayTitle: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly headSha: string;
  readonly jobs: ReadonlyArray<GhJob>;
}

export type RunState = "running" | "success" | "failed" | "cancelled";

export interface ReleaseRun {
  readonly id: number;
  readonly title: string;
  readonly state: RunState;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly sha: string;
  readonly jobs: ReadonlyArray<{
    readonly name: string;
    readonly state: RunState;
    readonly steps: ReadonlyArray<{ readonly name: string; readonly state: RunState | "waiting" }>;
  }>;
  /** "Job / step": the failed step, else the step in progress, else the last one that ran. */
  readonly lastStep: string | null;
}

export const MAX_RUNS = 10;

// A skipped step is not a failure, so only these conclusions turn a run red.
const stateOf = (status: string, conclusion: string | null): RunState =>
  status !== "completed"
    ? "running"
    : conclusion === "success" || conclusion === "skipped" || conclusion === "neutral"
      ? "success"
      : conclusion === "cancelled"
        ? "cancelled"
        : "failed";

function lastStepOf(jobs: ReadonlyArray<GhJob>): string | null {
  const steps = jobs.flatMap((job) => job.steps.map((s) => ({ job: job.name, ...s })));
  const pick =
    steps.find((s) => stateOf(s.status, s.conclusion) === "failed") ??
    steps.find((s) => s.status === "in_progress") ??
    steps.findLast((s) => s.status === "completed");
  return pick ? `${pick.job} / ${pick.name}` : null;
}

export function mapRuns(runs: ReadonlyArray<GhRun>): ReadonlyArray<ReleaseRun> {
  return runs.slice(0, MAX_RUNS).map((r) => ({
    id: r.databaseId,
    title: r.displayTitle,
    state: stateOf(r.status, r.conclusion),
    startedAt: r.createdAt,
    updatedAt: r.updatedAt,
    sha: r.headSha.slice(0, 10),
    jobs: r.jobs.map((j) => ({
      name: j.name,
      state: stateOf(j.status, j.conclusion),
      steps: j.steps.map((s) => ({
        name: s.name,
        state:
          s.status === "pending" || s.status === "queued"
            ? "waiting"
            : stateOf(s.status, s.conclusion),
      })),
    })),
    lastStep: lastStepOf(r.jobs),
  }));
}
