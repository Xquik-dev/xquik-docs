import type { PathLike } from "node:fs";
import { readFileSync } from "node:fs";

import { unmark } from "./code-names.ts";

const NO_WRAP = /<span className="nw">([^<]*)<\/span>/gu;

function readPageFileSync(path: PathLike, encoding: "utf8"): string {
  const text = readFileSync(path, encoding);
  return String(path).endsWith(".mdx") ? unmark(text).replaceAll(NO_WRAP, "$1") : text;
}

export { readPageFileSync };
