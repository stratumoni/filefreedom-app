/**
 * The 404 illustration: a big sheet of paper stamped "404", a faded sheet behind it, a dashed outline where the
 * missing page should be, and a magnifier hunting for it. Same soft-object language as the tool illustrations
 * (paper gradient, top-left light, blurred ink shadows); the gradients and the blur filter come from the
 * hidden <ToolIconDefs /> in the layout. Purely decorative (aria-hidden).
 */

const INK = '#0a1230';
const SHEET = 'M0 4a4 4 0 0 1 4-4h22l10 10v32a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4Z';
const FOLD = 'M26 0v6a4 4 0 0 0 4 4h6Z';
/** Everything below is drawn in the 36 x 46 sheet box and scaled up, so strokes are thinner than on the small tool icons. */
const EDGE = { stroke: INK, strokeOpacity: 0.11, strokeWidth: 0.3 } as const;

function Lines({ y, n }: { y: number; n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x="6" y={y + i * 6} width={i === n - 1 ? 15 : 24} height="2.6" rx="1.3" fill="#ccd2dd" />
      ))}
    </>
  );
}

export function NotFoundArt({ className = 'nf-art' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 360 280" aria-hidden="true" focusable="false">
      {/* ground shadow */}
      <ellipse cx="180" cy="256" rx="118" ry="11" fill={INK} opacity="0.13" filter="url(#ti-blur)" />

      {/* the missing page: only an outline is left */}
      <g transform="translate(206 40) rotate(9) scale(4.2)">
        <path className="nf-ghost" d={SHEET} />
        <path className="nf-ghost" d={FOLD} />
      </g>

      {/* a sheet behind, tilted the other way */}
      <g transform="translate(34 58) rotate(-13) scale(4.2)">
        <path d={SHEET} transform="translate(1.5 3.5)" fill={INK} opacity="0.18" filter="url(#ti-blur)" />
        <path d={SHEET} fill="url(#ti-paper)" {...EDGE} />
        <path d={FOLD} fill="#d8dde6" />
        <rect x="6" y="7" width="13" height="6" rx="2" fill="url(#ti-clay)" />
        <Lines y={19} n={3} />
      </g>

      {/* the main sheet */}
      <g transform="translate(96 26) rotate(-4) scale(4.6)">
        <path d={SHEET} transform="translate(1.5 3.5)" fill={INK} opacity="0.2" filter="url(#ti-blur)" />
        <path d={SHEET} fill="url(#ti-paper)" {...EDGE} />
        <path d={FOLD} fill="#d8dde6" />
        <rect x="6" y="6" width="11" height="5" rx="2.5" fill="url(#ti-blue)" />
        <text className="nf-num" x="18" y="29.5" textAnchor="middle" fontSize="13" fill={INK}>404</text>
        <Lines y={34} n={2} />
      </g>

      {/* the magnifier, swaying a little as it searches */}
      <g transform="translate(258 198) scale(4.2)">
        <g className="nf-lens">
          <circle cx="1.5" cy="3.5" r="10" fill={INK} opacity="0.22" filter="url(#ti-blur)" />
          <path d="M7 7 15 15" stroke="#6a778d" strokeWidth="5" strokeLinecap="round" />
          <path d="M7 7 15 15" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.2" strokeLinecap="round" transform="translate(-0.8 -0.8)" />
          <circle r="9.2" fill="url(#ti-glass)" stroke="#3b4659" strokeWidth="3" />
          <path d="M-5.5-2.5A6 6 0 0 1-2.5-5.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
          <g transform="translate(-5.4 -5.4) scale(0.45)" fill="none" stroke="#3b4659" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </g>
        </g>
      </g>
    </svg>
  );
}
