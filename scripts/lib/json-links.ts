const JSON_URL = String.raw`[^\s"'\x60()<>{}]*\.json(?:[?#][^\s"'\x60()<>{}]*)?`;
const JSON_TAG = new RegExp(
  String.raw`<[A-Za-z][\w.]*\s[^>]*\bhref=(?:"${JSON_URL}"|'${JSON_URL}'|\{\s*["'\x60]${JSON_URL}["'\x60]\s*\})[^>]*>`,
  "gu",
);
const JSON_MARKDOWN_LINK = new RegExp(
  String.raw`\[[^\]\n]*\]\(\s*<?${JSON_URL}>?(?:\s+["'(][^)\n]*)?\)|^ {0,3}\[[^\]\n]+\]:[ \t]*<?${JSON_URL}>?|<https?://${JSON_URL}>`,
  "gmu",
);
const ANCHOR = /^<a\s/u;
const SOURCE_ATTRIBUTES = [
  'type="application/json"',
  'className="link"',
  'target="_blank"',
  'rel="noreferrer"',
] as const;
const DOWNLOAD = /\sdownload(?=[\s=/>])/u;
const OTHER_SITE = /\shref=\{?\s*["'\x60]?(?:https?:)?\/\/(?!docs\.xquik\.com(?:[/?#"'\x60]|$))/u;

function downloadsFromAnotherSite(tag: string): boolean {
  return DOWNLOAD.test(tag) && OTHER_SITE.test(tag);
}

function sourceJsonLinkFaults(source: string): readonly string[] {
  return [
    ...[...source.matchAll(JSON_MARKDOWN_LINK)].map(([link]) => link),
    ...[...source.matchAll(JSON_TAG)]
      .map(([tag]) => tag)
      .filter(
        (tag) =>
          !ANCHOR.test(tag) ||
          !SOURCE_ATTRIBUTES.every((attribute) => tag.includes(attribute)) ||
          downloadsFromAnotherSite(tag),
      ),
  ];
}

function sourceDownloadFaults(_source: string): readonly string[] {
  return [];
}

export { downloadsFromAnotherSite, sourceDownloadFaults, sourceJsonLinkFaults };
