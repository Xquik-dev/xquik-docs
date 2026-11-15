import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MAVEN_FOLDER = "https://repo1.maven.org/maven2/com/xquik/api/";

function pages(): string[] {
  return execFileSync("git", ["ls-files", "--", "*.mdx"], { encoding: "utf8" })
    .trim()
    .split("\n");
}

describe("SDK registry links", (): void => {
  it("links no central.sonatype.com page, which answers site crawlers with 429", (): void => {
    expect.assertions(1);
    expect(
      pages().filter((page): boolean => readFileSync(page, "utf8").includes("central.sonatype.com")),
    ).toStrictEqual([]);
  });

  it.each(["java", "kotlin"])(
    "links the %s SDK install step to its folder on the Maven Central repository",
    (language): void => {
      expect.assertions(1);
      expect(readFileSync(`sdks/${language}.mdx`, "utf8")).toContain(
        `[Maven Central](${MAVEN_FOLDER}x-twitter-scraper-${language}/)`,
      );
    },
  );
});
