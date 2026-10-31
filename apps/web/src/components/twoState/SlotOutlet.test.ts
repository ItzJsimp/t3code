import { describe, expect, it } from "vite-plus/test";

import { slotRegistry } from "./SlotOutlet";

describe("slotRegistry", () => {
  it("finds the built-in home cards through the *.slot.tsx glob, widgets first", () => {
    const ids = slotRegistry.ccHome.map((entry) => entry.id);
    // The setup card, then the 9 number-first widgets, then the older cards.
    expect(ids.slice(0, 4)).toEqual(["finish-setup", "cc-needs-you", "cc-running", "cc-up-next"]);
    expect(slotRegistry.ccHome.filter((entry) => entry.widget)).toHaveLength(10);
    expect(ids).not.toContain("goal-progress");
    // 3 older built-in cards, the 9 widgets and the Marketing plug-in card.
    expect(slotRegistry.ccHome).toHaveLength(14);
    expect(ids).toContain("marketing-needs-approval");
    expect(slotRegistry.headerStat.map((entry) => entry.id)).toContain("marketing-needs-approval");
  });
});
