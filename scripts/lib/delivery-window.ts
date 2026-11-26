const DAY_COUNT =
  /\b(\d+|one|two|three|four|five|six|seven|ten|fourteen|thirty)[ -](day|week)s?\b/giu;
const DELIVERY_WORD = /\bdeliver(?:y|ies)\b|\bretr(?:y|ies|ied)\b|\bexhausted\b/iu;
const ENDS_IN_OPENING_TAG = /(?:^|\n)\s*<[A-Z]\w*\b[^>]*>$/u;
const EVENT_LIFETIME =
  /\bevents?\b[^.]*\b(?:stays?|expires?|keeps?|last)\b|\b(?:keeps?|stores?)\b[^.]*\bevents?\b/iu;
const EXTENDED_RETENTION =
  /\bevents?\b[^.]*\b(?:stays?|remains?|keeps?|lasts?)\b[^.]*\bafter\b[^.]*\b(?:deliver(?:y|ies)|it\s+ends|exhausted)\b|\b(?:keeps?|holds?)\b[^.]*\bevents?\b[^.]*\buntil\b[^.]*\bdeliver(?:y|ies)\b/iu;
const SENTENCE_END = /(?<=[.!?])\s+/u;
const WORDS: Readonly<Record<string, number>> = {
  five: 5,
  four: 4,
  fourteen: 14,
  one: 1,
  seven: 7,
  six: 6,
  ten: 10,
  thirty: 30,
  three: 3,
  two: 2,
};
const UNIT_DAYS: Readonly<Record<string, number>> = { day: 1, week: 7 };

interface WindowClaim {
  readonly days: number;
  readonly sentence: string;
}

function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function textsOf(node: unknown): readonly string[] {
  if (typeof node === "string") return [node];
  if (isList(node)) return node.flatMap((item) => textsOf(item));
  if (node !== null && typeof node === "object") return Object.values(node).flatMap(textsOf);
  return [];
}

function blocksOf(source: string, format: "mdx" | "yaml"): readonly string[] {
  if (format === "yaml") return textsOf(Bun.YAML.parse(source));
  const blocks = source.split(/\n\s*\n/u).flatMap((block) => {
    const rows = block.split("\n");
    return rows.every((row) => row.trimStart().startsWith("|")) ? rows : [block];
  });
  return blocks.reduce<string[]>((joined, block, index) => {
    const previous = blocks[index - 1]?.trim() ?? "";
    if (ENDS_IN_OPENING_TAG.test(previous)) joined.push(`${joined.pop() ?? ""} ${block}`);
    else joined.push(block);
    return joined;
  }, []);
}

function countOf(amount: string, unit: string): number {
  const number = WORDS[amount.toLowerCase()] ?? Number(amount);
  return number * (UNIT_DAYS[unit.toLowerCase()] ?? Number.NaN);
}

function sentencesOf(source: string, format: "mdx" | "yaml"): readonly string[] {
  return blocksOf(source, format).flatMap((block) =>
    block.replaceAll(/\s+/gu, " ").trim().split(SENTENCE_END),
  );
}

function deliveryWindowClaims(source: string, format: "mdx" | "yaml"): readonly WindowClaim[] {
  return sentencesOf(source, format)
    .filter((sentence) => DELIVERY_WORD.test(sentence) || EVENT_LIFETIME.test(sentence))
    .flatMap((sentence) =>
      [...sentence.matchAll(DAY_COUNT)].map(([, amount = "", unit = ""]): WindowClaim => ({
        days: countOf(amount, unit),
        sentence,
      })),
    );
}

function extendedEventRetentionClaims(source: string, format: "mdx" | "yaml"): readonly string[] {
  return sentencesOf(source, format).filter((sentence) => EXTENDED_RETENTION.test(sentence));
}

export { deliveryWindowClaims, extendedEventRetentionClaims };
export type { WindowClaim };
