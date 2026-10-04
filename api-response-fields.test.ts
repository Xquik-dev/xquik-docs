import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = process.cwd();
const DOCS_OPENAPI_PATH = join(PROJECT_ROOT, "openapi.yaml");
interface OpenApiSpec {
  readonly components?: {
    readonly responses?: Record<string, OpenApiResponse>;
    readonly schemas?: Record<string, OpenApiSchema>;
  };
  readonly paths?: Record<string, Record<string, OpenApiOperation>>;
}

interface OpenApiMediaType {
  readonly schema?: OpenApiSchema;
}

interface OpenApiOperation {
  readonly responses?: Record<string, OpenApiResponse>;
}

interface OpenApiResponse {
  readonly $ref?: string;
  readonly content?: Record<string, OpenApiMediaType>;
}

interface OpenApiSchema {
  readonly $ref?: string;
  readonly allOf?: readonly OpenApiSchema[];
  readonly anyOf?: readonly OpenApiSchema[];
  readonly items?: OpenApiSchema;
  readonly oneOf?: readonly OpenApiSchema[];
  readonly properties?: Record<string, OpenApiSchema>;
  readonly required?: readonly string[];
}

interface PageContract {
  readonly allowedFields: readonly string[];
  readonly page: string;
  readonly requiredFields: readonly string[];
}

const PAGINATED_TWEET_PAGES = [
  "api-reference/x/batch-tweets.mdx",
  "api-reference/x/search-tweets.mdx",
  "api-reference/x/user-tweets.mdx",
  "api-reference/x/user-replies.mdx",
  "api-reference/x/user-likes.mdx",
  "api-reference/x/user-media.mdx",
  "api-reference/x/user-highlights.mdx",
  "api-reference/x/user-articles.mdx",
  "api-reference/x/bookmarks.mdx",
  "api-reference/x/timeline.mdx",
  "api-reference/x/tweet-quotes.mdx",
  "api-reference/x/tweet-thread.mdx",
  "api-reference/x/tweet-hidden-replies.mdx",
  "api-reference/x/list-tweets.mdx",
  "api-reference/x/community-tweets.mdx",
  "api-reference/x/community-search.mdx",
  "api-reference/x/user-mentions.mdx",
] as const;

const PAGINATED_USER_PAGES = [
  "api-reference/x/followers.mdx",
  "api-reference/x/following.mdx",
  "api-reference/x/followers-you-know.mdx",
  "api-reference/x/verified-followers.mdx",
  "api-reference/x/list-followers.mdx",
  "api-reference/x/list-members.mdx",
  "api-reference/x/community-members.mdx",
  "api-reference/x/community-moderators.mdx",
  "api-reference/x/retweeters.mdx",
  "api-reference/x/favoriters.mdx",
  "api-reference/x/search-users.mdx",
] as const;

const NOTIFICATION_PAGE = "api-reference/x/notifications.mdx";
const TWEET_REPLIES_PAGE = "api-reference/x/tweet-replies.mdx";
const COMMUNITY_INFO_PAGE = "api-reference/x/community-info.mdx";
const MEDIA_DOWNLOAD_PAGE = "api-reference/x/download-media.mdx";
const BOOKMARK_FOLDERS_PAGE = "api-reference/x/bookmark-folders.mdx";
const X_TRENDS_PAGE = "api-reference/x/trends.mdx";
const FOLLOW_CHECK_PAGE = "api-reference/x/check-follower.mdx";
const SEARCH_AUTOCOMPLETE_PAGE = "api-reference/x/search-autocomplete.mdx";
const ACCOUNT_GET_PAGE = "api-reference/account/get.mdx";
const ACCOUNT_UPDATE_PAGE = "api-reference/account/update.mdx";
const ACCOUNT_X_IDENTITY_PAGE = "api-reference/account/x-identity.mdx";
const SUBSCRIBE_PAGE = "api-reference/account/subscription-checkout.mdx";
const CREDITS_PAGE = "api-reference/credits/get.mdx";
const CREDITS_TOPUP_PAGE = "api-reference/credits/topup.mdx";
const CREDITS_TOPUP_STATUS_PAGE = "api-reference/credits/topup-status.mdx";
const CREDITS_QUICK_TOPUP_PAGE = "api-reference/credits/quick-topup.mdx";
const API_KEYS_LIST_PAGE = "api-reference/api-keys/list.mdx";
const API_KEYS_CREATE_PAGE = "api-reference/api-keys/create.mdx";
const API_KEYS_REVOKE_PAGE = "api-reference/api-keys/revoke.mdx";
const DRAFTS_LIST_PAGE = "api-reference/drafts/list.mdx";
const DRAFTS_CREATE_PAGE = "api-reference/drafts/create.mdx";
const DRAFTS_GET_PAGE = "api-reference/drafts/get.mdx";
const STYLES_ANALYZE_PAGE = "api-reference/styles/analyze.mdx";
const STYLES_SAVE_PAGE = "api-reference/styles/save.mdx";
const STYLES_GET_PAGE = "api-reference/styles/get.mdx";
const STYLES_LIST_PAGE = "api-reference/styles/list.mdx";
const STYLES_COMPARE_PAGE = "api-reference/styles/compare.mdx";
const STYLES_PERFORMANCE_PAGE = "api-reference/styles/performance.mdx";
const ARTICLE_PAGE = "api-reference/x/get-article.mdx";
const DM_HISTORY_PAGE = "api-reference/x/dm-history.mdx";
const SEND_DM_PAGE = "api-reference/x-write/send-dm.mdx";
const UPLOAD_MEDIA_PAGE = "api-reference/x-write/upload-media.mdx";
const UPDATE_PROFILE_PAGE = "api-reference/x-write/update-profile.mdx";
const UPDATE_AVATAR_PAGE = "api-reference/x-write/update-avatar.mdx";
const UPDATE_BANNER_PAGE = "api-reference/x-write/update-banner.mdx";
const CREATE_COMMUNITY_PAGE = "api-reference/x-write/create-community.mdx";
const DELETE_COMMUNITY_PAGE = "api-reference/x-write/delete-community.mdx";
const JOIN_COMMUNITY_PAGE = "api-reference/x-write/join-community.mdx";
const LEAVE_COMMUNITY_PAGE = "api-reference/x-write/leave-community.mdx";
const CREATE_TWEET_PAGE = "api-reference/x-write/create-tweet.mdx";
const DELETE_TWEET_PAGE = "api-reference/x-write/delete-tweet.mdx";
const LIKE_TWEET_PAGE = "api-reference/x-write/like.mdx";
const UNLIKE_TWEET_PAGE = "api-reference/x-write/unlike.mdx";
const RETWEET_PAGE = "api-reference/x-write/retweet.mdx";
const UNRETWEET_PAGE = "api-reference/x-write/unretweet.mdx";
const FOLLOW_USER_PAGE = "api-reference/x-write/follow.mdx";
const UNFOLLOW_USER_PAGE = "api-reference/x-write/unfollow.mdx";
const REMOVE_FOLLOWER_PAGE = "api-reference/x-write/remove-follower.mdx";
const WRITE_ACTION_STATUS_PAGE = "api-reference/x-write/get-write-action-status.mdx";
const WRITE_ACTION_STATUS_PAGE_SOURCE = readFileSync(
  join(PROJECT_ROOT, WRITE_ACTION_STATUS_PAGE),
  "utf8",
);
const X_ACCOUNT_LIST_PAGE = "api-reference/x-accounts/list.mdx";
const X_ACCOUNT_DETAIL_PAGE = "api-reference/x-accounts/get.mdx";
const X_ACCOUNT_CONNECT_PAGE = "api-reference/x-accounts/connect.mdx";
const X_ACCOUNT_CHALLENGE_SUBMIT_PAGE = "api-reference/x-accounts/submit-challenge.mdx";
const X_ACCOUNT_REAUTH_PAGE = "api-reference/x-accounts/reauth.mdx";
const X_ACCOUNT_BULK_RETRY_PAGE = "api-reference/x-accounts/bulk-retry.mdx";
const X_ACCOUNT_DISCONNECT_PAGE = "api-reference/x-accounts/disconnect.mdx";

function parseYaml(source: string): OpenApiSpec {
  return Bun.YAML.parse(source) as OpenApiSpec;
}

function readOpenApi(): OpenApiSpec {
  return parseYaml(readFileSync(DOCS_OPENAPI_PATH, "utf8"));
}

function schemaByName(spec: OpenApiSpec, name: string): OpenApiSchema {
  const schema = spec.components?.schemas?.[name];
  if (schema === undefined) {
    throw new Error(`Missing OpenAPI schema: ${name}`);
  }
  return schema;
}

function resolveSchema(spec: OpenApiSpec, schema: OpenApiSchema): OpenApiSchema {
  const resolved =
    schema.$ref === undefined
      ? schema
      : schemaByName(spec, schema.$ref.replace("#/components/schemas/", ""));
  const composed = [
    ...(resolved.allOf ?? []),
    ...(resolved.oneOf ?? []),
    ...(resolved.anyOf ?? []),
  ].map((item): OpenApiSchema => resolveSchema(spec, item));
  return {
    ...resolved,
    properties: Object.assign(
      {},
      ...composed.map((item): Record<string, OpenApiSchema> => item.properties ?? {}),
      resolved.properties ?? {},
    ),
    required: uniqueSorted([
      ...(resolved.required ?? []),
      ...(resolved.allOf ?? []).flatMap(
        (item): readonly string[] => resolveSchema(spec, item).required ?? [],
      ),
    ]),
  };
}

function responseByName(spec: OpenApiSpec, name: string): OpenApiResponse {
  const response = spec.components?.responses?.[name];
  if (response === undefined) {
    throw new Error(`Missing OpenAPI response: ${name}`);
  }
  return response;
}

function resolveResponse(spec: OpenApiSpec, response: OpenApiResponse): OpenApiResponse {
  if (response.$ref === undefined) {
    return response;
  }
  const name = response.$ref.replace("#/components/responses/", "");
  return responseByName(spec, name);
}

function schemaPropertyNames(spec: OpenApiSpec, name: string): readonly string[] {
  const schema = resolveSchema(spec, schemaByName(spec, name));
  return Object.keys(schema.properties ?? {}).sort((left, right): number =>
    left.localeCompare(right),
  );
}

function requiredSchemaPropertyNames(spec: OpenApiSpec, name: string): readonly string[] {
  return uniqueSorted(resolveSchema(spec, schemaByName(spec, name)).required ?? []);
}

function propertyNames(schema: OpenApiSchema | undefined): readonly string[] {
  return Object.keys(schema?.properties ?? {}).sort((left, right): number =>
    left.localeCompare(right),
  );
}

function responseFieldNamesFromSchema(spec: OpenApiSpec, schema: OpenApiSchema): readonly string[] {
  const resolved = resolveSchema(spec, schema);
  return uniqueSorted([
    ...propertyNames(resolved),
    ...(resolved.allOf ?? []).flatMap((nested): readonly string[] =>
      responseFieldNamesFromSchema(spec, nested),
    ),
    ...(resolved.oneOf ?? []).flatMap((nested): readonly string[] =>
      responseFieldNamesFromSchema(spec, nested),
    ),
    ...(resolved.anyOf ?? []).flatMap((nested): readonly string[] =>
      responseFieldNamesFromSchema(spec, nested),
    ),
  ]);
}

function schemaProperty(
  spec: OpenApiSpec,
  schemaName: string,
  property: string,
): OpenApiSchema | undefined {
  return resolveSchema(spec, schemaByName(spec, schemaName)).properties?.[property];
}

function itemPropertyNames(
  spec: OpenApiSpec,
  schemaName: string,
  property: string,
): readonly string[] {
  const schema = schemaProperty(spec, schemaName, property);
  return propertyNames(resolveSchema(spec, schema?.items ?? {}));
}

function responseSchema(
  spec: OpenApiSpec,
  path: string,
  method: string,
  status = "200",
): OpenApiSchema {
  const schema = resolveResponse(spec, spec.paths?.[path]?.[method]?.responses?.[status] ?? {})
    .content?.["application/json"]?.schema;
  if (schema === undefined) {
    throw new Error(`Missing ${status} JSON response schema: ${method} ${path}`);
  }
  return resolveSchema(spec, schema);
}

function itemPropertyNamesFromProperty(
  spec: OpenApiSpec,
  schema: OpenApiSchema,
  property: string,
): readonly string[] {
  const itemSchema = schema.properties?.[property]?.items ?? {};
  return propertyNames(resolveSchema(spec, itemSchema));
}

function uniqueSorted(fields: readonly string[]): readonly string[] {
  return [...new Set(fields)].sort((left, right): number => left.localeCompare(right));
}

function responseFields(page: string): readonly string[] {
  const pageSource = readFileSync(join(PROJECT_ROOT, page), "utf8");
  const source = pageSource.includes("<WriteActionLifecycleResponse />")
    ? `${pageSource}\n${WRITE_ACTION_STATUS_PAGE_SOURCE}`
    : pageSource;
  return uniqueSorted(
    [...source.matchAll(/<ResponseField\s+name="(?<field>[^"]+)"/gu)].map(
      (match): string => match.groups?.["field"] ?? "",
    ),
  ).filter((field): boolean => field.length > 0);
}

function fieldDifferences(
  label: string,
  actual: readonly string[],
  expected: readonly string[],
): readonly string[] {
  return [
    ...setDifference(actual, expected).map((field) => `${label} has no product field ${field}.`),
    ...setDifference(expected, actual).map((field) => `${label} is missing ${field}.`),
  ];
}

function setDifference(actual: readonly string[], expected: readonly string[]): readonly string[] {
  const expectedSet = new Set(expected);
  return actual.filter((field): boolean => !expectedSet.has(field));
}

function prefixedFields(prefix: string, fields: readonly string[]): readonly string[] {
  return fields.map((field): string => `${prefix}${field}`);
}

function pageContracts(spec: OpenApiSpec): readonly PageContract[] {
  const paginatedTweets = schemaPropertyNames(spec, "PaginatedTweets");
  const paginatedUsers = schemaPropertyNames(spec, "PaginatedUsers");
  const searchTweet = schemaPropertyNames(spec, "SearchTweet");
  const userProfile = schemaPropertyNames(spec, "UserProfile");
  const tweetDetail = schemaPropertyNames(spec, "TweetDetail");
  const tweetAuthor = schemaPropertyNames(spec, "TweetAuthor");
  const searchTweetMedia = itemPropertyNames(spec, "SearchTweet", "media");
  const tweetDetailMedia = itemPropertyNames(spec, "TweetDetail", "media");
  const tweetRepliesResponse = responseSchema(spec, "/x/tweets/{id}/replies", "get");
  const tweetReplies = responseFieldNamesFromSchema(spec, tweetRepliesResponse);
  const replyDiagnostic = schemaPropertyNames(spec, "ReplyCoverageDiagnostic");
  const replyRichness = schemaPropertyNames(spec, "ReplyCoverageRichness");
  const paginatedTweetRequired = uniqueSorted([
    ...requiredSchemaPropertyNames(spec, "PaginatedTweets"),
    ...requiredSchemaPropertyNames(spec, "SearchTweet"),
  ]);
  const paginatedUserRequired = uniqueSorted([
    ...requiredSchemaPropertyNames(spec, "PaginatedUsers"),
    ...requiredSchemaPropertyNames(spec, "UserProfile"),
  ]);
  const notificationsResponse = responseSchema(spec, "/x/notifications", "get");
  const notifications = propertyNames(notificationsResponse);
  const notification = itemPropertyNamesFromProperty(spec, notificationsResponse, "notifications");
  const communityInfoResponse = responseSchema(spec, "/x/communities/{id}/info", "get");
  const communityInfo = propertyNames(
    resolveSchema(spec, communityInfoResponse.properties?.["community"] ?? {}),
  );
  const mediaDownload = propertyNames(responseSchema(spec, "/x/media/download", "post"));
  const bookmarkFoldersResponse = responseSchema(spec, "/x/bookmarks/folders", "get");
  const bookmarkFolders = propertyNames(bookmarkFoldersResponse);
  const bookmarkFolder = itemPropertyNamesFromProperty(spec, bookmarkFoldersResponse, "folders");
  const xTrendsResponse = responseSchema(spec, "/x/trends", "get");
  const xTrends = propertyNames(xTrendsResponse);
  const xTrend = itemPropertyNamesFromProperty(spec, xTrendsResponse, "trends");
  const followCheck = propertyNames(responseSchema(spec, "/x/followers/check", "get"));
  const searchSuggestions = resolveSchema(
    spec,
    responseSchema(spec, "/x/search/autocomplete", "get"),
  );
  const suggestedUser = resolveSchema(spec, searchSuggestions.properties?.["users"]?.items ?? {});
  const searchAutocomplete = uniqueSorted([
    ...propertyNames(searchSuggestions),
    ...["users", "topics", "hashtags", "cashtags"].flatMap((list): readonly string[] =>
      itemPropertyNamesFromProperty(spec, searchSuggestions, list),
    ),
    ...propertyNames(suggestedUser.properties?.["badges"]?.items),
  ]);
  const accountGetResponse = responseSchema(spec, "/account", "get");
  const accountGet = uniqueSorted([
    ...propertyNames(accountGetResponse),
    ...propertyNames(accountGetResponse.properties?.["creditInfo"]),
    ...propertyNames(accountGetResponse.properties?.["monitorBilling"]),
    ...propertyNames(accountGetResponse.properties?.["subscription"]),
  ]);
  const accountUpdate = propertyNames(responseSchema(spec, "/account", "patch"));
  const accountXIdentity = propertyNames(responseSchema(spec, "/account/x-identity", "put"));
  const subscribe = propertyNames(responseSchema(spec, "/subscribe", "post"));
  const credits = propertyNames(responseSchema(spec, "/credits", "get"));
  const creditsTopup = propertyNames(responseSchema(spec, "/credits/topup", "post"));
  const creditsTopupStatus = propertyNames(responseSchema(spec, "/credits/topup/status", "get"));
  const creditsQuickTopup = responseFieldNamesFromSchema(
    spec,
    responseSchema(spec, "/credits/quick-topup", "post"),
  );
  const apiKey = schemaPropertyNames(spec, "ApiKey");
  const apiKeysListResponse = responseSchema(spec, "/api-keys", "get");
  const apiKeysList = uniqueSorted([...propertyNames(apiKeysListResponse), ...apiKey]);
  const apiKeysCreate = propertyNames(responseSchema(spec, "/api-keys", "post", "201"));
  const apiKeysRevoke = propertyNames(responseSchema(spec, "/api-keys/{id}", "delete"));
  const articleResponse = responseSchema(spec, "/x/articles/{tweetId}", "get");
  const article = propertyNames(articleResponse);
  const articleBodySchema = resolveSchema(spec, articleResponse.properties?.["article"] ?? {});
  const articleBody = propertyNames(articleBodySchema);
  const articleContentSchema = resolveSchema(
    spec,
    articleBodySchema.properties?.["contents"]?.items ?? {},
  );
  const articleContent = propertyNames(articleContentSchema);
  const articleInlineStyle = itemPropertyNamesFromProperty(
    spec,
    articleContentSchema,
    "inlineStyleRanges",
  );
  const articleAuthor = propertyNames(
    resolveSchema(spec, articleResponse.properties?.["author"] ?? {}),
  );
  const dmHistoryResponse = responseSchema(spec, "/x/dm/{userId}/history", "get");
  const dmHistory = propertyNames(dmHistoryResponse);
  const dmMessage = itemPropertyNamesFromProperty(spec, dmHistoryResponse, "messages");
  const sendDm = propertyNames(responseSchema(spec, "/x/dm/{userId}", "post"));
  const uploadMedia = propertyNames(responseSchema(spec, "/x/media", "post"));
  const updateProfile = propertyNames(responseSchema(spec, "/x/profile", "patch"));
  const updateAvatar = propertyNames(responseSchema(spec, "/x/profile/avatar", "patch"));
  const updateBanner = propertyNames(responseSchema(spec, "/x/profile/banner", "patch"));
  const createCommunity = propertyNames(responseSchema(spec, "/x/communities", "post"));
  const deleteCommunity = propertyNames(responseSchema(spec, "/x/communities/{id}", "delete"));
  const joinCommunity = propertyNames(responseSchema(spec, "/x/communities/{id}/join", "post"));
  const leaveCommunity = propertyNames(responseSchema(spec, "/x/communities/{id}/join", "delete"));
  const createTweet = propertyNames(responseSchema(spec, "/x/tweets", "post"));
  const deleteTweet = propertyNames(responseSchema(spec, "/x/tweets/{id}", "delete"));
  const likeTweet = propertyNames(responseSchema(spec, "/x/tweets/{id}/like", "post"));
  const unlikeTweet = propertyNames(responseSchema(spec, "/x/tweets/{id}/like", "delete"));
  const retweet = propertyNames(responseSchema(spec, "/x/tweets/{id}/retweet", "post"));
  const unretweet = propertyNames(responseSchema(spec, "/x/tweets/{id}/retweet", "delete"));
  const followUser = propertyNames(responseSchema(spec, "/x/users/{id}/follow", "post"));
  const unfollowUser = propertyNames(responseSchema(spec, "/x/users/{id}/follow", "delete"));
  const removeFollower = propertyNames(
    responseSchema(spec, "/x/users/{id}/remove-follower", "post"),
  );
  const writeActionStatus = propertyNames(responseSchema(spec, "/x/write-actions/{id}", "get"));
  const xAccount = schemaPropertyNames(spec, "XAccount");
  const xAccountList = propertyNames(responseSchema(spec, "/x/accounts", "get"));
  const xAccountDetail = schemaPropertyNames(spec, "XAccountDetail");
  const sanitizedXAccount = schemaPropertyNames(spec, "SanitizedXAccount");
  const xAccountConnectionChallenge = schemaPropertyNames(spec, "XAccountConnectionChallenge");
  const xAccountConnectionAttemptPending = schemaPropertyNames(
    spec,
    "XAccountConnectionAttemptPending",
  );
  const bulkRetry = propertyNames(responseSchema(spec, "/x/accounts/bulk-retry", "post"));
  const xAccountDisconnect = propertyNames(responseSchema(spec, "/x/accounts/{id}", "delete"));

  const paginatedTweetContracts = PAGINATED_TWEET_PAGES.map((page): PageContract => ({
    allowedFields: uniqueSorted([
      ...paginatedTweets,
      ...searchTweet,
      ...userProfile,
      ...searchTweetMedia,
    ]),
    page,
    requiredFields: paginatedTweetRequired,
  }));
  const paginatedUserContracts = PAGINATED_USER_PAGES.map((page): PageContract => ({
    allowedFields: uniqueSorted([...paginatedUsers, ...userProfile]),
    page,
    requiredFields: paginatedUserRequired,
  }));

  return [
    ...paginatedTweetContracts,
    {
      allowedFields: uniqueSorted([...schemaPropertyNames(spec, "BatchUsers"), ...userProfile]),
      page: "api-reference/x/batch-users.mdx",
      requiredFields: paginatedUserRequired,
    },
    {
      allowedFields: uniqueSorted([
        ...tweetReplies,
        ...replyDiagnostic,
        ...replyRichness,
        ...searchTweet,
        ...userProfile,
        ...searchTweetMedia,
      ]),
      page: TWEET_REPLIES_PAGE,
      requiredFields: paginatedTweetRequired,
    },
    ...paginatedUserContracts,
    {
      allowedFields: uniqueSorted([
        "author",
        "tweet",
        ...tweetDetail,
        ...tweetAuthor,
        ...tweetDetailMedia,
      ]),
      page: "api-reference/x/get-tweet.mdx",
      requiredFields: uniqueSorted([
        "author",
        "tweet",
        ...requiredSchemaPropertyNames(spec, "TweetDetail"),
        ...requiredSchemaPropertyNames(spec, "TweetAuthor"),
      ]),
    },
    {
      allowedFields: userProfile,
      page: "api-reference/x/twitter-profile-lookup.mdx",
      requiredFields: requiredSchemaPropertyNames(spec, "UserProfile"),
    },
    ...(
      [
        [NOTIFICATION_PAGE, uniqueSorted([...notifications, ...notification])],
        [COMMUNITY_INFO_PAGE, uniqueSorted(["community", ...communityInfo])],
        [MEDIA_DOWNLOAD_PAGE, mediaDownload],
        [BOOKMARK_FOLDERS_PAGE, uniqueSorted([...bookmarkFolders, ...bookmarkFolder])],
        [X_TRENDS_PAGE, uniqueSorted([...xTrends, ...xTrend])],
        [FOLLOW_CHECK_PAGE, followCheck],
        [SEARCH_AUTOCOMPLETE_PAGE, searchAutocomplete],
        [ACCOUNT_GET_PAGE, accountGet],
        [ACCOUNT_UPDATE_PAGE, accountUpdate],
        [ACCOUNT_X_IDENTITY_PAGE, accountXIdentity],
        [SUBSCRIBE_PAGE, subscribe],
        [CREDITS_PAGE, credits],
        [CREDITS_TOPUP_PAGE, creditsTopup],
        [CREDITS_TOPUP_STATUS_PAGE, creditsTopupStatus],
        [CREDITS_QUICK_TOPUP_PAGE, creditsQuickTopup],
        [API_KEYS_LIST_PAGE, apiKeysList],
        [API_KEYS_CREATE_PAGE, apiKeysCreate],
        [API_KEYS_REVOKE_PAGE, apiKeysRevoke],
        [
          ARTICLE_PAGE,
          uniqueSorted([
            ...article,
            ...articleBody,
            ...articleContent,
            ...articleInlineStyle,
            ...articleAuthor,
          ]),
        ],
        [DM_HISTORY_PAGE, uniqueSorted([...dmHistory, ...dmMessage])],
        [SEND_DM_PAGE, sendDm],
        [UPLOAD_MEDIA_PAGE, uploadMedia],
        [UPDATE_PROFILE_PAGE, updateProfile],
        [UPDATE_AVATAR_PAGE, updateAvatar],
        [UPDATE_BANNER_PAGE, updateBanner],
        [CREATE_COMMUNITY_PAGE, createCommunity],
        [DELETE_COMMUNITY_PAGE, deleteCommunity],
        [JOIN_COMMUNITY_PAGE, joinCommunity],
        [LEAVE_COMMUNITY_PAGE, leaveCommunity],
        [CREATE_TWEET_PAGE, createTweet],
        [DELETE_TWEET_PAGE, deleteTweet],
        [LIKE_TWEET_PAGE, likeTweet],
        [UNLIKE_TWEET_PAGE, unlikeTweet],
        [RETWEET_PAGE, retweet],
        [UNRETWEET_PAGE, unretweet],
        [FOLLOW_USER_PAGE, followUser],
        [UNFOLLOW_USER_PAGE, unfollowUser],
        [REMOVE_FOLLOWER_PAGE, removeFollower],
        [WRITE_ACTION_STATUS_PAGE, writeActionStatus],
      ] satisfies readonly (readonly [string, readonly string[]])[]
    ).map(([page, fields]): PageContract => ({
      page,
      allowedFields: fields,
      requiredFields: fields,
    })),
    {
      allowedFields: uniqueSorted([...xAccountList, ...prefixedFields("accounts[].", xAccount)]),
      page: X_ACCOUNT_LIST_PAGE,
      requiredFields: uniqueSorted(["accounts", ...prefixedFields("accounts[].", xAccount)]),
    },
    ...(
      [
        [X_ACCOUNT_DETAIL_PAGE, xAccountDetail],
        [
          X_ACCOUNT_CONNECT_PAGE,
          uniqueSorted([
            ...sanitizedXAccount,
            ...xAccountConnectionAttemptPending,
            ...xAccountConnectionChallenge,
          ]),
        ],
        [
          X_ACCOUNT_CHALLENGE_SUBMIT_PAGE,
          uniqueSorted([...sanitizedXAccount, ...xAccountConnectionChallenge]),
        ],
        [X_ACCOUNT_REAUTH_PAGE, sanitizedXAccount],
        [X_ACCOUNT_BULK_RETRY_PAGE, bulkRetry],
        [X_ACCOUNT_DISCONNECT_PAGE, xAccountDisconnect],
      ] satisfies readonly (readonly [string, readonly string[]])[]
    ).map(([page, fields]): PageContract => ({
      page,
      allowedFields: fields,
      requiredFields: fields,
    })),
  ];
}

describe("API response field docs", (): void => {
  it("reports unexpected and missing fields independently", (): void => {
    expect.assertions(2);
    expect(fieldDifferences("Example", ["shared", "extra"], ["shared", "missing"])).toEqual([
      "Example has no product field extra.",
      "Example is missing missing.",
    ]);
    expect(fieldDifferences("Example", ["shared"], ["shared"])).toEqual([]);
  });
  it("keeps selected X read endpoint fields aligned with OpenAPI schemas", (): void => {
    expect.assertions(1);

    const spec = readOpenApi();
    const findings = pageContracts(spec).flatMap((contract): readonly string[] => {
      const documented = responseFields(contract.page);
      return [
        ...setDifference(contract.requiredFields, documented).map(
          (field): string => `${contract.page} is missing ${field}.`,
        ),
        ...setDifference(documented, contract.allowedFields).map(
          (field): string => `${contract.page} documents unknown ${field}.`,
        ),
      ];
    });

    expect(findings).toStrictEqual([]);
  });

  it("keeps draft response fields aligned with the draft schema", (): void => {
    expect.assertions(1);

    const draftFields = schemaPropertyNames(readOpenApi(), "DraftDetail");
    const listFields = responseFields(DRAFTS_LIST_PAGE);
    const createFields = responseFields(DRAFTS_CREATE_PAGE);
    const getFields = responseFields(DRAFTS_GET_PAGE);
    const listDraftFields = prefixedFields("drafts[].", draftFields);

    expect([
      ...setDifference(listDraftFields, listFields).map(
        (field): string => `${DRAFTS_LIST_PAGE} is missing ${field}.`,
      ),
      ...setDifference(draftFields, createFields).map(
        (field): string => `${DRAFTS_CREATE_PAGE} is missing ${field}.`,
      ),
      ...setDifference(draftFields, getFields).map(
        (field): string => `${DRAFTS_GET_PAGE} is missing ${field}.`,
      ),
    ]).toStrictEqual([]);
  });

  it("keeps style response fields aligned with the style schemas", (): void => {
    expect.assertions(1);

    const spec = readOpenApi();
    const detailFields = schemaPropertyNames(spec, "StyleProfile");
    const summaryFields = schemaPropertyNames(spec, "StyleProfileSummary");
    const performance = responseSchema(spec, "/styles/{id}/performance", "get");
    const performanceFields = uniqueSorted([
      ...propertyNames(performance),
      ...itemPropertyNamesFromProperty(spec, performance, "tweets"),
    ]);

    expect([
      ...setDifference(detailFields, responseFields(STYLES_ANALYZE_PAGE)).map(
        (field): string => `${STYLES_ANALYZE_PAGE} is missing ${field}.`,
      ),
      ...setDifference(detailFields, responseFields(STYLES_SAVE_PAGE)).map(
        (field): string => `${STYLES_SAVE_PAGE} is missing ${field}.`,
      ),
      ...setDifference(detailFields, responseFields(STYLES_GET_PAGE)).map(
        (field): string => `${STYLES_GET_PAGE} is missing ${field}.`,
      ),
      ...setDifference(["styles", ...summaryFields], responseFields(STYLES_LIST_PAGE)).map(
        (field): string => `${STYLES_LIST_PAGE} is missing ${field}.`,
      ),
      ...setDifference(
        ["style1", "style2", ...detailFields],
        responseFields(STYLES_COMPARE_PAGE),
      ).map((field): string => `${STYLES_COMPARE_PAGE} is missing ${field}.`),
      ...fieldDifferences(
        STYLES_PERFORMANCE_PAGE,
        responseFields(STYLES_PERFORMANCE_PAGE),
        performanceFields,
      ),
    ]).toStrictEqual([]);
  });
});
