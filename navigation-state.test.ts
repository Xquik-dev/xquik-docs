import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

interface NavigationNode {
  readonly expanded?: boolean;
  readonly group?: string;
  readonly groups?: readonly NavigationNode[];
  readonly pages?: readonly NavigationItem[];
  readonly tab?: string;
  readonly tabs?: readonly NavigationNode[];
}

type NavigationItem = string | NavigationNode;

interface DocsConfig {
  readonly navigation: NavigationNode;
}

const X_API_GROUPS = [
  'Users',
  'Tweets',
  'Relationships',
  'Engagement',
  'Timeline & DMs',
  'Communities',
  'Lists',
] as const;

function docsConfig(): DocsConfig {
  return JSON.parse(readFileSync('docs.json', 'utf8')) as DocsConfig;
}

function objectItems(items: readonly NavigationItem[] | undefined): readonly NavigationNode[] {
  return (items ?? []).filter(
    (item): item is NavigationNode => typeof item !== 'string',
  );
}

function findTab(config: DocsConfig, tabName: string): NavigationNode {
  const tab = (config.navigation.tabs ?? []).find(
    (item): boolean => item.tab === tabName,
  );

  if (tab === undefined) {
    throw new Error(`Missing navigation tab: ${tabName}`);
  }

  return tab;
}

function findGroup(parent: NavigationNode, groupName: string): NavigationNode {
  const group = (parent.groups ?? []).find(
    (item): boolean => item.group === groupName,
  );

  if (group === undefined) {
    throw new Error(`Missing navigation group: ${groupName}`);
  }

  return group;
}

describe('navigation default state', (): void => {
  it('keeps X API endpoint sections expanded in the sidebar', (): void => {
    expect.assertions(2);

    const apiReferenceTab = findTab(docsConfig(), 'API Reference');
    const xApiGroup = findGroup(apiReferenceTab, 'X API');
    const xApiSubgroups = objectItems(xApiGroup.pages);
    const collapsedGroups = xApiSubgroups
      .filter((group): boolean => group.expanded !== true)
      .map((group): string => group.group ?? '(unnamed)');

    expect(xApiSubgroups.map((group): string | undefined => group.group)).toStrictEqual([
      ...X_API_GROUPS,
    ]);
    expect(collapsedGroups).toStrictEqual([]);
  });
});
