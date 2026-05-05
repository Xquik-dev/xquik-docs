import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const PROJECT_ROOT = process.cwd();
const API_REFERENCE_DIR = join(PROJECT_ROOT, 'api-reference');
const FRONTMATTER_API_PATTERN = /^api:\s*"([A-Z]+) ([^"]+)"/mu;

interface ContentFinding {
  readonly file: string;
  readonly issue: string;
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

function isApiEndpointPage(source: string): boolean {
  return FRONTMATTER_API_PATTERN.test(source);
}

function collectContentFindings(): readonly ContentFinding[] {
  const findings: ContentFinding[] = [];

  for (const file of listApiReferenceFiles(API_REFERENCE_DIR)) {
    const source = readFileSync(join(PROJECT_ROOT, file), 'utf8');
    if (!isApiEndpointPage(source)) {
      continue;
    }

    if (!source.includes('<CodeGroup>')) {
      findings.push({ file, issue: 'Missing copy-ready code examples.' });
    }

    if (!/^## Headers\b/mu.test(source)) {
      findings.push({ file, issue: 'Missing headers section.' });
    }

    if (!/^## Response\b/mu.test(source)) {
      findings.push({ file, issue: 'Missing response section.' });
    }

    if (!/<Tab title="2\d\d\b/u.test(source)) {
      findings.push({ file, issue: 'Missing successful response tab.' });
    }
  }

  return findings;
}

describe('API endpoint content quality', (): void => {
  it('keeps endpoint pages useful beyond generated signatures', (): void => {
    expect.assertions(1);

    expect(collectContentFindings()).toStrictEqual([]);
  });
});
