import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("api-reference/styles/performance.mdx", import.meta.url),
  "utf8",
);

describe("tweet style performance documentation", (): void => {
  it("matches every canonical response status and authentication method", (): void => {
    expect.assertions(1);

    expect({
      apiKeyDocumented: source.includes("Send `x-api-key`"),
      bearerDocumented: source.includes("OAuth clients can send a bearer token"),
      responseTabs: [...source.matchAll(/<Tab title="(\d{3})"/gu)].map(([, status]) => status),
    }).toStrictEqual({
      apiKeyDocumented: true,
      bearerDocumented: true,
      responseTabs: ["200", "401", "402", "404", "422", "429"],
    });
  });

  it("documents every current tweet metric without promising private analytics", (): void => {
    expect.assertions(1);

    expect({
      metricFields: [
        "bookmarkCount",
        "likeCount",
        "quoteCount",
        "replyCount",
        "retweetCount",
        "viewCount",
      ].every((field) => source.includes(`<ResponseField name="${field}"`)),
      privateMetricsDenied: source.includes("It does not expose private analytics."),
      uniqueViewsDenied: source.includes("`viewCount` is not a unique-audience field."),
    }).toStrictEqual({
      metricFields: true,
      privateMetricsDenied: true,
      uniqueViewsDenied: true,
    });
  });

  it("defines reproducible snapshots and derived rates", (): void => {
    expect.assertions(1);

    expect({
      clientTimestampRequired: source.includes(
        "Record the client request time beside every successful response.",
      ),
      interactionFormula: source.includes("`likes + replies + reposts + quotes + bookmarks`"),
      noHistoricalDeltas: source.includes(
        "It does not return saved analytics,\nhistorical deltas, or a precomputed engagement rate.",
      ),
      viewCountExcluded: source.includes(
        "Do not include `viewCount` in the interaction numerator.",
      ),
    }).toStrictEqual({
      clientTimestampRequired: true,
      interactionFormula: true,
      noHistoricalDeltas: true,
      viewCountExcluded: true,
    });
  });

  it("keeps metered live lookups separate from custom writing samples", (): void => {
    expect.assertions(1);

    expect({
      customIdsDenied:
        /A custom style\s+saved from supplied text contains local sample IDs\. Those IDs cannot produce X\s+tweet analytics\./u.test(
          source,
        ),
      liveLookupDocumented: source.includes("This route contacts X on every request."),
      meteredDocumented: source.includes("**1 credit per tweet returned**"),
      numericIdsDenied: source.includes("not a numeric database ID"),
    }).toStrictEqual({
      customIdsDenied: true,
      liveLookupDocumented: true,
      meteredDocumented: true,
      numericIdsDenied: true,
    });
  });

  it("uses measured and tightly related tweet analytics phrases", (): void => {
    expect.assertions(1);

    const frontmatter = source.slice(0, source.indexOf("---", 4) + 3);

    expect({
      focusedTitle: frontmatter.includes("Tweet analytics API for likes, replies & reposts"),
      keywordsPresent: [
        "twitter analytics",
        "x analytics",
        "tweet analytics",
        "twitter tweet analytics",
        "twitter analytics for another account",
      ].every((keyword) => frontmatter.includes(keyword)),
      vagueDescription: /data|details|information/iu.test(frontmatter),
    }).toStrictEqual({
      focusedTitle: true,
      keywordsPresent: true,
      vagueDescription: false,
    });
  });
});
