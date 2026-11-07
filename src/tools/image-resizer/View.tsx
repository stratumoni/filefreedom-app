import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Notice, Seg } from '@/components/ui';
import type { OutType } from '../_shared/imageEngine';
import { MAX_PIXELS, MAX_SIDE } from '../_shared/imageEngine';
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

function initialSize(source: Source, params: URLSearchParams) {
  const qw = Number(params.get('w'));
  const qh = Number(params.get('h'));
  if (qw > 0) return { w: String(qw), h: String(Math.max(1, Math.round((qw * source.height) / source.width))) };
  if (qh > 0) return { h: String(qh), w: String(Math.max(1, Math.round((qh * source.width) / source.height))) };
  return { w: String(source.width), h: String(source.height) };
}

function Workbench({ source }: { source: Source }) {
  const [params] = useSearchParams();
  const allowed = useOutputTypes();
  const r = useRender();
  const [init] = useState(() => initialSize(source, params));
  const [unit, setUnit] = useState<'px' | 'pct'>('px');
  const [w, setW] = useState(init.w);
  const [h, setH] = useState(init.h);
  const [pct, setPct] = useState('50');
  const [lock, setLock] = useState(true);
  const [choice, setChoice] = useState<OutType | null>(null);
  const [quality, setQuality] = useState(0.9);

  const t = choice ?? kindToType(source.picked.kind, allowed);
  const target = unit === 'pct'
    ? { width: Math.round((source.width * Number(pct)) / 100), height: Math.round((source.height * Number(pct)) / 100) }
    : { width: Math.round(Number(w)), height: Math.round(Number(h)) };
  const bad = !(target.width >= 1 && target.height >= 1) ? 'Enter a width and height of at least 1 pixel.'
    : target.width > MAX_SIDE || target.height > MAX_SIDE || target.width * target.height > MAX_PIXELS ? `That is larger than this tool can safely create (up to ${MAX_SIDE} px on a side).` : '';
  const enlarging = target.width > source.width;

  const onW = (v: string) => { setW(v); if (lock && Number(v) > 0) setH(String(Math.max(1, Math.round((Number(v) * source.height) / source.width)))); };
  const onH = (v: string) => { setH(v); if (lock && Number(v) > 0) setW(String(Math.max(1, Math.round((Number(v) * source.width) / source.height)))); };

  return (
    <>
      <div className="panel">
        <h2 className="panel-title">Options</h2>
        <Seg<'px' | 'pct'> name="unit" legend="Resize by" value={unit} onChange={setUnit} options={[{ value: 'px', label: 'Pixels' }, { value: 'pct', label: 'Percent' }]} />
        {unit === 'px' ? (
          <>
            <div className="row">
              <div className="field"><label htmlFor="w">Width (px)</label><input id="w" className="input" type="number" inputMode="numeric" min={1} value={w} onChange={(e) => onW(e.target.value)} /></div>
              <div className="field"><label htmlFor="h">Height (px)</label><input id="h" className="input" type="number" inputMode="numeric" min={1} value={h} onChange={(e) => onH(e.target.value)} /></div>
            </div>
            <label className="check"><input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} /> Keep the original proportions</label>
            <div className="chips" role="group" aria-label="Common widths">
              {[3840, 1920, 1280, 800, 400].map((n) => <button key={n} type="button" className="chip" onClick={() => { setLock(true); setW(String(n)); setH(String(Math.max(1, Math.round((n * source.height) / source.width)))); }}>{n} px wide</button>)}
            </div>
          </>
        ) : (
          <div className="field">
            <label htmlFor="pct">Scale: {pct}% (about {target.width} × {target.height} px)</label>
            <input id="pct" type="range" min={5} max={200} value={pct} onChange={(e) => setPct(e.target.value)} />
            <div className="chips">{[25, 50, 75].map((n) => <button key={n} type="button" className="chip" onClick={() => setPct(String(n))}>{n}%</button>)}</div>
          </div>
        )}
        {enlarging && <Notice kind="warn" title="This enlarges the image.">Making an image bigger cannot add detail, so it will look softer. Resizing down gives the best quality.</Notice>}
        {bad && <Notice kind="error">{bad}</Notice>}
        <OutputFormat value={t} onChange={setChoice} allowed={allowed} />
        <QualitySlider value={quality} onChange={setQuality} disabled={t === 'image/png'} />
        <div className="actions"><button type="button" className="btn btn-primary" disabled={!!bad || r.status === 'working' || !allowed}
          onClick={() => void r.run({ file: source.picked.file, type: t, quality, background: '#ffffff', resize: target })}>Resize image</button></div>
      </div>
      <RenderStatus r={r} workingLabel="Resizing…" />
      {r.result && r.status === 'done' && <ResultView original={source.picked.file} source={source} result={r.result} filename={outName(source.picked.file, `-${r.result.width}x${r.result.height}`, t)} />}
    </>
  );
}
