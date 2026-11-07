import type { Rect } from '../_shared/imageEngine';

export interface Bounds { width: number; height: number }
export type Corner = 'nw' | 'ne' | 'sw' | 'se';
export const MIN_SIDE = 8;

export const clampRect = (r: Rect, b: Bounds): Rect => {
  const width = Math.max(1, Math.min(Math.round(r.width), b.width));
  const height = Math.max(1, Math.min(Math.round(r.height), b.height));
  return { width, height, x: Math.max(0, Math.min(Math.round(r.x), b.width - width)), y: Math.max(0, Math.min(Math.round(r.y), b.height - height)) };
};

export const moveRect = (r: Rect, dx: number, dy: number, b: Bounds): Rect => clampRect({ ...r, x: r.x + dx, y: r.y + dy }, b);

/** Largest centred rectangle of the given ratio (w/h) that fits inside the bounds. */
export function fitRatio(b: Bounds, ratio: number): Rect {
  let width = b.width;
  let height = Math.round(width / ratio);
  if (height > b.height) { height = b.height; width = Math.round(height * ratio); }
  return clampRect({ x: (b.width - width) / 2, y: (b.height - height) / 2, width, height }, b);
}

/** Resize by dragging a corner. The opposite corner stays fixed; with a ratio the shape is preserved. */
export function resizeFromCorner(r: Rect, corner: Corner, dx: number, dy: number, b: Bounds, ratio: number | null): Rect {
  const fixedX = corner === 'nw' || corner === 'sw' ? r.x + r.width : r.x;
  const fixedY = corner === 'nw' || corner === 'ne' ? r.y + r.height : r.y;
  let px = (corner === 'nw' || corner === 'sw' ? r.x : r.x + r.width) + dx;
  let py = (corner === 'nw' || corner === 'ne' ? r.y : r.y + r.height) + dy;
  px = Math.max(0, Math.min(b.width, px));
  py = Math.max(0, Math.min(b.height, py));
  let w = Math.max(MIN_SIDE, Math.abs(px - fixedX));
  let h = Math.max(MIN_SIDE, Math.abs(py - fixedY));
  const dirX = px >= fixedX ? 1 : -1;
  const dirY = py >= fixedY ? 1 : -1;
  if (ratio) {
    // Keep the larger of the two implied sizes, then shrink if that would leave the image.
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    const maxW = dirX > 0 ? b.width - fixedX : fixedX;
    const maxH = dirY > 0 ? b.height - fixedY : fixedY;
    if (w > maxW) { w = maxW; h = w / ratio; }
    if (h > maxH) { h = maxH; w = h * ratio; }
  }
  const x = dirX > 0 ? fixedX : fixedX - w;
  const y = dirY > 0 ? fixedY : fixedY - h;
  return clampRect({ x, y, width: w, height: h }, b);
}

/** Apply a new width/height typed by the user, keeping x/y where possible and respecting the image bounds. */
export function setSize(r: Rect, width: number, height: number, b: Bounds): Rect {
  return clampRect({ ...r, width, height }, b);
}

export function parseRatio(s: string): number | null {
  const m = /^(\d+(?:\.\d+)?)[:x/](\d+(?:\.\d+)?)$/.exec(s.trim());
  if (!m) return null;
  const v = Number(m[1]) / Number(m[2]);
  return Number.isFinite(v) && v > 0 ? v : null;
}
