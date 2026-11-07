import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { Notice } from '@/components/ui';
import { formatBytes, parseSizeToBytes } from '@/lib/format';
import type { Kind } from '@/lib/sniff';
import { ImageSource, useSource } from '../_shared/imageUi';
import { checkRequirements, type Requirements } from './logic';

const FORMATS: { kind: Kind; label: string }[] = [{ kind: 'jpeg', label: 'JPG' }, { kind: 'png', label: 'PNG' }, { kind: 'webp', label: 'WebP' }, { kind: 'gif', label: 'GIF' }];
const pos = (s: string) => { const n = Number(s); return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined; };

export default function View() {
  const { source, error, pick, reset } = useSource();
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState<'KB' | 'MB'>('MB');
  const [minW, setMinW] = useState(''); const [maxW, setMaxW] = useState('');
  const [minH, setMinH] = useState(''); const [maxH, setMaxH] = useState('');
  const [aw, setAw] = useState(''); const [ah, setAh] = useState('');
  const [formats, setFormats] = useState<Kind[]>([]);

  const checks = useMemo(() => {
    if (!source) return [];
    const sz = pos(size);
    const req: Requirements = {
      maxBytes: sz ? parseSizeToBytes(sz, unit) : undefined,
      minWidth: pos(minW), maxWidth: pos(maxW), minHeight: pos(minH), maxHeight: pos(maxH),
      formats: formats.length ? formats : undefined,
      aspect: pos(aw) && pos(ah) ? { w: pos(aw)!, h: pos(ah)! } : undefined,
    };
    return checkRequirements({ bytes: source.picked.file.size, width: source.width, height: source.height, kind: source.picked.kind }, req, formatBytes);
  }, [source, size, unit, minW, maxW, minH, maxH, aw, ah, formats]);

  const failed = checks.filter((c) => !c.pass);
  const num = (id: string, label: string, v: string, set: (s: string) => void) => (
    <div className="field"><label htmlFor={id}>{label}</label><input id={id} className="input" type="number" inputMode="numeric" min={1} value={v} onChange={(e) => set(e.target.value)} /></div>
  );

  return (
    <div className="tool-grid two">
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <ImageSource source={source} error={error} onPick={pick} onReset={reset} />
        <div className="panel">
          <h2 className="panel-title">The site’s requirements</h2>
          <p className="hint">Enter only the limits the site gives you. Leave the rest empty.</p>
          <div className="row">
            <div className="field"><label htmlFor="rq-size">Maximum file size</label><input id="rq-size" className="input" type="number" inputMode="decimal" min={0} step="any" value={size} onChange={(e) => setSize(e.target.value)} /></div>
            <div className="field" style={{ flex: '0 0 6rem' }}><label htmlFor="rq-unit">Unit</label><select id="rq-unit" className="select" value={unit} onChange={(e) => setUnit(e.target.value as 'KB' | 'MB')}><option>KB</option><option>MB</option></select></div>
          </div>
          <div className="row">{num('rq-minw', 'Min width (px)', minW, setMinW)}{num('rq-maxw', 'Max width (px)', maxW, setMaxW)}</div>
          <div className="row">{num('rq-minh', 'Min height (px)', minH, setMinH)}{num('rq-maxh', 'Max height (px)', maxH, setMaxH)}</div>
          <fieldset>
            <legend>Allowed formats</legend>
            <div className="chips">
              {FORMATS.map((f) => (
                <label key={f.kind} className="check"><input type="checkbox" checked={formats.includes(f.kind)} onChange={(e) => setFormats((p) => (e.target.checked ? [...p, f.kind] : p.filter((k) => k !== f.kind)))} /> {f.label}</label>
              ))}
            </div>
          </fieldset>
          <div className="row">{num('rq-aw', 'Shape: width part', aw, setAw)}{num('rq-ah', 'Shape: height part', ah, setAh)}</div>
          <p className="hint">1 MB is counted as 1,000,000 bytes. Files under that also pass sites that count 1,048,576.</p>
        </div>
      </div>

      <div className="panel" aria-live="polite">
        <h2 className="panel-title">Checklist</h2>
        {!source && <Notice kind="info">Choose an image to check it against your requirements.</Notice>}
        {source && checks.length === 0 && <Notice kind="info">Enter at least one requirement to see the checklist.</Notice>}
        {source && checks.length > 0 && (
          <>
            {failed.length === 0
              ? <Notice kind="ok" title="This image meets every requirement you entered.">{checks.length} of {checks.length} checks passed.</Notice>
              : <Notice kind="warn" title={`${failed.length} of ${checks.length} requirement${checks.length > 1 ? 's' : ''} not met.`}>Fix the items marked “Fails” and check again.</Notice>}
            <ul role="list" style={{ display: 'grid', gap: 'var(--space-3)', padding: 0, margin: 0, listStyle: 'none' }}>
              {checks.map((c) => (
                <li key={c.id} className={`notice ${c.pass ? 'notice-ok' : 'notice-error'}`} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-3)' }}>
                  <Icon name={c.pass ? 'ok' : 'error'} size={20} />
                  <div>
                    <strong>{c.label}: {c.pass ? 'Passes' : 'Fails'}</strong>
                    <div>Yours: {c.measured}. Required: {c.required}.</div>
                    {c.fix && <p style={{ marginTop: 'var(--space-2)' }}><Link className="btn btn-sm" to={c.fix.to}>{c.fix.label}</Link></p>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
