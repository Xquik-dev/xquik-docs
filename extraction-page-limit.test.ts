import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";
import { operationAt, parseOpenApi } from "./scripts/lib/openapi-schema.ts";

const PROJECT_ROOT = process.cwd();
const SKIPPED_DIRECTORIES: ReadonlySet<string> = new Set([".git", "node_modules"]);
const EXTRACTION_PAGE = /extractions?\b/iu;
const PAGE_LIMIT_CLAIMS: readonly RegExp[] = [
  /`?limit`? up to `?(?<rows>\d[\d,]*)/giu,
  /up to (?<rows>\d[\d,]*) results per page/giu,
  /pages of up to (?<rows>\d[\d,]*) (?:records|results|rows)/giu,
  /results per page \(1-(?<rows>\d[\d,]*)/giu,
  /returns status and up to (?<rows>\d[\d,]*) results/giu,
  /per page, up to `(?<rows>\d[\d,]*)`/giu,
  /\b1 to (?<rows>\d[\d,]*) stored rows/giu,
];

interface PageLimitClaim {
  readonly line: number;
  readonly rows: number;
}

function pageLimitClaims(source: string): PageLimitClaim[] {
  const claims: PageLimitClaim[] = [];
  for (const [index, text] of source.split("\n").entries()) {
    for (const pattern of PAGE_LIMIT_CLAIMS) {
      for (const match of text.matchAll(pattern)) {
        const rows = match.groups?.["rows"];
        if (rows !== undefined)
          claims.push({ line: index + 1, rows: Number(rows.replaceAll(",", "")) });
      }
    }
  }
  return claims;
}

function docsPages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry): string[] => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRECTORIES.has(entry.name) ? [] : docsPages(path);
    return /\.mdx?$/u.test(entry.name) ? [path] : [];
  });
}

function servedPageRows(): number | undefined {
  const spec = parseOpenApi(readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8"));
  const limit = operationAt(spec, "/extractions/{id}", "get")?.parameters?.find(
    (parameter) => parameter.in === "query" && parameter.name === "limit",
  );
  return limit?.schema?.maximum;
}

describe("extraction result page limit", (): void => {
  it("reads each phrase that states the page limit", (): void => {
    expect.assertions(2);
    expect(
      pageLimitClaims("Use `limit` up to `1000`.\nFetch results in pages of up to 1,000 records."),
    ).toStrictEqual([
      { line: 1, rows: 1000 },
      { line: 2, rows: 1000 },
    ]);
    expect(pageLimitClaims("Pass `nextCursor` as `cursor`.")).toStrictEqual([]);
  });

  it("states the page limit openapi.yaml serves on every extraction page", (): void => {
    expect.assertions(2);
    const served = servedPageRows();
    const stated = docsPages(PROJECT_ROOT).flatMap((path): string[] => {
      const source = readFileSync(path, "utf8");
      if (!EXTRACTION_PAGE.test(source)) return [];
      return pageLimitClaims(source).map(
        ({ line, rows }): string => `${relative(PROJECT_ROOT, path)}:${line} ${rows}`,
      );
    });
    expect(stated.length).toBeGreaterThan(0);
    expect(stated.filter((claim): boolean => !claim.endsWith(` ${served}`))).toStrictEqual([]);
  });
});
