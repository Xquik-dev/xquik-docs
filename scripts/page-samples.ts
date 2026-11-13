import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";

import { Glob } from "bun";
import { z } from "zod";

import { codeMarkup } from "./lib/code-names.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const IMAGES = "images/samples";
const START = "{/* OUTPUT SAMPLE START */}";
const END = "{/* OUTPUT SAMPLE END */}";
const OLD_IMPORT = /\nimport \{ OutputSample \} from "\/snippets\/output-sample\.mdx";\n/u;
const API = "https://xquik.com/api/v1/";
const CURL_BLOCK = /```(?:bash|sh|shell)[^\n]*\n([\s\S]*?)```/gu;
const URL_ARG = /curl\b[^\n]*?(?:-G\s+)?"?(https:\/\/xquik\.com\/api\/v1\/[^\s"\\]+)"?/u;
const URLENCODED = /--data-urlencode\s+"([^"=]+)=([^"]*)"/gu;
const OWN_VALUE =
  /\bYOUR_(?!KEY_HERE\b)|\$[A-Za-z{(]|\/(?:extractions|events|webhooks|draws|drafts|monitors|account-connection|write-actions|styles|bookmarks|dm|accounts|account|credits|followers-you-know)\b|\/likes\b/u;
const KEY_HEADER = /-H\s+"x-api-key:[^"]*"/gu;
const WRITE = /-X\s*(?:POST|PUT|PATCH|DELETE)|\s-d\s|--data\s/u;
const SAMPLE_BLOCK = new RegExp(String.raw`\n?${escape(START)}[\s\S]*?${escape(END)}\n?`, "u");
const MAX_TEXT = 280;
const MAX_CELL = 48;
const ROWS = 3;
const SMALL = 680;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T/u;
const TRAILING_LINKS = /(?:\s*https:\/\/t\.co\/\w+)+\s*$/u;
const LISTS = ["results", "classes"];
const PREFERRED = [
  "name",
  "verdict",
  "title",
  "text",
  "username",
  "query",
  "rank",
  "state",
  "status",
  "count",
  "memberCount",
  "followers",
  "createdAt",
];

const ACCOUNT = z.looseObject({
  id: z.string().optional(),
  name: z.string(),
  username: z.string(),
  profilePicture: z.string().optional(),
  description: z.string().optional(),
  followers: z.number().optional(),
  following: z.number().optional(),
  statusesCount: z.number().optional(),
});
const MEDIA = z.looseObject({
  type: z.string().optional(),
  url: z.string().optional(),
  mediaUrl: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  altText: z.string().optional(),
});
const POST = z.looseObject({
  id: z.string(),
  text: z.string(),
  author: ACCOUNT,
  replyCount: z.number().optional(),
  retweetCount: z.number().optional(),
  likeCount: z.number().optional(),
  viewCount: z.number().optional(),
  possiblySensitive: z.boolean().optional(),
  media: z.array(MEDIA).optional(),
});

type Account = z.infer<typeof ACCOUNT>;
type Post = z.infer<typeof POST>;

interface Picture {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

type Sample =
  | { readonly kind: "post"; readonly post: Post; readonly answers?: string | undefined }
  | { readonly kind: "profile"; readonly profile: Account }
  | {
      readonly kind: "table";
      readonly columns: readonly string[];
      readonly rows: readonly string[][];
    };

function escape(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\/]/gu, String.raw`\$&`);
}

function sampleCall(page: string): string | undefined {
  for (const [, block = ""] of page.matchAll(CURL_BLOCK)) {
    const code = block.split(/\n\s*\n/u).find((command) => URL_ARG.test(command)) ?? "";
    const url = URL_ARG.exec(code)?.[1];
    if (url === undefined || WRITE.test(code) || OWN_VALUE.test(code.replace(KEY_HEADER, "")))
      continue;
    const query = [...code.matchAll(URLENCODED)].map(
      ([, key = "", value = ""]) => `${key}=${encodeURIComponent(value)}`,
    );
    return query.length === 0 ? url : `${url}${url.includes("?") ? "&" : "?"}${query.join("&")}`;
  }
  return undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function records(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  const lists = Object.entries(value).filter(
    (entry): entry is [string, unknown[]] => Array.isArray(entry[1]) && entry[1].length > 0,
  );
  const list = lists.find(([key]) => LISTS.includes(key)) ?? lists[0];
  if (list !== undefined) return list[1];
  const entries = Object.entries(value);
  const nested = entries.filter(([, entry]) => isRecord(entry));
  if (nested.length === 1) return records(nested[0]?.[1]);
  if (nested.length > 1 && nested.length === entries.length)
    return nested.map(([name, entry]) => ({ name, ...(isRecord(entry) ? entry : {}) }));
  return [value];
}

function scalar(value: unknown): string | undefined {
  if (typeof value === "string" && ISO_TIME.test(value))
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  if (typeof value === "string")
    return value.length > MAX_CELL ? `${value.slice(0, MAX_CELL - 1)}…` : value;
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (typeof value === "boolean") return String(value);
  return undefined;
}

const LOOKUP = z.looseObject({ author: z.unknown(), tweet: z.looseObject({}) });
const ANALYZED = z.looseObject({
  tweet: z.unknown(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

function sampleOf(body: unknown): Sample | undefined {
  const lookup = LOOKUP.safeParse(body);
  const rows = lookup.success
    ? [{ ...lookup.data.tweet, author: lookup.data.author }]
    : records(body);
  const analyzed = ANALYZED.safeParse(rows[0]);
  if (analyzed.success) {
    const post = POST.safeParse(analyzed.data.tweet);
    const answers = Object.entries(analyzed.data.answers)
      .map(([question, answer]) => `${question} ${scalar(answer) ?? ""}`)
      .join(", ");
    if (post.success) return { kind: "post", post: post.data, answers };
  }
  const post = POST.safeParse(rows[0]);
  if (post.success) return { kind: "post", post: post.data };
  const profile = ACCOUNT.safeParse(rows[0]);
  if (profile.success && profile.data.profilePicture !== undefined)
    return { kind: "profile", profile: profile.data };
  const objects = rows.filter(
    (row): row is Record<string, unknown> => typeof row === "object" && row !== null,
  );
  const shown = Object.keys(objects[0] ?? {}).filter((key) =>
    objects.every((row) => scalar(row[key]) !== undefined),
  );
  const columns = [
    ...PREFERRED.filter((key) => shown.includes(key)),
    ...shown.filter((key) => !PREFERRED.includes(key)),
  ].slice(0, 3);
  if (columns.length === 0) return undefined;
  return {
    kind: "table",
    columns,
    rows: objects.slice(0, ROWS).map((row) => columns.map((key) => scalar(row[key]) ?? "")),
  };
}

async function saved(url: string, alt: string, width: number, height: number): Promise<Picture> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${String(response.status)} ${url}`);
  const extension =
    (response.headers.get("content-type") ?? "image/jpeg").split("/")[1]?.replace("jpeg", "jpg") ??
    "jpg";
  const name = `${createHash("sha256").update(url).digest("hex").slice(0, 16)}.${extension}`;
  await Bun.write(`${ROOT}${IMAGES}/${name}`, await response.arrayBuffer());
  return { src: `/${IMAGES}/${name}`, width, height, alt };
}

async function authorProps(account: Account): Promise<SampleAccount> {
  const avatar = await saved(
    (account.profilePicture ?? "").replace("_normal.", "_bigger."),
    "",
    73,
    73,
  );
  return { name: account.name, handle: account.username, avatar: avatar.src };
}

function shortText(text: string): string {
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text;
}

const COMPACT = new Intl.NumberFormat("en", { notation: "compact" });

function counts(
  entries: ReadonlyArray<readonly [string, number | undefined]>,
): Array<[string, string]> {
  return entries.flatMap(([label, value]) =>
    value === undefined ? [] : [[label, COMPACT.format(value)]],
  );
}

async function sampleProps(
  sample: Sample,
): Promise<Pick<SampleProps, "answers" | "post" | "profile" | "table">> {
  if (sample.kind === "table") return { table: { columns: sample.columns, rows: sample.rows } };
  if (sample.kind === "profile") {
    const { profile } = sample;
    return {
      profile: {
        ...(await authorProps(profile)),
        bio: profile.description ?? "",
        metrics: counts([
          ["Followers", profile.followers],
          ["Following", profile.following],
          ["Posts", profile.statusesCount],
        ]),
      },
    };
  }
  const { post } = sample;
  const photo =
    post.possiblySensitive === true
      ? undefined
      : post.media?.find((item) => item.type === "photo" && item.mediaUrl !== undefined);
  const media =
    photo === undefined
      ? undefined
      : await saved(
          `${photo.mediaUrl ?? photo.url ?? ""}?name=small`,
          photo.altText ?? `Media of the post by @${post.author.username}`,
          SMALL,
          Math.round((SMALL * (photo.height ?? 9)) / (photo.width ?? 16)),
        );
  return {
    post: {
      author: await authorProps(post.author),
      text: shortText(post.text.replace(TRAILING_LINKS, "")),
      ...(media === undefined ? {} : { media }),
      metrics: counts([
        ["Replies", post.replyCount],
        ["Reposts", post.retweetCount],
        ["Likes", post.likeCount],
        ["Views", post.viewCount],
      ]),
    },
    ...(sample.answers === undefined ? {} : { answers: sample.answers }),
  };
}

interface SampleAccount {
  readonly avatar: string;
  readonly handle: string;
  readonly name: string;
}

interface SamplePost {
  readonly author: SampleAccount;
  readonly media?: Picture | undefined;
  readonly metrics: ReadonlyArray<readonly [string, string]>;
  readonly text: string;
}

interface SampleProfile extends SampleAccount {
  readonly bio: string;
  readonly metrics: ReadonlyArray<readonly [string, string]>;
}

interface SampleTable {
  readonly columns: readonly string[];
  readonly rows: readonly string[][];
}

interface SampleProps {
  readonly answers?: string | undefined;
  readonly call: string;
  readonly read?: string | undefined;
  readonly post?: SamplePost | undefined;
  readonly profile?: SampleProfile | undefined;
  readonly table?: SampleTable | undefined;
}

const quoted = (value: string): string => `{${JSON.stringify(value)}}`;
const said = (value: string): string => `{${JSON.stringify(value)}}`;

function authorMarkup(account: SampleAccount): string {
  return [
    `<a className="xq-sample-author" href=${quoted(`https://x.com/${account.handle}`)}>`,
    `<img src=${quoted(account.avatar)} alt="" width="40" height="40" />`,
    `<span><strong>${said(account.name)}</strong><span>${said(`@${account.handle}`)}</span></span>`,
    "</a>",
  ].join("\n");
}

function metricsMarkup(metrics: ReadonlyArray<readonly [string, string]>): string {
  const items = metrics.map(
    ([label, value]) => `<li><strong>${said(value)}</strong> ${said(label)}</li>`,
  );
  return ['<ul className="xq-sample-metrics">', ...items, "</ul>"].join("\n");
}

function cardMarkup(props: SampleProps): string[] {
  const { post, profile, table, call } = props;
  if (post !== undefined) {
    const { media } = post;
    const picture =
      media === undefined
        ? []
        : [
            `<img className="xq-sample-media" src=${quoted(media.src)} alt=${quoted(media.alt)} width="${String(media.width)}" height="${String(media.height)}" loading="lazy" />`,
          ];
    return [
      '<article className="xq-sample-card">',
      authorMarkup(post.author),
      `<p>${said(post.text)}</p>`,
      ...picture,
      metricsMarkup(post.metrics),
      "</article>",
    ];
  }
  if (profile !== undefined)
    return [
      '<article className="xq-sample-card">',
      authorMarkup(profile),
      `<p>${said(profile.bio)}</p>`,
      metricsMarkup(profile.metrics),
      "</article>",
    ];
  if (table === undefined) return [];
  const head = table.columns.map((column) => `<th scope="col">${said(column)}</th>`).join("");
  const rows = table.rows.map(
    (row) => `<tr>${row.map((cell) => `<td>${said(cell)}</td>`).join("")}</tr>`,
  );
  return [
    `<div className="xq-sample-table" tabIndex={0} role="region" aria-label=${quoted(`Rows from ${call}`)}>`,
    `<table><thead><tr>${head}</tr></thead><tbody>`,
    ...rows,
    "</tbody></table>",
    "</div>",
  ];
}

function sampleMarkup(props: SampleProps): string {
  const caption =
    props.read === undefined
      ? `Example answer of ${codeMarkup(props.call)}, from its API reference`
      : `Live output of ${codeMarkup(props.call)}, read on ${props.read}${
          props.answers === undefined ? "" : `. Its answers are ${said(props.answers)}`
        }`;
  return [
    START,
    '<figure className="xq-sample">',
    ...cardMarkup(props),
    `<figcaption>${caption}</figcaption>`,
    "</figure>",
    END,
  ].join("\n");
}

function withSample(page: string, block: string): string {
  const bare = page.replace(SAMPLE_BLOCK, "\n").replace(OLD_IMPORT, "\n");
  const anchor = bare.indexOf("</CodeGroup>");
  const heading = bare.search(/\n(?:<section>\n+)?## /u);
  const at = anchor < 0 ? heading : anchor + "</CodeGroup>".length;
  return at < 0 ? `${bare}\n${block}\n` : `${bare.slice(0, at)}\n\n${block}\n${bare.slice(at)}`;
}

async function run(key: string, only: string, keep: boolean): Promise<void> {
  mkdirSync(`${ROOT}${IMAGES}`, { recursive: true });
  const read = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  for await (const file of new Glob("**/*.mdx").scan({ cwd: ROOT })) {
    if (file.startsWith("node_modules/") || file.startsWith("snippets/") || !file.includes(only))
      continue;
    const page = await Bun.file(`${ROOT}${file}`).text();
    const url = sampleCall(page);
    if (url === undefined || (keep && page.includes(START))) continue;
    const answer = await fetch(url, {
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(90_000),
    }).catch((error: unknown) => error);
    const sample =
      answer instanceof Response && answer.ok ? sampleOf(await answer.json()) : undefined;
    if (sample === undefined) {
      console.log(
        `skip ${answer instanceof Response ? String(answer.status) : String(answer)} ${file}`,
      );
      continue;
    }
    const call = `GET /${url.slice(API.length).split("?")[0] ?? ""}`;
    const props: SampleProps = { call, read, ...(await sampleProps(sample)) };
    await Bun.write(`${ROOT}${file}`, withSample(page, sampleMarkup(props)));
    console.log(`${sample.kind} ${file}`);
  }
}

const SDK_GUIDES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^sdks(?:\/(?!terraform)[a-z]+(?:-x-api-sdk)?)?\.mdx$/u, "/x/tweets/search"],
  [/^sdks\/[a-z]+-follower-export\.mdx$/u, "/x/users/nasa/followers"],
  [/^(?:alternatives\/[\w-]+|twitter-api-alternatives)\.mdx$/u, "/x/tweets/search"],
  [/^guides\/see-who-retweeted-a-tweet\.mdx$/u, "/x/tweets/2102882545427714266/retweeters"],
  [/^guides\/read-twitter-replies-without-account\.mdx$/u, "/x/tweets/2102882545427714266/replies"],
  [/^guides\/twitter-thread-unroll\.mdx$/u, "/x/tweets/2102882545427714266/thread"],
  [/^guides\/twitter-media-viewer\.mdx$/u, "/x/users/nasa/media"],
  [/^sdks\/[a-z]+-media-tweets\.mdx$/u, "/x/tweets/2102882545427714266"],
  [
    /^guides\/(?:twitter-advanced-search|twitter-archive-search|twitter-data-for-research|ag2|strands-agents|convex|supabase)\.mdx$/u,
    "/x/tweets/search",
  ],
  [/^mcp\/(?:overview|coding-agents|chatgpt|docs-mcp)\.mdx$/u, "/x/tweets/search"],
  [
    /^guides\/see-(?:twitter-likes|who-liked-my-tweet)\.mdx$/u,
    "/x/tweets/2102882545427714266/favoriters",
  ],
  [/^guides\/twitter-giveaway-picker\.mdx$/u, "/draws/1"],
  [/^guides\/x-api-typescript-content-types\.mdx$/u, "/x/tweets/2102882545427714266"],
  [/^guides\/x-api-typescript-account-types\.mdx$/u, "/x/users/nasa"],
  [
    /^(?:guides\/x-api-typescript-job-types|api-reference\/extractions\/parameters)\.mdx$/u,
    "/extractions/1",
  ],
  [/^guides\/x-api-typescript-monitor-types\.mdx$/u, "/monitors"],
  [
    /^(?:guides\/x-api-typescript-(?:request-|data-|shared-)?types|api-reference\/x\/tweet-(?:filters|analysis-parameters)|api-reference\/features|trust|non-affiliation|guides\/open-source-assurance)\.mdx$/u,
    "/x/tweets/search",
  ],
  [/^api-reference\/x\/user-filters\.mdx$/u, "/x/users/search"],
  [/^guides\/(?:architecture|actor-filtering-evidence)\.mdx$/u, "/x/tweets/search"],
  [
    /^(?:webhooks\/(?:verification(?:-go|-python)?|idempotency)|guides\/zapier-monitor-rest-hook)\.mdx$/u,
    "/events/1",
  ],
  [/^api-reference\/api-keys\/(?:update|revoke|bulk-revoke)\.mdx$/u, "/api-keys"],
  [/^api-reference\/support\/media\.mdx$/u, "/support/tickets/1"],
];

const READ_MENTION =
  /(?:(?:GET|POST|PUT|PATCH|DELETE) |\/api\/v1)(\/[a-z][\w{}.%-]*(?:\/[\w{}.%-]+)*)/gu;
const ENDPOINT = /^endpoint: "[A-Z]+ ([^"]+)"$/mu;

function templateMatcher(template: string): RegExp {
  return new RegExp(
    `^${template
      .split("/")
      .map((part) => (part.startsWith("{") ? "[^/]+" : escape(part)))
      .join("/")}$`,
    "u",
  );
}

async function borrow(only: string): Promise<void> {
  const samples: Array<{
    readonly matcher: RegExp;
    readonly length: number;
    readonly block: string;
  }> = [];
  const bare: string[] = [];
  for await (const file of new Glob("**/*.mdx").scan({ cwd: ROOT })) {
    if (file.startsWith("node_modules/") || file.startsWith("snippets/")) continue;
    const page = await Bun.file(`${ROOT}${file}`).text();
    const block = SAMPLE_BLOCK.exec(page)?.[0].trim();
    const template = ENDPOINT.exec(page)?.[1];
    if (block !== undefined && template !== undefined)
      samples.push({ matcher: templateMatcher(template), length: template.length, block });
    else if (block === undefined && file.includes(only)) bare.push(file);
  }
  samples.sort((left, right) => right.length - left.length);
  for (const file of bare) {
    const page = await Bun.file(`${ROOT}${file}`).text();
    const paths = [...page.matchAll(READ_MENTION)].map(([, path = ""]) => path.split("?")[0] ?? "");
    const guide = SDK_GUIDES.find(([pattern]) => pattern.test(file))?.[1];
    const found = [...(guide === undefined ? [] : [guide]), ...paths].flatMap((path) =>
      samples.filter(({ matcher }) => matcher.test(path)),
    )[0];
    if (found === undefined) continue;
    await Bun.write(`${ROOT}${file}`, withSample(page, found.block));
    console.log(`borrowed ${file}`);
  }
}

const ANY_ENDPOINT = /^endpoint: "([A-Z]+) ([^"]+)"$/mu;
const EXAMPLE = /### 20[01] example\s*\n\s*```json\n([\s\S]*?)\n```/u;
const RESPONSE_EXAMPLE =
  /#+ [^\n]*(?:Response|response|20[01])[^\n]*\n[\s\S]*?```json[^\n]*\n([\s\S]*?)\n```/u;

async function documented(only: string): Promise<void> {
  for await (const file of new Glob("**/*.mdx").scan({ cwd: ROOT })) {
    if (file.startsWith("node_modules/") || file.startsWith("snippets/") || !file.includes(only))
      continue;
    const page = await Bun.file(`${ROOT}${file}`).text();
    const endpoint = ANY_ENDPOINT.exec(page);
    const json = EXAMPLE.exec(page)?.[1] ?? RESPONSE_EXAMPLE.exec(page)?.[1];
    if (page.includes(START) || endpoint === null || json === undefined) continue;
    const parsed: unknown = (() => {
      try {
        const value: unknown = JSON.parse(json);
        return value;
      } catch {
        return undefined;
      }
    })();
    const sample = parsed === undefined ? undefined : sampleOf(parsed);
    if (sample === undefined || sample.kind !== "table" || sample.columns.length < 2) continue;
    const props: SampleProps = {
      call: `${endpoint[1] ?? ""} ${endpoint[2] ?? ""}`,
      ...(await sampleProps(sample)),
    };
    await Bun.write(`${ROOT}${file}`, withSample(page, sampleMarkup(props)));
    console.log(`documented ${file}`);
  }
}

const COMPONENT = /<OutputSample (.*) \/>/u;
const ATTRIBUTE = /^(\w+)=\{/u;

function componentProps(line: string): SampleProps {
  const entries: Array<[string, unknown]> = [];
  let rest = line;
  while (rest !== "") {
    const name = ATTRIBUTE.exec(rest)?.[1];
    if (name === undefined) throw new Error(`Unreadable sample ${rest.slice(0, 40)}`);
    rest = rest.slice(name.length + 2);
    let end = rest.indexOf("}");
    while (end >= 0) {
      const value: unknown = (() => {
        try {
          const read: unknown = JSON.parse(rest.slice(0, end));
          return read;
        } catch {
          return undefined;
        }
      })();
      if (value !== undefined) {
        entries.push([name, value]);
        rest = rest.slice(end + 1).trimStart();
        break;
      }
      end = rest.indexOf("}", end + 1);
    }
    if (end < 0) throw new Error(`Unreadable value of ${name}`);
  }
  return SAMPLE_PROPS.parse(Object.fromEntries(entries));
}

const PAIRS = z.array(z.tuple([z.string(), z.string()]));
const SAMPLE_ACCOUNT = z.object({ avatar: z.string(), handle: z.string(), name: z.string() });
const SAMPLE_PROPS = z.object({
  call: z.string(),
  read: z.string().optional(),
  post: z
    .object({
      author: SAMPLE_ACCOUNT,
      media: z
        .object({ src: z.string(), alt: z.string(), width: z.number(), height: z.number() })
        .optional(),
      metrics: PAIRS,
      text: z.string(),
    })
    .optional(),
  profile: SAMPLE_ACCOUNT.extend({ bio: z.string(), metrics: PAIRS }).optional(),
  table: z.object({ columns: z.array(z.string()), rows: z.array(z.array(z.string())) }).optional(),
});

async function rerender(): Promise<void> {
  for await (const file of new Glob("**/*.mdx").scan({ cwd: ROOT })) {
    if (file.startsWith("node_modules/")) continue;
    const page = await Bun.file(`${ROOT}${file}`).text();
    const line = COMPONENT.exec(page)?.[1];
    if (line === undefined) continue;
    await Bun.write(`${ROOT}${file}`, withSample(page, sampleMarkup(componentProps(line))));
    console.log(`rerendered ${file}`);
  }
}

if (process.argv.includes("--rerender")) {
  await rerender();
  process.exit(0);
}
const answerAt = process.argv.indexOf("--answer");
if (answerAt !== -1) {
  const [file = "", call = "", saved = ""] = process.argv.slice(answerAt + 1);
  const sample = sampleOf(await Bun.file(saved).json());
  if (sample === undefined) throw new Error(`No sample in ${saved}.`);
  const read = process.argv.includes("--documented")
    ? undefined
    : new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
  const page = await Bun.file(`${ROOT}${file}`).text();
  await Bun.write(
    `${ROOT}${file}`,
    withSample(page, sampleMarkup({ call, read, ...(await sampleProps(sample)) })),
  );
  console.log(`${sample.kind} ${file}`);
  process.exit(0);
}
const key = process.env["XQUIK_API_KEY"] ?? "";
if (!key.startsWith("xq_")) throw new Error("Set XQUIK_API_KEY to an Xquik API key.");
await run(key, process.argv[2] ?? "", !process.argv.includes("--refresh"));
await borrow(process.argv[2] ?? "");
await documented(process.argv[2] ?? "");
