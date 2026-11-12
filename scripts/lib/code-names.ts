const SHORT = 20;
const LONGEST_PIECE = 24;
const MIN_PIECE = 5;
const WBR = "<wbr />";
const OPEN = '<span className="cn">';
const NW_OPEN = '<span className="nw">';
const CLOSE = "</span>";
const FENCE = /^\s*(?:```|~~~)/u;
const TABLE_ROW = /^\s*\|/u;
const SEPARATOR = /[/._&=?,;:>\\(]/u;
const MARKED = /<span className="cn">(?:`[^`\n]+`|<wbr \/>|<span className="nw">`[^`\n]+`<\/span>)+<\/span>/gu;
const TOKEN =
  /<span className="cn">(?:`[^`\n]+`|<wbr \/>|<span className="nw">`[^`\n]+`<\/span>)+<\/span>|``+[^`\n]*``+|`([^`\n]+)`|<[^>\n]*>|\{[^}\n]*\}/gu;

interface Piece {
  readonly kept: boolean;
  readonly text: string;
}

function piecesOf(run: string): string[] {
  const cuts: string[] = [];
  let piece = "";
  for (let at = 0; at < run.length; at += 1) {
    const char = run[at] ?? "";
    const next = run[at + 1] ?? "";
    piece += char;
    const ends = SEPARATOR.test(char) && next !== "" && !SEPARATOR.test(next);
    const leading = /^[/._&=?,;:>\\(]+$/u.test(piece);
    if (ends && !leading) {
      cuts.push(piece);
      piece = "";
    }
  }
  if (piece !== "") cuts.push(piece);
  const merged: string[] = [];
  let carry = "";
  for (const cut of cuts) {
    carry += cut;
    if (carry.length >= MIN_PIECE) {
      merged.push(carry);
      carry = "";
    }
  }
  if (carry !== "") {
    const last = merged.pop();
    merged.push(last === undefined ? carry : last + carry);
  }
  return merged;
}

function segmentsOf(code: string): Piece[] {
  const segments: Array<{ kept: boolean; open: boolean; text: string }> = [];
  for (const token of code.match(/\s+|\S+/gu) ?? []) {
    const last = segments.at(-1);
    if (/^\s/u.test(token)) {
      if (last === undefined) segments.push({ kept: false, open: true, text: token });
      else segments[segments.length - 1] = { ...last, text: last.text + token };
      continue;
    }
    const controlled = token.includes("-") || token.length > SHORT;
    const pieces = controlled ? piecesOf(token) : [token];
    pieces.forEach((text, at) => {
      const kept = text.includes("-");
      const tail = segments.at(-1);
      if (at === 0 && !kept && tail !== undefined && tail.open) {
        segments[segments.length - 1] = { ...tail, text: tail.text + text };
      } else {
        segments.push({ kept, open: !kept, text });
      }
    });
  }
  return segments.map(({ kept, text }) => ({ kept, text }));
}

const longestPiece = (code: string): number =>
  Math.max(...segmentsOf(code).flatMap(({ text }) => text.split(/\s+/u).map((word) => word.length)));

function markName(code: string): string {
  const parts = segmentsOf(code).map(({ kept, text }) =>
    kept ? `${NW_OPEN}\`${text}\`${CLOSE}` : `\`${text}\``,
  );
  return `${OPEN}${parts.join(WBR)}${CLOSE}`;
}

const needsMark = (code: string): boolean =>
  code.length > SHORT && !/^\s|\s$/u.test(code) && code.trim() !== "";

const codesOf = (line: string): string[] =>
  [...line.matchAll(TOKEN)].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

const markLine = (line: string): string =>
  line.replaceAll(TOKEN, (match, code: string | undefined) =>
    code !== undefined && needsMark(code) ? markName(code) : match,
  );

function eachProseLine(source: string, change: (line: string) => string): string {
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
      return fenced || TABLE_ROW.test(line) ? line : change(line);
    })
    .join("\n");
}

function breakNames(source: string): string {
  return eachProseLine(source, markLine);
}

function unmark(source: string): string {
  return source.replaceAll(MARKED, (marked) =>
    `\`${[...marked.matchAll(/`([^`\n]+)`/gu)].map((part) => part[1] ?? "").join("")}\``,
  );
}

function wideNames(source: string): string[] {
  const wide: string[] = [];
  eachProseLine(unmark(source), (line) => {
    for (const code of codesOf(line)) if (needsMark(code) && longestPiece(code) > LONGEST_PIECE) wide.push(code);
    return line;
  });
  return wide;
}

export { breakNames, LONGEST_PIECE, SHORT, unmark, wideNames };
