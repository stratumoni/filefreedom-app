/** Page thumbnails via pdf.js. Loaded lazily; the worker and fonts come from this site's own origin. */
export interface ThumbJob { cancel: () => void }

export async function renderThumbnails(
  bytes: Uint8Array,
  opts: { max: number; width: number; onThumb: (index: number, dataUrl: string) => void; onDone: (ok: boolean) => void },
): Promise<ThumbJob> {
  let cancelled = false;
  const job: ThumbJob = { cancel: () => { cancelled = true; } };
  void (async () => {
    let task: import('pdfjs-dist').PDFDocumentLoadingTask | undefined;
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
      task = pdfjs.getDocument({
        data: bytes.slice(), // pdf.js takes ownership of the buffer it is given
        standardFontDataUrl: '/pdfjs/standard_fonts/',
        useSystemFonts: false,
      });
      const doc = await task.promise;
      const n = Math.min(doc.numPages, opts.max);
      for (let i = 1; i <= n && !cancelled; i++) {
        const page = await doc.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: opts.width / base.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) break;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (!cancelled) opts.onThumb(i - 1, canvas.toDataURL('image/jpeg', 0.7));
        page.cleanup();
      }
      opts.onDone(!cancelled);
    } catch (e) {
      console.warn('Page previews unavailable:', e); // selection still works from page numbers
      opts.onDone(false);
    } finally {
      void task?.destroy();
    }
  })();
  return job;
}
