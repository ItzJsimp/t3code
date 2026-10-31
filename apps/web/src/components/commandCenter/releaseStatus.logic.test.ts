import { describe, expect, it } from "vite-plus/test";

import { nextPollMs, releaseEvents, runStates } from "./releaseStatus.logic";

const run = (id: number, state: "running" | "success" | "failed" | "cancelled") => ({
  id,
  title: `run ${id}`,
  state,
});

describe("releaseEvents", () => {
  it("says nothing on the first read, even for finished runs", () => {
    expect(releaseEvents(null, [run(1, "success"), run(2, "failed")])).toEqual([]);
  });

  it("reports a run that was running and has now finished", () => {
    const before = runStates([run(1, "running")]);
    expect(releaseEvents(before, [run(1, "success")])).toEqual([
      { id: 1, title: "run 1", outcome: "success" },
    ]);
  });

  it("reports a failure once and not again on the next read", () => {
    const before = runStates([run(1, "running")]);
    const after = [run(1, "failed")];
    expect(releaseEvents(before, after)).toHaveLength(1);
    expect(releaseEvents(runStates(after), after)).toEqual([]);
  });

  it("ignores a run that is still running or was already finished", () => {
    const before = runStates([run(1, "running"), run(2, "success")]);
    expect(releaseEvents(before, [run(1, "running"), run(2, "success")])).toEqual([]);
  });
});

describe("nextPollMs", () => {
  it("polls fast while a run is in progress and slowly otherwise", () => {
    expect(nextPollMs([run(1, "running")])).toBe(15_000);
    expect(nextPollMs([run(1, "success")])).toBe(120_000);
    expect(nextPollMs([])).toBe(120_000);
  });
});
