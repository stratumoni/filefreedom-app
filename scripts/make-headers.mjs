// Generates dist/_headers (Cloudflare Pages format). The inline theme script in index.html is allowed by hash,
// so the policy can keep script-src 'self' with no 'unsafe-inline'.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const hashes = inline.map((s) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`);

const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(' ')}`.trim(),
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'", // React inline style attributes (sizes, positions)
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'", // the browser itself refuses requests to any other address
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const headers = `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/pdfjs/*
  Cache-Control: public, max-age=31536000, immutable
`;
writeFileSync(new URL('../dist/_headers', import.meta.url), headers);
console.log(`dist/_headers written (${hashes.length} inline script hash${hashes.length === 1 ? '' : 'es'})`);
