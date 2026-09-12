package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"slices"
	"strconv"
	"strings"

	"github.com/goccy/go-yaml"
)

const startMarker = "{/* GENERATED RESPONSE EXAMPLES START */}"
const endMarker = "{/* GENERATED RESPONSE EXAMPLES END */}"

func lookup(value any, key string) (any, bool) {
	switch value := value.(type) {
	case yaml.MapSlice:
		for _, item := range value {
			if fmt.Sprint(item.Key) == key {
				return item.Value, true
			}
		}
	case []any:
		index, err := strconv.Atoi(key)
		if err == nil && index >= 0 && index < len(value) {
			return value[index], true
		}
	}
	return nil, false
}

func field(value any, key string) any {
	result, _ := lookup(value, key)
	return result
}

func entries(value any) yaml.MapSlice {
	result, _ := value.(yaml.MapSlice)
	return result
}

func array(value any) []any {
	result, _ := value.([]any)
	return result
}

func reference(document any, ref string) (any, error) {
	if !strings.HasPrefix(ref, "#/") {
		return nil, fmt.Errorf("Only local OpenAPI references are supported: %s", ref)
	}
	for _, key := range strings.Split(ref[2:], "/") {
		document = field(document, strings.ReplaceAll(strings.ReplaceAll(key, "~1", "/"), "~0", "~"))
	}
	return document, nil
}

func merge(left, right yaml.MapSlice) yaml.MapSlice {
	result := append(yaml.MapSlice{}, left...)
	for _, item := range right {
		index := slices.IndexFunc(result, func(previous yaml.MapItem) bool { return previous.Key == item.Key })
		if index < 0 {
			result = append(result, item)
		} else {
			result[index] = item
		}
	}
	orderProperties(result)
	return result
}

func schemaExample(document, schema any, depth int, visited []string) (any, error) {
	if schema == nil || depth > 7 {
		return yaml.MapSlice{}, nil
	}
	for _, key := range []string{"example", "const", "default"} {
		if value, exists := lookup(schema, key); exists {
			return value, nil
		}
	}
	if values := array(field(schema, "enum")); len(values) > 0 {
		return values[0], nil
	}
	if ref, ok := field(schema, "$ref").(string); ok {
		if slices.Contains(visited, ref) {
			return yaml.MapSlice{}, nil
		}
		resolved, err := reference(document, ref)
		if err != nil {
			return nil, err
		}
		return schemaExample(document, resolved, depth+1, append(slices.Clone(visited), ref))
	}
	next := func(child any) (any, error) { return schemaExample(document, child, depth+1, visited) }
	if value, exists := lookup(schema, "allOf"); exists {
		var result any = yaml.MapSlice{}
		for _, child := range array(value) {
			value, err := next(child)
			if err != nil {
				return nil, err
			}
			left, leftOK := result.(yaml.MapSlice)
			right, rightOK := value.(yaml.MapSlice)
			if leftOK && rightOK {
				result = merge(left, right)
			} else if value != nil {
				result = value
			}
		}
		return result, nil
	}
	variant := field(field(schema, "oneOf"), "0")
	if variant == nil {
		variant = field(field(schema, "anyOf"), "0")
	}
	if variant != nil {
		return next(variant)
	}
	if field(schema, "type") == "array" {
		value, err := next(field(schema, "items"))
		return []any{value}, err
	}
	if field(schema, "type") == "object" || field(schema, "properties") != nil {
		properties := entries(field(schema, "properties"))
		var selected yaml.MapSlice
		for _, item := range properties {
			if slices.Contains(array(field(schema, "required")), item.Key) {
				selected = append(selected, item)
			}
		}
		if len(selected) == 0 {
			selected = properties
		}
		result := yaml.MapSlice{}
		for _, item := range selected[:min(12, len(selected))] {
			value, err := next(item.Value)
			if err != nil {
				return nil, err
			}
			result = append(result, yaml.MapItem{Key: item.Key, Value: value})
		}
		return result, nil
	}
	switch field(schema, "type") {
	case "boolean":
		return false, nil
	case "integer", "number":
		return 0, nil
	}
	switch field(schema, "format") {
	case "date-time":
		return "2026-08-01T09:00:00.000Z", nil
	case "uri", "url":
		return "https://example.com/resource", nil
	}
	return "<string>", nil
}

func compact(value any, limit, depth int) any {
	switch value := value.(type) {
	case []any:
		result := []any{}
		if len(value) > 0 {
			result = append(result, compact(value[0], limit, depth+1))
		}
		return result
	case yaml.MapSlice:
		fields := limit
		if depth > 0 {
			fields = min(fields, 5)
		}
		result := yaml.MapSlice{}
		for _, item := range value[:min(fields, len(value))] {
			result = append(result, yaml.MapItem{Key: item.Key, Value: compact(item.Value, limit, depth+1)})
		}
		return result
	default:
		return value
	}
}

func responseExample(document, response any, status string, action any) (string, any, error) {
	if ref, ok := field(response, "$ref").(string); ok {
		var err error
		response, err = reference(document, ref)
		if err != nil {
			return "", nil, err
		}
		if response == nil {
			return "", nil, fmt.Errorf("OpenAPI reference not found: %s", ref)
		}
	}
	if status == "204" {
		return "text", "No response body.", nil
	}
	content := entries(field(response, "content"))
	if len(content) == 0 {
		description := field(response, "description")
		if description == nil {
			description = "No response body."
		}
		return "text", description, nil
	}
	selected := content[0]
	for _, item := range content {
		if strings.Contains(fmt.Sprint(item.Key), "json") {
			selected = item
			break
		}
	}
	for _, item := range content {
		if item.Key == "application/json" {
			selected = item
			break
		}
	}
	value := field(selected.Value, "example")
	if value == nil {
		if examples := entries(field(selected.Value, "examples")); len(examples) > 0 {
			value = field(examples[0].Value, "value")
		}
	}
	if value == nil {
		var err error
		value, err = schemaExample(document, field(selected.Value, "schema"), 0, nil)
		if err != nil {
			return "", nil, err
		}
	}
	if _, exists := lookup(value, "action"); exists && (status == "200" || status == "202") {
		if action, ok := action.(string); ok {
			value = merge(entries(value), yaml.MapSlice{{Key: "action", Value: action}})
		}
	}
	if strings.HasPrefix(status, "4") || strings.HasPrefix(status, "5") {
		if object, ok := value.(yaml.MapSlice); ok {
			selected := yaml.MapSlice{}
			for _, key := range []string{"error", "message", "code", "status", "retryAfter", "charged", "chargedCredits", "retryable", "safeToRetry", "writeActionId", "statusUrl"} {
				if value, exists := lookup(object, key); exists {
					selected = append(selected, yaml.MapItem{Key: key, Value: value})
				}
			}
			if len(selected) == 0 {
				selected = object[:min(6, len(object))]
			}
			result := yaml.MapSlice{}
			for _, item := range selected {
				result = append(result, yaml.MapItem{Key: item.Key, Value: compact(item.Value, 5, 1)})
			}
			value = result
		}
	} else {
		value = compact(value, 10, 0)
	}
	language := "text"
	if strings.Contains(fmt.Sprint(selected.Key), "json") {
		language = "json"
	}
	return language, value, nil
}

func responseBlock(document, operation any, scope string) (string, error) {
	var tabs []string
	for _, response := range entries(field(operation, "responses")) {
		status := fmt.Sprint(response.Key)
		language, value, err := responseExample(document, response.Value, status, field(operation, "x-write-action"))
		if err != nil {
			return "", err
		}
		text, isString := value.(string)
		if language == "json" || !isString {
			encoded, err := yaml.MarshalWithOptions(value, yaml.JSON(), yaml.AutoInt())
			if err != nil {
				return "", err
			}
			var pretty bytes.Buffer
			if err := json.Indent(&pretty, bytes.TrimSpace(encoded), "", "  "); err != nil {
				return "", err
			}
			text = pretty.String()
		}
		text = "    " + strings.ReplaceAll(text, "\n", "\n    ")
		tabs = append(tabs, fmt.Sprintf("  <Tab title=\"%s\" id=\"response-%s-%s\">\n\n    ```%s\n%s\n    ```\n\n  </Tab>", status, strings.ReplaceAll(scope, "/", "-"), status, language, text))
	}
	return startMarker + "\n\n<Panel>\n\n<Tabs defaultTabIndex={0} sync={false}>\n\n" + strings.Join(tabs, "\n\n") + "\n</Tabs>\n\n</Panel>\n" + endMarker, nil
}
