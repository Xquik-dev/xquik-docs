#!/usr/bin/env bun
/**
 * `bun run sync` copies the application's `openapi.yaml` here, byte for byte,
 * as its checkout's commit holds it. The application owns the spec, so this
 * repository never edits it: the parity test fails unless the file is an exact
 * copy of a version the application holds.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import { findProductRoot } from "./lib/product-root.ts";

const product = findProductRoot();
if (product === undefined) {
  process.stderr.write(
    "No application checkout. Set XQUIK_PRODUCT_ROOT or clone xquik beside this repository.\n",
  );
  process.exitCode = 1;
} else {
  writeFileSync(
    "openapi.yaml",
    execFileSync("git", ["show", "HEAD:openapi.yaml"], { cwd: product, maxBuffer: 2 ** 28 }),
  );
  process.stdout.write("Copied openapi.yaml from the application checkout.\n");
}
