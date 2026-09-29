import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { docsContract, productCheck, productOperation } from "./product-contract.test.helpers.ts";

const source = readFileSync(new URL("api-reference/styles/compare.mdx", import.meta.url), "utf8");

describe("compare tweet writing profiles documentation", (): void => {
  it("matches every canonical response status and authentication method", (): void => {
    expect.assertions(1);

    expect({
      apiKeyDocumented: source.includes("Send `x-api-key`"),
      bearerDocumented: source.includes("OAuth clients can send a bearer token"),
      responseTabs: [...source.matchAll(/<Tab title="(\d{3})"/gu)].map(([, status]) => status),
    }).toStrictEqual({
      apiKeyDocumented: true,
      bearerDocumented: true,
      responseTabs: ["200", "400", "401", "404", "429"],
    });
  });

  it("documents ordered cache lookups for usernames and custom labels", (): void => {
    expect.assertions(1);

    expect({
      accountScopeDocumented: source.includes("Xquik performs 2 account-scoped cache lookups."),
      customLabelsSupported: source.includes("They also accept saved custom labels."),
      numericIdsDenied: source.includes("Do not send numeric database IDs."),
      responseOrderDocumented:
        /`style1` matches `username1`\. `style2`\s+matches `username2`\./u.test(source),
    }).toStrictEqual({
      accountScopeDocumented: true,
      customLabelsSupported: true,
      numericIdsDenied: true,
      responseOrderDocumented: true,
    });
  });

  it("separates returned writing samples from calculated conclusions", (): void => {
    expect.assertions(1);

    expect({
      analyticsBoundaryDocumented:
        /Compare Styles returns no likes, replies, reposts, quotes, bookmarks, views,\s+followers, or impressions\./u.test(
          source,
        ),
      calculationDenied: source.includes(
        "It does not contact X, refresh\ntweets, or calculate a writing-style score.",
      ),
      observableReviewDocumented: source.includes(
        "Use observable text features before assigning subjective labels:",
      ),
      toneOutputDenied:
        /It does not\s+generate conclusions about voice, tone, vocabulary, readability, or sentiment\./u.test(
          source,
        ),
    }).toStrictEqual({
      analyticsBoundaryDocumented: true,
      calculationDenied: true,
      observableReviewDocumented: true,
      toneOutputDenied: true,
    });
  });

  it("uses measured and tightly related tweet-writing language", (): void => {
    expect.assertions(1);

    const frontmatter = source.slice(0, source.indexOf("---", 4) + 3);

    expect({
      focusedTitle: frontmatter.includes("Compare 2 cached tweet writing profiles with Xquik"),
      keywordsPresent: [
        "tweet writing",
        "compare tweet styles",
        "Twitter writing style",
        "X brand voice",
        "tweet writing samples",
      ].every((keyword) => frontmatter.includes(keyword)),
      unsupportedDescriptionSignals: /tone|vocabulary|engagement signals/iu.test(frontmatter),
    }).toStrictEqual({
      focusedTitle: true,
      keywordsPresent: true,
      unsupportedDescriptionSignals: false,
    });
  });

  productCheck("matches the product OpenAPI operation", (spec): void => {
    expect.assertions(1);

    const docs = docsContract(source);
    const product = productOperation(spec, "compareStyles");
    const fields = [...(product?.successFields ?? []), ...(product?.itemFields("style1") ?? [])];

    expect({
      parameters: product?.parameters.toSorted(),
      statuses: product?.statuses,
      undocumentedFields: fields.filter(
        (field) => !docs.fields.includes(field) && !["style1", "style2"].includes(field),
      ),
    }).toStrictEqual({
      parameters: docs.parameters,
      statuses: docs.statuses,
      undocumentedFields: [],
    });
  });
});
