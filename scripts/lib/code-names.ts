import { z } from "zod";

const SHORT = 20;
const LONGEST_PIECE = 30;
const LONGEST_PIECE_IN_CARD = 25;
const MIN_PIECE = 5;
const WBR = "<wbr />";
const OPEN = '<span className="cn">';
const NW_OPEN = '<span className="nw">';
const CLOSE = "</span>";
const FENCE = /^\s*(?:```|~~~)/u;
const TABLE_ROW = /^\s*\|/u;
const SEPARATOR = /[/._&=?,;:>\\(]/u;
const JSX_PIECE = String.raw`<code>\{"(?:[^"\\\n]|\\.)*"\}<\/code>`;
const PIECE = String.raw`(?:\x60[^\x60\n]+\x60|${JSX_PIECE})`;
const MARKED_SOURCE = String.raw`<span className="cn">(?:${PIECE}|<wbr \/>|<span className="nw">${PIECE}<\/span>)+<\/span>`;
const MARKED = new RegExp(MARKED_SOURCE, "gu");
const TOKEN = new RegExp(
  String.raw`${MARKED_SOURCE}|\x60\x60+[^\x60\n]*\x60\x60+|\x60([^\x60\n]+)\x60|<code>\{("(?:[^"\\\n]|\\.)*")\}<\/code>|<[^>\n]*>|\{[^}\n]*\}`,
  "gu",
);
const JSON_TEXT = z.string();

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
  for (const cut of cuts) {
    const last = merged.at(-1);
    if (
      last !== undefined &&
      (cut.length < MIN_PIECE || last.length < MIN_PIECE) &&
      cut.includes("-") === last.includes("-")
    ) {
      merged[merged.length - 1] = last + cut;
    } else {
      merged.push(cut);
    }
  }
  return merged;
}

const NUMBER = /^[$]?\d[\d,.:]*%?$/u;

function runsOf(code: string): string[] {
  const tokens = code.match(/\s+|\S+/gu) ?? [];
  const runs: string[] = [];
  for (let at = 0; at < tokens.length; at += 1) {
    const token = tokens[at] ?? "";
    const next = tokens[at + 2];
    if (NUMBER.test(token) && tokens[at + 1] === " " && next !== undefined) {
      runs.push(`${token} ${next}`);
      at += 2;
    } else {
      runs.push(token);
    }
  }
  return runs;
}

const keeps = (text: string): boolean => /[-\s]/u.test(text.trimEnd());

function segmentsOf(code: string): Piece[] {
  const segments: Array<{ kept: boolean; open: boolean; text: string }> = [];
  for (const run of runsOf(code)) {
    const last = segments.at(-1);
    if (/^\s+$/u.test(run)) {
      if (last === undefined) segments.push({ kept: false, open: true, text: run });
      else segments[segments.length - 1] = { ...last, text: last.text + run };
      continue;
    }
    const pieces = keeps(run) || run.length > SHORT ? piecesOf(run) : [run];
    pieces.forEach((text, at) => {
      const kept = keeps(text);
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
  Math.max(
    ...segmentsOf(code).flatMap(({ kept, text }) =>
      kept ? [text.trim().length] : text.split(/\s+/u).map((word) => word.length),
    ),
  );

type Form = "jsx" | "markdown";

const pieceMarkup = (text: string, form: Form): string =>
  form === "jsx" ? `<code>{${JSON.stringify(text)}}</code>` : `\x60${text}\x60`;

function markName(code: string, form: Form): string {
  const parts = segmentsOf(code).map(({ kept, text }) =>
    kept ? `${NW_OPEN}${pieceMarkup(text, form)}${CLOSE}` : pieceMarkup(text, form),
  );
  return `${OPEN}${parts.join(WBR)}${CLOSE}`;
}

const codeMarkup = (code: string): string =>
  needsMark(code) ? markName(code, "jsx") : pieceMarkup(code, "jsx");

const long = (code: string): boolean => code.length > SHORT && !/^\s|\s$/u.test(code) && code.trim() !== "";

function needsMark(code: string): boolean {
  if (!long(code)) return false;
  const [first, ...rest] = segmentsOf(code);
  return rest.length > 0 || (first !== undefined && !first.kept && /\s/u.test(first.text.trim()));
}

const codeOf = (match: RegExpMatchArray): string | undefined =>
  match[1] ?? (match[2] === undefined ? undefined : JSON_TEXT.parse(JSON.parse(match[2])));

const codesOf = (line: string): string[] =>
  [...line.matchAll(TOKEN)].flatMap((match) => {
    const code = codeOf(match);
    return code === undefined ? [] : [code];
  });

const markLine = (line: string): string =>
  line.replaceAll(TOKEN, (...args: unknown[]) => {
    const match = String(args[0]);
    const markdown = typeof args[1] === "string" ? args[1] : undefined;
    const jsx = typeof args[2] === "string" ? JSON_TEXT.parse(JSON.parse(args[2])) : undefined;
    if (markdown !== undefined && needsMark(markdown)) return markName(markdown, "markdown");
    if (jsx !== undefined && needsMark(jsx)) return markName(jsx, "jsx");
    return match;
  });

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
  return source.replaceAll(MARKED, (marked) => {
    if (!marked.includes("<code>{")) {
      return `\x60${[...marked.matchAll(/\x60([^\x60\n]+)\x60/gu)].map((part) => part[1] ?? "").join("")}\x60`;
    }
    const pieces = [...marked.matchAll(/<code>\{("(?:[^"\\\n]|\\.)*")\}<\/code>/gu)].map((part) =>
      JSON_TEXT.parse(JSON.parse(part[1] ?? "\"\"")),
    );
    return pieceMarkup(pieces.join(""), "jsx");
  });
}

function wideNames(source: string): string[] {
  const wide: string[] = [];
  let cards = 0;
  eachProseLine(unmark(source), (line) => {
    const budget = cards > 0 || line.includes("<Card ") ? LONGEST_PIECE_IN_CARD : LONGEST_PIECE;
    for (const code of codesOf(line)) if (long(code) && longestPiece(code) > budget) wide.push(code);
    cards += (line.match(/<Card[\s>]/gu) ?? []).length - (line.match(/<\/Card>/gu) ?? []).length;
    return line;
  });
  return wide;
}

export { breakNames, codeMarkup, LONGEST_PIECE, SHORT, unmark, wideNames };
