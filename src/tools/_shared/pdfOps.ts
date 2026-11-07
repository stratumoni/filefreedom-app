import { PDFDocument, PDFName } from '@cantoo/pdf-lib';

export type PdfErrorCode = 'encrypted' | 'invalid' | 'empty';
export class PdfError extends Error {
  constructor(public code: PdfErrorCode, message: string) { super(message); this.name = 'PdfError'; }
}

export interface PdfInfo { pages: number; warnings: string[] }

/** Open a PDF. Password-protected and damaged files are reported plainly rather than producing a broken result. */
export async function loadPdf(bytes: Uint8Array, label = 'This PDF'): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: false });
  } catch (e) {
    if (e instanceof Error && /encrypt/i.test(`${e.name} ${e.message}`)) {
      throw new PdfError('encrypted', `${label} is password-protected. FileFreedom cannot open protected PDFs yet. Remove the password in the program that created it, then try again.`);
    }
    throw new PdfError('invalid', `${label} could not be read. The file may be damaged or is not a valid PDF.`);
  }
  let count: number;
  try {
    count = doc.getPageCount(); // a damaged file can load "successfully" yet have no usable page tree
  } catch {
    throw new PdfError('invalid', `${label} could not be read. The file may be damaged or is not a valid PDF.`);
  }
  if (count === 0) throw new PdfError('empty', `${label} has no pages.`);
  return doc;
}

/** Features that are not carried over when pages are copied into a new document. */
export function featureWarnings(doc: PDFDocument, name: string): string[] {
  const w: string[] = [];
  try {
    if (doc.catalog.has(PDFName.of('AcroForm')) && doc.getForm().getFields().length > 0) w.push(`“${name}” has fillable form fields. They may not stay fillable in the result.`);
    if (doc.catalog.has(PDFName.of('Outlines'))) w.push(`“${name}” has bookmarks. Bookmarks are not kept.`);
  } catch { /* an unusual structure is not worth blocking on */ }
  return w;
}

export async function inspectPdf(bytes: Uint8Array, name: string): Promise<PdfInfo> {
  const doc = await loadPdf(bytes, `“${name}”`);
  return { pages: doc.getPageCount(), warnings: featureWarnings(doc, name) };
}

async function fresh(): Promise<PDFDocument> {
  const d = await PDFDocument.create({ updateMetadata: false });
  d.setProducer('FileFreedom');
  d.setCreator('FileFreedom');
  return d;
}

export async function mergePdfs(inputs: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  if (inputs.length < 2) throw new PdfError('invalid', 'Choose at least two PDFs to merge.');
  const out = await fresh();
  for (const { name, bytes } of inputs) {
    const src = await loadPdf(bytes, `“${name}”`);
    for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page);
  }
  return out.save();
}

/** Copy the given zero-based pages, in the given order, into a new PDF. */
export async function extractPages(bytes: Uint8Array, pages: number[], name = 'This PDF'): Promise<Uint8Array> {
  const src = await loadPdf(bytes, `“${name}”`);
  const out = await fresh();
  for (const page of await out.copyPages(src, pages)) out.addPage(page);
  return out.save();
}

/** Split into consecutive files of `every` pages (the last may be shorter). */
export async function splitEvery(bytes: Uint8Array, every: number, name = 'This PDF'): Promise<{ from: number; to: number; bytes: Uint8Array }[]> {
  const src = await loadPdf(bytes, `“${name}”`);
  const n = src.getPageCount();
  const parts: { from: number; to: number; bytes: Uint8Array }[] = [];
  for (let from = 0; from < n; from += every) {
    const to = Math.min(n, from + every) - 1;
    const out = await fresh();
    for (const page of await out.copyPages(src, Array.from({ length: to - from + 1 }, (_, i) => from + i))) out.addPage(page);
    parts.push({ from, to, bytes: await out.save() });
  }
  return parts;
}
