import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const KEY_FILE = "indexnow-key.yaml";

describe("IndexNow key", (): void => {
  it("holds 1 key in the format IndexNow verifies", (): void => {
    expect.assertions(1);
    expect(readFileSync(KEY_FILE, "utf8")).toMatch(/^[A-Za-z0-9-]{8,128}\n$/u);
  });

  it("publishes the key at the docs root, so it covers every docs URL", (): void => {
    expect.assertions(1);
    const ignored = execFileSync(
      "git",
      ["ls-files", "--cached", "--ignored", "--exclude-from=.mintignore", "--", KEY_FILE],
      { encoding: "utf8" },
    );
    expect(ignored).toBe("");
  });
});
