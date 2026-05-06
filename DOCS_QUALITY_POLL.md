# Xquik Docs Quality Poll

This file is the persistent handoff for the recurring docs quality poll.
Each run must update it with findings, corrections, recommended next actions,
and a better prompt for the following run.

## Goal

Make `docs.xquik.com` accurate, complete, persuasive, and easy to trust.
Every page should help developers understand Xquik faster, use the API
correctly, and choose Xquik over alternatives when they read comparison pages.

## Recurring Run Checklist

1. Pull the latest `xquik-docs` changes and inspect the working tree before edits.
2. Compare docs against the Xquik product source at `/Users/burak/Developer/xquik`.
3. Verify API reference pages against `openapi.yaml` and actual route behavior.
4. Verify guides against current features, pricing, auth, webhooks, MCP, MPP,
   SDKs, dashboard flows, and tool capabilities.
5. Review `docs.json` for valid Mintlify structure, navigation, redirects,
   metadata, branding, icons, API playground settings, and SEO basics.
6. Review every new or changed MDX page for useful examples, clear prerequisites,
   accurate request and response shapes, error handling, pagination, rate limits,
   and next steps.
7. Review comparison pages for factual fairness and strong positioning:
   show where Xquik wins, state tradeoffs clearly, and avoid unverifiable claims.
8. Review framework guides for accurate setup commands, package names,
   supported framework behavior, authentication patterns, examples, and feature
   coverage.
9. Review every API endpoint page and high-value documentation page for SEO
   compatible metadata, useful content depth, concrete examples, and accurate
   workflow guidance.
10. Check public wording for confidentiality. Never disclose private vendors,
   internal infrastructure names, internal cost units, or implementation details
   that should not be public.
11. Run available static docs tests or validators. Do not start local dev servers
   unless explicitly requested in that run.
12. Update this file with findings, completed changes, recommendations, and an
    improved prompt for the next run.
13. If the run discovers a better polling strategy, update the live automation
    prompt as well as this file.
14. Commit and push successful docs changes after checks pass.

## Accuracy Sources

- Docs repo: `/Users/burak/Developer/xquik-docs`
- Product repo: `/Users/burak/Developer/xquik`
- Navigation and Mintlify config: `docs.json`
- API schema: `openapi.yaml`
- API routes: `/Users/burak/Developer/xquik/app/api/v1`
- Feature logic: `/Users/burak/Developer/xquik/lib`
- SDK references: `/Users/burak/Developer/xquik/sdks`
- Product and dashboard copy: `/Users/burak/Developer/xquik/app`
- Mintlify SEO docs: `https://www.mintlify.com/docs/optimize/seo`
- Mintlify API settings docs: `https://www.mintlify.com/docs/organize/settings-api`
- Mintlify page metadata docs: `https://www.mintlify.com/docs/organize/pages`
- Mintlify navigation docs: `https://www.mintlify.com/docs/organize/navigation`
- Mintlify score report: `https://www.mintlify.com/score/xquik`
- Mintlify score report markdown: `https://www.mintlify.com/score/xquik.md`

## Quality Bar

- Content is 100% aligned with the product and OpenAPI schema.
- Pages explain the real workflow, not only endpoint signatures.
- Code examples are copy ready, current, and consistent across languages.
- Each guide includes prerequisites, setup, happy path, edge cases, errors,
  verification, and a useful next step.
- SEO metadata targets developer search intent without keyword stuffing.
- Every API endpoint page and high-value documentation page has an SEO-ready
  title and description, a clear search intent, substantial useful content,
  accurate examples, error guidance, and a logical next step.
- Framework guides are accurate for the current Xquik SDKs, auth model,
  supported workflows, and feature set.
- Comparison pages are specific, persuasive, and credible.
- Comparison pages verify compared services, feature rows, pricing references,
  and data claims against official or clearly reliable sources before changing
  public claims.
- Public docs use generic service wording where implementation details are
  private.
- No broken links, stale redirects, empty sections, filler, vague claims,
  or outdated examples.
- Each run should try to improve the Mintlify score for Xquik when the score
  report identifies a clear, factual, and safe docs improvement.

## Current Findings

- Created this poll handoff file on 2026-05-05.
- Run 2026-05-05 17:50 UTC: `git pull --ff-only` reported the docs repo was
  already up to date.
- `docs.json` navigation resolves 190 pages with no missing files.
- `openapi.yaml` has 118 operations across 91 paths. Every OpenAPI path has a
  matching product route under `/Users/burak/Developer/xquik/app/api/v1`.
- Product routes not present in OpenAPI are `/`, `/x`, `/x/dm`, `/x/followers`,
  and `/x/users`. These currently use `createIndexRoute`, so they look like
  intentional index helpers rather than missing operation docs.
- The page metadata scan found only `skill.md` and
  `snippets/llms-directive.mdx` outside normal title and description metadata.
  Both are support files, not navigation pages.
- Mintlify documentation confirms global `metadata.timestamp` can show last
  modified timestamps, and page frontmatter descriptions support SEO and
  previews.
- Run 2026-05-05 18:05 UTC: `git pull --ff-only` reported the docs repo was
  already up to date.
- Method-level API parity check found 123 product route handlers and 118
  OpenAPI operations. The only product handlers missing from OpenAPI are
  `GET /`, `GET /x`, `GET /x/dm`, `GET /x/followers`, and `GET /x/users`;
  all 5 are `createIndexRoute` helpers, not user operation pages.
- All 118 OpenAPI operations have unique `operationId` values.
- `docs.json` navigation has 190 page references with no duplicates.
- Radar source names in docs match the product API enum, including `trustmrr`.
  Because source names are part of the public API contract, changing the docs
  alone would make the reference inaccurate.
- Run 2026-05-05 follow-up: the user explicitly requested that the poll should
  keep improving its prompt, update the live automation prompt when useful, and
  always commit and push successful changes.
- Run 2026-05-05 18:25 UTC: billing and MPP pricing values matched product
  constants in `/Users/burak/Developer/xquik/lib/credits/constants.ts`,
  `/Users/burak/Developer/xquik/lib/monitors/billing.ts`, and
  `/Users/burak/Developer/xquik/lib/mpp/pricing.ts`.
- The MPP article endpoint was named with `{id}` in prose tables while
  `openapi.yaml`, the product route, the API reference, and `llms.txt` use
  or should use `{tweetId}`.
- Run 2026-05-05 18:42 UTC: prose endpoint string audit found stale colon
  placeholders in authentication, extraction, type, and `llms.txt` content.
- The same audit found one incorrect direct-message media send endpoint in the
  upload-media API reference: `POST /x/dm/id` did not match OpenAPI.
- Run 2026-05-05 19:05 UTC: event-type audit confirmed product source
  `/Users/burak/Developer/xquik/lib/events/event-types.ts` exposes 4
  subscribable events: `tweet.new`, `tweet.quote`, `tweet.reply`, and
  `tweet.retweet`.
- The product test webhook source
  `/Users/burak/Developer/xquik/lib/webhooks/test-webhook.ts` exposes
  `webhook.test` as a non-subscribable test payload event.
- `webhooks/overview.mdx` still described follower event payloads even though
  follower event types were removed from the current public contract.
- Run 2026-05-05 19:24 UTC: request-field audit found OpenAPI drift for
  `POST /credits/topup`; the product route reads a required `dollars` body
  field, but `openapi.yaml` documented `amount`.
- The same audit found OpenAPI drift for `POST /subscribe`; the product route
  accepts an optional `tier` body field, but `openapi.yaml` had no request
  body for the operation.
- The same audit found OpenAPI drift for `POST /x/media`; the product route
  accepts multipart uploads with `file` or JSON URL uploads with `url`, but
  `openapi.yaml` only documented the multipart file path.
- Run 2026-05-05 20:06 UTC: Mintlify score report showed Xquik at 94/100 with
  one failed Page Size HTML check and 2 low-impact warnings.
- The same score report showed `llms.txt` covered 163/190 sitemap doc pages.
  Local `docs.json` versus `llms.txt` coverage found all missing navigation
  links were comparison pages under `/alternatives`.
- The HTML size failure appears tied to generated Mintlify page HTML and is not
  directly fixable from docs content alone, but the report already confirms
  markdown page size and direct markdown access pass.
- The same run found stale follower-change monitoring wording in
  `introduction.mdx`, `skill.md`, and `llms.txt`; current product event types
  are limited to `tweet.new`, `tweet.quote`, `tweet.reply`, and
  `tweet.retweet`.
- Run 2026-05-05 20:30 UTC: navigation-page SEO metadata scan found 190 docs
  pages all had title and description frontmatter, but
  `api-reference/monitors/delete.mdx` and
  `api-reference/monitors/list-keywords.mdx` had descriptions below the
  50-character search-preview quality floor.
- Run 2026-05-05 20:47 UTC: API endpoint content-quality scan found all 118
  endpoint pages had code examples, response sections, and successful response
  tabs. `api-reference/radar/list.mdx` was the only endpoint page without a
  dedicated headers section.
- Run 2026-05-05 21:03 UTC: refreshed Mintlify score report showed 94/100 with
  25/29 checks passing. The previous `llms.txt` freshness warning improved from
  86% to 99%, but the live sitemap still exposed
  `https://docs.xquik.com/DOCS_QUALITY_POLL`.
- The internal docs poll handoff page was publicly reachable and appeared in
  the live sitemap. It should not be part of `docs.xquik.com` or the Mintlify
  score corpus.
- Run 2026-05-05 21:24 UTC: refreshed Mintlify score report remained 94/100
  with 25/29 checks passing. The remaining failed score item is still rendered
  HTML size, while markdown page size and direct markdown access pass.
- Official Mintlify navigation docs confirm nested sidebar groups default to
  collapsed unless `expanded: true` is set. `docs.json` already keeps every
  nested X API group expanded: Users, Tweets, Relationships, Engagement,
  Timeline & DMs, Communities, and Lists.
- Run 2026-05-05 21:45 UTC: refreshed Mintlify score report remained 94/100
  with 25/29 checks passing. The remaining failed score item is still generated
  HTML size, while markdown page size and direct markdown access pass.
- Success-response status audit found one OpenAPI drift: `POST /styles`
  documented only `200`, but product source returns `201` when it refreshes and
  upserts a style profile via `styleUpsertResponse(upserted, 201)`.
- A strict all-status response audit found broader existing error-status drift
  between OpenAPI and endpoint tabs. That is too large for one poll cycle and
  should be handled as a dedicated source-truth audit before enforcing.
- Run 2026-05-05 22:02 UTC: refreshed Mintlify score report remained 94/100
  with 25/29 checks passing. The remaining failed score item is still generated
  HTML size, while markdown page size and direct markdown access pass.
- Styles endpoint source audit found all Styles routes run through `withV1Auth`
  or `withXApiGuard`, so tier rate limits can return `429` with
  `rate_limit_exceeded`, `retryAfter`, and a `Retry-After` header.
- The Styles cache list, compare, get, save, and delete routes do not run
  subscription checks, so `402` was stale in OpenAPI for those routes. `POST
  /styles` and `GET /styles/{id}/performance` still legitimately document
  `402`.
- Run 2026-05-05 22:36 UTC: refreshed Mintlify score report remained 94/100
  with 25/29 checks passing. The prior public-build hygiene fix is now visible:
  `llms.txt` covers 100% of 189 sitemap doc pages.
- Drafts endpoint source audit found all Drafts routes run through
  `withV1Auth`, so tier rate limits can return `429` with
  `rate_limit_exceeded`, `retryAfter`, and a `Retry-After` header.
- Draft routes do not run subscription checks, so `402` was stale in OpenAPI
  for list, create, get, and delete draft operations. Draft ID routes return
  `400 invalid_id` before database lookup when the `{id}` value is malformed.
- Run 2026-05-05 22:56 UTC: refreshed Mintlify score report remained 94/100
  with 25/29 checks passing. `llms.txt` covers 100% of 189 sitemap doc pages
  and is 47,005 characters, under the 50,000 character threshold.
- The score report still flags generated HTML size across sampled pages and a
  minor markdown versus HTML parity warning on 1 sampled page. Markdown size,
  direct markdown access, content discoverability, `llms-full.txt`, `skill.md`,
  and MCP discovery all pass.
- Webhooks endpoint source audit found all Webhooks routes run through
  `withV1Auth`, `withV1AuthAndId`, or `createV1IdRoute`, so tier rate limits
  can return `429` with `rate_limit_exceeded`, `retryAfter`, and a
  `Retry-After` header.
- Webhook routes do not run subscription checks, so `402` was stale in OpenAPI
  for list, create, update, delete, deliveries, and test operations. Webhook ID
  routes can return `400 invalid_id`; the test route can also return
  `400 webhook_inactive`.
- The webhook creation route returns a plaintext 64-character hex HMAC secret
  once at creation time. The OpenAPI example used a `whsec_`-style placeholder
  that did not match product behavior.
- Run 2026-05-05 23:24 UTC: refreshed Mintlify score report remained 94/100
  with 25/29 checks passing. The docs DNS migration is live, `llms.txt` still
  resolves, and the report still shows the generated HTML size failure as the
  only failed component.
- Credits endpoint source audit found all Credits routes run through
  `withV1Auth`, so tier rate limits can return `429` with
  `rate_limit_exceeded`, `retryAfter`, and a `Retry-After` header.
- Credits routes do not run subscription checks, so `402` was stale in OpenAPI
  for get credits, standard top-up checkout, top-up status, and quick top-up.
- Credits OpenAPI success schemas were stale for standard top-up and quick
  top-up. The product returns a checkout `url` for standard top-up, and quick
  top-up returns one of `charged`, `requires_action`, or `no_payment_method`
  result bodies.
- Top-up status can return `amount_dollars: null`, and `credits` is omitted
  unless the billing status has a credit amount.
- Run 2026-05-05 23:56 UTC: refreshed Mintlify score report remained 94/100
  with 25/29 checks passing. `llms.txt` still covers 100% of 189 sitemap doc
  pages and remains 47,005 characters. The only failed score component is
  still generated HTML size.
- Monitors endpoint source audit found account and keyword monitor routes run
  through `withV1Auth` or `createV1IdRoute`, so tier rate limits can return
  `429` with `rate_limit_exceeded`, `retryAfter`, and a `Retry-After` header.
- Monitor ID routes can return `400 invalid_id` before lookup or update when
  `{id}` is malformed.
- Free monitor list, get, update, and delete routes do not run the credit guard,
  so `402` was stale for those OpenAPI operations. Create monitor routes still
  legitimately return `402` for credit failures before creating an active
  monitor.
- Monitor create operations had stale generic `500` response entries in
  OpenAPI, and duplicate monitor examples did not match the current
  `monitor_already_exists` message.
- Run 2026-05-06 00:20 UTC: refreshed Mintlify score report remained 94/100
  with 25/29 checks passing. `llms.txt` still covers 100% of 189 sitemap doc
  pages and remains 47,005 characters. The only failed score component is
  still generated HTML size.
- Events endpoint source audit found both Events routes run through
  `withV1Auth` or `createV1IdRoute`, so tier rate limits can return `429`
  with `rate_limit_exceeded`, `retryAfter`, and a `Retry-After` header.
- Events routes do not run the credit guard, so `402` was stale for both
  Events OpenAPI operations. `GET /events/{id}` can return `400 invalid_id`
  before lookup when `{id}` is malformed.
- The public event response schema was under-specified for keyword monitor
  events. Product formatting returns `monitorType`, may return
  `keywordMonitorId` and `query`, and omits `username` for keyword events.

## Completed Changes

- Enabled global Mintlify last-modified timestamps in the existing `docs.json`
  metadata block with `metadata.timestamp: true`.
- Fixed the duplicate `metadata` object introduced by the first poll pass by
  merging `timestamp` into the existing metadata object.
- Preserved the existing API playground and OpenAPI setup.
- Ran `bun run test:agent-docs`: 22 passed, 1 skipped.
- Ran `bunx --bun mint validate`: passed.
- Ran `bunx --bun mint openapi-check openapi.yaml`: passed, with Mintlify's
  deprecation warning that `mintlify validate` should be used instead.
- Ran `bunx --bun mint broken-links`: passed with no broken links.
- Added prompt self-improvement, live automation update, and commit/push
  requirements to this handoff.
- Corrected the MPP article endpoint placeholder from `{id}` to `{tweetId}` in
  `guides/billing.mdx`, `mpp/overview.mdx`, and `llms.txt`.
- Added endpoint placeholder-name checks to the next-run prompt and live
  automation prompt.
- Run 2026-05-05 18:25 UTC checks: `bun run test:agent-docs`,
  `bunx --bun mint validate`, and `bunx --bun mint broken-links` passed.
- Added `endpoint-strings.test.ts`, which checks documented endpoint strings
  against OpenAPI route templates, catches colon placeholders, catches bare
  placeholder segments like `/id`, and allows concrete examples that match a
  documented OpenAPI route pattern.
- Wired the endpoint string guard into `bun run test:agent-docs`.
- Corrected prose endpoint placeholders in `api-reference/authentication.mdx`,
  `guides/extraction-workflow.mdx`, `guides/types.mdx`, and `llms.txt`.
- Corrected the upload-media response note from `POST /x/dm/id` to
  `POST /x/dm/{userId}`.
- Run 2026-05-05 18:42 UTC checks: `bun run test:agent-docs` passed with
  23 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Added `event-types.test.ts`, which checks the OpenAPI `EventType` enum,
  catches unsupported event type tokens, blocks current-doc references to
  retired follower event support, verifies core event docs list all 4
  subscribable event types, and verifies webhook test docs mention
  `webhook.test`.
- Wired the event-type guard into `bun run test:agent-docs`.
- Added Valid Event Types tables to `api-reference/webhooks/create.mdx` and
  `api-reference/webhooks/update.mdx`, including a note that `webhook.test` is
  generated only by the test endpoint and cannot be subscribed to.
- Updated `webhooks/overview.mdx` to remove the stale follower-event payload
  description and clarify the `webhook.test` payload shape.
- Run 2026-05-05 19:05 UTC checks: `bun run test:agent-docs` passed with
  28 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Added `api-params.test.ts`, which parses `openapi.yaml` and checks every API
  reference page documents required OpenAPI path, query, and body fields with a
  required marker.
- Updated `bun run test:agent-docs` to execute Vitest with `bunx --bun` because
  the new OpenAPI parser uses Bun's YAML parser.
- Corrected `openapi.yaml` for `POST /credits/topup` by replacing `amount`
  with required `dollars`, adding optional `locale`, and updating the example.
- Corrected `openapi.yaml` for `POST /subscribe` by documenting the optional
  `tier` request body field.
- Corrected `openapi.yaml` for `POST /x/media` by documenting both multipart
  `file` uploads and JSON `url` uploads.
- Added optional `locale` body documentation to
  `api-reference/credits/topup.mdx`.
- Run 2026-05-05 19:24 UTC checks: `bun run test:agent-docs` passed with
  29 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Added an Alternatives section to `llms.txt` with all 26 comparison pages.
  Local navigation coverage is now 190/190 docs pages, and `llms.txt` remains
  under the 50,000 character threshold at 47,013 characters.
- Added `llms-coverage.test.ts`, which compares `docs.json` navigation against
  `llms.txt` markdown links so future navigation pages cannot silently fall out
  of the AI-readable index.
- Wired the `llms.txt` coverage guard into `bun run test:agent-docs`.
- Run 2026-05-05 20:06 UTC checks: `bun run test:agent-docs` passed with
  30 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Removed stale follower-change monitoring claims from `introduction.mdx`,
  `skill.md`, and `llms.txt`.
- Extended `event-types.test.ts` so current docs cannot reintroduce follower
  event or follower-change monitoring claims.
- Expanded the 2 short monitor API descriptions so they are more specific and
  SEO-ready.
- Added `seo-metadata.test.ts`, which checks every `docs.json` navigation page
  has title and description frontmatter and keeps descriptions between 50 and
  160 characters.
- Wired the SEO metadata guard into `bun run test:agent-docs`.
- Run 2026-05-05 20:30 UTC checks: `bun run test:agent-docs` passed with
  31 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed.
- Added the missing `x-api-key` headers section to
  `api-reference/radar/list.mdx`.
- Added `api-content-quality.test.ts`, which checks every API endpoint page has
  copy-ready code examples, a headers section, a response section, and a
  successful response tab.
- Wired the API content-quality guard into `bun run test:agent-docs`.
- Run 2026-05-05 20:47 UTC checks: `bun run test:agent-docs` passed with
  32 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Added `DOCS_QUALITY_POLL.md` to `.mintignore` so the internal poll handoff is
  removed from future public docs builds and sitemap output.
- Added `mintignore.test.ts`, which ensures internal docs poll files stay out
  of the public Mintlify build.
- Wired the Mintlify ignore guard into `bun run test:agent-docs`.
- Run 2026-05-05 21:03 UTC checks: `bun run test:agent-docs` passed with
  33 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed.
- Added `navigation-state.test.ts`, which ensures the X API sidebar groups stay
  expanded by default so endpoint pages are visible without extra clicks.
- Wired the navigation default-state guard into `bun run test:agent-docs`.
- Updated the live automation prompt to include navigation usability, the
  navigation default-state guard, and the requirement to keep nested X API
  endpoint groups expanded.
- Run 2026-05-05 21:24 UTC checks: `bun run test:agent-docs` passed with
  34 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Added `api-response-status.test.ts`, which checks every API endpoint page's
  2xx response tabs against OpenAPI success response statuses.
- Wired the success response-status guard into `bun run test:agent-docs`.
- Corrected `openapi.yaml` for `POST /styles` by documenting both `200` cached
  style responses and `201` created or refreshed style responses.
- Updated the live automation prompt to include response status parity, the
  success response-status guard, and small-slice error status parity work.
- Run 2026-05-05 21:45 UTC checks: `bun run test:agent-docs` passed with
  35 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Extended `api-response-status.test.ts` with a fully audited operation set so
  endpoint families can graduate from success-status parity to all-status
  parity after source verification.
- Added the Styles endpoint family to that fully audited response-status set.
- Corrected Styles OpenAPI error status coverage: removed stale `402` responses
  from free cache/list/get/compare/save/delete routes and added Xquik tier
  `429` rate-limit responses where the product route wrappers can return them.
- Updated Styles API pages with `429 Rate Limited` tabs and corrected the
  public rate-limit error code from `rate_limited` to
  `rate_limit_exceeded`.
- Updated the live automation prompt to explain the fully audited operation set
  and to avoid global all-status enforcement until endpoint families are
  source-verified one at a time.
- Run 2026-05-05 22:02 UTC checks: `bun run test:agent-docs` passed with
  36 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Added the Drafts endpoint family to the fully audited response-status set in
  `api-response-status.test.ts`.
- Corrected Drafts OpenAPI error status coverage: removed stale `402`
  responses, added Xquik tier `429` rate-limit responses, and added missing
  `400` responses for malformed draft IDs.
- Updated Drafts API pages with `429 Rate Limited` tabs that document
  `rate_limit_exceeded`, `retryAfter`, and `Retry-After` retry guidance.
- Run 2026-05-05 22:36 UTC checks: `bun run test:agent-docs` passed with
  36 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Added the Webhooks endpoint family to the fully audited response-status set
  in `api-response-status.test.ts`.
- Corrected Webhooks OpenAPI error status coverage: removed stale `402`
  responses, added Xquik tier `429` rate-limit responses, and added missing
  `400` responses for malformed webhook IDs on ID-based routes.
- Updated Webhooks API pages with `429 Rate Limited` tabs and expanded the
  test-webhook `400` tab to include both malformed IDs and inactive webhooks.
- Corrected the webhook creation OpenAPI `secret` example to a 64-character hex
  value and described that it is returned only at creation.
- Run 2026-05-05 22:56 UTC checks: `bun run test:agent-docs` passed with
  36 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Added the Credits endpoint family to the fully audited response-status set in
  `api-response-status.test.ts`.
- Corrected Credits OpenAPI error status coverage: removed stale `402`
  responses and added Xquik tier `429` rate-limit responses.
- Corrected Credits OpenAPI success response schemas for standard top-up,
  quick top-up, and nullable top-up status fields.
- Updated Credits API pages with `429 Rate Limited` tabs and removed the stale
  `402 Payment required` tab from top-up status.
- Run 2026-05-05 23:24 UTC checks: `bun run test:agent-docs` passed with
  36 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Added the Monitors endpoint family to the fully audited response-status set
  in `api-response-status.test.ts`.
- Corrected Monitors OpenAPI error status coverage: removed stale `402`
  responses from free list, get, update, and delete operations; added missing
  `400` malformed-ID responses; added Xquik tier `429` rate-limit responses;
  and removed stale generic `500` entries from monitor creation operations.
- Corrected the account monitor update request-body description in OpenAPI and
  aligned duplicate monitor examples with the current public error message.
- Updated all 10 Monitors API pages with `429 Rate Limited` tabs. The create
  pages now narrow `402` wording to credit failures, and ID pages use the
  source-aligned `invalid_id` message.
- Updated the live automation prompt so future runs treat Monitors as covered
  and prefer Events for the next all-status parity audit.
- Run 2026-05-05 23:56 UTC checks: `bun run test:agent-docs` passed with
  36 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.
- Added the Events endpoint family to the fully audited response-status set in
  `api-response-status.test.ts`.
- Corrected Events OpenAPI error status coverage: removed stale `402`
  responses, added Xquik tier `429` rate-limit responses, and added the
  malformed-ID `400` response for `GET /events/{id}`.
- Corrected Events response schemas for account and keyword event sources:
  `monitorType` is now required, `username` is optional, and keyword events can
  expose `keywordMonitorId` and `query`.
- Updated Events API pages with `429 Rate Limited` tabs, source-aligned
  `invalid_id` messaging, and account versus keyword response-field guidance.
- Updated the live automation prompt so future runs treat Events as covered
  and prefer API Keys for the next all-status parity audit.
- Run 2026-05-06 00:20 UTC checks: `bun run test:agent-docs` passed with
  36 tests passed and 1 skipped; `bunx --bun mint validate` passed;
  `bunx --bun mint broken-links` passed; `git diff --check` passed; no edited
  file contained an em dash or banned spaced double-hyphen sequence.

## Unresolved Risks

- Plain `bunx mint validate` fails in this shell because it uses Node 25.8.2
  and Mintlify rejects non-LTS Node versions. `bunx --bun mint ...` works.
- API parity now covers paths, methods, and `operationId` uniqueness. The next
  run should compare request parameters, request bodies, response status codes,
  pagination fields, and error shapes.
- Radar source names are public API enum values today. If any source name should
  be confidential, the product API contract must change before docs can hide it
  without becoming inaccurate.
- Endpoint strings in prose now have an automated OpenAPI route guard, but the
  guard does not yet verify parameter descriptions, request bodies, response
  fields, pagination semantics, or error shapes.
- Event-type docs now have an automated guard, but the guard only covers event
  tokens, retired follower-event wording, and required mentions in core event
  docs. It does not verify every webhook payload field against product code.
- Required request fields now have an automated guard, but optional fields are
  only partially covered. The next guard should compare optional top-level
  request fields, response fields, and status codes after resolving intentional
  conditional fields and legacy aliases.
- `llms.txt` is now close to the 50,000 character size threshold. Future link
  additions should stay concise or replace older descriptions with shorter
  wording.
- The Mintlify Page Size HTML failure remains unresolved because the report
  points to rendered HTML weight across all sampled pages, while the generated
  markdown alternatives already pass. Recheck after Mintlify reruns the score.
- The SEO metadata guard only verifies title and description presence and
  description length. It does not yet score page intros, heading hierarchy,
  example depth, or search intent coverage.
- The API content-quality guard checks structural coverage only. It does not yet
  compare documented response fields, status codes, or error examples against
  `openapi.yaml` and product source.
- The current deployed docs may continue serving `DOCS_QUALITY_POLL` until the
  next Mintlify deploy completes and the score report reruns.
- Navigation state is now guarded from `docs.json`, but this run intentionally
  skipped browser or localhost visual checks under the static-check-only poll
  rule.
- Success response status parity is now guarded. Error response status parity
  is not yet enforced because the first strict audit found broad drift that
  needs endpoint-by-endpoint product source verification.
- Styles endpoints now have all-status parity guarded. Other endpoint families
  still need source-verified error status audits before they can be added to
  the fully audited set.
- Drafts endpoints now have all-status parity guarded. Remaining endpoint
  families still need source-verified error status audits before they can be
  added to the fully audited set.
- Webhooks endpoints now have all-status parity guarded. Remaining endpoint
  families still need source-verified error status audits before they can be
  added to the fully audited set.
- Credits endpoints now have all-status parity guarded. Remaining endpoint
  families still need source-verified error status audits before they can be
  added to the fully audited set.
- Quick top-up still needs a product follow-up if below-minimum or above-maximum
  amounts should reliably return a public `400` instead of a generic failure.
  This run narrowed the docs' explicit `400` text to route-level validation
  that the current source returns directly.
- Monitors endpoints now have all-status parity guarded. Remaining endpoint
  families still need source-verified error status audits before they can be
  added to the fully audited set.
- Events endpoints now have all-status parity guarded. Remaining endpoint
  families still need source-verified error status audits before they can be
  added to the fully audited set.

## Recommendations For Next Run

1. Run schema-level OpenAPI diff against product routes, including parameters,
   request bodies, response status codes, pagination fields, and error shapes.
2. Use `bunx --bun mint validate` and `bunx --bun mint broken-links` for
   Mintlify checks in this shell. Avoid plain `bunx mint` unless Node is an LTS
   version.
3. Review the highest-value comparison pages first: X API, Hootsuite,
   Typefully, Tweet Hunter, Buffer, Sprout Social, and Postwise. Use official
   competitor pages for any new factual claim.
4. Audit billing, MPP, MCP, Radar, and extraction workflow pages against the
   product source because those pages have the highest correctness risk.
5. Check whether `llms.txt` should be regenerated after any public content edit.
6. Record exact files changed, static checks run, skipped checks, and unresolved
   risks in this file.
7. After updating this file, also update the live automation prompt when the
   recurring workflow itself can be improved.
8. Commit and push successful changes to `main` after checks pass.
9. Extend automated docs guards beyond endpoint strings, event names, and
   required request fields. Prioritize optional top-level request fields,
   response fields, status codes, pagination fields, and webhook payload fields
   against `openapi.yaml` and product source.
10. Check the Mintlify score report at `https://www.mintlify.com/score/xquik`
    and the markdown report at `https://www.mintlify.com/score/xquik.md`.
    Prefer clear fixes that can improve the score without weakening accuracy,
    usefulness, or confidentiality.
11. Prioritize framework guides, comparison pages, API endpoint pages, and
    high-value documentation pages. Confirm framework setup, compared-service
    facts, feature matrices, pricing references, endpoint details, and content
    quality before publishing changes.
12. Keep `llms.txt` aligned with `docs.json` navigation. Run
    `bun run test:agent-docs` after navigation or link-index changes and keep
    `llms.txt` under 50,000 characters.
13. Extend SEO and content-quality automation beyond frontmatter. Prioritize
    checks for first-paragraph quality, heading structure, concrete examples,
    response details, error guidance, and next-step links on API endpoint pages.
14. Extend API content-quality automation from structure to schema parity.
    Prioritize response status coverage, response field coverage, pagination
    field coverage, and error shape checks against `openapi.yaml`.
15. Keep internal handoff, audit, and automation files out of the public docs
    build. Before adding root Markdown support files, either list them in
    `.mintignore` or intentionally add public-facing frontmatter and navigation.
16. Keep the X API sidebar groups expanded by default. If API Reference
    navigation changes, run the navigation default-state guard and verify
    nested group behavior against official Mintlify navigation docs.
17. Continue response-status parity work. Start with error status codes for a
    small endpoint family, verify each against product routes, then decide
    whether to update OpenAPI, endpoint docs, or both before expanding the
    guard beyond 2xx statuses.
18. Pick the next endpoint family for all-status parity after Styles, Drafts,
    Webhooks, Credits, Monitors, and Events. API Keys are the next best
    candidate because they have a compact route surface and protect the auth
    onboarding path.

## Prompt For Next Run

You are the Xquik docs quality poll. Work in `/Users/burak/Developer/xquik-docs`
and use `/Users/burak/Developer/xquik` as the product truth source. Your job is
to make `docs.xquik.com` accurate, complete, persuasive, SEO strong, and easy
to trust.

First, pull latest changes and inspect `git status`. Read
`DOCS_QUALITY_POLL.md`, `docs.json`, `openapi.yaml`, and the highest-risk docs
from the recommendations above. Preserve unrelated user changes. Remember that
`bun run test:agent-docs` now includes prose endpoint-string, event-type,
required request-field, success response-status, `llms.txt` coverage, SEO
metadata, API content-quality, navigation default-state, and Mintlify ignore
guards; treat failures as docs accuracy, navigation usability, or quality
issues unless a guard itself is plainly wrong.

Also review the Mintlify score report at `https://www.mintlify.com/score/xquik`
and the markdown version at `https://www.mintlify.com/score/xquik.md`. Try to
improve the score on every run when the report suggests a clear, factual, safe
docs improvement. Do not chase score changes that would make the docs less
accurate, less useful, or less confidential.

Treat framework guides, comparison pages, all API endpoint pages, and high-value
documentation pages as recurring priorities. For framework guides, verify setup
commands, package names, runtime assumptions, authentication patterns, examples,
and supported feature claims against current Xquik SDKs and product behavior.
For comparison pages, verify the compared services, feature rows, pricing
references, and data claims against official or clearly reliable sources before
strengthening Xquik positioning. For every API endpoint page and docs page you
touch, make sure the page is SEO compatible and has quality content: clear
title, useful description, search-intent aligned intro, prerequisites, examples,
response details, error guidance, and a logical next step.

Run one focused improvement loop per poll:

1. Verify something important against source truth. Prefer schema-level OpenAPI
   parity, billing, MPP, MCP, Radar, extraction workflow, webhooks, SDKs, auth,
   dashboard flows, tool capabilities, or high-value comparison pages. If you
   touch endpoint prose, use the endpoint-string guard to catch placeholder and
   route drift. If you touch monitoring or webhook docs, compare event types
   and payload wording against OpenAPI plus product event source files. If you
   touch API request docs or OpenAPI request bodies, run the required-field
   guard and verify any conditional fields or legacy aliases against product
   routes before changing public docs. If you touch response statuses, run the
   success response-status guard and verify route behavior against product
   source before changing OpenAPI or endpoint docs. Expand full status parity
   only by adding source-verified endpoint families to the fully audited
   operation set in `api-response-status.test.ts`; Styles, Drafts, Webhooks,
   Credits, Monitors, and Events are already covered, so prefer API Keys next.
   If you touch `docs.json`, `llms.txt`, or navigation, run the `llms.txt`
   coverage and navigation default-state guards, keep the file below the
   50,000 character score threshold, and keep nested X API endpoint groups
   expanded by default. If you touch page metadata, run the SEO metadata guard and keep
   descriptions useful, specific, and search-preview friendly. If you touch API endpoint
   pages, run the API content-quality guard and preserve copy-ready code
   examples, headers, response documentation, and a successful response tab. If
   you add root Markdown support files, update `.mintignore` unless they are
   intentionally public docs pages.
2. Improve docs directly when the fix is clear. Make content more correct,
   useful, detailed, persuasive, or SEO aligned. Keep claims factual and
   specific.
3. Improve the poll itself. Update `DOCS_QUALITY_POLL.md` with findings,
   completed changes, recommendations, unresolved risks, skipped checks, and a
   sharper prompt. If the live automation prompt should change too, update it
   with `automation_update`.

Use official Mintlify docs for config changes and official competitor sources
for new comparison-page factual claims. Do not publish private implementation
details, internal vendor names, internal cost units, or unsupported competitor
claims. Use generic public service wording where needed.

Run static docs checks only. Prefer `bun run test:agent-docs`,
`bunx --bun mint validate`, and `bunx --bun mint broken-links` in this shell.
Do not start a local dev server, Browser Use, Playwright, or localhost visual
checks unless explicitly requested.

Before finishing, commit and push successful changes to `main` after checks
pass. If checks fail, fix the failure and rerun. Leave a clear handoff in
`DOCS_QUALITY_POLL.md` for any blocker that cannot be resolved in the run.
