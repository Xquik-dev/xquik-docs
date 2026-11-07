type FieldKind = "body" | "header" | "path" | "query" | "response";

interface DocumentedField {
  readonly description: string;
  readonly kind: FieldKind;
  readonly name: string;
  readonly required: boolean;
  readonly type: string;
}

const KIND_BY_LABEL: ReadonlyMap<string, FieldKind> = new Map([
  ["Body parameter", "body"],
  ["Field", "response"],
  ["Header", "header"],
  ["Path parameter", "path"],
  ["Query parameter", "query"],
]);

function tableCells(line: string): readonly string[] {
  return line
    .trim()
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .split(/(?<!\\)\|/u)
    .map((cell) => cell.trim());
}

function codeValue(cell: string): string {
  return cell.replace(/^`/u, "").replace(/`$/u, "").replaceAll("\\|", "|");
}

function fieldFromRow(
  kind: FieldKind,
  headers: readonly string[],
  row: readonly string[],
): DocumentedField {
  const requiredColumn = headers.indexOf("Required");
  return {
    description: row.at(-1) ?? "",
    kind,
    name: codeValue(row[0] ?? ""),
    required: requiredColumn >= 0 && row[requiredColumn] === "Yes",
    type: codeValue(row[1] ?? ""),
  };
}

function documentedFields(source: string): readonly DocumentedField[] {
  const fields: DocumentedField[] = [];
  let headers: readonly string[] = [];
  let kind: FieldKind | undefined;
  for (const line of source.split("\n")) {
    if (!line.trimStart().startsWith("|")) {
      kind = undefined;
      continue;
    }
    const row = tableCells(line);
    if (kind === undefined) {
      headers = row;
      kind = KIND_BY_LABEL.get(row[0] ?? "");
    } else if (!/^-+$/u.test(row[0] ?? "")) {
      fields.push(fieldFromRow(kind, headers, row));
    }
  }
  return fields;
}

function leafName(field: string): string {
  return field.split(".").at(-1)?.replace(/\[\]$/u, "") ?? field;
}

function hasDocumentedField(source: string, kind: FieldKind, name: string): boolean {
  return documentedFields(source).some(
    (field): boolean =>
      field.kind === kind && (field.name === name || leafName(field.name) === name),
  );
}

export { documentedFields, hasDocumentedField, leafName };
export type { DocumentedField, FieldKind };
