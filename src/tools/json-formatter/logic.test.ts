import { describe, expect, it } from 'vitest';
import { parseJson, serialize } from './logic';

const fmt = (s: string, o: Partial<Parameters<typeof serialize>[1]> = {}) => {
  const r = parseJson(s);
  if (!r.ok) throw new Error(r.error.message);
  return serialize(r.node, { indent: 2, sortKeys: false, ...o });
};
const err = (s: string) => {
  const r = parseJson(s);
  if (r.ok) throw new Error('expected failure');
  return r.error;
};

describe('parseJson + serialize', () => {
  it('formats valid JSON identically to JSON.stringify for ordinary data', () => {
    const src = '{"a":1,"b":[true,null,"x\\n"],"c":{"d":-1.5}}';
    expect(fmt(src)).toBe(JSON.stringify(JSON.parse(src), null, 2));
  });
  it('keeps number notation exactly as written (JSON.stringify would rewrite 1.5e3 as 1500)', () => {
    expect(fmt('[1.5e3, 1.0, -0]', { indent: 'min' })).toBe('[1.5e3,1.0,-0]');
  });
  it('minifies', () => {
    expect(fmt('{ "a" : [ 1 , 2 ] }', { indent: 'min' })).toBe('{"a":[1,2]}');
  });
  it('supports 4 spaces, tabs, empty containers and sorted keys', () => {
    expect(fmt('{"b":1,"a":{}}', { indent: 4, sortKeys: true })).toBe('{\n    "a": {},\n    "b": 1\n}');
    expect(fmt('[[]]', { indent: 'tab' })).toBe('[\n\t[]\n]');
  });
  it('keeps big integers and long decimals exactly, and warns', () => {
    const r = parseJson('{"id": 12345678901234567890, "p": 0.1234567890123456789}');
    expect(r.ok && r.warnings.length).toBe(1);
    expect(fmt('{"id":12345678901234567890}')).toContain('12345678901234567890');
    expect(JSON.parse('{"id":12345678901234567890}').id).not.toBe(12345678901234567890n);
  });
  it('warns about duplicate keys and keeps both', () => {
    const r = parseJson('{"a":1,"a":2}');
    expect(r.ok && r.warnings[0]).toMatch(/duplicate key/);
    expect(fmt('{"a":1,"a":2}')).toContain('"a": 2');
    expect(fmt('{"a":1,"a":2}').match(/"a"/g)).toHaveLength(2);
  });
  it('strips a byte order mark', () => {
    const r = parseJson('\uFEFF{"a":1}');
    expect(r.ok && r.bomRemoved).toBe(true);
  });
  it('accepts top-level scalars and unicode escapes', () => {
    expect(fmt('"\\u00e9"')).toBe('"\\u00e9"');
    expect(fmt(' 42 ')).toBe('42');
  });
});

describe('errors report exact line and column', () => {
  it('trailing comma', () => {
    const e = err('{\n  "a": 1,\n}');
    expect(e.message).toMatch(/Trailing comma/);
    expect([e.line, e.column]).toEqual([2, 9]); // points at the comma itself
    const a = err('[1,\n 2,\n]');
    expect([a.line, a.column]).toEqual([2, 3]);
  });
  it('missing comma between members', () => {
    const e = err('{"a": 1\n "b": 2}');
    expect(e.message).toMatch(/Expected "," or "}"/);
    expect(e.line).toBe(2);
    expect(e.column).toBe(2);
  });
  it('single quotes, comments, unquoted keys', () => {
    expect(err("{'a':1}").message).toMatch(/double quotes/);
    expect(err('// hi\n{}').message).toMatch(/Comments/);
    expect(err('{a:1}').message).toMatch(/key in double quotes/);
  });
  it('unterminated string, bad escape, raw newline in string, leading zero', () => {
    expect(err('{"a":"x').message).toMatch(/Unterminated/);
    expect(err('"\\q"').message).toMatch(/Invalid escape/);
    expect(err('"a\nb"').message).toMatch(/line breaks/);
    expect(err('01').message).toMatch(/leading zeros/);
  });
  it('extra content and truncated input', () => {
    expect(err('{} {}').message).toMatch(/after the end/);
    expect(err('{"a":').message).toMatch(/end of input/);
    expect(err('').message).toMatch(/end of input/);
  });
  it('rejects pathological nesting without crashing', () => {
    expect(err('['.repeat(2000)).message).toMatch(/deep/);
  });
  it('rejects NaN, Infinity and undefined', () => {
    expect(err('NaN').message).toMatch(/Unexpected/);
    expect(err('{"a": undefined}').message).toMatch(/Unexpected/);
  });
});
