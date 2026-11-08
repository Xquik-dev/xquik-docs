import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { productRootTest } from "./product-contract.test.helpers.ts";
import type { Themes } from "./scripts/lib/features-page.ts";
import {
  catalogSchema,
  FEATURES_CATALOG,
  FEATURES_PAGE,
  withThemes,
} from "./scripts/lib/features-page.ts";

const BULLET = /^\s*[*+-] /u;
const FIXTURE: Themes = [
  { features: [{ id: "fast", line: "Reads are fast." }], heading: "Speed" },
  { features: [{ id: "fair", line: "Billing is fair." }], heading: "Billing" },
];

describe("Features page", (): void => {
  productRootTest(
    "lists exactly the catalog's themes & lines, as the spec sync renders them",
    FEATURES_CATALOG,
    async (root): Promise<void> => {
      expect.assertions(1);

      const module: unknown = await import(join(root, FEATURES_CATALOG));
      const themes = catalogSchema.parse(module).OUTPUT_FEATURE_THEMES;
      const page = readFileSync(join(import.meta.dirname, FEATURES_PAGE), "utf8");

      expect(withThemes(page, themes)).toBe(page);
    },
  );

  it("keeps the intro free of feature bullets", (): void => {
    expect.assertions(1);
    const page = readFileSync(join(import.meta.dirname, FEATURES_PAGE), "utf8");
    const intro = page.slice(0, page.indexOf("\n## ")).split("\n");

    expect(intro.filter((row) => BULLET.test(row))).toStrictEqual([]);
  });

  it("renders each catalog theme between the intro & Next steps", (): void => {
    expect.assertions(1);
    const page =
      "---\ntitle: x\n---\n\nIntro.\n\n## Old\n\n- Gone.\n\nA stray paragraph.\n\n## Next steps\n\nCards.\n";

    expect(withThemes(page, FIXTURE)).toBe(
      "---\ntitle: x\n---\n\nIntro.\n\n## Speed\n\n- Reads are fast.\n\n## Billing\n\n- Billing is fair.\n\n## Next steps\n\nCards.\n",
    );
  });

  it("refuses a page without Next steps", (): void => {
    expect.assertions(1);
    expect(() => withThemes("Intro.\n\n## Speed\n\n- Reads are fast.\n", FIXTURE)).toThrow(
      "Next steps",
    );
  });
});
