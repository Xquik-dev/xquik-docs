import { z } from "zod";

export interface Finding {
  readonly fixReleased: boolean;
  readonly id: string;
  readonly name: string;
  readonly version: string;
}

export interface Exception {
  readonly addedAt: string;
  readonly expiresAt: string;
  readonly exposure: string;
  readonly fix: string;
  readonly id: string;
  readonly name: string;
  readonly patch: string;
  readonly version: string;
}

export interface Audit {
  readonly failures: number;
  readonly lines: readonly string[];
}

export const EXCEPTION_DAYS = 14;

export const EXCEPTIONS: readonly Exception[] = [
  {
    addedAt: "2026-11-17T18:00:00Z",
    expiresAt: "2026-12-01T18:00:00Z",
    exposure:
      "picomatch is a dev dependency of vitest, vite, tinyglobby, fdir & afdocs, which compile only this repository's own test & config globs. No path hands it outside input.",
    fix: "micromatch/picomatch#237",
    id: "GHSA-fc5q-39xc-vjpf",
    name: "picomatch",
    patch: "patches/picomatch@4.0.7.patch",
    version: "4.0.7",
  },
];

const REPORT = z.object({
  results: z
    .array(
      z.object({
        packages: z.array(
          z.object({
            license_violations: z.array(z.string()).default([]),
            package: z.object({ name: z.string(), version: z.string() }),
            vulnerabilities: z
              .array(
                z.object({
                  affected: z
                    .array(
                      z.object({
                        package: z.object({ name: z.string() }),
                        ranges: z
                          .array(z.object({ events: z.array(z.record(z.string(), z.string())) }))
                          .default([]),
                      }),
                    )
                    .default([]),
                  id: z.string(),
                }),
              )
              .default([]),
          }),
        ),
      }),
    )
    .default([]),
});

type Package = z.infer<typeof REPORT>["results"][number]["packages"][number];

function findingsOf(entry: Readonly<Package>): readonly Finding[] {
  return entry.vulnerabilities.map((vulnerability) => ({
    fixReleased: vulnerability.affected.some(
      (affected) =>
        affected.package.name === entry.package.name &&
        affected.ranges.some((range) => range.events.some((event) => "fixed" in event)),
    ),
    id: vulnerability.id,
    name: entry.package.name,
    version: entry.package.version,
  }));
}

export function exceptionFor(
  finding: Readonly<Finding>,
  now: number,
  exceptions: readonly Exception[] = EXCEPTIONS,
): Exception | undefined {
  return exceptions.find(
    (exception) =>
      exception.id === finding.id &&
      exception.name === finding.name &&
      exception.version === finding.version &&
      !finding.fixReleased &&
      now < Date.parse(exception.expiresAt),
  );
}

function findingLine(finding: Readonly<Finding>, now: number, exceptions: readonly Exception[]): string {
  const exception = exceptionFor(finding, now, exceptions);
  const named = `${finding.id} on ${finding.name} ${finding.version} in package-lock.json`;
  return exception === undefined
    ? `audit: ${named} fails. Upgrade, override or replace that package.`
    : `audit: ${named} passes until ${exception.expiresAt} or its first fixed release, since ${exception.patch} applies ${exception.fix}.`;
}

export function audit(report: unknown, now: number, exceptions: readonly Exception[] = EXCEPTIONS): Audit {
  const packages = REPORT.parse(report).results.flatMap((result) => result.packages);
  const findings = packages.flatMap((entry) => findingsOf(entry));
  const violations = packages.flatMap((entry) =>
    entry.license_violations.length === 0
      ? []
      : [
          `audit: ${entry.package.name} ${entry.package.version} (${entry.license_violations.join(", ")}) in package-lock.json has a license outside the allowlist.`,
        ],
  );
  const failing = findings.filter((finding) => exceptionFor(finding, now, exceptions) === undefined);
  return {
    failures: violations.length + failing.length,
    lines: [...violations, ...findings.map((finding) => findingLine(finding, now, exceptions))],
  };
}
