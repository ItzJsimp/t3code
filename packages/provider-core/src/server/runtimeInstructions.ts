import * as DateTime from "effect/DateTime";
import { EFFICIENT_AGENT_RULES } from "./efficientAgentRules.ts";
import { HARNESS_AWARENESS } from "./harnessAwareness.ts";
import { effectiveAiLevel, type AiLevel } from "@t3tools/contracts";
import { leonidasOutputStandard } from "./outputStandard.ts";
import { PONYTAIL_RULES } from "./ponytailRules.ts";
import { SKILL_ROUTING_INSTRUCTIONS } from "./skillRouting.ts";
import {
  actFirstQuestionInstructions,
  USER_QUESTION_INSTRUCTIONS,
} from "./userQuestionInstructions.ts";

export { QUESTION_BUDGET_REPLY, questionBudgetAllows } from "./userQuestionInstructions.ts";

const PULL_REQUEST_LINKING_INSTRUCTIONS = `<pull_request_linking>
Link each PR you create, take over, or push to: one link_pull_request per PR, full URL, every stack layer, as your next call. Host tools do not link for you. If linking fails, say so. Skip PRs you only read or review, and PRs named only as background. Call watch_pull_request when asked to monitor or babysit, or when work you were asked to do, such as a merge, still waits on checks or reviews, even after an earlier unwatch. Finish any needed branch update and push first, then watch and end your turn. Otherwise act now or hand back. Delegated children never watch, even if the brief says babysit. After PR work, a child's last line is: PR <full URL>, head <SHA>, checks and reviews <state>. Links and watches persist across pushes. Never wait with sleep, loops, gh --watch, Monitor, or ScheduleWakeup. Before handback, call unwatch_pull_request on any PR you watch.
</pull_request_linking>`;

const WAITING_INSTRUCTIONS = `<waiting_handoff>
Leonidas Code shows the user when you are waiting on a shell command, a subagent, an app tool or a web call, and what it is. When such a wait ends and you continue, open your next message with one short line naming what finished and that you are carrying on, for example "The test run finished; continuing with the fix." Say it once per wait, not per tool call, and skip it for instant reads and searches.
</waiting_handoff>`;

// shortcut: one level per server process (the install's setting); per-user levels need a session field.
let aiLevelSetting: { readonly level: AiLevel; readonly since: string } = {
  level: "new",
  since: "",
};

/** The server calls this on start and on every settings change. */
let sharedBrowserAccess = false;

/** Updated with the server's environment settings snapshot. */
export function setSharedBrowserAccess(enabled: boolean): void {
  sharedBrowserAccess = enabled;
}

const SHARED_BROWSER_INSTRUCTIONS = `<shared_browser>
For sites that need the user's website logins, such as "open my Whop course", call preview_status and select the Shared browser profile. Pass profileId="leonidas-shared-browser" and reuseExistingTab=false to preview_open. Provider accounts share saved website logins in that environment. Keep development servers and public pages in ordinary Preview profiles. The user signs in once inside the shared profile; pause for passwords, MFA, or CAPTCHA. If the profile is not listed, report that shared access is off or unavailable. Ask before any action that buys, posts, or sends. Respect human tab ownership and use your own tab for actions.
</shared_browser>`;

export function setAiLevelSetting(level: AiLevel, since: string): void {
  aiLevelSetting = { level, since };
}

/** The level in force on `today` (local YYYY-MM-DD), after the day-30 step up. */
export function activeAiLevel(
  today: string = DateTime.formatIsoDate(
    DateTime.makeZonedUnsafe(DateTime.nowUnsafe(), { timeZone: DateTime.zoneMakeLocal() }),
  ),
): AiLevel {
  return effectiveAiLevel(aiLevelSetting.level, aiLevelSetting.since, today);
}

/**
 * Shared runtime context; omit model and effort when the harness manages them dynamically.
 * `modelName` is the display name users see in the model picker; `model` is the slug.
 */
export function buildRuntimeInstructions(runtime: {
  readonly harness: string;
  readonly model?: string | undefined;
  readonly modelName?: string | undefined;
  readonly reasoningEffort?: string | undefined;
  /** True when the Ponytail plugin already injects the rules for this instance. */
  readonly ponytailPlugin?: boolean | undefined;
  /** Defaults to the install's active level. */
  readonly aiLevel?: AiLevel | undefined;
  /** Reply style body from `runtimePolicy.replyStyle`; defaults to the shipped Leonidas style. */
  readonly replyStyle?: string | undefined;
}): string {
  const level = runtime.aiLevel ?? activeAiLevel();
  const builder = level === "builder";
  const harness = toSingleLine(runtime.harness);
  const model = toSingleLine(runtime.model ?? "");
  const modelName = toSingleLine(runtime.modelName ?? "");
  const effort = toSingleLine(runtime.reasoningEffort ?? "");
  const modelLabel =
    modelName && modelName !== model ? `${modelName} (model slug: ${model})` : model;
  const modelInfo = model && model !== "auto" && model !== "default" ? `, as ${modelLabel}` : "";
  const effortInfo = effort ? ` with ${effort} reasoning effort` : "";
  return `<runtime_info>In case you're asked: you are running in Leonidas Code through the ${harness} harness${modelInfo}${effortInfo}. No need to mention this otherwise. You can embed images, video, and audio in your response using Markdown image syntax with absolute file paths. Link any other file you produce using its absolute path so the user can open it in Leonidas Code's files viewer.</runtime_info>\n\n${PULL_REQUEST_LINKING_INSTRUCTIONS}\n\n${WAITING_INSTRUCTIONS}\n\n${EFFICIENT_AGENT_RULES}\n\n${SKILL_ROUTING_INSTRUCTIONS}\n\n${HARNESS_AWARENESS}\n\n${leonidasOutputStandard(runtime.replyStyle)}${
    runtime.ponytailPlugin
      ? ""
      : `

${PONYTAIL_RULES}`
  }

${builder ? USER_QUESTION_INSTRUCTIONS : actFirstQuestionInstructions(level === "comfortable")}${sharedBrowserAccess ? `\n\n${SHARED_BROWSER_INSTRUCTIONS}` : ""}`;
}

function toSingleLine(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}
