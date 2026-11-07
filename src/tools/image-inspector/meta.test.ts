import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sniffBytes } from '@/lib/sniff';
import { readImageFacts } from './meta';

const load = (n: string) => new Uint8Array(readFileSync(new URL(`../../test/fixtures/${n}`, import.meta.url)));
const facts = (n: string) => { const b = load(n); return readImageFacts(b, sniffBytes(b)); };

describe('readImageFacts (real files made by Pillow)', () => {
  it('reads JPEG size, DPI, camera, date, orientation and GPS presence', () => {
    const f = facts('photo-exif.jpg');
    expect(f.kind).toBe('jpeg');
    expect([f.width, f.height]).toEqual([640, 480]);
    expect(f.hasAlpha).toBe(false);
    expect(f.dpi).toEqual({ x: 300, y: 300 });
    expect(f.exif).toMatchObject({ present: true, orientation: 6, make: 'FileFreedomCam', model: 'Model X1', software: 'TestSoft 1.0', dateTime: '2024:05:17 10:30:00', hasGps: true });
  });
  it('reports no EXIF for a plain JPEG', () => {
    const f = facts('photo-plain.jpg');
    expect(f.exif).toBeUndefined();
    expect([f.width, f.height]).toEqual([640, 480]);
  });
  it('reads PNG size, alpha and DPI', () => {
    const a = facts('alpha.png');
    expect([a.kind, a.width, a.height, a.hasAlpha, a.dpi]).toEqual(['png', 640, 480, true, { x: 144, y: 144 }]);
    expect(facts('opaque.png').hasAlpha).toBe(false);
  });
  it('reads WebP size', () => {
    const f = facts('photo.webp');
    expect([f.kind, f.width, f.height, f.animated]).toEqual(['webp', 640, 480, false]);
  });
  it('detects animated vs still GIFs and their size', () => {
    expect(facts('animated.gif')).toMatchObject({ kind: 'gif', width: 80, height: 60, animated: true });
    expect(facts('still.gif').animated).toBe(false);
  });
  it('reads BMP size', () => {
    expect(facts('photo.bmp')).toMatchObject({ kind: 'bmp', width: 640, height: 480 });
  });
  it('identifies a JPEG named .png by its contents, and survives a corrupt file', () => {
    expect(sniffBytes(load('fake.png'))).toBe('jpeg');
    expect(() => readImageFacts(load('corrupt.jpg'), 'jpeg')).not.toThrow();
  });
});
