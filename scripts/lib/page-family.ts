import { readFileSync } from "node:fs";

const SDK_PAGES = [
  ["csharp", "sdks/csharp-x-api-sdk.mdx"],
  ["go", "sdks/go.mdx"],
  ["java", "sdks/java.mdx"],
  ["kotlin", "sdks/kotlin.mdx"],
  ["php", "sdks/php.mdx"],
  ["python", "sdks/python.mdx"],
  ["ruby", "sdks/ruby.mdx"],
  ["typescript", "sdks/typescript.mdx"],
] as const;

const SDK_TOPICS = ["follower-export", "media-tweets", "tweet-search"] as const;

const TYPE_TOPICS = ["account", "content", "data", "job", "monitor", "request", "shared"] as const;

const EXECUTE_TOPICS = ["follower", "media", "monitor", "tweet"] as const;

const PAGE_FAMILIES: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>([
  ...SDK_PAGES.map(([language, page]): readonly [string, readonly string[]] => [
    page,
    SDK_TOPICS.map((topic): string => `sdks/${language}-${topic}.mdx`),
  ]),
  ["api-reference/extractions/create.mdx", ["api-reference/extractions/parameters.mdx"]],
  ["guides/extraction-workflow.mdx", ["guides/extraction-data-handoff.mdx"]],
  [
    "guides/x-api-typescript-types.mdx",
    TYPE_TOPICS.map((topic): string => `guides/x-api-typescript-${topic}-types.mdx`),
  ],
  [
    "guides/zapier.mdx",
    [
      "guides/zapier-error-handling.mdx",
      "guides/zapier-monitor-rest-hook.mdx",
      "guides/zapier-result-handoff.mdx",
    ],
  ],
  ["mcp/tools.mdx", EXECUTE_TOPICS.map((topic): string => `mcp/execute-${topic}-examples.mdx`)],
  [
    "webhooks/verification.mdx",
    [
      "webhooks/idempotency.mdx",
      "webhooks/verification-go.mdx",
      "webhooks/verification-python.mdx",
    ],
  ],
  ["x-api-quickstart.mdx", ["x-api-quickstart-webhooks.mdx"]],
]);

function readPageFamily(page: string): string {
  return [page, ...(PAGE_FAMILIES.get(page) ?? [])]
    .map((path): string => readFileSync(path, "utf8"))
    .join("\n");
}

export { readPageFamily };
