import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

const pages = execFileSync("git", ["ls-files", "*.mdx"], { encoding: "utf8" })
  .split("\n")
  .filter((file) => file !== "");
const JSON_MARKDOWN_LINK = /\]\([^)\s]*\.json(?:[?#][^)]*)?\)/g;
const JSON_ANCHOR = /<a\s[^>]*href="[^"]*\.json(?:[?#][^"]*)?"[^>]*>/g;
const linksIn = (pattern: RegExp): string[] =>
  pages.flatMap((page) =>
    [...readFileSync(page, "utf8").matchAll(pattern)].map(([link]) => `${page} ${link}`),
  );

it("tells a crawler that each link to a JSON file opens JSON", () => {
  const anchors = linksIn(JSON_ANCHOR);

  expect({
    anchors: anchors.length,
    markdownLinks: linksIn(JSON_MARKDOWN_LINK),
    untyped: anchors.filter((anchor) => !anchor.includes('type="application/json"')),
  }).toStrictEqual({ anchors: 3, markdownLinks: [], untyped: [] });
});
