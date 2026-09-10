/**
 * @param {{devDependencies?: Record<string, string>}} packageJson
 * @param {{packages?: Record<string, {version?: string | undefined, integrity?: string | undefined, resolved?: string | undefined, license?: string | undefined}>}} lockfile
 * @param {{allowedLicenses: string[], packageLicenses: Record<string, string>, licenseReferences?: {declared: string, packages: string[], license: string}[]}} policy
 * @param {boolean} competingLock
 * @returns {string}
 */
export function validateDependencies(packageJson, lockfile, policy, competingLock = false) {
  const allowedLicenses = new Set(policy.allowedLicenses);
  const failures = [];
  if (competingLock) {
    failures.push("Use package-lock.json only. Remove bun.lock.");
  }

  for (const [name, version] of Object.entries(packageJson.devDependencies ?? {})) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
      failures.push(`${name} must use an exact version; found ${version}.`);
    }
  }

  const dependencies = Object.entries(lockfile.packages ?? {}).filter(([path]) => path !== "");
  for (const [path, metadata] of dependencies) {
    const name = path.slice(path.lastIndexOf("node_modules/") + 13);
    const key = `${name}@${metadata.version}`;
    const license =
      policy.licenseReferences?.find(
        (reference) => reference.declared === metadata.license && reference.packages.includes(key),
      )?.license ??
      metadata.license ??
      policy.packageLicenses[key];

    if (!metadata.integrity?.startsWith("sha512-")) {
      failures.push(`${key} must use SHA-512 package integrity metadata.`);
    }
    if (!metadata.resolved?.startsWith("https://registry.npmjs.org/")) {
      failures.push(`${key} does not resolve from the approved registry.`);
    }
    if (!license) {
      failures.push(`${key} is missing license metadata.`);
    } else if (!allowedLicenses.has(license)) {
      failures.push(`${key} uses unapproved license ${license}.`);
    }
  }

  if (dependencies.length === 0) {
    failures.push("The lockfile contains no dependencies.");
  }

  if (failures.length > 0) {
    throw new Error(failures.sort().join("\n"));
  }

  return `Verified ${dependencies.length} locked dependencies with approved integrity and licenses.\n`;
}

if (import.meta.main) {
  const [packageJson, lockfile, policy] = await Promise.all(
    ["package.json", "package-lock.json", "config/dependency-license-policy.json"].map((path) =>
      Bun.file(path).json(),
    ),
  );

  process.stdout.write(
    validateDependencies(packageJson, lockfile, policy, await Bun.file("bun.lock").exists()),
  );
}
