import { isAnimated, type Kind } from '@/lib/sniff';

export interface ImageFacts {
  kind: Kind;
  width?: number;
  height?: number;
  animated: boolean;
  hasAlpha: boolean | null; // null = cannot tell
  dpi?: { x: number; y: number };
  exif?: { present: boolean; orientation?: number; make?: string; model?: string; software?: string; dateTime?: string; hasGps: boolean };
  extras: string[];
}

const u16 = (b: Uint8Array, p: number, le: boolean) => (le ? b[p]! | (b[p + 1]! << 8) : (b[p]! << 8) | b[p + 1]!);
const u32 = (b: Uint8Array, p: number, le: boolean) => (le ? (b[p]! | (b[p + 1]! << 8) | (b[p + 2]! << 16) | (b[p + 3]! << 24)) >>> 0 : ((b[p]! << 24) | (b[p + 1]! << 16) | (b[p + 2]! << 8) | b[p + 3]!) >>> 0);
const tag4 = (b: Uint8Array, p: number) => String.fromCharCode(b[p]!, b[p + 1]!, b[p + 2]!, b[p + 3]!); // exact, untrimmed
const str = (b: Uint8Array, p: number, n: number) => new TextDecoder('latin1').decode(b.subarray(p, p + n)).replace(/\0.*$/s, '').trim();

/** Reads only the tags needed to answer: orientation, camera, date and whether location data exists. */
export function parseExif(tiff: Uint8Array): NonNullable<ImageFacts['exif']> {
  const out: NonNullable<ImageFacts['exif']> = { present: true, hasGps: false };
  if (tiff.length < 8) return out;
  const le = tiff[0] === 0x49;
  if (!le && tiff[0] !== 0x4d) return out;
  const readIfd = (off: number, visit: (tag: number, type: number, count: number, valPos: number) => void) => {
    if (off < 8 || off + 2 > tiff.length) return;
    const n = Math.min(u16(tiff, off, le), 512);
    for (let i = 0; i < n; i++) {
      const e = off + 2 + i * 12;
      if (e + 12 > tiff.length) return;
      const type = u16(tiff, e + 2, le);
      const count = u32(tiff, e + 4, le);
      const size = count * ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 }[type] ?? 1);
      visit(u16(tiff, e, le), type, count, size <= 4 ? e + 8 : u32(tiff, e + 8, le));
    }
  };
  let exifIfd = 0;
  readIfd(u32(tiff, 4, le), (tag, type, count, pos) => {
    if (tag === 0x0112) out.orientation = u16(tiff, pos, le);
    else if (tag === 0x010f && type === 2) out.make = str(tiff, pos, count);
    else if (tag === 0x0110 && type === 2) out.model = str(tiff, pos, count);
    else if (tag === 0x0131 && type === 2) out.software = str(tiff, pos, count);
    else if (tag === 0x0132 && type === 2) out.dateTime = str(tiff, pos, count);
    else if (tag === 0x8769) exifIfd = u32(tiff, pos, le);
    else if (tag === 0x8825) out.hasGps = true;
  });
  if (exifIfd) readIfd(exifIfd, (tag, type, count, pos) => { if (tag === 0x9003 && type === 2) out.dateTime = str(tiff, pos, count); });
  return out;
}

function jpegFacts(b: Uint8Array, f: ImageFacts) {
  let p = 2;
  while (p + 4 <= b.length) {
    if (b[p] !== 0xff) { p++; continue; }
    const m = b[p + 1]!;
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01 || m === 0xff) { p += m === 0xff ? 1 : 2; continue; }
    const len = (b[p + 2]! << 8) | b[p + 3]!;
    const seg = p + 4;
    if (m === 0xe1 && str(b, seg, 4) === 'Exif') f.exif = parseExif(b.subarray(seg + 6, p + 2 + len));
    else if (m === 0xe0 && str(b, seg, 4) === 'JFIF' && len >= 14) {
      const unit = b[seg + 7]!;
      const x = (b[seg + 8]! << 8) | b[seg + 9]!;
      const y = (b[seg + 10]! << 8) | b[seg + 11]!;
      if (unit === 1 && x) f.dpi = { x, y };
      else if (unit === 2 && x) f.dpi = { x: Math.round(x * 2.54), y: Math.round(y * 2.54) };
    } else if (m === 0xc0 || m === 0xc1 || m === 0xc2) {
      f.height = (b[seg + 1]! << 8) | b[seg + 2]!;
      f.width = (b[seg + 3]! << 8) | b[seg + 4]!;
      if (m === 0xc2) f.extras.push('Progressive JPEG');
    } else if (m === 0xda) break;
    p += 2 + len;
  }
  f.hasAlpha = false;
}

function pngFacts(b: Uint8Array, f: ImageFacts) {
  f.width = u32(b, 16, false);
  f.height = u32(b, 20, false);
  const colorType = b[25]!;
  f.hasAlpha = colorType === 4 || colorType === 6;
  let p = 8;
  while (p + 8 <= b.length) {
    const len = u32(b, p, false);
    const type = str(b, p + 4, 4);
    if (type === 'pHYs' && b[p + 16] === 1) f.dpi = { x: Math.round(u32(b, p + 8, false) * 0.0254), y: Math.round(u32(b, p + 12, false) * 0.0254) };
    else if (type === 'tRNS' && !f.hasAlpha) f.hasAlpha = true;
    else if (type === 'eXIf') f.exif = parseExif(b.subarray(p + 8, p + 8 + len));
    else if (type === 'iCCP') f.extras.push('Embedded colour profile');
    else if (type === 'IDAT' || type === 'IEND') break;
    p += 12 + len;
  }
}

function webpFacts(b: Uint8Array, f: ImageFacts) {
  const chunk = tag4(b, 12);
  if (chunk === 'VP8X') {
    const flags = b[20]!;
    f.hasAlpha = !!(flags & 0x10);
    f.width = 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16));
    f.height = 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16));
    if (flags & 0x08) f.exif = { present: true, hasGps: false };
    if (flags & 0x20) f.extras.push('Embedded colour profile');
  } else if (chunk === 'VP8 ') {
    f.width = (b[26]! | (b[27]! << 8)) & 0x3fff;
    f.height = (b[28]! | (b[29]! << 8)) & 0x3fff;
    f.hasAlpha = false;
  } else if (chunk === 'VP8L') {
    const v = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    f.width = (v & 0x3fff) + 1;
    f.height = ((v >>> 14) & 0x3fff) + 1;
    f.hasAlpha = !!((v >>> 28) & 1);
  }
}

function gifFacts(b: Uint8Array, f: ImageFacts) {
  f.width = b[6]! | (b[7]! << 8);
  f.height = b[8]! | (b[9]! << 8);
  f.hasAlpha = null;
}

function bmpFacts(b: Uint8Array, f: ImageFacts) {
  f.width = u32(b, 18, true);
  f.height = Math.abs(u32(b, 22, true) | 0);
  const bpp = u16(b, 28, true);
  f.hasAlpha = bpp === 32 ? null : false;
  const ppm = u32(b, 38, true);
  if (ppm) f.dpi = { x: Math.round(ppm * 0.0254), y: Math.round(u32(b, 42, true) * 0.0254) };
}

export function readImageFacts(bytes: Uint8Array, kind: Kind): ImageFacts {
  const f: ImageFacts = { kind, animated: false, hasAlpha: null, extras: [] };
  try {
    if (kind === 'jpeg') jpegFacts(bytes, f);
    else if (kind === 'png') pngFacts(bytes, f);
    else if (kind === 'webp') webpFacts(bytes, f);
    else if (kind === 'gif') gifFacts(bytes, f);
    else if (kind === 'bmp') bmpFacts(bytes, f);
  } catch { /* truncated or malformed headers: report what we have */ }
  f.animated = isAnimated(bytes, kind);
  return f;
}
