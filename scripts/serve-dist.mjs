// Serves dist/ the way Cloudflare Pages will: applies dist/_headers and falls back to index.html for app routes.
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const port = Number(process.env.PORT ?? 4173);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.pfb': 'application/octet-stream', '.ttf': 'font/ttf', '.map': 'application/json' };

const rules = [];
const text = readFileSync(join(root, '_headers'), 'utf8');
let cur = null;
for (const line of text.split('\n')) {
  if (!line.trim()) continue;
  if (!line.startsWith(' ')) { cur = { pattern: line.trim(), headers: {} }; rules.push(cur); }
  else { const i = line.indexOf(':'); cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
}
const matches = (pattern, path) => (pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern);

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, path);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    // Real files only; anything that looks like an asset but is missing must be a true 404.
    if (extname(path) && path !== '/') { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    file = join(root, 'index.html'); path = '/index.html';
  }
  const headers = { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' };
  for (const r of rules) if (matches(r.pattern, url.pathname)) Object.assign(headers, r.headers);
  res.writeHead(200, headers);
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving dist on http://localhost:${port} with _headers`));
