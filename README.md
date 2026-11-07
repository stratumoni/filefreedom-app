# FileFreedom

Free file tools that run in the browser. Files are processed on the visitor's device; the tools have no upload step and there is no server that receives files.

> Status: early release. Only tools listed under **Available tools** exist. Everything else is on the roadmap and cannot be opened.

## Quick start

```bash
npm install
npm run dev            # development server
npm run build          # type-check, build, write dist/_headers
npm run preview        # serve dist/ exactly as Cloudflare Pages will (headers + SPA fallback) on :4173
npm run typecheck && npm run lint && npm test
npx playwright install chromium   # once
npm run test:e2e       # full browser suite (builds first)
python3 scripts/verify_outputs.py # independently verifies files downloaded by the e2e suite (needs Pillow, numpy, pypdf)
```

## Available tools

Image compressor, resizer, format converter, cropper, dimensions/format inspector, upload-requirements checker · JSON formatter/validator · CSV to JSON · Text cleaner · File checksum · File inspector · PDF merger · PDF splitter/page extractor.

## Architecture

| Area | Choice |
|---|---|
| App | Vite, React 19, TypeScript (strict), React Router |
| Tools | Registry in `src/registry/tools.ts` is the single source of truth. Each tool is lazy-loaded (`loadModule`), so its code is fetched only on its page. |
| Logic vs UI | Pure logic in `logic.ts`/`_shared/*` (unit-tested in Node); thin `View.tsx` on top. |
| Images | One pipeline (`_shared/imageEngine.ts`) in a Web Worker with a main-thread fallback. Every output is checked to be the requested format (browsers silently fall back to PNG). |
| PDF | `@cantoo/pdf-lib` (maintained fork of pdf-lib) for merge/extract/split; `pdfjs-dist` for page thumbnails only, with worker and fonts served from this origin. |
| Styling | Design tokens (`src/styles/tokens.css`), CSS cascade layers, light/dark. Colour contrast of every token pair is unit-tested. Palette is taken from the logo: blue `#0040fe`, sky `#72b4fe`, orange `#fe7c01`, yellow `#febf1f`, navy `#0a1230`, on white. Brand colours are fills; text on them uses navy or white. Typeface: Bricolage Grotesque (self-hosted, with its optical-size axis). The logo mark is `src/components/BrandMark.tsx` and `public/favicon.svg`; hero stickers are `src/components/HeroStickers.tsx`. |
| Hosting | Static files on Cloudflare Pages. `scripts/make-headers.mjs` writes `dist/_headers`. |

### Upload area

`src/components/DropZone.tsx` is the one upload area every tool uses. Idle: stacked pages. Dragging a file over: the pages fan out. After a drop, a folder takes each file in turn and plays an animation for that file's kind (`src/components/UploadArt.tsx`; the kind comes from the file's contents via `src/lib/uploadArt.ts`), while a row per file goes Waiting, Reading, Ready. Nothing is uploaded: "adding" is the on-device check each file already went through, paced so it can be seen (about 1.4 s for one file, about 3 s at most for a big batch, none with reduced motion). The pacing lives in `stepMs` and `DONE_HOLD_MS`.

### Privacy model

- `connect-src 'self'` in the Content-Security-Policy means the browser itself refuses requests to other addresses.
- "Runs in your browser" (`privacy.verified: true` in the registry) is allowed only for tools whose real flow passes `e2e/audit.spec.ts`, which fails on any non-GET, any request body, or any cross-origin request. `e2e/audit.spec.ts` also contains negative controls proving the detector catches leaks.
- Only theme, favourite tool ids and recent tool ids are stored in `localStorage`. Never file names or contents.
- Settings has an invite link (`src/components/InviteCard.tsx`): it is just this site's address, with Copy and Share (the browser's share sheet where one exists, otherwise Share copies the link). Nothing is sent or stored.
- No analytics, ads, or third-party fonts/scripts in this build.

## Adding a tool

1. Write `src/tools/<id>/logic.ts` (+ `logic.test.ts`) and `View.tsx` (default export).
2. Add an entry to `TOOLS` in `src/registry/tools.ts` with `verified: false`.
3. Remove it from `src/registry/planned.ts` if listed.
4. Add a flow in `e2e/flows.ts`. A test fails if an available tool has no flow.
5. When the flow and audit pass, set `verified: true`.

## Deploying to Cloudflare Pages

Build command `npm run build`, output directory `dist`. No environment variables are required. Pages serves `index.html` for unknown routes (SPA mode) and applies `_headers`.
Before launch: confirm the domain, add real contact/operator details to the legal pages (not yet written), and check Cloudflare's current per-file size limits (pdf.js worker is ~1.3 MB).

## Known limitations

- Tests run in Chromium only. Firefox, Safari/WebKit, real phones and screen readers have not been tested.
- HEIC photos and SVG inputs are not supported; animated images are reduced to their first frame (with a warning).
- Password-protected PDFs are refused. Merging/splitting does not preserve form fields or bookmarks (the tool warns).
- Checksums: SHA-1/256/384/512 only (no MD5 in the Web Crypto API); files above 1 GB are refused.
- PDF merge/split run on the main thread; very large files may briefly freeze the tab.
- Not built yet: File Fixer, guides, legal pages, static prerendering for SEO, performance budgets.

## Deploying to Vercel

`vercel.json` sends every unknown path to `index.html`, so the app's own "Oops! 404" page shows instead of Vercel's plain NOT_FOUND screen. Vercel ignores `dist/_headers`; the security headers in it are Cloudflare Pages only.
