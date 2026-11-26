import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { productRootTest } from "./product-contract.test.helpers.ts";
import type { WindowClaim } from "./scripts/lib/delivery-window.ts";
import {
  deliveryWindowClaims,
  extendedEventRetentionClaims,
} from "./scripts/lib/delivery-window.ts";

const DELIVERY_STATUS = "lib/webhooks/delivery-status.ts";
const SPEC = "openapi.yaml";
const ANCHORS = [SPEC, "webhooks/overview.mdx", "api-reference/webhooks/deliveries.mdx"];
const EVENT_LIFETIME_TIE = "WEBHOOK_DELIVERY_WINDOW_DAYS: typeof STREAM_EVENT_DAYS";

const windowSchema = z.object({ WEBHOOK_DELIVERY_WINDOW_DAYS: z.number().int().positive() });

function statedPages(): readonly string[] {
  return execFileSync("git", ["ls-files", "*.mdx", SPEC], {
    cwd: import.meta.dirname,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter((file) => !file.startsWith("changelog/") && file !== "changelog.mdx");
}

function claimsIn(file: string): readonly WindowClaim[] {
  const source = readFileSync(join(import.meta.dirname, file), "utf8");
  return deliveryWindowClaims(source, file.endsWith(".yaml") ? "yaml" : "mdx");
}

function extendedRetentionIn(file: string): readonly string[] {
  const source = readFileSync(join(import.meta.dirname, file), "utf8");
  return extendedEventRetentionClaims(source, file.endsWith(".yaml") ? "yaml" : "mdx");
}

describe("webhook delivery window", () => {
  productRootTest(
    "gives every webhook delivery & every event the product's window on each page & in the spec, which the product ties to its event lifetime",
    DELIVERY_STATUS,
    async (root): Promise<void> => {
      expect.assertions(1);
      const module: unknown = await import(join(root, DELIVERY_STATUS));
      const days = windowSchema.parse(module).WEBHOOK_DELIVERY_WINDOW_DAYS;
      const tied = readFileSync(join(root, DELIVERY_STATUS), "utf8").includes(EVENT_LIFETIME_TIE);
      const pages = statedPages();
      const claims = pages.flatMap((file) => claimsIn(file).map((claim) => ({ ...claim, file })));
      const extended = pages.flatMap((file) =>
        extendedRetentionIn(file).map((sentence) => `${file}: ${sentence}`),
      );

      expect({
        anchors: ANCHORS.filter((file) => claims.some((claim) => claim.file === file)),
        extended,
        other: claims
          .filter((claim) => claim.days !== days)
          .map(({ file, sentence }) => `${file}: ${sentence}`),
        tied,
      }).toStrictEqual({ anchors: ANCHORS, extended: [], other: [], tied: true });
    },
  );

  it("reads each day count a delivery sentence gives, in digits, words or weeks", (): void => {
    expect.assertions(1);
    const source = [
      "Xquik retries each failed delivery for up to 7 days.",
      "",
      '<Card title="7-day window" icon="rotate-ccw">',
      "",
      "A paused webhook holds each waiting delivery for seven days.",
      "Retries stop after 2 weeks.",
    ].join("\n");

    expect(deliveryWindowClaims(source, "mdx").map(({ days }) => days)).toStrictEqual([
      7, 7, 7, 14,
    ]);
  });

  it("reads the title and body of a card that opens on the line after another card closes, as the 30-day window and exhausted cards do", (): void => {
    expect.assertions(1);
    const exhausted = [
      "  </Card>",
      '  <Card title="exhausted" icon="pause">',
      "",
      "    7 days passed without a `2xx`. `lastError` says why. Read the event with",
      "    `GET /api/v1/events/{id}`.",
      "",
      "  </Card>",
      "</CardGroup>",
    ];
    const deliveries = [
      "  </Card>",
      '  <Card title="7-day window" icon="rotate-ccw">',
      "",
      "    Xquik retries every `failed` delivery until 30 days pass. No delivery ends",
      "    earlier, even after `410 Gone`.",
      "",
      ...exhausted,
    ];

    expect(
      [exhausted, deliveries].map((page) =>
        deliveryWindowClaims(page.join("\n"), "mdx").map(({ days }) => days),
      ),
    ).toStrictEqual([[7], [7, 30, 7]]);
  });

  it("finds the window a card body names, whatever line opens the card's block", (): void => {
    expect.assertions(1);
    const property = fc.property(
      fc.integer({ max: 400, min: 1 }),
      fc.constantFrom("", "  </Card>\n", "<CardGroup cols={2}>\n", "Read each state.\n"),
      (days, before): boolean => {
        const claims = deliveryWindowClaims(
          `${before}  <Card title="exhausted" icon="pause">\n\n    ${String(days)} days passed without a \`2xx\`.`,
          "mdx",
        );
        return claims.length === 1 && claims[0]?.days === days;
      },
    );

    expect(() => fc.assert(property)).not.toThrow();
  });

  it("reads the delivery sentences in every spec string", (): void => {
    expect.assertions(1);
    const spec = [
      "components:",
      "  schemas:",
      "    Delivery:",
      "      description: >-",
      "        A `pending` delivery waits up to 7 days.",
      "        `exhausted` means it wasn't delivered within 7 days.",
    ].join("\n");

    expect(deliveryWindowClaims(spec, "yaml").map(({ days }) => days)).toStrictEqual([7, 7]);
  });

  it("reads the day count each event lifetime sentence gives, and skips a price period, a retry table row or another product", (): void => {
    expect.assertions(1);
    const source = [
      "Each one shows `exhausted` once its 30 days end. Events expire 7 days after Xquik creates them.",
      "",
      "Xquik keeps each event for 14 days and sends it once the endpoint answers.",
      "",
      "| Failed attempts | Next retry after |",
      "| --------------- | ---------------- |",
      "| 19              | About 3 days     |",
      "",
      "| Product   | Reports                                   |",
      "| --------- | ----------------------------------------- |",
      "| X history | Reports from USD 50, delivered within 1 day. |",
      "",
      "Radar history covers 7 days. Style analysis after the 7-day cache window costs credits.",
      "A plan costs USD 3 for 30 days, events and webhooks included.",
    ].join("\n");

    expect(deliveryWindowClaims(source, "mdx")).toStrictEqual([
      { days: 30, sentence: "Each one shows `exhausted` once its 30 days end." },
      { days: 7, sentence: "Events expire 7 days after Xquik creates them." },
      {
        days: 14,
        sentence: "Xquik keeps each event for 14 days and sends it once the endpoint answers.",
      },
    ]);
  });

  it("finds the lifetime any event sentence names", (): void => {
    expect.assertions(1);
    const property = fc.property(
      fc.integer({ max: 400, min: 1 }),
      fc.constantFrom(
        (days: string): string => `Events expire ${days} days after Xquik creates them.`,
        (days: string): string =>
          `Stored monitor events expire ${days} days after Xquik creates them.`,
        (days: string): string => `Xquik keeps each event for ${days} days.`,
        (days: string): string => `A reconnect gets every event from the last ${days} days.`,
        (days: string): string => `An event stays ${days} days.`,
      ),
      (days, sentence): boolean => {
        const claims = deliveryWindowClaims(sentence(String(days)), "mdx");
        return claims.length === 1 && claims[0]?.days === days;
      },
    );

    expect(() => fc.assert(property)).not.toThrow();
  });

  it("finds any sentence claiming events outlive their 30-day creation cutoff", (): void => {
    expect.assertions(1);
    const source = [
      "Events expire 30 days after Xquik creates them.",
      "An event whose delivery ended as `exhausted` stays 30 days after that delivery ended.",
      "Xquik keeps queued events until all deliveries finish.",
      "Xquik keeps each event for 30 days and sends it once the endpoint answers.",
    ].join(" ");

    expect(extendedEventRetentionClaims(source, "mdx")).toStrictEqual([
      "An event whose delivery ended as `exhausted` stays 30 days after that delivery ended.",
      "Xquik keeps queued events until all deliveries finish.",
    ]);
  });

  it("finds the window any delivery sentence names", (): void => {
    expect.assertions(1);
    const property = fc.property(
      fc.integer({ max: 400, min: 1 }),
      fc.constantFrom("delivery", "deliveries", "retry", "retries"),
      fc.constantFrom(" days", "-day", " day"),
      (days, noun, unit): boolean => {
        const claims = deliveryWindowClaims(
          `A ${noun} lasts ${String(days)}${unit} at most.`,
          "mdx",
        );
        return claims.length === 1 && claims[0]?.days === days;
      },
    );

    expect(() => fc.assert(property)).not.toThrow();
  });
});
