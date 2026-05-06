import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const PROJECT_ROOT = process.cwd();
const PRODUCT_ROOT =
  process.env['XQUIK_PRODUCT_ROOT'] ?? join(PROJECT_ROOT, '..', 'xquik');
const DOCS_OPENAPI_PATH = join(PROJECT_ROOT, 'openapi.yaml');
const PRODUCT_OPENAPI_PATH = join(PRODUCT_ROOT, 'openapi.yaml');
const PRODUCT_MPP_PRICING_PATH = join(PRODUCT_ROOT, 'lib/mpp/pricing.ts');
const HTTP_METHODS = new Set(['delete', 'get', 'patch', 'post', 'put']);
const PRODUCT_MPP_ROUTE_PATTERN = /\[\s*'(?<route>[A-Z]+ \/api\/v1[^']+)'/gu;

interface OpenApiOperation {
  readonly security?: readonly Record<string, readonly string[]>[];
  readonly ['x-payment-info']?: unknown;
}

interface OpenApiSpec {
  readonly paths?: Record<string, Record<string, OpenApiOperation>>;
}

interface OperationMetadata {
  readonly anonymous: boolean;
  readonly key: string;
  readonly paymentEnabled: boolean;
}

interface MppFinding {
  readonly issue: string;
  readonly operation: string;
}

function parseYaml(source: string): OpenApiSpec {
  const bun = globalThis as {
    readonly Bun?: { readonly YAML?: { parse: (yaml: string) => unknown } };
  };
  const parse = bun.Bun?.YAML?.parse;
  if (parse === undefined) {
    throw new Error('Bun.YAML.parse is required for OpenAPI docs tests.');
  }
  return parse(source) as OpenApiSpec;
}

function readOpenApi(path: string): OpenApiSpec {
  return parseYaml(readFileSync(path, 'utf8'));
}

function normalizeOperationKey(method: string, path: string): string {
  const productPath = path.replaceAll(
    /\{(?<name>[A-Za-z][A-Za-z0-9_]*)\}/gu,
    '[$<name>]',
  );
  return `${method.toUpperCase()} /api/v1${productPath}`;
}

function hasAnonymousSecurity(operation: OpenApiOperation): boolean {
  return (operation.security ?? []).some(
    (entry): boolean => Object.keys(entry).length === 0,
  );
}

function collectOperations(spec: OpenApiSpec): readonly OperationMetadata[] {
  const operations: OperationMetadata[] = [];
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) {
        continue;
      }
      operations.push({
        anonymous: hasAnonymousSecurity(operation),
        key: normalizeOperationKey(method, path),
        paymentEnabled: operation['x-payment-info'] !== undefined,
      });
    }
  }
  return operations.sort((left, right): number =>
    left.key.localeCompare(right.key),
  );
}

function paymentOperationKeys(spec: OpenApiSpec): ReadonlySet<string> {
  return new Set(
    collectOperations(spec)
      .filter((operation): boolean => operation.paymentEnabled)
      .map((operation): string => operation.key),
  );
}

function productMppRouteKeys(): ReadonlySet<string> {
  const source = readFileSync(PRODUCT_MPP_PRICING_PATH, 'utf8');
  return new Set(
    [...source.matchAll(PRODUCT_MPP_ROUTE_PATTERN)]
      .map((match): string => match.groups?.['route'] ?? '')
      .filter((route): boolean => route.length > 0),
  );
}

function compareSets(
  actual: ReadonlySet<string>,
  expected: ReadonlySet<string>,
): readonly MppFinding[] {
  const findings: MppFinding[] = [];
  for (const operation of actual) {
    if (!expected.has(operation)) {
      findings.push({ issue: 'Unexpected payment metadata.', operation });
    }
  }
  for (const operation of expected) {
    if (!actual.has(operation)) {
      findings.push({ issue: 'Missing payment metadata.', operation });
    }
  }
  return findings.sort((left, right): number =>
    left.operation.localeCompare(right.operation),
  );
}

describe('MPP payment metadata', (): void => {
  it('keeps anonymous OpenAPI security limited to payment-enabled operations', (): void => {
    expect.assertions(1);

    const anonymousWithoutPayment = collectOperations(
      readOpenApi(DOCS_OPENAPI_PATH),
    )
      .filter(
        (operation): boolean => operation.anonymous && !operation.paymentEnabled,
      )
      .map((operation): string => operation.key);

    expect(anonymousWithoutPayment).toStrictEqual([]);
  });

  it(
    'maps docs payment metadata to product MPP routes when product source is available',
    (): void => {
      expect.assertions(1);

      const productSourceExists = existsSync(PRODUCT_MPP_PRICING_PATH);
      if (!productSourceExists) {
        expect(productSourceExists).toBe(false);
        return;
      }

      expect(
        compareSets(
          paymentOperationKeys(readOpenApi(DOCS_OPENAPI_PATH)),
          productMppRouteKeys(),
        ),
      ).toStrictEqual([]);
    },
  );

  it(
    'keeps docs and product OpenAPI payment metadata aligned when product OpenAPI is available',
    (): void => {
      expect.assertions(1);

      const productOpenApiExists = existsSync(PRODUCT_OPENAPI_PATH);
      if (!productOpenApiExists) {
        expect(productOpenApiExists).toBe(false);
        return;
      }

      expect(
        compareSets(
          paymentOperationKeys(readOpenApi(DOCS_OPENAPI_PATH)),
          paymentOperationKeys(readOpenApi(PRODUCT_OPENAPI_PATH)),
        ),
      ).toStrictEqual([]);
    },
  );
});
