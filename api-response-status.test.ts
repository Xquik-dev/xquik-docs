import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const PROJECT_ROOT = process.cwd();
const API_REFERENCE_DIR = join(PROJECT_ROOT, 'api-reference');
const FRONTMATTER_API_PATTERN = /^api:\s*"([A-Z]+) ([^"]+)"/mu;
const RESPONSE_TAB_PATTERN = /<Tab title="(\d{3})\b/gu;
const STATUS_CODE_PATTERN = /^\d{3}$/u;

interface ApiDoc {
  readonly file: string;
  readonly method: string;
  readonly path: string;
  readonly source: string;
}

interface OpenApiOperation {
  readonly responses?: Record<string, unknown>;
}

interface OpenApiSpec {
  readonly paths?: Record<string, Record<string, OpenApiOperation>>;
}

interface ResponseStatusFinding {
  readonly file: string;
  readonly issue: string;
  readonly operation: string;
  readonly status: string;
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

function listApiReferenceFiles(dir: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listApiReferenceFiles(fullPath));
      continue;
    }
    if (entry.name.endsWith('.mdx')) {
      files.push(relative(PROJECT_ROOT, fullPath));
    }
  }
  return files.sort();
}

function readApiDocs(): readonly ApiDoc[] {
  return listApiReferenceFiles(API_REFERENCE_DIR).flatMap((file) => {
    const source = readFileSync(join(PROJECT_ROOT, file), 'utf8');
    const match = FRONTMATTER_API_PATTERN.exec(source);
    if (match?.[1] === undefined || match[2] === undefined) {
      return [];
    }
    return [
      {
        file,
        method: match[1].toLowerCase(),
        path: match[2],
        source,
      },
    ];
  });
}

function successfulResponseStatuses(
  operation: OpenApiOperation,
): readonly string[] {
  return Object.keys(operation.responses ?? {})
    .filter(
      (status): boolean =>
        STATUS_CODE_PATTERN.test(status) && status.startsWith('2'),
    )
    .sort();
}

function documentedSuccessfulResponseTabs(source: string): readonly string[] {
  return [...source.matchAll(RESPONSE_TAB_PATTERN)]
    .map((match): string => match[1] ?? '')
    .filter((status): boolean => status.startsWith('2'))
    .sort();
}

function operationKey(apiDoc: ApiDoc): string {
  return `${apiDoc.method.toUpperCase()} ${apiDoc.path}`;
}

function getOperation(
  spec: OpenApiSpec,
  apiDoc: ApiDoc,
): OpenApiOperation | undefined {
  return spec.paths?.[apiDoc.path]?.[apiDoc.method];
}

function collectResponseStatusFindings(
  spec: OpenApiSpec,
): readonly ResponseStatusFinding[] {
  const findings: ResponseStatusFinding[] = [];

  for (const apiDoc of readApiDocs()) {
    const operation = getOperation(spec, apiDoc);
    if (operation === undefined) {
      findings.push({
        file: apiDoc.file,
        issue: 'API reference frontmatter does not match openapi.yaml.',
        operation: operationKey(apiDoc),
        status: apiDoc.path,
      });
      continue;
    }

    const openApiStatuses = successfulResponseStatuses(operation);
    const docsStatuses = documentedSuccessfulResponseTabs(apiDoc.source);

    for (const status of openApiStatuses.filter(
      (statusCode): boolean => !docsStatuses.includes(statusCode),
    )) {
      findings.push({
        file: apiDoc.file,
        issue: 'OpenAPI success response status is missing from endpoint docs.',
        operation: operationKey(apiDoc),
        status,
      });
    }

    for (const status of docsStatuses.filter(
      (statusCode): boolean => !openApiStatuses.includes(statusCode),
    )) {
      findings.push({
        file: apiDoc.file,
        issue: 'Endpoint docs include a success status not present in OpenAPI.',
        operation: operationKey(apiDoc),
        status,
      });
    }
  }

  return findings;
}

describe('API success response status documentation', (): void => {
  it('keeps endpoint success response tabs aligned with OpenAPI status codes', (): void => {
    expect.assertions(1);

    const spec = parseYaml(readFileSync(join(PROJECT_ROOT, 'openapi.yaml'), 'utf8'));
    expect(collectResponseStatusFindings(spec)).toStrictEqual([]);
  });
});
