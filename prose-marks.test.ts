import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { headingText, pageProse, trackedPages } from "./prose.test.helpers.ts";

/** A colon before a space or line end, a semicolon, or a full-width colon or semicolon. */
const MARK = /:(?=\s|$)|[;：；]/u;

type MarkKind = "frontmatter" | "heading" | "sentence";

interface MarkedLine {
  readonly kind: MarkKind;
  readonly line: number;
  readonly text: string;
}

interface Finding extends MarkedLine {
  readonly file: string;
}

/** Every front matter title or description, heading, and prose line of a page that holds a mark. */
function markedLines(source: string): readonly MarkedLine[] {
  const { fields, rawLines, prose } = pageProse(source);
  const frontmatter = fields
    .filter((field): boolean => MARK.test(field.value))
    .map((field): MarkedLine => ({ kind: "frontmatter", line: field.line, text: field.rawLine }));
  const body = prose.split("\n").flatMap((text, index): MarkedLine[] =>
    MARK.test(text)
      ? [
          {
            kind: headingText(text) === undefined ? "sentence" : "heading",
            line: index + 1,
            text: (rawLines[index] ?? "").trim(),
          },
        ]
      : [],
  );
  return [...frontmatter, ...body];
}

const FINDINGS: readonly Finding[] = trackedPages().flatMap((file): Finding[] =>
  markedLines(readFileSync(file, "utf8")).map((marked): Finding => ({ ...marked, file })),
);

function report(include: (finding: Finding) => boolean): readonly string[] {
  return FINDINGS.filter(include).map(
    (finding): string => `${finding.file}:${finding.line} ${finding.text}`,
  );
}

describe("Prose marks", (): void => {
  it.each([
    {
      name: "a colon before a space",
      source: "Run these checks: lint and test.\n",
      kinds: ["sentence"],
    },
    { name: "a colon at a line end", source: "Run these checks:\n", kinds: ["sentence"] },
    { name: "a semicolon", source: "Keep it short; split it.\n", kinds: ["sentence"] },
    { name: "a full-width colon", source: "使用方法：手順\n", kinds: ["sentence"] },
    { name: "a full-width semicolon", source: "短く；分ける\n", kinds: ["sentence"] },
    { name: "a bold label", source: "**Note:** keep it short.\n", kinds: ["sentence"] },
    { name: "a heading", source: "## Step 1: install\n", kinds: ["heading"] },
    {
      name: "a front matter title",
      source: '---\ntitle: "Xquik: docs"\n---\n',
      kinds: ["frontmatter"],
    },
    {
      name: "a front matter description",
      source: "---\ndescription: Read; write\n---\n",
      kinds: ["frontmatter"],
    },
    {
      name: "other front matter keys",
      source: '---\nkeywords: ["a: b"]\nmetadata:\n  version: 1\n---\n',
      kinds: [],
    },
    { name: "inline code", source: "Send `x-api-key: xq_key` or `a;b`.\n", kinds: [] },
    { name: "fenced code", source: "Run this.\n\n```yaml\nkey: value\n```\n", kinds: [] },
    {
      name: "component props",
      source: '<Card title="Step 1: install" href="/a;b">\nRead it.\n</Card>\n',
      kinds: [],
    },
    { name: "JSX expressions", source: "{/* note: hidden */}\nRead it.\n", kinds: [] },
    { name: "MDX imports", source: 'import Note from "/snippets/note.mdx";\n', kinds: [] },
    { name: "link targets", source: "Read [the guide](https://example.com/a;b).\n", kinds: [] },
    { name: "link definitions", source: "[guide]: https://example.com/guide\n", kinds: [] },
    { name: "bare URLs", source: "Open https://example.com/a;b today.\n", kinds: [] },
    { name: "times", source: "It runs at 09:30 UTC.\n", kinds: [] },
    { name: "HTML entities", source: "Use&nbsp;spaces.\n", kinds: [] },
    { name: "colons inside words", source: "Search from:xquik since:2026-01-01.\n", kinds: [] },
  ])("classifies $name", ({ source, kinds }): void => {
    expect.assertions(1);

    expect(markedLines(source).map((marked): MarkKind => marked.kind)).toStrictEqual(kinds);
  });

  it("writes front matter titles and descriptions without colons or semicolons", (): void => {
    expect.assertions(1);

    expect(report((finding): boolean => finding.kind === "frontmatter")).toStrictEqual([]);
  });

  it("writes headings without colons or semicolons", (): void => {
    expect.assertions(1);

    expect(report((finding): boolean => finding.kind === "heading")).toStrictEqual([]);
  });

  it("writes sentences without colons or semicolons", (): void => {
    expect.assertions(1);

    expect(report((finding): boolean => finding.kind === "sentence")).toStrictEqual([]);
  });
});
