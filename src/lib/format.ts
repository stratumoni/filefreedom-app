/** Sizes use decimal units (1 MB = 1,000,000 bytes). A file under a decimal limit is also under the binary one. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '–';
  if (n < 1000) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1000;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)} ${units[i]}`;
}

export function parseSizeToBytes(value: number, unit: 'KB' | 'MB'): number {
  return Math.round(value * (unit === 'MB' ? 1_000_000 : 1000));
}

export function percentChange(before: number, after: number): string {
  if (before <= 0) return '–';
  const p = ((after - before) / before) * 100;
  return `${p > 0 ? '+' : ''}${p.toFixed(p > -10 && p < 10 ? 1 : 0)}%`;
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
export function aspectRatioLabel(w: number, h: number): string {
  if (!w || !h) return '–';
  const g = gcd(w, h);
  const a = w / g;
  const b = h / g;
  return a > 50 || b > 50 ? (w / h).toFixed(3) + ':1' : `${a}:${b}`;
}

/** Replace characters that are unsafe in file names; keeps the name readable. */
export function safeFileName(name: string): string {
  const bad = '\\/:*?"<>|';
  const cleaned = Array.from(name, (c) => (c.charCodeAt(0) < 32 || bad.includes(c) ? '_' : c)).join('').replace(/^\.+/, '').trim();
  return cleaned.slice(0, 120) || 'file';
}
export function baseName(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}
export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 && i < name.length - 1 ? name.slice(i + 1).toLowerCase() : '';
}
