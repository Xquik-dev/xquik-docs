import { readFileSync } from "node:fs";

import { Glob } from "bun";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { GENERATED_LIST, keepTerms } from "./scripts/lib/keep-terms.ts";

const SPAN = /<span className="nw">([^<]*)<\/span>/gu;
const unwrap = (text: string): string => text.replaceAll(SPAN, "$1");

const CASES: readonly (readonly [string, string])[] = [
  [
    "| Pay-as-you-go | 10 credits/call |",
    '| <span className="nw">Pay-as-you-go</span> | <span className="nw">10 credits/call</span> |',
  ],
  ["- Send up to 4 images.", '- Send up to <span className="nw">4 images</span>.'],
  ["## Third-party apps", '## <span className="nw">Third-party</span> apps'],
  ["### 429 Rate limit exceeded", "### 429 Rate limit exceeded"],
  ["1. Ran on 2026-10-15.", '1. Ran on <span className="nw">2026-10-15</span>.'],
  [
    "| `x-api-key` | [pay-as-you-go](/pricing) |",
    '| `x-api-key` | [<span className="nw">pay-as-you-go</span>](/pricing) |',
  ],
  ["- Step 1. Read the post.", "- Step 1. Read the post."],
  ["Prose keeps pay-as-you-go and 10 posts.", "Prose keeps pay-as-you-go and 10 posts."],
  ["```bash\n- 10 posts\n```", "```bash\n- 10 posts\n```"],
  [
    "---\ntitle: X-Api-Key\n---\n- 3 keys",
    '---\ntitle: X-Api-Key\n---\n- <span className="nw">3 keys</span>',
  ],
  ["| https://x.com/a-b | {/* a-b */} |", "| https://x.com/a-b | {/* a-b */} |"],
  [
    "| It answers 424 `search_unavailable`. |",
    '| It answers <span className="nw">424 `search_unavailable`</span>. |',
  ],
  [
    "| Pages accept `20` through `200`. |",
    '| Pages accept <span className="nw">`20` through</span> `200`. |',
  ],
  [
    "| Ranks 0-10,000 relevance at 02:20 UTC |",
    '| Ranks <span className="nw">0-10,000 relevance</span> at <span className="nw">02:20 UTC</span> |',
  ],
];

const PLAIN = fc.stringMatching(/^[A-Za-z0-9 ,.|#*`\-[\]()\n]{0,80}$/u);

describe("keepTerms", () => {
  it.each(CASES)("keeps the terms of %j whole", (source, kept) => {
    expect(keepTerms(source)).toBe(kept);
  });

  it("changes only markup, never the text a reader or agent reads", () => {
    fc.assert(
      fc.property(PLAIN, (source) => {
        expect(unwrap(keepTerms(source))).toBe(source);
      }),
    );
  });

  it("leaves a kept page as it is", () => {
    fc.assert(
      fc.property(PLAIN, (source) => {
        const kept = keepTerms(source);
        expect(keepTerms(kept)).toBe(kept);
      }),
    );
  });

  it("finds every compound and number in tables, lists and headings already kept on every page", () => {
    const loose = [...new Glob("**/*.mdx").scanSync({ cwd: import.meta.dirname, onlyFiles: true })]
      .filter((file) => !file.startsWith("node_modules/") && file !== GENERATED_LIST)
      .filter((file) => {
        const source = readFileSync(`${import.meta.dirname}/${file}`, "utf8");
        return keepTerms(source) !== source;
      });
    expect(loose).toEqual([]);
  });
});
