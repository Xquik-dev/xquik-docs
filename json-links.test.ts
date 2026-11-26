import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

import { jsonLinkFaults } from "./scripts/built-pages.ts";

const pages = execFileSync("git", ["ls-files", "*.mdx"], { encoding: "utf8" })
  .split("\n")
  .filter((file) => file !== "");
const JSON_MARKDOWN_LINK = /\]\([^)\s]*\.json(?:[?#][^)]*)?\)/g;
const JSON_ANCHOR = /<a\s[^>]*href="[^"]*\.json(?:[?#][^"]*)?"[^>]*>/g;
const SOURCE_ATTRIBUTES = [
  'type="application/json"',
  'className="link"',
  'target="_blank"',
  'rel="noreferrer"',
];
const linksIn = (pattern: RegExp): string[] =>
  pages.flatMap((page) =>
    [...readFileSync(page, "utf8").matchAll(pattern)].map(([link]) => `${page} ${link}`),
  );

it("tells a crawler that each link to a JSON file opens JSON, styled & opened as Mintlify does a Markdown link", () => {
  const anchors = linksIn(JSON_ANCHOR);

  expect({
    anchors: anchors.length,
    markdownLinks: linksIn(JSON_MARKDOWN_LINK),
    incomplete: anchors.filter(
      (anchor) => !SOURCE_ATTRIBUTES.every((attribute) => anchor.includes(attribute)),
    ),
  }).toStrictEqual({ anchors: 3, incomplete: [], markdownLinks: [] });
});

it("finds a built link to a JSON file that lacks its type, its link class, its new tab or its referrer rule", () => {
  const full =
    '<a href="https://xquik.com/trust.json" type="application/json" class="link" target="_blank" rel="noreferrer">';
  const bare = '<a href="https://xquik.com/trust.json" type="application/json">';
  const page = '<a href="https://xquik.com/en/benchmarks" class="link">';

  expect(
    jsonLinkFaults(
      new Map([
        ["/trust", `${full}${page}`],
        ["/", `${bare}${page}`],
      ]),
    ),
  ).toStrictEqual([`/ ${bare}`]);
});
