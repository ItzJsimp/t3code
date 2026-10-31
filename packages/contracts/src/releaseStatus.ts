import * as Schema from "effect/Schema";

export const ReleaseRunState = Schema.Literals(["running", "success", "failed", "cancelled"]);
export type ReleaseRunState = typeof ReleaseRunState.Type;

export const ReleaseStep = Schema.Struct({
  name: Schema.String,
  state: Schema.Literals(["waiting", "running", "success", "failed", "cancelled"]),
});

export const ReleaseJob = Schema.Struct({
  name: Schema.String,
  state: ReleaseRunState,
  steps: Schema.Array(ReleaseStep),
});

export const ReleaseRun = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  state: ReleaseRunState,
  startedAt: Schema.String,
  updatedAt: Schema.String,
  sha: Schema.String,
  jobs: Schema.Array(ReleaseJob),
  /** "Job / step": the failed step, else the step in progress, else the last one that ran. */
  lastStep: Schema.NullOr(Schema.String),
});
export type ReleaseRun = typeof ReleaseRun.Type;

/** The newest release workflow runs, newest first. Read-only, behind `release:read`. */
/** `error` is set when `gh` could not be read, so a broken read never looks like "no releases". */
export const ReleaseStatus = Schema.Struct({
  runs: Schema.Array(ReleaseRun),
  error: Schema.NullOr(Schema.String),
});
export type ReleaseStatus = typeof ReleaseStatus.Type;
