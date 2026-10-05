import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const PROJECT_ROOT = process.cwd();
const LINK_SOURCE_DIRECTORIES = ["api-reference", "guides"] as const;

interface LinkCluster {
  readonly minimumInboundSources: number;
  readonly routes: readonly string[];
  readonly snippet: string;
}

const LINK_CLUSTERS: readonly LinkCluster[] = [
  {
    minimumInboundSources: 20,
    snippet: "x-audience-community-api-links.mdx",
    routes: [
      "/api-reference/x/search-users",
      "/api-reference/x/search-autocomplete",
      "/api-reference/x/twitter-profile-lookup",
      "/api-reference/x/batch-users",
      "/api-reference/x/followers",
      "/api-reference/x/following",
      "/api-reference/x/follower-ids",
      "/api-reference/x/following-ids",
      "/api-reference/x/user-subscriptions",
      "/api-reference/x/user-affiliates",
      "/api-reference/x/user-similar",
      "/api-reference/x/verified-followers",
      "/api-reference/x/followers-you-know",
      "/api-reference/x/check-follower",
      "/api-reference/x/search-lists",
      "/api-reference/x/user-lists",
      "/api-reference/x/user-list-memberships",
      "/api-reference/x/list-members",
      "/api-reference/x/list-followers",
      "/api-reference/x/community-find",
      "/api-reference/x/community-popular",
      "/api-reference/x/community-topics",
      "/api-reference/x/community-suggested",
      "/api-reference/x/community-info",
      "/api-reference/x/community-members",
      "/api-reference/x/community-moderators",
      "/api-reference/x/community-tweets",
      "/api-reference/x/community-media",
      "/api-reference/x/community-search",
    ],
  },
  {
    minimumInboundSources: 19,
    snippet: "x-tweet-read-api-links.mdx",
    routes: [
      "/api-reference/x/get-tweet",
      "/api-reference/x/batch-tweets",
      "/api-reference/x/tweet-thread",
      "/api-reference/x/tweet-hidden-replies",
      "/api-reference/x/tweet-translation",
      "/api-reference/x/tweet-embed",
      "/api-reference/x/resolve-links",
      "/api-reference/x/tweet-subtitles",
      "/api-reference/x/get-article",
      "/api-reference/x/tweet-replies",
      "/api-reference/x/tweet-quotes",
      "/api-reference/x/favoriters",
      "/api-reference/x/retweeters",
      "/api-reference/x/tweet-repost-check",
      "/api-reference/x/user-tweets",
      "/api-reference/x/user-replies",
      "/api-reference/x/user-likes",
      "/api-reference/x/user-media",
      "/api-reference/x/user-highlights",
      "/api-reference/x/user-articles",
      "/api-reference/x/list-tweets",
      "/api-reference/x/trends",
      "/api-reference/x/trend-locations",
      "/api-reference/x/search-spaces",
      "/api-reference/x/get-space",
      "/api-reference/x/space-replay",
      "/api-reference/x/get-broadcast",
      "/api-reference/x/hashflags",
      "/api-reference/x/search-places",
      "/api-reference/x/download-media",
    ],
  },
  {
    minimumInboundSources: 15,
    snippet: "x-connected-account-api-links.mdx",
    routes: [
      "/api-reference/x/timeline",
      "/api-reference/x/notifications",
      "/api-reference/x/user-mentions",
      "/api-reference/x/bookmarks",
      "/api-reference/x/bookmark-folders",
      "/api-reference/x/dm-history",
    ],
  },
] as const;

function listMdxFiles(dir: string): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listMdxFiles(path);
    }
    return entry.name.endsWith(".mdx") ? [relative(PROJECT_ROOT, path)] : [];
  });
}

describe("internal link coverage", (): void => {
  it("keeps every previously underlinked X API route well connected", (): void => {
    expect.assertions(1);

    const pages = LINK_SOURCE_DIRECTORIES.flatMap((directory) =>
      listMdxFiles(join(PROJECT_ROOT, directory)),
    );
    const findings: string[] = [];

    for (const cluster of LINK_CLUSTERS) {
      const importPath = `/snippets/${cluster.snippet}`;
      const importers = pages.filter((file): boolean =>
        readFileSync(join(PROJECT_ROOT, file), "utf8").includes(importPath),
      );
      const snippet = readFileSync(join(PROJECT_ROOT, "snippets", cluster.snippet), "utf8");

      for (const route of cluster.routes) {
        if (!snippet.includes(`](${route})`)) {
          findings.push(`${cluster.snippet} does not link ${route}.`);
          continue;
        }

        const selfPage = `${route.slice(1)}.mdx`;
        const inboundSources = importers.filter((file): boolean => file !== selfPage).length;
        if (inboundSources < cluster.minimumInboundSources) {
          findings.push(
            `${route} has ${inboundSources} cluster sources; minimum is ${cluster.minimumInboundSources}.`,
          );
        }
      }
    }

    expect(findings).toStrictEqual([]);
  });
});
