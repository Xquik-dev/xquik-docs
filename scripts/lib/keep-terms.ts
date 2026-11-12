const GENERATED_LIST = "api-reference/features.mdx";
const OPEN = '<span className="nw">';
const CLOSE = "</span>";
const FENCE = /^\s*(?:```|~~~)/u;
const TERM_LINE = /^\s*(?:\||[-*+]\s|\d+\.\s|#{2,6}\s(?!\d{3}\b))/u;
const PROTECTED =
  /<span className="nw">[^<]*<\/span>|`[^`\n]*`|<[^>\n]*>|\{[^}\n]*\}|\]\([^)\n]*\)|https?:\/\/[^\s)|]+|&[#\w]+;/gu;
const TOKEN = /\S+|\s+/gu;
const COMPOUND = /^[\p{L}\p{N}][\p{L}\p{N}_.%]*(?:[-\u2011/][\p{L}\p{N}_.*%]+)+$/u;
const NUMBER = /^[$]?\d[\d,.:]*(?:[-–]\d[\d,.:]*)?%?$/u;
const WORD = /^[\p{L}%]/u;
const LEAD = /^[("'[*_]*/u;
const TRAIL = /[)"'\].,;:!?*_]*$/u;

interface Token {
  readonly core: string;
  readonly lead: string;
  readonly trail: string;
}

function split(token: string): Token {
  const lead = LEAD.exec(token)?.[0] ?? "";
  const rest = token.slice(lead.length);
  const trail = TRAIL.exec(rest)?.[0] ?? "";
  return { core: rest.slice(0, rest.length - trail.length), lead, trail };
}

const wrap = (text: string): string => `${OPEN}${text}${CLOSE}`;

function keepPlain(text: string): string {
  const tokens = text.match(TOKEN) ?? [];
  const out: string[] = [];
  for (let at = 0; at < tokens.length; at += 1) {
    const token = tokens[at] ?? "";
    const part = split(token);
    const space = tokens[at + 1] ?? "";
    const next = split(tokens[at + 2] ?? "");
    const joins =
      NUMBER.test(part.core) &&
      part.trail === "" &&
      /^ $/u.test(space) &&
      next.lead === "" &&
      WORD.test(next.core);
    if (joins) {
      out.push(`${part.lead}${wrap(`${part.core} ${next.core}`)}${next.trail}`);
      at += 2;
    } else if (COMPOUND.test(part.core)) {
      out.push(`${part.lead}${wrap(part.core)}${part.trail}`);
    } else {
      out.push(token);
    }
  }
  return out.join("");
}

const CODE_NUMBER =
  /`[$]?\d[\d,.:]*%?` [\p{L}%][\p{L}\p{N}_]*|(?<![\p{L}\p{N}_.,$`-])[$]?\d(?:[\d,.:]*\d)?%? `[^`\n]+`/gu;

function keepLine(source: string): string {
  const line = source.replaceAll(CODE_NUMBER, (match, at: number) =>
    source.lastIndexOf(OPEN, at) > source.lastIndexOf(CLOSE, at) ? match : wrap(match),
  );
  let out = "";
  let from = 0;
  for (const match of line.matchAll(PROTECTED)) {
    out += keepPlain(line.slice(from, match.index)) + match[0];
    from = match.index + match[0].length;
  }
  return out + keepPlain(line.slice(from));
}

function keepTerms(source: string): string {
  const lines = source.split("\n");
  let fenced = false;
  let front = lines[0] === "---";
  return lines
    .map((line, at) => {
      if (front) {
        if (at > 0 && line === "---") front = false;
        return line;
      }
      if (FENCE.test(line)) {
        fenced = !fenced;
        return line;
      }
      if (fenced || !TERM_LINE.test(line)) return line;
      const head = TERM_LINE.exec(line)?.[0] ?? "";
      return head + keepLine(line.slice(head.length));
    })
    .join("\n");
}

export { GENERATED_LIST, keepTerms };
