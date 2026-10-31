import { TextGenerationError } from "@t3tools/contracts";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const isTextGenerationError = Schema.is(TextGenerationError);
const decodeJsonThreadTitle = Schema.decodeOption(
  Schema.fromJsonString(Schema.Struct({ title: Schema.String })),
);

/** Convert an Effect Schema to a flat JSON Schema object, inlining `$defs` when present. */
export function toJsonSchemaObject(schema: Schema.Top): unknown {
  // The type side, so decoding defaults do not turn required fields into
  // optional ones, and closed objects (`additionalProperties: false`):
  // structured-output modes require both, and closed was the generator
  // default before effect rc.113.
  const document = Schema.toJsonSchemaDocument(Schema.toType(schema), {
    onExcessProperty: "error",
  });
  if (document.definitions && Object.keys(document.definitions).length > 0) {
    return { ...document.schema, $defs: document.definitions };
  }
  return document.schema;
}

/** Truncate a text section to `maxChars`, appending a `[truncated]` marker when needed. */
export function limitSection(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  const truncated = value.slice(0, maxChars);
  return `${truncated}\n\n[truncated]`;
}

/** Normalise a raw commit subject to imperative-mood, ≤72 chars, no trailing period. */
export function sanitizeCommitSubject(raw: string): string {
  const singleLine = raw.trim().split(/\r?\n/g)[0]?.trim() ?? "";
  const withoutTrailingPeriod = singleLine.replace(/[.]+$/g, "").trim();
  if (withoutTrailingPeriod.length === 0) {
    return "Update project files";
  }

  if (withoutTrailingPeriod.length <= 72) {
    return withoutTrailingPeriod;
  }
  return withoutTrailingPeriod.slice(0, 72).trimEnd();
}

/** Normalise a raw PR title to a single line with a sensible fallback. */
export function sanitizePrTitle(raw: string): string {
  const singleLine = raw.trim().split(/\r?\n/g)[0]?.trim() ?? "";
  if (singleLine.length > 0) {
    return singleLine;
  }
  return "Update project changes";
}

// Chat names are 3 to 5 words and at most 35 characters. The prompts ask for it; this enforces it.
const MAX_THREAD_TITLE_CHARS = 35;
const MAX_THREAD_TITLE_WORDS = 5;

/** Normalise a raw thread title to a single line of at most 5 words and 35 characters. */
export function sanitizeThreadTitle(raw: string): string {
  // Unwrap a JSON-formatted title before truncation can cut off the closing brace.
  const decoded = decodeJsonThreadTitle(raw);
  const title = Option.isSome(decoded) ? decoded.value.title : raw;
  const normalized = title
    .trim()
    .split(/\r?\n/g)[0]
    ?.trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized || normalized.trim().length === 0) {
    return "New thread";
  }

  // Whole words only: keep up to 5 words, then drop trailing words until 35 characters fit.
  const kept = normalized.split(" ").slice(0, MAX_THREAD_TITLE_WORDS);
  while (kept.length > 1 && kept.join(" ").length > MAX_THREAD_TITLE_CHARS) kept.pop();
  return kept.join(" ").slice(0, MAX_THREAD_TITLE_CHARS).trimEnd();
}

/** CLI name to human-readable label, e.g. "codex" → "Codex CLI (`codex`)" */
function cliLabel(cliName: string): string {
  const capitalized = cliName.charAt(0).toUpperCase() + cliName.slice(1);
  return `${capitalized} CLI (\`${cliName}\`)`;
}

/**
 * Normalize an unknown error from a CLI text generation process into a
 * typed `TextGenerationError`. Parameterized by CLI name so both Codex
 * and Claude (and future providers) can share the same logic.
 */
export function normalizeCliError(
  cliName: string,
  operation: string,
  error: unknown,
  fallback: string,
): TextGenerationError {
  if (isTextGenerationError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    if (
      error.message.includes(`Command not found: ${cliName}`) ||
      lower.includes(`spawn ${cliName}`) ||
      lower.includes("enoent")
    ) {
      return new TextGenerationError({
        operation,
        detail: `${cliLabel(cliName)} is required but not available on PATH.`,
        cause: error,
      });
    }
    return new TextGenerationError({
      operation,
      detail: fallback,
      cause: error,
    });
  }

  return new TextGenerationError({
    operation,
    detail: fallback,
    cause: error,
  });
}

const BARE_ACKNOWLEDGEMENT =
  /^(?:yes|yep|yeah|ok(?:ay)?|sure|no|thanks|thank you|go ahead|continue|do it|ship it|sounds good|looks good)[.!\s]*$/i;
const MAX_PROMPT_SUGGESTION_CHARS = 280;
const SUGGESTION_PLACEHOLDER =
  /\.{3}|\u2026|\b(?:TBD|TODO)\b|\{\{[^}]*\}\}|<(?:placeholder|insert\b|result\b|your\b)[^>]*>|\[(?:insert\b|placeholder\b|result\b|your\b)[^\]]*\]/i;
// These predictions offer a next request, never a report of an unobserved manual test.
// Keep this scoped to declarative clauses so requests such as "check why tests failed" survive.
const SUGGESTION_RESULT_REPORT =
  /(?:^|[.!?]\s+)(?:i(?:['\u2019]ve| have)?\s+(?:clicked|pressed|ran|run|tested|verified|checked|got|saw|observed|confirmed|tried|accepted|undid)\b|(?:all\s+|the\s+)?tests?\s+(?:passed|failed|pass|fail)\b|(?:tab|ctrl\+z|undo)\s+(?:inserted|accepted|removed|worked|failed)\b|it\s+(?:worked|passed|failed)\b)/i;

/** Normalise a predicted user message to one plain line, or null when it is not worth offering. */
export function sanitizePromptSuggestion(raw: string, draft = ""): string | null {
  if (draft) {
    if (!raw.startsWith(draft)) return null;
    const suffix = raw.slice(draft.length);
    if (SUGGESTION_PLACEHOLDER.test(suffix) || SUGGESTION_RESULT_REPORT.test(suffix.trimStart()))
      return null;
    const clean = suffix.replace(/\s+/g, " ");
    return clean.length > 0 && clean.length <= MAX_PROMPT_SUGGESTION_CHARS ? draft + clean : null;
  }
  if (SUGGESTION_PLACEHOLDER.test(raw)) return null;
  const text = raw
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
  if (
    text.length < 8 ||
    BARE_ACKNOWLEDGEMENT.test(text) ||
    SUGGESTION_PLACEHOLDER.test(text) ||
    SUGGESTION_RESULT_REPORT.test(text)
  )
    return null;
  if (text.length <= MAX_PROMPT_SUGGESTION_CHARS) return text;
  const head = text.slice(0, MAX_PROMPT_SUGGESTION_CHARS);
  const lastSentence = Math.max(
    head.lastIndexOf(". "),
    head.lastIndexOf("? "),
    head.lastIndexOf("! "),
  );
  return lastSentence >= 40
    ? head.slice(0, lastSentence + 1)
    : head.slice(0, head.lastIndexOf(" ")).trimEnd();
}
