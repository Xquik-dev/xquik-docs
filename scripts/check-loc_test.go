package main

import (
	"crypto/sha256"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func TestNativeGitLOC(t *testing.T) {
	script, err := filepath.Abs("check-loc.sh")
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	command := func(name string, args ...string) {
		t.Helper()
		cmd := exec.Command(name, args...)
		cmd.Dir = root
		if output, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("%s failed: %s\n%v", name, output, err)
		}
	}
	write := func(name, content string) {
		t.Helper()
		if err := os.WriteFile(filepath.Join(root, name), []byte(content), 0600); err != nil {
			t.Fatal(err)
		}
	}
	check := func(name string, wantPass bool) {
		t.Helper()
		t.Run(name, func(t *testing.T) {
			cmd := exec.Command("bash", script)
			cmd.Dir = root
			output, err := cmd.CombinedOutput()
			if (err == nil) != wantPass {
				t.Fatalf("want pass %v, got %v: %s", wantPass, err, output)
			}
		})
	}
	command("git", "init", "--quiet")
	command("git", "config", "user.name", "LOC regression")
	command("git", "config", "user.email", "loc@example.invalid")
	command("git", "config", "core.hooksPath", "/dev/null")
	command("git", "config", "commit.gpgsign", "false")
	write("source.ts", "one\ntwo\nthree\nfour\n")
	command("git", "add", "source.ts")
	command("git", "commit", "--quiet", "-m", "Fixture baseline")
	check("missing parent fails", false)
	write("source.ts", "one\ntwo\n")
	check("working reduction passes", true)
	write("source.ts", "one\ntwo\nthree\nfour\nfive\n")
	check("growth remains advisory", true)
	write("source.ts", "one\ntwo\n")
	write("helper.ts", "one\ntwo\nthree\nfour\n")
	check("untracked source fails", false)
	command("git", "add", "-N", "helper.ts")
	check("tracked new source remains advisory", true)
	write("helper.ts", "one\n")
	check("combined reduction passes", true)
	command("git", "add", "source.ts", "helper.ts")
	command("git", "commit", "--quiet", "-m", "Fixture reduction")
	check("clean commit uses parent", true)
}

func TestSecretScanner(t *testing.T) {
	config, err := filepath.Abs("../.gitleaks.toml")
	if err != nil {
		t.Fatal(err)
	}
	synthetic := fmt.Sprintf("%x", sha256.Sum256([]byte(t.Name())))
	for _, tc := range []struct {
		name, input string
		leak        bool
	}{
		{"literal example", `curl -H "Authorization: Bearer xq_YOUR_KEY_HERE"`, false},
		{"idempotency identifier", `Idempotency-Key: follow-44196397-1895432178065391234"`, false},
		{"bearer credential", `curl -H "Authorization: Bearer ` + synthetic + `"`, true},
		{"API credential", `curl -H "Authorization: Bearer xq_` + synthetic + `"`, true},
		{"placeholder prefix is not exempt", `curl -H "Authorization: Bearer xq_YOUR_KEY_HERE` + synthetic + `"`, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cmd := exec.Command("gitleaks", "stdin", "--config", config, "--redact=100", "--no-banner", "--ignore-gitleaks-allow", "--gitleaks-ignore-path", "/dev/null")
			cmd.Stdin = strings.NewReader(tc.input)
			output, err := cmd.CombinedOutput()
			if cmd.ProcessState == nil {
				t.Fatalf("start scanner: %v", err)
			}
			code := cmd.ProcessState.ExitCode()
			if (err == nil) != !tc.leak || (tc.leak && code != 1) {
				t.Fatalf("want leak %v, exit %d: %s", tc.leak, code, output)
			}
		})
	}
}

func TestMarkdownShellContinuations(t *testing.T) {
	cmd := exec.Command("git", "ls-files", "-z", "--", "*.mdx")
	cmd.Dir = ".."
	paths, err := cmd.Output()
	if err != nil {
		t.Fatal(err)
	}
	broken := regexp.MustCompile(`\\\r?\n[ \t]*\r?\n`)
	for _, path := range strings.Split(strings.TrimRight(string(paths), "\x00"), "\x00") {
		data, err := os.ReadFile(filepath.Join("..", path))
		if err != nil {
			t.Fatal(err)
		}
		if broken.Match(data) {
			t.Errorf("%s: blank line breaks shell continuation", path)
		}
	}
}

func TestLicenseCommand(t *testing.T) {
	root := t.TempDir()
	write := func(path string, data []byte) {
		t.Helper()
		path = filepath.Join(root, path)
		if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, data, 0700); err != nil {
			t.Fatal(err)
		}
	}
	original := map[string][]byte{}
	for _, path := range []string{"scripts/licenses.sh", "package.json", "patches/comply-licensing.patch", "REUSE.toml", "LICENSES/MIT.txt", "LICENSES/Apache-2.0.txt"} {
		data, err := os.ReadFile(filepath.Join("..", path))
		if err != nil {
			t.Fatal(err)
		}
		original[path] = data
		write(path, data)
	}
	cmd := exec.Command("git", "init", "--quiet", root)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("initialize fixture: %v\n%s", err, output)
	}
	cmd = exec.Command("git", "rev-parse", "--path-format=absolute", "--git-path", "tools")
	tools, err := cmd.Output()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(strings.TrimSpace(string(tools)), filepath.Join(root, ".git", "tools")); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name, command, path, suffix, message, replace, with string
		code                                                int
	}{
		{name: "installed checker", command: "lint", message: "0 failed"},
		{name: "changed patch", command: "lint", path: "patches/comply-licensing.patch", suffix: "\n", message: "License checker unavailable", code: 1},
		{name: "changed archive checksum", command: "lint", path: "package.json", replace: `"sha256": "`, with: `"sha256": "0`, message: "License checker unavailable", code: 1},
		{name: "unknown command", command: "invalid", message: "Unknown license command", code: 2},
		{name: "wrong audit version", command: "lint", message: "Audit version differs", code: 1},
		{name: "invalid archive", command: "install", message: "FAILED", code: 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if tc.path != "" {
				write(tc.path, []byte(strings.Replace(string(original[tc.path]), tc.replace, tc.with, 1)+tc.suffix))
				defer write(tc.path, original[tc.path])
			}
			cmd := exec.Command("bash", filepath.Join(root, "scripts/licenses.sh"), tc.command)
			cmd.Env = append(os.Environ(), "PATH="+filepath.Join(root, "bin")+":"+os.Getenv("PATH"))
			if tc.name == "wrong audit version" {
				write("bin/cargo", []byte("#!/bin/bash\necho 'cargo-audit 0.0.0'\n"))
			}
			if tc.command == "install" {
				write("bin/curl", []byte("#!/bin/bash\nprintf invalid > \"${@: -1}\"\n"))
				for _, name := range []string{"tar", "cargo"} {
					write("bin/"+name, []byte("#!/bin/bash\necho 'UNVERIFIED ARCHIVE USED' >&2\nexit 99\n"))
				}
			}
			output, err := cmd.CombinedOutput()
			if cmd.ProcessState == nil || cmd.ProcessState.ExitCode() != tc.code || !strings.Contains(string(output), tc.message) || strings.Contains(string(output), "UNVERIFIED ARCHIVE USED") {
				t.Fatalf("want exit %d containing %q: %v\n%s", tc.code, tc.message, err, output)
			}
		})
	}
}
