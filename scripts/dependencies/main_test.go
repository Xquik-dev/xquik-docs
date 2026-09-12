package main

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestPolicy(t *testing.T) {
	for _, tc := range []struct {
		name, entry, version, path, failure string
		competing, fallback                 bool
	}{
		{name: "root excluded from count"},
		{name: "competing lock", competing: true, failure: "Use package-lock.json only. Remove bun.lock."},
		{name: "version range", version: "^1.0.0", failure: "must use an exact version"},
		{name: "missing integrity", entry: `{"integrity":""}`, failure: "SHA-512 package integrity"},
		{name: "other registry", entry: `{"resolved":"https://example.com/file"}`, failure: "approved registry"},
		{name: "missing license", entry: `{"license":null}`, failure: "missing license metadata"},
		{name: "unapproved license", entry: `{"license":"unapproved"}`, failure: "unapproved license unapproved"},
		{name: "reviewed reference", entry: `{"license":"SEE LICENSE IN LICENSE.md"}`},
		{name: "reference for another package", entry: `{"license":"SEE LICENSE IN LICENSE.md"}`, path: "node_modules/other", failure: "unapproved license SEE LICENSE IN LICENSE.md"},
		{name: "reference for another version", entry: `{"license":"SEE LICENSE IN LICENSE.md","version":"1.0.1"}`, failure: "unapproved license SEE LICENSE IN LICENSE.md"},
		{name: "reference for another file", entry: `{"license":"SEE LICENSE IN README.md"}`, failure: "unapproved license SEE LICENSE IN README.md"},
		{name: "nested dependency", path: "node_modules/parent/node_modules/fixture"},
		{name: "scoped dependency", path: "node_modules/@scope/fixture"},
		{name: "invalid dependency path", path: "bad", failure: "not a node_modules dependency path"},
		{name: "empty license is not a missing declaration", entry: `{"license":""}`, failure: "missing license metadata"},
		{name: "reviewed fallback", entry: `{"license":null}`, fallback: true},
		{name: "empty declaration blocks fallback", entry: `{"license":""}`, fallback: true, failure: "missing license metadata"},
		{name: "declared license blocks fallback", entry: `{"license":"unapproved"}`, fallback: true, failure: "unapproved license unapproved"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			license := "MIT"
			entry := metadata{"1.0.0", "sha512-fixture", "https://registry.npmjs.org/fixture/-/fixture-1.0.0.tgz", &license}
			if tc.entry != "" {
				if err := json.Unmarshal([]byte(tc.entry), &entry); err != nil {
					t.Fatal(err)
				}
			}
			if tc.version == "" {
				tc.version = "1.0.0"
			}
			if tc.path == "" {
				tc.path = "node_modules/fixture"
			}
			var rules policy
			if err := json.Unmarshal([]byte(`{"allowedLicenses":["MIT"],"licenseReferences":[{"declared":"SEE LICENSE IN LICENSE.md","license":"MIT","packages":["fixture@1.0.0"]}]}`), &rules); err != nil {
				t.Fatal(err)
			}
			if tc.fallback {
				rules.PackageLicenses = map[string]string{"fixture@1.0.0": "MIT"}
			}
			result, err := validateDependencies(manifest{map[string]string{"fixture": tc.version}}, lockfile{map[string]metadata{"": {}, tc.path: entry}}, rules, tc.competing)
			if tc.failure == "" {
				if err != nil || result != "Verified 1 locked dependencies with approved integrity and licenses.\n" {
					t.Fatalf("unexpected validation result %q: %v", result, err)
				}
			} else if err == nil || !strings.Contains(err.Error(), tc.failure) || result != "" {
				t.Fatalf("want failure %q with no success output, got %q: %v", tc.failure, result, err)
			}
		})
	}
}

func TestEmptyLock(t *testing.T) {
	for _, packages := range []map[string]metadata{nil, {"": {}}} {
		if _, err := validateDependencies(manifest{}, lockfile{packages}, policy{}, false); err == nil || err.Error() != "The lockfile contains no dependencies." {
			t.Fatalf("empty lock passed: %v", err)
		}
	}
}

func TestRepository(t *testing.T) {
	root := filepath.Join("..", "..")
	want, err := checkRepository(root)
	if err != nil || !strings.Contains(want, "locked dependencies with approved integrity and licenses.") {
		t.Fatalf("real repository failed: %q %v", want, err)
	}
	cmd := exec.Command("go", "run", "scripts/dependencies/main.go")
	cmd.Dir = root
	if output, err := cmd.CombinedOutput(); err != nil || string(output) != want {
		t.Fatalf("CLI output mismatch: %v\n%s", err, output)
	}
	fixture := t.TempDir()
	original := map[string][]byte{}
	for _, path := range []string{"package.json", "package-lock.json", "config/dependency-license-policy.json"} {
		target := filepath.Join(fixture, path)
		if err := os.MkdirAll(filepath.Dir(target), 0700); err != nil {
			t.Fatal(err)
		}
		data, err := os.ReadFile(filepath.Join(root, path))
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(target, data, 0600); err != nil {
			t.Fatal(err)
		}
		original[path] = data
	}
	if result, err := checkRepository(fixture); err != nil || result != want {
		t.Fatalf("fixture mismatch %q: %v", result, err)
	}
	for path, data := range original {
		target := filepath.Join(fixture, path)
		if err := os.Remove(target); err != nil {
			t.Fatal(err)
		}
		if _, err := checkRepository(fixture); err == nil || !strings.Contains(err.Error(), path) {
			t.Fatalf("missing %s was not rejected: %v", path, err)
		}
		if err := os.WriteFile(target, []byte("{"), 0600); err != nil {
			t.Fatal(err)
		}
		if _, err := checkRepository(fixture); err == nil || !strings.Contains(err.Error(), path) {
			t.Fatalf("malformed %s was not rejected: %v", path, err)
		}
		if err := os.WriteFile(target, data, 0600); err != nil {
			t.Fatal(err)
		}
	}
}
