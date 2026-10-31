import { defineSlots } from "../twoState/slots";
import { GoalsWidget, RecentActivityWidget } from "./ActivityWidgets";
import { NeedsYouWidget, RunningWidget, UpNextWidget } from "./ActionWidgets";
import { ReleaseStatusWidget } from "./ReleaseStatusWidget";
import { DonePerDayWidget, MemoryWidget, OpenTasksWidget, PrioritiesWidget } from "./NumberWidgets";

/**
 * The number-first widgets of the Command Center home. They sit right after the setup card
 * (order 10) and before every older card, and the outlet lays them out in one masonry grid.
 */
export const slots = defineSlots({
  ccHome: [
    { id: "cc-needs-you", order: 11, widget: true, Component: NeedsYouWidget },
    { id: "cc-running", order: 12, widget: true, Component: RunningWidget },
    { id: "cc-up-next", order: 13, widget: true, Component: UpNextWidget },
    { id: "cc-priorities", order: 14, widget: true, Component: PrioritiesWidget },
    { id: "cc-open-tasks", order: 15, widget: true, Component: OpenTasksWidget },
    { id: "cc-memory", order: 16, widget: true, Component: MemoryWidget },
    { id: "cc-done-per-day", order: 17, widget: true, Component: DonePerDayWidget },
    { id: "cc-recent-activity", order: 18, widget: true, Component: RecentActivityWidget },
    { id: "cc-goals", order: 19, widget: true, Component: GoalsWidget },
    { id: "cc-release-status", order: 20, widget: true, Component: ReleaseStatusWidget },
  ],
});
