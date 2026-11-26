const JSON_MARKDOWN_LINK = /\[[^\]\n]*\]\([^)\s]*\.json(?:[?#][^)]*)?\)/gu;
const JSON_ANCHOR = /<a\s[^>]*href="[^"]*\.json(?:[?#][^"]*)?"[^>]*>/gu;
const SOURCE_ATTRIBUTES = [
  'type="application/json"',
  'className="link"',
  'target="_blank"',
  'rel="noreferrer"',
] as const;

function sourceJsonLinkFaults(source: string): readonly string[] {
  return [
    ...[...source.matchAll(JSON_MARKDOWN_LINK)].map(([link]) => link),
    ...[...source.matchAll(JSON_ANCHOR)]
      .map(([anchor]) => anchor)
      .filter((anchor) => !SOURCE_ATTRIBUTES.every((attribute) => anchor.includes(attribute))),
  ];
}

export { sourceJsonLinkFaults };
