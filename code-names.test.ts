import { readFileSync } from "node:fs";

import { Glob } from "bun";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { breakNames, LONGEST_PIECE, SHORT, unmark, wideNames } from "./scripts/lib/code-names.ts";
import { GENERATED_LIST, keepTerms } from "./scripts/lib/keep-terms.ts";

const CASES: readonly (readonly [string, string])[] = [
  ["Read `x-api-key` first.", "Read `x-api-key` first."],
  [
    "Use `GET /x/users/{id}/verified-followers` for them.",
    'Use <span className="cn">`GET /x/users/`<wbr />`{id}/`<wbr /><span className="nw">`verified-followers`</span></span> for them.',
  ],
  [
    "- Use `community_moderator_explorer` for a job.",
    '- Use <span className="cn">`community_`<wbr />`moderator_`<wbr />`explorer`</span> for a job.',
  ],
  [
    '- **424** `{ "error": "x_api_unavailable", "message": "Try again later." }`',
    '- **424** <span className="cn">`{ "error": "x_api_unavailable", "message": "Try again later." }`</span>',
  ],
  [
    "[`GET /api/v1/x/users/{id}/following`](/api-reference/x/following)",
    '[<span className="cn">`GET /api/`<wbr />`v1/x/`<wbr />`users/`<wbr />`{id}/`<wbr />`following`</span>](/api-reference/x/following)',
  ],
  ["| `GET /x/users/{id}/verified-followers` |", "| `GET /x/users/{id}/verified-followers` |"],
  ["```bash\nUse `GET /x/users/{id}/verified-followers`\n```", "```bash\nUse `GET /x/users/{id}/verified-followers`\n```"],
  ['<Card title="`GET /x/users/{id}/verified-followers`">', '<Card title="`GET /x/users/{id}/verified-followers`">'],
];

const NAME = fc.stringMatching(/^[A-Za-z0-9/._&=?{}"-]{1,60}$/u);
const PROSE = fc
  .array(fc.oneof(fc.stringMatching(/^[A-Za-z ,.]{0,12}$/u), NAME.map((name) => `\`${name}\``)), { maxLength: 6 })
  .map((parts) => parts.join(" "));

const pages = (): string[] =>
  [...new Glob("**/*.mdx").scanSync({ cwd: import.meta.dirname, onlyFiles: true })].filter(
    (file) => !file.startsWith("node_modules/") && file !== GENERATED_LIST,
  );

describe("breakNames", () => {
  it.each(CASES)("marks the break points of %j", (source, marked) => {
    expect(breakNames(source)).toBe(marked);
  });

  it("changes only markup, never the code a reader copies", () => {
    fc.assert(
      fc.property(PROSE, (source) => {
        expect(unmark(breakNames(source))).toBe(source);
      }),
    );
  });

  it("leaves a marked page as it is, before and after keepTerms", () => {
    fc.assert(
      fc.property(PROSE, (source) => {
        const marked = breakNames(keepTerms(source));
        expect(breakNames(marked)).toBe(marked);
        expect(keepTerms(marked)).toBe(marked);
      }),
    );
  });

  it("never leaves a hyphen or a piece wider than the narrowest column breakable", () => {
    fc.assert(
      fc.property(NAME, (name) => {
        const marked = breakNames(`\`${name}\``);
        for (const part of marked.matchAll(/(<span className="nw">)?`([^`]+)`/gu)) {
          const [, kept, text = ""] = part;
          if (name.length > SHORT && kept === undefined) expect(text).not.toContain("-");
        }
        const wide = wideNames(marked).length > 0;
        const pieces = [...marked.matchAll(/`([^`]+)`/gu)].map((part) => part[1] ?? "");
        expect(wide).toBe(name.length > SHORT && pieces.some((piece) => piece.length > LONGEST_PIECE));
      }),
    );
  });

  it("marks every long inline code name on every page, and leaves none wider than the narrowest column", () => {
    const loose = pages().filter((file) => {
      const source = readFileSync(`${import.meta.dirname}/${file}`, "utf8");
      return breakNames(keepTerms(source)) !== source;
    });
    const wide = pages().flatMap((file) =>
      wideNames(readFileSync(`${import.meta.dirname}/${file}`, "utf8")).map((name) => `${file}: ${name}`),
    );
    expect({ loose, wide }).toEqual({ loose: [], wide: [] });
  });
});
