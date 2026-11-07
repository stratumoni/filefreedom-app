import { describe, expect, it } from 'vitest';
import { aspectRatioLabel, extOf, formatBytes, parseSizeToBytes, percentChange, safeFileName } from './format';

describe('format helpers', () => {
  it('formats bytes with decimal units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(1500)).toBe('1.50 KB');
    expect(formatBytes(2_000_000)).toBe('2.00 MB');
    expect(formatBytes(-1)).toBe('–');
  });
  it('converts size limits stricter than binary units', () => {
    expect(parseSizeToBytes(2, 'MB')).toBe(2_000_000);
    expect(parseSizeToBytes(500, 'KB')).toBe(500_000);
  });
  it('reports percentage change', () => {
    expect(percentChange(1000, 250)).toBe('-75%');
    expect(percentChange(1000, 1100)).toBe('+10%');
    expect(percentChange(0, 5)).toBe('–');
  });
  it('reduces aspect ratios', () => {
    expect(aspectRatioLabel(1920, 1080)).toBe('16:9');
    expect(aspectRatioLabel(1000, 1000)).toBe('1:1');
  });
  it('sanitises file names and extensions', () => {
    expect(safeFileName('a/b:c?.png')).toBe('a_b_c_.png');
    expect(safeFileName('...')).toBe('file');
    expect(extOf('photo.JPG')).toBe('jpg');
    expect(extOf('noext')).toBe('');
  });
});
