import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { PRODUCT_ROOT } from "./product-contract.test.helpers.ts";

const NAME = "holds an exact copy of a spec version the product holds";
const HINT =
  "needs the product checkout: set XQUIK_PRODUCT_ROOT or clone xquik beside this repository";

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
  it.skipIf(PRODUCT_ROOT === undefined)(
    PRODUCT_ROOT === undefined ? `${NAME} (${HINT})` : NAME,
    (): void => {
      expect.assertions(1);

      const copy = execFileSync("git", ["hash-object", "openapi.yaml"], {
        cwd: import.meta.dirname,
        encoding: "utf8",
      }).trim();

      expect(objectType(PRODUCT_ROOT ?? "", copy)).toBe("blob");
    },
  );
});
