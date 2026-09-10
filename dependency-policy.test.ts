import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { validateDependencies } from "./scripts/check-dependency-policy.mjs";
const metadata = {
  version: "1.0.0",
  integrity: "sha512-fixture",
  resolved: "https://registry.npmjs.org/fixture/-/fixture-1.0.0.tgz",
  license: "MIT",
};

function checkPolicy(
  packages: NonNullable<Parameters<typeof validateDependencies>[1]["packages"]>,
  version = "1.0.0",
  competingLock = false,
): string {
  return validateDependencies(
    { devDependencies: { fixture: version } },
    { packages },
    {
      allowedLicenses: ["MIT"],
      packageLicenses: {},
      licenseReferences: [
        { declared: "SEE LICENSE IN LICENSE.md", license: "MIT", packages: ["fixture@1.0.0"] },
      ],
    },
    competingLock,
  );
}

describe("dependency policy", (): void => {
  it("validates the real repository through the CLI", (): void => {
    expect.assertions(2);
    const result = spawnSync(process.execPath, ["scripts/check-dependency-policy.mjs"], {
      encoding: "utf8",
      timeout: 5000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("locked dependencies with approved integrity and licenses.");
  });
  it("counts locked dependencies without counting the root package", (): void => {
    expect.assertions(2);
    const result = (): string => checkPolicy({ "": {}, "node_modules/fixture": metadata });
    expect(result).not.toThrow();
    expect(result()).toContain("Verified 1 locked dependencies");
  });

  it.each([
    [
      { "node_modules/fixture": metadata },
      "Use package-lock.json only. Remove bun.lock.",
      "1.0.0",
      true,
    ],
    [{ "": {} }, "lockfile contains no dependencies"],
    [{ "node_modules/fixture": metadata }, "must use an exact version", "^1.0.0"],
    [
      { "node_modules/fixture": { ...metadata, integrity: undefined } },
      "SHA-512 package integrity",
    ],
    [
      { "node_modules/fixture": { ...metadata, resolved: "https://example.com/file" } },
      "approved registry",
    ],
    [{ "node_modules/fixture": { ...metadata, license: undefined } }, "missing license metadata"],
    [{ "node_modules/fixture": { ...metadata, license: "unapproved" } }, "unapproved license"],
  ] as const)(
    "retains dependency enforcement: %j %s %s %s",
    (packages, message, version = "1.0.0", competingLock: boolean = false): void => {
      expect.assertions(2);
      const result = (): string => checkPolicy(packages, version, competingLock);
      expect(result).toThrow(Error);
      expect(result).toThrow(message);
    },
  );

  it.each([
    ["fixture", "1.0.0", "SEE LICENSE IN LICENSE.md", 0],
    ["other", "1.0.0", "SEE LICENSE IN LICENSE.md", 1],
    ["fixture", "1.0.1", "SEE LICENSE IN LICENSE.md", 1],
    ["fixture", "1.0.0", "SEE LICENSE IN README.md", 1],
    ["fixture", "1.0.0", "unapproved", 1],
  ])(
    "resolves only reviewed package references: %s@%s %s",
    (name, version, license, status): void => {
      expect.assertions(2);
      const result = (): string =>
        checkPolicy({ [`node_modules/${name}`]: { ...metadata, version, license } });
      if (status === 0) {
        expect(result).not.toThrow();
        expect(result()).toContain("Verified 1 locked dependencies");
      } else {
        expect(result).toThrow(Error);
        expect(result).toThrow(`unapproved license ${license}`);
      }
    },
  );
});
