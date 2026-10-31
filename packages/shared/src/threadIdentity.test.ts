import { describe, expect, it } from "vite-plus/test";
import { projectIdentityGlyph, threadActivityLine } from "./threadIdentity.ts";

describe("chat identity", () => {
  it("gives projects stable identities without needing an AI request", () => {
    expect(projectIdentityGlyph("Leonidas AIOS")).toBe("🧠");
    expect(projectIdentityGlyph("Scribe")).toBe("✍️");
    expect(projectIdentityGlyph("  orchard  ")).toBe(projectIdentityGlyph("ORCHARD"));
  });
  it("shows actual progress, gives attention priority, and clears finished work", () => {
    const summary = {
      text: "Check\n narrow layout",
      currentStep: 2,
      completedSteps: 1,
      totalSteps: 4,
    };
    expect(threadActivityLine({ status: "working", summary })).toEqual({
      text: "Check narrow layout",
      progress: "2/4",
    });
    expect(threadActivityLine({ status: "approval", summary })).toEqual({
      text: "Needs your approval",
      progress: null,
    });
    expect(threadActivityLine({ status: "ready", summary })).toBeNull();
    expect(threadActivityLine({ status: "working" })).toEqual({
      text: "Working on this task",
      progress: null,
    });
  });
});
