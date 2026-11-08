import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { documentedFields, leafName } from "./documented-fields.ts";

const PAGE = `Intro

| Query parameter | Type             | Required | Description        |
| --------------- | ---------------- | -------- | ------------------ |
| \`limit\`         | \`number\`         | Yes      | Page size.         |
| \`cursor\`        | \`string \\| null\` | No       | Next page.         |

| Field          | Type     | Description |
| -------------- | -------- | ----------- |
| \`tweets[].id\`  | \`string\` | Post ID.    |

| Status | Response body |
| ------ | ------------- |
| \`401\`  | \`{}\`          |
`;

describe("documentedFields", () => {
  it("reads each field table and skips other tables", (): void => {
    expect.assertions(1);
    expect(documentedFields(PAGE)).toStrictEqual([
      { description: "Page size.", kind: "query", name: "limit", required: true, type: "number" },
      {
        description: "Next page.",
        kind: "query",
        name: "cursor",
        required: false,
        type: "string | null",
      },
      {
        description: "Post ID.",
        kind: "response",
        name: "tweets[].id",
        required: false,
        type: "string",
      },
    ]);
  });

  it("reads any field name it wrote back", (): void => {
    expect.assertions(1);
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Za-z][\w.-]{0,20}$/u), (name): boolean => {
        const rows = `| Header | Type | Required | Description |\n| --- | --- | --- | --- |\n| \`${name}\` | \`string\` | No | Text. |`;
        return documentedFields(rows)[0]?.name === name;
      }),
    );
    expect(leafName("tweets[].author.media[]")).toBe("media");
  });
});
