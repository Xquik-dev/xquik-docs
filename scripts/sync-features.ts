#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { catalogSchema, FEATURES_CATALOG, FEATURES_PAGE, withThemes } from "./lib/features-page.ts";
import { findProductRoot } from "./lib/product-root.ts";

const product = findProductRoot();
if (product === undefined) {
  process.stderr.write(
    "No application checkout. Set XQUIK_PRODUCT_ROOT or clone xquik beside this repository.\n",
  );
  process.exitCode = 1;
} else {
  const module: unknown = await import(join(product, FEATURES_CATALOG));
  const themes = catalogSchema.parse(module).OUTPUT_FEATURE_THEMES;
  writeFileSync(FEATURES_PAGE, withThemes(readFileSync(FEATURES_PAGE, "utf8"), themes));
  process.stdout.write(
    `Rendered ${String(themes.flatMap(({ features }) => features).length)} catalog lines into ${FEATURES_PAGE}.\n`,
  );
}
