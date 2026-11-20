#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { format } from "oxfmt";

import { isRecord } from "./lib/json-shape.ts";
import {
  contentHash,
  listsInSitemap,
  nextPageDates,
  pagePath,
  parsePageDates,
  renderSitemap,
  serializePageDates,
  type PageDates,
} from "./lib/sitemap.ts";

const DATES_FILE = "scripts/sitemap-lastmod.json";
const SITEMAP_FILE = "sitemap.xml";

function trackedFiles(...args: readonly string[]): readonly string[] {
  return execFileSync("git", ["ls-files", ...args], { encoding: "utf8" })
    .split("\n")
    .filter((file): boolean => file !== "");
}

function publishedPages(): readonly string[] {
  const ignored = new Set(trackedFiles("--cached", "--ignored", "--exclude-from=.mintignore"));
  return trackedFiles("--", "*.mdx").filter(
    (file): boolean => !file.startsWith("snippets/") && !ignored.has(file),
  );
}

function previousDates(): PageDates {
  if (!existsSync(DATES_FILE)) return new Map();
  const parsed: unknown = JSON.parse(readFileSync(DATES_FILE, "utf8"));
  if (!isRecord(parsed)) throw new Error(`${DATES_FILE} must hold 1 JSON object.`);
  return parsePageDates(parsed);
}

async function run(check: boolean): Promise<string> {
  const read = (path: string): string => readFileSync(path, "utf8");
  const hashes = new Map(
    publishedPages()
      .filter((file): boolean => listsInSitemap(file, read(file)))
      .map((file): [string, string] => [pagePath(file), contentHash(file, read)]),
  );
  const previous = previousDates();
  const next = nextPageDates(previous, hashes, new Date().toISOString().slice(0, 10));
  const files = new Map([
    [
      DATES_FILE,
      (await format(DATES_FILE, JSON.stringify(serializePageDates(next), undefined, 2))).code,
    ],
    [SITEMAP_FILE, renderSitemap(next)],
  ]);
  const stale = [...files].filter(
    ([path, source]): boolean => !existsSync(path) || readFileSync(path, "utf8") !== source,
  );
  if (check) {
    if (stale.length > 0) {
      const changed = [...next.keys()].filter(
        (path): boolean => previous.get(path)?.hash !== next.get(path)?.hash,
      );
      const gone = [...previous.keys()].filter((path): boolean => !next.has(path));
      throw new Error(
        `${stale.map(([path]): string => path).join(" and ")} must change for ${String(changed.length + gone.length)} pages, such as ${[...changed, ...gone].slice(0, 5).join(", ")}. Run bun run sitemap.`,
      );
    }
    return `Verified ${String(next.size)} sitemap pages and their last content change.\n`;
  }
  for (const [path, source] of stale) writeFileSync(path, source);
  return `Wrote ${String(stale.length)} files for ${String(next.size)} sitemap pages.\n`;
}

if (import.meta.main) {
  try {
    process.stdout.write(await run(process.argv.includes("--check")));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
