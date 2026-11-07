import type { ArtKind } from '@/lib/uploadArt';

/**
 * The drop zone's artwork. Three pages sit in a stack; when a file is dragged over they fan out; once files are
 * dropped the stack gives way to a folder, and each file in turn drops into it with an animation that belongs to
 * its kind (a photo that develops, a page that turns, lines that type, a table that fills, braces that close, a
 * zipper that runs). Gradients come from the hidden <ToolIconDefs /> in the layout, so this matches the tool art.
 * Everything here is decoration: the words that matter are in the drop zone's own text.
 */

export type ArtPhase = 'idle' | 'over' | 'adding' | 'done';
type Pal = 'blue' | 'clay' | 'ochre' | 'sage' | 'slate' | 'taupe';

const INK = '#0a1230';
const EDGE = { stroke: INK, strokeOpacity: 0.11, strokeWidth: 0.8 } as const;
const PAL_INK: Record<Pal, string> = { blue: '#47617f', clay: '#8f553f', ochre: '#8f6f2d', sage: '#4f6e53', slate: '#3b4659', taupe: '#6f5d50' };

/** A sheet of paper whose bottom edge is at y = 0 and which is centred on x = 0. */
function Page({ w = 46, h = 58, lines = 3 }: { w?: number; h?: number; lines?: number }) {
  const x = -w / 2;
  const y = -h;
  return (
    <>
      <rect x={x + 1} y={y + 3} width={w} height={h} rx="5" fill={INK} opacity="0.18" filter="url(#ti-blur)" />
      <rect x={x} y={y} width={w} height={h} rx="5" fill="url(#ti-paper)" {...EDGE} />
      {Array.from({ length: lines }, (_, i) => (
        <rect key={i} x={x + 6} y={y + 8 + i * 7} width={i === lines - 1 ? w * 0.34 : w - 12} height="2.6" rx="1.3" fill="#ccd2dd" />
      ))}
    </>
  );
}

/* ---------- the stack that fans out ---------- */

function Stack() {
  return (
    <g className="ua-stack">
      <g transform="translate(80 100)">
        <g className="ua-pg ua-pg-l"><Page lines={4} /></g>
        <g className="ua-pg ua-pg-r"><Page lines={4} /></g>
        <g className="ua-pg ua-pg-f">
          <Page lines={3} />
          <circle className="ua-badge" cx="13" cy="-13" r="10" />
          <path className="ua-badge-arrow" d="M13 -8.5V-17.5M8.8 -13.2 13 -17.5l4.2 4.3" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </g>
  );
}

/* ---------- what drops into the folder, one animation per kind. Each is drawn centred on x = 0 with its bottom at y = 0. ---------- */

function ImageItem() {
  return (
    <g className="ua-item ua-image">
      <rect x="-22" y="-34" width="44" height="34" rx="4" fill="url(#ti-paper)" {...EDGE} />
      <rect x="-19" y="-31" width="38" height="22" rx="2" fill="url(#ti-sky)" />
      <circle cx="-10" cy="-24" r="3" fill="#fff" opacity="0.92" />
      <path d="M-19 -9 -9 -20 -4 -14 2 -21 19 -9Z" fill="url(#ti-blue)" />
      <rect className="ua-veil" x="-19" y="-31" width="38" height="22" rx="2" fill="#d5dbe7" />
      <rect className="ua-beam" x="-19" y="-31" width="38" height="2.4" rx="1.2" fill="#fff" />
    </g>
  );
}

function PdfItem() {
  return (
    <g className="ua-item ua-pdf">
      <g><Page w={34} h={34} lines={3} /></g>
      <g className="ua-flip">
        <rect x="-17" y="-34" width="34" height="34" rx="4" fill="url(#ti-paper)" {...EDGE} />
        <rect x="-17" y="-34" width="34" height="9" rx="4" fill="url(#ti-clay)" />
        <rect x="-11" y="-20" width="22" height="2.6" rx="1.3" fill="#ccd2dd" />
        <rect x="-11" y="-14" width="22" height="2.6" rx="1.3" fill="#ccd2dd" />
        <rect x="-11" y="-8" width="12" height="2.6" rx="1.3" fill="#ccd2dd" />
      </g>
    </g>
  );
}

function TextItem() {
  return (
    <g className="ua-item ua-text">
      <rect x="-17" y="-34" width="34" height="34" rx="4" fill="url(#ti-paper)" {...EDGE} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} className="ua-line" style={{ '--i': i } as React.CSSProperties} x="-12" y={-28 + i * 7} width={i === 3 ? 12 : 24} height="2.8" rx="1.4" fill="url(#ti-sage)" />
      ))}
      <rect className="ua-caret" x="1" y="-7" width="1.6" height="5" fill={PAL_INK.sage} />
    </g>
  );
}

function DataItem() {
  const cells = Array.from({ length: 16 }, (_, n) => ({ n, r: Math.floor(n / 4), c: n % 4 }));
  return (
    <g className="ua-item ua-data">
      <rect x="-20" y="-34" width="40" height="34" rx="4" fill="url(#ti-paper)" {...EDGE} />
      {cells.map(({ n, r, c }) => (
        <rect key={n} className={r === 0 ? 'ua-cell ua-cell-head' : 'ua-cell'} style={{ '--i': n } as React.CSSProperties} x={-16.5 + c * 8.5} y={-30 + r * 7.5} width="7" height="5.6" rx="1.2" />
      ))}
    </g>
  );
}

function JsonItem() {
  return (
    <g className="ua-item ua-json">
      <rect x="-20" y="-34" width="40" height="34" rx="4" fill="url(#ti-paper)" {...EDGE} />
      <path className="ua-brace ua-brace-l" d="M-8 -28q-4 0 -4 4v4q0 3 -3 3 3 0 3 3v4q0 4 4 4" fill="none" stroke={PAL_INK.slate} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path className="ua-brace ua-brace-r" d="M8 -28q4 0 4 4v4q0 3 3 3 -3 0 -3 3v4q0 4 -4 4" fill="none" stroke={PAL_INK.slate} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => (
        <rect key={i} className="ua-kv" style={{ '--i': i } as React.CSSProperties} x={-4.5} y={-24 + i * 7} width={i === 1 ? 9 : 7} height="2.8" rx="1.4" fill="url(#ti-slate)" />
      ))}
    </g>
  );
}

function ArchiveItem() {
  return (
    <g className="ua-item ua-archive">
      <rect x="-19" y="-34" width="38" height="34" rx="4" fill="url(#ti-taupe)" {...EDGE} />
      <rect x="-19" y="-34" width="38" height="7" rx="4" fill="#fff" opacity="0.28" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} className="ua-tooth" style={{ '--i': i } as React.CSSProperties} x={i % 2 ? -0.5 : -4.5} y={-26 + i * 4} width="5" height="2" rx="0.6" fill="#fff" />
      ))}
      <g className="ua-pull"><rect x="-3.5" y="-30" width="7" height="9" rx="2.2" fill="#fff" stroke={PAL_INK.taupe} strokeWidth="1" /><circle cx="0" cy="-23.6" r="1.4" fill={PAL_INK.taupe} /></g>
    </g>
  );
}

function GenericItem() {
  return (
    <g className="ua-item ua-generic">
      <Page w={34} h={34} lines={3} />
      <rect className="ua-shine" x="-14" y="-34" width="9" height="34" rx="3" fill="#fff" />
    </g>
  );
}

const ITEMS: Record<ArtKind, () => React.JSX.Element> = {
  image: ImageItem, pdf: PdfItem, text: TextItem, data: DataItem, json: JsonItem, archive: ArchiveItem, generic: GenericItem,
};

/* ---------- the folder ---------- */

/** The folder is always the brand blue: front panel top to bottom, and the darker back panel. */
const FOLDER = { f1: '#9fcbff', f2: '#2f6bff', b1: '#2f62ec', b2: '#1a45c2' };

function FolderDefs() {
  return (
    <defs>
      <linearGradient id="ua-front" x1="0" y1="0" x2="0.15" y2="1"><stop offset="0" stopColor={FOLDER.f1} /><stop offset="1" stopColor={FOLDER.f2} /></linearGradient>
      <linearGradient id="ua-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={FOLDER.b1} /><stop offset="1" stopColor={FOLDER.b2} /></linearGradient>
      <linearGradient id="ua-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.62" /><stop offset="1" stopColor="#fff" stopOpacity="0.04" /></linearGradient>
    </defs>
  );
}

function Folder({ phase, kind, cur }: { phase: ArtPhase; kind: ArtKind | undefined; cur: number }) {
  const Item = kind ? ITEMS[kind] : null;
  const finished = phase === 'done';
  return (
    <g className="ua-folder">
      <g transform="translate(80 104)">
        <g className="ua-folder-in">
          <ellipse cx="0" cy="3.5" rx="42" ry="4.5" fill={INK} opacity="0.2" filter="url(#ti-blur)" />
          {/* back panel with its tab */}
          <path d="M-44 -50a5 5 0 0 1 5 -5h22a5 5 0 0 1 3.6 1.5l4 4a5 5 0 0 0 3.6 1.5h44.8a5 5 0 0 1 5 5v38a5 5 0 0 1 -5 5h-78a5 5 0 0 1 -5 -5Z" fill="url(#ua-back)" />
          {/* paper edges peeking out of the folder */}
          <rect x="-35" y="-50" width="70" height="8" rx="2" fill="#fff" opacity="0.55" />
          <rect x="-39" y="-46" width="78" height="8" rx="2" fill="#fff" opacity="0.95" />
          {!finished && Item && <g key={`item-${cur}`} className="ua-drop"><Item /></g>}
          <g key={`front-${cur}`} className="ua-front">
            <rect x="-44" y="-40" width="88" height="40" rx="6" fill="url(#ua-front)" />
            <path d="M-44 -34a6 6 0 0 1 6 -6h76a6 6 0 0 1 6 6v15q-44 9 -88 0Z" fill="url(#ua-gloss)" />
            <rect x="-43.5" y="-39.5" width="87" height="39" rx="5.5" fill="none" stroke="#fff" strokeOpacity="0.55" />
            <rect x="-44" y="-40" width="88" height="40" rx="6" fill="none" stroke={INK} strokeOpacity="0.14" strokeWidth="0.8" />
          </g>
          {finished && (
            <g className="ua-ok" transform="translate(40 -50)">
              <circle r="9" className="ua-ok-ring" />
              <circle r="7.6" className="ua-ok-bg" />
              <path d="M-3.8 0.4 -1.1 3.1 3.9 -2.6" fill="none" className="ua-ok-fg" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
        </g>
      </g>
    </g>
  );
}

export function UploadArt({ phase, kinds, cur, stepMs }: { phase: ArtPhase; kinds: ArtKind[]; cur: number; stepMs: number }) {
  return (
    <svg className="ua" viewBox="0 0 160 120" data-phase={phase} style={{ '--ua-step': `${stepMs}ms` } as React.CSSProperties} aria-hidden="true" focusable="false">
      <FolderDefs />
      <Stack />
      <Folder phase={phase} kind={kinds[Math.min(cur, kinds.length - 1)]} cur={cur} />
    </svg>
  );
}
