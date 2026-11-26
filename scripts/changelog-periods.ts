#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

import { format } from "oxfmt";

import {
  ARCHIVE_GROUP,
  CHANGELOG_PAGE,
  archiveNewestFirst,
  splitChangelog,
} from "./lib/changelog-periods.ts";
import { isList, isRecord } from "./lib/json-shape.ts";

const DOCS_ORIGIN = "https://docs.xquik.com";
const ARCHIVE_LINK = /^- \[[^\]]*\]\(https:\/\/docs\.xquik\.com\/changelog\/\d{4}-\d{2}\)$/u;
const ROOT_LINK = `- [Changelog](${DOCS_ORIGIN}/${CHANGELOG_PAGE})`;

function archivedPages(): ReadonlyMap<string, string> {
  if (!existsSync(CHANGELOG_PAGE)) return new Map();
  return new Map(
    readdirSync(CHANGELOG_PAGE)
      .filter((file) => file.endsWith(".mdx"))
      .map((file): [string, string] => [
        `${CHANGELOG_PAGE}/${file.replace(/\.mdx$/u, "")}`,
        readFileSync(`${CHANGELOG_PAGE}/${file}`, "utf8"),
      ]),
  );
}

function isArchiveGroup(node: unknown): boolean {
  return isRecord(node) && node["group"] === ARCHIVE_GROUP;
}

function withArchive(node: unknown, pages: readonly string[]): unknown {
  if (isList(node)) {
    const items = node
      .filter((item) => !isArchiveGroup(item))
      .map((item) => withArchive(item, pages));
    const at = items.indexOf(CHANGELOG_PAGE);
    if (at === -1 || pages.length === 0) return items;
    return items.toSpliced(at + 1, 0, { group: ARCHIVE_GROUP, expanded: false, pages });
  }
  if (!isRecord(node)) return node;
  return Object.fromEntries(
    Object.entries(node).map(([key, value]): [string, unknown] => [key, withArchive(value, pages)]),
  );
}

function withLlmsLinks(
  llms: string,
  pages: readonly string[],
  labels: ReadonlyMap<string, string>,
): string {
  const lines = llms.split("\n").filter((line) => !ARCHIVE_LINK.test(line));
  const at = lines.indexOf(ROOT_LINK);
  if (at === -1) throw new Error(`llms.txt needs the line ${ROOT_LINK}.`);
  const links = pages.map(
    (page) => `- [Changelog for ${labels.get(page) ?? page}](${DOCS_ORIGIN}/${page})`,
  );
  return lines.toSpliced(at + 1, 0, ...links).join("\n");
}

function asciiJson(value: unknown): string {
  return JSON.stringify(value, undefined, 2).replaceAll(/[^\x20-\x7e\n]/gu, (character) =>
    Array.from(
      { length: character.length },
      (_, index) => `\\u${character.charCodeAt(index).toString(16).padStart(4, "0")}`,
    ).join(""),
  );
}

function sidebarLabel(source: string): string | undefined {
  return /^sidebarTitle: "([^"]+)"$/mu.exec(source)?.[1];
}

async function run(check: boolean): Promise<string> {
  const split = splitChangelog(readFileSync(`${CHANGELOG_PAGE}.mdx`, "utf8"), archivedPages());
  const pages = archiveNewestFirst(Array.from(split.pages.keys()));
  const labels = new Map(
    [...split.pages].map(([page, source]): [string, string] => [
      page,
      sidebarLabel(source) ?? page,
    ]),
  );
  const docs: unknown = JSON.parse(readFileSync("docs.json", "utf8"));
  const formatted = await format("docs.json", asciiJson(withArchive(docs, pages)));
  const files = new Map<string, string>([
    [`${CHANGELOG_PAGE}.mdx`, split.root],
    ["docs.json", formatted.code],
    ["llms.txt", withLlmsLinks(readFileSync("llms.txt", "utf8"), pages, labels)],
    ...[...split.pages].map(([page, source]): [string, string] => [`${page}.mdx`, source]),
  ]);
  const stale = [...files].filter(
    ([path, source]) => !existsSync(path) || readFileSync(path, "utf8") !== source,
  );
  if (check) {
    if (stale.length > 0)
      throw new Error(
        `${stale.map(([path]) => path).join(", ")} must change. Run bun scripts/changelog-periods.ts.`,
      );
    return `Verified ${String(pages.length)} changelog archive pages.\n`;
  }
  mkdirSync(CHANGELOG_PAGE, { recursive: true });
  for (const [path, source] of stale) writeFileSync(path, source);
  return `Wrote ${String(stale.length)} files for ${String(pages.length)} changelog archive pages.\n`;
}

if (import.meta.main) {
  try {
    process.stdout.write(await run(process.argv.includes("--check")));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
