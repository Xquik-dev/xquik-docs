#!/usr/bin/env bun
import { audit } from "./lib/dependency-audit.ts";

const LICENSES =
  "0BSD,Apache-2.0,BlueOak-1.0.0,BSD-2-Clause,BSD-3-Clause,CC-BY-4.0,ISC,LGPL-3.0-or-later,MIT,MIT-0,MPL-2.0,Unlicense,Zlib";
const SCANNED_EXIT_CODES = new Set([0, 1]);

const scanner = Bun.spawn(
  [
    "osv-scanner",
    "scan",
    "source",
    `--licenses=${LICENSES}`,
    "--format=json",
    "-L",
    "package-lock.json",
  ],
  { stderr: "inherit", stdin: "ignore", stdout: "pipe" },
);
const [report, exitCode] = await Promise.all([new Response(scanner.stdout).text(), scanner.exited]);
if (!SCANNED_EXIT_CODES.has(exitCode)) {
  process.stderr.write(
    `osv-scanner exited ${String(exitCode)}. Read its error above, then rerun.\n`,
  );
  process.exit(exitCode);
}
const result = audit(JSON.parse(report), Date.now());
for (const line of result.lines) process.stdout.write(`${line}\n`);
process.exit(result.failures === 0 ? 0 : 1);
