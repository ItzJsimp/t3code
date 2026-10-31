import { describe, expect, it } from "@effect/vitest";

import { makeReleaseStatusReader } from "./releaseStatus.ts";

const list = (rows: ReadonlyArray<{ id: number; status: string; conclusion: string | null }>) =>
  JSON.stringify(
    rows.map((r) => ({
      databaseId: r.id,
      displayTitle: `run ${r.id}`,
      status: r.status,
      conclusion: r.conclusion,
      createdAt: "2026-10-31T17:52:31Z",
      updatedAt: "2026-10-31T18:02:55Z",
      headSha: "13f7fd1857f023e4c6898231ab3611b69977830f",
    })),
  );

const jobs = JSON.stringify({
  jobs: [
    {
      name: "Build",
      status: "completed",
      conclusion: "success",
      steps: [{ name: "Compile", status: "completed", conclusion: "success", number: 1 }],
    },
  ],
});

describe("makeReleaseStatusReader", () => {
  it("joins the run list with each run's jobs", async () => {
    const reader = makeReleaseStatusReader(async (args) =>
      args[0] === "run" && args[1] === "list"
        ? list([{ id: 1, status: "completed", conclusion: "success" }])
        : jobs,
    );
    const out = await reader();
    expect(out.error).toBeNull();
    expect(out.runs[0]?.lastStep).toBe("Build / Compile");
  });

  it("reports the failure instead of an empty list when gh fails", async () => {
    const reader = makeReleaseStatusReader(async () => {
      throw new Error("gh: not logged in");
    });
    const out = await reader();
    expect(out.runs).toEqual([]);
    expect(out.error).toContain("not logged in");
  });

  it("reads a finished run's jobs once and a running run's jobs every time", async () => {
    const views: string[] = [];
    const reader = makeReleaseStatusReader(async (args) => {
      if (args[1] === "list")
        return list([
          { id: 1, status: "completed", conclusion: "success" },
          { id: 2, status: "in_progress", conclusion: null },
        ]);
      views.push(args[2] ?? "");
      return jobs;
    }, 0);
    await reader();
    await reader();
    expect(views.filter((id) => id === "1")).toHaveLength(1);
    expect(views.filter((id) => id === "2")).toHaveLength(2);
  });
});
