import { describe, expect, it } from 'vitest';
import { artFor, stepMs } from './uploadArt';

describe('artFor', () => {
  it('uses the contents for images and PDFs, whatever the name says', () => {
    expect(artFor('jpeg', 'holiday.pdf')).toBe('image');
    expect(artFor('pdf', 'scan.jpg')).toBe('pdf');
    expect(artFor('svg', 'logo.svg')).toBe('image');
  });
  it('splits plain text by extension', () => {
    expect(artFor('text', 'rows.csv')).toBe('data');
    expect(artFor('text', 'ROWS.TSV')).toBe('data');
    expect(artFor('text', 'config.json')).toBe('json');
    expect(artFor('text', 'notes.txt')).toBe('text');
    expect(artFor('text', 'README')).toBe('text');
  });
  it('treats Office files (ZIP inside) by extension and other ZIPs as archives', () => {
    expect(artFor('zip', 'budget.xlsx')).toBe('data');
    expect(artFor('zip', 'letter.docx')).toBe('text');
    expect(artFor('zip', 'backup.zip')).toBe('archive');
    expect(artFor('gzip', 'logs.gz')).toBe('archive');
  });
  it('falls back to a generic file', () => {
    expect(artFor('unknown', 'mystery.bin')).toBe('generic');
  });
});

describe('stepMs', () => {
  it('is zero for reduced motion or nothing to add', () => {
    expect(stepMs(3, true)).toBe(0);
    expect(stepMs(0, false)).toBe(0);
  });
  it('gives one file a full beat and squeezes big batches', () => {
    expect(stepMs(1, false)).toBe(800);
    expect(stepMs(4, false)).toBe(650);
    expect(stepMs(100, false)).toBe(180);
  });
  it('keeps a 20-file batch near three seconds', () => {
    expect(stepMs(20, false) * 20).toBeLessThanOrEqual(3600);
  });
});
