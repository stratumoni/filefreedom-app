import { useEffect, useState } from 'react';
import { Notice, Stat } from '@/components/ui';
import { aspectRatioLabel, formatBytes } from '@/lib/format';
import { KIND_INFO } from '@/lib/sniff';
import { ImageSource, useSource } from '../_shared/imageUi';
import { readImageFacts, type ImageFacts } from './meta';

const ORIENT: Record<number, string> = { 1: 'Normal', 2: 'Mirrored', 3: 'Rotated 180°', 4: 'Flipped vertically', 5: 'Mirrored and rotated', 6: 'Rotated 90° clockwise', 7: 'Mirrored and rotated', 8: 'Rotated 90° counter-clockwise' };

export default function View() {
  const { source, error, pick, reset } = useSource();
  const [read, setRead] = useState<{ id: number; facts: ImageFacts } | null>(null);

  useEffect(() => {
    if (!source) return;
    let live = true;
    void source.picked.file.slice(0, 50_000_000).arrayBuffer().then((b) => { if (live) setRead({ id: source.id, facts: readImageFacts(new Uint8Array(b), source.picked.kind) }); });
    return () => { live = false; };
  }, [source]);
  const facts = source && read?.id === source.id ? read.facts : null;

  const f = source?.picked.file;
  const ex = facts?.exif;
  return (
    <div className="tool-grid">
      <ImageSource source={source} error={error} onPick={pick} onReset={reset} />
      {source && f && (
        <div className="panel result-in" aria-live="polite">
          <h2 className="panel-title">About this image</h2>
          <dl className="stats">
            <Stat label="Format (from contents)" value={KIND_INFO[source.picked.kind].label.replace(' image', '')} small />
            <Stat label="Pixels" value={`${source.width} × ${source.height}`} small />
            <Stat label="Shape" value={aspectRatioLabel(source.width, source.height)} small />
            <Stat label="Megapixels" value={((source.width * source.height) / 1e6).toFixed(2)} small />
            <Stat label="File size" value={formatBytes(f.size)} small />
            <Stat label="Transparency" value={facts?.hasAlpha === null ? 'Unknown' : facts?.hasAlpha ? 'Yes' : 'No'} small />
            <Stat label="Animated" value={facts?.animated ? 'Yes' : 'No'} small />
            {facts?.dpi && <Stat label="Print resolution" value={`${facts.dpi.x} × ${facts.dpi.y} DPI`} small />}
          </dl>
          {facts?.extras.map((x) => <p key={x} className="hint">{x}</p>)}

          {ex?.hasGps && <Notice kind="warn" title="This photo contains location data.">Its metadata includes GPS coordinates, which anyone who receives the original file can read. To share the picture without that, run it through the Image compressor or converter: the results do not carry metadata over.</Notice>}
          {ex && !ex.hasGps && <Notice kind="info" title="Camera or software details are embedded.">No GPS location was found. Compressing or converting the image with FileFreedom removes this metadata.</Notice>}
          {facts && !ex && <Notice kind="ok">No camera or location metadata was found in this file.</Notice>}
          {facts && source.picked.kind !== 'jpeg' && source.picked.kind !== 'png' && source.picked.kind !== 'webp' && <Notice kind="info">Metadata details are read for JPEG, PNG and WebP only.</Notice>}

          {ex && (
            <details className="advanced" open>
              <summary>Embedded metadata</summary>
              <div>
                <dl className="stats">
                  {ex.make && <Stat label="Camera make" value={ex.make} small />}
                  {ex.model && <Stat label="Camera model" value={ex.model} small />}
                  {ex.dateTime && <Stat label="Date taken" value={ex.dateTime} small />}
                  {ex.software && <Stat label="Software" value={ex.software} small />}
                  {ex.orientation !== undefined && <Stat label="Orientation tag" value={ORIENT[ex.orientation] ?? String(ex.orientation)} small />}
                  <Stat label="GPS location" value={ex.hasGps ? 'Present' : 'None'} small />
                </dl>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
