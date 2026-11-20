const CHANGELOG_PAGE = "changelog";
const ARCHIVE_GROUP = "Changelog archive";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const BLOCK =
  /<Update label="([A-Z][a-z]+) (\d{4})" description="([^"]*)">\n([\s\S]*?)\n<\/Update>\n?/gu;

interface Period {
  readonly body: string;
  readonly label: string;
  readonly page: string;
  readonly version: string;
}

interface Changelog {
  readonly header: string;
  readonly periods: readonly Period[];
}

interface Split {
  readonly pages: ReadonlyMap<string, string>;
  readonly root: string;
}

function periodPage(month: string, year: string): string {
  const index = MONTHS.findIndex((name) => name === month);
  if (index === -1) throw new Error(`Changelog label "${month} ${year}" names no month.`);
  return `${CHANGELOG_PAGE}/${year}-${String(index + 1).padStart(2, "0")}`;
}

function parseChangelog(source: string): Changelog {
  const start = source.indexOf("<Update ");
  if (start === -1) throw new Error("The changelog has no <Update> block.");
  const periods = [...source.slice(start).matchAll(BLOCK)].map(
    ([, month = "", year = "", version = "", body = ""]): Period => ({
      body,
      label: `${month} ${year}`,
      page: periodPage(month, year),
      version,
    }),
  );
  const parsed = periods.map((period) => block(period)).join("\n");
  if (parsed.trimEnd() !== source.slice(start).trimEnd())
    throw new Error("Each changelog <Update> block needs a Month YYYY label and a closing tag.");
  return { header: source.slice(0, start), periods };
}

function block({ body, label, version }: Period): string {
  return `<Update label="${label}" description="${version}">\n${body}\n</Update>\n`;
}

function stub(period: Period): Period {
  return { ...period, body: `\nRead the [${period.label} changes](/${period.page}).\n` };
}

function isStub(period: Period): boolean {
  return period.body === stub(period).body;
}

function archivePage(period: Period): string {
  const title = `Xquik changelog for ${period.label} X (Twitter) API`;
  const description = `What changed in Xquik in ${period.label}, across the X (Twitter) REST API, MCP server, SDKs, tweet search, follower exports, monitors, webhooks & extractions.`;
  return [
    "---",
    `title: "${title}"`,
    `sidebarTitle: "${period.label}"`,
    `description: "${description}"`,
    "---",
    "",
    'import LlmsDirective from "/snippets/llms-directive.mdx";',
    "",
    "<LlmsDirective />",
    "",
    block(period),
  ].join("\n");
}

function splitChangelog(source: string, archived: ReadonlyMap<string, string>): Split {
  const { header, periods } = parseChangelog(source);
  const pages = new Map(archived);
  const kept = periods.map((period, index): Period => {
    if (index === 0 || isStub(period)) return period;
    const page = archivePage(period);
    const existing = pages.get(period.page);
    if (existing !== undefined && existing !== page)
      throw new Error(`${period.page}.mdx already holds ${period.label}. Move new entries there.`);
    pages.set(period.page, page);
    return stub(period);
  });
  for (const { label, page } of kept.slice(1))
    if (!pages.has(page)) throw new Error(`${label} links to ${page}.mdx, which is missing.`);
  return { pages, root: `${header}${kept.map((period) => block(period)).join("\n")}` };
}

function archiveNewestFirst(pages: readonly string[]): readonly string[] {
  return pages.toSorted().toReversed();
}

export { ARCHIVE_GROUP, CHANGELOG_PAGE, archiveNewestFirst, parseChangelog, splitChangelog };
