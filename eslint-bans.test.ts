import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";

const ANY_VALUE = "xquik/no-any-returning-value";
const SCHEMA_TYPE = "xquik/no-schema-type-annotation";
const BOX = 'import { z } from "zod";\ntype Box = { n: number };\n';
const BOX_SCHEMA = "z.looseObject({ n: z.number() });\n";

const CASES: readonly { readonly file: string; readonly code: string; readonly rule: string }[] = [
  {
    file: "inline-config.ts",
    code: '/* eslint-disable */\nexport const n = JSON.parse("1") as number;\n',
    rule: "@typescript-eslint/consistent-type-assertions",
  },
  { file: "javascript.mjs", code: "export const a = 1;\n", rule: "no-restricted-syntax" },
  {
    file: "declaration.d.ts",
    code: "export type Box = { readonly n: number };\n",
    rule: "no-restricted-syntax",
  },
  {
    file: "ts-ignore.ts",
    code: "// @ts-ignore\nexport const a = 1;\n",
    rule: "@typescript-eslint/ban-ts-comment",
  },
  {
    file: "ts-expect-error.ts",
    code: "// @ts-expect-error\nexport const a: string = 1;\n",
    rule: "@typescript-eslint/ban-ts-comment",
  },
  {
    file: "ts-nocheck.ts",
    code: "// @ts-nocheck\nexport const a = 1;\n",
    rule: "@typescript-eslint/ban-ts-comment",
  },
  {
    file: "assertion.ts",
    code: "export const s = 1 as unknown as string;\n",
    rule: "@typescript-eslint/consistent-type-assertions",
  },
  {
    file: "method-signature.ts",
    code: "export type Sink<T> = { put(v: T): void };\n",
    rule: "@typescript-eslint/method-signature-style",
  },
  {
    file: "explicit-any.ts",
    code: "export const x: any = 1;\n",
    rule: "@typescript-eslint/no-explicit-any",
  },
  {
    file: "unsafe-argument.ts",
    code: 'export const n = Math.abs(JSON.parse("1"));\n',
    rule: "@typescript-eslint/no-unsafe-argument",
  },
  {
    file: "unsafe-assignment.ts",
    code: 'export const n: number = JSON.parse("1");\n',
    rule: "@typescript-eslint/no-unsafe-assignment",
  },
  {
    file: "unsafe-call.ts",
    code: 'JSON.parse("1")();\n',
    rule: "@typescript-eslint/no-unsafe-call",
  },
  {
    file: "unsafe-declaration-merging.ts",
    code: "export class Box {}\nexport interface Box {\n  readonly n: number;\n}\n",
    rule: "@typescript-eslint/no-unsafe-declaration-merging",
  },
  {
    file: "unsafe-member-access.ts",
    code: 'export const n: unknown = JSON.parse("{}").n;\n',
    rule: "@typescript-eslint/no-unsafe-member-access",
  },
  {
    file: "unsafe-return.ts",
    code: 'export function read() {\n  return JSON.parse("1");\n}\n',
    rule: "@typescript-eslint/no-unsafe-return",
  },
  {
    file: "catch-callback.ts",
    code: 'export const m = Promise.reject(new Error("x")).catch((e: Error) => e.message);\n',
    rule: "@typescript-eslint/use-unknown-in-catch-callback-variable",
  },
  { file: "eval.ts", code: 'eval("1");\n', rule: "no-eval" },
  {
    file: "overload.ts",
    code: "export function f(a: string): string;\nexport function f(a: unknown): unknown {\n  return a;\n}\n",
    rule: "no-restricted-syntax",
  },
  {
    file: "method-overload.ts",
    code: "export class C {\n  m(a: string): string;\n  m(a: unknown): unknown {\n    return a;\n  }\n}\n",
    rule: "no-restricted-syntax",
  },
  {
    file: "definite.ts",
    code: "let v!: number;\nv = 1;\nexport { v };\n",
    rule: "no-restricted-syntax",
  },
  {
    file: "declare.ts",
    code: "declare const x: number;\nexport { x };\n",
    rule: "no-restricted-syntax",
  },
  {
    file: "type-coverage-ignore.ts",
    code: "// type-coverage:ignore-next-line\nexport const a = 1;\n",
    rule: "no-warning-comments",
  },
  {
    file: "oxlint-disable.ts",
    code: "/* oxlint-disable */\nexport const a = 1;\n",
    rule: "no-warning-comments",
  },
  {
    file: "oxlint-enable.ts",
    code: "/* oxlint-enable */\nexport const a = 1;\n",
    rule: "no-warning-comments",
  },
  {
    file: "destructured-assign.ts",
    code: "const { assign } = Object;\nexport const a = assign;\n",
    rule: ANY_VALUE,
  },
  { file: "computed-assign.ts", code: 'export const a = Object["assign"];\n', rule: ANY_VALUE },
  {
    file: "global-assign.ts",
    code: "export const a = globalThis.Object.assign;\n",
    rule: ANY_VALUE,
  },
  {
    file: "renamed-import.ts",
    code: 'import { runInNewContext as run } from "node:vm";\nexport const r = run;\n',
    rule: ANY_VALUE,
  },
  {
    file: "computed-import.ts",
    code: 'import vm from "node:vm";\nexport const r = vm["runInNewContext"];\n',
    rule: ANY_VALUE,
  },
  {
    file: "from-entries.ts",
    code: 'const build: (e: [string, string][]) => { n: number } = Object.fromEntries;\nexport const n: number = build([["n", "text"]]).n;\n',
    rule: ANY_VALUE,
  },
  {
    file: "destructured-parse.ts",
    code: "const { parse } = JSON;\nexport const f: (s: string) => number = parse;\n",
    rule: ANY_VALUE,
  },
  { file: "require.ts", code: "export const load = require;\n", rule: ANY_VALUE },
  {
    file: "promise-any.ts",
    code: "export const read = (r: Response): (() => Promise<{ n: number }>) => r.json.bind(r);\n",
    rule: ANY_VALUE,
  },
  {
    file: "imported-zod-type.ts",
    code: `import { type ZodType } from "zod";\n${BOX}export const s: ZodType<Box> = ${BOX_SCHEMA}`,
    rule: SCHEMA_TYPE,
  },
  {
    file: "namespace-zod-type.ts",
    code: `import * as zod from "zod";\n${BOX}export const s: zod.ZodType<Box> = ${BOX_SCHEMA}`,
    rule: SCHEMA_TYPE,
  },
  {
    file: "zod-schema.ts",
    code: `${BOX}export const s: z.ZodSchema<Box> = ${BOX_SCHEMA}`,
    rule: SCHEMA_TYPE,
  },
  {
    file: "zod-v3-type.ts",
    code: 'import { z as v3 } from "zod/v3";\ntype Box = { n: number };\nexport const s: v3.ZodType<Box> = v3.object({ n: v3.number() });\n',
    rule: SCHEMA_TYPE,
  },
];

const ALLOWED = `import { runInNewContext } from "node:vm";
import { z } from "zod";
const box = ${BOX_SCHEMA}export type Box = z.infer<typeof box>;
export const parsed: Box = box.parse({ n: 1 });
export const merged = Object.assign({}, { a: 1 });
export const keys = Object.keys({ a: 1 });
export const value: unknown = JSON.parse("1");
export const result: unknown = runInNewContext("1");
export const pair = [1, "a"] as const;
export const abs = Math.abs;
const { keys: names } = Object;
export const named = names({ a: 1 });
export const isObject = (v: unknown): boolean => v instanceof Object || typeof Array === "function";
`;

const folder = mkdtempSync(join(tmpdir(), "eslint-bans-"));
afterAll((): void => rmSync(folder, { force: true, recursive: true }));

function reportedRules(): Map<string, readonly (string | null)[]> {
  symlinkSync(join(import.meta.dirname, "node_modules"), join(folder, "node_modules"));
  writeFileSync(
    join(folder, "tsconfig.json"),
    JSON.stringify({ extends: join(import.meta.dirname, "tsconfig.json"), include: ["**/*"] }),
  );
  writeFileSync(join(folder, "allowed.ts"), ALLOWED);
  for (const { file, code } of CASES) writeFileSync(join(folder, file), code);
  const { stdout } = spawnSync(
    join(import.meta.dirname, "node_modules/.bin/eslint"),
    [
      "--config",
      join(import.meta.dirname, "eslint.config.mts"),
      "--flag",
      "unstable_native_nodejs_ts_config",
      "--format",
      "json",
      ".",
    ],
    { cwd: folder, encoding: "utf8" },
  );
  const results = z
    .array(
      z.looseObject({
        filePath: z.string(),
        messages: z.array(z.looseObject({ ruleId: z.string().nullable() })),
      }),
    )
    .parse(JSON.parse(stdout));
  return new Map(
    results.map(({ filePath, messages }) => [
      basename(filePath),
      messages.map(({ ruleId }) => ruleId),
    ]),
  );
}

describe("eslint bans", (): void => {
  const rules = reportedRules();
  it("reports nothing in code that types every value", (): void => {
    expect(rules.get("allowed.ts")).toStrictEqual([]);
  });
  it.each(CASES)("reports $rule in $file", ({ file, rule }): void => {
    expect(rules.get(file)).toContain(rule);
  });
});
