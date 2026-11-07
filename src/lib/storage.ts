import { useSyncExternalStore } from 'react';

/** Only non-sensitive preferences are stored: theme, favourites, recent tool ids. Never file data. */
const PREFIX = 'ff:';
const listeners = new Set<() => void>();
const memory = new Map<string, string>(); // fallback when storage is blocked

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return memory.get(key) ?? null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, value);
  } catch {
    if (value === null) memory.delete(key);
    else memory.set(key, value);
  }
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export type ThemePref = 'system' | 'light' | 'dark' | 'dim';

export function getTheme(): ThemePref {
  const t = read('theme');
  return t === 'light' || t === 'dark' || t === 'dim' ? t : 'system';
}
export function setTheme(t: ThemePref) {
  write('theme', t === 'system' ? null : t);
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}
export function useTheme(): ThemePref {
  return useSyncExternalStore(subscribe, getTheme, () => 'system' as ThemePref);
}

// useSyncExternalStore needs a stable snapshot: cache the parsed list per raw string.
const cache = new Map<string, { raw: string | null; list: string[] }>();
function listSnapshot(key: string): string[] {
  const raw = read(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.list;
  const list = parseList(raw);
  cache.set(key, { raw, list });
  return list;
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, () => listSnapshot('favorites'), () => []);
  return {
    ids,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) => write('favorites', JSON.stringify(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])),
  };
}

export function useRecents() {
  return useSyncExternalStore(subscribe, () => listSnapshot('recents'), () => []);
}
export function addRecent(id: string) {
  const cur = listSnapshot('recents').filter((x) => x !== id);
  write('recents', JSON.stringify([id, ...cur].slice(0, 8)));
}
export function clearRecents() {
  write('recents', null);
}
/** Removes every FileFreedom preference stored in this browser. */
export function resetAllPreferences() {
  for (const k of ['theme', 'favorites', 'recents']) write(k, null);
  delete document.documentElement.dataset.theme;
}
