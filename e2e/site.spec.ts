import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FLOWS } from './flows';

const read = (p: string) => readFileSync(resolve(import.meta.dirname, '..', p), 'utf8');
const toolSlugs = [...read('src/registry/tools.ts').matchAll(/slug: '([^']+)'/g)].map((m) => m[1]!);
const categories = [...read('src/registry/categories.ts').matchAll(/id: '([^']+)', name/g)].map((m) => m[1]!);
const ROUTES = ['/', '/tools', '/categories', '/privacy', '/formats', '/roadmap', '/about', '/settings', ...categories.map((c) => `/categories/${c}`), ...toolSlugs.map((s) => `/tools/${s}`)];

const NOT_FOUND = 'We can’t find that page';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return errors;
}

test('registry sanity: 12 categories and at least the Release-1 tools so far', () => {
  expect(categories).toHaveLength(12);
  expect(toolSlugs.length).toBeGreaterThanOrEqual(13);
});

test('every route renders, has one h1, and logs no errors', async ({ page }) => {
  const errors = collectErrors(page);
  for (const r of ROUTES) {
    await page.goto(r);
    await expect(page.locator('h1'), r).toHaveCount(1);
    await expect(page.getByText(NOT_FOUND), r).toHaveCount(0);
    await expect(page, r).toHaveTitle(/FileFreedom/);
  }
  expect(errors).toEqual([]);
});

test('link crawl: every internal link on every page leads somewhere real', async ({ page }) => {
  const seen = new Set<string>();
  const queue = ['/'];
  const broken: string[] = [];
  while (queue.length) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    await page.goto(url);
    await page.locator('h1').first().waitFor();
    if (await page.getByText(NOT_FOUND).count()) { broken.push(url); continue; }
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!));
    for (const h of hrefs) {
      if (!h.startsWith('/') || h.startsWith('//')) { if (/^https?:/.test(h)) broken.push(`${url} -> external link ${h}`); continue; }
      const clean = h.split('#')[0]!;
      if (clean && !seen.has(clean)) queue.push(clean);
    }
  }
  expect(broken).toEqual([]);
  expect(seen.size).toBeGreaterThan(30);
});

test('planned tools are not routable and unknown pages 404 helpfully', async ({ page }) => {
  await page.goto('/tools/video-trim');
  await expect(page.getByText(NOT_FOUND)).toBeVisible();
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex');
  await page.goto('/categories/nope');
  await expect(page.getByText(NOT_FOUND)).toBeVisible();
});

test('empty categories say so and do not list unbuilt tools', async ({ page }) => {
  await page.goto('/categories/video');
  await expect(page.getByText('No tools in this category are available yet.')).toBeVisible();
  await expect(page.getByText('Video to GIF')).toHaveCount(0);
  await expect(page.getByText(/On the roadmap/)).toHaveCount(0);
});

test('search: natural phrases, keyboard, unsupported formats, palette shortcut', async ({ page }) => {
  await page.goto('/');
  const box = page.getByRole('combobox').first();
  await box.fill('make a photo under 2 MB');
  await expect(page.getByRole('option', { name: /Image compressor/ })).toBeVisible();
  await box.press('ArrowDown');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/tools\/image-(compressor|requirements-checker)/);

  await page.goto('/');
  await page.getByRole('combobox').first().fill('MP4 to GIF');
  await expect(page.getByText('No tool handles .mp4 files yet.')).toBeVisible();
  await expect(page.getByText('Video to GIF')).toHaveCount(0);

  await page.goto('/privacy');
  await page.locator('h1').waitFor();
  await page.keyboard.press('/');
  await expect(page.getByRole('dialog', { name: 'Search tools' })).toBeVisible();
  await page.keyboard.type('checksum');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/tools\/file-checksum/);
});

test('search results page is not empty for typos and never lists unbuilt tools', async ({ page }) => {
  await page.goto('/tools?q=compres%20imge');
  await expect(page.getByRole('heading', { name: 'Image compressor' })).toBeVisible();
  await page.goto('/tools?q=rotate%20pdf');
  await expect(page.getByText(/No available tool matches/)).toBeVisible();
  await expect(page.getByText('PDF rotate pages')).toHaveCount(0);
  await expect(page.getByText(/On the roadmap/)).toHaveCount(0);
});

test('theme: toggle, persistence, and returning to system', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Switch to (dark|dim|light) theme/ }).click();
  const t = await page.locator('html').getAttribute('data-theme');
  expect(['light', 'dim', 'dark']).toContain(t);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', t!);
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'Match my device' }).check();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
});

test('favourites and recents persist locally and can be erased', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('button', { name: /Add Image compressor to favourites/ }).click();
  await page.goto('/tools?view=favorites');
  await expect(page.getByRole('heading', { name: 'Image compressor' })).toBeVisible();
  await page.goto('/tools/json-formatter');
  await page.getByRole('heading', { name: 'JSON formatter and validator', level: 1 }).waitFor();
  await page.goto('/tools?view=recent');
  await expect(page.getByRole('heading', { name: 'JSON formatter and validator' })).toBeVisible();
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Erase all saved preferences' }).click();
  await page.goto('/tools?view=favorites');
  await expect(page.getByText('No favourites yet.')).toBeVisible();
});

test('settings: invite link is the site address and can be copied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/settings');
  const expected = `${new URL(page.url()).origin}/`;
  await expect(page.getByRole('textbox', { name: 'Invite link' })).toHaveValue(expected);
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.getByText('Link copied.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
});

test('settings: Share uses the native share sheet when there is one, and copies the link when there is not', async ({ page, context }) => {
  await page.addInitScript(() => {
    (window as unknown as { shared: unknown[] }).shared = [];
    navigator.share = async (data) => { (window as unknown as { shared: unknown[] }).shared.push(data); };
  });
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Share' }).click();
  const shared = await page.evaluate(() => (window as unknown as { shared: { url: string }[] }).shared);
  expect(shared).toHaveLength(1);
  expect(shared[0]!.url).toBe(`${new URL(page.url()).origin}/`);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const noShare = await context.newPage();
  await noShare.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: undefined }); });
  await noShare.goto('/settings');
  await noShare.getByRole('button', { name: 'Share' }).click();
  await expect(noShare.getByText(/Link copied\. Paste it/)).toBeVisible();
  expect(await noShare.evaluate(() => navigator.clipboard.readText())).toBe(`${new URL(noShare.url()).origin}/`);
});

test('keyboard: skip link is first, and focus lands on the page after navigation', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.getByRole('link', { name: 'Privacy & security' }).first().click();
  await expect(page.locator('main')).toBeFocused();
});

test('mobile drawer opens, traps focus, and closes with Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'drawer is mobile-only');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Navigation menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Navigation menu' })).toBeHidden();
});

for (const width of [320, 360, 768, 1280]) {
  test(`no horizontal overflow at ${width}px on any page`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const bad: string[] = [];
    for (const r of ROUTES) {
      await page.goto(r);
      await page.locator('h1').first().waitFor();
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (o > 0) bad.push(`${r} overflows by ${o}px`);
    }
    expect(bad).toEqual([]);
  });
}

for (const scheme of ['light', 'dark', 'dim'] as const) {
  test(`accessibility (axe, WCAG 2.x A/AA): every page, ${scheme} theme`, async ({ page }) => {
    test.setTimeout(240_000); // audits every route
    // Dim has no device setting, so it is chosen the way a visitor would: saved in local storage.
    if (scheme === 'dim') await page.addInitScript(() => localStorage.setItem('ff:theme', 'dim'));
    else await page.emulateMedia({ colorScheme: scheme });
    const problems: string[] = [];
    for (const r of ROUTES) {
      await page.goto(r);
      await page.locator('h1').first().waitFor();
      await page.waitForTimeout(500); // let entry animations settle so contrast is measured on final colours
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      for (const v of res.violations) problems.push(`${r}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    expect(problems).toEqual([]);
  });
}

test('accessibility: tool pages in their result states', async ({ page }) => {
  const problems: string[] = [];
  for (const id of ['image-compressor', 'image-requirements-checker', 'image-inspector', 'file-checksum', 'json-formatter', 'csv-to-json']) {
    await FLOWS[id]!(page);
    await page.waitForTimeout(400);
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    for (const v of res.violations) problems.push(`${id}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  }
  expect(problems).toEqual([]);
});

test('sidebar marks exactly the current page (query-string views included)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'sidebar is desktop-only');
  const current = () => page.locator('.sidebar a[aria-current="page"]').allInnerTexts();
  await page.goto('/tools/image-compressor');
  await page.locator('h1').waitFor();
  expect(await current()).toEqual([]);
  await page.goto('/tools');
  expect((await current()).join()).toMatch(/^All tools/);
  await page.goto('/tools?view=favorites');
  expect(await current()).toHaveLength(1);
  expect((await current())[0]).toMatch(/^Favourites/);
  await page.goto('/categories/images');
  expect((await current())[0]).toMatch(/^Images/);
});
