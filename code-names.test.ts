import { readFileSync } from "node:fs";

import { Glob } from "bun";
import fc from "fast-check";
import { format } from "oxfmt";
import { describe, expect, it } from "vitest";

import { breakNames, LONGEST_PIECE, SHORT, unmark, wideNames } from "./scripts/lib/code-names.ts";
import { GENERATED_LIST, keepTerms } from "./scripts/lib/keep-terms.ts";

const CASES: readonly (readonly [string, string])[] = [
  ["Read `x-api-key` first.", "Read `x-api-key` first."],
  [
    "Use `GET /x/users/{id}/verified-followers` for them.",
    'Use `GET /x/users/`<span className="cn"><wbr />`{id}/`<wbr /><span className="nw">`verified-followers`</span></span> for them.',
  ],
  [
    "- Use `community_moderator_explorer` for a job.",
    '- Use `community_`<span className="cn"><wbr />`moderator_`<wbr />`explorer`</span> for a job.',
  ],
  [
    '- **424** `{ "error": "x_api_unavailable", "message": "Try again later." }`',
    '- **424** `{ `<span className="cn"><wbr />`"error": "x_api_unavailable", "message": "Try again later." }`</span>',
  ],
  [
    "[`GET /api/v1/x/users/{id}/following`](/api-reference/x/following)",
    '[`GET /api/v1/x/`<span className="cn"><wbr />`users/`<wbr />`{id}/`<wbr />`following`</span>](/api-reference/x/following)',
  ],
  ["| `GET /x/users/{id}/verified-followers` |", "| `GET /x/users/{id}/verified-followers` |"],
  [
    "```bash\nUse `GET /x/users/{id}/verified-followers`\n```",
    "```bash\nUse `GET /x/users/{id}/verified-followers`\n```",
  ],
  [
    '<Card title="`GET /x/users/{id}/verified-followers`">',
    '<Card title="`GET /x/users/{id}/verified-followers`">',
  ],
  [
    'Live output of <code>{"GET /x/users/{id}/verified-followers"}</code>, read on 11',
    'Live output of <code>{"GET /x/users/\u200b{id}/\u200bverified-\u2060followers"}</code>, read on 11',
  ],
  [
    'Live output of <code>{"GET /x/tweets"}</code>',
    'Live output of <code>{"GET /x/tweets"}</code>',
  ],
];

const NAME = fc.stringMatching(/^[A-Za-z0-9/._&=?{}"-]{1,60}$/u);
const PROSE = fc
  .array(
    fc.oneof(
      fc.stringMatching(/^[A-Za-z ,.]{0,12}$/u),
      NAME.map((name) => `\`${name}\``),
    ),
    { maxLength: 6 },
  )
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
          if (
            marked.includes('<span className="cn">') &&
            kept === undefined &&
            !marked.startsWith(`\`${text}\``)
          )
            expect(text).not.toContain("-");
        }
        const wide = wideNames(marked).length > 0;
        const pieces = [...marked.matchAll(/`([^`]+)`/gu)].map((part) => part[1] ?? "");
        expect(wide).toBe(
          name.length > SHORT && pieces.some((piece) => piece.length > LONGEST_PIECE),
        );
      }),
    );
  });

  it("marks every long inline code name on every page, and leaves none wider than the narrowest column", async () => {
    const loose: string[] = [];
    for (const file of pages()) {
      const source = readFileSync(`${import.meta.dirname}/${file}`, "utf8");
      const marked = await format(file, breakNames(keepTerms(unmark(source))));
      if (marked.code !== source) loose.push(file);
    }
    const wide = pages().flatMap((file) =>
      wideNames(readFileSync(`${import.meta.dirname}/${file}`, "utf8")).map(
        (name) => `${file}: ${name}`,
      ),
    );
    const blocks = pages().filter((file) =>
      /^\s*<span className="cn">|<\/code>\n\s*[,.;:)]/mu.test(readFileSync(`${import.meta.dirname}/${file}`, "utf8")),
    );
    expect({ blocks, loose, wide }).toEqual({ blocks: [], loose: [], wide: [] });
  });
});
