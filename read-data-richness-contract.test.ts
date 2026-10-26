import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface OpenApiSchema {
  readonly $ref?: string;
  readonly additionalProperties?: boolean | OpenApiSchema;
  readonly allOf?: readonly OpenApiSchema[];
  readonly maximum?: number;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly required?: readonly string[];
}

interface OpenApiParameter {
  readonly $ref?: string;
  readonly name?: string;
  readonly schema?: OpenApiSchema;
}

interface OpenApiDocument {
  readonly components?: Readonly<{
    readonly parameters?: Readonly<Record<string, OpenApiParameter>>;
    readonly schemas?: Readonly<Record<string, OpenApiSchema>>;
  }>;
  readonly paths?: Readonly<
    Record<
      string,
      Readonly<{
        readonly get?: Readonly<{
          readonly description?: string;
          readonly parameters?: readonly OpenApiParameter[];
        }>;
      }>
    >
  >;
}

const PROJECT_ROOT = process.cwd();
const GUIDE = readFileSync(join(PROJECT_ROOT, "guides/tweet-profile-api-fields.mdx"), "utf8");
const OPENAPI = readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8");
const MCP_TOOLS = readFileSync(join(PROJECT_ROOT, "mcp/tools.mdx"), "utf8");
const TWEET_REPLIES = readFileSync(join(PROJECT_ROOT, "api-reference/x/tweet-replies.mdx"), "utf8");
const DOCS_CONFIG = readFileSync(join(PROJECT_ROOT, "docs.json"), "utf8");
const LLMS_INDEX = readFileSync(join(PROJECT_ROOT, "llms.txt"), "utf8");

const TWEET_FIELDS = [
  "id",
  "text",
  "createdAt",
  "retweetedAt",
  "isNoteTweet",
  "isPinned",
  "isReply",
  "isRetweet",
  "isLimitedReply",
  "isQuoteStatus",
  "conversationId",
  "source",
  "type",
  "url",
  "lang",
  "inReplyToId",
  "inReplyToUserId",
  "inReplyToUsername",
  "parentTweet",
  "displayTextRange",
  "textHighlights",
  "contentDisclosure",
  "communityId",
  "communityName",
  "conversationControl",
  "coordinates",
  "geo",
  "grokShareAttachment",
  "jetfuelAttachment",
  "article",
  "authorUnavailable",
  "card",
  "cashtagAttachments",
  "communityNote",
  "edit",
  "exclusiveContent",
  "isTranslatable",
  "noteTweet",
  "place",
  "limitedActions",
  "postCta",
  "possiblySensitive",
  "previousCounts",
  "reactionContext",
  "softIntervention",
  "sportsContext",
  "subscriberBadge",
  "viewState",
  "scopes",
  "entities",
  "quoted_tweet",
  "quotedTweetId",
  "retweeted_tweet",
  "tombstone",
  "interstitial",
  "unmentionedUserIds",
  "author",
  "media",
  "retweetCount",
  "replyCount",
  "likeCount",
  "quoteCount",
  "viewCount",
  "bookmarkCount",
  "unknownCounts",
  "unknownFields",
  "grokTranslatedPost",
  "hasCommunityNotes",
  "quotedTweetPermalink",
  "quotedTweetUnavailable",
  "unavailableAuthorId",
] as const;

const PROFILE_FIELDS = [
  "accountBasedIn",
  "accountBasedInUnavailable",
  "id",
  "username",
  "name",
  "description",
  "followers",
  "following",
  "grokTranslatedBio",
  "verified",
  "isBlueVerified",
  "isVerified",
  "profilePicture",
  "profilePictureOriginal",
  "coverPicture",
  "profileBannerUrl",
  "location",
  "createdAt",
  "retweetedAt",
  "statusesCount",
  "mediaCount",
  "protected",
  "url",
  "favouritesCount",
  "hasCustomTimelines",
  "isTranslator",
  "withheldInCountries",
  "withheldScope",
  "possiblySensitive",
  "professional",
  "pinnedTweetIds",
  "isAutomated",
  "automatedBy",
  "unavailable",
  "unavailableReason",
  "verifiedType",
  "affiliatesHighlightedLabel",
  "businessAccountAffiliatesCount",
  "creatorSubscriptionsCount",
  "hasGraduatedAccess",
  "hasHiddenSubscriptionsOnProfile",
  "highlightsInfo",
  "identityVerification",
  "isProfileTranslatable",
  "parodyCommentaryFanLabel",
  "profileDescriptionLanguage",
  "profileImageShape",
  "profileInterstitialType",
  "profileSortEnabled",
  "profileTranslatorType",
  "redirectsToUsername",
  "superFollowEligible",
  "superFollowsUserProfileActive",
  "tipJar",
  "communityRole",
  "profile_bio",
  "accountBasedInAccurate",
  "affiliateUsername",
  "connectedVia",
  "connectedViaAccurate",
  "usernameChanges",
  "birthdate",
  "email",
  "contactInfo",
  "listedCount",
  "fastFollowersCount",
  "normalFollowersCount",
  "defaultProfile",
  "defaultProfileImage",
  "hasExtendedProfile",
  "isTranslationEnabled",
  "geoEnabled",
  "advertiserAccountType",
  "advertiserAccountServiceLevels",
  "businessProfileState",
  "subscribersCount",
  "verificationReason",
] as const;

const MEDIA_FIELDS = [
  "adultContent",
  "mediaUrl",
  "type",
  "url",
  "allowDownload",
  "altText",
  "aspectRatio",
  "availabilityStatus",
  "availabilityReason",
  "description",
  "displayUrl",
  "durationMillis",
  "editedWithNativeEditor",
  "expandedUrl",
  "embeddable",
  "faceRects",
  "focusRects",
  "graphicViolence",
  "height",
  "id",
  "indices",
  "mediaKey",
  "grokImageAnnotation",
  "grokPostId",
  "monetizable",
  "otherSensitiveContent",
  "sizes",
  "sourceStatusId",
  "sourceUserId",
  "tags",
  "title",
  "videoVariants",
  "visitSiteUrl",
  "watchNowUrl",
  "width",
  "sourceUser",
] as const;

const NESTED_TWEET_REQUIRED_FIELDS = [
  "id",
  "text",
  "retweetCount",
  "replyCount",
  "likeCount",
  "quoteCount",
  "viewCount",
  "bookmarkCount",
] as const;

const PARSED_OPENAPI = Bun.YAML.parse(OPENAPI) as OpenApiDocument;

interface SchemaFieldSets {
  readonly closed: boolean;
  readonly declared: readonly string[];
  readonly required: readonly string[];
}

function schemaFieldSets(
  openApi: Readonly<OpenApiDocument>,
  schema: Readonly<OpenApiSchema>,
): SchemaFieldSets {
  const referencedName = schema.$ref?.split("/").at(-1);
  const referenced =
    referencedName === undefined ? [] : [openApi.components?.schemas?.[referencedName]];
  const members = [...(schema.allOf ?? []), ...referenced].map((member) => {
    if (member === undefined) {
      throw new Error(`OpenAPI is missing schema ${referencedName}.`);
    }
    return schemaFieldSets(openApi, member);
  });
  return {
    closed:
      (schema.additionalProperties !== undefined && schema.additionalProperties !== true) ||
      members.some((member) => member.closed),
    declared: sortedFields([
      ...new Set([
        ...Object.keys(schema.properties ?? {}),
        ...members.flatMap((member) => member.declared),
      ]),
    ]),
    required: sortedFields([
      ...new Set([...(schema.required ?? []), ...members.flatMap((member) => member.required)]),
    ]),
  };
}

function sortedFields(fields: readonly string[]): readonly string[] {
  return [...fields].toSorted((left, right) => left.localeCompare(right));
}

function parameterName(
  openApi: Readonly<OpenApiDocument>,
  parameter: Readonly<OpenApiParameter>,
): string | undefined {
  if (parameter.name !== undefined) return parameter.name;
  const componentName = parameter.$ref?.split("/").at(-1);
  return componentName === undefined
    ? undefined
    : openApi.components?.parameters?.[componentName]?.name;
}

describe("read data richness documentation", (): void => {
  it("documents every normalized field from the OpenAPI contract", (): void => {
    const fields = [...TWEET_FIELDS, ...PROFILE_FIELDS, ...MEDIA_FIELDS];
    expect.assertions(fields.length + 4);

    for (const field of fields) {
      expect(GUIDE, `guide omits ${field}`).toContain(`\`${field}\``);
    }
    expect(
      schemaFieldSets(PARSED_OPENAPI, { $ref: "#/components/schemas/TweetDetail" }).declared,
    ).toStrictEqual(sortedFields(TWEET_FIELDS));
    expect(
      schemaFieldSets(PARSED_OPENAPI, { $ref: "#/components/schemas/SearchTweet" }).declared,
    ).toStrictEqual(sortedFields(TWEET_FIELDS));
    expect(
      schemaFieldSets(PARSED_OPENAPI, { $ref: "#/components/schemas/UserProfile" }).declared,
    ).toStrictEqual(sortedFields(PROFILE_FIELDS));
    expect(
      schemaFieldSets(PARSED_OPENAPI, { $ref: "#/components/schemas/TweetMedia" }).declared,
    ).toStrictEqual(sortedFields(MEDIA_FIELDS));
  });

  it("types nested tweets with the required tweet fields and author", (): void => {
    expect.assertions(4);
    const embeddedTweet = schemaFieldSets(PARSED_OPENAPI, {
      $ref: "#/components/schemas/EmbeddedTweet",
    });

    expect(PARSED_OPENAPI.components?.schemas?.["EmbeddedTweet"]?.additionalProperties).toBe(true);
    expect(
      embeddedTweet.closed,
      "an allOf or $ref member of EmbeddedTweet rejects fields it does not declare",
    ).toBe(false);
    expect(embeddedTweet.declared).toEqual(
      expect.arrayContaining([...NESTED_TWEET_REQUIRED_FIELDS, "author"]),
    );
    expect(embeddedTweet.required).toStrictEqual(sortedFields(NESTED_TWEET_REQUIRED_FIELDS));
  });

  it("keeps agent guidance and discovery links public", (): void => {
    expect.assertions(9);

    expect(MCP_TOOLS).toContain("keeps every safe field");
    expect(MCP_TOOLS).toContain("replies_incomplete");
    expect(MCP_TOOLS).toContain("mode=complete&limit=25000");
    expect(MCP_TOOLS).toContain("/guides/tweet-profile-api-fields");
    expect(GUIDE).toContain("Xquik omits unavailable optional fields");
    expect(GUIDE).toContain("coverage depends on X");
    expect(GUIDE).toContain("Rows hold public data only.");
    expect(DOCS_CONFIG).toContain('"guides/tweet-profile-api-fields"');
    expect(LLMS_INDEX).toContain("https://docs.xquik.com/guides/tweet-profile-api-fields");
  });

  it("documents visible reply coverage for every public interface", (): void => {
    expect.assertions(10);
    const operation = PARSED_OPENAPI.paths?.["/x/tweets/{id}/replies"]?.get;
    const parameterNames = operation?.parameters?.flatMap((parameter) => {
      const name = parameterName(PARSED_OPENAPI, parameter);
      return name === undefined ? [] : [name];
    });
    const parameterRefs = operation?.parameters?.flatMap((parameter) =>
      parameter.$ref === undefined ? [] : [parameter.$ref],
    );

    expect(operation?.description).toContain("Complete mode");
    expect(operation?.description).toContain("80%");
    expect(parameterNames).toContain("cursor");
    expect(parameterNames).toEqual(expect.arrayContaining(["mode", "limit"]));
    expect(parameterRefs).toContain("#/components/parameters/AutomaticTweetPageSize");
    expect(GUIDE).toContain("mode=complete&limit=25000");
    expect(GUIDE).toContain("coveragePercentage");
    expect(MCP_TOOLS).toContain("mode=complete&limit=25000");
    expect(MCP_TOOLS).toContain("recommendedFallback");
    expect(TWEET_REPLIES).toContain("Trust `diagnostic.complete`");
  });
  it("distinguishes direct coverage from nested reply exhaustion", (): void => {
    expect.assertions(3);
    expect(TWEET_REPLIES).toContain("It does not prove that Xquik returned every nested reply.");
    expect(TWEET_REPLIES).toContain("the fullest reply list.");
    expect(TWEET_REPLIES).toContain("Requested limits & deadlines still apply.");
  });
});
