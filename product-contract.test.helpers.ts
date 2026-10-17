import { readFileSync } from "node:fs";
import { join } from "node:path";

import { it } from "vitest";

import { findProductRoot } from "./scripts/lib/product-root.ts";

type Spec = Record<string, unknown>;

function asRecord(value: unknown): Spec | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Spec)
    : undefined;
}

const PRODUCT_ROOT = findProductRoot();

const productSpec: Spec =
  asRecord(Bun.YAML.parse(readFileSync(join(import.meta.dirname, "openapi.yaml"), "utf8"))) ?? {};

function resolve(spec: Spec, value: unknown): Spec {
  let current = asRecord(value) ?? {};
  for (let hops = 0; typeof current["$ref"] === "string" && hops < 10; hops += 1) {
    const path = current["$ref"].replace(/^#\//u, "").split("/");
    current = asRecord(path.reduce<unknown>((node, key) => asRecord(node)?.[key], spec)) ?? {};
  }
  return current;
}

function propertyNames(spec: Spec, schema: unknown): string[] {
  const resolved = resolve(spec, schema);
  const parts = Array.isArray(resolved["allOf"]) ? resolved["allOf"] : [resolved];
  return parts
    .flatMap((part) => Object.keys(asRecord(resolve(spec, part)["properties"]) ?? {}))
    .toSorted();
}

interface ProductOperation {
  readonly parameters: readonly string[];
  readonly successFields: readonly string[];
  readonly itemFields: (property: string) => readonly string[];
}

function findOperation(spec: Spec, operationId: string): Spec | undefined {
  return Object.values(asRecord(spec["paths"]) ?? {})
    .flatMap((path) => Object.values(asRecord(path) ?? {}))
    .map((candidate) => asRecord(candidate))
    .find((candidate) => candidate?.["operationId"] === operationId);
}

function docsSecurity(operationId: string): unknown {
  return findOperation(productSpec, operationId)?.["security"];
}

function productOperation(spec: Spec, operationId: string): ProductOperation | undefined {
  const operation = findOperation(spec, operationId);
  if (operation === undefined) return undefined;
  const responses = asRecord(operation["responses"]) ?? {};
  const success = resolve(spec, responses["200"]);
  const body = asRecord(asRecord(success["content"])?.["application/json"])?.["schema"];
  const bodyProperties = (): Spec => {
    const resolved = resolve(spec, body);
    const parts = Array.isArray(resolved["allOf"]) ? resolved["allOf"] : [resolved];
    return Object.assign({}, ...parts.map((part) => asRecord(resolve(spec, part)["properties"])));
  };
  return {
    itemFields: (property) => {
      const field = resolve(spec, bodyProperties()[property]);
      return propertyNames(spec, field["items"] ?? field);
    },
    parameters: (Array.isArray(operation["parameters"]) ? operation["parameters"] : []).map(
      (parameter) => {
        const resolved = resolve(spec, parameter);
        return `${String(resolved["name"])}${resolved["required"] === true ? "!" : ""}`;
      },
    ),
    successFields: propertyNames(spec, body),
  };
}

interface DocsContract {
  readonly parameters: readonly string[];
  readonly fields: readonly string[];
}

function docsContract(source: string): DocsContract {
  return {
    fields: [...source.matchAll(/<ResponseField name="([^"]+)"/gu)].map(([, name]) => name ?? ""),
    parameters: [...source.matchAll(/<ParamField (?:path|query)="([^"]+)"([^>]*)>/gu)]
      .map(([, name, rest]) => `${name ?? ""}${/\brequired\b/u.test(rest ?? "") ? "!" : ""}`)
      .toSorted(),
  };
}

function productCheck(name: string, run: (spec: Spec) => void): void {
  it(name, (): void => {
    run(productSpec);
  });
}

export { docsContract, docsSecurity, PRODUCT_ROOT, productCheck, productOperation };
