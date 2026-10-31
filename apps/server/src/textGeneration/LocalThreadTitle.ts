import { sanitizeThreadTitle } from "@t3tools/provider-core/server/textGenerationUtils";

const OLLAMA_GENERATE_URL = "http://127.0.0.1:11434/api/generate";
const LOCAL_TITLE_TIMEOUT_MS = 8_000;
const MAX_LOCAL_TITLE_LENGTH = 60;

/**
 * Ask a local Ollama model for a thread title. This costs no account usage.
 * Any failure returns null so the caller can fall back to the cloud model.
 */
export async function generateLocalThreadTitle(input: {
  readonly model: string;
  readonly prompt: string;
  readonly fetcher?: typeof fetch;
  readonly signal?: AbortSignal;
}): Promise<string | null> {
  const signal = AbortSignal.any([
    AbortSignal.timeout(LOCAL_TITLE_TIMEOUT_MS),
    ...(input.signal ? [input.signal] : []),
  ]);
  try {
    const response = await (input.fetcher ?? fetch)(OLLAMA_GENERATE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal,
      body: JSON.stringify({
        model: input.model,
        stream: false,
        think: false,
        keep_alive: "5m",
        options: { num_predict: 48, temperature: 0.2 },
        format: {
          type: "object",
          properties: { title: { type: "string" }, needsRefinement: { type: "boolean" } },
          required: ["title"],
        },
        prompt: input.prompt,
      }),
    });
    if (!response.ok) return null;
    const output = (await response.json()) as { response?: string };
    const parsed = JSON.parse(output.response ?? "null") as {
      title?: unknown;
      needsRefinement?: unknown;
    } | null;
    // A model that says the subject is unknown needs a stronger model.
    if (!parsed || typeof parsed.title !== "string" || parsed.needsRefinement === true) {
      return null;
    }
    // The sanitizer cuts long titles, so judge the raw length: a rambling local model goes to the cloud.
    if (parsed.title.trim().length > MAX_LOCAL_TITLE_LENGTH) return null;
    const title = sanitizeThreadTitle(parsed.title);
    return title === "New thread" ? null : title;
  } catch {
    return null;
  }
}
