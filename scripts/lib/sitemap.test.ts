import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  contentHash,
  listsInSitemap,
  nextPageDates,
  pagePath,
  parsePageDates,
  renderSitemap,
  serializePageDates,
  type PageDate,
  type PageDates,
} from "./sitemap.ts";

const DAYS = fc
  .date({
    min: new Date("2026-01-01T00:00:00Z"),
    max: new Date("2030-12-31T00:00:00Z"),
    noInvalidDate: true,
  })
  .map((date): string => date.toISOString().slice(0, 10));
const HASHES = fc.stringMatching(/^[0-9a-f]{16}$/u);
const PATHS = fc.stringMatching(/^\/[a-z][a-z0-9-]{0,12}(?:\/[a-z][a-z0-9-]{0,12})?$/u);
const DATES = fc
  .uniqueArray(fc.tuple(PATHS, HASHES, DAYS), { maxLength: 12, selector: ([path]): string => path })
  .map(
    (entries): PageDates =>
      new Map(
        entries.map(([path, hash, lastmod]): [string, PageDate] => [path, { hash, lastmod }]),
      ),
  );

function files(entries: Readonly<Record<string, string>>): (path: string) => string {
  return (path: string): string => {
    const source = entries[path];
    if (source === undefined) throw new Error(`${path} is missing.`);
    return source;
  };
}

describe("nextPageDates", () => {
  it("keeps the day of each page whose content is the same and dates every changed or new page today", (): void => {
    expect.assertions(1);
    const property = fc.property(
      DATES,
      fc.array(PATHS, { maxLength: 6 }),
      HASHES,
      DAYS,
      (previous, edited, hash, today): boolean => {
        const hashes = new Map(
          [...previous].map(([path, entry]): [string, string] => [
            path,
            edited.includes(path) ? hash : entry.hash,
          ]),
        );
        for (const path of edited) if (!previous.has(path)) hashes.set(path, hash);
        const next = nextPageDates(previous, hashes, today);
        return (
          next.size === hashes.size &&
          [...next].every(([path, entry]): boolean => {
            const before = previous.get(path);
            const lastmod = before?.hash === hashes.get(path) ? before?.lastmod : today;
            return entry.hash === hashes.get(path) && entry.lastmod === lastmod;
          })
        );
      },
    );
    expect(() => fc.assert(property)).not.toThrow();
  });

  it("drops a page that left the site", (): void => {
    expect.assertions(1);
    const previous: PageDates = new Map([
      ["/guides/kept", { hash: "aaaaaaaaaaaaaaaa", lastmod: "2026-11-01" }],
      ["/guides/gone", { hash: "bbbbbbbbbbbbbbbb", lastmod: "2026-11-02" }],
    ]);
    expect([
      ...nextPageDates(previous, new Map([["/guides/kept", "aaaaaaaaaaaaaaaa"]]), "2026-11-20"),
    ]).toStrictEqual([["/guides/kept", { hash: "aaaaaaaaaaaaaaaa", lastmod: "2026-11-01" }]]);
  });

  it("refuses a day that is not YYYY-MM-DD", (): void => {
    expect.assertions(1);
    expect(() => nextPageDates(new Map(), new Map(), "2026-11-20T10:00:00Z")).toThrow(
      "is not a YYYY-MM-DD day",
    );
  });
});

describe("contentHash", () => {
  const pages = {
    "guides/a.mdx": 'import Fee from "/snippets/fee.mdx";\n\n<Fee />\n\nPage A.\n',
    "guides/b.mdx": "Page B.\n",
    "snippets/fee.mdx": 'import Loop from "/snippets/loop.mdx";\n\nThe fee is 10 credits.\n',
    "snippets/loop.mdx": 'import Fee from "/snippets/fee.mdx";\n\nLoop.\n',
  };

  it("changes when a snippet the page imports changes, even 2 imports deep", (): void => {
    expect.assertions(2);
    const before = contentHash("guides/a.mdx", files(pages));
    expect(
      contentHash(
        "guides/a.mdx",
        files({ ...pages, "snippets/fee.mdx": "The fee is 20 credits.\n" }),
      ),
    ).not.toBe(before);
    expect(
      contentHash(
        "guides/a.mdx",
        files({
          ...pages,
          "snippets/loop.mdx": 'import Fee from "/snippets/fee.mdx";\n\nLoop 2.\n',
        }),
      ),
    ).not.toBe(before);
  });

  it("stays the same when only another page changes", (): void => {
    expect.assertions(1);
    expect(
      contentHash("guides/a.mdx", files({ ...pages, "guides/b.mdx": "Page B, edited.\n" })),
    ).toBe(contentHash("guides/a.mdx", files(pages)));
  });
});

describe("listsInSitemap", () => {
  it.each([
    {
      name: "lists a page with no robots or canonical field",
      file: "guides/a.mdx",
      source: '---\ntitle: "A"\n---\n\nA.\n',
      listed: true,
    },
    {
      name: "lists a page that names itself as canonical",
      file: "guides/a.mdx",
      source: '---\ncanonical: "https://docs.xquik.com/guides/a"\n---\n',
      listed: true,
    },
    {
      name: "leaves out a page that names another page as canonical",
      file: "index.mdx",
      source: '---\ncanonical: "https://docs.xquik.com/api-reference/overview"\n---\n',
      listed: false,
    },
    {
      name: "leaves out a noindex page",
      file: "guides/a.mdx",
      source: "---\nnoindex: true\n---\n",
      listed: false,
    },
  ])("$name", ({ file, source, listed }): void => {
    expect.assertions(1);
    expect(listsInSitemap(file, source)).toBe(listed);
  });
});

describe("pagePath", () => {
  it.each([
    ["index.mdx", "/"],
    ["guides/index.mdx", "/guides"],
    ["api-reference/x/followers.mdx", "/api-reference/x/followers"],
  ])("serves %s at %s", (file, path): void => {
    expect.assertions(1);
    expect(pagePath(file)).toBe(path);
  });
});

describe("page dates file", () => {
  it("reads back every entry it writes", (): void => {
    expect.assertions(1);
    const property = fc.property(DATES, (dates): boolean => {
      const read = parsePageDates(serializePageDates(dates));
      return JSON.stringify([...read]) === JSON.stringify([...dates]);
    });
    expect(() => fc.assert(property)).not.toThrow();
  });

  it("refuses an entry without a day and a 16 hex hash", (): void => {
    expect.assertions(1);
    expect(() => parsePageDates({ "/guides/a": "2026-11-20" })).toThrow("/guides/a needs");
  });
});

describe("renderSitemap", () => {
  it("lists each page once with its day and escapes the URL", (): void => {
    expect.assertions(1);
    const xml = renderSitemap(
      new Map([
        ["/", { hash: "aaaaaaaaaaaaaaaa", lastmod: "2026-11-01" }],
        ["/guides/a&b", { hash: "bbbbbbbbbbbbbbbb", lastmod: "2026-11-02" }],
      ]),
    );
    expect(xml).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "  <url><loc>https://docs.xquik.com/</loc><lastmod>2026-11-01</lastmod></url>",
        "  <url><loc>https://docs.xquik.com/guides/a&amp;b</loc><lastmod>2026-11-02</lastmod></url>",
        "</urlset>",
        "",
      ].join("\n"),
    );
  });
});
