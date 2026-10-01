import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { docsSecurity } from "./product-contract.test.helpers.ts";

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(PROJECT_ROOT, "api-reference/drafts/delete.mdx"), "utf8");
const normalizedPage = page.replaceAll(/\s+/gu, " ");
const openapi = readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8");
const deleteOperation = openapi.slice(
  openapi.indexOf("      operationId: deleteDraft"),
  openapi.indexOf("\n  /styles:", openapi.indexOf("      operationId: deleteDraft")),
);

describe("delete tweet draft documentation", (): void => {
  it("keeps every response and authentication scheme aligned", (): void => {
    expect.assertions(1);

    expect({
      security: docsSecurity("deleteDraft"),
      statuses: ["204", "400", "401", "404", "429"].every((status) =>
        deleteOperation.includes(`        '${status}':`),
      ),
    }).toStrictEqual({ security: [{ apiKey: [] }, { oauthBearer: [] }], statuses: true });
  });

  it("handles the empty success response in every client example", (): void => {
    expect.assertions(1);

    expect({
      curlDoesNotPipeJson: !page.includes("| jq"),
      goChecks204: page.includes("if resp.StatusCode != http.StatusNoContent {"),
      javascriptChecks204: page.includes("if (response.status !== 204) {"),
      noSuccessBody: normalizedPage.includes("The response has no JSON, text, or deletion object."),
      pythonChecks204: page.includes("if response.status_code != 204:"),
    }).toStrictEqual({
      curlDoesNotPipeJson: true,
      goChecks204: true,
      javascriptChecks204: true,
      noSuccessBody: true,
      pythonChecks204: true,
    });
  });

  it("separates Xquik drafts from native and published posts", (): void => {
    expect.assertions(1);

    expect({
      destructive: normalizedPage.includes(
        "Deletion is permanent. Xquik provides no restore endpoint",
      ),
      nativeDraftPreserved: normalizedPage.includes(
        "It does not manage drafts under [X's native Unsent posts]",
      ),
      publishedPostPreserved: normalizedPage.includes(
        "It also does not delete published tweets, scheduled posts, or connected X accounts.",
      ),
      singleDraftScope: page.includes("## Delete one saved tweet draft"),
    }).toStrictEqual({
      destructive: true,
      nativeDraftPreserved: true,
      publishedPostPreserved: true,
      singleDraftScope: true,
    });
  });

  it("preserves focused tweet draft deletion search intent", (): void => {
    expect.assertions(1);

    expect(
      [
        'title: "Delete saved tweet drafts by ID with the Xquik API"',
        '"tweet draft"',
        '"delete tweet draft"',
        "## Handle 204 no content",
        "## Recover from draft deletion errors",
        "## Tweet draft deletion questions",
      ].every((snippet) => page.includes(snippet)),
    ).toBe(true);
  });
});
