import { useState } from 'react';
import { DropZone, type PickedFile } from '@/components/DropZone';
import { Notice, Stat } from '@/components/ui';
import { extOf, formatBytes } from '@/lib/format';
import { KIND_INFO, type Kind } from '@/lib/sniff';

const EXT_EXPECT: Record<string, Kind[]> = {
  jpg: ['jpeg'], jpeg: ['jpeg'], png: ['png'], gif: ['gif'], webp: ['webp'], bmp: ['bmp'], avif: ['avif'], heic: ['heic'], heif: ['heic'], pdf: ['pdf'],
  zip: ['zip'], docx: ['zip'], xlsx: ['zip'], pptx: ['zip'], epub: ['zip'], odt: ['zip'], jar: ['zip'], gz: ['gzip'], svg: ['svg'],
  txt: ['text'], csv: ['text'], json: ['text'], md: ['text'], xml: ['text', 'svg'], html: ['text'], css: ['text'], js: ['text'], log: ['text'], tsv: ['text'],
};

export default function View() {
  const [p, setP] = useState<PickedFile | null>(null);
  const ext = p ? extOf(p.file.name) : '';
  const expected = EXT_EXPECT[ext];
  const mismatch = p && expected && !expected.includes(p.kind) && p.kind !== 'unknown';

  return (
    <div className="tool-grid">
      <DropZone kinds={null} formatsLabel="Any file" maxBytes={4_000_000_000} onPick={(f) => setP(f[0]!)} hint="Only the first few KB are read" />
      {p && (
        <div className="panel result-in" aria-live="polite">
          <h2 className="panel-title">{p.file.name}</h2>
          <dl className="stats">
            <Stat label="Detected from contents" value={KIND_INFO[p.kind].label} small />
            <Stat label="Size" value={formatBytes(p.file.size)} />
            <Stat label="Name ends in" value={ext ? `.${ext}` : 'no extension'} small />
            <Stat label="Browser reports type" value={p.file.type || 'none'} small />
            <Stat label="Last modified" value={new Date(p.file.lastModified).toLocaleString()} small />
          </dl>
          {mismatch && <Notice kind="warn" title="The name and the contents disagree.">The file is called “.{ext}” but its contents are {KIND_INFO[p.kind].label}. Programs that trust the name may fail to open it. Renaming it to .{KIND_INFO[p.kind].ext} usually fixes that, but only if you trust where it came from.</Notice>}
          {!mismatch && p.kind !== 'unknown' && <Notice kind="ok">The contents match what the name says.</Notice>}
          {p.kind === 'unknown' && <Notice kind="info" title="Format not recognised.">FileFreedom identifies a limited set of common formats and will not guess beyond them. The file may be a format outside that set, or damaged.</Notice>}
          {p.kind === 'heic' && <Notice kind="info">HEIC photos can be opened by Apple devices and recent Windows versions, but most browsers cannot display them.</Notice>}
        </div>
      )}
    </div>
  );
}
