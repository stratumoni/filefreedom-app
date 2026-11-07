import { readFileSync } from 'node:fs';
import { PDFDocument } from '@cantoo/pdf-lib';
import { describe, expect, it } from 'vitest';
import { PdfError, extractPages, inspectPdf, loadPdf, mergePdfs, splitEvery } from './pdfOps';

const fx = (n: string) => new Uint8Array(readFileSync(new URL(`../../test/fixtures/${n}`, import.meta.url)));
/** Each fixture page has a unique width, so page order can be checked exactly. */
const widths = async (b: Uint8Array) => { const d = await PDFDocument.load(b); return d.getPages().map((p) => Math.round(p.getWidth())); };

describe('pdfOps (real PDFs)', () => {
  it('reads page counts', async () => {
    expect((await inspectPdf(fx('a.pdf'), 'a.pdf')).pages).toBe(3);
    expect((await inspectPdf(fx('five.pdf'), 'five.pdf')).pages).toBe(5);
  });
  it('merges in the given order with every page preserved', async () => {
    const out = await mergePdfs([{ name: 'b', bytes: fx('b.pdf') }, { name: 'a', bytes: fx('a.pdf') }]);
    expect(await widths(out)).toEqual([400, 410, 300, 310, 320]);
    const d = await PDFDocument.load(out, { updateMetadata: false });
    expect(d.getProducer()).toBe('FileFreedom');
  });
  it('extracts pages in the typed order, including repeats', async () => {
    expect(await widths(await extractPages(fx('five.pdf'), [4, 0, 0]))).toEqual([240, 200, 200]);
  });
  it('splits every N pages and covers all pages exactly once', async () => {
    const parts = await splitEvery(fx('five.pdf'), 2);
    expect(parts.map((p) => [p.from, p.to])).toEqual([[0, 1], [2, 3], [4, 4]]);
    expect(await Promise.all(parts.map((p) => widths(p.bytes)))).toEqual([[200, 210], [220, 230], [240]]);
  });
  it('refuses a password-protected PDF with a clear message', async () => {
    const e = await loadPdf(fx('encrypted.pdf'), '“enc.pdf”').catch((x) => x);
    expect(e).toBeInstanceOf(PdfError);
    expect(e.code).toBe('encrypted');
    expect(e.message).toMatch(/password-protected/);
  });
  it('refuses a damaged PDF and non-PDF bytes', async () => {
    for (const bytes of [fx('corrupt.pdf'), new TextEncoder().encode('hello')]) {
      const e = await loadPdf(bytes).catch((x) => x);
      expect(e).toBeInstanceOf(PdfError);
      expect(e.code).toBe('invalid');
    }
  });
  it('needs two files to merge', async () => {
    await expect(mergePdfs([{ name: 'a', bytes: fx('a.pdf') }])).rejects.toThrow(/at least two/);
  });
});
