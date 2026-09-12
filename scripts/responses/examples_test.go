package main

import (
	"bytes"
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/goccy/go-yaml"
)

func TestSchemaExamples(t *testing.T) {
	for _, tc := range []struct{ schema, want string }{
		{`{"type":"array","items":{"format":"uri"}}`, `["https://example.com/resource"]`},
		{`{"oneOf":[{"format":"date-time"}]}`, `"2026-08-01T09:00:00.000Z"`},
		{`{"$ref":"#/missing"}`, `{}`},
		{`{"allOf":[{"type":"object","properties":{"available":{"type":"boolean"}}},{"type":"object","properties":{"score":{"type":"integer"}}}]}`, `{"available":false,"score":0}`},
		{`{"$ref":"#/schema"}`, `{}`},
		{`{"example":null,"default":true}`, `null`},
		{`{"const":false,"default":true}`, `false`},
		{`{"default":0}`, `0`},
		{`{"enum":[0,1]}`, `0`},
		{`{"anyOf":[{"format":"url"}]}`, `"https://example.com/resource"`},
	} {
		document, err := parseDocument([]byte(`{"schema":` + tc.schema + `}`))
		if err != nil {
			t.Fatal(err)
		}
		value, err := schemaExample(document, field(document, "schema"), 0, nil)
		if err != nil {
			t.Fatal(err)
		}
		encoded, err := yaml.MarshalWithOptions(value, yaml.JSON(), yaml.AutoInt())
		if err != nil {
			t.Fatal(err)
		}
		var compact bytes.Buffer
		if err := json.Compact(&compact, encoded); err != nil {
			t.Fatal(err)
		}
		if compact.String() != tc.want {
			t.Errorf("schema %s: want %s, got %s", tc.schema, tc.want, compact.String())
		}
	}
}

func TestResponseReferenceFailures(t *testing.T) {
	for _, tc := range []struct{ ref, message string }{
		{"https://example.com/response", "Only local OpenAPI references are supported"},
		{"#/missing", "OpenAPI reference not found"},
	} {
		operation := yaml.MapSlice{{Key: "responses", Value: yaml.MapSlice{{Key: "200", Value: yaml.MapSlice{{Key: "$ref", Value: tc.ref}}}}}}
		if _, err := responseBlock(yaml.MapSlice{}, operation, "missing"); err == nil || !strings.Contains(err.Error(), tc.message) {
			t.Errorf("reference %s: %v", tc.ref, err)
		}
	}
}

func TestCanonicalBlocks(t *testing.T) {
	data, err := os.ReadFile("../../openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	document, err := parseDocument(data)
	if err != nil {
		t.Fatal(err)
	}
	api := regexp.MustCompile(`(?m)^api: "([A-Z]+) ([^"]+)"$`)
	count := 0
	err = filepath.WalkDir("../../api-reference", func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() || !strings.HasSuffix(path, ".mdx") {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		source := string(data)
		match := api.FindStringSubmatch(source)
		if match == nil {
			return nil
		}
		count++
		operation := field(field(field(document, "paths"), match[2]), strings.ToLower(match[1]))
		scope := strings.TrimSuffix(strings.TrimPrefix(filepath.ToSlash(path), "../../api-reference/"), ".mdx")
		block, err := responseBlock(document, operation, scope)
		if err != nil {
			t.Errorf("%s: %v", path, err)
			return nil
		}
		start, end := strings.Index(source, startMarker), strings.Index(source, endMarker)
		if start < 0 || end < start || source[start:end+len(endMarker)] != block {
			t.Errorf("%s: native response block differs", path)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if count == 0 {
		t.Fatal("no API pages checked")
	}
	t.Logf("Compared %d complete response blocks", count)
}
