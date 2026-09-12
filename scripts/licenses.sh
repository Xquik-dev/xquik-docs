#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")/.."

configuration=$(bun -e 'const config = require("./package.json").config; const c = config.comply; process.stdout.write(`${c.version} ${c.sha256} ${c.sourceDateEpoch} ${config.cargoAudit} ${config.rustVersion}\n`);')
read -r version archive_sha source_epoch audit_version rust_version <<<"$configuration"
patch="$PWD/patches/comply-licensing.patch"
patch_sha=$(shasum -a 256 "$patch" | cut -d ' ' -f 1)
tool_id=$(printf '%s\n' "$configuration" "$patch_sha" | shasum -a 256 | cut -d ' ' -f 1)
tool_root=$(git rev-parse --path-format=absolute --git-path "tools/comply-$version-$tool_id")
audit_current() { [[ $(cargo audit --version 2>/dev/null) == *" $audit_version" ]]; }

case "${1:-lint}" in
install)
	work=$(mktemp -d)
	trap 'rm -rf "$work"' EXIT
	curl --fail --location --retry 2 --max-time 60 \
		"https://static.crates.io/crates/comply/comply-$version.crate" -o "$work/source.crate"
	printf '%s  %s\n' "$archive_sha" "$work/source.crate" | shasum -a 256 --check -
	tar -xzf "$work/source.crate" -C "$work"
	(cd "$work/comply-$version" && git apply "$patch")
	rustup run "$rust_version" rustc --version >/dev/null 2>&1 || rustup toolchain install "$rust_version" --profile minimal --no-self-update
	audit_current || rustup run "$rust_version" cargo install cargo-audit --version "$audit_version" --locked
	SOURCE_DATE_EPOCH="$source_epoch" rustup run "$rust_version" cargo install --locked \
		--path "$work/comply-$version" --root "$tool_root" \
		--target-dir "${CARGO_TARGET_DIR:-$(git rev-parse --git-path tools/comply-build)}"
	cp "$work/comply-$version/Cargo.lock" "$tool_root/Cargo.lock"
	;;
lint)
	if [[ ! -x "$tool_root/bin/comply" ]]; then
		printf 'License checker unavailable. Run bun run install:licenses.\n' >&2
		exit 1
	fi
	if ! audit_current; then
		printf 'Audit version differs. Run bun run install:licenses.\n' >&2
		exit 1
	fi
	cargo audit --file "$tool_root/Cargo.lock" --deny warnings
	exec "$tool_root/bin/comply" lint .
	;;
*)
	printf 'Unknown license command. Use install or lint.\n' >&2
	exit 2
	;;
esac
