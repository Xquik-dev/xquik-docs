import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const INTERNAL_DOCS_FILES = ['DOCS_QUALITY_POLL.md'] as const;

function mintignoreEntries(): ReadonlySet<string> {
  return new Set(
    readFileSync('.mintignore', 'utf8')
      .split(/\r?\n/u)
      .map((line): string => line.trim())
      .filter((line): boolean => line !== '' && !line.startsWith('#')),
  );
}

function gitignoreEntries(): ReadonlySet<string> {
  return new Set(
    readFileSync('.gitignore', 'utf8')
      .split(/\r?\n/u)
      .map((line): string => line.trim())
      .filter((line): boolean => line !== '' && !line.startsWith('#')),
  );
}

describe('Internal docs handoff ignore rules', (): void => {
  it('keeps internal docs poll files out of the public docs build', (): void => {
    expect.assertions(2);

    const ignoredFiles = mintignoreEntries();
    const mintlifyExposedFiles = INTERNAL_DOCS_FILES.filter(
      (file): boolean => !ignoredFiles.has(file),
    );
    const gitIgnoredFiles = gitignoreEntries();
    const gitExposedFiles = INTERNAL_DOCS_FILES.filter(
      (file): boolean => !gitIgnoredFiles.has(file),
    );

    expect(mintlifyExposedFiles).toStrictEqual([]);
    expect(gitExposedFiles).toStrictEqual([]);
  });
});
