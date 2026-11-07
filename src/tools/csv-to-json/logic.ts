export type Delimiter = ',' | ';' | '\t' | '|';
export const DELIMITERS: { value: Delimiter; label: string }[] = [
  { value: ',', label: 'Comma' }, { value: ';', label: 'Semicolon' }, { value: '\t', label: 'Tab' }, { value: '|', label: 'Pipe' },
];

export interface ParsedCsv { rows: string[][]; warnings: string[] }

/** RFC 4180 style parser: quoted fields, escaped quotes (""), embedded newlines, CRLF/LF/CR, BOM. */
export function parseCsv(input: string, delimiter: Delimiter): ParsedCsv {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  const warnings: string[] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  let fieldWasQuoted = false;
  let rowHadQuoted = false; // a row of just "" is data, not a blank line
  let strayQuotes = 0;
  let blankLines = 0;
  const pushField = () => { if (fieldWasQuoted) rowHadQuoted = true; row.push(field); field = ''; fieldWasQuoted = false; };
  const pushRow = () => {
    if (row.length === 1 && row[0] === '' && !rowHadQuoted) blankLines++;
    else rows.push(row);
    row = [];
    rowHadQuoted = false;
  };

  while (i < text.length) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"' && field === '' && !fieldWasQuoted) { inQuotes = true; fieldWasQuoted = true; i++; continue; }
    if (c === '"') { strayQuotes++; field += c; i++; continue; }
    if (c === delimiter) { pushField(); i++; continue; }
    if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      pushField(); pushRow(); i++; continue;
    }
    field += c; i++;
  }
  if (inQuotes) warnings.push('A quoted value is never closed, so the end of the file was treated as part of that value. Check for a missing closing quote.');
  if (field !== '' || row.length > 0 || fieldWasQuoted) { pushField(); pushRow(); }
  if (strayQuotes) warnings.push(`${strayQuotes} quote character${strayQuotes > 1 ? 's' : ''} appear inside unquoted values and were kept as text.`);
  if (blankLines) warnings.push(`${blankLines} blank line${blankLines > 1 ? 's were' : ' was'} skipped.`);
  return { rows, warnings };
}

/** Choose the delimiter that gives the most consistent multi-column rows in the first lines. */
export function detectDelimiter(text: string): Delimiter {
  const sample = text.slice(0, 20000);
  let best: Delimiter = ',';
  let bestScore = -1;
  for (const d of [',', ';', '\t', '|'] as Delimiter[]) {
    const { rows } = parseCsv(sample, d);
    const lines = rows.slice(0, 20).filter((r) => r.length > 0);
    if (lines.length === 0) continue;
    const counts = new Map<number, number>();
    for (const r of lines) counts.set(r.length, (counts.get(r.length) ?? 0) + 1);
    const [cols, freq] = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]!;
    const score = cols > 1 ? freq * 100 + cols : 0;
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return best;
}

export interface ConvertOptions { header: boolean; infer: boolean; shape: 'objects' | 'arrays'; indent: 0 | 2 | 4 }
export interface ConvertResult { json: string; rowCount: number; columnCount: number; warnings: string[] }

const INT_OR_DEC = /^-?(0|[1-9]\d*)(\.\d+)?$/;

function inferValue(v: string, stats: { converted: number }): unknown {
  if (v === '') { stats.converted++; return null; }
  if (v === 'true') { stats.converted++; return true; }
  if (v === 'false') { stats.converted++; return false; }
  if (INT_OR_DEC.test(v) && v.replace(/^-/, '').replace('.', '').replace(/^0+/, '').length <= 15) { stats.converted++; return Number(v); }
  return v;
}

export function convertRows(rows: string[][], opts: ConvertOptions): ConvertResult {
  const warnings: string[] = [];
  const stats = { converted: 0 };
  if (rows.length === 0) return { json: '[]', rowCount: 0, columnCount: 0, warnings: ['The file has no rows.'] };
  const width = Math.max(...rows.map((r) => r.length));
  const cell = (v: string) => (opts.infer ? inferValue(v, stats) : v);

  let out: unknown[];
  let dataRows: string[][];
  if (opts.shape === 'objects') {
    const headerRow = opts.header ? rows[0]! : Array.from({ length: width }, (_, i) => `column_${i + 1}`);
    dataRows = opts.header ? rows.slice(1) : rows;
    const names: string[] = [];
    const used = new Map<string, number>();
    let renamed = 0;
    for (let c = 0; c < Math.max(width, headerRow.length); c++) {
      let name = (headerRow[c] ?? '').trim() || `column_${c + 1}`;
      if ((headerRow[c] ?? '').trim() === '' && opts.header) renamed++;
      const n = (used.get(name) ?? 0) + 1;
      used.set(name, n);
      if (n > 1) { name = `${name}_${n}`; renamed++; }
      names.push(name);
    }
    if (renamed) warnings.push(`${renamed} column name${renamed > 1 ? 's were' : ' was'} empty or repeated and got a unique name (for example "column_3" or "name_2").`);
    let ragged = 0;
    out = dataRows.map((r) => {
      if (r.length !== names.length) ragged++;
      const o: Record<string, unknown> = {};
      names.forEach((n, c) => { o[n] = c < r.length ? cell(r[c]!) : null; });
      return o;
    });
    if (ragged) warnings.push(`${ragged} row${ragged > 1 ? 's have' : ' has'} a different number of values than the header. Missing values are null.`);
    if (names.length > 0 && opts.header && rows[0]!.length < width) warnings.push('Some rows are wider than the header; extra columns were named column_N.');
  } else {
    dataRows = rows;
    out = rows.map((r) => r.map(cell));
  }
  if (opts.infer && stats.converted) warnings.push(`Type detection changed ${stats.converted} value${stats.converted > 1 ? 's' : ''} (empty cells to null, "true"/"false" to booleans, plain numbers to numbers). Values like "007" or very long numbers stay text.`);
  return { json: JSON.stringify(out, null, opts.indent || undefined), rowCount: dataRows.length, columnCount: width, warnings };
}
