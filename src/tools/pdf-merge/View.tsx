import { useState } from 'react';
import { DropZone, type PickedFile } from '@/components/DropZone';
import { Icon } from '@/components/Icon';
import { DownloadButton, Notice, Stat, Working } from '@/components/ui';
import { formatBytes } from '@/lib/format';
import { PdfError, inspectPdf, mergePdfs } from '../_shared/pdfOps';

interface Item { id: number; file: File; pages: number; warnings: string[] }
let counter = 0;
const MAX_FILES = 50;
const MAX_TOTAL = 400_000_000;

export default function View() {
  const [items, setItems] = useState<Item[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ key: string; blob: Blob; pages: number } | null>(null);
  const [failure, setFailure] = useState('');

  const key = items.map((i) => i.id).join(',');
  const totalPages = items.reduce((n, i) => n + i.pages, 0);
  const totalBytes = items.reduce((n, i) => n + i.file.size, 0);

  async function add(picked: PickedFile[]) {
    const errs: string[] = [];
    const added: Item[] = [];
    for (const p of picked) {
      if (items.length + added.length >= MAX_FILES) { errs.push(`Only ${MAX_FILES} files can be merged at once.`); break; }
      try {
        const info = await inspectPdf(new Uint8Array(await p.file.arrayBuffer()), p.file.name);
        added.push({ id: ++counter, file: p.file, pages: info.pages, warnings: info.warnings });
      } catch (e) {
        errs.push(e instanceof PdfError ? e.message : `“${p.file.name}” could not be opened.`);
      }
    }
    setErrors(errs);
    setFailure('');
    setItems((cur) => [...cur, ...added]);
  }

  const move = (i: number, d: -1 | 1) => setItems((cur) => { const n = [...cur]; const j = i + d; if (j < 0 || j >= n.length) return cur; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  const remove = (id: number) => setItems((cur) => cur.filter((x) => x.id !== id));

  async function merge() {
    if (busy || items.length < 2) return;
    if (totalBytes > MAX_TOTAL) { setFailure(`These files add up to ${formatBytes(totalBytes)}, which is more than a browser can safely merge (${formatBytes(MAX_TOTAL)}).`); return; }
    setBusy(true);
    setFailure('');
    try {
      const inputs = await Promise.all(items.map(async (i) => ({ name: i.file.name, bytes: new Uint8Array(await i.file.arrayBuffer()) })));
      const out = await mergePdfs(inputs);
      setResult({ key, blob: new Blob([out as BlobPart], { type: 'application/pdf' }), pages: totalPages });
    } catch (e) {
      setFailure(e instanceof PdfError ? e.message : 'The PDFs could not be merged. Your original files have not been changed.');
    } finally {
      setBusy(false);
    }
  }

  const done = result && result.key === key ? result : null;
  const warnings = [...new Set(items.flatMap((i) => i.warnings))];

  return (
    <div className="tool-grid">
      <DropZone kinds={['pdf']} accept="application/pdf,.pdf" multiple formatsLabel="PDF" maxBytes={200_000_000} onPick={(p) => void add(p)} buttonLabel={items.length ? 'Add more PDFs' : 'Choose PDFs'} hint="Choose two or more" />
      {errors.map((e) => <Notice key={e} kind="error">{e}</Notice>)}

      {items.length > 0 && (
        <div className="panel">
          <h2 className="panel-title">Merge order</h2>
          <p className="hint">The first file’s pages come first. Use the buttons to change the order.</p>
          <ol style={{ display: 'grid', gap: 'var(--space-2)', padding: 0, margin: 0, listStyle: 'none' }}>
            {items.map((it, i) => (
              <li key={it.id} className="file-chip">
                <span className="badge" aria-hidden="true">{i + 1}</span>
                <div className="grow"><b>{it.file.name}</b><div className="hint">{it.pages} page{it.pages === 1 ? '' : 's'} · {formatBytes(it.file.size)}</div></div>
                <button type="button" className="btn btn-sm btn-icon" aria-label={`Move ${it.file.name} up`} disabled={i === 0} onClick={() => move(i, -1)}><Icon name="next" size={16} style={{ transform: 'rotate(-90deg)' }} /></button>
                <button type="button" className="btn btn-sm btn-icon" aria-label={`Move ${it.file.name} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}><Icon name="next" size={16} style={{ transform: 'rotate(90deg)' }} /></button>
                <button type="button" className="btn btn-sm btn-icon" aria-label={`Remove ${it.file.name}`} onClick={() => remove(it.id)}><Icon name="close" size={16} /></button>
              </li>
            ))}
          </ol>
          {warnings.map((w) => <Notice key={w} kind="warn">{w}</Notice>)}
          {items.length < 2 && <Notice kind="info">Add at least one more PDF to merge.</Notice>}
          <div className="actions">
            <button type="button" className="btn btn-primary" disabled={items.length < 2 || busy} onClick={() => void merge()}>Merge {items.length} PDFs</button>
            <button type="button" className="btn" onClick={() => { setItems([]); setResult(null); setErrors([]); setFailure(''); }}>Start over</button>
          </div>
        </div>
      )}

      {busy && <Working label="Merging…" />}
      {failure && <Notice kind="error" title="That didn’t work.">{failure}</Notice>}
      {done && !busy && (
        <div className="panel result-in" aria-live="polite">
          <h2 className="panel-title">Your result</h2>
          <dl className="stats"><Stat label="Pages" value={done.pages} /><Stat label="Size" value={formatBytes(done.blob.size)} /><Stat label="Files merged" value={items.length} /></dl>
          <div className="actions"><DownloadButton blob={done.blob} filename="merged.pdf" label="Download merged.pdf" /></div>
          <p className="hint">The merged PDF was created on your device. Your original files are unchanged.</p>
        </div>
      )}
    </div>
  );
}
