import { z } from "zod";

const FEATURES_PAGE = "api-reference/features.mdx";
const FEATURES_CATALOG = "lib/seo/output-features.ts";
const NEXT_STEPS = "\n## Next steps\n";

const catalogSchema = z.object({
  OUTPUT_FEATURE_THEMES: z.array(
    z.object({
      features: z.array(z.object({ id: z.string(), line: z.string() })),
      heading: z.string(),
    }),
  ),
});

type Themes = z.infer<typeof catalogSchema>["OUTPUT_FEATURE_THEMES"];

function withThemes(page: string, themes: Themes): string {
  const start = page.indexOf("\n## ");
  const end = page.indexOf(NEXT_STEPS);
  if (start === -1 || end < start)
    throw new Error(`${FEATURES_PAGE} needs its theme sections before "## Next steps".`);
  const sections = themes.map(
    ({ features, heading }) =>
      `## ${heading}\n\n${features.map(({ line }) => `- ${line}`).join("\n")}\n`,
  );
  return `${page.slice(0, start + 1)}${sections.join("\n")}${page.slice(end)}`;
}

export { catalogSchema, FEATURES_CATALOG, FEATURES_PAGE, withThemes };
export type { Themes };
