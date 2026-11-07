import type { CSSProperties } from 'react';
import { ToolIllustration, type Tone } from './ToolIllustration';

/**
 * The objects scattered around the home headline: the same soft illustrations the tool cards use,
 * so the hero and the tool list read as one design. Purely decorative (aria-hidden).
 * Positions live in pages.css (.st-a to .st-f), sized by the hero's own width via a container query.
 */
const OBJECTS: { cls: string; id: string; tone: Tone }[] = [
  { cls: 'st-a', id: 'image-compressor', tone: 'image' },
  { cls: 'st-b', id: 'pdf-merge', tone: 'pdf' },
  { cls: 'st-c', id: 'text-cleaner', tone: 'text' },
  { cls: 'st-d', id: 'csv-to-json', tone: 'data' },
  { cls: 'st-e', id: 'json-formatter', tone: 'data' },
  { cls: 'st-f', id: 'file-checksum', tone: 'security' },
];

export function HeroStickers() {
  return (
    <div className="stickers" aria-hidden="true">
      {OBJECTS.map((o, i) => (
        <span key={o.cls} className={`sticker ${o.cls}`} style={{ '--i': i } as CSSProperties}>
          <ToolIllustration id={o.id} tone={o.tone} className="sticker-art" />
        </span>
      ))}
    </div>
  );
}
