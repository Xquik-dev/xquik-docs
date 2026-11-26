import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { productRootTest } from "./product-contract.test.helpers.ts";
import type { WindowClaim } from "./scripts/lib/delivery-window.ts";
import { deliveryWindowClaims } from "./scripts/lib/delivery-window.ts";

const DELIVERY_STATUS = "lib/webhooks/delivery-status.ts";
const SPEC = "openapi.yaml";
const ANCHORS = [SPEC, "webhooks/overview.mdx", "api-reference/webhooks/deliveries.mdx"];

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

describe("webhook delivery window", () => {
  productRootTest(
    "gives every webhook delivery the product's window on each page & in the spec",
    DELIVERY_STATUS,
    async (root): Promise<void> => {
      expect.assertions(1);
      const module: unknown = await import(join(root, DELIVERY_STATUS));
      const days = windowSchema.parse(module).WEBHOOK_DELIVERY_WINDOW_DAYS;
      const claims = statedPages().flatMap((file) =>
        claimsIn(file).map((claim) => ({ ...claim, file })),
      );

      expect({
        anchors: ANCHORS.filter((file) => claims.some((claim) => claim.file === file)),
        other: claims
          .filter((claim) => claim.days !== days)
          .map(({ file, sentence }) => `${file}: ${sentence}`),
      }).toStrictEqual({ anchors: ANCHORS, other: [] });
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

  it("skips day counts about an event's lifetime, a retry table row or another product", (): void => {
    expect.assertions(1);
    const source = [
      "Each one shows `exhausted` once its 30 days end. An event whose delivery ended as `exhausted` stays 7 days after that delivery ended.",
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
    ].join("\n");

    expect(deliveryWindowClaims(source, "mdx")).toStrictEqual([
      { days: 30, sentence: "Each one shows `exhausted` once its 30 days end." },
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
