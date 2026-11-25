import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

const pages = execFileSync("git", ["ls-files", "*.mdx"], { encoding: "utf8" })
  .split("\n")
  .filter((file) => file !== "");

it.each(["https://xquik.com/.well-known/api-catalog", "https://xquik.com/deprecation-policy.md"])(
  "links %s from at least 2 pages",
  (target) => {
    const linking = pages.filter((page) => readFileSync(page, "utf8").includes(`](${target})`));

    expect(linking.length).toBeGreaterThanOrEqual(2);
  },
);
