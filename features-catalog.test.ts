import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { productRootTest } from "./product-contract.test.helpers.ts";
import type { Themes } from "./scripts/lib/features-page.ts";
import { catalogSchema, withThemes } from "./scripts/lib/features-page.ts";

const CATALOG = "lib/seo/output-features.ts";
const BULLET = /^\s*[*+-] /u;

interface Drift {
  readonly extraLines: readonly string[];
  readonly headings: readonly string[];
  readonly missingIds: readonly string[];
}

function drift(themes: Themes, page: string): Drift {
  const sections = `\n${page}`
    .split(/\n## /u)
    .map((section): [string, string[]] => {
      const [heading = "", ...body] = section.split("\n");
      const bullets = body.filter((row) => BULLET.test(row)).map((row) => row.replace(BULLET, ""));
      return [heading, bullets];
    })
    .filter(([, bullets]) => bullets.length > 0);
  const catalog = new Map(
    themes.map((theme) => [theme.heading, theme.features.map((feature) => feature.line)]),
  );
  return {
    extraLines: sections.flatMap(([heading, bullets]) =>
      bullets.filter(
        (bullet, index) =>
          !(catalog.get(heading) ?? []).includes(bullet) || bullets.indexOf(bullet) !== index,
      ),
    ),
    headings: sections.map(([heading]) => heading),
    missingIds: themes.flatMap((theme) =>
      theme.features
        .filter(
          (feature) =>
            !sections.some(
              ([heading, bullets]) => heading === theme.heading && bullets.includes(feature.line),
            ),
        )
        .map((feature) => feature.id),
    ),
  };
}

const FIXTURE: Themes = [
  { features: [{ id: "fast", line: "Reads are fast." }], heading: "Speed" },
  { features: [{ id: "fair", line: "Billing is fair." }], heading: "Billing" },
];
const BILLING = "## Billing\n\n- Billing is fair.\n";

describe("Features page", (): void => {
  productRootTest(
    "lists every catalog line under its theme heading and nothing else",
    CATALOG,
    async (root): Promise<void> => {
      expect.assertions(1);

      const module: unknown = await import(join(root, CATALOG));
      const themes = catalogSchema.parse(module).OUTPUT_FEATURE_THEMES;
      const page = readFileSync(join(import.meta.dirname, "api-reference/features.mdx"), "utf8");

      expect(drift(themes, page)).toStrictEqual({
        extraLines: [],
        headings: themes.map((theme) => theme.heading),
        missingIds: [],
      });
    },
  );

  it.each([
    {
      case: "a missing line",
      page: `## Speed\n\n${BILLING}`,
      want: { extraLines: [], headings: ["Billing"], missingIds: ["fast"] },
    },
    {
      case: "a line the catalog lacks",
      page: `## Speed\n\n- Reads are fast.\n- Stray line.\n\n${BILLING}`,
      want: { extraLines: ["Stray line."], headings: ["Speed", "Billing"], missingIds: [] },
    },
    {
      case: "a repeated line",
      page: `## Speed\n\n- Reads are fast.\n- Reads are fast.\n\n${BILLING}`,
      want: { extraLines: ["Reads are fast."], headings: ["Speed", "Billing"], missingIds: [] },
    },
    {
      case: "a line above the first heading",
      page: `- Stray line.\n\n## Speed\n\n- Reads are fast.\n\n${BILLING}`,
      want: { extraLines: ["Stray line."], headings: ["", "Speed", "Billing"], missingIds: [] },
    },
    {
      case: "a repeated heading",
      page: `## Speed\n\n- Stray line.\n\n## Speed\n\n- Reads are fast.\n\n${BILLING}`,
      want: {
        extraLines: ["Stray line."],
        headings: ["Speed", "Speed", "Billing"],
        missingIds: [],
      },
    },
    {
      case: "a repeated heading after its lines",
      page: `## Speed\n\n- Reads are fast.\n\n## Speed\n\n- Stray line.\n\n${BILLING}`,
      want: {
        extraLines: ["Stray line."],
        headings: ["Speed", "Speed", "Billing"],
        missingIds: [],
      },
    },
    {
      case: "a nested line",
      page: `## Speed\n\n- Reads are fast.\n  - Stray line.\n\n${BILLING}`,
      want: { extraLines: ["Stray line."], headings: ["Speed", "Billing"], missingIds: [] },
    },
    {
      case: "a line in a star list",
      page: `## Speed\n\n- Reads are fast.\n\n* Stray line.\n\n${BILLING}`,
      want: { extraLines: ["Stray line."], headings: ["Speed", "Billing"], missingIds: [] },
    },
  ])("reports $case", ({ page, want }): void => {
    expect.assertions(1);
    expect(drift(FIXTURE, page)).toStrictEqual(want);
  });

  it("renders each catalog theme between the intro & Next steps", (): void => {
    expect.assertions(1);
    const page = "---\ntitle: x\n---\n\nIntro.\n\n## Old\n\n- Gone.\n\n## Next steps\n\nCards.\n";

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
