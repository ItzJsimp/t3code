import { AuthReleaseReadScope, type ReleaseRun } from "@t3tools/contracts";
import { CheckCircle2Icon, CircleDashedIcon, LoaderIcon, XCircleIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { usePrimaryEnvironmentId } from "~/state/environments";
import { useEnvironmentQuery } from "~/state/query";
import { releaseStatusQuery } from "~/state/releaseStatus";
import { useEnvironmentScope } from "~/state/session";

import { HomeWidget, WidgetEmpty, WidgetError, WidgetList, WidgetSkeleton } from "./HomeWidget";

const STATE_LABEL = {
  running: "Building",
  success: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
} as const;

function StateIcon({ state }: { readonly state: ReleaseRun["state"] }) {
  const cls = "size-4 shrink-0";
  if (state === "running") return <LoaderIcon aria-hidden className={cn(cls, "animate-spin")} />;
  if (state === "success")
    return <CheckCircle2Icon aria-hidden className={cn(cls, "text-success")} />;
  if (state === "failed")
    return <XCircleIcon aria-hidden className={cn(cls, "text-destructive")} />;
  return <CircleDashedIcon aria-hidden className={cn(cls, "text-muted-foreground")} />;
}

function RunRow({ run }: { readonly run: ReleaseRun }) {
  return (
    <li className="grid gap-1 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <StateIcon state={run.state} />
        <span className="min-w-0 truncate text-sm font-medium">{run.title}</span>
        <span
          className={cn(
            "ml-auto shrink-0 text-xs font-medium",
            run.state === "failed" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {STATE_LABEL[run.state]}
        </span>
      </div>
      {run.lastStep !== null ? (
        <p className="truncate pl-6 text-xs text-muted-foreground">
          {run.state === "failed" ? "Failed at" : run.state === "running" ? "Now" : "Last step"}:{" "}
          {run.lastStep}
        </p>
      ) : null}
    </li>
  );
}

/** Release builds, newest first. Only a session with `release:read` sees this card. */
export function ReleaseStatusWidget() {
  const environmentId = usePrimaryEnvironmentId();
  const allowed = useEnvironmentScope(environmentId, AuthReleaseReadScope);
  const query = useEnvironmentQuery(
    allowed && environmentId ? releaseStatusQuery({ environmentId, input: {} }) : null,
  );
  if (!allowed) return null;

  const data = query.data;
  return (
    <HomeWidget title="Release builds" count={data ? `latest ${data.runs.length}` : undefined}>
      {data === null ? (
        query.error ? (
          <WidgetError message="The release builds could not be read." onRetry={query.refresh} />
        ) : (
          <WidgetSkeleton />
        )
      ) : data.error !== null ? (
        <WidgetError message={`GitHub could not be read: ${data.error}`} onRetry={query.refresh} />
      ) : data.runs.length === 0 ? (
        <WidgetEmpty>No release builds yet.</WidgetEmpty>
      ) : (
        <WidgetList>
          {data.runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </WidgetList>
      )}
    </HomeWidget>
  );
}
