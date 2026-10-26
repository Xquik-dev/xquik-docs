import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

const PROJECT_ROOT = process.cwd();
const DOCS_OPENAPI_PATH = join(PROJECT_ROOT, "openapi.yaml");
const HTTP_METHODS = new Set(["delete", "get", "patch", "post", "put"]);

const openApiOperation = z.looseObject({
  responses: z.record(z.string(), z.looseObject({ $ref: z.string().optional() })).optional(),
  security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
  "x-payment-info": z
    .looseObject({ offers: z.array(z.looseObject({ intent: z.string().optional() })).optional() })
    .optional(),
});

type OpenApiOperation = z.infer<typeof openApiOperation>;

const openApiSpec = z.looseObject({
  paths: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});

type OpenApiSpec = z.infer<typeof openApiSpec>;

interface OperationMetadata {
  readonly optionalCredential: boolean;
  readonly key: string;
  readonly paymentIntents: readonly string[];
  readonly paymentEnabled: boolean;
  readonly paymentRequiredResponse: string;
  readonly unauthorizedResponse: string;
}

interface MppFinding {
  readonly issue: string;
  readonly operation: string;
}

function parseYaml(source: string): OpenApiSpec {
  return openApiSpec.parse(Bun.YAML.parse(source));
}

function readOpenApi(path: string): OpenApiSpec {
  return parseYaml(readFileSync(path, "utf8"));
}

function normalizeOperationKey(method: string, path: string): string {
  const productPath = path.replaceAll(/\{(?<name>[A-Za-z][A-Za-z0-9_]*)\}/gu, "[$<name>]");
  return `${method.toUpperCase()} /api/v1${productPath}`;
}

function hasOptionalCredential(operation: OpenApiOperation): boolean {
  const security = operation.security ?? [];
  return (
    security.some((entry): boolean => Object.keys(entry).length === 0) &&
    security.some((entry): boolean => Object.keys(entry).length > 0)
  );
}

function collectOperations(spec: OpenApiSpec): readonly OperationMetadata[] {
  const operations: OperationMetadata[] = [];
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const [method, rawOperation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) {
        continue;
      }
      const operation = openApiOperation.parse(rawOperation);
      operations.push({
        optionalCredential: hasOptionalCredential(operation),
        key: normalizeOperationKey(method, path),
        paymentIntents:
          operation["x-payment-info"]?.offers
            ?.map((offer): string => offer.intent ?? "")
            .filter((intent): boolean => intent.length > 0) ?? [],
        paymentEnabled: operation["x-payment-info"] !== undefined,
        paymentRequiredResponse: operation.responses?.["402"]?.["$ref"] ?? "",
        unauthorizedResponse: operation.responses?.["401"]?.["$ref"] ?? "",
      });
    }
  }
  return operations.sort((left, right): number => left.key.localeCompare(right.key));
}

describe("MPP payment metadata", (): void => {
  it("keeps every direct MPP offer on the fixed charge intent", (): void => {
    expect.assertions(1);

    const intentFindings = collectOperations(readOpenApi(DOCS_OPENAPI_PATH))
      .filter((operation): boolean => operation.paymentEnabled)
      .filter(
        (operation): boolean =>
          operation.paymentIntents.length !== 1 || operation.paymentIntents[0] !== "charge",
      )
      .map((operation): string => operation.key);

    expect(intentFindings).toStrictEqual([]);
  });

  it("keeps Bearer authentication distinct from MPP payment challenges", (): void => {
    expect.assertions(1);

    const findings = collectOperations(readOpenApi(DOCS_OPENAPI_PATH))
      .filter((operation): boolean => operation.optionalCredential)
      .flatMap((operation): readonly MppFinding[] => {
        const expectedUnauthorizedResponse = operation.paymentEnabled
          ? "#/components/responses/Unauthenticated"
          : "#/components/responses/AnonymousGuestAuthenticationRequired";
        const operationFindings: MppFinding[] = [];
        if (operation.unauthorizedResponse !== expectedUnauthorizedResponse) {
          operationFindings.push({
            issue: `Expected 401 response ${expectedUnauthorizedResponse}.`,
            operation: operation.key,
          });
        }
        if (operation.paymentRequiredResponse !== "#/components/responses/PaymentRequired") {
          operationFindings.push({
            issue: "Expected authenticated or MPP 402 response.",
            operation: operation.key,
          });
        }
        return operationFindings;
      });

    expect(findings).toStrictEqual([]);
  });
});
