import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface PageStructureFinding {
  readonly file: string;
  readonly issue: string;
}

const SKIPPED_DIRECTORIES = new Set<string>([".git", "node_modules"] as const);

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
