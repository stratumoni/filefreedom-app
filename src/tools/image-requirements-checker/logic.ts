import type { Kind } from '@/lib/sniff';

export interface Requirements {
  maxBytes?: number;
  minWidth?: number; minHeight?: number; maxWidth?: number; maxHeight?: number;
  formats?: Kind[];
  aspect?: { w: number; h: number };
}
export interface Subject { bytes: number; width: number; height: number; kind: Kind }
export interface Check {
  id: string;
  label: string;
  pass: boolean;
  measured: string;
  required: string;
  /** Link to the FileFreedom tool that can fix this, with the value prefilled. */
  fix?: { to: string; label: string };
}

const FORMAT_NAME: Partial<Record<Kind, string>> = { jpeg: 'JPG', png: 'PNG', webp: 'WebP', gif: 'GIF', bmp: 'BMP', avif: 'AVIF' };
const TOOL_FMT: Partial<Record<Kind, string>> = { jpeg: 'jpg', png: 'png', webp: 'webp', avif: 'avif' };

export function checkRequirements(s: Subject, r: Requirements, fmtBytes: (n: number) => string): Check[] {
  const out: Check[] = [];
  if (r.maxBytes !== undefined) {
    out.push({
      id: 'size', label: 'File size', pass: s.bytes <= r.maxBytes, measured: fmtBytes(s.bytes), required: `at most ${fmtBytes(r.maxBytes)}`,
      fix: s.bytes > r.maxBytes ? { to: `/tools/image-compressor?targetKB=${Math.floor(r.maxBytes / 1000)}`, label: 'Compress to this size' } : undefined,
    });
  }
  const dim = (id: string, label: string, v: number, min?: number, max?: number) => {
    if (min === undefined && max === undefined) return;
    const pass = (min === undefined || v >= min) && (max === undefined || v <= max);
    const req = min !== undefined && max !== undefined ? `${min} to ${max} px` : min !== undefined ? `at least ${min} px` : `at most ${max} px`;
    const target = max !== undefined && v > max ? max : min;
    const key = id === 'width' ? 'w' : 'h';
    out.push({ id, label, pass, measured: `${v} px`, required: req, fix: pass || target === undefined ? undefined : { to: `/tools/image-resizer?${key}=${target}`, label: `Resize to ${target} px ${id}` } });
  };
  dim('width', 'Width', s.width, r.minWidth, r.maxWidth);
  dim('height', 'Height', s.height, r.minHeight, r.maxHeight);
  if (r.formats && r.formats.length) {
    const pass = r.formats.includes(s.kind);
    const first = r.formats.map((k) => TOOL_FMT[k]).find(Boolean);
    out.push({
      id: 'format', label: 'File format', pass, measured: FORMAT_NAME[s.kind] ?? s.kind.toUpperCase(),
      required: `one of ${r.formats.map((k) => FORMAT_NAME[k] ?? k).join(', ')}`,
      fix: pass || !first ? undefined : { to: `/tools/image-converter?to=${first}`, label: `Convert to ${first.toUpperCase().replace('JPG', 'JPG')}` },
    });
  }
  if (r.aspect && r.aspect.w > 0 && r.aspect.h > 0) {
    const want = r.aspect.w / r.aspect.h;
    const got = s.width / s.height;
    out.push({
      id: 'aspect', label: 'Shape (aspect ratio)', pass: Math.abs(got - want) / want < 0.01, measured: `${s.width}:${s.height}`, required: `${r.aspect.w}:${r.aspect.h}`,
      fix: Math.abs(got - want) / want < 0.01 ? undefined : { to: `/tools/image-cropper?ratio=${r.aspect.w}:${r.aspect.h}`, label: 'Crop to this shape' },
    });
  }
  return out;
}
