import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect } from "vitest";
import { z } from "zod";

import { productRootTest } from "./product-contract.test.helpers.ts";

const CATALOG = "lib/seo/output-features.ts";

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
      .map((section): [string, string[]] => {
        const [heading = "", ...body] = section.split("\n");
        const bullets = body.filter((row) => row.startsWith("- ")).map((row) => row.slice(2));
        return [heading, bullets];
      })
      .filter(([, bullets]) => bullets.length > 0),
  );
}

describe("Features page", (): void => {
  productRootTest(
    "lists every catalog line under its theme heading and nothing else",
    CATALOG,
    async (root): Promise<void> => {
      expect.assertions(1);

      const module: unknown = await import(join(root, CATALOG));
      const themes = catalogSchema.parse(module).OUTPUT_FEATURE_THEMES;
      const catalog = new Map(
        themes.map((theme) => [theme.heading, theme.features.map((feature) => feature.line)]),
      );
      const sections = pageSections();

      expect({
        extraLines: [...sections].flatMap(([heading, bullets]) =>
          bullets.filter(
            (bullet, index) =>
              !(catalog.get(heading) ?? []).includes(bullet) || bullets.indexOf(bullet) !== index,
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
