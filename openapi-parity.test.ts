import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect } from "vitest";

import { PRODUCT_ROOT, productCheck } from "./product-contract.test.helpers.ts";

const DOCS_OPENAPI = join(import.meta.dirname, "openapi.yaml");

describe("OpenAPI parity", (): void => {
  productCheck("keeps docs OpenAPI aligned with product OpenAPI", (): void => {
    expect.assertions(1);

    const docsOpenapi = Bun.YAML.parse(readFileSync(DOCS_OPENAPI, "utf8"));
    const productOpenapi = Bun.YAML.parse(
      readFileSync(join(PRODUCT_ROOT ?? "", "openapi.yaml"), "utf8"),
    );

    expect(docsOpenapi).toStrictEqual(productOpenapi);
  });
});
