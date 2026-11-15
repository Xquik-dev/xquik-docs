import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MAVEN_FOLDER = "https://repo1.maven.org/maven2/com/xquik/api/";
const PAGES = execFileSync("git", ["ls-files", "--", "*.mdx"], { encoding: "utf8" }).split("\n");

function linksSonatype(page: string): boolean {
  return page !== "" && readFileSync(page, "utf8").includes("central.sonatype.com");
}

describe("SDK registry links", (): void => {
  it("links no central.sonatype.com page, which answers site crawlers with 429", (): void => {
    expect.assertions(1);
    expect(PAGES.filter(linksSonatype)).toStrictEqual([]);
  });

  it.each(["java", "kotlin"])("links the %s install to its Maven Central folder", (sdk): void => {
    expect.assertions(1);
    const link = `[Maven Central](${MAVEN_FOLDER}x-twitter-scraper-${sdk}/)`;
    expect(readFileSync(`sdks/${sdk}.mdx`, "utf8")).toContain(link);
  });
});
