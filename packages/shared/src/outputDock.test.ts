import { describe, expect, it } from "vite-plus/test";
import { parseOutputDock, replyStatusOf } from "./outputDock.ts";

const reply = `🎯 **Focus:** \`Code\` · **Step:** \`Build\`

Built it.
---
### 🎯 TL;DR
- Ready.
### ⚡ Immediate Next Actions
- [ ] 🤖 **Leonidas:** Run tests.
- [x] 👤 **You:** Review changes.
### ❓ Input & Decisions Needed
- **A)** Keep it. *(Wins when: simple)*
- **B)** Extend it. *(Wins when: needed)*
➡️ **Recommended: A** · Smallest change.
💬 Quick Replies: "Keep it" | "Extend it"`;

describe("output Dock", () => {
  it("separates body and ordered sections and preserves action ownership", () => {
    const dock = parseOutputDock(reply)!;
    expect(dock.body).toContain("Built it.");
    expect(dock.body).not.toContain("TL;DR");
    expect(dock.sections.map((s) => s.kind)).toEqual(["summary", "actions", "decisions"]);
    // Old replies keep their Next Actions as plain lines, never checkboxes.
    expect(dock.sections[1]!.items).toEqual([
      { kind: "markdown", text: "- 🤖 **Leonidas:** Run tests.\n- 👤 **You:** Review changes." },
    ]);
    expect(dock.sections[2]!.items.map((i) => i.kind)).toEqual([
      "option",
      "option",
      "markdown",
      "replies",
    ]);
    expect(dock.sections[2]!.items.at(-1)).toEqual({
      kind: "replies",
      replies: ["Keep it", "Extend it"],
    });
  });
  it("makes an option reply a full sentence, not a bare letter", () => {
    const dock = parseOutputDock(
      reply.replace("- **A)** Keep it.", "- **A)** **Vitest:** Jest-like API, fast."),
    )!;
    const [first, second] = dock.sections[2]!.items;
    expect(first).toMatchObject({
      kind: "option",
      letter: "A",
      reply: "Option A: Vitest",
    });
    expect(second).toMatchObject({ letter: "B", reply: "Option B: Extend it" });
  });
  it("handles CRLF, omitted sections and completion", () => {
    expect(parseOutputDock(reply.replaceAll("\n", "\r\n"))?.sections).toEqual(
      parseOutputDock(reply)?.sections,
    );
    expect(
      parseOutputDock(
        "Done\n---\n### 🎯 TL;DR\n- Done\n### 🏁 Session Complete\n✅ Objective achieved",
      )?.sections[1]?.kind,
    ).toBe("complete");
  });
  it("keeps quoted headings inside fences as ordinary Markdown", () => {
    expect(parseOutputDock("```md\n" + reply + "\n```")).toBeNull();
    expect(parseOutputDock("~~~md\n" + reply + "\n~~~")).toBeNull();
  });
  it.each([
    "",
    "hello",
    reply.replace("### 🎯 TL;DR", "### Summary"),
    reply.replace("### ❓ Input & Decisions Needed", "### Other"),
    reply + "\n### New topic\nmore",
    reply.replace("### ⚡ Immediate Next Actions", "### 🎯 TL;DR"),
  ])("falls back for incomplete or malformed Docks", (text) => {
    expect(parseOutputDock(text)).toBeNull();
  });
  it("keeps action examples inside code fences inert", () => {
    const dock = parseOutputDock(
      "Body\n### 🎯 TL;DR\n- Ready\n### ⚡ Immediate Next Actions\n```md\n- [ ] 🤖 **Leonidas:** Do not run\n``` ",
    )!;
    expect(dock.sections[1]!.items.map((i) => i.kind)).toEqual(["markdown"]);
  });
  it("keeps shorter and different fence markers inside a longer example inert", () => {
    const dock = parseOutputDock(
      "Body\n### 🎯 TL;DR\n- Ready\n### ⚡ Immediate Next Actions\n\n````md\n```\n~~~\n- [ ] 🤖 **Leonidas:** Do not run\n`````\n- [ ] 👤 **You:** Review",
    )!;
    const item = dock.sections[1]!.items[0]!;
    // The fenced example stays as written; only the real line loses its checkbox.
    expect(item).toMatchObject({ kind: "markdown" });
    expect(item.kind === "markdown" && item.text).toContain("- [ ] 🤖 **Leonidas:** Do not run");
    expect(item.kind === "markdown" && item.text).toMatch(/\n- 👤 \*\*You:\*\* Review$/);
  });
});

describe("slim Dock", () => {
  it("keeps an old Assumed line as text and allows a Dock with only a TL;DR", () => {
    const dock = parseOutputDock(
      'Done. Your site is live.\n---\n### 🎯 TL;DR\n- Open index.html to see it.\n🔁 Assumed: "Blue theme" | "One page"',
    )!;
    expect(dock.sections.map((s) => s.kind)).toEqual(["summary"]);
    expect(dock.sections[0]!.items).toEqual([
      {
        kind: "markdown",
        text: '- Open index.html to see it.\n🔁 Assumed: "Blue theme" | "One page"',
      },
    ]);
  });

  it("keeps the step of a Continue option in its reply", () => {
    const dock = parseOutputDock(
      "Built.\n---\n### 🎯 TL;DR\n- Ready.\n### ❓ Input & Decisions Needed\n- **A)** Continue: run the web tests. *(Wins when: you trust it)*\n- **B)** Stop here.",
    )!;
    expect(dock.sections[1]!.items[0]).toMatchObject({
      kind: "option",
      reply: "Option A: Continue: run the web tests",
    });
  });

  it("turns the next best move of a finished session into a Start item", () => {
    const dock = parseOutputDock(
      "Shipped.\n---\n### 🎯 TL;DR\n- Live.\n### 🏁 Session Complete\n✅ Done. Next best move: retire jake.md.",
    )!;
    expect(dock.sections[1]!.items).toEqual([
      {
        kind: "start",
        text: "✅ Done. Next best move: retire jake.md.",
        reply: "Start: retire jake.md",
      },
    ]);
  });

  it("keeps an unquoted Assumed line as Markdown", () => {
    const dock = parseOutputDock("Done.\n---\n### 🎯 TL;DR\n- Ready.\n🔁 Assumed: blue theme")!;
    expect(dock.sections[0]!.items.map((i) => i.kind)).toEqual(["markdown"]);
  });
});

describe("status bar", () => {
  const withStatus = (line: string) => `${line}\n\nBuilt it.\n---\n### 🎯 TL;DR\n- Ready.`;

  it("lifts an exact first line out of the body", () => {
    const dock = parseOutputDock(withStatus("✅ Done · 🧠 None · 📍 Reply styles: step 2 of 7"))!;
    expect(dock.status).toEqual({
      state: "done",
      attention: "none",
      place: "Reply styles: step 2 of 7",
    });
    expect(dock.body).toBe("Built it.");
  });

  it("accepts every state, the variation selector and a missing place", () => {
    expect(parseOutputDock(withStatus("⏸️ Need you · 🧠 Glance"))!.status).toEqual({
      state: "need-you",
      attention: "glance",
    });
    expect(parseOutputDock(withStatus("❌ Blocked · 🧠 Think · 📍 Release"))!.status).toMatchObject(
      { state: "blocked", attention: "think" },
    );
  });

  it.each(["✅ Finished · 🧠 None", "Done · 🧠 None", "✅ Done · 🧠 Maybe", "Built it."])(
    "leaves a line in any other form in the body: %s",
    (line) => {
      const dock = parseOutputDock(withStatus(line))!;
      expect(dock.status).toBeUndefined();
      expect(dock.body.startsWith(line)).toBe(true);
    },
  );
});

describe("replyStatusOf", () => {
  it("reads the state from the first line of a reply", () => {
    expect(replyStatusOf("✅ Done · 🧠 None · 📍 Shipped\n\nBody")).toBe("done");
    expect(replyStatusOf("⏸️ Need you · 🧠 Glance\n\nBody")).toBe("need-you");
    expect(replyStatusOf("❌ Blocked · 🧠 Think\n\nBody")).toBe("blocked");
  });

  it("returns null for plain replies and for a status line that is not first", () => {
    expect(replyStatusOf("Just an answer")).toBeNull();
    expect(replyStatusOf("Intro\n✅ Done · 🧠 None")).toBeNull();
    expect(replyStatusOf("")).toBeNull();
  });
});
