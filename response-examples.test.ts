import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { GENERATED_RESPONSE_EXAMPLES_START } from "./scripts/lib/generated-response-examples.ts";
import { replaceBlock, run } from "./scripts/response-examples.ts";

const PAGE =
  '---\napi: "GET /fixture"\n---\n\nimport Intro from "/intro.mdx";\n\nOriginal guidance.\n';
const roots: string[] = [];

/** A temporary docs root holding `files`, removed after the test. */
function docsRoot(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), "response-examples-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

/** The code block that syncing writes for a 200 response of `response`. */
function syncedExample(response: unknown, components: unknown = {}): string {
  const root = docsRoot({
    "api-reference/a.mdx": PAGE,
    "openapi.yaml": JSON.stringify({
      components,
      paths: { "/fixture": { get: { responses: { "200": response } } } },
    }),
  });
  run(root, false);
  const page = readFileSync(join(root, "api-reference/a.mdx"), "utf8");
  return (page.match(/```\w+\n([\s\S]*?)\n {4}```/u)?.[1] ?? "").replaceAll(/^ {4}/gmu, "");
}

function jsonResponse(schema: unknown): unknown {
  return { content: { "application/json": { schema } } };
}

afterEach((): void => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe("response example sync", (): void => {
  it("reports a stale page, writes its tabs once, then verifies it", (): void => {
    expect.assertions(6);
    const root = docsRoot({
      "api-reference/a.mdx": PAGE,
      "api-reference/overview.mdx": "Overview without an operation.\n",
      "openapi.yaml": "paths: {'/fixture': {get: {responses: {'200': {description: Ready}}}}}\n",
    });
    const page = (): string => readFileSync(join(root, "api-reference/a.mdx"), "utf8");

    expect((): string => run(root, true)).toThrow(
      "api-reference/a.mdx: response examples are stale.",
    );
    expect(page()).toBe(PAGE);
    expect(run(root, false)).toBe("Synchronized 1 response statuses across 1 API pages.\n");
    expect(run(root, true)).toBe("Verified 1 response statuses across 1 API pages.\n");
    expect(page()).toContain("```text\n    Ready\n    ```");
    expect([
      page().endsWith("Original guidance.\n"),
      page().split(GENERATED_RESPONSE_EXAMPLES_START).length - 1,
    ]).toStrictEqual([true, 1]);
  });

  it("writes no page when 1 page names an unknown operation", (): void => {
    expect.assertions(2);
    const root = docsRoot({
      "api-reference/a.mdx": PAGE,
      "api-reference/z.mdx": PAGE.replace("/fixture", "/missing"),
      "openapi.yaml": "paths: {'/fixture': {get: {responses: {'200': {description: Ready}}}}}\n",
    });

    expect((): string => run(root, false)).toThrow(
      "api-reference/z.mdx: OpenAPI operation not found.",
    );
    expect(readFileSync(join(root, "api-reference/a.mdx"), "utf8")).toBe(PAGE);
  });

  it.each([
    [{ items: { format: "uri" }, type: "array" }, '[\n  "https://example.com/resource"\n]'],
    [{ oneOf: [{ format: "date-time" }] }, '"2026-08-01T09:00:00.000Z"'],
    [{ anyOf: [{ format: "url" }] }, '"https://example.com/resource"'],
    [{ $ref: "#/missing" }, "{}"],
    [{ $ref: "#/components/schemas/Loop" }, "{}"],
    [
      {
        allOf: [
          { properties: { available: { type: "boolean" } }, type: "object" },
          { properties: { score: { type: "integer" } }, type: "object" },
        ],
      },
      '{\n  "available": false,\n  "score": 0\n}',
    ],
    [{ default: true, example: null }, "null"],
    [{ const: false, default: true }, "false"],
    [{ default: 0 }, "0"],
    [{ enum: [0, 1] }, "0"],
    [{ properties: { name: {} }, required: ["name"] }, '{\n  "name": "<string>"\n}'],
  ])("derives the example of schema %j", (schema, example): void => {
    expect.assertions(1);
    expect(
      syncedExample(jsonResponse(schema), {
        schemas: { Loop: { $ref: "#/components/schemas/Loop" } },
      }),
    ).toBe(example);
  });

  it.each([
    ["204", { description: "Deleted" }, "No response body."],
    ["200", {}, "No response body."],
    [
      "202",
      jsonResponse({ example: { action: "old", id: "7" } }),
      '{\n  "action": "create_tweet",\n  "id": "7"\n}',
    ],
    [
      "429",
      jsonResponse({ example: { detail: "wait", error: "rate_limited", retryAfter: 30 } }),
      '{\n  "error": "rate_limited",\n  "retryAfter": 30\n}',
    ],
    [
      "200",
      {
        content: { "text/csv": { example: "id,text" }, "application/problem+json": { example: 1 } },
      },
      "1",
    ],
  ])("shows a %s response of %j as %j", (status, response, example): void => {
    expect.assertions(1);
    const root = docsRoot({
      "api-reference/a.mdx": PAGE,
      "openapi.yaml": JSON.stringify({
        paths: {
          "/fixture": {
            get: { responses: { [status]: response }, "x-write-action": "create_tweet" },
          },
        },
      }),
    });
    run(root, false);
    const page = readFileSync(join(root, "api-reference/a.mdx"), "utf8");

    expect(page).toContain(
      `<Tab title="${status}" id="response-a-${status}">\n\n    \`\`\`${example === "No response body." ? "text" : "json"}\n    ${example.replaceAll("\n", "\n    ")}\n    \`\`\``,
    );
  });

  it.each([
    ["https://example.com/response", "Only local OpenAPI references are supported"],
    ["#/missing", "OpenAPI reference not found: #/missing"],
  ])("rejects the response reference %s", (ref, message): void => {
    expect.assertions(1);
    expect((): string => syncedExample({ $ref: ref })).toThrow(message);
  });

  it.each([
    [GENERATED_RESPONSE_EXAMPLES_START, "markers are incomplete"],
    ["No frontmatter", "no frontmatter insertion point"],
    ["---\ntitle: Test\n---\nNo imports", "no import insertion point"],
  ])("refuses to place a block in %j", (source, message): void => {
    expect.assertions(1);
    expect((): string => replaceBlock(source, "replacement")).toThrow(message);
  });
});
