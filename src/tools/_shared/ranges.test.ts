import { describe, expect, it } from 'vitest';
import { formatPageRanges, parsePageRanges } from './ranges';

const ok = (s: string, n = 10) => { const r = parsePageRanges(s, n); if (!r.ok) throw new Error(r.error); return r.pages; };
const bad = (s: string, n = 10) => { const r = parsePageRanges(s, n); if (r.ok) throw new Error('expected error'); return r.error; };

describe('parsePageRanges', () => {
  it('parses pages and ranges (zero-based, in typed order)', () => {
    expect(ok('1-3, 5')).toEqual([0, 1, 2, 4]);
    expect(ok('3,1')).toEqual([2, 0]);
    expect(ok('2, 2')).toEqual([1, 1]);
    expect(ok(' 4 – 6 ;9')).toEqual([3, 4, 5, 8]);
  });
  it('supports an open end', () => {
    expect(ok('8-')).toEqual([7, 8, 9]);
    expect(ok('1,9-', 10)).toEqual([0, 8, 9]);
  });
  it('explains every kind of mistake', () => {
    expect(bad('')).toMatch(/at least one page/);
    expect(bad('0')).toMatch(/start at 1/);
    expect(bad('11')).toMatch(/Page 11 does not exist.*10 pages/);
    expect(bad('5-3')).toMatch(/backwards.*3-5/);
    expect(bad('a-b')).toMatch(/not a page or a range/);
    expect(bad('-3')).toMatch(/not a page or a range/);
  });
  it('uses singular wording for a one-page file', () => {
    expect(bad('2', 1)).toMatch(/1 page\./);
  });
  it('caps absurd selections', () => {
    expect(bad('1-3000, 1-3000', 3000)).toMatch(/more than/);
  });
});

describe('formatPageRanges', () => {
  it('compacts selections', () => {
    expect(formatPageRanges([0, 1, 2, 4, 6, 7])).toBe('1-3, 5, 7-8');
    expect(formatPageRanges([])).toBe('');
    expect(formatPageRanges([3, 3, 1])).toBe('2, 4');
  });
});
