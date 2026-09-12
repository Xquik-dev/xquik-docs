package main

import (
	"cmp"
	"fmt"
	"math"
	"slices"
	"strconv"

	"github.com/goccy/go-yaml"
)

func propertyIndex(key any) uint64 {
	text := fmt.Sprint(key)
	value, err := strconv.ParseUint(text, 10, 32)
	if err != nil || value == math.MaxUint32 || strconv.FormatUint(value, 10) != text {
		return math.MaxUint64
	}
	return value
}

// JavaScript enumerates array-index keys before other keys, in numeric order.
func orderProperties(value any) {
	switch value := value.(type) {
	case yaml.MapSlice:
		slices.SortStableFunc(value, func(a, b yaml.MapItem) int {
			return cmp.Compare(propertyIndex(a.Key), propertyIndex(b.Key))
		})
		for _, item := range value {
			orderProperties(item.Value)
		}
	case []any:
		for _, item := range value {
			orderProperties(item)
		}
	}
}

func parseDocument(data []byte) (yaml.MapSlice, error) {
	var document yaml.MapSlice
	err := yaml.UnmarshalWithOptions(data, &document, yaml.UseOrderedMap())
	if err == nil {
		orderProperties(document)
	}
	return document, err
}
