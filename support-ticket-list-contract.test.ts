import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { docsSecurity } from "./product-contract.test.helpers.ts";

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(PROJECT_ROOT, "api-reference/support/list.mdx"), "utf8");
const normalizedPage = page.replaceAll(/\s+/gu, " ");
const openapi = readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8");
const listOperation = openapi.slice(
  openapi.indexOf("      operationId: listTickets"),
  openapi.indexOf("  /support/tickets/{id}:"),
);

describe("support ticket list documentation", (): void => {
  it("documents the exact summary fields and omits attachments", (): void => {
    expect.assertions(1);

    const description =
      /^description: "(?<description>[^"]+)"$/mu.exec(page)?.groups?.["description"] ?? "";

    expect({
      attachmentClaimRemoved: !description.includes("attachment"),
      createdAt: normalizedPage.includes("| Opened time | `createdAt` |"),
      fullDetailBoundary: normalizedPage.includes(
        "when you need message bodies or attachment metadata.",
      ),
      messageCount: normalizedPage.includes("| Conversation size | `messageCount` |"),
      publicId: normalizedPage.includes("| Ticket ID | `publicId` |"),
      status: normalizedPage.includes("| Current state | `status` |"),
      subject: normalizedPage.includes("| Reported issue | `subject` |"),
      updatedAt: normalizedPage.includes("| Latest activity | `updatedAt` |"),
    }).toStrictEqual({
      attachmentClaimRemoved: true,
      createdAt: true,
      fullDetailBoundary: true,
      messageCount: true,
      publicId: true,
      status: true,
      subject: true,
      updatedAt: true,
    });
  });

  it("keeps response and status guidance aligned with OpenAPI", (): void => {
    expect.assertions(1);

    expect({
      documentedApiKey: normalizedPage.includes("Your Xquik API key. Generate one from the"),
      documentedBearer: normalizedPage.includes(
        "An OAuth bearer token formatted as `Bearer YOUR_TOKEN`.",
      ),
      noSessionCookieClaim: !normalizedPage.includes("Session cookie authentication"),
      security: docsSecurity("listTickets"),
      statuses: ["200", "401", "429"].every((status) =>
        listOperation.includes(`        '${status}':`),
      ),
      ticketStates: openapi.includes("enum: [open, in_progress, resolved, closed]"),
    }).toStrictEqual({
      documentedApiKey: true,
      documentedBearer: true,
      noSessionCookieClaim: true,
      security: [{ apiKey: [] }, { oauthBearer: [] }],
      statuses: true,
      ticketStates: true,
    });
  });

  it("documents the current limit and recent-update ordering", (): void => {
    expect.assertions(1);

    expect({
      documentedLimit: page.includes("returns up to 200 tickets."),
      documentedOrder: normalizedPage.includes("It sorts the newest `updatedAt` value first."),
    }).toStrictEqual({ documentedLimit: true, documentedOrder: true });
  });

  it("preserves focused support ticket API search intent", (): void => {
    expect.assertions(1);

    expect(
      [
        'title: "Support ticket API: list Xquik tickets & status"',
        '"support ticket API"',
        '"list support tickets"',
        '"support ticket status"',
        "## Read the support ticket list",
        "## Build a support ticket review queue",
      ].every((snippet) => page.includes(snippet)),
    ).toBe(true);
  });
});
