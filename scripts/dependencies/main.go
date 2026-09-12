package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

type manifest struct{ DevDependencies map[string]string }
type metadata struct {
	Version, Integrity, Resolved string
	License                      *string
}
type lockfile struct{ Packages map[string]metadata }
type policy struct {
	AllowedLicenses   []string
	PackageLicenses   map[string]string
	LicenseReferences []struct {
		Declared, License string
		Packages          []string
	}
}

func validateDependencies(pkg manifest, lock lockfile, rules policy, competingLock bool) (string, error) {
	var failures []string
	if competingLock {
		failures = append(failures, "Use package-lock.json only. Remove bun.lock.")
	}
	exactVersion := regexp.MustCompile(`^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$`)
	for name, version := range pkg.DevDependencies {
		if !exactVersion.MatchString(version) {
			failures = append(failures, fmt.Sprintf("%s must use an exact version; found %s.", name, version))
		}
	}
	count := 0
	for path, entry := range lock.Packages {
		if path == "" {
			continue
		}
		count++
		start := strings.LastIndex(path, "node_modules/")
		if start < 0 {
			failures = append(failures, path+" is not a node_modules dependency path.")
			continue
		}
		key := path[start+13:] + "@" + entry.Version
		license := rules.PackageLicenses[key]
		if entry.License != nil {
			license = *entry.License
			for _, reference := range rules.LicenseReferences {
				if reference.Declared == license && slices.Contains(reference.Packages, key) {
					license = reference.License
					break
				}
			}
		}
		if !strings.HasPrefix(entry.Integrity, "sha512-") {
			failures = append(failures, key+" must use SHA-512 package integrity metadata.")
		}
		if !strings.HasPrefix(entry.Resolved, "https://registry.npmjs.org/") {
			failures = append(failures, key+" does not resolve from the approved registry.")
		}
		if license == "" {
			failures = append(failures, key+" is missing license metadata.")
		} else if !slices.Contains(rules.AllowedLicenses, license) {
			failures = append(failures, key+" uses unapproved license "+license+".")
		}
	}
	if count == 0 {
		failures = append(failures, "The lockfile contains no dependencies.")
	}
	if len(failures) > 0 {
		slices.Sort(failures)
		return "", fmt.Errorf("%s", strings.Join(failures, "\n"))
	}
	return fmt.Sprintf("Verified %d locked dependencies with approved integrity and licenses.\n", count), nil
}

func checkRepository(root string) (string, error) {
	var pkg manifest
	var lock lockfile
	var rules policy
	for path, target := range map[string]any{"package.json": &pkg, "package-lock.json": &lock, "config/dependency-license-policy.json": &rules} {
		data, err := os.ReadFile(filepath.Join(root, path))
		if err == nil {
			err = json.Unmarshal(data, target)
		}
		if err != nil {
			return "", fmt.Errorf("%s: %w", path, err)
		}
	}
	_, err := os.Stat(filepath.Join(root, "bun.lock"))
	if err != nil && !os.IsNotExist(err) {
		return "", err
	}
	return validateDependencies(pkg, lock, rules, err == nil)
}

func main() {
	result, err := checkRepository(".")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Print(result)
}
