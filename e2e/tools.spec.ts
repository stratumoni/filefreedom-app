import { expect, test } from '@playwright/test';
import { closeSync, openSync, truncateSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FLOWS } from './flows';
import { fixture } from './helpers';

for (const [id, flow] of Object.entries(FLOWS)) {
  test(`tool works end to end: ${id}`, async ({ page }) => {
    await flow(page);
  });
}

test.describe('error states', () => {
  const up = (page: import('@playwright/test').Page, f: string | { name: string; mimeType: string; buffer: Buffer }) =>
    page.locator('input[type=file]').first().setInputFiles(f as never);

  test('corrupt image shows a clear error and keeps the tool usable', async ({ page }) => {
    await page.goto('/tools/image-compressor');
    await up(page, fixture('corrupt.jpg'));
    await expect(page.getByRole('alert').filter({ hasText: 'could not be read' })).toBeVisible();
    await up(page, fixture('photo-plain.jpg'));
    await expect(page.getByText('photo-plain.jpg')).toBeVisible();
  });
  test('empty file is rejected', async ({ page }) => {
    await page.goto('/tools/image-resizer');
    await up(page, fixture('empty.bin'));
    await expect(page.getByRole('alert').filter({ hasText: 'is empty' })).toBeVisible();
  });
  test('a PDF sent to an image tool is refused by its contents', async ({ page }) => {
    await page.goto('/tools/image-converter');
    await up(page, { name: 'sneaky.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('%PDF-1.7\n%%EOF') });
    await expect(page.getByRole('alert').filter({ hasText: 'PDF document' })).toBeVisible();
  });
  test('HEIC photos get an honest, actionable message', async ({ page }) => {
    await page.goto('/tools/image-compressor');
    const buf = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic'), Buffer.alloc(20)]);
    await up(page, { name: 'IMG_0001.HEIC', mimeType: 'image/heic', buffer: buf });
    await expect(page.getByRole('alert').filter({ hasText: 'HEIC' })).toBeVisible();
  });
  test('animated GIF is accepted with a clear warning', async ({ page }) => {
    await page.goto('/tools/image-converter');
    await up(page, fixture('animated.gif'));
    await expect(page.getByText('This is an animated image')).toBeVisible();
  });
  test('password-protected PDF is refused clearly in both PDF tools', async ({ page }) => {
    for (const t of ['pdf-merge', 'pdf-split']) {
      await page.goto(`/tools/${t}`);
      await up(page, fixture('encrypted.pdf'));
      await expect(page.getByRole('alert').filter({ hasText: 'password-protected' })).toBeVisible();
    }
  });
  test('damaged PDF is refused clearly', async ({ page }) => {
    await page.goto('/tools/pdf-split');
    await up(page, fixture('corrupt.pdf'));
    await expect(page.getByRole('alert').filter({ hasText: 'could not be read' })).toBeVisible();
  });
  test('PDF split validates page ranges with specific messages', async ({ page }) => {
    await page.goto('/tools/pdf-split');
    await up(page, fixture('five.pdf'));
    await page.getByLabel('Pages to keep').fill('9');
    await expect(page.getByText('Page 9 does not exist. This PDF has 5 pages.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create PDF' })).toBeDisabled();
    await page.getByLabel('Pages to keep').fill('4-2');
    await expect(page.getByText(/goes backwards/)).toBeVisible();
  });
  test('merge needs two files and rejects non-PDFs by content', async ({ page }) => {
    await page.goto('/tools/pdf-merge');
    await up(page, fixture('a.pdf'));
    await expect(page.getByText('Add at least one more PDF to merge.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Merge 1 PDFs' })).toBeDisabled();
    await up(page, fixture('photo-plain.jpg'));
    await expect(page.getByRole('alert').filter({ hasText: 'JPEG image' })).toBeVisible();
  });
  test('over-limit file is refused before processing', async ({ page }) => {
    await page.goto('/tools/image-compressor');
    const big = join(tmpdir(), 'ff-big.jpg');
    closeSync(openSync(big, 'w'));
    truncateSync(big, 101_000_000); // sparse file: no real disk use
    await up(page, big);
    await expect(page.getByRole('alert').filter({ hasText: 'limit' })).toBeVisible();
  });
  test('invalid CSV edge: unclosed quote warns but still converts', async ({ page }) => {
    await page.goto('/tools/csv-to-json');
    await page.getByLabel('CSV input').fill('a,b\n1,"2\n');
    await expect(page.getByText(/never closed/)).toBeVisible();
  });
  test('main-thread fallback works when OffscreenCanvas is unavailable', async ({ page }) => {
    await page.addInitScript(() => { Object.defineProperty(window, 'OffscreenCanvas', { value: undefined }); });
    await page.goto('/tools/image-converter');
    await up(page, fixture('photo-plain.jpg'));
    await page.getByRole('radio', { name: 'PNG', exact: true }).check();
    await page.getByRole('button', { name: 'Convert image' }).click();
    await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible({ timeout: 30_000 });
  });
});
