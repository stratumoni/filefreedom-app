export interface CleanOptions {
  trimLines: boolean;
  collapseSpaces: boolean;
  blankLines: 'keep' | 'collapse' | 'remove';
  removeDuplicates: boolean;
  duplicatesIgnoreCase: boolean;
  sort: 'none' | 'az' | 'za' | 'natural' | 'length';
  caseMode: 'none' | 'upper' | 'lower' | 'title' | 'sentence';
  straightenQuotes: boolean;
  removeInvisible: boolean;
  lineEnding: 'lf' | 'crlf';
}

export const DEFAULT_CLEAN: CleanOptions = {
  trimLines: true, collapseSpaces: true, blankLines: 'collapse', removeDuplicates: false, duplicatesIgnoreCase: false,
  sort: 'none', caseMode: 'none', straightenQuotes: false, removeInvisible: true, lineEnding: 'lf',
};

const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;

function applyCase(s: string, mode: CleanOptions['caseMode']): string {
  switch (mode) {
    case 'upper': return s.toUpperCase();
    case 'lower': return s.toLowerCase();
    case 'title': return s.toLowerCase().replace(/(^|[\s\-(["'\u2018\u201C])(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase());
    case 'sentence': return s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase());
    default: return s;
  }
}

export function cleanText(input: string, o: CleanOptions): string {
  let t = input.replace(/\r\n?/g, '\n');
  if (o.removeInvisible) t = t.replace(INVISIBLE, '');
  if (o.straightenQuotes) t = t.replace(/[\u2018\u2019\u201A\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u2033]/g, '"');
  let lines = t.split('\n');
  if (o.collapseSpaces) lines = lines.map((l) => l.replace(/[ \t\u00A0]{2,}/g, ' '));
  if (o.trimLines) lines = lines.map((l) => l.replace(/^[ \t\u00A0]+|[ \t\u00A0]+$/g, ''));
  if (o.caseMode !== 'none') lines = o.caseMode === 'sentence' ? applyCase(lines.join('\n'), 'sentence').split('\n') : lines.map((l) => applyCase(l, o.caseMode));
  if (o.removeDuplicates) {
    const seen = new Set<string>();
    lines = lines.filter((l) => {
      if (l.trim() === '') return true; // blank lines are handled below, not by deduplication
      const k = o.duplicatesIgnoreCase ? l.toLowerCase() : l;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  if (o.sort !== 'none') {
    const nonBlank = lines.filter((l) => l.trim() !== '');
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    nonBlank.sort(
      o.sort === 'az' ? (a, b) => (a < b ? -1 : a > b ? 1 : 0)
        : o.sort === 'za' ? (a, b) => (a < b ? 1 : a > b ? -1 : 0)
          : o.sort === 'natural' ? (a, b) => collator.compare(a, b)
            : (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0),
    );
    lines = nonBlank; // sorting drops blank lines: their position has no meaning once reordered
  }
  if (o.blankLines === 'remove') lines = lines.filter((l) => l.trim() !== '');
  else if (o.blankLines === 'collapse') {
    const out: string[] = [];
    for (const l of lines) if (!(l.trim() === '' && out.length > 0 && out[out.length - 1]!.trim() === '')) out.push(l);
    lines = out;
    while (lines.length && lines[0]!.trim() === '') lines.shift();
    while (lines.length && lines[lines.length - 1]!.trim() === '') lines.pop();
  }
  return lines.join(o.lineEnding === 'crlf' ? '\r\n' : '\n');
}

export function textStats(s: string) {
  const trimmed = s.trim();
  return {
    characters: [...s].length,
    words: trimmed === '' ? 0 : trimmed.split(/\s+/).length,
    lines: s === '' ? 0 : s.split(/\r\n|\r|\n/).length,
  };
}
