import { describe, expect, it } from 'vitest';
import { DEFAULT_CLEAN, cleanText, textStats, type CleanOptions } from './logic';

const run = (s: string, o: Partial<CleanOptions> = {}) => cleanText(s, { ...DEFAULT_CLEAN, ...o });
const off: Partial<CleanOptions> = { trimLines: false, collapseSpaces: false, blankLines: 'keep', removeInvisible: false };

describe('cleanText', () => {
  it('trims lines, collapses spaces and blank lines by default', () => {
    expect(run('  a   b  \n\n\n\n c \n')).toBe('a b\n\nc');
  });
  it('removes all blank lines when asked', () => {
    expect(run('a\n\n  \nb', { blankLines: 'remove' })).toBe('a\nb');
  });
  it('removes zero-width characters but leaves normal text', () => {
    expect(run('a\u200Bb\uFEFFc')).toBe('abc');
    expect(run('a\u200Bb', { ...off })).toBe('a\u200Bb');
  });
  it('normalises line endings both ways', () => {
    expect(run('a\r\nb\rc', { ...off, lineEnding: 'lf' })).toBe('a\nb\nc');
    expect(run('a\nb', { ...off, lineEnding: 'crlf' })).toBe('a\r\nb');
  });
  it('removes duplicate lines, optionally ignoring case, keeping first occurrence', () => {
    expect(run('a\nb\na\nA', { ...off, removeDuplicates: true })).toBe('a\nb\nA');
    expect(run('a\nb\na\nA', { ...off, removeDuplicates: true, duplicatesIgnoreCase: true })).toBe('a\nb');
  });
  it('sorts: A-Z, Z-A, natural and by length', () => {
    expect(run('b\na\nc', { ...off, sort: 'az' })).toBe('a\nb\nc');
    expect(run('b\na\nc', { ...off, sort: 'za' })).toBe('c\nb\na');
    expect(run('file10\nfile2\nfile1', { ...off, sort: 'natural' })).toBe('file1\nfile2\nfile10');
    expect(run('ccc\na\nbb', { ...off, sort: 'length' })).toBe('a\nbb\nccc');
  });
  it('changes case', () => {
    expect(run('hello World', { ...off, caseMode: 'upper' })).toBe('HELLO WORLD');
    expect(run('Hello World', { ...off, caseMode: 'lower' })).toBe('hello world');
    expect(run('the quick brown fox', { ...off, caseMode: 'title' })).toBe('The Quick Brown Fox');
    expect(run('hello there. how are you? fine', { ...off, caseMode: 'sentence' })).toBe('Hello there. How are you? Fine');
    expect(run('élan vital', { ...off, caseMode: 'title' })).toBe('Élan Vital');
  });
  it('straightens smart quotes', () => {
    expect(run('\u201Chi\u201D \u2018x\u2019', { ...off, straightenQuotes: true })).toBe('"hi" \'x\'');
  });
  it('handles empty input', () => {
    expect(run('')).toBe('');
  });
});

describe('textStats', () => {
  it('counts characters (by code point), words and lines', () => {
    expect(textStats('hello world\nbye')).toEqual({ characters: 15, words: 3, lines: 2 });
    expect(textStats('')).toEqual({ characters: 0, words: 0, lines: 0 });
    expect(textStats('😀a').characters).toBe(2);
  });
});
