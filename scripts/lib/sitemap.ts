import { createHash } from "node:crypto";

export const DOCS_ORIGIN = "https://docs.xquik.com";

const SNIPPET_IMPORT = /^import\s+\w+\s+from\s+"(\/snippets\/[^"]+\.mdx)";?$/gmu;
const FRONTMATTER = /^---\n(?<body>[\s\S]*?)\n---\n/u;
const DAY = /^\d{4}-\d{2}-\d{2}$/u;
const ENTRY = /^(?<lastmod>\d{4}-\d{2}-\d{2}) (?<hash>[0-9a-f]{16})$/u;

export interface PageDate {
  readonly hash: string;
  readonly lastmod: string;
}

export type PageDates = ReadonlyMap<string, PageDate>;

export function pagePath(file: string): string {
  return `/${file.replace(/\.mdx$/u, "").replace(/(?:^|\/)index$/u, "")}`;
}

export function snippetImports(source: string): readonly string[] {
  return [...source.matchAll(SNIPPET_IMPORT)].map((match): string => (match[1] ?? "").slice(1));
}

function frontmatterValue(source: string, key: string): string | undefined {
  const body = FRONTMATTER.exec(source)?.groups?.["body"] ?? "";
  const line = body.split("\n").find((entry): boolean => entry.startsWith(`${key}:`));
  return line
    ?.slice(key.length + 1)
    .trim()
    .replace(/^"(?<value>.*)"$/u, "$<value>");
}

export function listsInSitemap(file: string, source: string): boolean {
  if (frontmatterValue(source, "noindex") === "true") return false;
  const canonical = frontmatterValue(source, "canonical");
  return canonical === undefined || canonical === `${DOCS_ORIGIN}${pagePath(file)}`;
}

export function contentHash(
  file: string,
  read: (path: string) => string,
  seen: ReadonlySet<string> = new Set(),
): string {
  const source = read(file);
  const imports = snippetImports(source)
    .filter((snippet): boolean => snippet !== file && !seen.has(snippet))
    .toSorted();
  const nested = new Set([...seen, file, ...imports]);
  const parts = [source, ...imports.map((snippet): string => contentHash(snippet, read, nested))];
  return createHash("sha256").update(parts.join("\n\0\n")).digest("hex").slice(0, 16);
}

export function nextPageDates(
  previous: PageDates,
  hashes: ReadonlyMap<string, string>,
  today: string,
): PageDates {
  if (!DAY.test(today)) throw new Error(`${today} is not a YYYY-MM-DD day.`);
  return new Map(
    [...hashes]
      .toSorted(([a], [b]): number => (a < b ? -1 : 1))
      .map(([path, hash]): [string, PageDate] => {
        const known = previous.get(path);
        return [path, known?.hash === hash ? known : { hash, lastmod: today }];
      }),
  );
}

export function parsePageDates(entries: Readonly<Record<string, unknown>>): PageDates {
  return new Map(
    Object.entries(entries).map(([path, value]): [string, PageDate] => {
      const match = typeof value === "string" ? ENTRY.exec(value)?.groups : undefined;
      if (match?.["lastmod"] === undefined || match["hash"] === undefined)
        throw new Error(
          `${path} needs a "YYYY-MM-DD <16 hex>" entry, not ${JSON.stringify(value)}.`,
        );
      return [path, { hash: match["hash"], lastmod: match["lastmod"] }];
    }),
  );
}

export function serializePageDates(dates: PageDates): Readonly<Record<string, string>> {
  return Object.fromEntries(
    [...dates].map(([path, { hash, lastmod }]): [string, string] => [path, `${lastmod} ${hash}`]),
  );
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function renderSitemap(dates: PageDates): string {
  const urls = [...dates].map(
    ([path, { lastmod }]): string =>
      `  <url><loc>${escapeXml(encodeURI(`${DOCS_ORIGIN}${path}`))}</loc><lastmod>${lastmod}</lastmod></url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}
