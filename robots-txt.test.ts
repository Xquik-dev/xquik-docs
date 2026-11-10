import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

const AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "CCBot",
  "Applebot-Extended",
  "Google-Extended",
] as const;
const GROUP_RULES = [
  "Content-Signal: ai-train=yes, search=yes, ai-input=yes",
  "Allow: /",
  "Disallow: /cdn-cgi/",
];

const groups = new Map(
  readFileSync("robots.txt", "utf8")
    .split("\n\n")
    .map((group) => group.trim().split("\n"))
    .filter(([first]) => first?.startsWith("User-agent: "))
    .map(([agent = "", ...rules]) => [agent.slice("User-agent: ".length), rules]),
);

it("names each AI crawler with the same Content-Signal as xquik.com", () => {
  expect.assertions(2);
  expect(AI_CRAWLERS.filter((crawler) => !groups.has(crawler))).toStrictEqual([]);
  expect(
    [...groups].filter(([, rules]) => JSON.stringify(rules) !== JSON.stringify(GROUP_RULES)),
  ).toStrictEqual([]);
});

it("keeps the sitemap line", () => {
  expect.assertions(1);
  expect(readFileSync("robots.txt", "utf8")).toContain(
    "Sitemap: https://docs.xquik.com/sitemap.xml\n",
  );
});
