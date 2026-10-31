import type { ReleaseRunState } from "@t3tools/contracts";

interface RunLike {
  readonly id: number;
  readonly title: string;
  readonly state: ReleaseRunState;
}

export interface ReleaseEvent {
  readonly id: number;
  readonly title: string;
  readonly outcome: Exclude<ReleaseRunState, "running">;
}

export const FAST_POLL_MS = 15_000;
export const SLOW_POLL_MS = 120_000;

export const runStates = (runs: ReadonlyArray<RunLike>): ReadonlyMap<number, ReleaseRunState> =>
  new Map(runs.map((r) => [r.id, r.state]));

/** A toast for each run that was running at the last read and is not now. No history on first read. */
export function releaseEvents(
  previous: ReadonlyMap<number, ReleaseRunState> | null,
  runs: ReadonlyArray<RunLike>,
): ReadonlyArray<ReleaseEvent> {
  if (previous === null) return [];
  return runs.flatMap((r) =>
    previous.get(r.id) === "running" && r.state !== "running"
      ? [{ id: r.id, title: r.title, outcome: r.state }]
      : [],
  );
}

export const nextPollMs = (runs: ReadonlyArray<RunLike>): number =>
  runs.some((r) => r.state === "running") ? FAST_POLL_MS : SLOW_POLL_MS;
