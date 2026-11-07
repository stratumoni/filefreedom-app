export type RangeResult = { ok: true; pages: number[] } | { ok: false; error: string };

export const MAX_OUTPUT_PAGES = 5000;

/**
 * Parse "1-3, 5, 8-" into zero-based page indexes, in the order typed (so "3,1" reorders and "2,2" repeats).
 * "8-" means page 8 to the last page.
 */
export function parsePageRanges(input: string, pageCount: number): RangeResult {
  const parts = input.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { ok: false, error: 'Enter at least one page, for example 1-3, 5.' };
  const pages: number[] = [];
  for (const part of parts) {
    const m = /^(\d+)\s*(?:(-|–)\s*(\d*))?$/.exec(part);
    if (!m) return { ok: false, error: `“${part}” is not a page or a range. Use numbers like 4 or 2-6, separated by commas.` };
    const from = Number(m[1]);
    const to = m[2] ? (m[3] === '' ? pageCount : Number(m[3])) : from;
    for (const n of [from, to]) {
      if (n < 1) return { ok: false, error: 'Page numbers start at 1.' };
      if (n > pageCount) return { ok: false, error: `Page ${n} does not exist. This PDF has ${pageCount} page${pageCount === 1 ? '' : 's'}.` };
    }
    if (to < from) return { ok: false, error: `“${part}” goes backwards. Write it as ${to}-${from}.` };
    for (let p = from; p <= to; p++) pages.push(p - 1);
    if (pages.length > MAX_OUTPUT_PAGES) return { ok: false, error: `That selects more than ${MAX_OUTPUT_PAGES} pages.` };
  }
  return { ok: true, pages };
}

/** Turn selected zero-based pages back into a compact range string like "1-3, 5". */
export function formatPageRanges(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    out.push(j > i ? `${sorted[i]! + 1}-${sorted[j]! + 1}` : String(sorted[i]! + 1));
    i = j + 1;
  }
  return out.join(', ');
}
