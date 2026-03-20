# Xquik Docs: MPP Integration & Audit

## Goal

Comprehensive xquik-docs audit and update:
1. Add Machine Payments Protocol (MPP) documentation — anonymous pay-per-use access to 7 X-API read-only endpoints via Tempo (USDC)
2. Fix stale content — automation test endpoint marked "not yet implemented" but is live
3. Fix missing content — authentication table missing endpoint groups (x-accounts, x-write, support)
4. Fix discrepancies — score step algorithm check count mismatch
5. Update llms.txt with MPP information

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| MPP page structure | Dedicated section (2 pages) under Guides tab | Significant enough for its own section, not big enough for a tab. Matches MCP/OAuth pattern. |
| Navigation placement | New "MPP" group in Guides tab, between OAuth and Resources | Groups payment alternatives near auth-related docs. |
| Endpoint page updates | `<Info>` callout on each eligible endpoint | Minimal, discoverable, non-intrusive. |
| Code examples in MPP quickstart | TypeScript only (mppx SDK) | MPP SDK is TypeScript-first. cURL examples in overview for raw HTTP flow. |
| Bot endpoints | Not documented | Internal infrastructure, not public API. |
| Sensitive terms | Never mention twitterapi.io, microcents, $10 usage cap | Confidentiality requirement. |

## Scope

### New files (2)

#### `mpp/overview.mdx`

Frontmatter: title "Machine Payments Protocol", description about anonymous pay-per-use X data access.

Content sections:
1. **What is MPP** - Open standard for machine-to-machine payments via HTTP 402. Link to mpp.dev.
2. **How it works with Xquik** - 7 X-API read-only endpoints accept MPP payments instead of API key auth. No account, no subscription, pay per call.
3. **Payment method** - Tempo (USDC stablecoin). Near-zero transaction fees for micropayments.
4. **Payment intents** - `charge` (fixed per-call cost, single settlement) and `session` (pay per result returned, deposits + vouchers).
5. **Protocol flow** - Text diagram: Request -> 402 + WWW-Authenticate challenge -> Client pays via Tempo -> Retry with Authorization: Payment credential -> 200 + Payment-Receipt header.
6. **Eligible endpoints** - Table with 7 routes, method, price, intent type.
7. **MPP vs Subscription** - Comparison table: MPP = anonymous, read-only, per-call; Subscription = full access, writes, monitors, extractions, automations, $20/month.
8. **Next steps** - CardGroup linking to MPP quickstart, authentication docs, billing docs.

#### `mpp/quickstart.mdx`

Frontmatter: title "MPP quickstart", description about making first pay-per-use API call.

Content sections:
1. **Install the SDK** - `npm i mppx` with version note.
2. **Configure a Tempo wallet** - Set up a funded Tempo USDC wallet. Brief guidance.
3. **Single charge example** - TypeScript code: create mppx client with tempo method, fetch a tweet. SDK handles 402/credential flow automatically.
4. **Session example** - TypeScript code: search tweets with per-result pricing. Show how session deposits work.
5. **Raw HTTP flow** - cURL example showing manual 402 challenge -> credential -> receipt exchange for developers not using the SDK.
6. **Next steps** - CardGroup linking to eligible endpoint pages, MPP overview, mpp.dev docs.

### Modified files (14)

#### `docs.json`

Add MPP group to Guides tab navigation between OAuth and Resources:

```json
{
  "group": "MPP",
  "icon": "credit-card",
  "pages": [
    "mpp/overview",
    "mpp/quickstart"
  ]
}
```

#### `introduction.mdx`

1. Add MPP card to "What you can do" CardGroup:
   - Title: "Pay-Per-Use API"
   - Icon: "credit-card"
   - Text: Anonymous access to X data endpoints via the Machine Payments Protocol. Pay per call with Tempo (USDC), no account needed.

2. Add MPP as 5th Step in "For developers" section:
   - Title: "Machine Payments Protocol"
   - Text: Pay per API call without subscribing. 7 X-API read-only endpoints accept MPP payments via Tempo (USDC). See the MPP overview for eligible endpoints and pricing.

#### `api-reference/overview.mdx`

Add MPP subsection under Authentication:
- Brief: "7 X-API read-only endpoints also accept anonymous MPP payments. The server returns a 402 challenge; your client pays via Tempo and retries with a payment credential. No API key needed."
- Link to `/mpp/overview` for details.

#### `api-reference/authentication.mdx`

Add "Machine Payments Protocol" section documenting:
- HTTP 402 `WWW-Authenticate: Payment` challenge header with parameters (id, realm, method, intent, request)
- `Authorization: Payment` credential header (base64url-encoded JSON with challenge echo + payload)
- `Payment-Receipt` response header on success
- Note: only applies to 7 MPP-eligible endpoints, link to list.

#### `guides/billing.mdx`

Add "Pay-per-use (MPP)" section after "Extra Usage":
- No subscription required. Pay per call via Tempo (USDC).
- Eligible endpoints table (same 7 routes with prices).
- Clearly label this as "MPP per-call pricing" to distinguish from the subscription "Per-Operation Costs" table above it. Note: MPP prices are lower than subscription metered costs because MPP has no included monthly allowance — you pay for every call. Subscription metered costs apply only after the included allowance is consumed.
- Link to MPP overview and quickstart.

#### 7 X-API endpoint pages

Add `<Info>` callout to each:

- `api-reference/x/get-tweet.mdx`: "This endpoint accepts MPP payments ($0.0003 per call). No subscription needed. See MPP overview."
- `api-reference/x/search-tweets.mdx`: "This endpoint accepts MPP payments ($0.0003 per tweet returned). No subscription needed. See MPP overview."
- `api-reference/x/get-user.mdx`: "This endpoint accepts MPP payments ($0.00036 per call). No subscription needed. See MPP overview."
- `api-reference/x/check-follower.mdx`: "This endpoint accepts MPP payments ($0.002 per call). No subscription needed. See MPP overview."
- `api-reference/x/get-article.mdx`: "This endpoint accepts MPP payments ($0.002 per call). No subscription needed. See MPP overview."
- `api-reference/x/download-media.mdx`: "This endpoint accepts MPP payments ($0.0003 per media item). No subscription needed. See MPP overview."
- `api-reference/trends/list.mdx`: "This endpoint accepts MPP payments ($0.0009 per call). No subscription needed. See MPP overview."

Additionally, update the 402 response tab on each of these 7 endpoint pages to distinguish between subscription 402 (`{ "error": "no_subscription" }`) and MPP 402 (payment challenge with `WWW-Authenticate: Payment` header). Add a note: "For MPP requests, 402 returns a payment challenge instead. See [MPP overview](/mpp/overview)."

#### `llms.txt`

Add MPP section after Authentication covering:
- What MPP is, eligible endpoints, pricing table, auth flow summary.

#### `mcp/tools.mdx`

Fix score step: reconcile "11 algorithm checks" claim with example showing `totalChecks: 8`. Update to match actual API behavior.

#### `api-reference/automations/test.mdx`

The automation test endpoint IS implemented (see `app/api/v1/automations/[id]/test/route.ts`). The docs page still says "not yet implemented" with a Warning callout and returns `{ "status": "not_implemented" }`. Update to:
- Remove the "not yet implemented" Warning
- Document actual behavior: triggers a test run of the flow with synthetic trigger data
- Document the real response: `{ "status": "ok", "result": "completed"|"failed", "runId": "..." }`
- Document rate limit: 5 test runs per minute per user
- Document error: 400 if flow has no steps

#### `api-reference/authentication.mdx`

Additional fix: the auth methods table is missing several endpoint groups:
- `* /x-accounts/*` (API key + session)
- `* /x-write/*` (API key + session)
- `* /support/*` (API key + session)

Add these rows to the existing table.

### Out of scope

- Bot endpoints (internal)
- Custom CSS, logos, favicon
- OpenAPI spec (served dynamically)

## Confidentiality rules

All content must:
- Never mention "twitterapi.io" or any third-party API source
- Never use the term "microcents"
- Never reference "$10 usage cap" or internal pricing mechanics
- MPP per-call prices are public (derived from `lib/mpp/pricing.ts`) and safe to document

## Writing standards

- Second-person voice, active voice, sentence case headings
- No marketing language, no filler phrases
- Mintlify components: `<CodeGroup>`, `<Tabs>`, `<Steps>`, `<Info>`, `<Warning>`, `<CardGroup>`
- Root-relative internal links without file extensions
- Every MDX file: `title`, `description`, `keywords` frontmatter
- Code blocks with language tags
- Match existing voice/style of surrounding pages
