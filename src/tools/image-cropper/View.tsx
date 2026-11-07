import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Seg } from '@/components/ui';
import { useObjectUrl } from '@/components/ui';
import type { OutType, Rect } from '../_shared/imageEngine';
import { ImageSource, OutputFormat, QualitySlider, RenderStatus, ResultView, kindToType, outName, useOutputTypes, useRender, useSource, type Source } from '../_shared/imageUi';
import { clampRect, fitRatio, moveRect, parseRatio, resizeFromCorner, setSize, type Corner } from './geometry';

type RatioKey = 'free' | '1:1' | '4:3' | '3:2' | '16:9' | 'original';
const RATIOS: RatioKey[] = ['free', '1:1', '4:3', '3:2', '16:9', 'original'];

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
  const url = useObjectUrl(source.picked.file);
  const img = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const bounds = { width: source.width, height: source.height };
  const [ratioKey, setRatioKey] = useState<RatioKey>(() => (RATIOS.includes(params.get('ratio') as RatioKey) ? (params.get('ratio') as RatioKey) : 'free'));
  const ratioOf = (k: RatioKey) => (k === 'free' ? null : k === 'original' ? source.width / source.height : parseRatio(k));
  const [rect, setRect] = useState<Rect>(() => { const v = ratioOf(ratioKey); return v ? fitRatio(bounds, v) : { x: 0, y: 0, width: source.width, height: source.height }; });
  const [choice, setChoice] = useState<OutType | null>(null);
  const [quality, setQuality] = useState(0.92);
  const drag = useRef<{ mode: 'move' | Corner; sx: number; sy: number; start: Rect } | null>(null);
  const ratio = ratioOf(ratioKey);

  useEffect(() => {
    const el = img.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / source.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [source.width, url]);

  function chooseRatio(k: RatioKey) {
    setRatioKey(k);
    const v = ratioOf(k);
    if (v) setRect(fitRatio(bounds, v));
  }

  function down(e: PointerEvent, mode: 'move' | Corner) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, sx: e.clientX, sy: e.clientY, start: rect };
  }
  function moveP(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale;
    const dy = (e.clientY - d.sy) / scale;
    setRect(d.mode === 'move' ? moveRect(d.start, dx, dy, bounds) : resizeFromCorner(d.start, d.mode, dx, dy, bounds, ratio));
  }
  const up = () => { drag.current = null; };

  function keys(e: KeyboardEvent) {
    const step = e.shiftKey ? 10 : 1;
    const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const v = m[e.key];
    if (v) { e.preventDefault(); setRect((p) => moveRect(p, v[0], v[1], bounds)); }
  }

  const num = (field: 'x' | 'y' | 'width' | 'height', label: string) => (
    <div className="field">
      <label htmlFor={`c-${field}`}>{label}</label>
      <input id={`c-${field}`} className="input" type="number" inputMode="numeric" value={rect[field]}
        onChange={(e) => {
          const v = Math.round(Number(e.target.value));
          if (!Number.isFinite(v)) return;
          if (field === 'x' || field === 'y') setRect((p) => clampRect({ ...p, [field]: v }, bounds));
          else if (field === 'width') setRect((p) => setSize(p, v, ratio ? v / ratio : p.height, bounds));
          else setRect((p) => setSize(p, ratio ? v * ratio : p.width, v, bounds));
        }} />
    </div>
  );

  const t = choice ?? kindToType(source.picked.kind, allowed);
  const handle = (c: Corner) => ({ nw: { left: 0, top: 0 }, ne: { left: '100%', top: 0 }, sw: { left: 0, top: '100%' }, se: { left: '100%', top: '100%' } })[c];

  return (
    <>
      <div className="panel">
          <h2 className="panel-title">Choose the area to keep</h2>
          <div style={{ overflow: 'auto' }}>
            <div className="crop-stage">
              {url && <img ref={img} src={url} alt="The image being cropped" draggable={false} />}
              <div className="crop-box" role="group" tabIndex={0} aria-label={`Crop area, ${rect.width} by ${rect.height} pixels. Use the arrow keys to move it, or the number fields below to set its size.`}
                style={{ left: rect.x * scale, top: rect.y * scale, width: rect.width * scale, height: rect.height * scale }}
                onPointerDown={(e) => down(e, 'move')} onPointerMove={moveP} onPointerUp={up} onPointerCancel={up} onKeyDown={keys}>
                {(['nw', 'ne', 'sw', 'se'] as Corner[]).map((c) => (
                  <span key={c} className="crop-handle" style={{ ...handle(c), cursor: c === 'nw' || c === 'se' ? 'nwse-resize' : 'nesw-resize' }}
                    onPointerDown={(e) => down(e, c)} onPointerMove={moveP} onPointerUp={up} onPointerCancel={up} />
                ))}
              </div>
            </div>
          </div>
          <Seg<RatioKey> name="ratio" legend="Shape" value={ratioKey} onChange={chooseRatio}
            options={RATIOS.map((k) => ({ value: k, label: k === 'free' ? 'Free' : k === 'original' ? 'Original' : k }))} />
          <div className="row">{num('x', 'Left (px)')}{num('y', 'Top (px)')}{num('width', 'Width (px)')}{num('height', 'Height (px)')}</div>
          <OutputFormat value={t} onChange={setChoice} allowed={allowed} />
          <QualitySlider value={quality} onChange={setQuality} disabled={t === 'image/png'} />
          <div className="actions"><button type="button" className="btn btn-primary" disabled={r.status === 'working' || !allowed}
            onClick={() => void r.run({ file: source.picked.file, type: t, quality, background: '#ffffff', crop: rect })}>Crop image</button></div>
      </div>
      <RenderStatus r={r} workingLabel="Cropping…" />
      {r.result && r.status === 'done' && <ResultView original={source.picked.file} source={source} result={r.result} filename={outName(source.picked.file, '-cropped', t)} />}
    </>
  );
}
