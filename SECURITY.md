# Security Policy

Thank you for taking the time to report a vulnerability responsibly.

## Reporting a vulnerability

For any security issue affecting **docs.xquik.com**, the documented behaviour of the Xquik REST API, the Xquik MCP server, OAuth 2.1 flow, webhook signature scheme, or any published Xquik SDK, please **email [security@xquik.com](mailto:security@xquik.com)**.

Do **not** open a public GitHub issue, discussion, or pull request for security findings. Public disclosure before a fix is in place puts every Xquik user at risk.

When reporting, include as much of the following as you can:

- A clear description of the issue.
- Reproduction steps, including request/response samples or proof-of-concept code where relevant.
- The affected endpoint, SDK version, or page on docs.xquik.com.
- Impact assessment (data exposure, account takeover, billing bypass, etc.).
- Any suggested mitigation.

## Response targets

- **Acknowledgement:** within 24 hours of receipt.
- **Initial triage and severity assignment:** within 72 hours.
- **Fix or mitigation timeline:** communicated after triage. Critical issues are prioritised over all other work.

## Scope

In scope:

- The `docs.xquik.com` Mintlify site.
- The OpenAPI spec (`openapi.yaml`) when its description contradicts actual API behaviour in a way that creates a vulnerability for integrators.
- Documentation that incorrectly describes authentication, signature verification, or scope semantics in a way that would lead a developer to build an insecure integration.

Out of scope (handle through the main repo or normal channels):

- Bugs in the Xquik product itself - report via [security@xquik.com](mailto:security@xquik.com); the team routes them to the right repository internally.
- Typos, broken links, or content suggestions - open a normal GitHub issue or PR on this repository.
- Findings against third-party services Mintlify uses for hosting.

## Safe harbour

We will not pursue legal action against researchers who:

- Make a good-faith effort to comply with this policy.
- Avoid privacy violations, destruction of data, or interruption of service.
- Give us reasonable time to investigate and remediate before any public disclosure.

## Credit

With your permission, we acknowledge reporters in the changelog or in a dedicated security advisory once a fix is shipped. If you prefer to remain anonymous, say so in your initial report.
