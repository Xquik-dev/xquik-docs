import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  openApiResponse,
  openApiSchema,
  type OpenApiSchema,
} from "./scripts/lib/openapi-schema.ts";

const jsonResponse = openApiResponse.extend({
  content: z.looseObject({ "application/json": z.looseObject({ schema: openApiSchema }) }),
});

const connectionSpec = z.looseObject({
  components: z.looseObject({ schemas: z.record(z.string(), openApiSchema) }),
  paths: z.looseObject({
    "/x/account-connection-attempts/{id}": z.looseObject({
      get: z.looseObject({ responses: z.looseObject({ "200": jsonResponse }) }),
    }),
    "/x/accounts": z.looseObject({
      post: z.looseObject({
        requestBody: z.looseObject({
          content: z.looseObject({ "application/json": z.looseObject({ schema: openApiSchema }) }),
        }),
        responses: z.looseObject({ "201": jsonResponse, "202": jsonResponse }),
      }),
    }),
  }),
});

type ConnectionSpec = z.infer<typeof connectionSpec>;

const PROJECT_ROOT = process.cwd();
const CONNECT_PAGE = readFileSync(
  join(PROJECT_ROOT, "api-reference/x-accounts/connect.mdx"),
  "utf8",
);
const STATUS_PAGE = readFileSync(
  join(PROJECT_ROOT, "api-reference/x-accounts/connection-attempt.mdx"),
  "utf8",
);
const X_ACCOUNT_PAGES = [
  "bulk-retry.mdx",
  "connect.mdx",
  "connection-attempt.mdx",
  "disconnect.mdx",
  "get.mdx",
  "list.mdx",
  "reauth.mdx",
  "submit-challenge.mdx",
]
  .map((file) => readFileSync(join(PROJECT_ROOT, "api-reference/x-accounts", file), "utf8"))
  .join("\n");
const OPENAPI_SOURCE = readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8");
const DOCS_CONFIG = readFileSync(join(PROJECT_ROOT, "docs.json"), "utf8");
const LLMS_INDEX = readFileSync(join(PROJECT_ROOT, "llms.txt"), "utf8");
const PRIVATE_CONNECTION_COPY =
  /automatic retr(?:y|ies)|browser session|network tunnel|retry automatically/iu;

function parseConnectionSpec(source: string): ConnectionSpec {
  return connectionSpec.parse(Bun.YAML.parse(source));
}

function refs(schema: Readonly<OpenApiSchema>): readonly string[] {
  return (schema.oneOf ?? []).map((variant) => variant.$ref ?? "");
}

function responseFieldsForSection(title: string): readonly string[] {
  const marker = `### ${title}`;
  const start = STATUS_PAGE.indexOf(marker);
  const nextSection = STATUS_PAGE.indexOf("\n### ", start + marker.length);
  if (start < 0) {
    throw new Error(`Missing connection status section: ${title}`);
  }
  const end = nextSection < 0 ? STATUS_PAGE.length : nextSection;
  return [...STATUS_PAGE.slice(start, end).matchAll(/<ResponseField name="(?<field>[^"]+)"/gu)]
    .map((match): string => match.groups?.["field"] ?? "")
    .filter((field): boolean => field.length > 0)
    .sort((left, right): number => left.localeCompare(right));
}

function schemaFields(name: string): readonly string[] {
  return Object.keys(openapi.components.schemas[name]?.properties ?? {}).sort(
    (left, right): number => left.localeCompare(right),
  );
}

const openapi = parseConnectionSpec(OPENAPI_SOURCE);

describe("X account connection documentation contract", (): void => {
  it("publishes every durable connection result", (): void => {
    expect.assertions(9);
    const connect = openapi.paths["/x/accounts"].post.responses;
    const status = openapi.paths["/x/account-connection-attempts/{id}"].get.responses["200"];

    expect(connect["201"].content["application/json"].schema.$ref).toBe(
      "#/components/schemas/SanitizedXAccount",
    );
    expect(connect["201"].content["application/json"].schema.type).toBeUndefined();
    expect(connect["201"].content["application/json"].schema).not.toHaveProperty(
      "x-stainless-override-schema",
    );
    expect(status.content["application/json"].schema.discriminator?.mapping).toStrictEqual({
      failed: "#/components/schemas/XAccountConnectionAttemptFailed",
      pending: "#/components/schemas/XAccountConnectionAttemptPending",
      requires_email_code: "#/components/schemas/XAccountConnectionChallenge",
      success: "#/components/schemas/XAccountConnectionAttemptSuccess",
    });
    expect(connect["202"].content["application/json"].schema.$ref).toBe(
      "#/components/schemas/XAccountConnectionContinuation",
    );
    expect(refs(status.content["application/json"].schema)).toStrictEqual([
      "#/components/schemas/XAccountConnectionAttemptPending",
      "#/components/schemas/XAccountConnectionAttemptSuccess",
      "#/components/schemas/XAccountConnectionAttemptFailed",
      "#/components/schemas/XAccountConnectionChallenge",
    ]);
    expect(status.content["application/json"].schema["x-stainless-naming"]?.csharp?.type_name).toBe(
      "AccountConnectionAttemptRetrieveResponse",
    );
    expect(refs(openapi.components.schemas["XAccountConnectionContinuation"] ?? {})).toStrictEqual([
      "#/components/schemas/XAccountConnectionAttemptPending",
      "#/components/schemas/XAccountConnectionChallenge",
    ]);
    expect(
      openapi.components.schemas["XAccountConnectionContinuation"]?.discriminator?.propertyName,
    ).toBe("status");
  });

  it("keeps status fields and headers exact", (): void => {
    expect.assertions(5);
    const schemas = openapi.components.schemas;
    const connect = openapi.paths["/x/accounts"].post.responses["202"];
    const status = openapi.paths["/x/account-connection-attempts/{id}"].get.responses["200"];

    expect(schemas["XAccountConnectionAttemptPending"]?.required).toStrictEqual([
      "object",
      "id",
      "status",
      "pollAfterMs",
    ]);
    expect(schemas["XAccountConnectionAttemptSuccess"]?.required).toStrictEqual([
      "object",
      "id",
      "status",
    ]);
    expect(schemas["XAccountConnectionAttemptFailed"]?.required).toStrictEqual([
      "object",
      "id",
      "status",
      "error",
      "retryable",
    ]);
    expect(Object.keys(connect.headers ?? {}).sort()).toStrictEqual([
      "Cache-Control",
      "Location",
      "Retry-After",
    ]);
    expect(Object.keys(status.headers ?? {}).sort()).toStrictEqual([
      "Cache-Control",
      "Retry-After",
    ]);
  });

  it.each([
    ["200 Pending", "XAccountConnectionAttemptPending"],
    ["200 Success", "XAccountConnectionAttemptSuccess"],
    ["200 Failed", "XAccountConnectionAttemptFailed"],
    ["200 Email code required", "XAccountConnectionChallenge"],
  ])("aligns %s fields with its OpenAPI variant", (title, schema): void => {
    expect.assertions(1);
    expect(responseFieldsForSection(title)).toStrictEqual(schemaFields(schema));
  });

  it("requires the TOTP secret for a durable connection", (): void => {
    expect.assertions(3);
    const requestSchema =
      openapi.paths["/x/accounts"].post.requestBody.content["application/json"].schema;

    expect(requestSchema.required).toStrictEqual(["username", "email", "password", "totp_secret"]);
    expect(CONNECT_PAGE).toContain('<ParamField body="totp_secret" type="string" required>');
    expect(CONNECT_PAGE).toContain("Missing `username`, `email`, `password`, or `totp_secret`");
  });

  it("keeps the guide discoverable and copy-ready", (): void => {
    expect.assertions(5);

    expect(CONNECT_PAGE).toContain('"status": "pending"');
    expect(STATUS_PAGE).toContain('api: "GET /x/account-connection-attempts/{id}"');
    expect(DOCS_CONFIG).toContain('"api-reference/x-accounts/connection-attempt"');
    expect(LLMS_INDEX).toContain(
      "https://docs.xquik.com/api-reference/x-accounts/connection-attempt",
    );
    expect(CONNECT_PAGE).not.toMatch(/elon@example\.com|s3cureP@ss|JBSWY3DPEHPK3PXP"\s*[,}]/u);
  });

  it("keeps connection guidance customer-safe", (): void => {
    expect.assertions(1);

    expect(X_ACCOUNT_PAGES).not.toMatch(PRIVATE_CONNECTION_COPY);
  });
});
