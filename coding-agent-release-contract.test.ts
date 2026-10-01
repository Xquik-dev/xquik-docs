import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

const GUIDE = readFileSync("mcp/coding-agents.mdx", "utf8");

it.each([
  ["Claude Code", "https://github.com/anthropics/claude-code/releases/tag/v2.1.287"],
  ["Pi", "https://github.com/earendil-works/pi/releases/tag/v1.0.0"],
  ["GitHub Copilot CLI", "https://github.com/github/copilot-cli/releases/tag/v1.0.91"],
  ["Gemini CLI", "https://github.com/google-gemini/gemini-cli/releases/tag/v0.62.0"],
  ["Cline", "https://github.com/cline/cline/releases/tag/desktop-v0.0.40"],
])("links %s setup to its reviewed stable release", (client, url): void => {
  expect.assertions(1);

  const row = GUIDE.split("\n").find((line): boolean => line.split("|")[1]?.trim() === client);
  expect(row).toContain(url);
});
