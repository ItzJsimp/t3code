import { AuthReleaseReadScope } from "@t3tools/contracts";
import { useEffect, useRef } from "react";

import { usePrimaryEnvironmentId } from "~/state/environments";
import { useEnvironmentQuery } from "~/state/query";
import { releaseStatusQuery } from "~/state/releaseStatus";
import { useEnvironmentScope } from "~/state/session";

import { toastManager } from "../ui/toast";
import { nextPollMs, releaseEvents, runStates } from "./releaseStatus.logic";

const OUTCOME_TITLE = {
  success: "Release build finished",
  failed: "Release build failed",
  cancelled: "Release build was cancelled",
} as const;

/**
 * Polls the release runs and shows one toast when a run ends. It is the only poller: the card
 * reads the same query. Mounted at the root, so the toast shows on any page. Renders nothing
 * unless the session holds `release:read`.
 */
export function ReleaseStatusWatcher() {
  const environmentId = usePrimaryEnvironmentId();
  const allowed = useEnvironmentScope(environmentId, AuthReleaseReadScope);
  const query = useEnvironmentQuery(
    allowed && environmentId ? releaseStatusQuery({ environmentId, input: {} }) : null,
  );
  const runs = query.data?.runs ?? null;
  const seen = useRef<ReturnType<typeof runStates> | null>(null);

  useEffect(() => {
    if (runs === null) return;
    for (const event of releaseEvents(seen.current, runs)) {
      toastManager.add({
        type: event.outcome === "failed" ? "error" : "success",
        title: OUTCOME_TITLE[event.outcome],
        description: event.title,
      });
    }
    seen.current = runStates(runs);
  }, [runs]);

  const { refresh } = query;
  const pollMs = runs === null ? null : nextPollMs(runs);
  useEffect(() => {
    if (pollMs === null) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs, refresh]);

  return null;
}
