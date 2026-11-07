import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

const LANGUAGES_DIRECTORY = "languages";
const REQUIRED_SCOPES = ["comment", "keyword", "string"] as const;

const docsStyling = z.looseObject({
  styling: z.looseObject({
    codeblocks: z.looseObject({
      languages: z.looseObject({ custom: z.array(z.string()) }),
    }),
  }),
});

const grammarPattern = z.looseObject({ name: z.string() });

// Mintlify renders plain text, with only a console error, when one of these keys is missing.
const grammar = z.looseObject({
  aliases: z.array(z.string()).nonempty(),
  name: z.string().startsWith("xquik-"),
  patterns: z.array(grammarPattern).nonempty(),
  repository: z.record(z.string(), z.unknown()),
  scopeName: z.string().startsWith("source.xquik."),
});

function grammarPaths(): readonly string[] {
  return readdirSync(LANGUAGES_DIRECTORY)
    .filter((file) => file.endsWith(".json"))
    .map((file) => join(LANGUAGES_DIRECTORY, file));
}

function readGrammar(path: string): z.infer<typeof grammar> {
  return grammar.parse(JSON.parse(readFileSync(path, "utf8")));
}

function configuredLanguages(): readonly string[] {
  const config = docsStyling.parse(JSON.parse(readFileSync("docs.json", "utf8")));

  return config.styling.codeblocks.languages.custom;
}

describe("code languages", () => {
  it("registers every grammar file in docs.json", () => {
    const expected = grammarPaths().map((path) => `/${path}`);

    expect([...configuredLanguages()].toSorted()).toStrictEqual(expected.toSorted());
  });

  it.each(grammarPaths())("keeps comments, strings and keywords colored in %s", (path) => {
    const scopes = new Set(readGrammar(path).patterns.map(({ name }) => name.split(".")[0]));

    expect(REQUIRED_SCOPES.filter((scope) => !scopes.has(scope))).toStrictEqual([]);
  });
});
