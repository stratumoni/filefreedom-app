import { describe, expect, it } from 'vitest';
import { formatBytes } from '@/lib/format';
import { checkRequirements } from './logic';

const s = { bytes: 3_400_000, width: 4000, height: 3000, kind: 'png' as const };
const run = (r: Parameters<typeof checkRequirements>[1], subj = s) => checkRequirements(subj, r, formatBytes);

describe('checkRequirements', () => {
  it('fails size with a prefilled compressor link', () => {
    const [c] = run({ maxBytes: 2_000_000 });
    expect(c).toMatchObject({ pass: false, measured: '3.40 MB', required: 'at most 2.00 MB' });
    expect(c!.fix!.to).toBe('/tools/image-compressor?targetKB=2000');
  });
  it('passes when exactly at the limit', () => {
    expect(run({ maxBytes: 3_400_000 })[0]!.pass).toBe(true);
  });
  it('checks dimensions with min and max, and links the resizer with the violated bound', () => {
    const c = run({ maxWidth: 1920, minHeight: 100 });
    expect(c.map((x) => [x.id, x.pass])).toEqual([['width', false], ['height', true]]);
    expect(c[0]!.fix!.to).toBe('/tools/image-resizer?w=1920');
  });
  it('flags a wrong format and suggests the first allowed one', () => {
    const [c] = run({ formats: ['jpeg', 'webp'] });
    expect(c).toMatchObject({ pass: false, measured: 'PNG', required: 'one of JPG, WebP' });
    expect(c!.fix!.to).toBe('/tools/image-converter?to=jpg');
  });
  it('checks aspect ratio with 1% tolerance', () => {
    expect(run({ aspect: { w: 4, h: 3 } })[0]!.pass).toBe(true);
    expect(run({ aspect: { w: 1, h: 1 } })[0]!.pass).toBe(false);
  });
  it('returns nothing when no requirement is set', () => {
    expect(run({})).toEqual([]);
  });
});
