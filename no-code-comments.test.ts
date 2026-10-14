import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const CASES: readonly { readonly name: string; readonly code: string; readonly flagged: number }[] =
  [
    {
      name: "license",
      code: "// SPDX-FileCopyrightText: 2026 Xquik contributors\n//\n// SPDX-License-Identifier: MIT\nexport const a = 1;\n",
      flagged: 0,
    },
    {
      name: "proof",
      code: "// .mintignore follows Git's ignore syntax.\n// https://www.mintlify.com/docs/organize/mintignore#pattern-syntax\nexport const a = 1;\n",
      flagged: 0,
    },
    {
      name: "directive",
      code: "// oxlint-disable-next-line no-console\nconsole.log(1);\n",
      flagged: 0,
    },
    { name: "pure", code: "export const a = /* #__PURE__ */ Symbol();\n", flagged: 0 },
    { name: "shebang", code: "#!/usr/bin/env bun\nexport const a = 1;\n", flagged: 0 },
    { name: "narration", code: "// Explains the next line.\nexport const a = 1;\n", flagged: 1 },
    { name: "trailing", code: "export const a = 1; // says what a is\n", flagged: 1 },
    { name: "inline", code: "export const a = Math.max(/* first */ 1, 2);\n", flagged: 1 },
    {
      name: "doc",
      code: "/** Describes a helper. */\nexport function helper(): void {}\n",
      flagged: 1,
    },
    {
      name: "block",
      code: "// First line.\n// Second line, still no proof.\nexport const a = 1;\n",
      flagged: 2,
    },
    {
      name: "split",
      code: "// Unrelated note.\n\n// https://example.com/doc\nexport const a = 1;\n",
      flagged: 1,
    },
  ];

const folder = mkdtempSync(join(tmpdir(), "no-code-comments-"));
afterAll((): void => rmSync(folder, { force: true, recursive: true }));

function flaggedLines(): Map<string, number> {
  for (const { name, code } of CASES) writeFileSync(join(folder, `${name}.ts`), code);
  const { stdout } = spawnSync(
    join(import.meta.dirname, "node_modules/.bin/oxlint"),
    ["--config", join(import.meta.dirname, ".oxlintrc.json"), "--format", "json", folder],
    { encoding: "utf8" },
  );
  const { diagnostics } = JSON.parse(stdout) as {
    diagnostics: { code: string; filename: string }[];
  };
  const counts = new Map<string, number>();
  for (const { code, filename } of diagnostics) {
    if (code !== "xquik(no-code-comments)") continue;
    const name = filename.replace(/^.*\//u, "").replace(/\.ts$/u, "");
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

describe("no-code-comments", (): void => {
  const counts = flaggedLines();
  it.each(CASES)("flags $flagged comments in the $name case", ({ name, flagged }): void => {
    expect(counts.get(name) ?? 0).toBe(flagged);
  });
});
