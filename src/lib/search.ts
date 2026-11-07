import { PLANNED_TOOLS } from '@/registry/planned';
import { TOOLS } from '@/registry/tools';
import type { PlannedTool, ToolMeta } from '@/registry/types';

const STOP = new Set(['to', 'a', 'an', 'the', 'my', 'i', 'want', 'need', 'how', 'do', 'can', 'make', 'with', 'of', 'for', 'and', 'in', 'on', 'it', 'this', 'that', 'under', 'than', 'is', 'me', 'please', 'free', 'online', 'tool', 'tools']);

/** Everyday phrasing mapped to the words used in tool names and keywords. */
const SYNONYMS: Record<string, string[]> = {
  smaller: ['compress', 'reduce', 'resize'], shrink: ['compress', 'resize'], reduce: ['compress'], lighter: ['compress'], optimize: ['compress'], optimise: ['compress'],
  photo: ['image'], photos: ['image'], picture: ['image'], pictures: ['image'], pic: ['image'], jpeg: ['jpg'], img: ['image'],
  bigger: ['resize'], larger: ['resize'], scale: ['resize'], dimensions: ['resize', 'dimension'],
  combine: ['merge'], join: ['merge'], cut: ['crop', 'trim'], trim: ['crop'],
  hash: ['checksum'], sha: ['checksum'], verify: ['checksum'], beautify: ['format'], prettify: ['format'], lint: ['validate'],
  spreadsheet: ['csv'], excel: ['csv'], clean: ['cleaner'], tidy: ['cleaner'], dedupe: ['duplicate'],
  size: ['dimensions'], exif: ['metadata'], gps: ['metadata'],
};

/** Formats we know people search for that no available tool handles yet. */
const KNOWN_FORMATS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'heic', 'heif', 'epub', 'ttf', 'otf', 'woff', 'woff2', 'svg', 'zip', 'pdf', 'png', 'jpg', 'webp', 'gif', 'bmp', 'avif', 'csv', 'json', 'txt', 'tsv']);

export function tokenize(q: string): string[] {
  return q.toLowerCase().replace(/[^a-z0-9.\s-]/g, ' ').replace(/\./g, ' ').split(/[\s-]+/).filter(Boolean);
}

function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0]!;
    prev[0] = i;
    let rowMin = prev[0]!;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = tmp;
      rowMin = Math.min(rowMin, prev[j]!);
    }
    if (rowMin > max) return max + 1;
  }
  return prev[b.length]!;
}

/** 3 = exact, 2 = prefix, 1 = near miss (typo), 0 = no match */
function tokenMatch(q: string, target: string): 0 | 1 | 2 | 3 {
  if (q === target) return 3;
  if (q.length >= 2 && target.startsWith(q)) return 2;
  if (q.length >= 4) {
    const max = q.length >= 8 ? 2 : 1;
    if (distance(q, target, max) <= max) return 1;
  }
  return 0;
}

function bestMatch(q: string, words: string[]): 0 | 1 | 2 | 3 {
  let best: 0 | 1 | 2 | 3 = 0;
  for (const w of words) {
    const m = tokenMatch(q, w);
    if (m > best) best = m;
    if (best === 3) break;
  }
  return best;
}

export interface ToolHit { tool: ToolMeta; score: number }
export interface PlannedHit { planned: PlannedTool; score: number }
export interface SearchResult {
  tools: ToolHit[];
  planned: PlannedHit[];
  /** Set when the query names a format that no available tool supports. */
  unsupportedFormat?: string;
}

const NAME_W = [0, 6, 12, 22];
const KEY_W = [0, 3, 6, 10];

function scoreTool(tool: ToolMeta, qs: string[], whole: string): number {
  const nameWords = tokenize(tool.name);
  const keyPhrases = tool.keywords.map((k) => k.toLowerCase());
  const keyWords = keyPhrases.flatMap(tokenize);
  const formatWords = [...tool.inputFormats, ...tool.outputFormats].flatMap((f) => tokenize(f.replace('*', '')));
  const descWords = tokenize(tool.shortDescription);

  let score = 0;
  if (whole.length >= 3) {
    if (tool.name.toLowerCase().includes(whole)) score += 60;
    if (keyPhrases.some((k) => k === whole)) score += 70;
    else if (keyPhrases.some((k) => k.includes(whole) || (k.length >= 6 && whole.includes(k)))) score += 40;
  }
  const phraseScore = score;
  let matched = 0;
  for (const q of qs) {
    const syn = SYNONYMS[q] ?? [];
    const cands = [q, ...syn];
    let tokenScore = 0;
    for (const [i, c] of cands.entries()) {
      const k = i === 0 ? 1 : 0.6;
      tokenScore = Math.max(
        tokenScore,
        NAME_W[bestMatch(c, nameWords)]! * k,
        KEY_W[bestMatch(c, keyWords)]! * k,
        (bestMatch(c, formatWords) >= 2 ? 7 : 0) * k,
        (bestMatch(c, descWords) >= 2 ? 2 : 0) * k,
      );
    }
    if (tokenScore > 0) matched++;
    score += tokenScore;
  }
  // A tool that explains only half of a multi-word request is not an answer to it ("rotate pdf" is not "merge pdf").
  if (qs.length >= 2 && matched * 2 <= qs.length && phraseScore < 40) return 0;
  if (qs.length > 1 && matched === qs.length) score += 12;
  return score;
}

export function search(query: string): SearchResult {
  const whole = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const raw = tokenize(query);
  const qs = raw.filter((t) => !STOP.has(t));
  if (qs.length === 0) return { tools: [], planned: [] };

  const live = TOOLS.filter((t) => t.status === 'available' || t.status === 'beta');
  const unsupported = qs.find((t) => KNOWN_FORMATS.has(t) && !live.some((tool) => [...tool.inputFormats, ...tool.outputFormats].some((f) => tokenize(f.replace('*', '')).includes(t))));

  const tools = live
    .map((tool) => ({ tool, score: scoreTool(tool, qs, whole) }))
    // A format we cannot handle must not surface unrelated tools that merely mention a neighbouring format.
    .filter((h) => h.score >= 6 && !(unsupported && h.score < 40))
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));

  const planned = PLANNED_TOOLS.map((p) => {
    const nameWords = tokenize(p.name);
    let score = p.name.toLowerCase().includes(whole) && whole.length >= 3 ? 40 : 0;
    let matched = 0;
    for (const q of qs) {
      const cands = [q, ...(SYNONYMS[q] ?? [])];
      const s = Math.max(...cands.map((c, i) => NAME_W[bestMatch(c, nameWords)]! * (i === 0 ? 1 : 0.6)));
      if (s > 0) matched++;
      score += s;
    }
    if (qs.length > 1 && matched === qs.length) score += 12;
    return { planned: p, score };
  })
    .filter((h) => h.score >= 12)
    .sort((a, b) => b.score - a.score || a.planned.name.localeCompare(b.planned.name));

  return { tools, planned: planned.slice(0, 6), ...(unsupported ? { unsupportedFormat: unsupported } : {}) };
}

export const EXAMPLE_SEARCHES = ['Make a photo under 2 MB', 'CSV to JSON', 'Check a file\u2019s SHA-256', 'Resize an image', 'Why won\u2019t this file open?'];
