import { createEnvironmentRpcQueryAtomFamily } from "@t3tools/client-runtime/state/runtime";
import { WS_METHODS } from "@t3tools/contracts";

import { connectionAtomRuntime } from "../connection/runtime";

/** The newest release runs. The server refuses it without `release:read`. */
export const releaseStatusQuery = createEnvironmentRpcQueryAtomFamily(connectionAtomRuntime, {
  label: "environment-data:release-status:runs",
  tag: WS_METHODS.releaseStatusRuns,
  staleTimeMs: 10_000,
  idleTtlMs: 5 * 60_000,
});
