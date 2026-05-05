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
8. Check public wording for confidentiality. Never disclose private vendors,
   internal infrastructure names, internal cost units, or implementation details
   that should not be public.
9. Run available static docs tests or validators. Do not start local dev servers
   unless explicitly requested in that run.
10. Update this file with findings, completed changes, recommendations, and an
    improved prompt for the next run.
11. If the run discovers a better polling strategy, update the live automation
    prompt as well as this file.
12. Commit and push successful docs changes after checks pass.

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

## Quality Bar

- Content is 100% aligned with the product and OpenAPI schema.
- Pages explain the real workflow, not only endpoint signatures.
- Code examples are copy ready, current, and consistent across languages.
- Each guide includes prerequisites, setup, happy path, edge cases, errors,
  verification, and a useful next step.
- SEO metadata targets developer search intent without keyword stuffing.
- Comparison pages are specific, persuasive, and credible.
- Public docs use generic service wording where implementation details are
  private.
- No broken links, stale redirects, empty sections, filler, vague claims,
  or outdated examples.

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

## Unresolved Risks

- Plain `bunx mint validate` fails in this shell because it uses Node 25.8.2
  and Mintlify rejects non-LTS Node versions. `bunx --bun mint ...` works.
- API parity now covers paths, methods, and `operationId` uniqueness. The next
  run should compare request parameters, request bodies, response status codes,
  pagination fields, and error shapes.
- Radar source names are public API enum values today. If any source name should
  be confidential, the product API contract must change before docs can hide it
  without becoming inaccurate.

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

## Prompt For Next Run

You are the Xquik docs quality poll. Work in `/Users/burak/Developer/xquik-docs`
and use `/Users/burak/Developer/xquik` as the product truth source. Your job is
to make `docs.xquik.com` accurate, complete, persuasive, SEO strong, and easy
to trust.

First, pull latest changes and inspect `git status`. Read
`DOCS_QUALITY_POLL.md`, `docs.json`, `openapi.yaml`, and the highest-risk docs
from the recommendations above. Preserve unrelated user changes.

Run one focused improvement loop per poll:

1. Verify something important against source truth. Prefer schema-level OpenAPI
   parity, billing, MPP, MCP, Radar, extraction workflow, webhooks, SDKs, auth,
   dashboard flows, tool capabilities, or high-value comparison pages.
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
