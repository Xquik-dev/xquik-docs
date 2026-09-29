import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { it } from "vitest";

type Spec = Record<string, unknown>;

/** Tells a skipped product check apart from a passed one in the test output. */
const PRODUCT_CHECKOUT_HINT =
  "needs the product checkout: set XQUIK_PRODUCT_ROOT or clone xquik beside this repository";

function asRecord(value: unknown): Spec | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Spec)
    : undefined;
}

/**
 * The product checkout the contract tests compare with: XQUIK_PRODUCT_ROOT or
 * XQUIK_ROOT when set, else `xquik` beside this repository's main checkout, so
 * a git worktree of this repository finds it too. Undefined when there is no
 * product OpenAPI spec there.
 */
function findProductRoot(): string | undefined {
  const configured = process.env["XQUIK_PRODUCT_ROOT"] ?? process.env["XQUIK_ROOT"] ?? "";
  if (configured !== "") return configured;
  const commonDir = execFileSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: import.meta.dirname, encoding: "utf8" },
  ).trim();
  const sibling = join(dirname(dirname(commonDir)), "xquik");
  return existsSync(join(sibling, "openapi.yaml")) ? sibling : undefined;
}

const PRODUCT_ROOT = findProductRoot();

/** The product's published OpenAPI spec, its stable public contract. */
const productSpec: Spec | undefined =
  PRODUCT_ROOT === undefined
    ? undefined
    : asRecord(Bun.YAML.parse(readFileSync(join(PRODUCT_ROOT, "openapi.yaml"), "utf8")));

/** Follows local `$ref` pointers such as `#/components/responses/NotFound`. */
function resolve(spec: Spec, value: unknown): Spec {
  let current = asRecord(value) ?? {};
  for (let hops = 0; typeof current["$ref"] === "string" && hops < 10; hops += 1) {
    const path = current["$ref"].replace(/^#\//u, "").split("/");
    current = asRecord(path.reduce<unknown>((node, key) => asRecord(node)?.[key], spec)) ?? {};
  }
  return current;
}

/** The property names of a schema, merging `allOf` parts. */
function propertyNames(spec: Spec, schema: unknown): string[] {
  const resolved = resolve(spec, schema);
  const parts = Array.isArray(resolved["allOf"]) ? resolved["allOf"] : [resolved];
  return parts
    .flatMap((part) => Object.keys(asRecord(resolve(spec, part)["properties"]) ?? {}))
    .toSorted();
}

interface ProductOperation {
  /** Parameter names, each marked `!` when required. */
  readonly parameters: readonly string[];
  /** Response status codes in spec order. */
  readonly statuses: readonly string[];
  /** Top-level property names of the success response body. */
  readonly successFields: readonly string[];
  /** Resolves a property of the success body & returns its item's fields. */
  readonly itemFields: (property: string) => readonly string[];
}

/** An operation of `spec` by `operationId`, or undefined. */
function findOperation(spec: Spec, operationId: string): Spec | undefined {
  return Object.values(asRecord(spec["paths"]) ?? {})
    .flatMap((path) => Object.values(asRecord(path) ?? {}))
    .map((candidate) => asRecord(candidate))
    .find((candidate) => candidate?.["operationId"] === operationId);
}

/** The `security` of an operation of this repository's spec, aliases resolved. */
function docsSecurity(operationId: string): unknown {
  const source = readFileSync(join(import.meta.dirname, "openapi.yaml"), "utf8");
  return findOperation(asRecord(Bun.YAML.parse(source)) ?? {}, operationId)?.["security"];
}

/** An operation of the product spec by `operationId`, or undefined. */
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
    statuses: Object.keys(responses),
    successFields: propertyNames(spec, body),
  };
}

interface DocsContract {
  /** Path & query parameter names, each marked `!` when required, sorted. */
  readonly parameters: readonly string[];
  /** Response tab status codes in page order. */
  readonly statuses: readonly string[];
  /** Every documented response field name. */
  readonly fields: readonly string[];
}

/** What an API reference page documents about its operation. */
function docsContract(source: string): DocsContract {
  return {
    fields: [...source.matchAll(/<ResponseField name="([^"]+)"/gu)].map(([, name]) => name ?? ""),
    parameters: [...source.matchAll(/<ParamField (?:path|query)="([^"]+)"([^>]*)>/gu)]
      .map(([, name, rest]) => `${name ?? ""}${/\brequired\b/u.test(rest ?? "") ? "!" : ""}`)
      .toSorted(),
    statuses: [...source.matchAll(/<Tab title="(\d{3})"/gu)].map(([, status]) => status ?? ""),
  };
}

/**
 * Registers a check against the product spec, skipped with a hint in its
 * title when no product checkout is found.
 */
function productCheck(name: string, run: (spec: Spec) => void): void {
  const spec = productSpec;
  it.skipIf(spec === undefined)(
    spec === undefined ? `${name} (${PRODUCT_CHECKOUT_HINT})` : name,
    (): void => {
      if (spec !== undefined) run(spec);
    },
  );
}

export { docsContract, docsSecurity, PRODUCT_ROOT, productCheck, productOperation };
