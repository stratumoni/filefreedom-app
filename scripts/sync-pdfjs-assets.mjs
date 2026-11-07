// Copies pdf.js standard fonts into public/ so they are served from our own origin (no CDN requests).
import { cpSync, mkdirSync, rmSync } from 'node:fs';
const from = new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url);
const to = new URL('../public/pdfjs/standard_fonts/', import.meta.url);
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log('pdf.js standard fonts synced');
