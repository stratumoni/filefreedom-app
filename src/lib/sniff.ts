/** Identify a file by its leading bytes. File extensions and MIME types are not trusted. */
export type Kind = 'jpeg' | 'png' | 'gif' | 'webp' | 'bmp' | 'avif' | 'heic' | 'svg' | 'pdf' | 'zip' | 'gzip' | 'text' | 'unknown';

export const KIND_INFO: Record<Kind, { label: string; mime: string; ext: string }> = {
  jpeg: { label: 'JPEG image', mime: 'image/jpeg', ext: 'jpg' },
  png: { label: 'PNG image', mime: 'image/png', ext: 'png' },
  gif: { label: 'GIF image', mime: 'image/gif', ext: 'gif' },
  webp: { label: 'WebP image', mime: 'image/webp', ext: 'webp' },
  bmp: { label: 'BMP image', mime: 'image/bmp', ext: 'bmp' },
  avif: { label: 'AVIF image', mime: 'image/avif', ext: 'avif' },
  heic: { label: 'HEIC/HEIF image', mime: 'image/heic', ext: 'heic' },
  svg: { label: 'SVG image', mime: 'image/svg+xml', ext: 'svg' },
  pdf: { label: 'PDF document', mime: 'application/pdf', ext: 'pdf' },
  zip: { label: 'ZIP archive (or ZIP-based file such as DOCX/XLSX/EPUB)', mime: 'application/zip', ext: 'zip' },
  gzip: { label: 'GZIP archive', mime: 'application/gzip', ext: 'gz' },
  text: { label: 'Plain text', mime: 'text/plain', ext: 'txt' },
  unknown: { label: 'Unknown format', mime: 'application/octet-stream', ext: '' },
};

const ascii = (b: Uint8Array, start: number, len: number) => String.fromCharCode(...b.subarray(start, start + len));

export function sniffBytes(b: Uint8Array): Kind {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return 'png';
  if (b.length >= 6 && (ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a')) return 'gif';
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) return 'bmp';
  if (b.length >= 12 && ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4);
    if (brand === 'avif' || brand === 'avis') return 'avif';
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis'].includes(brand)) return 'heic';
  }
  if (b.length >= 5 && ascii(b, 0, 5) === '%PDF-') return 'pdf';
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5) && (b[3] === 4 || b[3] === 6)) return 'zip';
  if (b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b) return 'gzip';
  const head = new TextDecoder('utf-8', { fatal: false }).decode(b.subarray(0, 512)).replace(/^\uFEFF/, '').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)?<svg[\s>]/i.test(head)) return 'svg';
  return looksLikeText(b) ? 'text' : 'unknown';
}

function looksLikeText(b: Uint8Array): boolean {
  const n = Math.min(b.length, 2048);
  if (n === 0) return false;
  let bad = 0;
  for (let i = 0; i < n; i++) {
    const c = b[i]!;
    if (c === 0) return false;
    if (c < 9 || (c > 13 && c < 32)) bad++;
  }
  return bad / n < 0.02;
}

export async function sniffFile(file: Blob): Promise<Kind> {
  return sniffBytes(new Uint8Array(await file.slice(0, 4096).arrayBuffer()));
}

/** True when an image has more than one frame. Canvas conversion would keep only the first frame. */
export function isAnimated(bytes: Uint8Array, kind: Kind): boolean {
  if (kind === 'gif') {
    let frames = 0;
    // Walk GIF blocks properly so image data bytes are not mistaken for block markers.
    let p = 13;
    const flags = bytes[10] ?? 0;
    if (flags & 0x80) p += 3 * (1 << ((flags & 7) + 1));
    while (p < bytes.length) {
      const t = bytes[p++];
      if (t === 0x2c) {
        frames++;
        if (frames > 1) return true;
        const f = bytes[p + 8] ?? 0;
        p += 9;
        if (f & 0x80) p += 3 * (1 << ((f & 7) + 1));
        p++; // LZW min code size
        while (p < bytes.length) {
          const sz = bytes[p++]!;
          if (sz === 0) break;
          p += sz;
        }
      } else if (t === 0x21) {
        p++;
        while (p < bytes.length) {
          const sz = bytes[p++]!;
          if (sz === 0) break;
          p += sz;
        }
      } else break;
    }
    return false;
  }
  if (kind === 'png') {
    let p = 8;
    while (p + 8 <= bytes.length) {
      const len = ((bytes[p]! << 24) | (bytes[p + 1]! << 16) | (bytes[p + 2]! << 8) | bytes[p + 3]!) >>> 0;
      const type = ascii(bytes, p + 4, 4);
      if (type === 'acTL') return true;
      if (type === 'IDAT' || type === 'IEND') return false;
      p += 12 + len;
    }
    return false;
  }
  if (kind === 'webp') {
    let p = 12;
    while (p + 8 <= bytes.length) {
      const type = ascii(bytes, p, 4);
      const len = bytes[p + 4]! | (bytes[p + 5]! << 8) | (bytes[p + 6]! << 16) | (bytes[p + 7]! << 24);
      if (type === 'ANIM' || type === 'ANMF') return true;
      p += 8 + len + (len & 1);
    }
    return false;
  }
  return false;
}
