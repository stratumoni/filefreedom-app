import { expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { downloadVia, expectResult, fixture } from './helpers';

export type Flow = (page: Page) => Promise<void>;
const upload = (page: Page, file: string) => page.locator('input[type=file]').first().setInputFiles(fixture(file));

/** One real, end-to-end task per tool. Each also runs under network recording in audit.spec.ts. */
export const FLOWS: Record<string, Flow> = {
  'pdf-merge': async (page) => {
    await page.goto('/tools/pdf-merge');
    await page.locator('input[type=file]').first().setInputFiles([fixture('a.pdf'), fixture('b.pdf')]);
    await expect(page.getByText('3 pages · ')).toBeVisible();
    await page.getByRole('button', { name: 'Move b.pdf up' }).click();
    await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();
    await expectResult(page);
    await expect(page.getByText('merged.pdf').first()).toBeVisible();
    await downloadVia(page, /^Download merged\.pdf/, 'merged.pdf');
  },

  'pdf-split': async (page) => {
    await page.goto('/tools/pdf-split');
    await upload(page, 'five.pdf');
    await expect(page.getByRole('button', { name: 'Page 5' })).toBeVisible();
    await expect(page.locator('ul img')).toHaveCount(5, { timeout: 20_000 }); // thumbnails rendered by pdf.js
    await page.getByLabel('Pages to keep').fill('5, 1-2');
    await expect(page.getByText('3 pages selected.')).toBeVisible();
    await page.getByRole('button', { name: 'Create PDF' }).click();
    await expectResult(page);
    await downloadVia(page, /^Download five-pages\.pdf/, 'five-pages.pdf');
    await page.getByRole('radio', { name: 'Split into several files' }).check();
    await page.getByLabel('Pages per file').fill('2');
    await page.getByRole('button', { name: 'Split PDF' }).click();
    await expect(page.getByRole('link', { name: 'Download five-split.zip' })).toBeVisible({ timeout: 20_000 });
    await downloadVia(page, /^Download five-split\.zip/, 'five-split.zip');
  },

  'file-inspector': async (page) => {
    await page.goto('/tools/file-inspector');
    await upload(page, 'fake.png');
    await expect(page.getByText('The name and the contents disagree')).toBeVisible();
    await expect(page.getByText('JPEG image').first()).toBeVisible();
  },

  'file-checksum': async (page) => {
    await page.goto('/tools/file-checksum');
    await upload(page, 'sample.csv');
    const sha256 = createHash('sha256').update(readFileSync(fixture('sample.csv'))).digest('hex');
    await expect(page.getByText(sha256)).toBeVisible();
    await page.getByLabel(/Published checksum/).fill(sha256.toUpperCase());
    await expect(page.getByText('Match.')).toBeVisible();
    await page.getByLabel(/Published checksum/).fill(sha256.slice(0, -1) + (sha256.endsWith('0') ? '1' : '0'));
    await expect(page.getByText('No match.')).toBeVisible();
    const sha1 = createHash('sha1').update(readFileSync(fixture('sample.csv'))).digest('hex');
    await page.getByLabel(/Published checksum/).fill(sha1);
    await expect(page.getByText('Match.')).toBeVisible(); // algorithm auto-selected from length
  },

  'json-formatter': async (page) => {
    await page.goto('/tools/json-formatter');
    await page.getByLabel('JSON input').fill('{\n  "a": 1,\n}');
    await expect(page.getByText('Invalid JSON at line 2, column 9.')).toBeVisible();
    await page.getByRole('button', { name: 'Jump to the error' }).click();
    await page.getByLabel('JSON input').fill('{"big":12345678901234567890,"b":[1,2],"a":{"z":true}}');
    await expect(page.getByText('Valid JSON.')).toBeVisible();
    await expect(page.getByText(/too precise for JavaScript/)).toBeVisible();
    await page.getByLabel('Sort keys A to Z').check();
    const { path } = await downloadVia(page, /^Download/, 'formatted.json');
    const text = readFileSync(path, 'utf8');
    expect(text).toContain('12345678901234567890'); // not rounded
    expect(text.indexOf('"a"')).toBeLessThan(text.indexOf('"big"')); // sorted
  },

  'csv-to-json': async (page) => {
    await page.goto('/tools/csv-to-json');
    await upload(page, 'sample.csv');
    await expect(page.getByText('"city": "Paris"')).toBeVisible();
    const { path } = await downloadVia(page, /^Download/, 'sample.json');
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual([
      { name: 'Ada', city: 'London', visits: '12' },
      { name: 'Smith, Bob', city: 'Paris', visits: '007' },
    ]);
  },

  'text-cleaner': async (page) => {
    await page.goto('/tools/text-cleaner');
    await page.getByLabel('Text to clean').fill('  banana  \n\n\n apple \nbanana\ncherry');
    await page.getByLabel('Remove duplicate lines').check();
    await page.getByLabel('Sort lines').selectOption('az');
    await expect(page.getByLabel('Cleaned text')).toHaveValue('apple\nbanana\ncherry');
  },

  'image-compressor': async (page) => {
    await page.goto('/tools/image-compressor');
    await upload(page, 'photo-plain.jpg');
    await page.getByRole('radio', { name: 'Reach a size limit' }).check();
    await page.getByLabel('Make it no larger than').fill('40');
    await page.getByLabel('Unit').selectOption('KB');
    await page.getByRole('button', { name: 'Compress image' }).click();
    await expectResult(page);
    await expect(page.getByText('Under your limit.')).toBeVisible();
    const { path, suggested } = await downloadVia(page, /^Download/, 'compressed-target.jpg');
    expect(suggested).toBe('photo-plain-compressed.jpg');
    expect(statSync(path).size).toBeLessThanOrEqual(40_000);
  },

  'image-resizer': async (page) => {
    await page.goto('/tools/image-resizer');
    await upload(page, 'photo.webp');
    await page.getByLabel('Width (px)').fill('320');
    await expect(page.getByLabel('Height (px)')).toHaveValue('240');
    await page.getByRole('radio', { name: 'JPG', exact: true }).check();
    await page.getByRole('button', { name: 'Resize image' }).click();
    await expectResult(page);
    await downloadVia(page, /^Download/, 'resized.jpg');
  },

  'image-converter': async (page) => {
    await page.goto('/tools/image-converter');
    await upload(page, 'alpha.png');
    await page.getByRole('radio', { name: 'JPG', exact: true }).check();
    await page.getByRole('button', { name: 'Convert image' }).click();
    await expectResult(page);
    const jpg = await downloadVia(page, /^Download/, 'converted-from-alpha.jpg');
    expect(jpg.suggested).toBe('alpha.jpg');
    await page.getByRole('radio', { name: 'WebP', exact: true }).check();
    await page.getByRole('button', { name: 'Convert image' }).click();
    await expect(page.getByRole('link', { name: 'Download alpha.webp' })).toBeVisible({ timeout: 30_000 });
    await downloadVia(page, /^Download alpha\.webp/, 'converted-from-alpha.webp');
  },

  'image-cropper': async (page) => {
    await page.goto('/tools/image-cropper');
    await upload(page, 'opaque.png');
    await page.getByLabel('Width (px)').fill('200');
    await page.getByLabel('Height (px)').fill('100');
    await page.getByLabel('Left (px)').fill('10');
    await page.getByLabel('Top (px)').fill('20');
    await page.getByRole('button', { name: 'Crop image' }).click();
    await expectResult(page);
    await expect(page.getByText('200 × 100').first()).toBeVisible();
    await downloadVia(page, /^Download/, 'cropped.png');
  },

  'image-inspector': async (page) => {
    await page.goto('/tools/image-inspector');
    await upload(page, 'photo-exif.jpg');
    await expect(page.getByText('This photo contains location data.')).toBeVisible();
    await expect(page.getByText('FileFreedomCam')).toBeVisible();
    await expect(page.getByText('300 × 300 DPI')).toBeVisible();
  },

  'image-requirements-checker': async (page) => {
    await page.goto('/tools/image-requirements-checker');
    await upload(page, 'opaque.png');
    await page.getByLabel('Maximum file size').fill('100');
    await page.getByLabel('Unit').selectOption('KB');
    await expect(page.getByText('File size: Fails')).toBeVisible();
    await page.getByLabel('Max width (px)').fill('1000');
    await page.getByLabel('JPG').check();
    await expect(page.getByText('File format: Fails')).toBeVisible();
    await expect(page.getByText('Width: Passes')).toBeVisible();
    await page.getByRole('link', { name: 'Compress to this size' }).click();
    await expect(page).toHaveURL(/\/tools\/image-compressor\?targetKB=100/);
  },
};
