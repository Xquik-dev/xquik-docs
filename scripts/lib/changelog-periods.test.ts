import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { archiveNewestFirst, parseChangelog, splitChangelog } from "./changelog-periods.ts";

const HEADER = '---\ntitle: "Changelog"\n---\n\nIntro.\n\n';
const MONTHS = ["January", "March", "October", "December"] as const;

function changelog(entries: readonly (readonly [string, string])[]): string {
  return `${HEADER}${entries
    .map(([label, body]) => `<Update label="${label}" description="v1">\n\n${body}\n\n</Update>\n`)
    .join("\n")}`;
}

const notes = fc.stringMatching(/^[a-z][a-z ]{0,40}$/u);
const periods = fc
  .uniqueArray(fc.tuple(fc.integer({ min: 2020, max: 2030 }), fc.constantFrom(...MONTHS)), {
    maxLength: 6,
    minLength: 1,
    selector: ([year, month]) => `${month} ${String(year)}`,
  })
  .map((list) =>
    list
      .toSorted(([a, x], [b, y]) => b - a || MONTHS.indexOf(y) - MONTHS.indexOf(x))
      .map(([year, month]) => `${month} ${String(year)}`),
  );
const entries = periods.chain((labels) =>
  fc
    .array(notes, { maxLength: labels.length, minLength: labels.length })
    .map((list) =>
      labels.map((label, index): readonly [string, string] => [
        label,
        `- ${label} ${list[index] ?? ""}`,
      ]),
    ),
);

describe("splitChangelog", () => {
  it("keeps the newest period whole and moves each older one to its own page", (): void => {
    expect.assertions(1);
    const property = fc.property(entries, (list) => {
      const { pages, root } = splitChangelog(changelog(list), new Map());
      const [newest, ...older] = list;
      const placed = older.every(([label, body]) => {
        const page = [...pages.values()].find((source) => source.includes(`label="${label}"`));
        return page?.includes(body) === true && !root.includes(body);
      });
      return root.includes(newest?.[1] ?? "") && placed && pages.size === older.length;
    });
    expect(() => fc.assert(property)).not.toThrow();
  });

  it("changes nothing on a second run", (): void => {
    expect.assertions(1);
    const property = fc.property(entries, (list) => {
      const first = splitChangelog(changelog(list), new Map());
      const second = splitChangelog(first.root, first.pages);
      return second.root === first.root && [...second.pages].join() === [...first.pages].join();
    });
    expect(() => fc.assert(property)).not.toThrow();
  });

  it("names each period page by year and month", (): void => {
    expect.assertions(1);
    const { pages } = splitChangelog(
      changelog([
        ["December 2026", "- new"],
        ["March 2026", "- old"],
      ]),
      new Map(),
    );
    expect([...pages.keys()]).toStrictEqual(["changelog/2026-03"]);
  });

  it("refuses a label that names no month", (): void => {
    expect.assertions(1);
    expect(() => parseChangelog(changelog([["Smarch 2026", "- odd"]]))).toThrow(
      'Changelog label "Smarch 2026" names no month.',
    );
  });

  it("refuses an older period whose page already holds other entries", (): void => {
    expect.assertions(1);
    const source = changelog([
      ["December 2026", "- new"],
      ["March 2026", "- added late"],
    ]);
    expect(() => splitChangelog(source, new Map([["changelog/2026-03", "different"]]))).toThrow(
      "changelog/2026-03.mdx already holds March 2026. Move new entries there.",
    );
  });
});

describe("archiveNewestFirst", () => {
  it("orders period pages from newest to oldest", (): void => {
    expect.assertions(1);
    expect(
      archiveNewestFirst(["changelog/2025-12", "changelog/2026-03", "changelog/2026-10"]),
    ).toStrictEqual(["changelog/2026-10", "changelog/2026-03", "changelog/2025-12"]);
  });
});
