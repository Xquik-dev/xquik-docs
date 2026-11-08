import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface PageStructureFinding {
  readonly file: string;
  readonly issue: string;
}

const SKIPPED_DIRECTORIES = new Set<string>([".git", "node_modules"] as const);

// MDX drops the line break between the children of a JSX element, and Mintlify renders each
// paragraph as an inline span, so 2 paragraphs inside a section reach text readers glued.
const PARAGRAPH_SEPARATOR = '{"\\n"}';
const NOT_PARAGRAPH = /^(?:#|\||- |\* |\+ |\d+\. |```|~~~|<|>|\{|!\[|---\s*$)/u;
const COMPONENT_OPEN = /^<(?<name>[A-Z][\w.]*)\b[^>]*(?<!\/)>/u;
const COMPONENT_CLOSE = /^<\/[A-Z][\w.]*>\s*$/u;
const FENCE = /^\s*(?:```|~~~)/u;

interface SourceBlock {
  readonly code: boolean;
  readonly line: number;
  readonly text: string;
}

function sourceBlocks(lines: readonly string[]): readonly SourceBlock[] {
  const blocks: SourceBlock[] = [];
  let current: string[] = [];
  let start = 0;
  let fence = false;
  let code = false;

  for (const [index, line] of lines.entries()) {
    if (!fence && line.trim() === "") {
      if (current.length > 0)
        blocks.push({ code, line: start + 1, text: current.join("\n").trim() });
      current = [];
      code = false;
      continue;
    }
    if (current.length === 0) start = index;
    if (FENCE.test(line)) {
      fence = !fence;
      code = true;
    }
    current.push(line);
  }
  if (current.length > 0) blocks.push({ code, line: start + 1, text: current.join("\n").trim() });

  return blocks;
}

function gluedParagraphLines(lines: readonly string[]): readonly number[] {
  const glued: number[] = [];
  let insideSection = false;
  let componentDepth = 0;
  let previousParagraph = false;

  for (const block of sourceBlocks(lines)) {
    let paragraph = false;
    if (block.code || block.text === PARAGRAPH_SEPARATOR) {
      paragraph = false;
    } else if (block.text === "<section>") {
      insideSection = true;
      componentDepth = 0;
    } else if (block.text === "</section>") {
      insideSection = false;
    } else if (COMPONENT_CLOSE.test(block.text)) {
      componentDepth = Math.max(0, componentDepth - 1);
    } else {
      const name = COMPONENT_OPEN.exec(block.text)?.groups?.["name"];
      if (name === undefined) {
        paragraph = insideSection && componentDepth === 0 && !NOT_PARAGRAPH.test(block.text);
      } else if (!block.text.includes(`</${name}>`)) {
        componentDepth += 1;
      }
    }
    if (paragraph && previousParagraph) glued.push(block.line);
    previousParagraph = paragraph;
  }

  return glued;
}

function listMdxFiles(directory = "."): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return SKIPPED_DIRECTORIES.has(entry.name) ? [] : listMdxFiles(path);
    }

    return entry.isFile() && entry.name.endsWith(".mdx") ? [path] : [];
  });
}

function collectPageStructureFindings(): readonly PageStructureFinding[] {
  const findings: PageStructureFinding[] = [];

  for (const file of listMdxFiles()) {
    const source = readFileSync(file, "utf8");
    const lines = source.split(/\r?\n/u);
    let insideCodeFence = false;
    let insideCodeGroup = false;
    let previousHeadingLevel = 1;

    const prose = source.replace(/```[\s\S]*?```/gu, "");
    if (
      !file.startsWith("snippets/") &&
      /^## /mu.test(prose) &&
      !/^<section>\n\n## /mu.test(prose)
    ) {
      findings.push({ file, issue: "Wrap each top-level section in a section element." });
    }

    const glued = gluedParagraphLines(lines);
    if (glued.length > 0) {
      findings.push({
        file,
        issue: `Put a ${PARAGRAPH_SEPARATOR} line before the paragraphs on lines ${glued.join(", ")}, or they render glued to the paragraph above.`,
      });
    }

    if (/<(?:Panel|ParamField|ResponseField)\b/u.test(prose)) {
      findings.push({
        file,
        issue:
          "Use a Markdown table for fields. Panel and field components render far more markup.",
      });
    }

    for (const [index, line] of lines.entries()) {
      if (insideCodeGroup && !insideCodeFence && /^\s*```[A-Za-z0-9#+.-]+\s*$/u.test(line)) {
        findings.push({
          file,
          issue: `CodeGroup fence on line ${index + 1} needs a visible tab title.`,
        });
      }

      if (/^\s*```/u.test(line)) {
        insideCodeFence = !insideCodeFence;
        continue;
      }

      if (insideCodeFence) {
        continue;
      }

      if (/^\s*<CodeGroup>\s*$/u.test(line)) {
        insideCodeGroup = true;
      } else if (/^\s*<\/CodeGroup>\s*$/u.test(line)) {
        insideCodeGroup = false;
      }

      const heading = /^(#{1,6})\s+/u.exec(line);
      if (heading === null) {
        continue;
      }

      const headingLevel = heading[0].trim().length;
      if (headingLevel > previousHeadingLevel + 1) {
        findings.push({
          file,
          issue: `Heading on line ${index + 1} skips from H${previousHeadingLevel} to H${headingLevel}.`,
        });
      }
      previousHeadingLevel = headingLevel;
    }
  }

  return findings;
}

describe("page structure", (): void => {
  it("keeps CodeGroup labels and heading order accessible", (): void => {
    expect.assertions(1);

    expect(collectPageStructureFindings()).toStrictEqual([]);
  });
});
