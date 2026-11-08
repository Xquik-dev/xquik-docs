export const PARAGRAPH_SEPARATOR = '{"\\n"}';

export function withoutParagraphSeparators(source: string): string {
  return source.replaceAll(PARAGRAPH_SEPARATOR, " ");
}
