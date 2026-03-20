# Xquik Docs MPP & Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MPP documentation and fix stale/missing content across xquik-docs.

**Architecture:** 2 new MDX pages for MPP (overview + quickstart), updates to 14 existing files. All changes are documentation-only (MDX, JSON, TXT). No code, no tests.

**Tech Stack:** Mintlify docs (MDX), docs.json config

**Spec:** `docs/superpowers/specs/2026-03-20-xquik-docs-mpp-audit-design.md`

**Confidentiality:** NEVER mention twitterapi.io, microcents, $10 usage cap, or third-party API sources in any file or commit message.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `mpp/overview.mdx` | MPP concept, protocol flow, eligible endpoints, pricing, comparison |
| Create | `mpp/quickstart.mdx` | SDK install, charge/session examples, raw HTTP flow |
| Modify | `docs.json` | Add MPP nav group |
| Modify | `introduction.mdx` | Add MPP card + developer step |
| Modify | `api-reference/overview.mdx` | Add MPP auth mention |
| Modify | `api-reference/authentication.mdx` | Add MPP section + fix missing table rows |
| Modify | `guides/billing.mdx` | Add MPP pricing section |
| Modify | `api-reference/x/get-tweet.mdx` | MPP info callout + 402 tab note |
| Modify | `api-reference/x/search-tweets.mdx` | MPP info callout + 402 tab note |
| Modify | `api-reference/x/get-user.mdx` | MPP info callout + 402 tab note |
| Modify | `api-reference/x/check-follower.mdx` | MPP info callout + 402 tab note |
| Modify | `api-reference/x/get-article.mdx` | MPP info callout + 402 tab note |
| Modify | `api-reference/x/download-media.mdx` | MPP info callout + 402 tab note |
| Modify | `api-reference/trends/list.mdx` | MPP info callout + 402 tab note |
| Modify | `api-reference/automations/test.mdx` | Fix stale "not implemented" content |
| Modify | `mcp/tools.mdx` | Fix score step check count |
| Modify | `llms.txt` | Add MPP section |

---

### Task 1: Create `mpp/overview.mdx`

**Files:**
- Create: `mpp/overview.mdx`

- [ ] **Step 1: Create the MPP overview page**

```mdx
---
title: "Machine Payments Protocol"
description: "Anonymous pay-per-use access to X data endpoints via HTTP 402 and Tempo (USDC)"
keywords: ["MPP", "Machine Payments Protocol", "pay-per-use", "HTTP 402", "Tempo", "USDC", "anonymous"]
---

The [Machine Payments Protocol](https://mpp.dev) (MPP) is an open standard for machine-to-machine payments over HTTP. Xquik implements MPP on 7 X-API read-only endpoints, allowing you to pay per call without creating an account or subscribing.

## How it works

MPP uses HTTP 402 (Payment Required) as a payment challenge. When you call an eligible endpoint without a subscription or API key, the server returns a 402 with payment instructions. Your client pays via Tempo (USDC), then retries the request with a payment credential.

```text
Client                              Xquik
  │                                   │
  │  1. GET /api/v1/x/tweets/123      │
  │──────────────────────────────────▶│
  │                                   │
  │  2. 402 Payment Required          │
  │     WWW-Authenticate: Payment     │
  │     (challenge with amount, etc.) │
  │◀──────────────────────────────────│
  │                                   │
  │  3. Pay via Tempo (USDC)          │
  │           (off-chain)             │
  │                                   │
  │  4. Retry with credential         │
  │     Authorization: Payment ...    │
  │──────────────────────────────────▶│
  │                                   │
  │  5. 200 OK + Payment-Receipt      │
  │◀──────────────────────────────────│
```

No account, no API key, no subscription. The payment itself is your authentication.

## Payment method

MPP payments on Xquik use **Tempo** with USDC (a dollar-pegged stablecoin). Tempo provides near-zero transaction fees, making micropayments practical for per-call pricing.

You need a funded Tempo USDC wallet. See the [MPP quickstart](/mpp/quickstart) for setup instructions.

## Payment intents

Xquik uses 2 payment intents depending on the endpoint:

| Intent | How it works | Used by |
|--------|-------------|---------|
| `charge` | Fixed cost per call. Single on-chain settlement. | Tweet lookup, user lookup, follower check, article extraction, trends |
| `session` | Pay per result returned. Client deposits funds, sends off-chain vouchers per item. | Tweet search, media download |

With `charge`, you pay a flat amount per request. With `session`, you pay proportional to the number of results (tweets found, media items downloaded).

## Eligible endpoints

| Endpoint | Method | Price | Intent |
|----------|--------|-------|--------|
| `/api/v1/x/tweets/{id}` | GET | $0.0003 per call | charge |
| `/api/v1/x/tweets/search` | GET | $0.0003 per tweet | session |
| `/api/v1/x/users/{id}` | GET | $0.00036 per call | charge |
| `/api/v1/x/followers/check` | GET | $0.002 per call | charge |
| `/api/v1/x/articles/{tweetId}` | GET | $0.002 per call | charge |
| `/api/v1/x/media/download` | POST | $0.0003 per media item | session |
| `/api/v1/trends` | GET | $0.0009 per call | charge |

All other endpoints (monitors, webhooks, extractions, draws, automations, write actions, etc.) require a [subscription](/guides/billing).

## MPP vs subscription

| | MPP (pay-per-use) | Subscription ($20/month) |
|---|---|---|
| **Account required** | No | Yes |
| **API key required** | No | Yes |
| **Payment** | Per call via Tempo (USDC) | Monthly credit/debit card |
| **Available endpoints** | 7 X-API read-only | All 97 endpoints |
| **Write actions** | Not available | Post tweets, like, retweet, follow, DM, profile updates |
| **Monitors & webhooks** | Not available | Real-time account monitoring |
| **Extractions & draws** | Not available | Bulk data extraction, giveaway draws |
| **Automations** | Not available | Flow automation builder |
| **Best for** | AI agents, one-off lookups, low-volume reads | Full platform access, production integrations |

## Next steps

<CardGroup cols={3}>
  <Card title="MPP quickstart" icon="rocket" href="/mpp/quickstart">
    Make your first pay-per-use API call.
  </Card>
  <Card title="Authentication" icon="key" href="/api-reference/authentication">
    All authentication methods including MPP headers.
  </Card>
  <Card title="Billing & usage" icon="credit-card" href="/guides/billing">
    Subscription pricing and MPP per-call costs.
  </Card>
</CardGroup>
```

- [ ] **Step 2: Verify the file renders correctly**

Run: `ls mpp/overview.mdx` to confirm creation.
Check frontmatter has title, description, keywords.

- [ ] **Step 3: Commit**

```bash
git add mpp/overview.mdx
git commit -m "docs(mpp): add MPP overview page"
```

---

### Task 2: Create `mpp/quickstart.mdx`

**Files:**
- Create: `mpp/quickstart.mdx`

- [ ] **Step 1: Create the MPP quickstart page**

```mdx
---
title: "MPP quickstart"
description: "Make your first pay-per-use API call with the Machine Payments Protocol"
keywords: ["MPP", "quickstart", "mppx", "Tempo", "USDC", "pay-per-use", "SDK"]
---

Call Xquik endpoints without an account or subscription. Pay per request with Tempo (USDC) using the `mppx` SDK.

## 1. Install the SDK

```bash
npm i mppx
```

The `mppx` package provides both client and server utilities. You only need the client.

## 2. Set up a Tempo wallet

You need a Tempo wallet funded with USDC. Create one at [tempo.xyz](https://tempo.xyz) and note your private key.

<Warning>
  Store your private key securely. Never commit it to version control. Use environment variables.
</Warning>

## 3. Make a charge request

Look up a single tweet. The SDK intercepts 402 responses, pays via Tempo, and retries automatically.

```typescript
import { Mppx, tempo } from "mppx/client";
import { privateKeyToAccount } from "viem/accounts";

// Configure the MPP client — this patches global fetch
// to automatically handle 402 Payment Required challenges
Mppx.create({
  methods: [
    tempo({
      account: privateKeyToAccount(process.env.TEMPO_PRIVATE_KEY as `0x${string}`),
    }),
  ],
});

// Now any fetch to an MPP-enabled endpoint auto-pays
const response = await fetch(
  "https://xquik.com/api/v1/x/tweets/1893456789012345678"
);
const data = await response.json();
console.log(data.tweet.text);
```

`Mppx.create()` patches the global `fetch` function. When a request returns 402 with a `WWW-Authenticate: Payment` header, the SDK pays the requested amount ($0.0003) and retransmits the request with an `Authorization: Payment` credential. The response includes a `Payment-Receipt` header confirming settlement.

## 4. Make a session request

Search tweets with per-result pricing. You pay $0.0003 per tweet returned.

```typescript
// Global fetch is already patched by Mppx.create() above
const response = await fetch(
  "https://xquik.com/api/v1/x/tweets/search?q=TypeScript&limit=20"
);
const data = await response.json();
console.log(`Found ${data.tweets.length} tweets`);
// Cost: $0.0003 × number of tweets returned
```

Session payments deposit funds upfront and deduct per result. The SDK manages the deposit and voucher exchange automatically.

<Note>
  The implementer should verify the exact `mppx` client API at [mpp.dev/sdk/typescript](https://mpp.dev/sdk/typescript) before publishing. The SDK may use a wrapper function instead of global fetch patching.
</Note>

## 5. Raw HTTP flow (without SDK)

If you are not using the `mppx` SDK, you can implement the protocol manually.

**Step 1: Request the endpoint**

```bash
curl -i https://xquik.com/api/v1/x/tweets/1893456789012345678
```

**Step 2: Receive the 402 challenge**

```text
HTTP/2 402
WWW-Authenticate: Payment id="abc...", realm="xquik.com", method="tempo", intent="charge", request="eyJhbW91bnQiOi..."
```

The `request` parameter is a base64url-encoded JSON object containing the amount, currency, and recipient address.

**Step 3: Pay and retry**

After completing the Tempo payment, retry the request with the payment credential:

```bash
curl -i https://xquik.com/api/v1/x/tweets/1893456789012345678 \
  -H "Authorization: Payment eyJjaGFsbGVuZ2UiOnsi..."
```

The `Authorization: Payment` value is a base64url-encoded JSON object containing the original challenge and your payment proof.

**Step 4: Receive the response + receipt**

```text
HTTP/2 200
Payment-Receipt: eyJzdGF0dXMiOiJzdWNjZXNzIiwi...
Content-Type: application/json

{"tweet": {"id": "1893456789012345678", "text": "..."}}
```

The `Payment-Receipt` header confirms the payment was settled.

## Next steps

<CardGroup cols={3}>
  <Card title="MPP overview" icon="book" href="/mpp/overview">
    Eligible endpoints, pricing, and protocol details.
  </Card>
  <Card title="Get Tweet" icon="message-circle" href="/api-reference/x/get-tweet">
    Full endpoint reference for tweet lookups.
  </Card>
  <Card title="Search Tweets" icon="search" href="/api-reference/x/search-tweets">
    Full endpoint reference for tweet search.
  </Card>
</CardGroup>
```

- [ ] **Step 2: Commit**

```bash
git add mpp/quickstart.mdx
git commit -m "docs(mpp): add MPP quickstart page"
```

---

### Task 3: Add MPP to navigation and introduction

**Files:**
- Modify: `docs.json:324-338` (Guides tab, between OAuth and Resources groups)
- Modify: `introduction.mdx:11-45` (CardGroup) and `introduction.mdx:49-64` (Steps)

- [ ] **Step 1: Add MPP group to docs.json**

In `docs.json`, insert the MPP group between the OAuth group and the Resources group in the Guides tab navigation:

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

- [ ] **Step 2: Add MPP card to introduction.mdx CardGroup**

After the existing "Flow Automations" card (around line 43), add:

```mdx
  <Card title="Pay-Per-Use API" icon="credit-card">
    Anonymous access to X data endpoints via the Machine Payments Protocol. Pay per call with Tempo (USDC), no account needed.
  </Card>
```

- [ ] **Step 3: Add MPP step to introduction.mdx "For developers" section**

After the "AI Agent Skill" Step (around line 62), add a 5th Step:

```mdx
  <Step title="Machine Payments Protocol">
    Pay per API call without subscribing. 7 X-API read-only endpoints accept MPP payments via Tempo (USDC). See the [MPP overview](/mpp/overview) for eligible endpoints and pricing.
  </Step>
```

Also update the count text "Xquik provides 4 integration methods:" to "Xquik provides 5 integration methods:".

- [ ] **Step 4: Add MPP quickstart card to the quickstart.mdx "Next Steps" CardGroup**

In `quickstart.mdx`, add to the existing "Next Steps" CardGroup:

```mdx
  <Card title="Pay-Per-Use (MPP)" icon="credit-card" href="/mpp/overview">
    Access endpoints without subscribing via MPP.
  </Card>
```

- [ ] **Step 5: Commit**

```bash
git add docs.json introduction.mdx quickstart.mdx
git commit -m "docs(mpp): add MPP to navigation and introduction"
```

---

### Task 4: Add MPP to authentication and API overview pages

**Files:**
- Modify: `api-reference/authentication.mdx:96-108` (after table and before Key Management)
- Modify: `api-reference/overview.mdx:27-36` (Authentication section)

- [ ] **Step 1: Add missing rows to auth table in authentication.mdx**

Add these rows to the auth methods table (after `* /automations/*` row, around line 100):

```mdx
| `* /x-accounts/*` | Yes | Yes |
| `* /x-write/*` | Yes | Yes |
| `* /support/*` | Yes | Yes |
```

- [ ] **Step 2: Add MPP section to authentication.mdx**

After the existing OAuth `<Info>` callout (around line 108), add:

```mdx
## Machine Payments Protocol

7 X-API read-only endpoints also accept [MPP](/mpp/overview) payments instead of API key authentication. When you call an eligible endpoint without an API key or session cookie, the server returns a 402 payment challenge.

### Challenge header

```text
WWW-Authenticate: Payment id="...", realm="xquik.com", method="tempo", intent="charge", request="..."
```

| Parameter | Description |
|-----------|-------------|
| `id` | Unique challenge identifier |
| `realm` | Protection space (`xquik.com`) |
| `method` | Payment method (`tempo`) |
| `intent` | Payment intent (`charge` or `session`) |
| `request` | Base64url-encoded JSON with amount, currency, and recipient |

### Credential header

After completing the payment, retry the request with a payment credential:

```text
Authorization: Payment <base64url-encoded JSON>
```

The credential contains the original challenge parameters and a method-specific payload proving payment.

### Receipt header

Successful responses include a receipt:

```text
Payment-Receipt: <base64url-encoded JSON>
```

The receipt confirms the payment was settled and includes a reference ID and timestamp.

### Eligible endpoints

See the [MPP overview](/mpp/overview#eligible-endpoints) for the full list of 7 endpoints, pricing, and intent types.

<Info>
  MPP only applies to X-API read-only endpoints. All other endpoints require an API key or session cookie.
</Info>
```

- [ ] **Step 3: Add MPP mention to api-reference/overview.mdx**

After the existing Authentication section (around line 36), add:

```mdx
### Machine Payments Protocol

7 X-API read-only endpoints also accept anonymous [MPP](/mpp/overview) payments. The server returns a 402 challenge; your client pays via Tempo (USDC) and retries with a payment credential. No API key needed. See the [MPP overview](/mpp/overview) for eligible endpoints and pricing.
```

- [ ] **Step 4: Commit**

```bash
git add api-reference/authentication.mdx api-reference/overview.mdx
git commit -m "docs(mpp): add MPP auth section and fix missing table rows"
```

---

### Task 5: Add MPP section to billing page

**Files:**
- Modify: `guides/billing.mdx:83-113` (after the Extra Usage Tip, before Checking Usage)

- [ ] **Step 1: Add MPP pay-per-use section**

After the Extra Usage `<Tip>` callout (around line 83), insert:

```mdx
## Pay-per-use (MPP)

7 X-API read-only endpoints accept [Machine Payments Protocol](/mpp/overview) payments. No subscription required — pay per call with Tempo (USDC).

### MPP per-call pricing

| Endpoint | Price | Intent |
|----------|-------|--------|
| `GET /x/tweets/{id}` | $0.0003 per call | charge |
| `GET /x/tweets/search` | $0.0003 per tweet | session |
| `GET /x/users/{id}` | $0.00036 per call | charge |
| `GET /x/followers/check` | $0.002 per call | charge |
| `GET /x/articles/{tweetId}` | $0.002 per call | charge |
| `POST /x/media/download` | $0.0003 per media item | session |
| `GET /trends` | $0.0009 per call | charge |

<Note>
  MPP per-call prices differ from the subscription per-operation costs listed above. With a subscription, you get a monthly allowance included in the base price — metered costs only apply after that allowance is consumed. With MPP, every call is billed individually with no monthly commitment.
</Note>

<CardGroup cols={2}>
  <Card title="MPP Overview" icon="book" href="/mpp/overview">
    Protocol details, eligible endpoints, and comparison with subscriptions.
  </Card>
  <Card title="MPP Quickstart" icon="rocket" href="/mpp/quickstart">
    Make your first pay-per-use API call.
  </Card>
</CardGroup>
```

- [ ] **Step 2: Commit**

```bash
git add guides/billing.mdx
git commit -m "docs(mpp): add pay-per-use pricing section to billing page"
```

---

### Task 6: Add MPP callouts + 402 tab notes to 7 endpoint pages

**Files:**
- Modify: `api-reference/x/get-tweet.mdx`
- Modify: `api-reference/x/search-tweets.mdx`
- Modify: `api-reference/x/get-user.mdx`
- Modify: `api-reference/x/check-follower.mdx`
- Modify: `api-reference/x/get-article.mdx`
- Modify: `api-reference/x/download-media.mdx`
- Modify: `api-reference/trends/list.mdx`

- [ ] **Step 1: Add MPP `<Info>` callout to each endpoint page**

Add right after the frontmatter (before the CodeGroup) on each page. Use the exact text per endpoint:

**`get-tweet.mdx`:**
```mdx
<Info>
  This endpoint accepts [MPP](/mpp/overview) payments ($0.0003 per call). No subscription needed.
</Info>
```

**`search-tweets.mdx`:**
```mdx
<Info>
  This endpoint accepts [MPP](/mpp/overview) payments ($0.0003 per tweet returned). No subscription needed.
</Info>
```

**`get-user.mdx`:**
```mdx
<Info>
  This endpoint accepts [MPP](/mpp/overview) payments ($0.00036 per call). No subscription needed.
</Info>
```

**`check-follower.mdx`:**
```mdx
<Info>
  This endpoint accepts [MPP](/mpp/overview) payments ($0.002 per call). No subscription needed.
</Info>
```

**`get-article.mdx`:**
```mdx
<Info>
  This endpoint accepts [MPP](/mpp/overview) payments ($0.002 per call). No subscription needed.
</Info>
```

**`download-media.mdx`:**
```mdx
<Info>
  This endpoint accepts [MPP](/mpp/overview) payments ($0.0003 per media item). No subscription needed.
</Info>
```

**`trends/list.mdx`:**
```mdx
<Info>
  This endpoint accepts [MPP](/mpp/overview) payments ($0.0009 per call). No subscription needed.
</Info>
```

- [ ] **Step 2: Update the 402 tab on each endpoint page**

Each of these 7 pages has a 402 tab like:

```mdx
  <Tab title="402 Subscription required">
    ```json
    { "error": "no_subscription" }
    ```
    No active subscription or usage limit reached. Possible error values: `no_subscription`, `subscription_inactive`, `usage_limit_reached`.
  </Tab>
```

Add a note at the end of each 402 tab body:

```mdx
    For [MPP](/mpp/overview) requests without a valid payment credential, 402 returns a `WWW-Authenticate: Payment` challenge header instead.
```

- [ ] **Step 3: Commit**

```bash
git add api-reference/x/get-tweet.mdx api-reference/x/search-tweets.mdx api-reference/x/get-user.mdx api-reference/x/check-follower.mdx api-reference/x/get-article.mdx api-reference/x/download-media.mdx api-reference/trends/list.mdx
git commit -m "docs(mpp): add MPP callouts and 402 tab notes to eligible endpoints"
```

---

### Task 7: Fix automation test endpoint docs

**Files:**
- Modify: `api-reference/automations/test.mdx`

- [ ] **Step 1: Rewrite the automation test page**

Replace the entire content of `api-reference/automations/test.mdx` with the actual implemented behavior. The endpoint IS live — it triggers a test run with synthetic trigger data and returns a run ID.

Key changes:
- Remove the "not yet implemented" `<Warning>` callout
- Update description frontmatter to remove "(not yet implemented)"
- Update the Response 200 tab to show actual response: `{ "status": "ok", "result": "completed"|"failed", "runId": "42" }`
- Add optional `error` field in response (present when `result` is `"failed"`)
- Add 400 tab for "Flow has no steps" error
- Add 429 tab for rate limit (5 test runs per minute per user)
- Keep existing 401 and 404 tabs

- [ ] **Step 2: Commit**

```bash
git add api-reference/automations/test.mdx
git commit -m "fix(docs): update automation test endpoint - now implemented"
```

---

### Task 8: Fix score step count in MCP tools page

**Files:**
- Modify: `mcp/tools.mdx:109-110`

- [ ] **Step 1: Fix the score step description**

In `mcp/tools.mdx`, the compose workflow example (around line 109) says:

```
// The score step runs 11 algorithm checks. The draft must pass
// all 11 before presenting to the user with an intent URL.
```

The example response on `guides/workflows.mdx:717-728` shows `totalChecks: 8`. Update the comment to remove the specific number and make it generic:

```
// The score step runs algorithm checks. The draft must pass
// all checks before presenting to the user.
```

This avoids hardcoding a number that may change and conflicts with existing examples.

- [ ] **Step 2: Commit**

```bash
git add mcp/tools.mdx
git commit -m "fix(docs): remove hardcoded algorithm check count from MCP tools"
```

---

### Task 9: Update llms.txt with MPP section

**Files:**
- Modify: `llms.txt` (after the Authentication section, around line 12)

- [ ] **Step 1: Add MPP section to llms.txt**

After the Authentication section, add:

```text
## Machine Payments Protocol (MPP)

7 X-API read-only endpoints accept anonymous MPP payments via Tempo (USDC). No account or API key required.

Protocol flow: Client requests endpoint → Server returns 402 with `WWW-Authenticate: Payment` challenge → Client pays via Tempo → Client retries with `Authorization: Payment` credential → Server returns 200 with `Payment-Receipt` header.

Payment intents:
- `charge`: Fixed cost per call (tweet lookup, user lookup, follower check, article, trends)
- `session`: Pay per result returned (tweet search, media download)

Eligible endpoints and pricing:
- `GET /api/v1/x/tweets/{id}` — $0.0003/call (charge)
- `GET /api/v1/x/tweets/search` — $0.0003/tweet (session)
- `GET /api/v1/x/users/{id}` — $0.00036/call (charge)
- `GET /api/v1/x/followers/check` — $0.002/call (charge)
- `GET /api/v1/x/articles/{tweetId}` — $0.002/call (charge)
- `POST /api/v1/x/media/download` — $0.0003/media (session)
- `GET /api/v1/trends` — $0.0009/call (charge)

All other endpoints require subscription authentication (API key or OAuth).

SDK: `npm i mppx` (TypeScript). Handles 402 challenge/credential flow automatically.
```

- [ ] **Step 2: Commit**

```bash
git add llms.txt
git commit -m "docs(mpp): add MPP section to llms.txt"
```

---

### Task 10: Final validation

- [ ] **Step 1: Run `mint broken-links`**

```bash
mint broken-links
```

Expected: No broken internal links. Fix any that appear.

- [ ] **Step 2: Run `mint validate`**

```bash
mint validate
```

Expected: No validation errors.

- [ ] **Step 3: Verify no sensitive terms leaked**

```bash
grep -ri "twitterapi\.io\|microcent\|usage.cap" --include="*.mdx" --include="*.json" --include="*.txt" .
```

Expected: No matches (the billing.mdx $10 in spending limits table is fine — it's not "usage cap").

- [ ] **Step 4: Verify all new pages are in docs.json**

Confirm `mpp/overview` and `mpp/quickstart` appear in the navigation.

- [ ] **Step 5: Commit any final fixes**

If validation found issues, fix and commit:

```bash
git add -A
git commit -m "fix(docs): resolve validation issues from audit"
```
