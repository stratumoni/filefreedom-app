import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';
import { SearchBox } from './SearchBox';
import { ToolIconDefs } from './ToolIllustration';
import { categoryCount } from './ToolCards';
import { setTheme, useFavorites, useRecents, useTheme } from '@/lib/storage';
import { CATEGORIES } from '@/registry/categories';

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="FileFreedom home">
      <BrandMark size={30} />
      <span className="wordmark"><span className="wordmark-file">File</span>Freedom</span>
    </Link>
  );
}

/** Shortcuts in the header pill (desktop). The full list, with categories and counts, is in the sidebar and the mobile menu. */
function QuickLinks() {
  const items: [string, string][] = [['/tools', 'All tools'], ['/categories', 'Categories'], ['/privacy', 'Privacy'], ['/roadmap', 'Roadmap']];
  return (
    <nav className="quick-links" aria-label="Quick links">
      {items.map(([to, label]) => <NavLink key={to} to={to} end={to === '/tools'} className="quick-link">{label}</NavLink>)}
    </nav>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const favs = useFavorites().ids.length;
  const recents = useRecents().length;
  const loc = useLocation();
  const view = new URLSearchParams(loc.search).get('view');
  const here = loc.pathname;
  // NavLink ignores query strings, so "current page" is decided here.
  const item = (to: string, icon: string, label: string, current: boolean, count?: number) => (
    <li>
      <Link to={to} className="nav-link" aria-current={current ? 'page' : undefined} onClick={onNavigate}>
        <Icon name={icon} size={18} />{label}{count ? <span className="count">{count}</span> : null}
      </Link>
    </li>
  );
  return (
    <nav aria-label="Main">
      <ul className="nav-list">
        {item('/', 'home', 'Home', here === '/')}
        {item('/tools', 'grid', 'All tools', here === '/tools' && !view)}
        {item('/tools?view=recent', 'history', 'Recent tools', here === '/tools' && view === 'recent', recents)}
        {item('/tools?view=favorites', 'star', 'Favourites', here === '/tools' && view === 'favorites', favs)}
        {item('/privacy', 'shield', 'Privacy & security', here === '/privacy')}
        {item('/settings', 'settings', 'Settings', here === '/settings')}
      </ul>
      <p className="nav-heading">Categories</p>
      <ul className="nav-list">
        {CATEGORIES.map((c) => {
          const n = categoryCount(c.id);
          const current = here === `/categories/${c.id}`;
          return (
            <li key={c.id}>
              <Link to={`/categories/${c.id}`} className="nav-link" aria-current={current ? 'page' : undefined} onClick={onNavigate}>
                <Icon name={c.icon} size={18} />{c.name}<span className="count" aria-label={`${n} available`}>{n || '–'}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** One button that steps Light, then Dim, then Dark, then back to Light. Its icon shows where the next press goes. */
const NEXT_THEME = { light: 'dim', dim: 'dark', dark: 'light' } as const;
const THEME_LABEL = { light: 'light', dim: 'dim', dark: 'dark' } as const;
const THEME_ICON = { light: 'sun', dim: 'dim', dark: 'moon' } as const;

function ThemeToggle() {
  const pref = useTheme();
  const current: keyof typeof NEXT_THEME = pref === 'system'
    ? (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : pref;
  const next = NEXT_THEME[current];
  return (
    <button type="button" className="btn btn-quiet btn-icon" aria-label={`Switch to ${THEME_LABEL[next]} theme`} title={`Switch to ${THEME_LABEL[next]} theme`} onClick={() => setTheme(next)}>
      <Icon name={THEME_ICON[next]} />
    </button>
  );
}

export function Layout() {
  const loc = useLocation();
  const main = useRef<HTMLElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const palette = useRef<HTMLDialogElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const first = useRef(true);

  // After client-side navigation: scroll to top and move focus to the page so keyboard and screen-reader users land at the new content.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [loc.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function openPalette() {
    setPaletteOpen(true);
    if (!palette.current?.open) palette.current?.showModal();
  }
  const closePalette = () => { palette.current?.close(); setPaletteOpen(false); };

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <ToolIconDefs />
      <header className="site-header">
        <div className="header-brand">
          <button type="button" className="btn btn-quiet btn-icon menu-btn" aria-label="Open navigation menu" onClick={() => drawer.current?.showModal()}><Icon name="menu" /></button>
          <Brand />
        </div>
        <QuickLinks />
        <div className="header-actions">
          <button type="button" className="search-trigger header-search" onClick={openPalette} aria-label="Search tools">
            <Icon name="search" size={18} /> Search tools <kbd className="key" aria-hidden="true">/</kbd>
          </button>
          <button type="button" className="btn btn-quiet btn-icon search-icon-btn" aria-label="Search tools" onClick={openPalette}><Icon name="search" /></button>
          <ThemeToggle />
        </div>
      </header>

      <div className="frame">
        <aside className="sidebar" aria-label="Site navigation"><NavItems /></aside>
        <main id="main" ref={main} tabIndex={-1} className="main">
          <div className="container"><Suspense fallback={<p role="status" className="hint">Loading…</p>}><Outlet /></Suspense></div>
        </main>
      </div>

      <footer className="site-footer">
        <div className="footer-inner">
          <p style={{ maxWidth: '46ch' }}>Files you open in FileFreedom tools are processed by your browser on your device. HTTPS protects the page itself; it is a separate protection from local processing.</p>
          <ul className="footer-links" aria-label="Footer">
            <li><Link to="/privacy">Privacy & security</Link></li>
            <li><Link to="/formats">Supported formats</Link></li>
            <li><Link to="/roadmap">Roadmap</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/settings">Settings</Link></li>
          </ul>
        </div>
      </footer>

      <dialog ref={drawer} className="drawer" aria-label="Navigation menu" onClick={(e) => { if (e.target === drawer.current) drawer.current?.close(); }}>
        <div className="drawer-head">
          <Brand />
          <button type="button" className="btn btn-quiet btn-icon" aria-label="Close navigation menu" onClick={() => drawer.current?.close()}><Icon name="close" /></button>
        </div>
        <div className="drawer-body"><NavItems onNavigate={() => drawer.current?.close()} /></div>
      </dialog>

      <dialog ref={palette} className="palette" aria-label="Search tools" onClose={() => setPaletteOpen(false)} onClick={(e) => { if (e.target === palette.current) closePalette(); }}>
        <div style={{ padding: 'var(--space-3)' }}>
          {paletteOpen && <SearchBox autoFocus onDone={closePalette} />}
        </div>
      </dialog>
    </>
  );
}
