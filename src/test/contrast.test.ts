import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');

function block(start: string): Record<string, string> {
  const i = css.indexOf(start);
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('\n}', i));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]!] = m[2]!;
  return out;
}
const light = block(':root {');
const dark = { ...light, ...block(":root[data-theme='dark']") };
const dim = { ...light, ...block(":root[data-theme='dim']") };

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

const pairs: [string, string][] = [
  ['--c-text', '--c-bg'], ['--c-text', '--c-surface'], ['--c-muted', '--c-bg'], ['--c-muted', '--c-surface'], ['--c-muted', '--c-surface-2'],
  ['--c-accent', '--c-bg'], ['--c-accent', '--c-surface'], ['--c-accent-ink', '--c-accent'], ['--c-accent', '--c-accent-soft'],
  ['--c-success', '--c-success-soft'], ['--c-warning', '--c-warning-soft'], ['--c-danger', '--c-danger-soft'],
  ['--c-danger', '--c-surface'], ['--c-success', '--c-surface'], ['--c-warning', '--c-surface'],
  ['--cat-image-ink', '--cat-image-bg'], ['--cat-pdf-ink', '--cat-pdf-bg'], ['--cat-data-ink', '--cat-data-bg'],
  ['--cat-text-ink', '--cat-text-bg'], ['--cat-security-ink', '--cat-security-bg'], ['--cat-neutral-ink', '--cat-neutral-bg'],
];

describe.each([['light', light], ['dark', dark], ['dim', dim]] as const)('%s theme contrast (WCAG AA 4.5:1)', (_n, t) => {
  it.each(pairs)('%s on %s', (fg, bg) => {
    expect(t[fg], `${fg} missing`).toBeTruthy();
    expect(t[bg], `${bg} missing`).toBeTruthy();
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
  });
  it('focus ring has 3:1 against background and surface', () => {
    expect(ratio(t['--focus']!, t['--c-bg']!)).toBeGreaterThanOrEqual(3);
    expect(ratio(t['--focus']!, t['--c-surface']!)).toBeGreaterThanOrEqual(3);
  });
});
