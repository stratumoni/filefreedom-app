import type { Kind } from './sniff';

/** Which little animation a file gets while it is being added. Purely cosmetic: it never decides how a file is processed. */
export type ArtKind = 'image' | 'pdf' | 'text' | 'data' | 'json' | 'archive' | 'generic';

const ext = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');

const DATA_EXT = new Set(['csv', 'tsv', 'xls', 'xlsx', 'ods']);
const DOC_EXT = new Set(['doc', 'docx', 'odt', 'rtf']);

/**
 * The file's contents decide first (File names lie), the name only splits the broad kinds
 * that share the same bytes: plain text can be CSV or JSON, and Office files are ZIPs inside.
 */
export function artFor(kind: Kind, name: string): ArtKind {
  const e = ext(name);
  switch (kind) {
    case 'jpeg': case 'png': case 'gif': case 'webp': case 'bmp': case 'avif': case 'heic': case 'svg':
      return 'image';
    case 'pdf':
      return 'pdf';
    case 'zip':
      if (DATA_EXT.has(e)) return 'data';
      if (DOC_EXT.has(e)) return 'text';
      return 'archive';
    case 'gzip':
      return 'archive';
    case 'text':
      if (e === 'json' || e === 'jsonl' || e === 'geojson') return 'json';
      if (DATA_EXT.has(e)) return 'data';
      return 'text';
    default:
      return 'generic';
  }
}

/** Icon name (see Icon.tsx) for a file row. */
export const ART_ICON: Record<ArtKind, string> = {
  image: 'image', pdf: 'pdf', text: 'text', data: 'table', json: 'braces', archive: 'archive', generic: 'files',
};

export const ART_LABEL: Record<ArtKind, string> = {
  image: 'Image', pdf: 'PDF', text: 'Text', data: 'Table', json: 'JSON', archive: 'Archive', generic: 'File',
};

/**
 * How long each file's animation plays. One file gets a full, readable beat; a big batch is squeezed so the
 * whole intake never takes much longer than about three seconds. Zero when the visitor asked for reduced motion.
 */
export function stepMs(count: number, reducedMotion: boolean): number {
  if (reducedMotion || count <= 0) return 0;
  return Math.round(Math.min(800, Math.max(180, 2600 / count)));
}
