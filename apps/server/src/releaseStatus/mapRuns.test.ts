import { describe, expect, it } from "@effect/vitest";

import { mapRuns, type GhRun } from "./mapRuns.ts";

const step = (name: string, status: string, conclusion: string | null, number: number) => ({
  name,
  status,
  conclusion,
  number,
});

const run = (over: Partial<GhRun>): GhRun => ({
  databaseId: 1,
  displayTitle: "feat: a thing",
  status: "completed",
  conclusion: "success",
  createdAt: "2026-10-31T17:52:31Z",
  updatedAt: "2026-10-31T18:02:55Z",
  headSha: "13f7fd1857f023e4c6898231ab3611b69977830f",
  jobs: [
    {
      name: "Windows x64 installer",
      status: "completed",
      conclusion: "success",
      steps: [
        step("Set up job", "completed", "success", 1),
        step("Build", "completed", "success", 2),
      ],
    },
  ],
  ...over,
});

describe("mapRuns", () => {
  it("marks a finished run as success and names its final step", () => {
    const [out] = mapRuns([run({})]);
    expect(out?.state).toBe("success");
    expect(out?.lastStep).toBe("Windows x64 installer / Build");
    expect(out?.sha).toBe("13f7fd1857");
  });

  it("flags a failed run and points at the failed step, not the last one", () => {
    const [out] = mapRuns([
      run({
        conclusion: "failure",
        jobs: [
          {
            name: "Types and fast tests",
            status: "completed",
            conclusion: "failure",
            steps: [
              step("Set up job", "completed", "success", 1),
              step("Run tests", "completed", "failure", 2),
              step("Post checkout", "completed", "skipped", 3),
            ],
          },
        ],
      }),
    ]);
    expect(out?.state).toBe("failed");
    expect(out?.lastStep).toBe("Types and fast tests / Run tests");
  });

  it("names the step in progress for a running run", () => {
    const [out] = mapRuns([
      run({
        status: "in_progress",
        conclusion: null,
        jobs: [
          {
            name: "macOS arm64 app",
            status: "in_progress",
            conclusion: null,
            steps: [
              step("Set up job", "completed", "success", 1),
              step("Build app", "in_progress", null, 2),
              step("Upload", "pending", null, 3),
            ],
          },
        ],
      }),
    ]);
    expect(out?.state).toBe("running");
    expect(out?.lastStep).toBe("macOS arm64 app / Build app");
  });

  it("treats a queued run with no jobs as running with no step", () => {
    const [out] = mapRuns([run({ status: "queued", conclusion: null, jobs: [] })]);
    expect(out?.state).toBe("running");
    expect(out?.lastStep).toBeNull();
  });

  it("maps cancelled runs and keeps only the 10 newest", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      run({ databaseId: i, conclusion: i === 0 ? "cancelled" : "success" }),
    );
    const out = mapRuns(many);
    expect(out).toHaveLength(10);
    expect(out[0]?.state).toBe("cancelled");
  });
});
