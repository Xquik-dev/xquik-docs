import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

import { expect, it } from "vitest";

const LINK_TARGET = /(?:\]\(|href="|"href": ")(https:\/\/(?:dashboard|docs)\.xquik\.com[^\s)"]*)/gu;
const DASHBOARD_PAGE =
  /^https:\/\/dashboard\.xquik\.com\/en(?:\/[a-z0-9-]+)*(?:\?(?<query>[\w=&-]+))?$/u;
const DOCS_ADDRESS = /^https:\/\/docs\.xquik\.com(?<path>\/[\w./-]*)?(?:#[\w-]+)?$/u;
const ACCOUNT_TABS_WITH_OWN_PAGE = new Set(["api-keys", "x-accounts"]);
const DOCS_MCP_ENDPOINT = "/mcp";

const linkSources = execFileSync("git", ["ls-files", "*.mdx", "*.md", "*.jsx", "docs.json"], {
  encoding: "utf8",
})
  .split("\n")
  .filter((file) => file !== "");

function isFile(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isFile() === true;
}

function opensFinalAddress(target: string): boolean {
  const dashboard = DASHBOARD_PAGE.exec(target);
  if (dashboard !== null) {
    const tab = new URLSearchParams(dashboard.groups?.["query"] ?? "").get("tab");
    return tab === null || !ACCOUNT_TABS_WITH_OWN_PAGE.has(tab);
  }
  const docs = DOCS_ADDRESS.exec(target);
  if (docs === null) return false;
  const path = docs.groups?.["path"] ?? "/";
  return path === "/" || path === DOCS_MCP_ENDPOINT || isFile(`.${path}.mdx`) || isFile(`.${path}`);
}

it("links each dashboard and docs page at its final address", () => {
  const redirecting = linkSources.flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(LINK_TARGET)]
      .map(([, target = ""]) => target)
      .filter((target) => !opensFinalAddress(target))
      .map((target) => `${file} ${target}`),
  );

  expect(redirecting).toStrictEqual([]);
});

it.each([
  ["https://dashboard.xquik.com", false],
  ["https://dashboard.xquik.com/api-keys", false],
  ["https://dashboard.xquik.com/en/account?tab=api-keys", false],
  ["https://dashboard.xquik.com/en/account?tab=x-accounts", false],
  ["https://dashboard.xquik.com/signup?ref=docs-navbar", false],
  ["https://docs.xquik.com/api-reference", false],
  ["https://dashboard.xquik.com/en", true],
  ["https://dashboard.xquik.com/en/api-keys", true],
  ["https://dashboard.xquik.com/en/account?tab=subscription", true],
  ["https://dashboard.xquik.com/en/signup?ref=docs-navbar", true],
  ["https://docs.xquik.com", true],
  ["https://docs.xquik.com/api-reference/overview", true],
  ["https://docs.xquik.com/openapi.yaml", true],
  ["https://docs.xquik.com/mcp", true],
])("calls %s a final address: %s", (target, final) => {
  expect(opensFinalAddress(target)).toBe(final);
});
