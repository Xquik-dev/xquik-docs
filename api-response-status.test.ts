import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { collapseTableSpacing } from "./scripts/lib/documented-fields.ts";
import { z } from "zod";
import {
  operationAt,
  operations,
  parseOpenApi,
  type OpenApiDocument,
  type OpenApiOperation,
} from "./scripts/lib/openapi-schema.ts";

import {
  GENERATED_RESPONSE_EXAMPLES_END,
  GENERATED_RESPONSE_EXAMPLES_START,
  stripGeneratedResponseExamples,
} from "./scripts/lib/generated-response-examples";

const PROJECT_ROOT = process.cwd();
const spec = parseOpenApi(readFileSync(join(PROJECT_ROOT, "openapi.yaml"), "utf8"));
const OPERATIONS = Object.values(spec.paths ?? {}).flatMap((pathItem) =>
  operations(pathItem).map(([, operation]) => operation),
);
const WRITE_OPERATION_COUNT = OPERATIONS.filter(
  (operation) => operation["x-write-action"] !== undefined,
).length;
const NO_CONTENT_OPERATION_COUNT = OPERATIONS.filter(
  (operation) => operation.responses?.["204"] !== undefined,
).length;
const WRITE_ACTION_LIFECYCLE_SNIPPET_PATH = join(
  PROJECT_ROOT,
  "snippets/write-action-lifecycle-response.mdx",
);
const FRONTMATTER_API_PATTERN = /^endpoint:\s*"([A-Z]+) ([^"]+)"/mu;
const RESPONSE_STATUS_PATTERN = /(?:<Tab title="|^### |^- \*\*)(\d{3})\b/gmu;
const STATUS_CODE_PATTERN = /^\d{3}$/u;
const HTTP_METHODS: ReadonlySet<string> = new Set([
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "trace",
]);
const PAGELESS_OPERATIONS = ["GET /ask", "GET /credits/topup/redirect", "POST /ask"];
const PAGES_WITHOUT_OPERATION = [
  "api-reference/authentication.mdx",
  "api-reference/extractions/parameters.mdx",
  "api-reference/features.mdx",
  "api-reference/overview.mdx",
  "api-reference/x/tweet-analysis-parameters.mdx",
  "api-reference/x/tweet-filters.mdx",
  "api-reference/x/user-filters.mdx",
];
const OAUTH_OVERVIEW_OPERATIONS = [
  "GET /api/oauth/authorize",
  "POST /agent/identity",
  "POST /agent/identity/claim",
  "POST /api/oauth/register",
  "POST /api/oauth/revoke",
  "POST /api/oauth/token",
];
interface ApiDoc {
  readonly file: string;
  readonly method: string;
  readonly path: string;
  readonly source: string;
}

interface ResponseStatusFinding {
  readonly file: string;
  readonly issue: string;
  readonly operation: string;
  readonly status: string;
}

const apiReferenceFiles = [
  ...new Bun.Glob("api-reference/**/*.mdx").scanSync({
    cwd: PROJECT_ROOT,
    dot: true,
  }),
].sort();

function readApiDocs(): readonly ApiDoc[] {
  return apiReferenceFiles.flatMap((file) => {
    const pageSource = readFileSync(join(PROJECT_ROOT, file), "utf8");
    const source = pageSource.includes("<WriteActionLifecycleResponse />")
      ? `${pageSource}\n${readFileSync(WRITE_ACTION_LIFECYCLE_SNIPPET_PATH, "utf8")}`
      : pageSource;
    const match = FRONTMATTER_API_PATTERN.exec(pageSource);
    if (match?.[1] === undefined || match[2] === undefined) {
      return [];
    }
    return [{ file, method: match[1].toLowerCase(), path: match[2], source }];
  });
}

function successfulResponseStatuses(operation: OpenApiOperation): readonly string[] {
  return responseStatuses(operation).filter((status): boolean => status.startsWith("2"));
}

function documentedSuccessfulResponseStatuses(source: string): readonly string[] {
  return documentedResponseStatuses(source).filter((status): boolean => status.startsWith("2"));
}

function documentedResponseStatuses(source: string): readonly string[] {
  return [...source.matchAll(RESPONSE_STATUS_PATTERN)]
    .map((match): string => match[1] ?? "")
    .sort();
}

function generatedResponseBlock(source: string): string | undefined {
  const start = source.indexOf(GENERATED_RESPONSE_EXAMPLES_START);
  const end = source.indexOf(GENERATED_RESPONSE_EXAMPLES_END);
  if (start === -1 || end === -1 || end < start) {
    return undefined;
  }
  return source.slice(start, end);
}

function generatedStatuses(source: string): readonly string[] {
  const generated = generatedResponseBlock(source);
  if (generated === undefined) return [];

  return [...generated.matchAll(/^(?:### |- \*\*)(\d{3})\b/gmu)].map(
    (match): string => match[1] ?? "",
  );
}

function responseJson(
  source: string,
  status: string,
): Readonly<Record<string, unknown>> | undefined {
  const section = new RegExp(
    `^#{2,4} [^\\n]*\\b${status}\\b[^\\n]*\\n(.*?)(?=^#{2,4} |$(?![\\s\\S]))`,
    "msu",
  );
  const json = /```json[^\n]*\n(?<body>[\s\S]*?)\n```/u.exec(section.exec(source)?.[1] ?? "")
    ?.groups?.["body"];
  return json === undefined ? undefined : z.record(z.string(), z.unknown()).parse(JSON.parse(json));
}

function responseStatuses(operation: OpenApiOperation): readonly string[] {
  return Object.keys(operation.responses ?? {})
    .filter((status): boolean => STATUS_CODE_PATTERN.test(status))
    .sort();
}

function collectStatusFindings({
  docsStatusProvider,
  issuePrefix,
  spec,
  statusProvider,
}: {
  readonly docsStatusProvider: (source: string) => readonly string[];
  readonly issuePrefix: string;
  readonly spec: OpenApiDocument;
  readonly statusProvider: (operation: OpenApiOperation) => readonly string[];
}): readonly ResponseStatusFinding[] {
  const findings: ResponseStatusFinding[] = [];

  for (const apiDoc of readApiDocs()) {
    const operationLabel = `${apiDoc.method.toUpperCase()} ${apiDoc.path}`;
    const operation = operationAt(spec, apiDoc.path, apiDoc.method);
    if (operation === undefined) {
      findings.push({
        file: apiDoc.file,
        issue: "API reference frontmatter does not match openapi.yaml.",
        operation: operationLabel,
        status: apiDoc.path,
      });
      continue;
    }

    const openApiStatuses = statusProvider(operation);
    const docsStatuses = docsStatusProvider(apiDoc.source);

    for (const status of openApiStatuses.filter(
      (statusCode): boolean => !docsStatuses.includes(statusCode),
    )) {
      findings.push({
        file: apiDoc.file,
        issue: `OpenAPI ${issuePrefix}response status is missing from endpoint docs.`,
        operation: operationLabel,
        status,
      });
    }

    for (const status of docsStatuses.filter(
      (statusCode): boolean => !openApiStatuses.includes(statusCode),
    )) {
      findings.push({
        file: apiDoc.file,
        issue: `Endpoint docs include a ${issuePrefix}status not present in OpenAPI.`,
        operation: operationLabel,
        status,
      });
    }
  }

  return findings;
}

describe("API success response status documentation", (): void => {
  it.each([
    GENERATED_RESPONSE_EXAMPLES_START,
    GENERATED_RESPONSE_EXAMPLES_END,
    `${GENERATED_RESPONSE_EXAMPLES_END}\n${GENERATED_RESPONSE_EXAMPLES_START}`,
  ])("rejects incomplete or reversed response markers: %s", (source): void => {
    expect.assertions(1);
    expect(() => stripGeneratedResponseExamples(source)).toThrow(
      "Generated response example markers are incomplete.",
    );
  });

  it("preserves documents without generated response markers", (): void => {
    expect.assertions(1);
    expect(stripGeneratedResponseExamples("# Response\nHandwritten guidance.\n")).toBe(
      "# Response\nHandwritten guidance.\n",
    );
  });

  it.each([
    {
      docsStatusProvider: documentedSuccessfulResponseStatuses,
      issuePrefix: "success ",
      statusProvider: successfulResponseStatuses,
    },
    {
      docsStatusProvider: documentedResponseStatuses,
      issuePrefix: "",
      statusProvider: responseStatuses,
    },
  ])("matches $issuePrefix\u200bresponse tabs to OpenAPI", (providers): void => {
    expect.assertions(1);
    expect(collectStatusFindings({ ...providers, spec })).toStrictEqual([]);
  });

  it("gives every OpenAPI operation 1 page unless it is listed as page-less", (): void => {
    expect.assertions(2);

    const operations = Object.entries(spec.paths ?? {}).flatMap(([path, item]) =>
      Object.keys(item)
        .filter((method): boolean => HTTP_METHODS.has(method))
        .map((method): string => `${method.toUpperCase()} ${path}`),
    );
    const paged = readApiDocs().map(
      ({ method, path }): string => `${method.toUpperCase()} ${path}`,
    );
    const unnamed = apiReferenceFiles.filter(
      (file): boolean =>
        !FRONTMATTER_API_PATTERN.test(readFileSync(join(PROJECT_ROOT, file), "utf8")),
    );

    expect(
      [...paged, ...PAGELESS_OPERATIONS, ...OAUTH_OVERVIEW_OPERATIONS].toSorted(),
    ).toStrictEqual(operations.toSorted());
    expect(unnamed).toStrictEqual(PAGES_WITHOUT_OPERATION);
  });

  it("keeps each generated status once with no Panel", (): void => {
    expect.assertions(1);

    const findings = readApiDocs().flatMap((apiDoc): readonly string[] => {
      const statuses = generatedStatuses(apiDoc.source);
      return [
        ...(apiDoc.source.includes("<Panel>") ? [`${apiDoc.file}: page keeps a Panel.`] : []),
        ...(new Set(statuses).size === statuses.length
          ? []
          : [`${apiDoc.file}: a generated status repeats.`]),
      ];
    });

    expect(findings).toStrictEqual([]);
  });

  it("renders every 204 response as an empty body", (): void => {
    expect.assertions(2);

    const noContentPages = readApiDocs().filter((apiDoc): boolean =>
      apiDoc.source.includes("- **204** "),
    );
    const findings = noContentPages.flatMap((apiDoc): readonly string[] =>
      apiDoc.source.includes("- **204** `No response body.`")
        ? []
        : [`${apiDoc.file}: 204 item implies a response body.`],
    );

    expect(noContentPages).toHaveLength(NO_CONTENT_OPERATION_COUNT);
    expect(findings).toStrictEqual([]);
  });

  it("keeps write success examples aligned with each canonical action", (): void => {
    expect.assertions(2);

    const writeDocs = readApiDocs().flatMap((apiDoc) => {
      const action = operationAt(spec, apiDoc.path, apiDoc.method)?.["x-write-action"];
      return action === undefined ? [] : [{ action, apiDoc }];
    });
    const findings = writeDocs.flatMap(({ action, apiDoc }) =>
      ["200", "202"].flatMap((status): readonly string[] => {
        const example = responseJson(apiDoc.source, status);
        return example?.["action"] === action
          ? []
          : [
              `${apiDoc.file}: ${status} action is ${String(example?.["action"])}; expected ${action}.`,
            ];
      }),
    );

    expect(writeDocs).toHaveLength(WRITE_OPERATION_COUNT);
    expect(findings).toStrictEqual([]);
  });

  it("keeps every write page idempotent and lifecycle-aware", (): void => {
    expect.assertions(2);

    const pages = readApiDocs().filter(
      ({ file }): boolean =>
        file.startsWith("api-reference/x-write/") && !file.endsWith("/get-write-action-status.mdx"),
    );
    const findings = pages.flatMap(({ file, source }): readonly string[] => {
      const guidance = [
        [true, '-H "Idempotency-Key:'],
        [true, "Idempotency-Key` | `string` | Yes |"],
        [true, "<WriteActionLifecycleResponse />"],
        [true, "Replay the same account, target, payload, and media after a lost response."],
        [true, "Retry only when `safeToRetry` is `true`."],
        [true, "Keep the original key for that replay."],
        [true, "Use a new key when `nextAction.requiresNewIdempotencyKey` is `true`."],
        [true, "After HTTP `429`, wait for `Retry-After`. Follow `nextAction`."],
        [false, "Safe to retry with exponential backoff."],
        [false, "Preserve the same key."],
      ] as const;
      return guidance
        .filter(
          ([required, snippet]): boolean =>
            collapseTableSpacing(source).includes(snippet) !== required,
        )
        .map(([, snippet]): string => `${file}: incorrect retry guidance ${snippet}`);
    });

    expect(pages).toHaveLength(WRITE_OPERATION_COUNT);
    expect(findings).toStrictEqual([]);
  });
});
