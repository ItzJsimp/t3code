export const DOCK_HEADINGS = {
  "### 🎯 TL;DR": "summary",
  "### ⚡ Immediate Next Actions": "actions",
  "### 🏁 Session Complete": "complete",
  "### ❓ Input & Decisions Needed": "decisions",
} as const;

type DockKind = (typeof DOCK_HEADINGS)[keyof typeof DOCK_HEADINGS];
export type DockItem =
  | { kind: "markdown"; text: string }
  | { kind: "option"; text: string; letter: string; reply: string }
  | { kind: "replies"; replies: string[] }
  /** The next best move of a finished session; its button fills the composer. */
  | { kind: "start"; text: string; reply: string };
export type DockSection = { kind: DockKind; heading: string; items: DockItem[] };
export type DockStatus = {
  state: "done" | "need-you" | "blocked";
  attention: "none" | "glance" | "think";
  place?: string;
};

/** Exact first line of a reply with a Dock: status, attention, then where the chat stands. */
const STATUS_BAR = /^(✅ Done|⏸️? Need you|❌ Blocked) · 🧠 (None|Glance|Think)(?: · 📍 (\S.*))?$/u;

function splitStatusBar(body: string): { body: string; status?: DockStatus } {
  const text = body.trimStart();
  const firstLine = text.split("\n", 1)[0]!;
  const match = STATUS_BAR.exec(firstLine.trim());
  if (!match) return { body };
  const status: DockStatus = {
    state: match[1]!.endsWith("Done")
      ? "done"
      : match[1]!.endsWith("Need you")
        ? "need-you"
        : "blocked",
    attention: match[2]!.toLowerCase() as DockStatus["attention"],
    ...(match[3] ? { place: match[3].trim() } : {}),
  };
  return { status, body: text.slice(firstLine.length).trim() };
}

/** State from the status bar on the first line of a reply, or null when it has none. */
export function replyStatusOf(text: string): DockStatus["state"] | null {
  return splitStatusBar(text).status?.state ?? null;
}

function fencedLineIndexes(lines: string[]) {
  const excluded = new Set<number>();
  let fence: { char: string; length: number } | null = null;
  for (const [index, line] of lines.entries()) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      excluded.add(index);
      if (!fence) fence = { char: marker[0]!, length: marker.length };
      else if (marker[0] === fence.char && marker.length >= fence.length && line.trim() === marker)
        fence = null;
    } else if (fence) excluded.add(index);
  }
  return { excluded, open: fence !== null };
}

export function withoutFencedCode(text: string) {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const { excluded } = fencedLineIndexes(lines);
  return lines.filter((_, index) => !excluded.has(index)).join("\n");
}

/** Only terminal, ordered exact-heading Docks become controls; other text stays Markdown. */
/** Short name of a Dock option: the text before its "Wins when" note and first colon or period. */
function optionTitle(text: string): string {
  const head = text.split(" *(")[0]!.replaceAll("**", "").trim();
  // A Continue option is only useful with the step it continues.
  if (/^Continue:\s/.test(head)) return head.replace(/[.\s]+$/, "");
  const title = head.split(/[:.](?:\s|$)/)[0]!.trim();
  return title || head;
}

/** `"a" | "b"` to ["a", "b"]; undefined when any part is not quoted. */
function quotedList(text: string): string[] | undefined {
  const values = text.split(/\s*\|\s*/).map((v) => /^["“](.+)["”]$/.exec(v.trim())?.[1]);
  return values.every((v): v is string => v !== undefined) ? values : undefined;
}

export function parseOutputDock(text: string) {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const headings: { index: number; kind: DockKind; heading: string }[] = [];
  const fenced = fencedLineIndexes(lines);
  let invalid = false;
  for (const [index, line] of lines.entries()) {
    if (fenced.excluded.has(index)) continue;
    const heading = line.trimEnd();
    if (Object.hasOwn(DOCK_HEADINGS, heading)) {
      headings.push({ index, heading, kind: DOCK_HEADINGS[heading as keyof typeof DOCK_HEADINGS] });
    } else if (headings.length > 0 && /^#{1,6} /.test(line)) invalid = true;
  }
  if (invalid || fenced.open || headings[0]?.kind !== "summary") return null;
  const order = { summary: 0, actions: 1, complete: 1, decisions: 2 };
  if (headings.some((h, i) => i > 0 && order[h.kind] <= order[headings[i - 1]!.kind])) return null;
  const sections: DockSection[] = [];
  for (const [i, h] of headings.entries()) {
    const contentLines = lines.slice(h.index + 1, headings[i + 1]?.index);
    const content = contentLines.join("\n").trim();
    if (!content) return null;
    const items: DockItem[] = [];
    let block: string[] = [];
    const flush = () => {
      const value = block.join("\n").trim();
      if (value) items.push({ kind: "markdown", text: value });
      block = [];
    };
    for (const [offset, line] of contentLines.entries()) {
      if (fenced.excluded.has(h.index + 1 + offset)) {
        block.push(line);
        continue;
      }
      // Old replies list Next Actions as task items; they now read as plain lines.
      const action = h.kind === "actions" ? /^- \[[ xX]\] ((?:🤖|👤) .+)$/.exec(line) : null;
      const option = h.kind === "decisions" ? /^- \*\*([A-Z])\)\*\* (.+)$/.exec(line) : null;
      const quick = h.kind === "decisions" ? /^💬 Quick Replies: (.+)$/.exec(line) : null;
      const move = h.kind === "complete" ? /Next best move:\s*(.+?)\.?\s*$/.exec(line) : null;
      if (action) block.push(`- ${action[1]}`);
      else if (move) {
        flush();
        items.push({ kind: "start", text: line.trim(), reply: `Start: ${move[1]}` });
      } else if (option) {
        flush();
        const letter = option[1]!;
        items.push({
          kind: "option",
          letter,
          reply: `Option ${letter}: ${optionTitle(option[2]!)}`,
          text: `**${letter})** ${option[2]}`,
        });
      } else if (quick) {
        const replies = quotedList(quick[1]!);
        if (replies) {
          flush();
          items.push({ kind: "replies", replies });
        } else block.push(line);
      } else if (items.at(-1)?.kind === "option" && /^\s+\S/.test(line)) {
        const item = items.at(-1)!;
        if (item.kind === "option") item.text += `\n${line}`;
      } else block.push(line);
    }
    flush();
    sections.push({ kind: h.kind, heading: h.heading.slice(4), items });
  }
  const { body, status } = splitStatusBar(
    lines
      .slice(0, headings[0]!.index)
      .join("\n")
      .replace(/\n---\s*$/, "")
      .trimEnd(),
  );
  return { body, sections, ...(status ? { status } : {}) };
}
