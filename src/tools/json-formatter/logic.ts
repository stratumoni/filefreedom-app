/**
 * A strict RFC 8259 JSON parser that keeps number and string text exactly as written.
 * JSON.parse would silently round big integers and drop duplicate keys, and its error
 * messages differ between browsers. This parser gives one consistent line/column.
 */
export type JNode =
  | { t: 'obj'; entries: [string, JNode][] }
  | { t: 'arr'; items: JNode[] }
  | { t: 'str'; raw: string }
  | { t: 'num'; raw: string }
  | { t: 'lit'; raw: string };

export interface JsonError { message: string; offset: number; line: number; column: number }
export type ParseResult =
  | { ok: true; node: JNode; warnings: string[]; bomRemoved: boolean }
  | { ok: false; error: JsonError };

const MAX_DEPTH = 512;
const NUM = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/;

export function locate(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      col = 1;
    } else if (text[i] === '\r' && text[i + 1] !== '\n') {
      line++;
      col = 1;
    } else if (text[i] !== '\r') col++;
  }
  return { line, column: col };
}

class Fail extends Error {
  constructor(msg: string, public offset: number) { super(msg); }
}

export function parseJson(input: string): ParseResult {
  const bomRemoved = input.charCodeAt(0) === 0xfeff;
  const text = bomRemoved ? input.slice(1) : input;
  let i = 0;
  const warnings: string[] = [];
  let dupKeys = 0;
  let bigInts = 0;

  const ws = () => { while (i < text.length && ' \t\n\r'.includes(text[i]!)) i++; };
  const describe = (c: string | undefined) => (c === undefined ? 'end of input' : c === '\n' ? 'a line break' : `"${c}"`);

  function value(depth: number): JNode {
    if (depth > MAX_DEPTH) throw new Fail(`Nested more than ${MAX_DEPTH} levels deep`, i);
    ws();
    const c = text[i];
    if (c === '{') return object(depth);
    if (c === '[') return array(depth);
    if (c === '"') return { t: 'str', raw: string() };
    if (c === "'") throw new Fail('Strings must use double quotes ("), not single quotes (\')', i);
    if (c === '/' ) throw new Fail('Comments are not allowed in JSON', i);
    if (c === '-' || (c !== undefined && c >= '0' && c <= '9')) return number();
    for (const lit of ['true', 'false', 'null']) {
      if (text.startsWith(lit, i)) {
        const after = text[i + lit.length];
        if (after === undefined || !/[A-Za-z0-9_]/.test(after)) {
          i += lit.length;
          return { t: 'lit', raw: lit };
        }
      }
    }
    if (c === undefined) throw new Fail('Unexpected end of input: a value is missing', i);
    if (c === ']' || c === '}' ) throw new Fail(`Unexpected ${describe(c)}. A value is missing before it (trailing comma?)`, i);
    if (c === ',' || c === ':') throw new Fail(`Unexpected ${describe(c)} where a value was expected`, i);
    throw new Fail(`Unexpected ${describe(c)} where a value was expected`, i);
  }

  function string(): string {
    const start = i;
    i++; // opening quote
    while (i < text.length) {
      const c = text[i]!;
      if (c === '"') {
        i++;
        return text.slice(start, i);
      }
      if (c === '\\') {
        const n = text[i + 1];
        if (n !== undefined && '"\\/bfnrt'.includes(n)) i += 2;
        else if (n === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) throw new Fail('Invalid \\u escape: expected 4 hex digits', i);
          i += 6;
        } else throw new Fail(`Invalid escape sequence "\\${n ?? ''}"`, i);
      } else if (c < ' ') {
        throw new Fail('Raw line breaks and control characters are not allowed inside a string. Use \\n or \\t', i);
      } else i++;
    }
    throw new Fail('Unterminated string: the closing quote is missing', start);
  }

  function number(): JNode {
    const m = NUM.exec(text.slice(i, i + 400));
    if (!m) throw new Fail('Invalid number', i);
    const raw = m[0];
    const next = text[i + raw.length];
    if (next !== undefined && /[0-9A-Za-z.+_-]/.test(next)) {
      if (/^-?0\d/.test(text.slice(i, i + 3))) throw new Fail('Numbers cannot have leading zeros', i);
      throw new Fail('Invalid number', i);
    }
    if (!/[.eE]/.test(raw)) {
      if (!Number.isSafeInteger(Number(raw))) bigInts++;
    } else if (raw.replace(/^-/, '').replace(/[eE].*$/, '').replace('.', '').replace(/^0+/, '').length > 17) bigInts++;
    i += raw.length;
    return { t: 'num', raw };
  }

  function array(depth: number): JNode {
    i++;
    const items: JNode[] = [];
    ws();
    if (text[i] === ']') {
      i++;
      return { t: 'arr', items };
    }
    for (;;) {
      items.push(value(depth + 1));
      ws();
      const c = text[i];
      if (c === ',') {
        const comma = i;
        i++;
        ws();
        if (text[i] === ']') throw new Fail('Trailing comma: remove the comma before "]"', comma);
        continue;
      }
      if (c === ']') {
        i++;
        return { t: 'arr', items };
      }
      throw new Fail(`Expected "," or "]" but found ${describe(c)}`, i);
    }
  }

  function object(depth: number): JNode {
    i++;
    const entries: [string, JNode][] = [];
    const seen = new Set<string>();
    let lastComma = i;
    ws();
    if (text[i] === '}') {
      i++;
      return { t: 'obj', entries };
    }
    for (;;) {
      ws();
      const c = text[i];
      if (c !== '"') {
        if (c === '}') throw new Fail('Trailing comma: remove the comma before "}"', lastComma);
        if (c === "'") throw new Fail('Keys must use double quotes ("), not single quotes (\')', i);
        if (c === undefined) throw new Fail('Unexpected end of input: the object is not closed', i);
        throw new Fail(`Expected a key in double quotes but found ${describe(c)}`, i);
      }
      const rawKey = string();
      const key = JSON.parse(rawKey) as string;
      if (seen.has(key)) dupKeys++;
      seen.add(key);
      ws();
      if (text[i] !== ':') throw new Fail(`Expected ":" after the key but found ${describe(text[i])}`, i);
      i++;
      entries.push([rawKey, value(depth + 1)]);
      ws();
      const d = text[i];
      if (d === ',') {
        lastComma = i;
        i++;
        continue;
      }
      if (d === '}') {
        i++;
        return { t: 'obj', entries };
      }
      throw new Fail(`Expected "," or "}" but found ${describe(d)}`, i);
    }
  }

  try {
    const node = value(0);
    ws();
    if (i < text.length) throw new Fail(`Unexpected ${describe(text[i])} after the end of the JSON value`, i);
    if (dupKeys) warnings.push(`${dupKeys} duplicate key${dupKeys > 1 ? 's' : ''} found. Most programs keep only the last value for a repeated key.`);
    if (bigInts) warnings.push(`${bigInts} number${bigInts > 1 ? 's are' : ' is'} too precise for JavaScript (beyond 15\u201317 digits). They are kept exactly as written here, but programs that read this JSON as a regular number may round them.`);
    return { ok: true, node, warnings, bomRemoved };
  } catch (e) {
    if (e instanceof Fail) {
      const off = Math.min(e.offset, text.length);
      return { ok: false, error: { message: e.message, offset: off, ...locate(text, off) } };
    }
    throw e;
  }
}

export interface FormatOptions { indent: 2 | 4 | 'tab' | 'min'; sortKeys: boolean }

export function serialize(node: JNode, opts: FormatOptions): string {
  const unit = opts.indent === 'min' ? '' : opts.indent === 'tab' ? '\t' : ' '.repeat(opts.indent);
  const nl = opts.indent === 'min' ? '' : '\n';
  const colon = opts.indent === 'min' ? ':' : ': ';
  const out = (n: JNode, level: number): string => {
    if (n.t === 'str' || n.t === 'num' || n.t === 'lit') return n.raw;
    const pad = unit.repeat(level + 1);
    const end = unit.repeat(level);
    if (n.t === 'arr') {
      if (n.items.length === 0) return '[]';
      return `[${nl}${n.items.map((c) => pad + out(c, level + 1)).join(',' + nl)}${nl}${end}]`;
    }
    if (n.entries.length === 0) return '{}';
    const entries = opts.sortKeys ? [...n.entries].sort((a, b) => cmp(JSON.parse(a[0]) as string, JSON.parse(b[0]) as string)) : n.entries;
    return `{${nl}${entries.map(([k, v]) => pad + k + colon + out(v, level + 1)).join(',' + nl)}${nl}${end}}`;
  };
  return out(node, 0);
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function describeStructure(node: JNode): string {
  if (node.t === 'obj') return `object with ${node.entries.length} key${node.entries.length === 1 ? '' : 's'}`;
  if (node.t === 'arr') return `array with ${node.items.length} item${node.items.length === 1 ? '' : 's'}`;
  return node.t === 'str' ? 'string' : node.t === 'num' ? 'number' : node.raw;
}
