import { describe, expect, it } from 'vitest';
import { isAnimated, sniffBytes } from './sniff';

const b = (...x: number[]) => new Uint8Array(x);
const enc = (s: string) => new TextEncoder().encode(s);

describe('sniffBytes', () => {
  it('detects common formats by signature', () => {
    expect(sniffBytes(b(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe('jpeg');
    expect(sniffBytes(b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png');
    expect(sniffBytes(enc('GIF89a....'))).toBe('gif');
    expect(sniffBytes(enc('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
    expect(sniffBytes(enc('%PDF-1.7\n'))).toBe('pdf');
    expect(sniffBytes(b(0x50, 0x4b, 3, 4, 0))).toBe('zip');
    expect(sniffBytes(b(0, 0, 0, 0x18, ...enc('ftypavif')))).toBe('avif');
    expect(sniffBytes(b(0, 0, 0, 0x18, ...enc('ftypheic')))).toBe('heic');
  });
  it('detects svg and text, and refuses to guess for binary data', () => {
    expect(sniffBytes(enc('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe('svg');
    expect(sniffBytes(enc('name,age\nAda,36\n'))).toBe('text');
    expect(sniffBytes(b(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10))).toBe('unknown');
    expect(sniffBytes(new Uint8Array(0))).toBe('unknown');
  });
  it('is not fooled by a misleading extension (only bytes matter)', () => {
    expect(sniffBytes(enc('%PDF-1.4'))).toBe('pdf');
  });
});

describe('isAnimated', () => {
  it('flags a PNG containing an acTL chunk', () => {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const ihdr = [0, 0, 0, 13, ...enc('IHDR'), 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0, 0, 0, 0];
    const actl = [0, 0, 0, 8, ...enc('acTL'), 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(isAnimated(b(...sig, ...ihdr, ...actl), 'png')).toBe(true);
    expect(isAnimated(b(...sig, ...ihdr), 'png')).toBe(false);
  });
  it('flags a WebP with an ANIM chunk', () => {
    const w = b(...enc('RIFF'), 0, 0, 0, 0, ...enc('WEBP'), ...enc('ANIM'), 6, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    expect(isAnimated(w, 'webp')).toBe(true);
  });
});
