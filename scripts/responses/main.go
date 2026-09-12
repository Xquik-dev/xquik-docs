package main

import (
	"flag"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

func replaceBlock(source, block string) (string, error) {
	start, end := strings.Index(source, startMarker), strings.Index(source, endMarker)
	if start >= 0 || end >= 0 {
		if start < 0 || end < start {
			return "", fmt.Errorf("Generated response example markers are incomplete.")
		}
		source = source[:start] + source[end+len(endMarker):]
	}
	frontmatter := regexp.MustCompile(`(?s)^---\r?\n.*?\r?\n---\r?\n`).FindString(source)
	if frontmatter == "" {
		return "", fmt.Errorf("API reference page has no frontmatter insertion point.")
	}
	imports := regexp.MustCompile(`^(?:\r?\n)*(?:import [^\r\n]+;\r?\n)+`).FindString(source[len(frontmatter):])
	if imports == "" {
		return "", fmt.Errorf("API reference page has no import insertion point.")
	}
	insertion := len(frontmatter) + len(imports)
	tail := regexp.MustCompile(`^\r?\n*`).ReplaceAllString(source[insertion:], "")
	return source[:insertion] + "\n" + block + "\n" + tail, nil
}

func run(root string, check bool) (string, error) {
	data, err := os.ReadFile(filepath.Join(root, "openapi.yaml"))
	if err != nil {
		return "", err
	}
	document, err := parseDocument(data)
	if err != nil {
		return "", err
	}
	api := regexp.MustCompile(`(?m)^api: "([A-Z]+) ([^"]+)"$`)
	var findings []string
	var changes []struct{ path, source string }
	pages, statuses := 0, 0
	err = filepath.WalkDir(filepath.Join(root, "api-reference"), func(path string, entry fs.DirEntry, err error) error {
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
		file, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		method := strings.ToLower(match[1])
		operation := field(field(field(document, "paths"), match[2]), method)
		if operation == nil || !slices.Contains([]string{"delete", "get", "head", "options", "patch", "post", "put"}, method) {
			findings = append(findings, file+": OpenAPI operation not found.")
			return nil
		}
		scope := strings.TrimSuffix(strings.TrimPrefix(filepath.ToSlash(file), "api-reference/"), ".mdx")
		block, err := responseBlock(document, operation, scope)
		if err != nil {
			return err
		}
		next, err := replaceBlock(source, block)
		if err != nil {
			return err
		}
		pages++
		statuses += len(entries(field(operation, "responses")))
		if next != source {
			if check {
				findings = append(findings, file+": response examples are stale.")
			}
			changes = append(changes, struct{ path, source string }{path, next})
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	if len(findings) > 0 {
		return "", fmt.Errorf("%s", strings.Join(findings, "\n"))
	}
	prefix := "Verified"
	if !check {
		prefix = "Synchronized"
		for _, change := range changes {
			if err := os.WriteFile(change.path, []byte(change.source), 0644); err != nil {
				return "", err
			}
		}
	}
	return fmt.Sprintf("%s %d response statuses across %d API pages.\n", prefix, statuses, pages), nil
}

func main() {
	check := flag.Bool("check", false, "Verify generated examples without changing files")
	flag.Parse()
	result, err := run(".", *check)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Print(result)
}
