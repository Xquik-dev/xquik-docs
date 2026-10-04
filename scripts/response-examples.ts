#!/usr/bin/env bun
/**
 * `bun run sync:response-examples` writes each API reference page's response
 * tabs from `openapi.yaml`. `bun run check:response-examples` fails when a
 * page's tabs differ from what the spec gives.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import {
  GENERATED_RESPONSE_EXAMPLES_END as END,
  GENERATED_RESPONSE_EXAMPLES_START as START,
} from "./lib/generated-response-examples.ts";

type Node = Record<string, unknown>;

const METHODS = new Set(["delete", "get", "head", "options", "patch", "post", "put"]);
const ERROR_FIELDS = [
  "error",
  "message",
  "code",
  "status",
  "retryAfter",
  "charged",
  "chargedCredits",
  "retryable",
  "safeToRetry",
  "writeActionId",
  "statusUrl",
];
const MAX_DEPTH = 7;
const MAX_PROPERTIES = 12;
const MAX_SUCCESS_FIELDS = 10;
const MAX_ERROR_FIELDS = 6;
const MAX_NESTED_FIELDS = 5;
const FRONTMATTER = /^---\r?\n.*?\r?\n---\r?\n/su;
const IMPORTS = /^(?:\r?\n)*(?:import [^\r\n]+;\r?\n)+/u;
const API_LINE = /^api: "([A-Z]+) ([^"]+)"$/mu;

function isNode(value: unknown): value is Node {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function list(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/** A property of an object, or an item of an array, else undefined. */
function field(value: unknown, key: string): unknown {
  if (Array.isArray(value)) return value[Number(key)];
  return isNode(value) ? value[key] : undefined;
}

/** The value a local `$ref` such as `#/components/schemas/Tweet` points at. */
function reference(document: unknown, ref: string): unknown {
  if (!ref.startsWith("#/")) {
    throw new Error(`Only local OpenAPI references are supported: ${ref}`);
  }
  return ref
    .slice(2)
    .split("/")
    .reduce<unknown>(
      (node, key) => field(node, key.replaceAll("~1", "/").replaceAll("~0", "~")),
      document,
    );
}

/** An example value for `schema`, from its own examples or its shape. */
function schemaExample(
  document: unknown,
  schema: unknown,
  depth: number,
  visited: readonly string[],
): unknown {
  if (schema === undefined || schema === null || depth > MAX_DEPTH) return {};
  const node = isNode(schema) ? schema : {};
  for (const key of ["example", "const", "default"]) {
    if (key in node) return node[key];
  }
  const choices = list(node["enum"]);
  if (choices.length > 0) return choices[0];
  const ref = node["$ref"];
  if (typeof ref === "string") {
    return visited.includes(ref)
      ? {}
      : schemaExample(document, reference(document, ref), depth + 1, [...visited, ref]);
  }
  const next = (child: unknown): unknown => schemaExample(document, child, depth + 1, visited);
  if ("allOf" in node) {
    return list(node["allOf"])
      .map(next)
      .reduce<unknown>(
        (merged, part) =>
          isNode(merged) && isNode(part) ? { ...merged, ...part } : (part ?? merged),
        {},
      );
  }
  const variant = field(node["oneOf"], "0") ?? field(node["anyOf"], "0");
  if (variant !== undefined && variant !== null) return next(variant);
  if (node["type"] === "array") return [next(node["items"])];
  if (node["type"] === "object" || isNode(node["properties"])) {
    const properties = Object.entries(isNode(node["properties"]) ? node["properties"] : {});
    const required = properties.filter(([name]) => list(node["required"]).includes(name));
    return Object.fromEntries(
      (required.length > 0 ? required : properties)
        .slice(0, MAX_PROPERTIES)
        .map(([name, property]) => [name, next(property)]),
    );
  }
  if (node["type"] === "boolean") return false;
  if (node["type"] === "integer" || node["type"] === "number") return 0;
  if (node["format"] === "date-time") return "2026-08-01T09:00:00.000Z";
  if (node["format"] === "uri" || node["format"] === "url") return "https://example.com/resource";
  return "<string>";
}

/** `value` with 1 item per array & at most `limit` fields, 5 once nested. */
function compact(value: unknown, limit: number, depth: number): unknown {
  if (Array.isArray(value)) return value.slice(0, 1).map((item) => compact(item, limit, depth + 1));
  if (!isNode(value)) return value;
  const fields = depth > 0 ? Math.min(limit, MAX_NESTED_FIELDS) : limit;
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, fields)
      .map(([name, item]) => [name, compact(item, limit, depth + 1)]),
  );
}

/** The media type a response tab shows: JSON when the response offers it. */
function shownContent(content: unknown): readonly [string, unknown] | undefined {
  const entries = Object.entries(isNode(content) ? content : {});
  return (
    entries.find(([type]) => type === "application/json") ??
    entries.find(([type]) => type.includes("json")) ??
    entries[0]
  );
}

/** The fields an error tab shows: the documented error fields, or the 1st 6. */
function errorExample(value: Node): Node {
  const named = ERROR_FIELDS.filter((name) => name in value).map((name): [string, unknown] => [
    name,
    value[name],
  ]);
  const shown = named.length > 0 ? named : Object.entries(value).slice(0, MAX_ERROR_FIELDS);
  return Object.fromEntries(
    shown.map(([name, item]) => [name, compact(item, MAX_NESTED_FIELDS, 1)]),
  );
}

/** The example of a media type: its own, its 1st named one, or its schema's. */
function mediaExample(document: unknown, media: unknown): unknown {
  const examples = field(media, "examples");
  const [firstExample] = Object.values(isNode(examples) ? examples : {});
  return (
    field(media, "example") ??
    field(firstExample, "value") ??
    schemaExample(document, field(media, "schema"), 0, [])
  );
}

/** The code block language & body of 1 response tab. */
function responseExample(
  document: unknown,
  response: unknown,
  status: string,
  action: unknown,
): { readonly language: string; readonly value: unknown } {
  const ref = field(response, "$ref");
  const resolved = typeof ref === "string" ? reference(document, ref) : response;
  if (resolved === undefined || resolved === null) {
    throw new Error(`OpenAPI reference not found: ${String(ref)}`);
  }
  if (status === "204") return { language: "text", value: "No response body." };
  const shown = shownContent(field(resolved, "content"));
  if (shown === undefined) {
    return { language: "text", value: field(resolved, "description") ?? "No response body." };
  }
  const [type, media] = shown;
  const language = type.includes("json") ? "json" : "text";
  const example = mediaExample(document, media);
  if (status.startsWith("4") || status.startsWith("5")) {
    return { language, value: isNode(example) ? errorExample(example) : example };
  }
  const succeeded = status === "200" || status === "202";
  const named =
    succeeded && isNode(example) && "action" in example && typeof action === "string"
      ? { ...example, action }
      : example;
  return { language, value: compact(named, MAX_SUCCESS_FIELDS, 0) };
}

/** The generated block of an operation's response tabs, markers included. */
function responseBlock(document: unknown, operation: unknown, scope: string): string {
  const responses = field(operation, "responses");
  const tabs = Object.entries(isNode(responses) ? responses : {}).map(([status, response]) => {
    const { language, value } = responseExample(
      document,
      response,
      status,
      field(operation, "x-write-action"),
    );
    const text =
      language === "json" || typeof value !== "string"
        ? JSON.stringify(value, undefined, 2)
        : value;
    const body = `    ${text.replaceAll("\n", "\n    ")}`;
    const id = `response-${scope.replaceAll("/", "-")}-${status}`;
    return `  <Tab title="${status}" id="${id}">\n\n    \`\`\`${language}\n${body}\n    \`\`\`\n\n  </Tab>`;
  });
  return `${START}\n\n<Panel>\n\n<Tabs defaultTabIndex={0} sync={false}>\n\n${tabs.join("\n\n")}\n</Tabs>\n\n</Panel>\n${END}`;
}

/** `source` with `block` after its imports, replacing an earlier block. */
function replaceBlock(source: string, block: string): string {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if ((start === -1) !== (end === -1) || end < start) {
    throw new Error("Generated response example markers are incomplete.");
  }
  const page = start === -1 ? source : source.slice(0, start) + source.slice(end + END.length);
  const frontmatter = page.match(FRONTMATTER)?.[0];
  if (frontmatter === undefined) {
    throw new Error("API reference page has no frontmatter insertion point.");
  }
  const imports = page.slice(frontmatter.length).match(IMPORTS)?.[0];
  if (imports === undefined) {
    throw new Error("API reference page has no import insertion point.");
  }
  const insertion = frontmatter.length + imports.length;
  return `${page.slice(0, insertion)}\n${block}\n${page.slice(insertion).replace(/^\r?\n*/u, "")}`;
}

/**
 * Checks or writes the response tabs of every API reference page under `root`
 * & returns the summary line. Throws with 1 line per stale or unknown page, &
 * writes nothing unless every page resolves.
 */
function run(root: string, check: boolean): string {
  const document: unknown = Bun.YAML.parse(readFileSync(join(root, "openapi.yaml"), "utf8"));
  const pages = readdirSync(join(root, "api-reference"), { encoding: "utf8", recursive: true })
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => join(root, "api-reference", file))
    .toSorted();
  const findings: string[] = [];
  const changes: { readonly path: string; readonly source: string }[] = [];
  let pageCount = 0;
  let statusCount = 0;
  for (const path of pages) {
    const source = readFileSync(path, "utf8");
    const api = source.match(API_LINE);
    if (api === null) continue;
    const file = relative(root, path).split(sep).join("/");
    const method = (api[1] ?? "").toLowerCase();
    const operation = field(field(field(document, "paths"), api[2] ?? ""), method);
    if (operation === undefined || operation === null || !METHODS.has(method)) {
      findings.push(`${file}: OpenAPI operation not found.`);
      continue;
    }
    const scope = file.replace(/^api-reference\//u, "").replace(/\.mdx$/u, "");
    const next = replaceBlock(source, responseBlock(document, operation, scope));
    const responses = field(operation, "responses");
    pageCount += 1;
    statusCount += Object.keys(isNode(responses) ? responses : {}).length;
    if (next === source) continue;
    if (check) findings.push(`${file}: response examples are stale.`);
    changes.push({ path, source: next });
  }
  if (findings.length > 0) throw new Error(findings.join("\n"));
  if (!check) for (const change of changes) writeFileSync(change.path, change.source);
  return `${check ? "Verified" : "Synchronized"} ${String(statusCount)} response statuses across ${String(pageCount)} API pages.\n`;
}

if (import.meta.main) {
  try {
    process.stdout.write(run(".", process.argv.includes("--check")));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

export { replaceBlock, run };
