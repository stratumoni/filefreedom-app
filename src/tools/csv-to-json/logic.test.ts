import { describe, expect, it } from 'vitest';
import { convertRows, detectDelimiter, parseCsv } from './logic';

describe('parseCsv', () => {
  it('parses quotes, escaped quotes, delimiters and newlines inside quotes', () => {
    const { rows } = parseCsv('a,b\n"x, y","he said ""hi"""\n"line1\nline2",z\n', ',');
    expect(rows).toEqual([['a', 'b'], ['x, y', 'he said "hi"'], ['line1\nline2', 'z']]);
  });
  it('handles CRLF, CR, BOM and no trailing newline', () => {
    expect(parseCsv('\uFEFFa,b\r\n1,2\r\n3,4', ',').rows).toEqual([['a', 'b'], ['1', '2'], ['3', '4']]);
    expect(parseCsv('a,b\r1,2', ',').rows).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('keeps empty fields and quoted empty rows', () => {
    expect(parseCsv('a,,c\n,,\n', ',').rows).toEqual([['a', '', 'c'], ['', '', '']]);
    expect(parseCsv('""\n', ',').rows).toEqual([['']]);
  });
  it('skips blank lines and reports it', () => {
    const r = parseCsv('a,b\n\n1,2\n', ',');
    expect(r.rows).toHaveLength(2);
    expect(r.warnings.join()).toMatch(/blank line/);
  });
  it('warns about an unclosed quote and stray quotes without crashing', () => {
    expect(parseCsv('a,"b\nc', ',').warnings.join()).toMatch(/never closed/);
    expect(parseCsv('5" pipe,x', ',').warnings.join()).toMatch(/inside unquoted/);
  });
  it('supports other delimiters', () => {
    expect(parseCsv('a;b\n1;2', ';').rows).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsv('a\tb', '\t').rows).toEqual([['a', 'b']]);
  });
  it('handles an empty file', () => {
    expect(parseCsv('', ',').rows).toEqual([]);
  });
});

describe('detectDelimiter', () => {
  it('detects common delimiters', () => {
    expect(detectDelimiter('a;b;c\n1;2;3\n')).toBe(';');
    expect(detectDelimiter('a\tb\n1\t2\n')).toBe('\t');
    expect(detectDelimiter('a|b\n1|2\n')).toBe('|');
    expect(detectDelimiter('a,b\n1,2\n')).toBe(',');
  });
  it('is not fooled by commas inside quoted semicolon data', () => {
    expect(detectDelimiter('name;note\nAda;"hello, world"\nBob;"x, y"\n')).toBe(';');
  });
});

describe('convertRows', () => {
  const rows = [['name', 'age', 'zip'], ['Ada', '36', '00123'], ['Bob', '', 'true']];
  const base = { header: true, infer: false, shape: 'objects', indent: 0 } as const;
  it('keeps every value as text by default', () => {
    const r = convertRows(rows, base);
    expect(JSON.parse(r.json)).toEqual([{ name: 'Ada', age: '36', zip: '00123' }, { name: 'Bob', age: '', zip: 'true' }]);
    expect(r.warnings).toEqual([]);
  });
  it('infers types only when asked, protects leading zeros, and warns', () => {
    const r = convertRows(rows, { ...base, infer: true });
    expect(JSON.parse(r.json)).toEqual([{ name: 'Ada', age: 36, zip: '00123' }, { name: 'Bob', age: null, zip: true }]);
    expect(r.warnings.join()).toMatch(/Type detection/);
  });
  it('does not convert numbers that JavaScript would round', () => {
    const r = convertRows([['id'], ['12345678901234567890']], { ...base, infer: true });
    expect(JSON.parse(r.json)[0].id).toBe('12345678901234567890');
  });
  it('fixes duplicate and empty headers and warns', () => {
    const r = convertRows([['a', 'a', ''], ['1', '2', '3']], base);
    expect(Object.keys(JSON.parse(r.json)[0])).toEqual(['a', 'a_2', 'column_3']);
    expect(r.warnings.join()).toMatch(/unique name/);
  });
  it('handles ragged rows and no header row', () => {
    const r = convertRows([['a', 'b'], ['1']], base);
    expect(JSON.parse(r.json)).toEqual([{ a: '1', b: null }]);
    expect(r.warnings.join()).toMatch(/different number/);
    expect(JSON.parse(convertRows([['x', 'y']], { ...base, header: false }).json)).toEqual([{ column_1: 'x', column_2: 'y' }]);
  });
  it('can output arrays of arrays', () => {
    expect(JSON.parse(convertRows(rows, { ...base, shape: 'arrays' }).json)[0]).toEqual(['name', 'age', 'zip']);
  });
  it('handles empty input', () => {
    expect(convertRows([], base).warnings[0]).toMatch(/no rows/);
  });
});
