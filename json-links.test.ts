import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { downloadFaults, jsonLinkFaults } from "./scripts/built-pages.ts";
import { sourceDownloadFaults, sourceJsonLinkFaults } from "./scripts/lib/json-links.ts";

const TYPED = 'href="https://xquik.com/trust.json" type="application/json"';
const SOURCE_LINK = `<a ${TYPED} className="link" target="_blank" rel="noreferrer">`;
const BUILT_LINK = `<a ${TYPED} class="link" target="_blank" rel="noreferrer">`;
const SPEC = "https://xquik.com/openapi.json";
const YAML_SPEC = "https://xquik.com/openapi.yaml";

describe("links to a JSON file", () => {
  it("tells a crawler that each link to a JSON file on every page opens JSON, styled & opened as Mintlify does a Markdown link, & asks no browser to download a file from another site", () => {
    expect.assertions(1);
    const pages = execFileSync("git", ["ls-files", "*.mdx"], { encoding: "utf8" })
      .split("\n")
      .filter((file) => file !== "");

    expect(
      pages.flatMap((page) =>
        [sourceJsonLinkFaults, sourceDownloadFaults]
          .flatMap((faults) => faults(readFileSync(page, "utf8")))
          .map((link) => `${page} ${link}`),
      ),
    ).toStrictEqual([]);
  });

  it("finds a page's link to a JSON file in each form Markdown & MDX write it, unless it is a typed anchor", () => {
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

    expect([sourceJsonLinkFaults(source), sourceDownloadFaults(source)]).toStrictEqual([[], []]);
  });

  it("finds a page's link to any file that asks to download it from another site, which browsers ignore", () => {
    expect.assertions(1);
    const faults = [
      `${SOURCE_LINK.replace(">", " download>")}JSON file</a>`,
      `<a href="${YAML_SPEC}" download>OpenAPI file</a>`,
      `<a href='${YAML_SPEC}' download="openapi.yaml">OpenAPI file</a>`,
      `<a href={"${YAML_SPEC}"} download>OpenAPI file</a>`,
      '<a href="//files.example.com/guide.pdf" download>Guide</a>',
    ];
    const source = [
      ...faults,
      '<a href="/files/openapi.yaml" download>OpenAPI file</a>',
      '<a href="https://docs.xquik.com/openapi.yaml" download>OpenAPI file</a>',
      `<a href="${YAML_SPEC}">OpenAPI file</a>`,
    ].join("\n\n");

    expect(sourceDownloadFaults(source)).toStrictEqual(
      faults.map((link) => link.slice(0, link.indexOf(">") + 1)),
    );
  });

  it("finds a built link to a JSON file that lacks its type, its link class, its new tab or its referrer rule", () => {
    expect.assertions(1);
    const bare = '<a href="https://xquik.com/trust.json" type="application/json">';
    const page = '<a href="https://xquik.com/en/benchmarks" class="link">';

    expect(
      jsonLinkFaults(
        new Map([
          ["/trust", `${BUILT_LINK}${page}`],
          ["/", `${bare}${page}`],
        ]),
      ),
    ).toStrictEqual([`/ ${bare}`]);
  });

  it("finds a built link to any file that asks to download it from another site", () => {
    expect.assertions(1);
    const json = BUILT_LINK.replace(">", ' download="">');
    const yaml = `<a href="${YAML_SPEC}" class="link" download="">`;
    const local = '<a href="/files/openapi.yaml" class="link" download="">';
    const plain = `<a href="${YAML_SPEC}" class="link">`;

    expect(
      downloadFaults(
        new Map([
          ["/trust", `${BUILT_LINK}${local}${plain}`],
          ["/", json],
          ["/api-reference/overview", `${plain}${yaml}`],
        ]),
      ),
    ).toStrictEqual([`/ ${json}`, `/api-reference/overview ${yaml}`]);
  });
});
