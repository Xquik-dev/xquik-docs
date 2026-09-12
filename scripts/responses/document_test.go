package main

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"testing"

	"github.com/goccy/go-yaml"
)

func TestPropertyOrder(t *testing.T) {
	document, err := parseDocument([]byte(`z: [{"10": 10, "2": 2, "01": 1, "0": 0}]
"4294967295": last
"4294967294": largest-index
"-0": negative-zero
a: false
empty: null
`))
	if err != nil {
		t.Fatal(err)
	}
	encoded, err := yaml.MarshalWithOptions(document, yaml.JSON())
	if err != nil {
		t.Fatal(err)
	}
	var compact bytes.Buffer
	if err := json.Compact(&compact, encoded); err != nil {
		t.Fatal(err)
	}
	want := `{"4294967294":"largest-index","z":[{"0":0,"2":2,"10":10,"01":1}],"4294967295":"last","-0":"negative-zero","a":false,"empty":null}`
	if compact.String() != want {
		t.Fatalf("property order or values changed:\n%s", compact.String())
	}
	for _, invalid := range []string{"a: [", "a: 1\na: 2", "- sequence-root"} {
		if _, err := parseDocument([]byte(invalid)); err == nil {
			t.Errorf("invalid document passed: %q", invalid)
		}
	}
}

func TestCanonicalDocumentParity(t *testing.T) {
	data, err := os.ReadFile("../../openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	document, err := parseDocument(data)
	if err != nil {
		t.Fatal(err)
	}
	encoded, err := yaml.MarshalWithOptions(document, yaml.JSON(), yaml.AutoInt())
	if err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command("bun", "-e", `process.stdout.write(JSON.stringify(Bun.YAML.parse(await Bun.file("../../openapi.yaml").text())));`)
	expected, err := cmd.Output()
	if err != nil {
		t.Fatal(err)
	}
	var compact bytes.Buffer
	if err := json.Compact(&compact, encoded); err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(compact.Bytes(), expected) {
		t.Fatal("native YAML values, JSON encoding or property order differ from Bun")
	}
}
