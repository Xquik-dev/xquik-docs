# X (Twitter) API Documentation by Xquik

Use this X (Twitter) API documentation by Xquik to build on search, monitors & webhooks.
The published site lives at [docs.xquik.com](https://docs.xquik.com).

Xquik is the world's fastest and cheapest X (Twitter) scraper service with the most complete X (Twitter) data.
Most other Apify Actors charge before filtering or deduplication.
Xquik charges only for delivered, unique, filter-matching results and never pads rows.
Xquik is independent and not affiliated with X Corp.

<!-- trust:win:start -->

The Xquik REST API read 45 tweets per second at $0.15 per 1,000 on 2026-10-15. The fastest of 4 rival Actors read 12.5 per second. The cheapest cost $0.173 per 1,000. [Compare each run](https://xquik.com/benchmarks#benchmark-x-tweet-scraper).
<!-- trust:win:end -->

## X (Twitter) API documentation quickstart

Create an API key in the [Xquik dashboard](https://dashboard.xquik.com/en/account?tab=api-keys).
Then search tweets & posts with 1 request.

```bash
curl --get 'https://xquik.com/api/v1/x/tweets/search' \
  --header "x-api-key: ${XQUIK_API_KEY}" \
  --data-urlencode 'q=from:NASA' \
  --data-urlencode 'limit=10'
```

Search tweets with `from:`, `since:`, `until:`, filters, and cursor pagination.

## Twitter monitor & webhook docs

Create a monitor, then register a webhook for its events.

```bash
curl -X POST https://xquik.com/api/v1/monitors \
  -H "x-api-key: ${XQUIK_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"username": "NASA", "eventTypes": ["tweet.new", "tweet.reply"]}'

curl -X POST https://xquik.com/api/v1/webhooks \
  -H "x-api-key: ${XQUIK_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-server.com/webhook", "eventTypes": ["tweet.new", "tweet.reply"]}'
```

Next, read the [Quickstart](https://docs.xquik.com/x-api-quickstart), the [Webhooks guide](https://docs.xquik.com/webhooks/overview) or the [SDK pages](https://docs.xquik.com/sdks).

<!-- trust:start -->

## Benchmarks & usage

[![X (Twitter) API p99 server read time](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Frest-p99.json)](https://xquik.com/benchmarks#speed)
[![Xquik X (Twitter) API accounts](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Faccounts.json)](https://xquik.com/benchmarks#accounts)
[![X (Twitter) API package downloads](https://img.shields.io/endpoint?url=https%3A%2F%2Fxquik.com%2Fbadges%2Fdownloads.json)](https://xquik.com/benchmarks#downloads)

- 6.4 s p99 REST API server read time over 7 days, failed reads included ([source](https://xquik.com/benchmarks#speed)) <!-- trust:rest-p99 6317 -->
- 4,200+ accounts on xquik.com ([source](https://xquik.com/benchmarks#accounts)) <!-- trust:accounts 4272 -->
- 63,000+ downloads of Xquik's X (Twitter) API packages across 6 registries ([source](https://xquik.com/benchmarks#downloads)) <!-- trust:downloads 63185 -->

Checked on 2026-11-07. See each number with its date & source on [xquik.com/benchmarks](https://xquik.com/benchmarks) or as [JSON](https://xquik.com/trust.json).

<!-- trust:end -->

## What the docs cover

The pages explain tweet search, user lookup, follower exports & media uploads.
Others cover direct messages, 1-second tweet monitors & signed webhooks.
SDK clients and X (Twitter) automation guides sit beside them.

- **REST API.** Operations span X (Twitter) data, monitors, webhooks, extractions, draws, writes & accounts.
- **Webhooks.** HMAC SHA-256 signature verification, retry semantics & payload schemas.
- **MCP server.** Use Code Mode or OpenAPI-native tools. Binary downloads use REST.
- **OAuth 2.1.** Automatic discovery, PKCE, client registration & token refresh.
- **SDKs.** 10 generated clients cover 8 languages, the CLI & Terraform.
- **OpenAPI 3.1.** A machine-readable contract for endpoint pages and SDK generation.

## Start here

- [Quickstart](https://docs.xquik.com/x-api-quickstart). Make the first authenticated API call.
- [API reference](https://docs.xquik.com/api-reference). Browse every OpenAPI-backed operation.
- [Guest wallets](https://docs.xquik.com/guides/guest-wallets). Fund accountless paid reads through a confirmed hosted checkout.
- [Direct MPP](https://docs.xquik.com/mpp/machine-payments-protocol). Pay per request on fixed-price GET operations.
- [SDKs](https://docs.xquik.com/sdks). Install a typed client, the CLI or the Terraform provider.
- [Tweet search export](https://docs.xquik.com/guides/tweet-scraper-csv-export). Export tweets by keyword to CSV, JSON, or XLSX.
- [Tweet replies export](https://docs.xquik.com/guides/tweet-replies-export). Export replies to CSV, JSON, or XLSX.
- [Follower export](https://docs.xquik.com/guides/follower-export-crm). Export X (Twitter) followers to CRM or warehouse.
- [Direct message workflow](https://docs.xquik.com/guides/direct-message-workflow). Send DMs and store returned message IDs.
- [Prefect](https://docs.xquik.com/guides/prefect). Schedule tweet, user, timeline, and trend reads in Prefect flows.
- [Supabase](https://docs.xquik.com/guides/supabase). Call Xquik from Edge Functions, SQL & pg_cron, and store webhook events.
- [Convex](https://docs.xquik.com/guides/convex). Call each Xquik operation as a typed Convex action.
- [Webhooks](https://docs.xquik.com/webhooks/overview). Verify HMAC signatures and receive monitor events.
- [Open source assurance](https://docs.xquik.com/guides/open-source-assurance). Review OpenSSF project mapping and controls.
- [Apify Actors](https://docs.xquik.com/alternatives/apify). Run focused X (Twitter) data jobs on Apify.

## Use with AI coding agents

- [Context7 library](https://context7.com/xquik-dev/xquik-docs). Load indexed Xquik docs in supported coding agents.
- [llms.txt](https://docs.xquik.com/llms.txt). Discover every docs page before you read deeper.
- [MCP server](https://docs.xquik.com/mcp). Connect through Code Mode or OpenAPI-native tools.
- [MCP 2026-07-28](https://docs.xquik.com/mcp/overview#mcp-2026-07-28). Understand `server/discover`, request-scoped calls & private cache hints.
- [Coding-agent setup](https://docs.xquik.com/mcp/coding-agents). Connect Claude Code, Cursor, OpenCode, Pi, Codex & other MCP clients.
- [Agent catalog](https://xquik.com/.well-known/agents.json). Discover the MCP server, API contract, OAuth metadata & auth.md.
- [Agent Skills index](https://xquik.com/.well-known/agent-skills/index.json). Discover and verify Xquik's hosted `SKILL.md`.
- [auth.md](https://xquik.com/auth.md). Read interactive and claimed agent authorization instructions.
- [OpenAPI spec](https://docs.xquik.com/openapi.yaml). Generate clients or inspect request and response shapes.

## Common questions

| Customer question                            | Documentation                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| How do I search tweets through an API?       | [Search Tweets API](https://docs.xquik.com/api-reference/x/search-tweets)         |
| How do I export tweet search results?        | [Tweet Search Export](https://docs.xquik.com/guides/tweet-scraper-csv-export)     |
| How do I read an account timeline?           | [User Tweets API](https://docs.xquik.com/api-reference/x/user-tweets)             |
| How do I export followers?                   | [Follower Export Guide](https://docs.xquik.com/guides/follower-export-crm)        |
| How do I scrape following accounts?          | [Following API](https://docs.xquik.com/api-reference/x/following)                 |
| How do I read my home timeline?              | [Home Timeline API](https://docs.xquik.com/api-reference/x/timeline)              |
| How do I monitor accounts or keywords?       | [Brand Monitoring Guide](https://docs.xquik.com/guides/brand-monitoring-workflow) |
| How do I verify signed webhooks?             | [Webhook Guide](https://docs.xquik.com/webhooks/overview)                         |
| How do I post or reply?                      | [Create Tweet API](https://docs.xquik.com/api-reference/x-write/create-tweet)     |
| How do I send DMs with returned message IDs? | [Direct Message Workflow](https://docs.xquik.com/guides/direct-message-workflow)  |
| How do I run Apify dataset workflows?        | [Xquik on Apify](https://apify.com/xquik)                                         |
| How does Xquik compare with the X API?       | [X API Alternative Guide](https://docs.xquik.com/alternatives/x-api)              |
| How can an AI agent use Xquik?               | [MCP Server Guide](https://docs.xquik.com/mcp)                                    |

## Repository layout

```text
api-reference/      OpenAPI operations, grouped by resource
guides/             Workflow, operations, and framework guides
webhooks/           Overview + signature verification
mcp/                MCP server overview + tool reference
oauth/              OAuth 2.1 setup + flow
sdks/               Per-language SDK landing pages
alternatives/       Comparison and migration guides
x-api-quickstart.mdx      2-minute quickstart
docs.json           Navigation + theme config
custom.css          Custom styling
llms.txt            AI-readable site index
openapi.yaml        OpenAPI 3.1 spec, copied from the application
```

## Local development

Install Bun, rustup, OSV-Scanner, Gitleaks & ShellCheck.
Use the pinned npm version in `package.json`.

```bash
bunx --bun npm@12.2.2 ci --ignore-scripts
bun run check:all
```

`openapi.yaml` is an exact copy of the application's spec.
Never edit it here.
Clone the application beside this repository, or set `XQUIK_PRODUCT_ROOT` to it.
`bun run sync` then copies the spec & rewrites each page's response examples.
The parity & features catalog tests need that checkout too.
Without it, they skip & say so.
A test that can't find its file fails & says to update the checkout.

Run `bunx --bun mint@4.3.5 dev` when you need a visual preview.

## Deployment

`main` deploys to [docs.xquik.com](https://docs.xquik.com) on each merge.
Deployment status appears in commit check runs.

This repository runs no GitHub Actions.
Run every required check locally before you push.
Verify the published pages after each deployment.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for style rules, content conventions & the pull request workflow.

## Security

Report a vulnerability in the docs site or a documented endpoint through [SECURITY.md](SECURITY.md).
Do not file public issues for security findings.

## Questions

### Do I need an X (Twitter) developer account?

No. Public reads need only an Xquik API key.
Private reads & X (Twitter) account actions need a connected account.

### Is this the official X (Twitter) API documentation?

No. Xquik runs its own REST API.
These docs cover that API, not the official X API.

## More Xquik tools

- [X (Twitter) scraper API & X (Twitter) MCP server](https://github.com/Xquik-dev/x-twitter-scraper) with REST, MCP & Skill setup.
- X (Twitter) API SDKs for [TypeScript](https://github.com/Xquik-dev/x-twitter-scraper-typescript), [Python](https://github.com/Xquik-dev/x-twitter-scraper-python), [Go](https://github.com/Xquik-dev/x-twitter-scraper-go) & [Ruby](https://github.com/Xquik-dev/x-twitter-scraper-ruby).
- X (Twitter) API SDKs for [Java](https://github.com/Xquik-dev/x-twitter-scraper-java), [Kotlin](https://github.com/Xquik-dev/x-twitter-scraper-kotlin), [C#](https://github.com/Xquik-dev/x-twitter-scraper-csharp) & [PHP](https://github.com/Xquik-dev/x-twitter-scraper-php).
- [Twitter CLI & X CLI](https://github.com/Xquik-dev/x-twitter-scraper-cli) for terminal workflows.
- Twitter agent plugins for [OpenClaw](https://github.com/Xquik-dev/tweetclaw) & [Hermes Agent](https://github.com/Xquik-dev/hermes-tweet).
- [Twitter advanced search operators](https://github.com/Xquik-dev/x-twitter-advanced-search) with tested examples.
- [Xquik X API & Twitter scraper](https://xquik.com) and its [main dashboard](https://dashboard.xquik.com).

## License

The documentation source uses the [MIT License](LICENSE).
The license does not cover the Xquik product, brand or platform.

Xquik is an independent third-party service. Not affiliated with X Corp. "Twitter" and "X" are trademarks of X Corp.
