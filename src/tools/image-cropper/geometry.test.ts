import { describe, expect, it } from 'vitest';
import { clampRect, fitRatio, moveRect, parseRatio, resizeFromCorner, setSize } from './geometry';

const B = { width: 1000, height: 800 };

describe('crop geometry', () => {
  it('clamps rectangles inside the image', () => {
    expect(clampRect({ x: -50, y: 900, width: 2000, height: 100 }, B)).toEqual({ x: 0, y: 700, width: 1000, height: 100 });
  });
  it('moves without leaving the image', () => {
    expect(moveRect({ x: 900, y: 10, width: 100, height: 100 }, 500, -50, B)).toEqual({ x: 900, y: 0, width: 100, height: 100 });
  });
  it('fits the largest centred rectangle for a ratio', () => {
    expect(fitRatio(B, 1)).toEqual({ x: 100, y: 0, width: 800, height: 800 });
    expect(fitRatio(B, 16 / 9)).toEqual({ x: 0, y: 119, width: 1000, height: 563 });
  });
  it('resizes from a corner, keeping the opposite corner fixed', () => {
    const r = resizeFromCorner({ x: 100, y: 100, width: 200, height: 200 }, 'se', 50, 30, B, null);
    expect(r).toEqual({ x: 100, y: 100, width: 250, height: 230 });
    const n = resizeFromCorner({ x: 100, y: 100, width: 200, height: 200 }, 'nw', -40, -20, B, null);
    expect(n).toEqual({ x: 60, y: 80, width: 240, height: 220 });
  });
  it('preserves the ratio while resizing and never exceeds the image', () => {
    const r = resizeFromCorner({ x: 100, y: 100, width: 200, height: 200 }, 'se', 5000, 5000, B, 1);
    expect(r.width).toBe(r.height);
    expect(r.x + r.width).toBeLessThanOrEqual(1000);
    expect(r.y + r.height).toBeLessThanOrEqual(800);
  });
  it('enforces a minimum size and handles dragging past the opposite corner', () => {
    const r = resizeFromCorner({ x: 100, y: 100, width: 200, height: 200 }, 'se', -500, -500, B, null);
    expect(r.width).toBeGreaterThanOrEqual(8);
    expect(r.x).toBeGreaterThanOrEqual(0);
  });
  it('applies typed sizes within bounds', () => {
    expect(setSize({ x: 900, y: 0, width: 50, height: 50 }, 300, 60, B)).toEqual({ x: 700, y: 0, width: 300, height: 60 });
  });
  it('parses ratios', () => {
    expect(parseRatio('16:9')).toBeCloseTo(1.7778, 3);
    expect(parseRatio('1x1')).toBe(1);
    expect(parseRatio('abc')).toBeNull();
    expect(parseRatio('0:5')).toBeNull();
  });
});
