import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  createMintIgnoreMatcher,
  isMintIgnoredBy,
  processMintIgnoreString,
} from "@mintlify/common";
import { describe, expect, it } from "vitest";

function ignoreEntries(path: string): string[] {
  return processMintIgnoreString(readFileSync(path, "utf8"));
}

describe("Mintlify ignore rules", (): void => {
  it.each([
    {
      name: "keeps support and handoff files out of the public docs build",
      path: ".mintignore",
      files: ["AGENTS.md", "CLAUDE.md", "DOCS_QUALITY_POLL.md"],
    },
    {
      name: "keeps internal handoff files ignored by Git",
      path: ".gitignore",
      files: ["DOCS_QUALITY_POLL.md"],
    },
  ])("$name", ({ path, files }): void => {
    expect.assertions(1);
    expect(files.filter((file): boolean => !ignoreEntries(path).includes(file))).toStrictEqual([]);
  });

  it("excludes tooling while retaining documentation, contracts, and assets", (): void => {
    expect.assertions(2);
    const matcher = createMintIgnoreMatcher(ignoreEntries(".mintignore"));
    const tooling = [
      "mintignore.test.ts",
      "scripts/responses/main.go",
      "config/dependency-license-policy.json",
      "patches/comply-licensing.patch",
      "package.json",
      "package-lock.json",
      "go.mod",
      "go.sum",
      "tsconfig.json",
      "LICENSES/MIT.txt",
    ];
    expect(tooling.filter((file): boolean => !isMintIgnoredBy(file, matcher))).toStrictEqual([]);
    const published = execFileSync(
      "git",
      [
        "ls-files",
        "--",
        "*.mdx",
        "images/*",
        "logo/*",
        "docs.json",
        "openapi.yaml",
        "context7.json",
        "docs/context7.json",
      ],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n");
    expect(published.filter((file): boolean => isMintIgnoredBy(file, matcher))).toStrictEqual([]);
  });
});
