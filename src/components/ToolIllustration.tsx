import type { ReactNode } from 'react';

/**
 * Soft, object-style illustrations for the tool cards, the category cards, the hero and the upload prompt: a photo print, a sheet of paper, a notepad,
 * a tag or a box, with one small second object (a magnifier, an eraser, a clip) that says what the
 * tool does. Light comes from the top left, every object has a soft shadow, and the colours are
 * muted on purpose. Gradients live in one hidden <ToolIconDefs /> mounted once in the layout.
 */

export type Tone = 'image' | 'pdf' | 'data' | 'text' | 'security' | 'neutral';
type Pal = 'blue' | 'clay' | 'ochre' | 'sage' | 'slate' | 'taupe';

const PAL: Record<Pal, { hi: string; lo: string; ink: string }> = {
  blue: { hi: '#aec4de', lo: '#7d99bc', ink: '#47617f' },
  clay: { hi: '#e8b6a2', lo: '#cf8f76', ink: '#8f553f' },
  ochre: { hi: '#ead19a', lo: '#d2ad65', ink: '#8f6f2d' },
  sage: { hi: '#b6cdb4', lo: '#89a98b', ink: '#4f6e53' },
  slate: { hi: '#9ba7ba', lo: '#6a778d', ink: '#3b4659' },
  taupe: { hi: '#d0c0b4', lo: '#a99686', ink: '#6f5d50' },
};
const TONE_PAL: Record<Tone, Pal> = { image: 'blue', pdf: 'clay', data: 'ochre', text: 'sage', security: 'slate', neutral: 'taupe' };
/** Each tool gets its own muted colour; a tool not listed here falls back to its category's colour. */
const TOOL_PAL: Record<string, Pal> = {
  'image-compressor': 'blue', 'image-resizer': 'sage', 'image-converter': 'blue', 'image-cropper': 'ochre',
  'image-inspector': 'slate', 'image-requirements-checker': 'taupe', 'pdf-merge': 'clay', 'pdf-split': 'ochre',
  'json-formatter': 'ochre', 'csv-to-json': 'blue', 'text-cleaner': 'sage', 'file-checksum': 'slate', 'file-inspector': 'taupe',
  'cat-images': 'blue', 'cat-video': 'slate', 'cat-audio': 'clay', 'cat-pdf': 'clay', 'cat-documents': 'sage', 'cat-data': 'ochre',
  'cat-archives': 'taupe', 'cat-security': 'slate', 'cat-design': 'sage', 'cat-fonts': 'blue', 'cat-ebooks': 'ochre', 'cat-developer': 'slate',
  upload: 'blue',
};
const INK = '#0a1230';
const EDGE = { stroke: INK, strokeOpacity: 0.11, strokeWidth: 0.8 } as const;
const fill = (p: Pal) => `url(#ti-${p})`;

export function ToolIconDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="ti-blur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2" /></filter>
        <linearGradient id="ti-paper" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e6e9f0" /></linearGradient>
        <linearGradient id="ti-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6eef7" /><stop offset="1" stopColor="#c9d8e9" /></linearGradient>
        <linearGradient id="ti-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.7" /><stop offset="1" stopColor="#ffffff" stopOpacity="0.18" /></linearGradient>
        <linearGradient id="ti-eraser" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ecc2bb" /><stop offset="1" stopColor="#d49b92" /></linearGradient>
        {(Object.keys(PAL) as Pal[]).map((k) => (
          <linearGradient key={k} id={`ti-${k}`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor={PAL[k].hi} /><stop offset="1" stopColor={PAL[k].lo} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

/* ---------- primitives (drawn in a 72 x 72 box, shown cropped to 5 4 62 62) ---------- */

const place = (x: number, y: number, r = 0, s = 1) => `translate(${x} ${y}) rotate(${r}) scale(${s})`;

function Photo({ x, y, r = 0, s = 1, tint }: { x: number; y: number; r?: number; s?: number; tint: Pal }) {
  const hills = 'M3.5 28.5 15.5 14.5 23 22.5 30 15 42.5 28.5Z';
  return (
    <g transform={place(x, y, r, s)}>
      <rect x="1.5" y="3.5" width="46" height="38" rx="5" fill={INK} opacity="0.2" filter="url(#ti-blur)" />
      <rect width="46" height="38" rx="4" fill="url(#ti-paper)" {...EDGE} />
      <rect x="3.5" y="3.5" width="39" height="25" rx="2" fill="url(#ti-sky)" />
      <circle cx="14" cy="11" r="3.3" fill="#fff" opacity="0.92" />
      <path d={hills} fill={fill(tint)} />
      <path d="M23 22.5 30 15 42.5 28.5H28Z" fill={INK} opacity="0.08" />
    </g>
  );
}

const SHEET = 'M0 4a4 4 0 0 1 4-4h22l10 10v32a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4Z';
const FOLD = 'M26 0v6a4 4 0 0 0 4 4h6Z';
const Lines = ({ y, n, tone = '#ccd2dd' }: { y: number; n: number; tone?: string }) => (
  <>{Array.from({ length: n }, (_, i) => <rect key={i} x="6" y={y + i * 6} width={i === n - 1 ? 15 : 24} height="2.6" rx="1.3" fill={tone} />)}</>
);

function Sheet({ x, y, r = 0, s = 1, tint, label = true, lines = 3, children }: { x: number; y: number; r?: number; s?: number; tint: Pal; label?: boolean; lines?: number; children?: ReactNode }) {
  return (
    <g transform={place(x, y, r, s)}>
      <path d={SHEET} transform="translate(1.5 3.5)" fill={INK} opacity="0.2" filter="url(#ti-blur)" />
      <path d={SHEET} fill="url(#ti-paper)" {...EDGE} />
      <path d={FOLD} fill="#d8dde6" />
      {label && <rect x="6" y="7" width="13" height="6" rx="2" fill={fill(tint)} />}
      {lines > 0 && <Lines y={label ? 19 : 14} n={lines} />}
      {children}
    </g>
  );
}

function TableSheet({ x, y, r = 0, tint }: { x: number; y: number; r?: number; tint: Pal }) {
  return (
    <Sheet x={x} y={y} r={r} tint={tint} label={false} lines={0}>
      <rect x="5" y="15" width="26" height="7" rx="1.8" fill={fill(tint)} />
      {[27, 33, 39].map((yy) => <rect key={yy} x="5" y={yy} width="26" height="1.3" rx="0.6" fill="#d3d8e2" />)}
      <rect x="17.4" y="15" width="1.3" height="27" fill="#d3d8e2" opacity="0.9" />
    </Sheet>
  );
}

function Notepad({ x, y, r = 0, tint }: { x: number; y: number; r?: number; tint: Pal }) {
  const body = 'M0 5a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v37a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4Z';
  return (
    <g transform={place(x, y, r)}>
      <path d={body} transform="translate(1.5 3.5)" fill={INK} opacity="0.2" filter="url(#ti-blur)" />
      <path d={body} fill="url(#ti-paper)" {...EDGE} />
      <path d="M0 5a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v6H0Z" fill={fill(tint)} />
      {[8, 15, 22, 29].map((cx) => <circle key={cx} cx={cx} cy="3.4" r="2.1" fill={INK} opacity="0.5" />)}
      <Lines y={18} n={4} />
    </g>
  );
}

function Braces({ x, y, color, w = 3 }: { x: number; y: number; color: string; w?: number }) {
  const d = 'M7 0C2.5 0 3 2.5 3 5.5V8C3 10.5 2 11.4 0 12c2 .6 3 1.5 3 4v2.5C3 21.5 2.5 24 7 24';
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      <path d={d} transform="translate(24 0) scale(-1 1)" />
    </g>
  );
}

function Tag({ x, y, r = 0, tint }: { x: number; y: number; r?: number; tint: Pal }) {
  const body = 'M7 0h20a7 7 0 0 1 7 7v30a7 7 0 0 1-7 7H7a7 7 0 0 1-7-7V7a7 7 0 0 1 7-7Z';
  return (
    <g transform={place(x, y, r)}>
      <path d={body} transform="translate(1.5 3.5)" fill={INK} opacity="0.24" filter="url(#ti-blur)" />
      <path d="M17 7C10 -4 26 -9 33 -10" fill="none" stroke="#e7e1d6" strokeWidth="1.8" strokeLinecap="round" />
      <path d={body} fill={fill(tint)} />
      <path d="M7 0h20a7 7 0 0 1 7 7v3C26 6 12 5 0 9V7a7 7 0 0 1 7-7Z" fill="#fff" opacity="0.16" />
      <circle cx="17" cy="8" r="3" fill="#fff" opacity="0.92" />
      <circle cx="17" cy="8" r="3" fill="none" stroke={INK} strokeOpacity="0.25" strokeWidth="0.8" />
      <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.95">
        <path d="M13.2 20.5 11.8 38.5M23.2 20.5 21.8 38.5M8.2 25.5h19M7.4 33.5h19" />
      </g>
    </g>
  );
}

function Box({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="3" y="30" width="40" height="22" rx="5" fill={INK} opacity="0.24" filter="url(#ti-blur)" />
      <g transform="rotate(-5 14 14)"><rect x="6" y="2" width="24" height="24" rx="2.5" fill="url(#ti-paper)" {...EDGE} /><rect x="10" y="8" width="14" height="2.4" rx="1.2" fill="#ccd2dd" /><rect x="10" y="13" width="10" height="2.4" rx="1.2" fill="#ccd2dd" /></g>
      <g transform="rotate(5 30 12)"><rect x="16" y="0" width="24" height="24" rx="2.5" fill="#f4f5f8" {...EDGE} /><rect x="20" y="6" width="15" height="2.4" rx="1.2" fill="#d3d8e2" /></g>
      <path d="M2 18h40v24a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z" fill={fill('taupe')} />
      <rect x="0" y="14" width="44" height="9" rx="3.2" fill={PAL.taupe.hi} {...EDGE} />
      <rect x="0" y="14" width="44" height="3.5" rx="1.7" fill="#fff" opacity="0.28" />
      <rect x="14" y="29" width="16" height="5.5" rx="2.7" fill={INK} opacity="0.34" />
      <rect x="14" y="34.5" width="16" height="1" rx="0.5" fill="#fff" opacity="0.35" />
    </g>
  );
}

function Magnifier({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="1.5" cy="3.5" r="10" fill={INK} opacity="0.22" filter="url(#ti-blur)" />
      <path d="M7 7 15 15" stroke={PAL.slate.lo} strokeWidth="5" strokeLinecap="round" />
      <path d="M7 7 15 15" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.2" strokeLinecap="round" transform="translate(-0.8 -0.8)" />
      <circle r="9.2" fill="url(#ti-glass)" stroke={PAL.slate.ink} strokeWidth="3" />
      <path d="M-5.5-2.5A6 6 0 0 1-2.5-5.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
    </g>
  );
}

function Clip({ x, y, r = 0 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={place(x, y, r)} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15V5a4 4 0 0 1 8 0v15a6 6 0 0 1-12 0V8" stroke={INK} strokeOpacity="0.18" strokeWidth="3" transform="translate(1 1.5)" />
      <path d="M4 15V5a4 4 0 0 1 8 0v15a6 6 0 0 1-12 0V8" stroke={PAL.slate.lo} strokeWidth="2.4" />
    </g>
  );
}

function Eraser({ x, y, r = 0 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={place(x, y, r)}>
      <rect x="1" y="3" width="26" height="13" rx="3.5" fill={INK} opacity="0.22" filter="url(#ti-blur)" />
      <rect width="26" height="13" rx="3.5" fill="url(#ti-eraser)" {...EDGE} />
      <path d="M17 0h6.5A3.5 3.5 0 0 1 27 3.5v6a3.5 3.5 0 0 1-3.5 3.5H17Z" fill={PAL.slate.lo} />
      <rect x="2" y="1.4" width="14" height="2" rx="1" fill="#fff" opacity="0.35" />
    </g>
  );
}

function CheckBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="1.5" cy="3" r="9.5" fill={INK} opacity="0.22" filter="url(#ti-blur)" />
      <circle r="9.5" fill={fill('sage')} {...EDGE} />
      <path d="M-4.2 0.4-1.2 3.6 4.6-2.8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function SwapBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="1.2" cy="2.6" r="8.5" fill={INK} opacity="0.2" filter="url(#ti-blur)" />
      <circle r="8.5" fill="url(#ti-paper)" {...EDGE} />
      <g fill="none" stroke={PAL.slate.ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-4.2-2.6H4M1.6-5 4-2.6 1.6-.2M4.2 2.6H-4M-1.6 0-4 2.6-1.6 5" />
      </g>
    </g>
  );
}

function Chip({ x, y, r = 0, tint }: { x: number; y: number; r?: number; tint: Pal }) {
  return (
    <g transform={place(x, y, r)}>
      <rect x="1.5" y="3.5" width="28" height="22" rx="5" fill={INK} opacity="0.24" filter="url(#ti-blur)" />
      <rect width="28" height="22" rx="5" fill={fill(tint)} {...EDGE} />
      <rect width="28" height="8" rx="4" fill="#fff" opacity="0.16" />
      <g transform="translate(5.5 4.5) scale(0.7)"><Braces x={0} y={0} color="#fff" w={3.2} /></g>
    </g>
  );
}


function Clapper({ tint }: { tint: Pal }) {
  return (
    <g>
      <rect x="15.5" y="33.5" width="44" height="28" rx="5" fill={INK} opacity="0.24" filter="url(#ti-blur)" />
      <rect x="14" y="30" width="44" height="28" rx="4.5" fill={fill(tint)} {...EDGE} />
      <path d="M31 38.5 43 44.5 31 50.5Z" fill="#fff" opacity="0.92" />
      <g transform="rotate(-12 14 30)">
        <rect x="14" y="19" width="44" height="10" rx="3" fill="url(#ti-paper)" {...EDGE} />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${18 + i * 9} 19h5l-4 10h-5Z`} fill={PAL[tint].ink} opacity="0.75" />)}
      </g>
    </g>
  );
}

function Disc({ tint }: { tint: Pal }) {
  return (
    <g>
      <g transform="rotate(-8 30 30)">
        <rect x="14.5" y="18.5" width="40" height="40" rx="4" fill={INK} opacity="0.2" filter="url(#ti-blur)" />
        <rect x="13" y="15" width="40" height="40" rx="4" fill="url(#ti-paper)" {...EDGE} />
        <rect x="18" y="21" width="16" height="3" rx="1.5" fill="#ccd2dd" />
        <rect x="18" y="27" width="10" height="3" rx="1.5" fill="#ccd2dd" />
      </g>
      <circle cx="46.5" cy="45" r="19" fill={INK} opacity="0.28" filter="url(#ti-blur)" />
      <circle cx="45" cy="42" r="19" fill="#3a4559" />
      {[15, 11.5].map((r) => <circle key={r} cx="45" cy="42" r={r} fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="0.8" />)}
      <path d="M33 33a16 16 0 0 1 12-6" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" />
      <circle cx="45" cy="42" r="7" fill={fill(tint)} />
      <circle cx="45" cy="42" r="1.8" fill="#f4f5f8" />
    </g>
  );
}

function Lock({ tint }: { tint: Pal }) {
  return (
    <g>
      <rect x="20.5" y="36.5" width="36" height="28" rx="7" fill={INK} opacity="0.26" filter="url(#ti-blur)" />
      <path d="M28 35V27a9 9 0 0 1 18 0v8" fill="none" stroke="#c5ccd8" strokeWidth="5" strokeLinecap="round" />
      <path d="M28 35V27a9 9 0 0 1 18 0" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" transform="translate(-1 -1)" />
      <rect x="19" y="33" width="36" height="28" rx="7" fill={fill(tint)} {...EDGE} />
      <rect x="19" y="33" width="36" height="10" rx="5" fill="#fff" opacity="0.14" />
      <circle cx="37" cy="45" r="3.6" fill="#fff" opacity="0.92" />
      <path d="M37 47v6" stroke="#fff" strokeOpacity="0.92" strokeWidth="3.2" strokeLinecap="round" />
    </g>
  );
}

function PaletteObj() {
  const d = 'M36 11C20 11 9 23 9 36c0 14 12 24 25 24 6 0 6-6 3-9-3-4 1-9 7-9h8c6 0 10-4 10-10C62 21 52 11 36 11Z';
  return (
    <g>
      <path d={d} transform="translate(1.5 3.5)" fill={INK} opacity="0.2" filter="url(#ti-blur)" />
      <path d={d} fill="url(#ti-paper)" {...EDGE} />
      <circle cx="25" cy="29" r="4.2" fill={fill('blue')} />
      <circle cx="36" cy="21.5" r="4.2" fill={fill('clay')} />
      <circle cx="48.5" cy="24" r="4.2" fill={fill('ochre')} />
      <circle cx="53" cy="35" r="4.2" fill={fill('sage')} />
      <circle cx="27" cy="46" r="4.4" fill="#dfe3ec" />
    </g>
  );
}

function FontCard({ tint }: { tint: Pal }) {
  return (
    <g transform="rotate(-5 36 36)">
      <rect x="16.5" y="16.5" width="42" height="46" rx="5" fill={INK} opacity="0.2" filter="url(#ti-blur)" />
      <rect x="15" y="13" width="42" height="46" rx="5" fill="url(#ti-paper)" {...EDGE} />
      <text x="36" y="42" textAnchor="middle" fontSize="25" fontWeight="800" fill={PAL[tint].lo}>Aa</text>
      <rect x="22" y="48" width="28" height="2.6" rx="1.3" fill="#ccd2dd" />
    </g>
  );
}

function BookObj({ tint }: { tint: Pal }) {
  return (
    <g transform="translate(0 -3)">
      <ellipse cx="37" cy="61" rx="28" ry="4" fill={INK} opacity="0.22" filter="url(#ti-blur)" />
      <path d="M4 23V58c12-3 23-3 32 1 9-4 20-4 32-1V23Z" fill={fill(tint)} {...EDGE} />
      <path d="M36 24C28 19 17 19 9 22V54c9-3 19-3 27 2Z" fill="url(#ti-paper)" {...EDGE} />
      <path d="M36 24c8-5 19-5 27-2V54c-9-3-19-3-27 2Z" fill="url(#ti-paper)" {...EDGE} />
      {[30, 36, 42].map((y) => <rect key={y} x="15" y={y} width="15" height="2.4" rx="1.2" fill="#ccd2dd" />)}
      {[30, 36, 42].map((y) => <rect key={`r${y}`} x="42" y={y} width="15" height="2.4" rx="1.2" fill="#ccd2dd" />)}
    </g>
  );
}

function CodeWindow({ tint }: { tint: Pal }) {
  return (
    <g>
      <rect x="10.5" y="17.5" width="54" height="44" rx="6" fill={INK} opacity="0.22" filter="url(#ti-blur)" />
      <rect x="9" y="14" width="54" height="44" rx="6" fill="url(#ti-paper)" {...EDGE} />
      <path d="M9 20a6 6 0 0 1 6-6h42a6 6 0 0 1 6 6v5H9Z" fill={fill(tint)} />
      <circle cx="16" cy="19.5" r="1.9" fill="#fff" opacity="0.9" /><circle cx="22" cy="19.5" r="1.9" fill="#fff" opacity="0.7" /><circle cx="28" cy="19.5" r="1.9" fill="#fff" opacity="0.5" />
      <path d="M26 35.5 19 42l7 6.5M46 35.5 53 42l-7 6.5M39.5 33.5 32.5 50.5" fill="none" stroke={PAL[tint].ink} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function UploadBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="1.5" cy="3" r="10.5" fill={INK} opacity="0.24" filter="url(#ti-blur)" />
      <circle r="10.5" fill={fill('blue')} {...EDGE} />
      <path d="M0 5V-5M-4.6-1 0-5.6 4.6-1" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/* ---------- one composition per tool, category and the upload prompt ---------- */

function Scene({ id, p }: { id: string; p: Pal }) {
  switch (id) {
    case 'image-compressor':
      return <><Photo x={7} y={12} r={-5} tint={p} /><Photo x={35} y={35} r={7} s={0.58} tint={p} /></>;
    case 'image-resizer':
      return (
        <>
          <Photo x={15.5} y={18} s={0.9} tint={p} />
          <rect x="9" y="11" width="54" height="46" rx="3" fill="none" stroke={PAL[p].ink} strokeOpacity="0.6" strokeWidth="1.2" strokeDasharray="3 3" />
          {[[9, 11], [63, 11], [9, 57], [63, 57]].map(([cx, cy]) => <rect key={`${cx}-${cy}`} x={cx! - 3.2} y={cy! - 3.2} width="6.4" height="6.4" rx="1.4" fill="#fff" stroke={PAL[p].ink} strokeOpacity="0.7" strokeWidth="1.1" />)}
        </>
      );
    case 'image-converter':
      return <><Photo x={4} y={11} r={-9} s={0.86} tint={p} /><Photo x={28} y={24} r={7} s={0.86} tint="clay" /><SwapBadge x={34} y={52} /></>;
    case 'image-cropper':
      return (
        <>
          <Photo x={12} y={16} tint={p} />
          <path d="M7 25V11h14M51 11h10v14M7 43v14h10M61 43v14H51" fill="none" stroke={PAL.slate.lo} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case 'image-inspector':
      return <><Photo x={7} y={12} r={-4} tint={p} /><Magnifier x={46} y={43} /></>;
    case 'image-requirements-checker':
      return <><Photo x={7} y={12} r={-4} tint={p} /><CheckBadge x={53} y={51} /></>;
    case 'pdf-merge':
      return <><Sheet x={8} y={21} r={-9} tint={p} /><Sheet x={27} y={14} r={6} tint={p} /><Clip x={39} y={8} r={10} /></>;
    case 'pdf-split': {
      const left = 'M0 4a4 4 0 0 1 4-4h14v46H4a4 4 0 0 1-4-4Z';
      const right = 'M0 0h8l10 10v32a4 4 0 0 1-4 4H0Z';
      return (
        <>
          <g transform={place(11, 17, -7)}>
            <path d={left} transform="translate(1.5 3.5)" fill={INK} opacity="0.2" filter="url(#ti-blur)" />
            <path d={left} fill="url(#ti-paper)" {...EDGE} /><rect x="5" y="7" width="10" height="6" rx="2" fill={fill(p)} /><rect x="5" y="19" width="9" height="2.6" rx="1.3" fill="#ccd2dd" /><rect x="5" y="25" width="9" height="2.6" rx="1.3" fill="#ccd2dd" />
          </g>
          <g transform={place(37, 20, 6)}>
            <path d={right} transform="translate(1.5 3.5)" fill={INK} opacity="0.2" filter="url(#ti-blur)" />
            <path d={right} fill="url(#ti-paper)" {...EDGE} /><path d="M8 0v6a4 4 0 0 0 4 4h6Z" fill="#d8dde6" /><rect x="4" y="19" width="10" height="2.6" rx="1.3" fill="#ccd2dd" /><rect x="4" y="25" width="7" height="2.6" rx="1.3" fill="#ccd2dd" />
          </g>
        </>
      );
    }
    case 'json-formatter':
      return (
        <Sheet x={17} y={12} r={-3} tint={p} label={false} lines={0}>
          <Braces x={6} y={9} color={PAL[p].lo} w={3.4} />
          <rect x="6" y="38" width="24" height="2.6" rx="1.3" fill="#ccd2dd" />
        </Sheet>
      );
    case 'csv-to-json':
      return <><TableSheet x={8} y={13} r={-6} tint={p} /><Chip x={35} y={37} r={7} tint={p} /></>;
    case 'text-cleaner':
      return <><Notepad x={12} y={10} r={-4} tint={p} /><Eraser x={39} y={44} r={-26} /></>;
    case 'file-checksum':
      return <Tag x={19} y={16} r={8} tint={p} />;
    case 'file-inspector':
      return <><Box x={12} y={13} /><Magnifier x={46} y={46} /></>;
    case 'upload':
      return <><Sheet x={16} y={12} r={-5} tint={p} lines={2} /><UploadBadge x={48} y={50} /></>;
    case 'cat-images':
      return <Photo x={11} y={14} r={-4} s={1.05} tint={p} />;
    case 'cat-pdf':
      return <Sheet x={17} y={11} r={-4} tint={p} />;
    case 'cat-documents':
      return <Notepad x={17} y={11} r={-4} tint={p} />;
    case 'cat-data':
      return <TableSheet x={17} y={11} r={-4} tint={p} />;
    case 'cat-archives':
      return <Box x={14} y={15} />;
    case 'cat-security':
      return <Lock tint={p} />;
    case 'cat-video':
      return <Clapper tint={p} />;
    case 'cat-audio':
      return <Disc tint={p} />;
    case 'cat-design':
      return <PaletteObj />;
    case 'cat-fonts':
      return <FontCard tint={p} />;
    case 'cat-ebooks':
      return <BookObj tint={p} />;
    case 'cat-developer':
      return <CodeWindow tint={p} />;
    default:
      return <Sheet x={18} y={13} r={-3} tint={p} />;
  }
}

export function ToolIllustration({ id, tone = 'neutral', className = 'tool-illo' }: { id: string; tone?: Tone; className?: string }) {
  return (
    <svg className={className} viewBox="5 4 62 62" aria-hidden="true" focusable="false">
      <Scene id={id} p={TOOL_PAL[id] ?? TONE_PAL[tone]} />
    </svg>
  );
}
