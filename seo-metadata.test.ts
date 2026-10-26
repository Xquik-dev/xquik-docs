import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { z } from "zod";

const MIN_DESCRIPTION_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 160;
const MIN_RENDERED_TITLE_LENGTH = 50;
const MAX_RENDERED_TITLE_LENGTH = 60;
const TITLE_SUFFIX = " - Xquik";
const SITE_DESCRIPTION =
  "Search tweets, export followers and replies, retrieve profiles and timelines, monitor accounts, post tweets, and use webhooks, SDKs & MCP. Not affiliated with X Corp.";


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

const docsConfigSchema = z.looseObject({
  description: z.string(),
  metadata: z.looseObject({ "og:description": z.string(), timestamp: z.boolean() }),
  navigation: navigationGroup,
  search: z.looseObject({ prompt: z.string() }),
  seo: z.looseObject({ indexing: z.string() }),
  styling: z.looseObject({ latex: z.boolean() }),
});

type DocsConfig = z.infer<typeof docsConfigSchema>;

interface MetadataFinding {
  readonly file: string;
  readonly issue: string;
}

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
  return page
    .replace(/^\/+/u, "")
    .replace(/\.mdx?$/u, "")
    .replace(/#.*$/u, "");
}

function frontmatter(source: string): string | undefined {
  return /^---\n([\s\S]*?)\n---/u.exec(source)?.[1];
}

function frontmatterValue(metadata: string, key: string): string | undefined {
  const match = new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.+))$`, "mu").exec(metadata);
  return match?.[1] ?? match?.[2] ?? match?.[3]?.trim();
}

function loadDocsConfig(): DocsConfig {
  return docsConfigSchema.parse(JSON.parse(readFileSync("docs.json", "utf8")));
}

function navigationPages(): readonly string[] {
  return [...new Set(flattenNavigationPages(loadDocsConfig().navigation))];
}

function collectMetadataFindings(): readonly MetadataFinding[] {
  const findings: MetadataFinding[] = [];
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();

  for (const page of navigationPages()) {
    const file = `${page}.mdx`;
    const metadata = frontmatter(readFileSync(file, "utf8"));
    if (metadata === undefined) {
      findings.push({ file, issue: "Missing frontmatter." });
      continue;
    }

    const title = frontmatterValue(metadata, "title");
    if (title === undefined || title.trim() === "") {
      findings.push({ file, issue: "Missing title." });
    } else {
      const renderedTitle = `${title}${TITLE_SUFFIX}`;
      if (renderedTitle.length < MIN_RENDERED_TITLE_LENGTH) {
        findings.push({
          file,
          issue: `Rendered title is ${renderedTitle.length} characters; minimum is ${MIN_RENDERED_TITLE_LENGTH}.`,
        });
      }

      if (renderedTitle.length > MAX_RENDERED_TITLE_LENGTH) {
        findings.push({
          file,
          issue: `Rendered title is ${renderedTitle.length} characters; maximum is ${MAX_RENDERED_TITLE_LENGTH}.`,
        });
      }

      const duplicateFile = titles.get(renderedTitle);
      if (duplicateFile === undefined) {
        titles.set(renderedTitle, file);
      } else {
        findings.push({
          file,
          issue: `Rendered title duplicates ${duplicateFile}.`,
        });
      }
    }

    const description = frontmatterValue(metadata, "description");
    if (description === undefined || description.trim() === "") {
      findings.push({ file, issue: "Missing description." });
      continue;
    }

    if (description.length < MIN_DESCRIPTION_LENGTH) {
      findings.push({
        file,
        issue: `Description is ${description.length} characters; minimum is ${MIN_DESCRIPTION_LENGTH}.`,
      });
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      findings.push({
        file,
        issue: `Description is ${description.length} characters; maximum is ${MAX_DESCRIPTION_LENGTH}.`,
      });
    }

    const duplicateFile = descriptions.get(description);
    if (duplicateFile === undefined) {
      descriptions.set(description, file);
    } else {
      findings.push({
        file,
        issue: `Description duplicates ${duplicateFile}.`,
      });
    }
  }

  return findings;
}

describe("SEO metadata", (): void => {
  it("keeps site discovery metadata specific and intentionally indexed", (): void => {
    expect.assertions(1);

    const config = loadDocsConfig();
    expect({
      description: config.description,
      indexing: config.seo.indexing,
      latex: config.styling.latex,
      openGraphDescription: config.metadata["og:description"],
      searchPrompt: config.search.prompt,
    }).toStrictEqual({
      description: SITE_DESCRIPTION,
      indexing: "all",
      latex: false,
      openGraphDescription: SITE_DESCRIPTION,
      searchPrompt: "Search docs",
    });
  });

  it("disables timezone-sensitive page timestamps", (): void => {
    expect.assertions(1);

    expect(loadDocsConfig().metadata.timestamp).toBe(false);
  });

  it("keeps every navigation page title and description usable for search previews", (): void => {
    expect.assertions(1);

    expect(collectMetadataFindings()).toStrictEqual([]);
  });

  it.each([
    ["sdks/python.mdx", "Twitter API Python SDK"],
    ["sdks/typescript.mdx", "Twitter API TypeScript SDK"],
    ["sdks/go.mdx", "Twitter API Go SDK"],
    ["sdks/ruby.mdx", "Twitter API Ruby SDK"],
    ["sdks/csharp-x-api-sdk.mdx", "Twitter API C# SDK"],
    ["sdks/java.mdx", "Twitter API Java SDK"],
    ["sdks/kotlin.mdx", "Twitter API Kotlin SDK"],
    ["sdks/php.mdx", "Twitter API PHP SDK"],
    ["sdks/cli.mdx", "Twitter CLI & X CLI"],
    ["mcp/overview.mdx", "Twitter MCP server & X MCP server"],
    ["guides/billing.mdx", "Twitter API pricing"],
    ["x-api-quickstart.mdx", "Twitter API quickstart"],
  ])("opens the title of %s with the searched phrase", (file, phrase): void => {
    expect.assertions(1);

    const metadata = frontmatter(readFileSync(file, "utf8")) ?? "";
    expect(frontmatterValue(metadata, "title")?.slice(0, phrase.length)).toBe(phrase);
  });

  it("keeps the Go SDK navigation link descriptive", (): void => {
    expect.assertions(1);

    expect(readFileSync("sdks/go.mdx", "utf8")).toContain('sidebarTitle: "Go SDK"');
  });
});
