import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { readPageFamily } from "./scripts/lib/page-family.ts";
const PROJECT_ROOT = process.cwd();
const DOC_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);
const EXCLUDED_DIRS = new Set([".git", "node_modules"]);
const EXCLUDED_FILES = new Set(["DOCS_QUALITY_POLL.md"]);
const EVENT_TYPE_TOKEN_PATTERN =
  /\b(?:follower\.(?:added|gained|lost|removed)|tweet\.(?:created|deleted|hashtag|link|longform|media|mention|new|poll|quote|reply|retweet)|(?:broadcast|space)\.started|following\.(?:added|removed)|profile\.(?:avatar|banner|bio|followers|following|location|name|pinned_tweet|protected|unavailable|url|username|verified)\.changed|post\.(?:(?:reply|quote)\.new|(?:likes|retweets|replies|quotes|bookmarks|views)\.changed|edited|deleted)|webhook\.test)\b/gu;
const EXPECTED_SUBSCRIBABLE_EVENT_TYPES = [
  "tweet.new",
  "tweet.quote",
  "tweet.reply",
  "tweet.retweet",
  "tweet.media",
  "tweet.link",
  "tweet.poll",
  "tweet.mention",
  "tweet.hashtag",
  "tweet.longform",
  "profile.avatar.changed",
  "profile.banner.changed",
  "profile.name.changed",
  "profile.username.changed",
  "profile.bio.changed",
  "profile.location.changed",
  "profile.url.changed",
  "profile.verified.changed",
  "profile.protected.changed",
  "profile.pinned_tweet.changed",
  "profile.unavailable.changed",
  "tweet.deleted",
  "broadcast.started",
  "space.started",
  "following.added",
  "following.removed",
  "follower.added",
  "follower.removed",
  "profile.followers.changed",
  "profile.following.changed",
] as const;
const EXPECTED_KEYWORD_EVENT_TYPES = [
  "tweet.new",
  "tweet.quote",
  "tweet.reply",
  "tweet.retweet",
  "tweet.media",
  "tweet.link",
  "tweet.poll",
  "tweet.mention",
  "tweet.hashtag",
  "tweet.longform",
] as const;
const EXPECTED_POST_EVENT_TYPES = [
  "post.reply.new",
  "post.quote.new",
  "post.likes.changed",
  "post.retweets.changed",
  "post.replies.changed",
  "post.quotes.changed",
  "post.bookmarks.changed",
  "post.views.changed",
  "post.edited",
  "post.deleted",
] as const;

const NON_SUBSCRIBABLE_EVENT_TYPES = new Set(["webhook.test"]);
const REQUIRED_SUBSCRIBABLE_EVENT_DOCS = [
  "api-reference/events/list.mdx",
  "api-reference/monitors/create.mdx",
  "api-reference/monitors/update.mdx",
  "guides/x-api-integration-checklist.mdx",
  "api-reference/webhooks/create.mdx",
  "api-reference/webhooks/update.mdx",
  "guides/x-api-typescript-types.mdx",
  "skill.md",
  "webhooks/overview.mdx",
] as const;
const REQUIRED_KEYWORD_EVENT_DOCS = [
  "api-reference/monitors/create-keyword.mdx",
  "api-reference/monitors/update-keyword.mdx",
] as const;
const REQUIRED_POST_EVENT_DOCS = [
  "api-reference/events/list.mdx",
  "api-reference/monitors/create-post.mdx",
  "api-reference/monitors/update-post.mdx",
  "api-reference/webhooks/create.mdx",
  "api-reference/webhooks/update.mdx",
  "guides/x-api-integration-checklist.mdx",
  "guides/x-api-typescript-types.mdx",
  "skill.md",
  "webhooks/overview.mdx",
] as const;

const REQUIRED_TEST_EVENT_DOCS = [
  "api-reference/webhooks/test.mdx",
  "webhooks/overview.mdx",
] as const;
const CODE_FENCE_PATTERN = /^```[\s\S]*?^```/gmu;
const PROSE_BLOCK_PATTERN = /\n\s*\n|\n(?=\s*\|)/u;
const SENTENCE_END_PATTERN = /(?<=[.!?])\s/u;
const NEGATION_PATTERN = /\b(?:not|never|no|without)\b/iu;
const FOLLOW_WORD_PATTERN = /\bfollow(?:er|ing)s?\b/iu;
const EVENT_WORD_PATTERN = /\bevents?\b/iu;
const OTHER_MONITOR_PATTERN = /\b(?:keyword|post) monitors?\b/iu;
const ACCOUNT_MONITOR_PATTERN = /\baccount monitors?\b/iu;
const EVENT_TYPES_PATTERN = /\bevent types\b/iu;
const isHistorical = (file: string): boolean =>
  file === "changelog.mdx" || file.startsWith("changelog/");

interface Finding {
  readonly eventType: string;
  readonly file: string;
  readonly issue: string;
  readonly line: number;
}

interface DocSentence {
  readonly file: string;
  readonly sentence: string;
}

function hasDocExtension(filePath: string): boolean {
  return [...DOC_EXTENSIONS].some((extension): boolean => filePath.endsWith(extension));
}

function listDocFiles(dir: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        files.push(...listDocFiles(fullPath));
      }
      continue;
    }

    const relativePath = relative(PROJECT_ROOT, fullPath);
    if (hasDocExtension(relativePath) && !EXCLUDED_FILES.has(relativePath)) {
      files.push(relativePath);
    }
  }
  return files.sort();
}

function lineNumberForIndex(source: string, index: number): number {
  return source.slice(0, index).split(/\r?\n/u).length;
}

function extractOpenApiEventTypes(source: string, schema = "EventType"): readonly string[] {
  const eventTypes: string[] = [];
  let inEventTypeSchema = false;
  let inEnum = false;

  for (const line of source.split(/\r?\n/u)) {
    if (line === `    ${schema}:`) {
      inEventTypeSchema = true;
      continue;
    }

    if (!inEventTypeSchema) {
      continue;
    }

    if (/^    [A-Za-z][A-Za-z0-9]+:/u.test(line)) {
      break;
    }

    if (line === "      enum:") {
      inEnum = true;
      continue;
    }

    if (!inEnum) {
      continue;
    }

    const eventTypeMatch = /^        - ([a-z][a-z0-9_.-]+)\s*$/u.exec(line);
    if (eventTypeMatch?.[1] !== undefined) {
      eventTypes.push(eventTypeMatch[1]);
      continue;
    }

    if (!line.startsWith("        - ")) {
      inEnum = false;
    }
  }

  return eventTypes;
}

function eventTypesInSource(source: string): readonly string[] {
  return [...new Set(source.match(EVENT_TYPE_TOKEN_PATTERN) ?? [])].sort();
}

function collectUnsupportedEventTypeFindings(
  allowedEventTypes: ReadonlySet<string>,
): readonly Finding[] {
  const findings: Finding[] = [];

  for (const file of listDocFiles(PROJECT_ROOT)) {
    if (isHistorical(file)) {
      continue;
    }

    const source = readPageFamily(file);
    for (const match of source.matchAll(EVENT_TYPE_TOKEN_PATTERN)) {
      const eventType = match[0];
      if (!allowedEventTypes.has(eventType)) {
        findings.push({
          eventType,
          file,
          issue: "Documented event type is not in the public event contract.",
          line: lineNumberForIndex(source, match.index ?? 0),
        });
      }
    }
  }

  return findings;
}

function proseSentences(source: string): readonly string[] {
  return source
    .replaceAll(CODE_FENCE_PATTERN, "")
    .split(PROSE_BLOCK_PATTERN)
    .flatMap((block): readonly string[] =>
      block.replaceAll(/\s+/gu, " ").trim().split(SENTENCE_END_PATTERN),
    );
}

function currentDocSentences(): readonly DocSentence[] {
  return listDocFiles(PROJECT_ROOT)
    .filter((file): boolean => !isHistorical(file))
    .flatMap((file): readonly DocSentence[] =>
      proseSentences(readFileSync(join(PROJECT_ROOT, file), "utf8")).map(
        (sentence): DocSentence => ({ file, sentence }),
      ),
    );
}

function countsIn(sentence: string): readonly number[] {
  return Array.from(sentence.matchAll(/\b\d+\b/gu), (match): number => Number(match[0]));
}

function missingEventTypeMentions(
  file: string,
  requiredEventTypes: readonly string[],
): readonly string[] {
  const source = readPageFamily(file);
  const documentedEventTypes = new Set(eventTypesInSource(source));
  return requiredEventTypes.filter((eventType): boolean => !documentedEventTypes.has(eventType));
}

describe("documented event types", (): void => {
  it("never denies follow events the public contract lists", (): void => {
    expect.assertions(1);

    const eventTypes = extractOpenApiEventTypes(
      readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8"),
    );
    const listsFollowEvents = eventTypes.some((eventType): boolean =>
      /^follow(?:er|ing)\./u.test(eventType),
    );
    const denials = currentDocSentences().filter(
      ({ sentence }): boolean =>
        NEGATION_PATTERN.test(sentence) &&
        FOLLOW_WORD_PATTERN.test(sentence) &&
        EVENT_WORD_PATTERN.test(sentence) &&
        !OTHER_MONITOR_PATTERN.test(sentence),
    );

    expect(listsFollowEvents ? denials : []).toStrictEqual([]);
  });

  it("counts account monitor event types as the public contract does", (): void => {
    expect.assertions(1);

    const eventTypeCount = extractOpenApiEventTypes(
      readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8"),
    ).length;
    const miscounts = currentDocSentences().filter(
      ({ sentence }): boolean =>
        ACCOUNT_MONITOR_PATTERN.test(sentence) &&
        EVENT_TYPES_PATTERN.test(sentence) &&
        countsIn(sentence).length > 0 &&
        countsIn(sentence).reduce((sum, count): number => sum + count, 0) !== eventTypeCount,
    );

    expect(miscounts).toStrictEqual([]);
  });

  it("keeps the OpenAPI subscribable event enum explicit", (): void => {
    expect.assertions(1);

    const eventTypes = extractOpenApiEventTypes(
      readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8"),
    );
    expect([...eventTypes].sort()).toStrictEqual([...EXPECTED_SUBSCRIBABLE_EVENT_TYPES].sort());
  });

  it("does not mention unsupported public event type tokens", (): void => {
    expect.assertions(1);

    const subscribableEventTypes = extractOpenApiEventTypes(
      readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8"),
    );
    const postEventTypes = extractOpenApiEventTypes(
      readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8"),
      "PostEventType",
    );
    const allowedEventTypes = new Set([
      ...subscribableEventTypes,
      ...postEventTypes,
      ...NON_SUBSCRIBABLE_EVENT_TYPES,
    ]);
    expect(collectUnsupportedEventTypeFindings(allowedEventTypes)).toStrictEqual([]);
  });

  it("lists every subscribable event type in core event docs", (): void => {
    expect.assertions(1);

    const missingByFile = REQUIRED_SUBSCRIBABLE_EVENT_DOCS.map((file) => ({
      file,
      missing: missingEventTypeMentions(file, EXPECTED_SUBSCRIBABLE_EVENT_TYPES),
    })).filter((entry): boolean => entry.missing.length > 0);

    expect(missingByFile).toStrictEqual([]);
  });

  it("lists every keyword-monitor event type in keyword monitor docs", (): void => {
    expect.assertions(1);

    const missingByFile = REQUIRED_KEYWORD_EVENT_DOCS.map((file) => ({
      file,
      missing: missingEventTypeMentions(file, EXPECTED_KEYWORD_EVENT_TYPES),
    })).filter((entry): boolean => entry.missing.length > 0);

    expect(missingByFile).toStrictEqual([]);
  });

  it("keeps the OpenAPI post event enum explicit", (): void => {
    expect.assertions(1);

    const eventTypes = extractOpenApiEventTypes(
      readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8"),
      "PostEventType",
    );

    expect([...eventTypes].sort()).toStrictEqual([...EXPECTED_POST_EVENT_TYPES].sort());
  });

  it("lists every post event type in post monitor and webhook docs", (): void => {
    expect.assertions(1);

    const missingByFile = REQUIRED_POST_EVENT_DOCS.map((file) => ({
      file,
      missing: missingEventTypeMentions(file, EXPECTED_POST_EVENT_TYPES),
    })).filter((entry): boolean => entry.missing.length > 0);

    expect(missingByFile).toStrictEqual([]);
  });

  it("documents the non-subscribable webhook test event only in test docs", (): void => {
    expect.assertions(1);

    const missingByFile = REQUIRED_TEST_EVENT_DOCS.map((file) => ({
      file,
      missing: missingEventTypeMentions(file, [...NON_SUBSCRIBABLE_EVENT_TYPES]),
    })).filter((entry): boolean => entry.missing.length > 0);

    expect(missingByFile).toStrictEqual([]);
  });
});
