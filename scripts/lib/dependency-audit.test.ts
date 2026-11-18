import { readFileSync } from "node:fs";

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { audit, EXCEPTION_DAYS, EXCEPTIONS, exceptionFor } from "./dependency-audit.ts";
import type { Exception, Finding } from "./dependency-audit.ts";

const DAY_MS = 86_400_000;
const ROUND = Date.parse("2026-11-17T19:00:00Z");
const EXPIRY = Date.parse("2026-12-01T18:00:00Z");
const ROOT = new URL("../../", import.meta.url);

function scan(
  name: string,
  version: string,
  id: string,
  events: readonly Readonly<Record<string, string>>[],
): unknown {
  return {
    results: [
      {
        packages: [
          {
            package: { name, version },
            vulnerabilities: [{ affected: [{ package: { name }, ranges: [{ events }] }], id }],
          },
        ],
      },
    ],
  };
}

const PICOMATCH = scan("picomatch", "4.0.7", "GHSA-fc5q-39xc-vjpf", [
  { introduced: "0" },
  { last_affected: "4.0.7" },
]);

describe("audit", () => {
  it("passes GHSA-fc5q-39xc-vjpf on picomatch 4.0.7 while its patch holds & no fixed release exists", (): void => {
    expect.assertions(1);
    expect(audit(PICOMATCH, ROUND)).toStrictEqual({
      failures: 0,
      lines: [
        "audit: GHSA-fc5q-39xc-vjpf on picomatch 4.0.7 in package-lock.json passes until 2026-12-01T18:00:00Z or its first fixed release, since patches/picomatch@4.0.7.patch applies micromatch/picomatch#237.",
      ],
    });
  });

  it.each([
    ["once its exception expires", PICOMATCH, EXPIRY],
    [
      "once a fixed release exists",
      scan("picomatch", "4.0.7", "GHSA-fc5q-39xc-vjpf", [{ introduced: "0" }, { fixed: "4.0.8" }]),
      ROUND,
    ],
    [
      "on a picomatch version its patch never touched",
      scan("picomatch", "4.0.6", "GHSA-fc5q-39xc-vjpf", []),
      ROUND,
    ],
    [
      "for another advisory on the patched picomatch",
      scan("picomatch", "4.0.7", "GHSA-other", []),
      ROUND,
    ],
    ["for any other package", scan("vite", "8.3.6", "GHSA-fc5q-39xc-vjpf", []), ROUND],
  ] as const)("fails GHSA findings %s", (_name, report, now): void => {
    expect.assertions(1);
    expect(audit(report, now).failures).toBe(1);
  });

  it("fails a license outside the allowlist", (): void => {
    expect.assertions(1);
    expect(
      audit(
        {
          results: [
            {
              packages: [
                {
                  license_violations: ["GPL-3.0-only"],
                  package: { name: "copyleft", version: "1.0.0" },
                },
              ],
            },
          ],
        },
        ROUND,
      ),
    ).toStrictEqual({
      failures: 1,
      lines: [
        "audit: copyleft 1.0.0 (GPL-3.0-only) in package-lock.json has a license outside the allowlist.",
      ],
    });
  });

  it("keeps each exception to 14 days, on the version the lockfile installs, with its patch applied at install", (): void => {
    expect.assertions(1);
    const manifest = z
      .object({ scripts: z.record(z.string(), z.string()) })
      .parse(JSON.parse(readFileSync(new URL("package.json", ROOT), "utf8")));
    const lock = z
      .object({ packages: z.record(z.string(), z.object({ version: z.string().optional() })) })
      .parse(JSON.parse(readFileSync(new URL("package-lock.json", ROOT), "utf8")));
    expect(
      EXCEPTIONS.map((exception) => [
        Date.parse(exception.expiresAt) - Date.parse(exception.addedAt) <= EXCEPTION_DAYS * DAY_MS,
        lock.packages[`node_modules/${exception.name}`]?.version,
        manifest.scripts["install:frozen"]?.includes(exception.patch),
      ]),
    ).toStrictEqual(EXCEPTIONS.map((exception) => [true, exception.version, true]));
  });

  it("excuses only the exact advisory, package & version, before expiry & any fixed release", (): void => {
    expect.assertions(1);
    const exception: Exception = {
      addedAt: "1970-01-01T00:00:00Z",
      expiresAt: "1970-01-15T00:00:00Z",
      exposure: "none",
      fix: "fix",
      id: "GHSA-a",
      name: "left",
      patch: "patches/left@1.0.0.patch",
      version: "1.0.0",
    };
    const finding = fc.record({
      fixReleased: fc.boolean(),
      id: fc.constantFrom("GHSA-a", "GHSA-b"),
      name: fc.constantFrom("left", "right"),
      version: fc.constantFrom("1.0.0", "2.0.0"),
    });
    const run = fc.check(
      fc.property(
        finding,
        fc.integer({ max: 28 * DAY_MS, min: 0 }),
        (drawn: Readonly<Finding>, now: number) => {
          const exact =
            drawn.id === "GHSA-a" &&
            drawn.name === "left" &&
            drawn.version === "1.0.0" &&
            !drawn.fixReleased &&
            now < 14 * DAY_MS;
          return (exceptionFor(drawn, now, [exception]) !== undefined) === exact;
        },
      ),
      { seed: 20_261_117 },
    );
    expect(run.counterexample).toBeNull();
  });
});

const PROBE = `
const picomatch = require("picomatch");
const patterns = JSON.parse(process.env.PICOMATCH_PATTERNS);
const input = process.env.PICOMATCH_INPUT;
process.stdout.write(JSON.stringify(patterns.map((pattern) => {
  const startedAt = performance.now();
  const matched = picomatch.isMatch(input, pattern);
  return { matched, ms: performance.now() - startedAt, source: picomatch.makeRe(pattern).source };
})));
`;

const ANSWERS = z.array(z.object({ matched: z.boolean(), ms: z.number(), source: z.string() }));

type Answer = Readonly<z.infer<typeof ANSWERS>[number]>;

async function probe(patterns: readonly string[], input: string): Promise<readonly Answer[]> {
  const child = Bun.spawn([process.execPath, "-e", PROBE], {
    cwd: ROOT.pathname,
    env: { PICOMATCH_INPUT: input, PICOMATCH_PATTERNS: JSON.stringify(patterns) },
    stderr: "pipe",
    stdout: "pipe",
    timeout: 20_000,
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(`The picomatch probe exited ${String(exitCode)}: ${stderr}`);
  return ANSWERS.parse(JSON.parse(stdout));
}

describe("the installed picomatch", () => {
  it("answers the GHSA-fc5q-39xc-vjpf globs at once, with no repeat nested around a star", async (): Promise<void> => {
    expect.assertions(1);
    const patterns = ["+(*a)", "*(*a)", "+(*)c", "x+(*a)", "+(?*a)"];
    const answers = await probe(patterns, `${"a".repeat(40)}b`);
    expect(
      answers.map((answer) => [answer.matched, answer.ms < 100, /\)[*+]/u.test(answer.source)]),
    ).toStrictEqual(patterns.map(() => [false, true, false]));
  });

  it.each([
    ["+(*a)", "aaa", true],
    ["+(*a)", "ab", false],
    ["+(a*b)", "axbayb", true],
    ["+(a*b)", "axbay", false],
    ["*(*.js)", "foo.js", true],
    ["*(*.js)", "foo.ts", false],
  ] as const)(
    "still matches %s against %s as the glob means",
    async (pattern, input, matched): Promise<void> => {
      expect.assertions(1);
      const answers = await probe([pattern], input);
      expect(answers.map((answer) => answer.matched)).toStrictEqual([matched]);
    },
  );
});
