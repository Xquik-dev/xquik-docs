import { execFileSync } from "node:child_process";

const VERBATIM_FILES = new Set<string>(["CODE_OF_CONDUCT.md"]);

const FRONTMATTER_KEYS = new Set<string>(["title", "sidebarTitle", "description"]);

const FIRST_METADATA_LINE = 2;

export const CODE_MASK = "\u{E000}";

export interface FrontmatterField {
  readonly key: string;
  readonly line: number;
  readonly rawLine: string;
  readonly value: string;
}

export interface PageProse {
  readonly fields: readonly FrontmatterField[];
  readonly rawLines: readonly string[];
  readonly prose: string;
}

function blankOut(text: string, start: number, end: number, fill = " "): string {
  return text.slice(0, start) + text.slice(start, end).replace(/[^\n]/gu, fill) + text.slice(end);
}

function blankOutPattern(text: string, pattern: RegExp, fill = " "): string {
  let result = text;
  for (const match of text.matchAll(pattern)) {
    result = blankOut(result, match.index, match.index + match[0].length, fill);
  }
  return result;
}

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

export function proseOnly(body: string): string {
  let text = blankOutFencedCode(body);
  text = blankOutPattern(text, /^import\s.*\bfrom\s+["'][^"'\n]+["'];?[ \t]*$/gmu);
  text = blankOutPattern(text, /^export\s+(?:const|default|function|let)\s.*$/gmu);
  text = blankOutPattern(text, /<!--[\s\S]*?-->/gu);
  text = blankOutPattern(text, /(`+)[\s\S]*?\1/gu, CODE_MASK);
  text = blankOutPattern(text, /^ {0,3}\[[^\]\n]+\]:[ \t]+\S.*$/gmu);
  text = blankOutPattern(text, /\]\((?:[^()\s]|\([^()\s]*\))*\)/gu);
  text = blankOutTagsAndExpressions(text);
  text = blankOutPattern(text, /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>()[\]"'`]*/giu);
  text = blankOutPattern(text, /&(?:[a-z][a-z0-9]*|#\d+|#x[0-9a-f]+);/giu);
  return text.replace(/[*_]/gu, " ");
}

function frontmatterFields(metadata: readonly string[]): readonly FrontmatterField[] {
  return metadata.flatMap((rawLine, index): FrontmatterField[] => {
    const match = /^([A-Za-z]+):\s*(.*)$/u.exec(rawLine);
    const key = match?.[1] ?? "";
    const value = (match?.[2] ?? "").replace(/^(["'])(.*)\1$/u, "$2");
    return FRONTMATTER_KEYS.has(key)
      ? [{ key, line: index + FIRST_METADATA_LINE, rawLine, value }]
      : [];
  });
}

export function pageProse(source: string): PageProse {
  const normalized = source.replace(/\r\n/gu, "\n");
  const rawLines = normalized.split("\n");
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/u.exec(normalized);
  if (match === null) {
    return { fields: [], rawLines, prose: proseOnly(normalized) };
  }
  const frontmatterLineBreaks = match[0].split("\n").length - 1;
  return {
    fields: frontmatterFields((match[1] ?? "").split("\n")),
    rawLines,
    prose: proseOnly("\n".repeat(frontmatterLineBreaks) + normalized.slice(match[0].length)),
  };
}

export function headingText(proseLine: string): string | undefined {
  return /^\s*#{1,6}\s(.*)$/u.exec(proseLine)?.[1]?.replace(/\s#+\s*$/u, "").trim();
}

export function trackedPages(): readonly string[] {
  return execFileSync("git", ["ls-files", "--", "*.md", "*.mdx"], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter((file): boolean => !VERBATIM_FILES.has(file));
}
