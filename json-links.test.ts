import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { jsonLinkFaults } from "./scripts/built-pages.ts";
import { sourceJsonLinkFaults } from "./scripts/lib/json-links.ts";

const TYPED = 'href="https://xquik.com/trust.json" type="application/json"';
const SOURCE_LINK = `<a ${TYPED} className="link" target="_blank" rel="noreferrer">`;
const BUILT_LINK = `<a ${TYPED} class="link" target="_blank" rel="noreferrer">`;
const SPEC = "https://xquik.com/openapi.json";

describe("links to a JSON file", () => {
  it("tells a crawler that each link to a JSON file on every page opens JSON, styled & opened as Mintlify does a Markdown link", () => {
    expect.assertions(1);
    const pages = execFileSync("git", ["ls-files", "*.mdx"], { encoding: "utf8" })
      .split("\n")
      .filter((file) => file !== "");

    expect(
      pages.flatMap((page) =>
        sourceJsonLinkFaults(readFileSync(page, "utf8")).map((link) => `${page} ${link}`),
      ),
    ).toStrictEqual([]);
  });

  it("finds a page's link to a JSON file in each form Markdown & MDX write it, unless it is a typed anchor that stays on the site it downloads from", () => {
    expect.assertions(1);
    const written: readonly (readonly [string, string])[] = [
      [`<a href="${SPEC}">`, "OpenAPI file</a>"],
      [`<a href='${SPEC}'>`, "OpenAPI file</a>"],
      [`<a href={"${SPEC}"}>`, "OpenAPI file</a>"],
      [`<Card title="OpenAPI file" href="${SPEC}">`, "</Card>"],
      [`[OpenAPI file](${SPEC})`, ""],
      [`[OpenAPI file](<${SPEC}> "spec")`, ""],
      [`[spec]: ${SPEC}`, ""],
      [`<${SPEC}>`, ""],
      [SOURCE_LINK.replace(">", " download>"), "JSON file</a>"],
    ];

    expect(
      written.map(([link, rest]) =>
        sourceJsonLinkFaults(`The ${SOURCE_LINK}JSON file</a> holds them.\n\n${link}${rest}\n`),
      ),
    ).toStrictEqual(written.map(([link]) => [link]));
  });

  it("adds no fault for another typed link or a download from the docs site itself", () => {
    expect.assertions(1);
    const local = (href: string): string =>
      SOURCE_LINK.replace("https://xquik.com/trust.json", href).replace(">", " download>");
    const source = [
      `The ${SOURCE_LINK}JSON file</a> holds them.`,
      `${SOURCE_LINK.replace("trust", "openapi")}OpenAPI file</a>`,
      `${local("/files/trust.json")}JSON file</a>`,
      `${local("https://docs.xquik.com/files/trust.json")}JSON file</a>`,
    ].join("\n\n");

    expect(sourceJsonLinkFaults(source)).toStrictEqual([]);
  });

  it("finds a built link to a JSON file that lacks its type, its link class, its new tab or its referrer rule, or that asks to download a file from another site", () => {
    expect.assertions(1);
    const bare = '<a href="https://xquik.com/trust.json" type="application/json">';
    const download = BUILT_LINK.replace(">", ' download="">');
    const local = BUILT_LINK.replace("https://xquik.com", "").replace(">", ' download="">');
    const page = '<a href="https://xquik.com/en/benchmarks" class="link">';

    expect(
      jsonLinkFaults(
        new Map([
          ["/trust", `${BUILT_LINK}${page}${local}`],
          ["/", `${bare}${page}`],
          ["/api-reference/overview", `${page}${download}`],
        ]),
      ),
    ).toStrictEqual([`/ ${bare}`, `/api-reference/overview ${download}`]);
  });
});
