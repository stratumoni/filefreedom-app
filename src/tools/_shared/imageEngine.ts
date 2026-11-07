/**
 * Image pipeline: decode -> (crop) -> (resize) -> encode. Runs in a Web Worker when
 * OffscreenCanvas is available and on the main thread otherwise. Nothing here uses the network.
 */
export type OutType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';
export interface Rect { x: number; y: number; width: number; height: number }

export interface RenderJob {
  file: Blob;
  type: OutType;
  /** 0..1, ignored for PNG */
  quality: number;
  /** Fill colour used under transparent pixels when the output has no alpha (JPEG). */
  background: string;
  crop?: Rect;
  resize?: { width: number; height: number };
  /** Compress mode: search quality, then scale, until the output is at most this many bytes. */
  targetBytes?: number;
}
export interface RenderOutput { blob: Blob; width: number; height: number; quality: number; scale: number; attempts: number; targetMet: boolean | null }

export type EngineCode = 'decode' | 'too-large' | 'unsupported-output' | 'memory' | 'aborted' | 'invalid';
export class EngineError extends Error {
  constructor(public code: EngineCode, message: string) { super(message); this.name = 'EngineError'; }
}

export const MAX_PIXELS = 100_000_000; // conservative; many phones fail well before this
export const MAX_SIDE = 16384;

type Surface = {
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  encode: (type: string, quality: number) => Promise<Blob | null>;
};

function makeSurface(w: number, h: number): Surface {
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(w, h);
    const ctx = c.getContext('2d');
    if (!ctx) throw new EngineError('memory', 'Your browser could not create a drawing surface of this size.');
    return { ctx, encode: (t, q) => c.convertToBlob({ type: t, quality: q }) };
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new EngineError('memory', 'Your browser could not create a drawing surface of this size.');
  return { ctx, encode: (t, q) => new Promise((res) => c.toBlob(res, t, q)) };
}

export function assertSize(w: number, h: number) {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) throw new EngineError('invalid', 'Width and height must be at least 1 pixel.');
  if (w > MAX_SIDE || h > MAX_SIDE || w * h > MAX_PIXELS) {
    throw new EngineError('too-large', `${Math.round(w)} \u00d7 ${Math.round(h)} pixels is larger than this browser can safely handle. Choose a smaller size.`);
  }
}

const checkAbort = (s?: AbortSignal) => { if (s?.aborted) throw new EngineError('aborted', 'Cancelled.'); };

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new EngineError('decode', 'This image could not be read. The file may be damaged, or its format is not supported by your browser.');
  }
}

async function encodeOnce(src: ImageBitmap, job: RenderJob, w: number, h: number, quality: number, srcRect: Rect): Promise<Blob> {
  assertSize(w, h);
  const s = makeSurface(w, h);
  if (job.type === 'image/jpeg') {
    s.ctx.fillStyle = job.background;
    s.ctx.fillRect(0, 0, w, h);
  }
  s.ctx.imageSmoothingEnabled = true;
  s.ctx.imageSmoothingQuality = 'high';
  s.ctx.drawImage(src, srcRect.x, srcRect.y, srcRect.width, srcRect.height, 0, 0, w, h);
  let blob: Blob | null;
  try {
    blob = await s.encode(job.type, job.type === 'image/png' ? undefined! : quality);
  } catch {
    throw new EngineError('memory', 'Your browser ran out of memory while saving the image. Try a smaller size.');
  }
  // Browsers silently fall back to PNG for formats they cannot write. Never present that as success.
  if (!blob || blob.type !== job.type) {
    throw new EngineError('unsupported-output', `Your browser cannot create ${job.type.replace('image/', '').toUpperCase()} files. Choose a different output format.`);
  }
  return blob;
}

export async function renderJob(job: RenderJob, signal?: AbortSignal, onProgress?: (msg: string) => void): Promise<RenderOutput> {
  checkAbort(signal);
  const bmp = await decode(job.file);
  try {
    const c = job.crop ?? { x: 0, y: 0, width: bmp.width, height: bmp.height };
    const x = Math.max(0, Math.min(bmp.width - 1, Math.round(c.x)));
    const y = Math.max(0, Math.min(bmp.height - 1, Math.round(c.y)));
    const srcRect: Rect = { x, y, width: Math.max(1, Math.min(bmp.width - x, Math.round(c.width))), height: Math.max(1, Math.min(bmp.height - y, Math.round(c.height))) };
    const baseW = job.resize ? Math.round(job.resize.width) : srcRect.width;
    const baseH = job.resize ? Math.round(job.resize.height) : srcRect.height;
    assertSize(baseW, baseH);

    if (job.targetBytes === undefined) {
      const blob = await encodeOnce(bmp, job, baseW, baseH, job.quality, srcRect);
      return { blob, width: baseW, height: baseH, quality: job.quality, scale: 1, attempts: 1, targetMet: null };
    }

    // Compress-to-target: find the highest quality that fits; if none does, shrink the image and try again.
    const target = job.targetBytes;
    const lossy = job.type !== 'image/png';
    const qMax = job.quality;
    const qMin = Math.min(0.4, qMax);
    let attempts = 0;
    let best: RenderOutput | null = null;
    for (let step = 0, scale = 1; step < 14; step++, scale *= 0.85) {
      const w = Math.max(1, Math.round(baseW * scale));
      const h = Math.max(1, Math.round(baseH * scale));
      checkAbort(signal);
      onProgress?.(`Trying ${w} \u00d7 ${h} pixels\u2026`);
      let blob = await encodeOnce(bmp, job, w, h, qMax, srcRect);
      attempts++;
      let q = qMax;
      if (blob.size > target && lossy) {
        let lo = qMin;
        let hi = qMax;
        const atMin = await encodeOnce(bmp, job, w, h, qMin, srcRect);
        attempts++;
        if (atMin.size <= target) {
          blob = atMin;
          q = qMin;
          for (let i = 0; i < 6; i++) {
            checkAbort(signal);
            const mid = (lo + hi) / 2;
            const b = await encodeOnce(bmp, job, w, h, mid, srcRect);
            attempts++;
            if (b.size <= target) { blob = b; q = mid; lo = mid; } else hi = mid;
          }
        } else blob = atMin;
      }
      const out: RenderOutput = { blob, width: w, height: h, quality: q, scale, attempts, targetMet: blob.size <= target };
      if (!best || blob.size < best.blob.size) best = out;
      if (blob.size <= target) return { ...out, attempts };
      if (w <= 32 || h <= 32) break;
    }
    return { ...best!, attempts, targetMet: false };
  } finally {
    bmp.close();
  }
}

let outputSupport: Promise<OutType[]> | undefined;
/** Which formats this browser can actually write (checked by encoding a 1px image). */
export function supportedOutputs(): Promise<OutType[]> {
  outputSupport ??= (async () => {
    const types: OutType[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    const ok: OutType[] = [];
    for (const t of types) {
      try {
        const s = makeSurface(1, 1);
        const b = await s.encode(t, 0.8);
        if (b && b.type === t) ok.push(t);
      } catch { /* unsupported */ }
    }
    return ok;
  })();
  return outputSupport;
}

export async function readImageSize(file: Blob): Promise<{ width: number; height: number }> {
  const b = await decode(file);
  const r = { width: b.width, height: b.height };
  b.close();
  return r;
}

export const OUT_LABEL: Record<OutType, string> = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP', 'image/avif': 'AVIF' };
export const OUT_EXT: Record<OutType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
