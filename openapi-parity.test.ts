import { execFileSync } from "node:child_process";

import { describe, expect } from "vitest";

import { productRootTest } from "./product-contract.test.helpers.ts";

function objectType(cwd: string, id: string): string {
  try {
    return execFileSync("git", ["cat-file", "-t", id], {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
  } catch {
    return "missing";
  }
}

describe("OpenAPI parity", (): void => {
  productRootTest(
    "holds an exact copy of a spec version the product holds",
    "openapi.yaml",
    (root): void => {
      expect.assertions(1);

      const copy = execFileSync("git", ["hash-object", "openapi.yaml"], {
        cwd: import.meta.dirname,
        encoding: "utf8",
      }).trim();

      expect(objectType(root, copy)).toBe("blob");
    },
  );
});
