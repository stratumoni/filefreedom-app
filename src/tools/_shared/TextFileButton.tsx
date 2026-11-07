import { useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Notice } from '@/components/ui';
import { formatBytes } from '@/lib/format';
import { sniffFile } from '@/lib/sniff';

/** Reads a text file as UTF-8 on the device. Refuses binary files and files that are too large. */
export function TextFileButton({ onText, maxBytes, label = 'Open a file', accept }: { onText: (text: string, name: string) => void; maxBytes: number; label?: string; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  async function pick(f: File | undefined) {
    if (!f) return;
    setErr('');
    if (f.size > maxBytes) return setErr(`“${f.name}” is ${formatBytes(f.size)}. This tool handles text up to ${formatBytes(maxBytes)}.`);
    const kind = await sniffFile(f);
    if (kind !== 'text' && kind !== 'svg') return setErr(`“${f.name}” does not look like a text file, so it was not opened.`);
    onText(await f.text(), f.name);
    if (ref.current) ref.current.value = '';
  }
  return (
    <span style={{ display: 'inline-grid', gap: 'var(--space-2)' }}>
      <input ref={ref} type="file" hidden tabIndex={-1} aria-hidden="true" accept={accept} onChange={(e) => void pick(e.target.files?.[0])} />
      <button type="button" className="btn btn-sm" onClick={() => ref.current?.click()}><Icon name="upload" size={16} /> {label}</button>
      {err && <Notice kind="error">{err}</Notice>}
    </span>
  );
}

export function textBlob(text: string, type: string) {
  return new Blob([text], { type: `${type};charset=utf-8` });
}
