import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

type NoticeKind = 'info' | 'warn' | 'error' | 'ok';
const NOTICE_ICON: Record<NoticeKind, string> = { info: 'info', warn: 'warn', error: 'error', ok: 'ok' };

/** Never colour alone: every notice carries an icon and its text states the kind of message. */
export function Notice({ kind = 'info', title, children }: { kind?: NoticeKind; title?: string; children?: ReactNode }) {
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon name={NOTICE_ICON[kind]} size={18} />
      <div>
        {title && <strong>{title}</strong>}
        {title && children ? ' ' : null}
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, small }: { label: string; value: ReactNode; small?: boolean }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd className={small ? 'small' : undefined}>{value}</dd>
    </div>
  );
}

export function Working({ label, onCancel }: { label: string; onCancel?: () => void }) {
  return (
    <div className="panel" role="status" aria-live="polite">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <strong>{label}</strong>
        {onCancel && <button type="button" className="btn btn-sm" onClick={onCancel}>Cancel</button>}
      </div>
      <div className="progress" aria-hidden="true" />
    </div>
  );
}

/** Object URL that is revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [made, setMade] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const t = setTimeout(() => setMade({ blob, url }), 0);
    return () => { clearTimeout(t); URL.revokeObjectURL(url); };
  }, [blob]);
  return blob && made && made.blob === blob ? made.url : null;
}

export function DownloadButton({ blob, filename, label = 'Download' }: { blob: Blob; filename: string; label?: string }) {
  const url = useObjectUrl(blob);
  return (
    <a className="btn btn-primary" href={url ?? undefined} download={filename} aria-disabled={!url}>
      <Icon name="download" size={18} /> {label}
    </a>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setState('done'); } catch { setState('failed'); }
      }}
    >
      <Icon name="check" size={16} style={{ display: state === 'done' ? undefined : 'none' }} />
      {state === 'done' ? 'Copied' : state === 'failed' ? 'Copy failed. Select the text instead' : label}
    </button>
  );
}

export function Seg<T extends string>({ name, legend, value, options, onChange }: { name: string; legend: string; value: T; options: { value: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="seg">
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} />
            <span style={o.disabled ? { opacity: 0.45 } : undefined}>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function useAbortable() {
  const [ctl, setCtl] = useState<AbortController | null>(null);
  useEffect(() => () => ctl?.abort(), [ctl]);
  return {
    start: () => { ctl?.abort(); const c = new AbortController(); setCtl(c); return c; },
    cancel: () => ctl?.abort(),
  };
}
