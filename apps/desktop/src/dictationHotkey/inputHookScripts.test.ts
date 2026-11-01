import { describe, expect, it } from "@effect/vitest";

import { MAC_INPUT_HOOK_SCRIPT } from "./macInputHookScript.ts";
import { WINDOWS_INPUT_HOOK_SCRIPT } from "./windowsInputHookScript.ts";

// The Swift helper cannot run off a Mac, so this keeps it in step with the Windows helper:
// runDictationHotkey drives both through the same lines.
describe("input hook helper scripts", () => {
  it.each([
    ["Windows", WINDOWS_INPUT_HOOK_SCRIPT],
    ["macOS", MAC_INPUT_HOOK_SCRIPT],
  ])("%s helper speaks the shared line protocol", (_name, script) => {
    for (const word of ["config ", "mute down", "mute up", "quit", "ready", "error hook", "other"])
      expect(script).toContain(word);
    for (const trigger of ["toggle", "hold", "mouse"]) expect(script).toContain(`"${trigger}"`);
    expect(script).toMatch(/down /);
    expect(script).toMatch(/up /);
  });
});
