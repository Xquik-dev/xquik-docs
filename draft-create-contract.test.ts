import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { docsSecurity } from "./product-contract.test.helpers.ts";
import { hasDocumentedField } from "./scripts/lib/documented-fields.ts";

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(PROJECT_ROOT, "api-reference/drafts/create.mdx"), "utf8");
const normalizedPage = page.replaceAll(/\s+/gu, " ");

describe("create tweet draft documentation", (): void => {
  it("pins the OpenAPI security schemes", (): void => {
    expect.assertions(1);

    expect(docsSecurity("createDraft")).toStrictEqual([{ apiKey: [] }, { oauthBearer: [] }]);
  });

  it("documents canonical request and response fields", (): void => {
    expect.assertions(1);

    expect({
      requestFields: ["text", "topic", "goal"].every((field) =>
        hasDocumentedField(page, "body", field),
      ),
      responseFields: ["id", "text", "topic", "goal", "createdAt", "updatedAt"].every((field) =>
        hasDocumentedField(page, "response", field),
      ),
      unsupportedFieldsDenied: normalizedPage.includes(
        "The response contains no thread order, media attachment, reply target, or schedule. It also contains no publishing status or public tweet ID.",
      ),
    }).toStrictEqual({
      requestFields: true,
      responseFields: true,
      unsupportedFieldsDenied: true,
    });
  });

  it("preserves focused tweet draft creation search intent", (): void => {
    expect.assertions(1);

    expect(
      [
        'title: "Create a tweet draft, X (Twitter) API docs"',
        '"tweet draft"',
        '"create tweet draft"',
        "## Choose the tweet draft fields",
        "## Build a tweet draft review workflow",
        "## Tweet draft creation questions",
      ].every((snippet) => page.includes(snippet)),
    ).toBe(true);
  });

  it("separates draft storage from native X and publishing", (): void => {
    expect.assertions(1);

    expect({
      nativeBoundary: normalizedPage.includes(
        "Xquik drafts are separate from [X's native Unsent posts]",
      ),
      noEdit: normalizedPage.includes("This route provides no edit operation."),
      noIdempotency: normalizedPage.includes("This route also provides no idempotency key."),
      noPublish: normalizedPage.includes("This request does not publish a tweet."),
    }).toStrictEqual({
      nativeBoundary: true,
      noEdit: true,
      noIdempotency: true,
      noPublish: true,
    });
  });
});
