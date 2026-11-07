import { describe, expect, it } from 'vitest';
import { search } from './search';

const ids = (q: string) => search(q).tools.map((h) => h.tool.id);

describe('search', () => {
  it('finds tools from natural task phrases', () => {
    expect(ids('make photo smaller').slice(0, 2)).toContain('image-compressor');
    expect(ids('under 2 MB').slice(0, 3)).toContain('image-compressor');
    expect(ids('CSV to JSON')[0]).toBe('csv-to-json');
    expect(ids('remove image metadata')).toContain('image-inspector');
    expect(ids('why is my image rejected')[0]).toBe('image-requirements-checker');
    expect(ids('why wont this file open')[0]).toBe('file-inspector');
  });
  it('matches extensions and tool names', () => {
    expect(ids('sha256')[0]).toBe('file-checksum');
    expect(ids('.png')).toEqual(expect.arrayContaining(['image-converter']));
    expect(ids('json')[0]).toBe('json-formatter');
  });
  it('tolerates misspellings', () => {
    expect(ids('compres imge')[0]).toBe('image-compressor');
    expect(ids('resise image')[0]).toBe('image-resizer');
    expect(ids('chekcsum')[0]).toBe('file-checksum');
  });
  it('never offers an unsupported tool as usable, and says what is missing', () => {
    const r = search('MP4 to GIF');
    expect(r.tools).toEqual([]);
    expect(r.unsupportedFormat).toBe('mp4');
    expect(r.planned.map((p) => p.planned.name)).toContain('Video to GIF');
  });
  it('finds the PDF tools, and lists unbuilt PDF tools separately as planned', () => {
    expect(ids('merge pdf')[0]).toBe('pdf-merge');
    expect(ids('extract pages from a pdf')[0]).toBe('pdf-split');
    const r = search('rotate pdf');
    expect(r.tools.map((h) => h.tool.id)).not.toContain('pdf-merge');
    expect(r.planned.map((p) => p.planned.name)).toContain('PDF rotate pages');
  });
  it('returns nothing for empty or stop-word-only queries', () => {
    expect(search('').tools).toEqual([]);
    expect(search('the to a').tools).toEqual([]);
  });
});
