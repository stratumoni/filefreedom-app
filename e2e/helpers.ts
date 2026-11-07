import { expect, type Download, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const fixture = (name: string) => resolve(import.meta.dirname, '../src/test/fixtures', name);
export const OUT_DIR = resolve(import.meta.dirname, '../test-results/outputs');

export async function saveDownload(d: Download, as: string): Promise<string> {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = resolve(OUT_DIR, as);
  await d.saveAs(path);
  return path;
}

export async function downloadVia(page: Page, nameRe: RegExp, as: string): Promise<{ path: string; suggested: string }> {
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: nameRe }).click()]);
  return { path: await saveDownload(d, as), suggested: d.suggestedFilename() };
}

export const resultHeading = (page: Page) => page.getByRole('heading', { name: 'Your result' });
export async function expectResult(page: Page) {
  await expect(resultHeading(page)).toBeVisible({ timeout: 30_000 });
}

/** Records every request the page makes so tests can prove files never leave the browser. */
export function watchNetwork(page: Page) {
  const seen: { method: string; url: string; body: boolean }[] = [];
  page.on('request', (r) => {
    if (r.url().startsWith('blob:') || r.url().startsWith('data:')) return;
    seen.push({ method: r.method(), url: r.url(), body: !!r.postDataBuffer() });
  });
  return {
    seen,
    assertClean(origin: string) {
      const offenders = seen.filter((r) => r.method !== 'GET' || r.body || new URL(r.url).origin !== origin);
      expect(offenders, `Unexpected network activity:\n${JSON.stringify(offenders, null, 2)}`).toEqual([]);
    },
  };
}
