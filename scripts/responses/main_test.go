package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestInsertionGuards(t *testing.T) {
	for _, tc := range []struct{ source, message string }{
		{startMarker, "markers are incomplete"},
		{endMarker, "markers are incomplete"},
		{endMarker + startMarker, "markers are incomplete"},
		{"No frontmatter", "frontmatter insertion point"},
		{"---\ntitle: Test\n---\nNo imports", "import insertion point"},
	} {
		if _, err := replaceBlock(tc.source, "replacement"); err == nil || !strings.Contains(err.Error(), tc.message) {
			t.Errorf("expected %s, got %v", tc.message, err)
		}
	}
}

func TestSyncLifecycle(t *testing.T) {
	root := t.TempDir()
	write := func(path, content string) {
		t.Helper()
		path = filepath.Join(root, path)
		if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0600); err != nil {
			t.Fatal(err)
		}
	}
	page := "---\napi: \"GET /fixture\"\n---\n\nimport Intro from \"/intro.mdx\";\n\nOriginal guidance.\n"
	write("openapi.yaml", "paths: {'/fixture': {get: {responses: {'200': {description: Ready}}}}}\n")
	write("api-reference/a.mdx", page)
	write("api-reference/overview.mdx", "Overview without an operation.\n")
	if _, err := run(root, true); err == nil || !strings.Contains(err.Error(), "response examples are stale") {
		t.Fatalf("stale check: %v", err)
	}
	data, err := os.ReadFile(filepath.Join(root, "api-reference/a.mdx"))
	if err != nil || string(data) != page {
		t.Fatalf("check changed the page: %v", err)
	}
	if result, err := run(root, false); err != nil || result != "Synchronized 1 response statuses across 1 API pages.\n" {
		t.Fatalf("sync: %q %v", result, err)
	}
	if result, err := run(root, true); err != nil || result != "Verified 1 response statuses across 1 API pages.\n" {
		t.Fatalf("fresh check: %q %v", result, err)
	}
	data, err = os.ReadFile(filepath.Join(root, "api-reference/a.mdx"))
	if err != nil || !strings.Contains(string(data), "Original guidance.\n") || strings.Count(string(data), startMarker) != 1 {
		t.Fatalf("sync lost guidance or duplicated the block: %v", err)
	}
	write("api-reference/a.mdx", page)
	write("api-reference/z.mdx", strings.ReplaceAll(page, "/fixture", "/missing"))
	if _, err := run(root, false); err == nil || !strings.Contains(err.Error(), "OpenAPI operation not found") {
		t.Fatalf("invalid operation: %v", err)
	}
	data, err = os.ReadFile(filepath.Join(root, "api-reference/a.mdx"))
	if err != nil || string(data) != page {
		t.Fatalf("validation failure partially updated docs: %v", err)
	}
}
