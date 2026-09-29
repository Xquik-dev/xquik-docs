import { getChecksSorted, runChecks } from "afdocs";
import { loadConfig } from "afdocs/helpers";
import type { AgentDocsConfig, CheckResult, RunnerOptions } from "afdocs";
import { beforeAll, describe, expect, it } from "vitest";

const LIVE_AGENT_DOCS_TIMEOUT_MS = 28_000;

function runnerOptions(config: AgentDocsConfig): Partial<RunnerOptions> {
  const inferredStrategy =
    config.pages && config.pages.length > 0 && !config.options?.samplingStrategy
      ? "curated"
      : undefined;

  return {
    ...(config.checks === undefined ? {} : { checkIds: config.checks }),
    ...(config.skipChecks === undefined ? {} : { skipCheckIds: config.skipChecks }),
    ...config.options,
    ...(inferredStrategy ? { samplingStrategy: inferredStrategy } : {}),
    ...(config.pages === undefined ? {} : { curatedPages: config.pages }),
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const record = asRecord(item);
        return record ? [record] : [];
      })
    : [];
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function formatSize(value: number): string {
  return value >= 1_000 ? `${Math.round(value / 1_000)}K chars` : `${value} chars`;
}

function formatPageIssue(page: Record<string, unknown>): string {
  const parts = [asString(page.status), asString(page.classification), asString(page.error)];
  if (page.found === false) {
    parts.push("missing directive");
  }

  const positionPercent = asNumber(page.positionPercent);
  if (positionPercent !== undefined) {
    parts.push(`${Math.round(positionPercent * 100)}% body position`);
  }

  const missingPercent = asNumber(page.missingPercent);
  if (missingPercent !== undefined) {
    parts.push(`${Math.round(missingPercent)}% missing`);
  }

  const convertedCharacters = asNumber(page.convertedCharacters);
  if (convertedCharacters !== undefined) {
    parts.push(`${formatSize(convertedCharacters)} after HTML conversion`);
  }

  const characters = asNumber(page.characters);
  if (characters !== undefined) {
    parts.push(formatSize(characters));
  }

  return parts.filter((part) => part && part !== "pass").join(", ") || "content differs";
}

function formatPageDetails(result: CheckResult): string[] {
  const details = asRecord(result.details);
  const pageResults = asRecordArray(details?.pageResults);
  const issuePages = pageResults.filter((page) => page.status !== "pass");

  return issuePages.map((page) => {
    const url =
      asString(page.url) ?? asString(page.mdUrl) ?? asString(page.testUrl) ?? "unknown URL";
    return `  - ${url}: ${formatPageIssue(page)}`;
  });
}

function formatResult(result: CheckResult): string {
  const lines = [`[${result.status}] ${result.message}`];
  if (result.status !== "pass" && result.status !== "skip") {
    lines.push(...formatPageDetails(result));
  }
  return lines.join("\n");
}

function isExpectedSectionHeaderSkip(result: CheckResult): boolean {
  return (
    result.status === "skip" &&
    result.message.endsWith(
      "page(s) with tabs found, but no section headers inside tab panels to evaluate",
    )
  );
}

/**
 * The served markdown keeps Mintlify components such as `<Card title="...">`
 * as MDX. afdocs reads their titles & inner markdown links as raw HTML, so
 * text the markdown holds can count as missing. The markdown text of a page:
 * its component titles, and its prose with links reduced to their text & tags,
 * code marks & bold marks removed.
 */
function markdownText(markdown: string): string {
  const titles = [...markdown.matchAll(/\btitle="([^"]*)"/gu)].map((match) => match[1]);
  const prose = markdown
    .replaceAll(/!?\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replaceAll(/<\/?[A-Za-z][^>]*>/gu, " ")
    .replaceAll(/`|\*\*|__/gu, "");
  return [...titles, prose].join(" ").replaceAll(/\s+/gu, " ");
}

/**
 * Whether every text a parity warning names as missing is in that page's
 * served markdown, so the warning comes from MDX components alone.
 */
async function parityWarningIsMdxOnly(result: CheckResult): Promise<boolean> {
  const pages = asRecordArray(asRecord(result.details)?.pageResults).filter(
    (page) => page.status === "warn",
  );
  const checks = await Promise.all(
    pages.map(async (page): Promise<boolean> => {
      const url = asString(page.url);
      const samples = Array.isArray(page.sampleDiffs) ? page.sampleDiffs : [];
      if (url === undefined || samples.length === 0) return false;
      const mdUrl = new URL(url);
      mdUrl.pathname =
        mdUrl.pathname === "/" ? "/index.md" : `${mdUrl.pathname.replace(/\/$/u, "")}.md`;
      const response = await fetch(mdUrl).catch((): undefined => undefined);
      if (!response?.ok) return false;
      const text = markdownText(await response.text());
      return samples.every(
        (sample) =>
          typeof sample === "string" &&
          text.includes(sample.replace(/^- /u, "").replaceAll(/\s+/gu, " ").trim()),
      );
    }),
  );
  return pages.length > 0 && checks.every(Boolean);
}

function acceptsResult(
  checkId: string,
  result: CheckResult,
  mdxOnlyParityWarning: boolean,
): boolean {
  if (result.status === "pass") {
    return true;
  }
  if (checkId === "markdown-content-parity") {
    return result.status === "warn" && mdxOnlyParityWarning;
  }
  if (checkId === "auth-alternative-access") {
    return result.status === "skip";
  }
  if (checkId === "section-header-quality") {
    return isExpectedSectionHeaderSkip(result);
  }
  return false;
}

describe("Agent-Friendly Documentation", (): void => {
  let configuredCheckIds = new Set<string>();
  let resultsByCheck: Map<string, CheckResult> | undefined;
  let mdxOnlyParityWarning = false;

  beforeAll(async (): Promise<void> => {
    const config = await loadConfig();
    configuredCheckIds = new Set(config.checks);
    const report = await runChecks(config.url, runnerOptions(config));
    resultsByCheck = new Map(
      report.results.map((result): [string, CheckResult] => [result.id, result]),
    );
    const parity = resultsByCheck.get("markdown-content-parity");
    mdxOnlyParityWarning = parity?.status === "warn" ? await parityWarningIsMdxOnly(parity) : false;
  }, LIVE_AGENT_DOCS_TIMEOUT_MS);

  for (const check of getChecksSorted()) {
    it(check.id, (): void => {
      expect.assertions(1);

      const result = resultsByCheck?.get(check.id);
      if (!result) {
        expect(configuredCheckIds.has(check.id)).toBe(false);
        return;
      }

      const message = formatResult(result);
      process.stdout.write(`${message}\n`);
      expect(acceptsResult(check.id, result, mdxOnlyParityWarning), message).toBe(true);
    });
  }
});
