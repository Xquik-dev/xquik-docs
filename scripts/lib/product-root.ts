import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

function findProductRoot(): string | undefined {
  const configured = process.env["XQUIK_PRODUCT_ROOT"] ?? process.env["XQUIK_ROOT"] ?? "";
  if (configured !== "") return configured;
  const commonDir = execFileSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: import.meta.dirname, encoding: "utf8" },
  ).trim();
  const sibling = join(dirname(dirname(commonDir)), "xquik");
  return existsSync(join(sibling, "openapi.yaml")) ? sibling : undefined;
}

export { findProductRoot };
