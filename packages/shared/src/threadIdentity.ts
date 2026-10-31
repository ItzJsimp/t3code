import type { OrchestrationV2ActivitySummary } from "@t3tools/contracts";

/** Stable visual fallback when a project has neither a favicon nor a chosen icon. */
export function projectIdentityGlyph(title: string): string {
  if (/\b(aios|ai|agent|model)\b/i.test(title)) return "🧠";
  if (/\b(scribe|write|notes|docs)\b/i.test(title)) return "✍️";
  if (/\b(web|site|browser)\b/i.test(title)) return "🌐";
  if (/\b(app|mobile|ios|android)\b/i.test(title)) return "📱";
  if (/\b(data|db|analytics)\b/i.test(title)) return "📊";
  const glyphs = ["🧩", "🌿", "🛰️", "🛠️", "📦", "🧭"];
  let seed = 0;
  for (const character of title.normalize("NFKC").trim().toLowerCase()) {
    seed = (seed * 31 + (character.codePointAt(0) ?? 0)) % glyphs.length;
  }
  return glyphs[seed]!;
}

/** Attention states outrank the current plan; finished chats carry no stale live step. */
export function threadActivityLine(input: {
  status: string;
  summary?: OrchestrationV2ActivitySummary | null | undefined;
}): { text: string; progress: string | null } | null {
  const attention: Record<string, string> = {
    approval: "Needs your approval",
    input: "Waiting for your answer",
    limited: "Paused at the account usage limit",
    failed: "Stopped after an error",
    waiting: "Waiting for background work",
  };
  const text = attention[input.status];
  if (text) return { text, progress: null };
  if (input.status !== "working") return null;
  const summary = input.summary;
  return {
    text: summary?.text.replace(/\s+/g, " ").trim() || "Working on this task",
    progress: summary?.currentStep ? `${summary.currentStep}/${summary.totalSteps}` : null,
  };
}
