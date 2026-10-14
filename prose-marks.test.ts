import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Folders whose body sentences are still being rewritten. Their titles and
 * headings are checked like every other page. Remove a folder once its
 * sentences pass.
 */
const PENDING = ["guides", "api-reference", "snippets"] as const;

/** The adopted Contributor Covenant text stays verbatim. */
const VERBATIM_FILES = new Set<string>(["CODE_OF_CONDUCT.md"]);

const FRONTMATTER_KEYS = new Set<string>(["title", "sidebarTitle", "description"]);

/** A colon before a space or line end, a semicolon, or a full-width colon or semicolon. */
const MARK = /:(?=\s|$)|[;：；]/u;

type MarkKind = "frontmatter" | "heading" | "sentence";

interface MarkedLine {
  readonly kind: MarkKind;
  readonly line: number;
  readonly text: string;
}

interface PageSections {
  readonly body: string;
  readonly metadata: readonly string[];
}

function blankOut(text: string, start: number, end: number): string {
  return text.slice(0, start) + text.slice(start, end).replace(/[^\n]/gu, " ") + text.slice(end);
}

function blankOutPattern(text: string, pattern: RegExp): string {
  let result = text;
  for (const match of text.matchAll(pattern)) {
    result = blankOut(result, match.index, match.index + match[0].length);
  }
  return result;
}

/** The index after the `}` that closes the JSX expression opening at `start`, or -1. */
function expressionEnd(text: string, start: number): number {
  let depth = 0;
  let quote: string | undefined;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote !== undefined) {
      if (char === "\\") {
        index += 1;
      } else if (char === quote) {
        quote = undefined;
      }
    } else if (char === '"' || char === "'" || char === "`") {
      quote = char;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }
  return -1;
}

/** The index after the `>` that closes the JSX or HTML tag opening at `start`, or -1. */
function tagEnd(text: string, start: number): number {
  let quote: string | undefined;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (quote !== undefined) {
      if (char === quote) {
        quote = undefined;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "{") {
      const end = expressionEnd(text, index);
      if (end === -1) {
        return -1;
      }
      index = end - 1;
    } else if (char === ">") {
      return index + 1;
    }
  }
  return -1;
}

function blankOutTagsAndExpressions(text: string): string {
  let result = text;
  let index = 0;
  while (index < result.length) {
    const char = result[index];
    let end = -1;
    if (char === "<" && /[A-Za-z/!>]/u.test(result[index + 1] ?? "")) {
      end = tagEnd(result, index);
    } else if (char === "{") {
      end = expressionEnd(result, index);
    }
    if (end === -1) {
      index += 1;
    } else {
      result = blankOut(result, index, end);
      index = end;
    }
  }
  return result;
}

function blankOutFencedCode(body: string): string {
  let fence: string | undefined;
  return body
    .split("\n")
    .map((line): string => {
      const marker = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1];
      if (fence === undefined) {
        if (marker === undefined) {
          return line;
        }
        fence = marker;
        return "";
      }
      if (
        marker !== undefined &&
        marker.startsWith(fence.charAt(0)) &&
        marker.length >= fence.length &&
        line.trim() === marker
      ) {
        fence = undefined;
      }
      return "";
    })
    .join("\n");
}

/**
 * Blanks out everything that is not prose, keeping line breaks so line
 * numbers still match the page: fenced and inline code, MDX imports and
 * exports, comments, link targets and definitions, JSX and HTML tags with
 * their attributes, JSX expressions, URLs, entities, and emphasis. Times and
 * search operators pass on their own, since no space follows their colon.
 */
function proseOnly(body: string): string {
  let text = blankOutFencedCode(body);
  text = blankOutPattern(text, /^import\s.*\bfrom\s+["'][^"'\n]+["'];?[ \t]*$/gmu);
  text = blankOutPattern(text, /^export\s+(?:const|default|function|let)\s.*$/gmu);
  text = blankOutPattern(text, /<!--[\s\S]*?-->/gu);
  text = blankOutPattern(text, /(`+)[\s\S]*?\1/gu);
  text = blankOutPattern(text, /^ {0,3}\[[^\]\n]+\]:[ \t]+\S.*$/gmu);
  text = blankOutPattern(text, /\]\((?:[^()\s]|\([^()\s]*\))*\)/gu);
  text = blankOutTagsAndExpressions(text);
  text = blankOutPattern(text, /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>()[\]"'`]*/giu);
  text = blankOutPattern(text, /&(?:[a-z][a-z0-9]*|#\d+|#x[0-9a-f]+);/giu);
  return text.replace(/[*_]/gu, " ");
}

function pageSections(source: string): PageSections {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/u.exec(source);
  if (match === null) {
    return { body: source, metadata: [] };
  }
  const frontmatterLineBreaks = match[0].split("\n").length - 1;
  return {
    body: "\n".repeat(frontmatterLineBreaks) + source.slice(match[0].length),
    metadata: (match[1] ?? "").split("\n"),
  };
}

function markedFrontmatter(metadata: readonly string[]): readonly MarkedLine[] {
  return metadata.flatMap((text, index): MarkedLine[] => {
    const match = /^([A-Za-z]+):\s*(.*)$/u.exec(text);
    const value = (match?.[2] ?? "").replace(/^(["'])(.*)\1$/u, "$2");
    return FRONTMATTER_KEYS.has(match?.[1] ?? "") && MARK.test(value)
      ? [{ kind: "frontmatter", line: index + 2, text }]
      : [];
  });
}

/** Every front matter title or description, heading, and prose line of a page that holds a mark. */
function markedLines(source: string): readonly MarkedLine[] {
  const normalized = source.replace(/\r\n/gu, "\n");
  const { body, metadata } = pageSections(normalized);
  const lines = normalized.split("\n");
  const prose = proseOnly(body)
    .split("\n")
    .flatMap((text, index): MarkedLine[] =>
      MARK.test(text)
        ? [
            {
              kind: /^\s*#{1,6}\s/u.test(text) ? "heading" : "sentence",
              line: index + 1,
              text: (lines[index] ?? "").trim(),
            },
          ]
        : [],
    );
  return [...markedFrontmatter(metadata), ...prose];
}

function trackedPages(): readonly string[] {
  return execFileSync("git", ["ls-files", "--", "*.md", "*.mdx"], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter((file): boolean => !VERBATIM_FILES.has(file));
}

function pendingFolder(file: string): string | undefined {
  return PENDING.find((folder): boolean => file.startsWith(`${folder}/`));
}

function findings(kind: MarkKind, include: (file: string) => boolean): readonly string[] {
  return trackedPages()
    .filter(include)
    .flatMap((file): string[] =>
      markedLines(readFileSync(file, "utf8"))
        .filter((marked): boolean => marked.kind === kind)
        .map((marked): string => `${file}:${marked.line} ${marked.text}`),
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

    expect(findings("frontmatter", (): boolean => true)).toStrictEqual([]);
  });

  it("writes headings without colons or semicolons", (): void => {
    expect.assertions(1);

    expect(findings("heading", (): boolean => true)).toStrictEqual([]);
  });

  it("writes sentences without colons or semicolons outside pending folders", (): void => {
    expect.assertions(1);

    expect(
      findings("sentence", (file): boolean => pendingFolder(file) === undefined),
    ).toStrictEqual([]);
  });

  it("keeps a folder pending only while its sentences still hold marks", (): void => {
    expect.assertions(1);

    const stillMarked = new Set(
      findings("sentence", (file): boolean => pendingFolder(file) !== undefined).map(
        (finding): string | undefined => pendingFolder(finding),
      ),
    );
    expect(PENDING.filter((folder): boolean => !stillMarked.has(folder))).toStrictEqual([]);
  });
});
