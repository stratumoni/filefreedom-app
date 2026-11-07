import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { DropZone, type PickedFile } from '@/components/DropZone';
import { Icon } from '@/components/Icon';
import { DownloadButton, Notice, Seg, Stat, Working, useObjectUrl } from '@/components/ui';
import { baseName, formatBytes, percentChange } from '@/lib/format';
import type { Kind } from '@/lib/sniff';
import { EngineError, OUT_EXT, OUT_LABEL, readImageSize, supportedOutputs, type OutType, type RenderJob, type RenderOutput } from './imageEngine';
import { runImage } from './runImage';

export const IMAGE_KINDS: Kind[] = ['jpeg', 'png', 'gif', 'webp', 'bmp', 'avif'];
export const MAX_IMAGE_BYTES = 100_000_000;

export interface Source { id: number; picked: PickedFile; width: number; height: number }
let sourceCounter = 0;

export function useSource() {
  const [source, setSource] = useState<Source | null>(null);
  const [error, setError] = useState('');
  const pick = useCallback(async (files: PickedFile[]) => {
    const p = files[0]!;
    setError('');
    try {
      const { width, height } = await readImageSize(p.file);
      setSource({ id: ++sourceCounter, picked: p, width, height });
    } catch (e) {
      setSource(null);
      setError(e instanceof EngineError ? e.message : 'This image could not be opened.');
    }
  }, []);
  return { source, error, pick, reset: () => { setSource(null); setError(''); } };
}

export function ImageSource({ source, error, onPick, onReset }: { source: Source | null; error: string; onPick: (f: PickedFile[]) => void; onReset: () => void }) {
  const url = useObjectUrl(source?.picked.file);
  if (!source) {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <DropZone kinds={IMAGE_KINDS} accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif" formatsLabel="JPG, PNG, WebP, GIF, BMP, AVIF" maxBytes={MAX_IMAGE_BYTES} onPick={onPick} buttonLabel="Choose image" />
        {error && <Notice kind="error" title="Could not open this image.">{error}</Notice>}
      </div>
    );
  }
  const f = source.picked.file;
  return (
    <div className="panel">
      <div className="file-chip">
        {url && <img src={url} alt="" width={56} height={56} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />}
        <div className="grow">
          <b>{f.name}</b>
          <div className="hint">{formatBytes(f.size)} · {source.width} × {source.height} px</div>
        </div>
        <button type="button" className="btn btn-sm" onClick={onReset}>Choose another</button>
      </div>
      {source.picked.notes.map((n) => <Notice key={n} kind="warn">{n}</Notice>)}
    </div>
  );
}

export function useOutputTypes() {
  const [types, setTypes] = useState<OutType[] | null>(null);
  useEffect(() => { void supportedOutputs().then(setTypes); }, []);
  return types;
}

export function OutputFormat({ value, onChange, allowed, legend = 'Output format', extra }: { value: OutType; onChange: (t: OutType) => void; allowed: OutType[] | null; legend?: string; extra?: Partial<Record<OutType, string>> }) {
  const all: OutType[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  return (
    <Seg<OutType> name="fmt" legend={legend} value={value} onChange={onChange}
      options={all.filter((t) => !allowed || allowed.includes(t)).map((t) => ({ value: t, label: extra?.[t] ?? OUT_LABEL[t] }))} />
  );
}

export function kindToType(kind: Kind, allowed: OutType[] | null): OutType {
  const want: OutType = kind === 'png' ? 'image/png' : kind === 'webp' ? 'image/webp' : kind === 'avif' ? 'image/avif' : 'image/jpeg';
  return !allowed || allowed.includes(want) ? want : 'image/jpeg';
}

export function outName(file: File, suffix: string, type: OutType) {
  return `${baseName(file.name)}${suffix}.${OUT_EXT[type]}`;
}

export function useRender() {
  const [state, setState] = useState<{ status: 'idle' | 'working' | 'done' | 'error'; result?: RenderOutput; error?: string; progress?: string }>({ status: 'idle' });
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const run = useCallback(async (job: RenderJob) => {
    if (ctl.current && !ctl.current.signal.aborted && state.status === 'working') return; // ignore repeated clicks
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setState({ status: 'working' });
    try {
      const result = await runImage(job, { signal: c.signal, onProgress: (progress) => setState((s) => (s.status === 'working' ? { ...s, progress } : s)) });
      if (!c.signal.aborted) setState({ status: 'done', result });
    } catch (e) {
      if (e instanceof EngineError && e.code === 'aborted') setState({ status: 'idle' });
      else setState({ status: 'error', error: e instanceof Error ? e.message : 'Processing failed.' });
    }
  }, [state.status]);
  return { ...state, run, cancel: () => ctl.current?.abort(), clear: () => setState({ status: 'idle' }) };
}

export function RenderStatus({ r, workingLabel = 'Processing your image…' }: { r: ReturnType<typeof useRender>; workingLabel?: string }) {
  if (r.status === 'working') return <Working label={r.progress ?? workingLabel} onCancel={r.cancel} />;
  if (r.status === 'error') return <Notice kind="error" title="That didn’t work.">{r.error} Your original file has not been changed.</Notice>;
  return null;
}

export function ResultView({ original, source, result, filename, children }: { original: File; source: Source; result: RenderOutput; filename: string; children?: ReactNode }) {
  const before = useObjectUrl(original);
  const after = useObjectUrl(result.blob);
  const smaller = result.blob.size < original.size;
  return (
    <div className="panel result-in" aria-live="polite">
      <h2 className="panel-title">Your result</h2>
      <dl className="stats">
        <Stat label="Before" value={formatBytes(original.size)} />
        <Stat label="After" value={formatBytes(result.blob.size)} />
        <Stat label="Change" value={percentChange(original.size, result.blob.size)} />
        <Stat label="Pixels" value={`${result.width} × ${result.height}`} small />
      </dl>
      {children}
      <div className="compare">
        <figure><div className="preview">{before && <img src={before} alt="Original image" />}</div><figcaption>Original · {source.width} × {source.height} px</figcaption></figure>
        <figure><div className="preview">{after && <img src={after} alt="Result image" />}</div><figcaption>Result · {result.width} × {result.height} px</figcaption></figure>
      </div>
      {!smaller && <Notice kind="info">The result is not smaller than the original. That is normal when converting or enlarging, or when the original was already well compressed.</Notice>}
      <div className="actions"><DownloadButton blob={result.blob} filename={filename} label={`Download ${filename}`} /></div>
      <p className="hint"><Icon name="info" size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> The download is created on your device. Your original file is unchanged.</p>
    </div>
  );
}

export function QualitySlider({ value, onChange, disabled, id = 'quality' }: { value: number; onChange: (v: number) => void; disabled?: boolean; id?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>Quality: {Math.round(value * 100)}%</label>
      <input id={id} type="range" min={40} max={100} step={1} value={Math.round(value * 100)} disabled={disabled} onChange={(e) => onChange(Number(e.target.value) / 100)} />
      <span className="hint">{disabled ? 'PNG is lossless, so quality does not apply.' : 'Lower quality makes a smaller file. Around 80% is usually hard to tell apart from the original.'}</span>
    </div>
  );
}
