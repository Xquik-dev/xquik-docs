import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("api-reference/styles/save.mdx", import.meta.url), "utf8");

describe("save custom tweet style documentation", (): void => {
  it("matches every canonical status and authentication method", (): void => {
    expect.assertions(1);

    expect({
      apiKeyDocumented: source.includes("Send `x-api-key`"),
      bearerDocumented: source.includes("OAuth clients can send a bearer token"),
      responseTabs: [...source.matchAll(/<Tab title="(\d{3})"/gu)].map(([, status]) => status),
    }).toStrictEqual({
      apiKeyDocumented: true,
      bearerDocumented: true,
      responseTabs: ["200", "400", "401", "429"],
    });
  });

  it("documents the exact saved custom profile response", (): void => {
    expect.assertions(1);

    expect({
      customExampleCorrect:
        source.includes('"xUsername": "professional voice"') &&
        source.includes('"isOwnAccount": false') &&
        source.includes('"authorUsername": "professional voice"'),
      nestedFields: ["id", "text", "authorUsername", "createdAt"].every((field) =>
        source.includes(`<ResponseField name="${field}"`),
      ),
      topLevelFields: ["xUsername", "tweetCount", "isOwnAccount", "fetchedAt", "tweets"].every(
        (field) => source.includes(`<ResponseField name="${field}"`),
      ),
      xTweetIdDenied: source.includes("This is not an X Tweet ID."),
    }).toStrictEqual({
      customExampleCorrect: true,
      nestedFields: true,
      topLevelFields: true,
      xTweetIdDenied: true,
    });
  });

  it("explains body-label storage and full-array replacement", (): void => {
    expect.assertions(1);

    expect({
      pathNamesKey: source.includes("The path `{id}` names the stored profile."),
      labelOptional: source.includes("The body `label` is optional."),
      replacementIsComplete: source.includes(
        "Sending the same label replaces the entire saved Tweet array.",
      ),
      newPathNewKey: source.includes(
        "A different path `{id}` creates or replaces another normalized key.",
      ),
    }).toStrictEqual({
      pathNamesKey: true,
      labelOptional: true,
      replacementIsComplete: true,
      newPathNewKey: true,
    });
  });

  it("documents input limits and every validation branch", (): void => {
    expect.assertions(1);
    const normalizedSource = source.replace(/\s+/gu, " ");

    expect({
      blankTweetRejected: normalizedSource.includes(
        "| Missing, non-string, or blank `text` | Send non-empty text for every object. |",
      ),
      labelLimit: source.includes("It contains 1-50 characters"),
      sampleLimit: source.includes("Complete array of 1-100 approved Tweet examples."),
      underscoreBehavior: source.includes("The validator also accepts underscores."),
    }).toStrictEqual({
      blankTweetRejected: true,
      labelLimit: true,
      sampleLimit: true,
      underscoreBehavior: true,
    });
  });

  it("uses focused tweet-writing language without invented analysis", (): void => {
    expect.assertions(1);

    const frontmatter = source.slice(0, source.indexOf("---", 4) + 3);

    expect({
      focusedTitle: frontmatter.includes("Save tweet writing samples for a reusable X style"),
      keywordsPresent: [
        "tweet writing",
        "save tweet style",
        "Twitter writing style",
        "X brand voice",
        "tweet writing samples",
      ].every((keyword) => frontmatter.includes(keyword)),
      unsupportedDescriptionSignals: /tone|vocabulary|sentiment|engagement/iu.test(frontmatter),
    }).toStrictEqual({
      focusedTitle: true,
      keywordsPresent: true,
      unsupportedDescriptionSignals: false,
    });
  });
});
