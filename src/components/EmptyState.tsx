import type { ReactNode } from 'react';

/**
 * Empty states: a faded "ghost" of what would be on the page, drawn as soft objects with placeholder bars.
 * Each subject has its own object: a starred card for favourites, a clock for recent tools, a magnifier over a page
 * for search, a browser window for 404, and one object per category (clapperboard, vinyl disc, padlock, open book...).
 * Everything is coloured by the theme tokens (see .ghost-* in components.css), so it follows light, dark and dim.
 */

export type PageArt = 'favorites' | 'recent' | 'search' | 'category' | 'notfound' | 'default';
export type CategoryArt = `cat-${string}`;
export type EmptyArt = PageArt | CategoryArt;

/* ---------- primitives (drawn in a 240 x 150 box) ---------- */

/** Rounded-rectangle path, so every shape can be drawn once and given a shadow. */
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}a${r} ${r} 0 0 1 ${r} ${r}V${y + h - r}a${r} ${r} 0 0 1 -${r} ${r}H${x + r}a${r} ${r} 0 0 1 -${r} -${r}V${y + r}a${r} ${r} 0 0 1 ${r} -${r}Z`;

/** A filled shape with its soft shadow underneath. */
function Shape({ d, cls = 'ghost-card', shadow = true }: { d: string; cls?: string; shadow?: boolean }) {
  return (
    <>
      {shadow && <path className="ghost-shadow" d={d} transform="translate(2 6)" filter="url(#ti-blur)" />}
      <path className={cls} d={d} />
    </>
  );
}

const Bar = ({ x, y, w, h = 7, soft = false }: { x: number; y: number; w: number; h?: number; soft?: boolean }) => (
  <rect className={soft ? 'ghost-bar soft' : 'ghost-bar'} x={x} y={y} width={w} height={h} rx={h / 2} />
);

const Line = ({ d, w = 6, cls = 'ghost-line' }: { d: string; w?: number; cls?: string }) => <path className={cls} d={d} style={{ strokeWidth: w }} />;

const at = (x: number, y: number, r = 0, cx = 0, cy = 0) => `translate(${x} ${y}) rotate(${r} ${cx} ${cy})`;

/** A tool-card-shaped placeholder: thumbnail, two text bars, a pill and a thin line. */
function Card({ x, y, w, h, r = 0, pill = true, thumb = true, dashed = false }: { x: number; y: number; w: number; h: number; r?: number; pill?: boolean; thumb?: boolean; dashed?: boolean }) {
  const pad = 10;
  const tw = thumb ? Math.round(h * 0.62) : 0;
  const bx = pad + (thumb ? tw + 9 : 0);
  const bw = w - bx - pad;
  const bh = Math.max(9, h * 0.2);
  return (
    <g transform={at(x, y, r, w / 2, h / 2)}>
      {dashed ? <rect className="ghost-slot" width={w} height={h} rx="8" /> : <Shape d={rr(0, 0, w, h, 8)} />}
      {!dashed && (
        <>
          {thumb && <rect className="ghost-block" x={pad} y={pad} width={tw} height={h - pad * 2} rx="4" />}
          <Bar x={bx} y={pad} w={bw * 0.78} h={bh} />
          <Bar x={bx} y={pad + bh + 6} w={bw} h={Math.max(9, h * 0.22)} />
          {pill && <Bar x={w - pad - 26} y={pad} w={26} h={7} soft />}
          <Bar x={bx} y={h - pad - 5} w={bw * 0.6} h={5} soft />
        </>
      )}
    </g>
  );
}

function PlusBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle className="ghost-shadow" cx="1.5" cy="4" r="15" filter="url(#ti-blur)" />
      <circle className="ghost-badge" r="15" />
      <Line d="M0 -6V6M-6 0H6" w={2} cls="ghost-glyph" />
    </g>
  );
}

/* ---------- objects ---------- */

const STAR = 'M0 -7 L2.06 -2.83 L6.66 -2.16 L3.33 1.08 L4.11 5.66 L0 3.5 L-4.11 5.66 L-3.33 1.08 L-6.66 -2.16 L-2.06 -2.83Z';

function PortraitCard({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={at(x, y, r, 31, 42)}>
      <Shape d={rr(0, 0, 62, 84, 8)} />
      <rect className="ghost-block" x="8" y="8" width="46" height="34" rx="4" />
      <Bar x={8} y={50} w={46} />
      <Bar x={8} y={63} w={30} h={6} soft />
    </g>
  );
}

function Photo({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={at(x, y, r, 56, 42)}>
      <Shape d={rr(0, 0, 112, 84, 8)} />
      <rect className="ghost-block" x="8" y="8" width="96" height="54" rx="4" />
      <circle className="ghost-bar" cx="28" cy="26" r="7" />
      <path className="ghost-bar" d="M8 58C8 60 10 62 12 62H100C102 62 104 60 104 58V54L76 34 56 50 38 34 8 58Z" />
      <Bar x={8} y={70} w={56} h={6} soft />
    </g>
  );
}

const SHEET = 'M0 8a8 8 0 0 1 8-8h50l26 26v76a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8Z';
const FOLD = 'M58 0v18a8 8 0 0 0 8 8h18Z';

function Scene({ art }: { art: EmptyArt }) {
  switch (art) {
    /* ----- pages ----- */
    case 'favorites':
      return (
        <>
          <PortraitCard x={34} y={24} r={-9} />
          <PortraitCard x={144} y={24} r={9} />
          <g transform="translate(85 8)">
            <Shape d={rr(0, 0, 70, 98, 8)} />
            <path className="ghost-solid" d={STAR} transform="translate(35 40) scale(3.6)" style={{ strokeWidth: 0.6 }} />
            <Bar x={14} y={78} w={42} />
            <Bar x={14} y={90} w={26} h={5} soft />
          </g>
        </>
      );
    case 'recent': {
      const ticks = Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return `M${(158 + Math.sin(a) * 35).toFixed(1)} ${(76 - Math.cos(a) * 35).toFixed(1)}L${(158 + Math.sin(a) * 40).toFixed(1)} ${(76 - Math.cos(a) * 40).toFixed(1)}`;
      }).join('');
      return (
        <>
          <Card x={8} y={20} w={112} h={48} r={-5} />
          <g opacity="0.7"><Card x={14} y={80} w={112} h={48} r={3} /></g>
          <circle className="ghost-shadow" cx="160" cy="82" r="50" filter="url(#ti-blur)" />
          <circle className="ghost-card" cx="158" cy="76" r="50" />
          <Line d={ticks} w={2.2} />
          <Line d="M158 76V47" w={4} />
          <Line d="M158 76L177 88" w={4} />
          <circle className="ghost-solid" cx="158" cy="76" r="4.5" />
        </>
      );
    }
    case 'search':
      return (
        <>
          <g transform={at(18, 16, -4, 59, 55)}>
            <Shape d={rr(0, 0, 118, 110, 8)} />
            <rect className="ghost-block" x="10" y="10" width="98" height="38" rx="4" />
            <Bar x={10} y={58} w={98} />
            <Bar x={10} y={72} w={70} />
            <Bar x={10} y={86} w={84} h={6} soft />
          </g>
          <path className="ghost-shadow" d="M172 96 204 128" style={{ strokeWidth: 14, strokeLinecap: 'round' }} transform="translate(2 5)" filter="url(#ti-blur)" />
          <Line d="M172 96 204 128" w={13} cls="ghost-handle" />
          <circle className="ghost-shadow" cx="152" cy="72" r="38" filter="url(#ti-blur)" />
          <circle className="ghost-lens" cx="150" cy="68" r="36" />
          <g transform="translate(150 68)">
            <Line d="M-8 -9a9 9 0 1 1 12.5 8C1 1 0 3 0 7" w={4.5} />
            <circle className="ghost-bar" cy="19" r="3" />
          </g>
        </>
      );
    case 'notfound':
      return (
        <>
          <Shape d={rr(34, 14, 172, 116, 10)} />
          <path className="ghost-block" d="M34 24a10 10 0 0 1 10-10h152a10 10 0 0 1 10 10v14H34Z" />
          {[48, 60, 72].map((cx) => <circle key={cx} className="ghost-bar" cx={cx} cy="26" r="3.4" />)}
          <rect className="ghost-bar soft" x="88" y="20" width="96" height="12" rx="6" />
          <text className="ghost-text" x="120" y="98" textAnchor="middle" fontSize="50">404</text>
          <Bar x={90} y={108} w={60} h={6} soft />
        </>
      );

    /* ----- categories: one object each ----- */
    case 'cat-images':
      return <><Photo x={20} y={10} r={-4} /><Photo x={102} y={52} r={5} /></>;
    case 'cat-video':
      return (
        <>
          <Shape d={rr(50, 54, 140, 78, 8)} />
          <g transform={at(50, 36, -8, 0, 18)}>
            <Shape d={rr(0, 0, 140, 22, 5)} />
            {[0, 1, 2, 3, 4].map((i) => <path key={i} className="ghost-bar" d={`M${14 + i * 26} 0h14l-10 22h-14Z`} />)}
          </g>
          <path className="ghost-solid" d="M108 78 138 94 108 110Z" />
          <Bar x={64} y={118} w={70} h={5} soft />
        </>
      );
    case 'cat-audio':
      return (
        <>
          <g transform={at(18, 24, -5, 52, 50)}>
            <Shape d={rr(0, 0, 104, 100, 8)} />
            {[14, 30, 20, 44, 26, 36, 16].map((h, i) => <rect key={i} className="ghost-bar" x={13 + i * 12} y={50 - h / 2} width="7" height={h} rx="3.5" />)}
            <Bar x={13} y={80} w={50} h={6} soft />
          </g>
          <circle className="ghost-shadow" cx="152" cy="84" r="50" filter="url(#ti-blur)" />
          <circle className="ghost-card" cx="150" cy="78" r="50" />
          <circle className="ghost-line" cx="150" cy="78" r="38" style={{ strokeWidth: 1.2 }} />
          <circle className="ghost-line" cx="150" cy="78" r="29" style={{ strokeWidth: 1.2 }} />
          <circle className="ghost-block" cx="150" cy="78" r="17" />
          <circle className="ghost-bar" cx="150" cy="78" r="3.4" />
          <Line d="M118 56A38 38 0 0 1 140 42" w={3} />
        </>
      );
    case 'cat-pdf':
      return (
        <>
          <g transform={at(104, 12, 7, 42, 55)}><Shape d={SHEET} /><path className="ghost-block" d={FOLD} /><Bar x={12} y={44} w={58} /><Bar x={12} y={58} w={40} /></g>
          <g transform={at(48, 22, -6, 42, 55)}>
            <Shape d={SHEET} />
            <path className="ghost-block" d={FOLD} />
            <rect className="ghost-bar" x="12" y="40" width="36" height="17" rx="8.5" />
            <Bar x={12} y={68} w={58} />
            <Bar x={12} y={82} w={58} />
            <Bar x={12} y={96} w={34} h={6} soft />
          </g>
        </>
      );
    case 'cat-documents':
      return (
        <>
          <g transform={at(62, 18, -4, 50, 60)}>
            <Shape d={rr(0, 0, 100, 112, 10)} />
            <path className="ghost-block" d="M0 10A10 10 0 0 1 10 0H90A10 10 0 0 1 100 10V24H0Z" />
            {[18, 34, 50, 66, 82].map((x) => <rect key={x} className="ghost-bar" x={x - 3} y="-6" width="6" height="16" rx="3" />)}
            {[40, 56, 72].map((y) => <Bar key={y} x={14} y={y} w={72} />)}
            <Bar x={14} y={88} w={44} h={6} soft />
          </g>
          <g transform={at(170, 84, 32)}><Shape d={rr(0, 0, 12, 44, 3)} /><path className="ghost-block" d="M0 44h12l-6 12Z" /></g>
        </>
      );
    case 'cat-data':
      return (
        <g transform={at(46, 16, -3, 74, 56)}>
          <Shape d={rr(0, 0, 148, 112, 10)} />
          <path className="ghost-block" d="M0 10A10 10 0 0 1 10 0H138A10 10 0 0 1 148 10V26H0Z" />
          {[26, 47, 68, 89].map((y) => <path key={y} className="ghost-grid" d={`M0 ${y}H148`} />)}
          {[49, 98].map((x) => <path key={x} className="ghost-grid" d={`M${x} 0V112`} />)}
          {[0, 1, 2].map((c) => <Bar key={c} x={9 + c * 49} y={9} w={30} h={8} />)}
          {[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => <Bar key={`${r}${c}`} x={9 + c * 49} y={33 + r * 21} w={(r + c) % 2 ? 22 : 30} h={6} soft={(r + c) % 2 === 1} />))}
        </g>
      );
    case 'cat-archives':
      return (
        <>
          <g transform={at(64, 12, -8, 23, 25)}><Shape d={rr(0, 0, 46, 50, 5)} /><Bar x={8} y={12} w={28} h={5} soft /><Bar x={8} y={24} w={20} h={5} soft /></g>
          <g transform={at(112, 4, 7, 26, 25)}><Shape d={rr(0, 0, 52, 52, 5)} /><Bar x={9} y={12} w={34} h={5} soft /><Bar x={9} y={24} w={22} h={5} soft /></g>
          <Shape d={rr(58, 62, 124, 70, 8)} />
          <Shape d={rr(50, 46, 140, 24, 7)} cls="ghost-block ghost-edge" />
          <rect className="ghost-bar" x="102" y="88" width="36" height="14" rx="7" />
        </>
      );
    case 'cat-security':
      return (
        <>
          <Card x={14} y={76} w={74} h={44} r={-6} thumb={false} pill={false} />
          <Card x={158} y={30} w={74} h={44} r={6} thumb={false} pill={false} />
          <path className="ghost-shadow" d="M92 62V50a28 28 0 0 1 56 0v12" style={{ strokeWidth: 12, strokeLinecap: 'round' }} transform="translate(2 6)" filter="url(#ti-blur)" />
          <Line d="M92 62V50a28 28 0 0 1 56 0v12" w={11} cls="ghost-handle" />
          <Shape d={rr(74, 58, 92, 72, 14)} />
          <circle className="ghost-block" cx="120" cy="86" r="9" />
          <rect className="ghost-block" x="116" y="90" width="8" height="22" rx="4" />
        </>
      );
    case 'cat-design':
      return (
        <g transform="translate(36 -10) scale(2.4)">
          <path className="ghost-shadow" d="M36 11C20 11 9 23 9 36c0 14 12 24 25 24 6 0 6-6 3-9-3-4 1-9 7-9h8c6 0 10-4 10-10C62 21 52 11 36 11Z" transform="translate(1 2.4)" filter="url(#ti-blur)" />
          <path className="ghost-card" style={{ strokeWidth: 0.5 }} d="M36 11C20 11 9 23 9 36c0 14 12 24 25 24 6 0 6-6 3-9-3-4 1-9 7-9h8c6 0 10-4 10-10C62 21 52 11 36 11Z" />
          <circle className="ghost-bar" cx="25" cy="29" r="4.2" />
          <circle className="ghost-solid" style={{ strokeWidth: 0.5 }} cx="36" cy="21.5" r="4.2" />
          <circle className="ghost-bar" cx="48.5" cy="24" r="4.2" />
          <circle className="ghost-solid" style={{ strokeWidth: 0.5 }} cx="53" cy="35" r="4.2" />
          <circle className="ghost-block" cx="27" cy="46" r="4.4" />
        </g>
      );
    case 'cat-fonts':
      return (
        <>
          <g transform={at(116, 30, 7, 48, 46)}><Shape d={rr(0, 0, 96, 92, 10)} /><text className="ghost-text" x="48" y="62" textAnchor="middle" fontSize="42">Bb</text></g>
          <g transform={at(32, 20, -5, 56, 54)}>
            <Shape d={rr(0, 0, 112, 108, 10)} />
            <text className="ghost-text" x="56" y="70" textAnchor="middle" fontSize="58">Aa</text>
            <Bar x={22} y={82} w={68} h={6} soft />
            <Bar x={32} y={94} w={48} h={6} soft />
          </g>
        </>
      );
    case 'cat-ebooks':
      return (
        <>
          <Shape d="M36 34V124C64 115 94 116 120 128 146 116 176 115 204 124V34Z" cls="ghost-cover" />
          <Shape d="M120 44C98 32 68 32 44 40V114C68 106 98 108 120 120Z" shadow={false} />
          <Shape d="M120 44C142 32 172 32 196 40V114C172 106 142 108 120 120Z" shadow={false} />
          {[56, 68, 80].map((y) => <Bar key={y} x={58} y={y} w={y === 80 ? 36 : 48} />)}
          {[56, 68, 80].map((y) => <Bar key={`r${y}`} x={134} y={y} w={y === 80 ? 36 : 48} />)}
          <rect className="ghost-block" x="58" y="94" width="30" height="8" rx="4" />
        </>
      );
    case 'cat-developer':
      return (
        <>
          <Shape d={rr(34, 20, 172, 110, 10)} />
          <path className="ghost-block" d="M34 30a10 10 0 0 1 10-10h152a10 10 0 0 1 10 10v12H34Z" />
          {[50, 62, 74].map((cx) => <circle key={cx} className="ghost-bar" cx={cx} cy="31" r="3.4" />)}
          <Line d="M94 64 74 86 94 108" w={7} />
          <Line d="M146 64 166 86 146 108" w={7} />
          <Line d="M129 60 111 112" w={7} />
        </>
      );

    /* ----- generic ----- */
    case 'category':
      return (<><Card x={54} y={6} w={146} h={58} r={-2} /><Card x={30} y={76} w={150} h={62} r={2} dashed /><PlusBadge x={178} y={122} /></>);
    default:
      return (<><Card x={52} y={10} w={132} h={58} r={-3} /><Card x={112} y={64} w={114} h={62} r={4} /><Card x={16} y={50} w={142} h={74} r={-4} /></>);
  }
}

export function EmptyIllustration({ art, className = 'empty-art' }: { art: EmptyArt; className?: string }) {
  return (
    <svg className={className} data-art={art} viewBox="0 0 240 150" aria-hidden="true" focusable="false">
      <Scene art={art} />
    </svg>
  );
}

/**
 * Centered illustration, a short title, one line of help and optional actions.
 * `heading` lets a page use it as its h1 (404) or as an h2 inside a page that already has one.
 */
export function EmptyState({ art, title, children, actions, heading = 'h2', compact = false }: {
  art: EmptyArt; title: string; children?: ReactNode; actions?: ReactNode; heading?: 'h1' | 'h2' | 'p'; compact?: boolean;
}) {
  const Title = heading;
  return (
    <div className={`empty-state${compact ? ' is-compact' : ''}`} role={heading === 'h1' || compact ? undefined : 'status'}>
      <EmptyIllustration art={art} />
      <Title className="empty-title">{title}</Title>
      {children && <div className="empty-body">{children}</div>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}
