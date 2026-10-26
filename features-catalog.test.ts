import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { PRODUCT_ROOT } from "./product-contract.test.helpers.ts";

const NAME = "lists every catalog line under its theme heading and nothing else";
const HINT =
  "needs the product checkout: set XQUIK_PRODUCT_ROOT or clone xquik beside this repository";

const catalogSchema = z.object({
  OUTPUT_FEATURE_THEMES: z.array(
    z.object({
      features: z.array(z.object({ id: z.string(), line: z.string() })),
      heading: z.string(),
    }),
  ),
});

function pageSections(): Map<string, string[]> {
  const page = readFileSync(join(import.meta.dirname, "api-reference/features.mdx"), "utf8");
  return new Map(
    page
      .split(/^## /mu)
      .slice(1)
      .map((section): [string, string[]] => {
        const [heading = "", ...body] = section.split("\n");
        const bullets = body.filter((row) => row.startsWith("- ")).map((row) => row.slice(2));
        return [heading, bullets];
      })
      .filter(([, bullets]) => bullets.length > 0),
  );
}

describe("Features page", (): void => {
  it.skipIf(PRODUCT_ROOT === undefined)(
    PRODUCT_ROOT === undefined ? `${NAME} (${HINT})` : NAME,
    async (): Promise<void> => {
      expect.assertions(1);

      const module: unknown = await import(join(PRODUCT_ROOT ?? "", "lib/seo/output-features.ts"));
      const themes = catalogSchema.parse(module).OUTPUT_FEATURE_THEMES;
      const sections = pageSections();

      expect({
        extraLines: [...sections].flatMap(([heading, bullets]) =>
          bullets.filter(
            (bullet) =>
              !themes.some(
                (theme) =>
                  theme.heading === heading &&
                  theme.features.some((feature) => feature.line === bullet),
              ),
          ),
        ),
        headings: [...sections.keys()],
        missingIds: themes.flatMap((theme) =>
          theme.features
            .filter((feature) => !(sections.get(theme.heading) ?? []).includes(feature.line))
            .map((feature) => feature.id),
        ),
      }).toStrictEqual({
        extraLines: [],
        headings: themes.map((theme) => theme.heading),
        missingIds: [],
      });
    },
  );
});
