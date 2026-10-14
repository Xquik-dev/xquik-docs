import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CODE_MASK, headingText, pageProse, trackedPages } from "./prose.test.helpers.ts";

interface PatternRule {
  readonly ignoreCase: boolean;
  readonly words: boolean;
  readonly tokens: readonly string[];
}

const PATTERN_RULES = {
  Chatbot: {
    ignoreCase: true,
    words: true,
    tokens: [
      "absolutely(?=!)",
      "certainly(?=!)",
      "don't hesitate to",
      "feel free to",
      "great question",
      "(?:happy|glad) to help",
      "(?:I|we)(?:'d| would) be (?:happy|glad) to",
      "(?:I |we )?hope (?:this|that|it) helps",
      "let's dive",
      "let (?:me|us) know if",
      "of course",
      "rest assured",
      "without further ado",
      "you're absolutely right",
    ],
  },
  Filler: {
    ignoreCase: true,
    words: true,
    tokens: [
      "as a matter of fact",
      "at the end of the day",
      "at this point in time",
      "due to the fact",
      "each and every",
      "first and foremost",
      "for (?:all )?intents and purposes",
      "for the purposes? of",
      "(?:has|have|had) the (?:ability|capability) to",
      "in a nutshell",
      "in order (?:to|for)",
      "(?:it is|it's) (?:important|crucial|essential) to (?:note|mention)",
      "it goes without saying",
      "needless to say",
      "simply put",
      "the fact of the matter",
      "when it comes to",
      "worth (?:noting|mentioning)",
    ],
  },
  Is: {
    ignoreCase: true,
    words: true,
    tokens: ["boast(?:s|ed|ing)?", "serv(?:e|es|ed|ing) as", "st(?:and|ands|ood|anding) as"],
  },
  Metaphors: {
    ignoreCase: true,
    words: true,
    tokens: [
      "(?:affected|attack|install|public) surfaces?",
      "(?:API|app|feature|integration|MCP|platform|product|SDK|tool) surfaces?",
      "bedrock",
      "end[- ]?game",
      "evacuat(?:e|es|ed|ing)",
      "flywheels?",
      "gold[- ]plat(?:e|ed|ing)",
      "harness(?:es|ed|ing)? the (?:power|potential)",
      "loc(?:us|i)",
      "modalit(?:y|ies)",
      "nexus",
      "north[- ]stars?",
      "paradigms?",
      "ratchet(?:s|ed|ing)?",
      "scaffolding",
      "substrates?",
      "vantage",
      "wedg(?:e|es|ed|ing)",
    ],
  },
  NotJust: {
    ignoreCase: true,
    words: true,
    tokens: [
      "(?:is|are|was|were)n't (?:just|merely)",
      "more than (?:just|merely) (?:a|an|the)",
      "not (?:just|merely)",
      "not only [^.!?]*?\\bbut",
    ],
  },
  PlainWords: {
    ignoreCase: true,
    words: true,
    tokens: [
      "aforementioned",
      "ascertain(?:s|ed|ing)?",
      "commenc(?:e|es|ed|ing|ement)",
      "endeavou?r(?:s|ed|ing)?",
      "facilitat(?:e|es|ed|ing|ion)",
      "henceforth",
      "in excess of",
      "in lieu of",
      "in the event (?:that|of)",
      "leverag(?:e|es|ed|ing) (?:the|our|your|its|their|this|these|those)",
      "leverag(?:e|es|ed|ing) (?:a|an|existing|Xquik|AI|data)",
      "numerous",
      "prior to",
      "utili[sz](?:e|es|ed|ing|ation)",
      "whereby",
      "with the exception of",
    ],
  },
  Quotes: { ignoreCase: false, words: false, tokens: ["[“”‘’]"] },
  Vocabulary: {
    ignoreCase: true,
    words: true,
    tokens: [
      "additionally",
      "crucial(?:ly)?",
      "cutting[- ]edge",
      "delv(?:e|es|ed|ing)",
      "effortless(?:ly)?",
      "embark(?:s|ed|ing)?",
      "empower(?:s|ed|ing|ment)?",
      "enduring",
      "enhanc(?:e|es|ed|ing|ement|ements)",
      "ever[- ](?:evolving|changing)",
      "foster(?:s|ed|ing)?",
      "furthermore",
      "game[- ]chang(?:er|ers|ing)",
      "garner(?:s|ed|ing)?",
      "holistic(?:ally)?",
      "interplay",
      "intricat(?:e|ely|cy|cies)",
      "(?:competitive|digital|evolving|changing|current|market|tech) landscapes?",
      "(?:the|today's) landscapes?(?! (?:mode|orientation|videos?|images?|photos?))",
      "meticulous(?:ly)?",
      "moreover",
      "myriad",
      "pivotal",
      "plethora",
      "seamless(?:ly)?",
      "showcas(?:e|es|ed|ing)",
      "streamlin(?:e|es|ed|ing)",
      "supercharg(?:e|es|ed|ing)",
      "tapestr(?:y|ies)",
      "testament",
      "underscor(?:e|es|ed|ing) (?:the|that|how|why|its|our|their|this|a|an)",
      "unleash(?:es|ed|ing)?",
      "vibrant",
    ],
  },
} as const satisfies Record<string, PatternRule>;

const PATTERN_RULE_NAMES: readonly string[] = Object.keys(PATTERN_RULES);

const HEADING_NAMES: readonly string[] = [
  "Actors?",
  "Antwork",
  "Apify",
  "Articles?",
  "Audiense",
  "Black Magic",
  "Brandwatch",
  "Buffer",
  "Claude",
  "Claude Code",
  "Cline",
  "Cloud Run",
  "Codex",
  "Communities",
  "Community",
  "Community Notes",
  "Copilot",
  "curl",
  "Cursor",
  "Devin Desktop",
  "Discord",
  "Excel",
  "Gemini",
  "Goose",
  "Google",
  "Google Agent Development Kit",
  "Google Cloud",
  "Google Sheets",
  "Haystack",
  "Haystack Enterprise Platform",
  "Hermes",
  "Hermes Agent",
  "Hootsuite",
  "Hypefury",
  "I",
  "Idempotency-Key",
  "JSON Lines",
  "Kotlin",
  "Late",
  "Lists?",
  "Machine Payments Protocol",
  "Make",
  "Mastra",
  "Meltwater",
  "Microsoft Agent Framework",
  "n8n",
  "Node.js",
  "Outstand",
  "Pipedream",
  "Post Bridge",
  "Postman",
  "Postproxy",
  "Postwise",
  "Prefect",
  "Pydantic",
  "Python",
  "Qwen Code",
  "Radar",
  "Retry-After",
  "Roo Code",
  "Slack",
  "Spaces?",
  "Spanish",
  "Sprinklr",
  "Sprout Social",
  "Talkwalker",
  "Taplio",
  "Telegram",
  "Tempo",
  "Top posts",
  "Turkish",
  "TweetDeck/X Pro",
  "Tweet Hunter",
  "Twitter",
  "Twitter API Pro",
  "twscrape",
  String.raw`t\.co`,
  "Typefully",
  "Viral Score",
  "VS Code",
  "Windsurf",
  "With Replies",
  "X",
  "X Pro",
  "Xanguard",
  "Xquik",
  "Zapier",
  "Zernio",
  String.raw`X(?: \(Twitter\))?(?: [A-Z][a-z]+)+ (?:Downloader|Scraper)`,
  String.raw`X(?: \(Twitter\))?(?: [A-Z][a-z]+)+ (?:Analyzer|Classifier|Monitor|Tracker)`,
  String.raw`\d+\.\d+\.\d+,? [a-z]+`,
  "Media Downloader",
  "Search API",
  "Trends API",
];

const HEADING_NAME = new RegExp(
  String.raw`\b(?:${[...HEADING_NAMES].sort((a, b): number => b.length - a.length).join("|")})\b`,
  "u",
);

const NAME_SHAPE = /\b[A-Za-z0-9]+[A-Z][A-Za-z0-9]*\b/u;

const HEADING_WORD = new RegExp(
  String.raw`${HEADING_NAME.source}|[\p{N}\p{L}*${CODE_MASK}]+\S*`,
  "gu",
);

const SENTENCE_CASE_SHARE = 0.8;

const TOKEN_SPACE = String.raw`(?:[ \t]+\n?|\n)[ \t]*`;

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
  readonly text: string;
}

type PageFinding = Omit<Finding, "file">;

const CLASS_OR_SPACE = /\[(?:\\.|[^\]\\])*\]| /gu;

function patternRegExp(rule: PatternRule): RegExp {
  const alternatives = rule.tokens.map((token): string =>
    token.replace(CLASS_OR_SPACE, (part): string => (part === " " ? TOKEN_SPACE : part)),
  );
  const body = `(?:${alternatives.join("|")})`;
  return new RegExp(rule.words ? String.raw`\b${body}\b` : body, rule.ignoreCase ? "giu" : "gu");
}

const PATTERNS = Object.entries(PATTERN_RULES).map(
  ([name, rule]): { readonly name: string; readonly pattern: RegExp } => ({
    name,
    pattern: patternRegExp(rule),
  }),
);

function lineAt(text: string, offset: number): number {
  return text.slice(0, offset).split("\n").length;
}

function patternMatches(text: string, firstLine: number): readonly PageFinding[] {
  return PATTERNS.flatMap(({ name, pattern }): PageFinding[] =>
    [...text.matchAll(pattern)].map((match): PageFinding => ({
      line: firstLine + lineAt(text, match.index) - 1,
      rule: name,
      text: match[0].replace(/\s+/gu, " "),
    })),
  );
}

function capitalized(word: string): string {
  return word.toLowerCase().replace(/\p{L}/u, (letter): string => letter.toUpperCase());
}

function isName(word: string): boolean {
  return HEADING_NAME.test(word) || NAME_SHAPE.test(word);
}

function matchesSentenceCase(word: string, index: number, previous: string): boolean {
  const mayStartSentence = index === 0 || /^\d+\.?$|[.!?]$/u.test(previous);
  return (
    isName(word) ||
    word === (index === 0 ? capitalized(word) : word.toLowerCase()) ||
    (mayStartSentence && word === capitalized(word))
  );
}

function isSentenceCase(text: string): boolean {
  const words = text.match(HEADING_WORD) ?? [];
  const matches = words.map((word, index): boolean =>
    matchesSentenceCase(word, index, words[index - 1] ?? ""),
  );
  const share = matches.filter(Boolean).length / words.length;
  return words.length === 0 || (matches[0] === true && share >= SENTENCE_CASE_SHARE);
}

function pageFindings(source: string): readonly PageFinding[] {
  const { fields, rawLines, prose } = pageProse(source);
  const fieldFindings = fields.flatMap((field): PageFinding[] => [
    ...patternMatches(field.value, field.line),
    ...(field.key !== "description" && !isSentenceCase(field.value)
      ? [{ line: field.line, rule: "Headings", text: field.rawLine }]
      : []),
  ]);
  const headingFindings = prose.split("\n").flatMap((text, index): PageFinding[] => {
    const heading = headingText(text);
    return heading === undefined || isSentenceCase(heading)
      ? []
      : [{ line: index + 1, rule: "Headings", text: (rawLines[index] ?? "").trim() }];
  });
  return [...fieldFindings, ...patternMatches(prose, 1), ...headingFindings];
}

const FINDINGS: readonly Finding[] = trackedPages().flatMap((file): Finding[] =>
  pageFindings(readFileSync(file, "utf8")).map((finding): Finding => ({ ...finding, file })),
);

function report(rule: string): readonly string[] {
  return FINDINGS.filter((finding): boolean => finding.rule === rule).map(
    (finding): string => `${finding.file}:${finding.line} ${finding.text}`,
  );
}

function rulesIn(source: string): readonly string[] {
  return pageFindings(source).map((finding): string => finding.rule);
}

describe("Prose patterns", (): void => {
  it.each([
    { name: "an AI word", source: "It helps you delve into data.\n", rules: ["Vocabulary"] },
    { name: "a word in any case", source: "Additionally, it runs.\n", rules: ["Vocabulary"] },
    { name: "part of a longer word", source: "Read the Additionallyx field.\n", rules: [] },
    { name: "a fancy verb for is", source: "The key serves as a token.\n", rules: ["Is"] },
    { name: "a not just phrase", source: "It is not just fast.\n", rules: ["NotJust"] },
    { name: "a not only with but", source: "Not only fast but cheap.\n", rules: ["NotJust"] },
    { name: "a not only without but", source: "It reads tweets, not only users.\n", rules: [] },
    { name: "a filler phrase", source: "Use it in order to read.\n", rules: ["Filler"] },
    {
      name: "a phrase across a line break",
      source: "Use it in order\nto read.\n",
      rules: ["Filler"],
    },
    {
      name: "a phrase across a paragraph break",
      source: "It is in order\n\nto read.\n",
      rules: [],
    },
    { name: "a fancy plain word", source: "Utilize the cursor.\n", rules: ["PlainWords"] },
    { name: "leverage as a noun", source: "It has 10x leverage.\n", rules: [] },
    { name: "a metaphor noun", source: "It shrinks the API surface.\n", rules: ["Metaphors"] },
    { name: "a curly quote", source: "Click “Save” now.\n", rules: ["Quotes", "Quotes"] },
    { name: "a curly apostrophe", source: "It’s fast.\n", rules: ["Quotes"] },
    { name: "a chatbot phrase", source: "Feel free to ask.\n", rules: ["Chatbot"] },
    { name: "a pattern in inline code", source: "Send `in order to` as text.\n", rules: [] },
    { name: "a pattern around inline code", source: "It is not `x` just a key.\n", rules: [] },
    { name: "a pattern in fenced code", source: "Run it.\n\n```\nutilize\n```\n", rules: [] },
    { name: "a pattern in a link target", source: "Read [it](/utilize).\n", rules: [] },
    { name: "a pattern in a component prop", source: '<Card title="Seamless">\n', rules: [] },
    {
      name: "a pattern in a front matter description",
      source: "---\ndescription: A seamless API.\n---\n",
      rules: ["Vocabulary"],
    },
    { name: "a sentence case heading", source: "## Search tweets by date\n", rules: [] },
    { name: "a title case heading", source: "## Search Tweets By Date\n", rules: ["Headings"] },
    { name: "a lowercase first word", source: "## search tweets\n", rules: ["Headings"] },
    { name: "names in a heading", source: "## Connect Claude to the MCP server\n", rules: [] },
    { name: "a camel case field", source: "## Read nextCursor\n", rules: [] },
    { name: "4 of 5 words in sentence case", source: "## Read the Tweet field now\n", rules: [] },
    { name: "an acronym in a heading", source: "## Validate every HTTP request\n", rules: [] },
    { name: "a name of several words", source: "## Install Google Sheets\n", rules: [] },
    { name: "a status code heading", source: "### 404 Not found\n", rules: [] },
    { name: "a heading of 2 sentences", source: "## Step 1. Check credits\n", rules: [] },
    {
      name: "3 of 4 words in sentence case",
      source: "## Read the Tweet field\n",
      rules: ["Headings"],
    },
    { name: "a numbered heading", source: "## 1. Create a key\n", rules: [] },
    { name: "inline code in a heading", source: "## `GET /x` returns tweets\n", rules: [] },
    {
      name: "a title case page title",
      source: '---\ntitle: "Search Tweets"\n---\n',
      rules: ["Headings"],
    },
    { name: "a sentence case page title", source: '---\ntitle: "Search tweets"\n---\n', rules: [] },
    {
      name: "a title case sidebar title",
      source: "---\nsidebarTitle: Search Tweets\n---\n",
      rules: ["Headings"],
    },
  ])("classifies $name", ({ source, rules }): void => {
    expect.assertions(1);

    expect(rulesIn(source)).toStrictEqual(rules);
  });

  it.each(PATTERN_RULE_NAMES)("writes every page without %s patterns", (rule): void => {
    expect.assertions(1);

    expect(report(rule)).toStrictEqual([]);
  });

  it("writes titles and headings in sentence case", (): void => {
    expect.assertions(1);

    expect(report("Headings")).toStrictEqual([]);
  });
});
