import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Notice, Seg } from '@/components/ui';
import { parseSizeToBytes } from '@/lib/format';
import type { OutType } from '../_shared/imageEngine';
import { ImageSource, OutputFormat, QualitySlider, RenderStatus, ResultView, kindToType, outName, useOutputTypes, useRender, useSource, type Source } from '../_shared/imageUi';

export default function View() {
  const { source, error, pick, reset } = useSource();
  return (
    <div className="tool-grid">
      <ImageSource source={source} error={error} onPick={pick} onReset={reset} />
      {source && <Workbench key={source.id} source={source} />}
    </div>
  );
}

function Workbench({ source }: { source: Source }) {
  const [params] = useSearchParams();
  const allowed = useOutputTypes();
  const r = useRender();
  const initialKB = Number(params.get('targetKB')) || (params.get('target') ? Number(params.get('target')) * 1000 : 0);
  const wholeMB = initialKB >= 1000 && initialKB % 1000 === 0;
  const [choice, setChoice] = useState<OutType | null>(null);
  const [quality, setQuality] = useState(0.8);
  const [mode, setMode] = useState<'quality' | 'target'>(initialKB ? 'target' : 'quality');
  const [targetValue, setTargetValue] = useState(wholeMB ? initialKB / 1000 : initialKB || 2);
  const [unit, setUnit] = useState<'KB' | 'MB'>(initialKB && !wholeMB ? 'KB' : 'MB');
  const [maxSide, setMaxSide] = useState('');
  const [bg, setBg] = useState('#ffffff');

  const t = choice ?? kindToType(source.picked.kind, allowed);
  const lossy = t !== 'image/png';
  const side = Number(maxSide);

  function go() {
    const long = Math.max(source.width, source.height);
    const scale = side > 0 && side < long ? side / long : 1;
    void r.run({
      file: source.picked.file, type: t, quality, background: bg,
      resize: scale < 1 ? { width: Math.max(1, Math.round(source.width * scale)), height: Math.max(1, Math.round(source.height * scale)) } : undefined,
      targetBytes: mode === 'target' ? parseSizeToBytes(targetValue, unit) : undefined,
    });
  }

  const res = r.result;
  return (
    <>
      <div className="panel">
        <h2 className="panel-title">Options</h2>
        <Seg<'quality' | 'target'> name="mode" legend="How do you want to shrink it?" value={mode} onChange={setMode} options={[{ value: 'quality', label: 'Choose a quality' }, { value: 'target', label: 'Reach a size limit' }]} />
        {mode === 'quality' ? <QualitySlider value={quality} onChange={setQuality} disabled={!lossy} /> : (
          <div className="row">
            <div className="field"><label htmlFor="target">Make it no larger than</label><input id="target" className="input" type="number" inputMode="decimal" min={1} step="any" value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} /></div>
            <div className="field" style={{ flex: '0 0 6rem' }}><label htmlFor="unit">Unit</label><select id="unit" className="select" value={unit} onChange={(e) => setUnit(e.target.value as 'KB' | 'MB')}><option>KB</option><option>MB</option></select></div>
          </div>
        )}
        {mode === 'target' && <p className="hint">1 MB is counted as 1,000,000 bytes, which is stricter than 1,048,576. A file under this limit also passes sites that count in binary. The tool tries real encodes and shows the measured size, lowering quality first and dimensions only if needed.</p>}
        <OutputFormat value={t} onChange={setChoice} allowed={allowed} />
        {t === 'image/png' && mode === 'quality' && <Notice kind="info" title="PNG files can’t be compressed by quality.">To make this smaller, choose JPG or WebP, or limit the dimensions below. Transparency is kept only in PNG, WebP and AVIF.</Notice>}
        <details className="advanced">
          <summary>Advanced</summary>
          <div>
            <div className="field"><label htmlFor="maxside">Longest side (pixels, optional)</label><input id="maxside" className="input" type="number" inputMode="numeric" min={1} placeholder={`Currently ${Math.max(source.width, source.height)}`} value={maxSide} onChange={(e) => setMaxSide(e.target.value)} /><span className="hint">Shrinks the image so its longest side is this many pixels.</span></div>
            {t === 'image/jpeg' && <div className="field"><label htmlFor="bg">Fill colour for transparent areas</label><input id="bg" type="color" value={bg} onChange={(e) => setBg(e.target.value)} style={{ minHeight: 'var(--touch)', width: '5rem' }} /><span className="hint">JPG can’t be transparent.</span></div>}
          </div>
        </details>
        <div className="actions"><button type="button" className="btn btn-primary" onClick={go} disabled={r.status === 'working' || !allowed || (mode === 'target' && !(targetValue > 0))}>Compress image</button></div>
      </div>
      <RenderStatus r={r} workingLabel="Compressing…" />
      {res && r.status === 'done' && (
        <ResultView original={source.picked.file} source={source} result={res} filename={outName(source.picked.file, '-compressed', t)}>
          {mode === 'target' && (res.targetMet
            ? <Notice kind="ok" title="Under your limit.">The result is {res.blob.size.toLocaleString()} bytes after {res.attempts} test encode{res.attempts > 1 ? 's' : ''}{res.scale < 1 ? `, with dimensions reduced to ${Math.round(res.scale * 100)}%` : ''}.</Notice>
            : <Notice kind="warn" title="Could not reach that size.">This is the smallest result the tool could make without making the image unrecognisable. Try a larger limit or a different format.</Notice>)}
          {mode === 'quality' && lossy && <Notice kind="info">Saved at {Math.round(res.quality * 100)}% quality. Metadata such as camera details and location was not copied into the result.</Notice>}
        </ResultView>
      )}
    </>
  );
}
