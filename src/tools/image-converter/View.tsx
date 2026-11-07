import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Notice } from '@/components/ui';
import type { OutType } from '../_shared/imageEngine';
import { ImageSource, OutputFormat, QualitySlider, RenderStatus, ResultView, outName, useOutputTypes, useRender, useSource, type Source } from '../_shared/imageUi';

const FROM_QUERY: Record<string, OutType> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };

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
  const [choice, setChoice] = useState<OutType>(FROM_QUERY[params.get('to') ?? ''] ?? 'image/webp');
  const [quality, setQuality] = useState(0.9);
  const [bg, setBg] = useState('#ffffff');
  const type: OutType = allowed && !allowed.includes(choice) ? 'image/jpeg' : choice;
  const k = source.picked.kind;
  const same = (k === 'jpeg' && type === 'image/jpeg') || (k === 'png' && type === 'image/png') || (k === 'webp' && type === 'image/webp') || (k === 'avif' && type === 'image/avif');

  return (
    <>
      <div className="panel">
        <h2 className="panel-title">Convert to</h2>
        <OutputFormat legend="Output format" value={type} onChange={setChoice} allowed={allowed} />
        {allowed && !allowed.includes('image/avif') && <p className="hint">AVIF is not offered because this browser cannot create it.</p>}
        {same && <Notice kind="info">This image is already in this format. Converting re-encodes it, which can slightly reduce quality and remove metadata.</Notice>}
        {type !== 'image/png' && <QualitySlider value={quality} onChange={setQuality} />}
        {type === 'image/jpeg' && (
          <div className="field"><label htmlFor="bg">Fill colour for transparent areas</label><input id="bg" type="color" value={bg} onChange={(e) => setBg(e.target.value)} style={{ minHeight: 'var(--touch)', width: '5rem' }} /><span className="hint">JPG can’t be transparent, so see-through areas get this colour.</span></div>
        )}
        <div className="actions"><button type="button" className="btn btn-primary" disabled={r.status === 'working' || !allowed} onClick={() => void r.run({ file: source.picked.file, type, quality, background: bg })}>Convert image</button></div>
      </div>
      <RenderStatus r={r} workingLabel="Converting…" />
      {r.result && r.status === 'done' && <ResultView original={source.picked.file} source={source} result={r.result} filename={outName(source.picked.file, '', type)} />}
    </>
  );
}
