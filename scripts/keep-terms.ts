#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";

import { Glob } from "bun";

import { breakNames, unmark, wideNames } from "./lib/code-names.ts";
import { GENERATED_LIST, keepTerms } from "./lib/keep-terms.ts";

const check = process.argv.includes("--check");
const changed: string[] = [];
const wide: string[] = [];
for (const file of new Glob("**/*.mdx").scanSync({ cwd: ".", onlyFiles: true })) {
  if (file.startsWith("node_modules/") || file === GENERATED_LIST) continue;
  const source = readFileSync(file, "utf8");
  const kept = breakNames(keepTerms(unmark(source)));
  for (const name of wideNames(kept)) wide.push(`${file}: ${name}`);
  if (kept === source) continue;
  changed.push(file);
  if (!check) writeFileSync(file, kept);
}
process.stdout.write(
  `${check ? "Pages with a split-prone term" : "Kept terms whole on"} ${String(changed.length)} pages.\n${changed.join("\n")}\n`,
);
if (wide.length > 0)
  process.stdout.write(
    `Code names with a piece wider than the narrowest column, to move into a code block or table:\n${wide.join("\n")}\n`,
  );
if (check && (changed.length > 0 || wide.length > 0)) process.exitCode = 1;
