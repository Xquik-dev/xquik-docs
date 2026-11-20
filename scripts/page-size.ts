#!/usr/bin/env bun
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DEFAULT_THRESHOLDS } from "afdocs";
import { htmlToMarkdown } from "afdocs/helpers";

const MINT = "mint@4.3.5";
const PUBLISHED_ONLY_CHROME = 792;
const HEADROOM = 5000;

function exportSite(directory: string): string {
  const archive = join(directory, "site.zip");
  const site = join(directory, "site");
  for (const command of [
    ["bunx", "--bun", MINT, "export", "--telemetry", "false", "--output", archive],
    ["unzip", "-q", archive, "-d", site],
  ]) {
    const { exitCode, stderr } = Bun.spawnSync(command, { stderr: "pipe", stdout: "ignore" });
    if (exitCode !== 0) throw new Error(`${command.join(" ")} failed.\n${stderr.toString()}`);
  }
  return site;
}

function publishedSizes(site: string): ReadonlyMap<string, number> {
  return new Map(
    readdirSync(site, { encoding: "utf8", recursive: true })
      .filter((file) => file === "index.html" || file.endsWith("/index.html"))
      .map((file): [string, number] => [
        `/${file.replace(/\/?index\.html$/u, "")}`,
        htmlToMarkdown(readFileSync(join(site, file), "utf8")).length + PUBLISHED_ONLY_CHROME,
      ]),
  );
}

function report(sizes: ReadonlyMap<string, number>): string {
  const ranked = [...sizes].toSorted(([, a], [, b]) => b - a);
  const over = ranked.filter(([, size]) => size >= DEFAULT_THRESHOLDS.pass);
  if (over.length > 0)
    throw new Error(
      `${String(over.length)} pages reach ${String(DEFAULT_THRESHOLDS.pass)} characters after HTML conversion. Shorten them.\n${over.map(([page, size]) => `${page} ${String(size)}`).join("\n")}`,
    );
  const [largest] = ranked;
  const near = ranked.filter(([, size]) => DEFAULT_THRESHOLDS.pass - size < HEADROOM);
  const headroom =
    near.length === 0
      ? ""
      : `${String(near.length)} pages have less than ${String(HEADROOM)} characters of headroom. Tighten one before you add to it.\n${near.map(([page, size]) => `${page} ${String(size)}`).join("\n")}\n`;
  return `All ${String(sizes.size)} pages stay under ${String(DEFAULT_THRESHOLDS.pass)} characters. The largest is ${largest?.[0] ?? "none"} at ${String(largest?.[1] ?? 0)}.\n${headroom}`;
}

if (import.meta.main) {
  const directory = mkdtempSync(join(tmpdir(), "xquik-docs-page-size-"));
  try {
    process.stdout.write(report(publishedSizes(exportSite(directory))));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}
