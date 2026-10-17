import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { docsSecurity } from "./product-contract.test.helpers.ts";

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(PROJECT_ROOT, "api-reference/drafts/get.mdx"), "utf8");
const normalizedPage = page.replaceAll(/\s+/gu, " ");

describe("get tweet draft documentation", (): void => {
  it("keeps every authentication scheme aligned", (): void => {
    expect.assertions(1);

    expect(docsSecurity("getDraft")).toStrictEqual([{ apiKey: [] }, { oauthBearer: [] }]);
  });

  it("documents only the canonical draft response fields", (): void => {
    expect.assertions(1);

    expect({
      canonicalFields: ["id", "text", "topic", "goal", "createdAt", "updatedAt"].every((field) =>
        page.includes(`<ResponseField name="${field}"`),
      ),
      mediaDenied: normalizedPage.includes(
        "The draft object contains no media, reply target, or tweet ID.",
      ),
      threadDenied: normalizedPage.includes(
        "It does not return thread order, media attachments, reply targets, or publishing results.",
      ),
    }).toStrictEqual({
      canonicalFields: true,
      mediaDenied: true,
      threadDenied: true,
    });
  });

  it("separates retrieval from native drafts and write actions", (): void => {
    expect.assertions(1);

    expect({
      nativeBoundary: normalizedPage.includes(
        "Xquik drafts are separate from [X's native Unsent posts]",
      ),
      noEdit: normalizedPage.includes("This route provides no edit operation."),
      noPublish: normalizedPage.includes(
        "Reading a draft never sends text to followers or creates likes and replies.",
      ),
      readScope: page.includes("## Retrieve one tweet draft by ID"),
    }).toStrictEqual({
      nativeBoundary: true,
      noEdit: true,
      noPublish: true,
      readScope: true,
    });
  });

  it("preserves focused tweet draft retrieval search intent", (): void => {
    expect.assertions(1);

    expect(
      [
        'title: "Get a tweet draft by ID with the Xquik API"',
        '"get tweet draft"',
        '"retrieve tweet draft"',
        "## Read the tweet draft fields",
        "## Build a tweet draft review workflow",
        "## Tweet draft retrieval questions",
      ].every((snippet) => page.includes(snippet)),
    ).toBe(true);
  });
});
