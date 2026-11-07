import type { Category } from './types';

export const CATEGORIES: Category[] = [
  { id: 'images', name: 'Images', blurb: 'Compress, resize, convert and check photos and graphics.', tone: 'image', icon: 'image' },
  { id: 'video', name: 'Video', blurb: 'Trim, convert and shrink video clips.', tone: 'neutral', icon: 'video' },
  { id: 'audio', name: 'Audio', blurb: 'Trim, convert and inspect sound files.', tone: 'neutral', icon: 'audio' },
  { id: 'pdf', name: 'PDF', blurb: 'Merge, split, rotate and inspect PDF documents.', tone: 'pdf', icon: 'pdf' },
  { id: 'documents', name: 'Documents', blurb: 'Clean up text and convert document formats.', tone: 'text', icon: 'doc' },
  { id: 'data', name: 'Data', blurb: 'Format, validate and convert JSON, CSV and more.', tone: 'data', icon: 'data' },
  { id: 'archives', name: 'Archives', blurb: 'Inspect files and work with ZIP archives.', tone: 'neutral', icon: 'archive' },
  { id: 'security', name: 'Security', blurb: 'Checksums, hashes and local encryption.', tone: 'security', icon: 'shield' },
  { id: 'design', name: 'Design', blurb: 'Colour, SVG and icon helpers.', tone: 'neutral', icon: 'palette' },
  { id: 'fonts', name: 'Fonts', blurb: 'Preview and inspect font files.', tone: 'neutral', icon: 'font' },
  { id: 'ebooks', name: 'E-books', blurb: 'Inspect and extract text from EPUB files.', tone: 'neutral', icon: 'book' },
  { id: 'developer', name: 'Developer tools', blurb: 'Encoders, testers and formatters for code and data.', tone: 'neutral', icon: 'code' },
];

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
