export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}
