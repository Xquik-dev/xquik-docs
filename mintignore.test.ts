import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** The patterns of an ignore file, without comments & blank lines. */
function ignoreEntries(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((line): string => line.trim())
    .filter((line): boolean => line !== "" && !line.startsWith("#"));
}

function trackedFiles(...args: readonly string[]): string[] {
  return execFileSync("git", ["ls-files", ...args], { encoding: "utf8" })
    .trim()
    .split("\n");
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
    // .mintignore uses Git's ignore syntax, so Git itself applies its patterns.
    const ignored = new Set(trackedFiles("--cached", "--ignored", "--exclude-from=.mintignore"));
    const tooling = [
      "mintignore.test.ts",
      "scripts/response-examples.ts",
      "patches/comply-licensing.patch",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "LICENSES/MIT.txt",
    ];
    expect(tooling.filter((file): boolean => !ignored.has(file))).toStrictEqual([]);
    const published = trackedFiles(
      "--",
      "*.mdx",
      "images/*",
      "logo/*",
      "docs.json",
      "openapi.yaml",
      "context7.json",
      "docs/context7.json",
    );
    expect(published.filter((file): boolean => ignored.has(file))).toStrictEqual([]);
  });
});
