import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseOpenApi } from "./scripts/lib/openapi-schema.ts";

const PROJECT_ROOT = process.cwd();
const DELIVERY_FIELDS = ["deliveryId", "eventType", "schemaVersion", "streamEventId"];
const EVENT_API_ONLY_FIELDS = new Set(["id", "keywordMonitorId", "type"]);
const CARD_PATTERN = /<Card title="(?<title>[^"]+)"[^>]*>(?<body>[\s\S]*?)<\/Card>/gu;

const spec = parseOpenApi(readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8"));
const event = spec.components?.schemas?.["Event"];
const overview = readFileSync(join(PROJECT_ROOT, "webhooks/overview.mdx"), "utf8");
const overviewDescription =
  /^description: "(?<text>[^"]+)"$/mu.exec(overview)?.groups?.["text"] ?? "";
const skill = readFileSync(join(PROJECT_ROOT, "skill.md"), "utf8").toLowerCase();
const cards = new Map(
  [...overview.matchAll(CARD_PATTERN)].map((match): [string, string] => [
    match.groups?.["title"] ?? "",
    match.groups?.["body"] ?? "",
  ]),
);

describe("webhook payload fields", (): void => {
  it("gives every field of a monitor event delivery a card on the webhooks overview", (): void => {
    expect.assertions(1);

    const fields = [
      ...DELIVERY_FIELDS,
      ...Object.keys(event?.properties ?? {}).filter((field) => !EVENT_API_ONLY_FIELDS.has(field)),
    ].toSorted();

    expect(fields.filter((field) => !cards.has(field))).toStrictEqual([]);
  });

  it("names each monitor type the spec's Event schema allows on the monitorType card", (): void => {
    expect.assertions(1);

    const monitorTypes = (event?.properties?.["monitorType"]?.enum ?? []).map(String);

    expect(
      monitorTypes.filter((type) => !(cards.get("monitorType") ?? "").includes(`\`${type}\``)),
    ).toStrictEqual([]);
  });

  it("names each monitor type in the webhooks overview description and the Skill", (): void => {
    expect.assertions(1);

    const monitorTypes = (event?.properties?.["monitorType"]?.enum ?? []).map(String);

    expect({
      description: monitorTypes.filter((type) => !overviewDescription.includes(type)),
      skill: monitorTypes.filter((type) => !skill.includes(`${type} monitor`)),
    }).toStrictEqual({ description: [], skill: [] });
  });
});
