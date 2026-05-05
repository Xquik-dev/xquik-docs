import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const MIN_DESCRIPTION_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 160;

interface NavigationGroup {
  readonly anchors?: readonly NavigationItem[];
  readonly groups?: readonly NavigationItem[];
  readonly pages?: readonly NavigationItem[];
  readonly tabs?: readonly NavigationItem[];
}

type NavigationItem = string | NavigationGroup;

interface DocsConfig {
  readonly navigation: NavigationGroup;
}

interface MetadataFinding {
  readonly file: string;
  readonly issue: string;
}

function flattenNavigationPages(item: NavigationItem): readonly string[] {
  if (typeof item === 'string') {
    return [normalizePagePath(item)];
  }

  return [
    ...(item.anchors ?? []),
    ...(item.groups ?? []),
    ...(item.pages ?? []),
    ...(item.tabs ?? []),
  ].flatMap(flattenNavigationPages);
}

function normalizePagePath(page: string): string {
  return page
    .replace(/^\/+/u, '')
    .replace(/\.mdx?$/u, '')
    .replace(/#.*$/u, '');
}

function frontmatter(source: string): string | undefined {
  return /^---\n([\s\S]*?)\n---/u.exec(source)?.[1];
}

function frontmatterValue(metadata: string, key: string): string | undefined {
  const match = new RegExp(
    `^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.+))$`,
    'mu',
  ).exec(metadata);
  return match?.[1] ?? match?.[2] ?? match?.[3]?.trim();
}

function navigationPages(): readonly string[] {
  const docsConfig = JSON.parse(
    readFileSync('docs.json', 'utf8'),
  ) as DocsConfig;
  return [...new Set(flattenNavigationPages(docsConfig.navigation))];
}

function collectMetadataFindings(): readonly MetadataFinding[] {
  const findings: MetadataFinding[] = [];

  for (const page of navigationPages()) {
    const file = `${page}.mdx`;
    const metadata = frontmatter(readFileSync(file, 'utf8'));
    if (metadata === undefined) {
      findings.push({ file, issue: 'Missing frontmatter.' });
      continue;
    }

    const title = frontmatterValue(metadata, 'title');
    if (title === undefined || title.trim() === '') {
      findings.push({ file, issue: 'Missing title.' });
    }

    const description = frontmatterValue(metadata, 'description');
    if (description === undefined || description.trim() === '') {
      findings.push({ file, issue: 'Missing description.' });
      continue;
    }

    if (description.length < MIN_DESCRIPTION_LENGTH) {
      findings.push({
        file,
        issue: `Description is ${description.length} characters; minimum is ${MIN_DESCRIPTION_LENGTH}.`,
      });
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      findings.push({
        file,
        issue: `Description is ${description.length} characters; maximum is ${MAX_DESCRIPTION_LENGTH}.`,
      });
    }
  }

  return findings;
}

describe('SEO metadata', (): void => {
  it('keeps every navigation page title and description usable for search previews', (): void => {
    expect.assertions(1);

    expect(collectMetadataFindings()).toStrictEqual([]);
  });
});
