import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const CONTEXT7_LIBRARY_URL = "https://context7.com/xquik-dev/xquik-docs";
const CONTEXT7_WEBSITE_URL = "https://context7.com/websites/xquik";
const PUBLIC_KEY_PREFIX = "pk_";
const CONTEXT7_PUBLIC_KEY = "pk_oCPeRRqZFJsY4cCUSotDD";
// Context7 parses only these folders & the root Markdown files, so the
// OpenAPI copy, tests & package files stay out of the index.
const DOC_FOLDERS = [
  "api-reference",
  "guides",
  "mcp",
  "mpp",
  "oauth",
  "sdks",
  "snippets",
  "webhooks",
] as const;
// Root files that are not docs, pages that repeat others & retired pages.
const REQUIRED_EXCLUDED_FILES = [
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "changelog.mdx",
  "hermes-tweet.mdx",
  "llms.txt",
  "robots.txt",
  "security.txt",
  "twitter-api-alternatives.mdx",
] as const;
const PAGE_PATH = /^[a-z\d-]+\/[a-z\d/-]+$/u;
const REQUIRED_RULE_SNIPPETS = [
  "x-api-quickstart.mdx",
  "api-reference/overview.mdx",
  "the documented REST operations",
  "the prepaid paid-read routes",
  "fixed-price direct MPP operations",
  "sdks/",
  "mcp/",
  "guides/troubleshooting.mdx",
  "Current Codex CLI supports Xquik OAuth",
  "Roo Code is archived and API-key only",
  "Pi 1.0.0 has native MCP",
  "Goose supports native OAuth",
  "mcp/coding-agents.mdx",
  "guides/guest-wallets.mdx",
  "webhooks/",
  "guides/workflows.mdx",
  "guides/tweet-scraper-csv-export.mdx",
  "guides/tweet-replies-export.mdx",
  "guides/follower-export-crm.mdx",
  "guides/media-upload-workflow.mdx",
  "guides/direct-message-workflow.mdx",
] as const;

interface Context7Config {
  readonly $schema?: string;
  readonly branch?: string;
  readonly excludeFiles?: readonly string[];
  readonly folders?: readonly string[];
  readonly public_key?: string;
  readonly rules?: readonly string[];
  readonly url?: string;
}

function readContext7Config(path: string): Context7Config {
  return JSON.parse(readFileSync(path, "utf8")) as Context7Config;
}

function missingEntries(
  actual: readonly string[] | undefined,
  expected: readonly string[],
): readonly string[] {
  const actualEntries = new Set(actual ?? []);

  return expected.filter((entry): boolean => !actualEntries.has(entry));
}

describe("Context7 configuration", (): void => {
  it("keeps ownership fields exact for the public docs repository library", (): void => {
    expect.assertions(4);

    const config = readContext7Config("context7.json");

    expect(config.$schema).toBe("https://context7.com/schema/context7.json");
    expect(config.branch).toBe("main");
    expect(config.url).toBe(CONTEXT7_LIBRARY_URL);
    expect(config.public_key?.startsWith(PUBLIC_KEY_PREFIX)).toBe(true);
  });

  it("indexes the doc folders the navigation shows, apart from alternatives", (): void => {
    expect.assertions(2);

    const config = readContext7Config("context7.json");
    const indexed = new Set<string>(DOC_FOLDERS);
    const shown = new Set(
      readFileSync("docs.json", "utf8")
        .split('"')
        .filter((value): boolean => PAGE_PATH.test(value))
        .map((page): string => page.split("/")[0] ?? ""),
    );
    shown.delete("alternatives");

    expect(config.folders).toStrictEqual(DOC_FOLDERS);
    expect([...shown].filter((folder): boolean => !indexed.has(folder))).toStrictEqual([]);
  });

  it("keeps non-doc root files out by file name, the only form Context7 reads", (): void => {
    expect.assertions(2);

    const config = readContext7Config("context7.json");

    expect(missingEntries(config.excludeFiles, REQUIRED_EXCLUDED_FILES)).toStrictEqual([]);
    expect((config.excludeFiles ?? []).filter((file): boolean => file.includes("/"))).toStrictEqual(
      [],
    );
  });

  it("keeps Context7 rules pointed at the pages agents should read first", (): void => {
    expect.assertions(1);

    const config = readContext7Config("context7.json");
    const rules = (config.rules ?? []).join("\n");
    const missingRuleSnippets = REQUIRED_RULE_SNIPPETS.filter(
      (snippet): boolean => !rules.includes(snippet),
    );

    expect(missingRuleSnippets).toStrictEqual([]);
  });

  it("keeps the public website ownership claim exact", (): void => {
    expect.assertions(2);

    const claim = readContext7Config("docs/context7.json");

    expect(claim.url).toBe(CONTEXT7_WEBSITE_URL);
    expect(claim.public_key).toBe(CONTEXT7_PUBLIC_KEY);
  });
});
