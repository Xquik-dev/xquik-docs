import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

const LINK_TARGET = /(?:\]\(|href="|"href": ")(https:\/\/xquik\.com[^\s)"]*)/gu;
const FINAL_PAGE = /^https:\/\/xquik\.com\/en(?:\/[a-z0-9-]+)*(?:#[\w-]+)?$/u;
const FILE_OR_ENDPOINT = /^https:\/\/xquik\.com\/(?:\.well-known\/[\w/.-]+|[\w/.-]+\.[a-z]+)$/u;

const linkSources = execFileSync("git", ["ls-files", "*.mdx", "*.jsx", "docs.json"], {
  encoding: "utf8",
})
  .split("\n")
  .filter((file) => file !== "");

function linksToXquik(file: string): readonly string[] {
  return [...readFileSync(file, "utf8").matchAll(LINK_TARGET)].map(([, target = ""]) => target);
}

it("links each xquik.com page at its final address, with no redirect or tracking query", () => {
  const redirecting = linkSources.flatMap((file) =>
    linksToXquik(file)
      .filter((target) => !FINAL_PAGE.test(target) && !FILE_OR_ENDPOINT.test(target))
      .map((target) => `${file} ${target}`),
  );

  expect(redirecting).toStrictEqual([]);
});

it.each([
  ["https://xquik.com", false],
  ["https://xquik.com/benchmarks", false],
  ["https://xquik.com/en/dm-sender?ref=docs-circleboom", false],
  ["https://xquik.com/en", true],
  ["https://xquik.com/en/benchmarks#speed", true],
  ["https://xquik.com/trust.json", true],
  ["https://xquik.com/.well-known/api-catalog", true],
])("calls %s a final address: %s", (target, final) => {
  expect(FINAL_PAGE.test(target) || FILE_OR_ENDPOINT.test(target)).toBe(final);
});
