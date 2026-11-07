import { useEffect, useMemo, useState } from 'react';
import { DropZone, type PickedFile } from '@/components/DropZone';
import { DownloadButton, Notice, Seg, Stat, Working } from '@/components/ui';
import { baseName, formatBytes } from '@/lib/format';
import { PdfError, extractPages, inspectPdf, splitEvery } from '../_shared/pdfOps';
import { formatPageRanges, parsePageRanges } from '../_shared/ranges';
import { renderThumbnails } from '../_shared/thumbs';
import { makeZip } from '../_shared/zip';

interface Source { id: number; file: File; bytes: Uint8Array; pages: number; warnings: string[] }
let counter = 0;
const THUMB_LIMIT = 60;

export default function View() {
  const [source, setSource] = useState<Source | null>(null);
  const [error, setError] = useState('');

  async function pick(files: PickedFile[]) {
    const f = files[0]!.file;
    setError('');
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const info = await inspectPdf(bytes, f.name);
      setSource({ id: ++counter, file: f, bytes, pages: info.pages, warnings: info.warnings });
    } catch (e) {
      setSource(null);
      setError(e instanceof PdfError ? e.message : `“${f.name}” could not be opened.`);
    }
  }

  return (
    <div className="tool-grid">
      {!source ? (
        <DropZone kinds={['pdf']} accept="application/pdf,.pdf" formatsLabel="PDF" maxBytes={200_000_000} onPick={(p) => void pick(p)} buttonLabel="Choose PDF" />
      ) : (
        <div className="panel">
          <div className="file-chip">
            <div className="grow"><b>{source.file.name}</b><div className="hint">{source.pages} page{source.pages === 1 ? '' : 's'} · {formatBytes(source.file.size)}</div></div>
            <button type="button" className="btn btn-sm" onClick={() => setSource(null)}>Choose another</button>
          </div>
          {source.warnings.map((w) => <Notice key={w} kind="warn">{w}</Notice>)}
        </div>
      )}
      {error && <Notice kind="error" title="Could not open this PDF.">{error}</Notice>}
      {source && <Workbench key={source.id} source={source} />}
    </div>
  );
}

function Workbench({ source }: { source: Source }) {
  const [mode, setMode] = useState<'extract' | 'split'>('extract');
  const [text, setText] = useState('');
  const [every, setEvery] = useState('1');
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [thumbsOk, setThumbsOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [result, setResult] = useState<{ blob: Blob; name: string; files: number; pages: number } | null>(null);

  useEffect(() => {
    let job: { cancel: () => void } | undefined;
    let dead = false;
    void renderThumbnails(source.bytes, {
      max: THUMB_LIMIT, width: 140,
      onThumb: (i, url) => { if (!dead) setThumbs((t) => ({ ...t, [i]: url })); },
      onDone: (ok) => { if (!dead) setThumbsOk(ok); },
    }).then((j) => { job = j; if (dead) j.cancel(); });
    return () => { dead = true; job?.cancel(); };
  }, [source]);

  const parsed = useMemo(() => (text.trim() ? parsePageRanges(text, source.pages) : null), [text, source.pages]);
  const selected = useMemo(() => new Set(parsed?.ok ? parsed.pages : []), [parsed]);
  const n = Math.floor(Number(every));
  const everyBad = !(n >= 1 && n <= source.pages);
  const base = baseName(source.file.name);

  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setText(formatPageRanges([...next]));
    setResult(null);
  }

  async function run() {
    if (busy) return;
    setBusy(true); setFailure(''); setResult(null);
    try {
      if (mode === 'extract') {
        if (!parsed || !parsed.ok) return;
        const out = await extractPages(source.bytes, parsed.pages, source.file.name);
        setResult({ blob: new Blob([out as BlobPart], { type: 'application/pdf' }), name: `${base}-pages.pdf`, files: 1, pages: parsed.pages.length });
      } else {
        const parts = await splitEvery(source.bytes, n, source.file.name);
        const pad = String(source.pages).length;
        const label = (p: { from: number; to: number }) => (p.from === p.to ? `page-${String(p.from + 1).padStart(pad, '0')}` : `pages-${String(p.from + 1).padStart(pad, '0')}-${String(p.to + 1).padStart(pad, '0')}`);
        const zip = makeZip(parts.map((p) => ({ name: `${base}-${label(p)}.pdf`, data: p.bytes })));
        setResult({ blob: new Blob([zip as BlobPart], { type: 'application/zip' }), name: `${base}-split.zip`, files: parts.length, pages: source.pages });
      }
    } catch (e) {
      setFailure(e instanceof PdfError ? e.message : 'The PDF could not be split. Your original file has not been changed.');
    } finally {
      setBusy(false);
    }
  }

  const canRun = mode === 'extract' ? !!parsed && parsed.ok : !everyBad;
  return (
    <>
      <div className="panel">
        <Seg<'extract' | 'split'> name="split-mode" legend="What do you want to do?" value={mode} onChange={(m) => { setMode(m); setResult(null); }}
          options={[{ value: 'extract', label: 'Keep chosen pages' }, { value: 'split', label: 'Split into several files' }]} />
        {mode === 'extract' ? (
          <>
            <div className="field">
              <label htmlFor="ranges">Pages to keep</label>
              <input id="ranges" className="input" value={text} placeholder="For example 1-3, 5, 8-" inputMode="text" autoComplete="off" onChange={(e) => { setText(e.target.value); setResult(null); }} aria-invalid={parsed?.ok === false} aria-describedby="ranges-help" />
              <span id="ranges-help" className="hint">Type pages and ranges, or tap pages below. Pages are kept in the order you type them, so “3, 1” puts page 3 first.</span>
            </div>
            {parsed?.ok === false && <Notice kind="error">{parsed.error}</Notice>}
            {parsed?.ok && <p className="hint">{parsed.pages.length} page{parsed.pages.length === 1 ? '' : 's'} selected.</p>}
          </>
        ) : (
          <div className="field">
            <label htmlFor="every">Pages per file</label>
            <input id="every" className="input" type="number" inputMode="numeric" min={1} max={source.pages} value={every} onChange={(e) => { setEvery(e.target.value); setResult(null); }} />
            <div className="chips"><button type="button" className="chip" onClick={() => setEvery('1')}>Every page separately</button>{source.pages >= 4 && <button type="button" className="chip" onClick={() => setEvery('2')}>Every 2 pages</button>}</div>
            {!everyBad && <span className="hint">You will get {Math.ceil(source.pages / n)} PDF file{Math.ceil(source.pages / n) === 1 ? '' : 's'} in one ZIP download.</span>}
            {everyBad && <Notice kind="error">Enter a number from 1 to {source.pages}.</Notice>}
          </div>
        )}
        <div className="actions"><button type="button" className="btn btn-primary" disabled={!canRun || busy} onClick={() => void run()}>{mode === 'extract' ? 'Create PDF' : 'Split PDF'}</button></div>
      </div>

      <div className="panel">
        <h2 className="panel-title">Pages</h2>
        {thumbsOk === false && <Notice kind="info">Previews are unavailable for this PDF, but you can still choose pages by number.</Notice>}
        {source.pages > THUMB_LIMIT && <p className="hint">Previews are shown for the first {THUMB_LIMIT} pages. You can still choose any page by number.</p>}
        <ul role="list" style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fill, minmax(6.5rem, 1fr))', padding: 0, margin: 0, listStyle: 'none' }}>
          {Array.from({ length: source.pages }, (_, i) => (
            <li key={i}>
              <button type="button" className="chip" aria-pressed={selected.has(i)} aria-label={`Page ${i + 1}`} disabled={mode === 'split'} onClick={() => toggle(i)}
                style={{ flexDirection: 'column', gap: 6, width: '100%', minHeight: '7.5rem', padding: 8, borderRadius: 'var(--radius-md)', justifyContent: 'flex-start' }}>
                {thumbs[i] ? <img src={thumbs[i]} alt="" style={{ maxHeight: 96, width: 'auto', border: '1px solid var(--c-border)', background: '#fff' }} /> : <span style={{ height: 96, display: 'grid', placeItems: 'center', color: 'inherit', opacity: 0.6 }}>{i < THUMB_LIMIT && thumbsOk !== false ? '…' : ''}</span>}
                <span>{i + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {busy && <Working label="Working…" />}
      {failure && <Notice kind="error" title="That didn’t work.">{failure}</Notice>}
      {result && !busy && (
        <div className="panel result-in" aria-live="polite">
          <h2 className="panel-title">Your result</h2>
          <dl className="stats"><Stat label={result.files > 1 ? 'Files' : 'Pages'} value={result.files > 1 ? result.files : result.pages} /><Stat label="Size" value={formatBytes(result.blob.size)} /></dl>
          <div className="actions"><DownloadButton blob={result.blob} filename={result.name} label={`Download ${result.name}`} /></div>
          <p className="hint">Created on your device. Your original file is unchanged.</p>
        </div>
      )}
    </>
  );
}
