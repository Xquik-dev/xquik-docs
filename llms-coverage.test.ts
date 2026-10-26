import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { z } from "zod";

const DOCS_ORIGIN = "https://docs.xquik.com";
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\((?:https:\/\/docs\.xquik\.com)?\/([^\s)]*)\)/gu;


interface NavigationGroup {
  readonly anchors?: readonly NavigationItem[] | undefined;
  readonly groups?: readonly NavigationItem[] | undefined;
  readonly pages?: readonly NavigationItem[] | undefined;
  readonly tabs?: readonly NavigationItem[] | undefined;
}
type NavigationItem = string | NavigationGroup;

const navigationItem: z.ZodType<NavigationItem> = z.lazy(() =>
  z.union([
    z.string(),
    z.looseObject({
      anchors: z.array(navigationItem).optional(),
      groups: z.array(navigationItem).optional(),
      pages: z.array(navigationItem).optional(),
      tabs: z.array(navigationItem).optional(),
    }),
  ]),
);

const navigationGroup = z.looseObject({
  anchors: z.array(navigationItem).optional(),
  groups: z.array(navigationItem).optional(),
  pages: z.array(navigationItem).optional(),
  tabs: z.array(navigationItem).optional(),
});

const docsConfigSchema = z.looseObject({ navigation: navigationGroup });

function flattenNavigationPages(item: NavigationItem): readonly string[] {
  if (typeof item === "string") {
    return [normalizePagePath(item)];
  }

  return [
    ...(item.anchors ?? []),
    ...(item.groups ?? []),
    ...(item.pages ?? []),
    ...(item.tabs ?? []),
  ].flatMap(flattenNavigationPages);
}

function normalizePagePath(page: string): string {
  const normalizedPage = page
    .replace(/^\/+/u, "")
    .replace(/\.mdx?$/u, "")
    .replace(/#.*$/u, "");

  return normalizedPage === "index" ? "" : normalizedPage;
}

function documentedLlmsPages(source: string): ReadonlySet<string> {
  return new Set(
    [...source.matchAll(MARKDOWN_LINK_PATTERN)].map((match): string =>
      normalizePagePath(match[1] ?? ""),
    ),
  );
}

describe("llms.txt coverage", (): void => {
  it("lists every docs.json navigation page as a markdown link", (): void => {
    expect.assertions(2);

    const docsConfig = docsConfigSchema.parse(JSON.parse(readFileSync("docs.json", "utf8")));
    const expectedPages = flattenNavigationPages(docsConfig.navigation);
    const llms = readFileSync("llms.txt", "utf8");
    const actualPages = documentedLlmsPages(llms);
    const missingPages = expectedPages
      .filter((page): boolean => !actualPages.has(page))
      .map((page): string => `${DOCS_ORIGIN}/${page}`);
    const sectionContent = llms
      .slice(llms.indexOf("\n## "))
      .split("\n")
      .filter((line): boolean => line !== "" && !line.startsWith("## "));

    expect(missingPages).toStrictEqual([]);
    expect(sectionContent.every((line): boolean => /^- \[[^\]]+\]\([^)]+\)$/u.test(line))).toBe(
      true,
    );
  });
});
