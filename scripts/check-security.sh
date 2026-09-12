#!/usr/bin/env bash
set -euo pipefail

bun run check:loc
osv-scanner scan source --lockfile go.mod --lockfile package-lock.json --all-vulns
options=(--config .gitleaks.toml --redact=100 --no-banner --ignore-gitleaks-allow --gitleaks-ignore-path /dev/null)
if [[ -n $(git status --porcelain) ]]; then
	gitleaks git --pre-commit "${options[@]}"
	gitleaks git --pre-commit --staged "${options[@]}"
else
	gitleaks git --log-opts HEAD^..HEAD "${options[@]}"
fi
