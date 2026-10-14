import type { RuleTester } from "oxlint/plugins-dev";

type Rule = Parameters<RuleTester["run"]>[1];

const PROOF = /https:\/\/|SPDX-|REUSE-Ignore/u;
const DIRECTIVE =
  /^\s*(?:oxlint|eslint)-(?:disable(?:-next-line|-line)?|enable)\b|^\*?\s*@ts-(?:check|nocheck|expect-error|ignore)\b|^\/\s*<reference\s|^\*\s*@type\s*\{|[#@]__(?:PURE|NO_SIDE_EFFECTS)__/u;
const MAX_LINE_BREAKS_IN_A_BLOCK = 1;

export const noCodeComments: Rule = {
  meta: {
    type: "problem",
    messages: {
      comment: "Code has no comments. Put the meaning in names, types and tests.",
    },
  },
  create(context) {
    return {
      Program(): void {
        const { text } = context.sourceCode;
        const comments = context.sourceCode
          .getAllComments()
          .filter(({ type }) => type !== "Shebang");
        let laterProven = false;
        let laterStart = -1;
        const proven = comments
          .toReversed()
          .map(({ value, start, end }): boolean => {
            const between = text.slice(end, laterStart);
            const sameBlock =
              laterStart >= end &&
              between.trim() === "" &&
              between.split("\n").length - 1 <= MAX_LINE_BREAKS_IN_A_BLOCK;
            laterProven = PROOF.test(value) || (laterProven && sameBlock);
            laterStart = start;
            return laterProven;
          })
          .toReversed();
        for (const [index, comment] of comments.entries()) {
          if (proven.at(index) !== true && !DIRECTIVE.test(comment.value)) {
            context.report({ node: comment, messageId: "comment" });
          }
        }
      },
    };
  },
};

export default { meta: { name: "xquik" }, rules: { "no-code-comments": noCodeComments } };
