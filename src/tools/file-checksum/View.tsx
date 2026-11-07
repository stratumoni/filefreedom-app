import { useEffect, useState } from 'react';
import { DropZone, type PickedFile } from '@/components/DropZone';
import { CopyButton, Notice, Seg, Working } from '@/components/ui';
import { formatBytes } from '@/lib/format';

const ALGS = ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512'] as const;
type Alg = (typeof ALGS)[number];
const BY_LENGTH: Record<number, Alg> = { 40: 'SHA-1', 64: 'SHA-256', 96: 'SHA-384', 128: 'SHA-512' };
const MAX = 1_000_000_000;

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

interface Row { name: string; size: number; digest?: string; error?: string }

export default function View() {
  const [batch, setBatch] = useState<{ id: number; files: File[] }>({ id: 0, files: [] });
  const [alg, setAlg] = useState<Alg>('SHA-256');
  const [done, setDone] = useState<{ key: string; rows: Row[] } | null>(null);
  const [expected, setExpected] = useState('');
  const available = typeof crypto !== 'undefined' && !!crypto.subtle;
  const clean = expected.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
  const md5Hint = /^[0-9a-fA-F]{32}$/.test(expected.trim());
  const key = `${batch.id}:${alg}`;
  const busy = batch.files.length > 0 && available && done?.key !== key;
  const rows = done?.key === key ? done.rows : [];

  function onExpected(v: string) {
    setExpected(v);
    const c = v.replace(/[^0-9a-fA-F]/g, '');
    const guess = BY_LENGTH[c.length];
    if (guess && v.trim().length === c.length) setAlg(guess); // pick the algorithm from the checksum's length
  }

  useEffect(() => {
    if (!batch.files.length || !available) return;
    let cancelled = false;
    (async () => {
      const out: Row[] = [];
      for (const f of batch.files) {
        if (cancelled) return;
        try {
          out.push({ name: f.name, size: f.size, digest: hex(await crypto.subtle.digest(alg, await f.arrayBuffer())) });
        } catch {
          out.push({ name: f.name, size: f.size, error: 'This file could not be read. It may be too large for your browser’s memory.' });
        }
      }
      if (!cancelled) setDone({ key: `${batch.id}:${alg}`, rows: out });
    })();
    return () => { cancelled = true; };
  }, [batch, alg, available]);

  return (
    <div className="tool-grid">
      {!available && <Notice kind="error" title="Checksums are unavailable here.">Your browser only offers its cryptography features on secure (https) pages.</Notice>}
      <DropZone kinds={null} multiple formatsLabel="Any file" maxBytes={MAX} onPick={(p: PickedFile[]) => setBatch((b) => ({ id: b.id + 1, files: p.map((x) => x.file) }))} hint="Read on your device only" />
      <div className="panel">
        <Seg<Alg> name="alg" legend="Algorithm" value={alg} onChange={setAlg} options={ALGS.map((a) => ({ value: a, label: a }))} />
        <div className="field">
          <label htmlFor="expected">Published checksum to compare (optional)</label>
          <input id="expected" className="input" style={{ fontFamily: 'var(--font-mono)' }} value={expected} onChange={(e) => onExpected(e.target.value)} placeholder="Paste the checksum from the download page" autoComplete="off" spellCheck={false} />
          <span className="hint">The algorithm is picked automatically from the checksum’s length.</span>
        </div>
        {md5Hint && <Notice kind="warn" title="That looks like an MD5 checksum.">Browsers do not include MD5, so it cannot be calculated here. If the site also lists a SHA-256, use that.</Notice>}
      </div>
      {busy && <Working label={`Calculating ${alg}…`} />}
      {!busy && rows.length > 0 && (
        <div className="panel result-in" aria-live="polite">
          <h2 className="panel-title">{alg} result{rows.length > 1 ? 's' : ''}</h2>
          {rows.map((r) => {
            const match = r.digest && clean ? r.digest === clean : null;
            return (
              <div key={r.name + r.size} style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <strong style={{ fontSize: 'var(--text-sm)', overflowWrap: 'anywhere' }}>{r.name} <span style={{ color: 'var(--c-muted)', fontWeight: 400 }}>({formatBytes(r.size)})</span></strong>
                {r.error ? <Notice kind="error">{r.error}</Notice> : <>
                  <code className="hash">{r.digest}</code>
                  <div className="actions"><CopyButton text={r.digest!} label="Copy checksum" /></div>
                  {match === true && <Notice kind="ok" title="Match.">This file’s checksum is identical to the one you pasted.</Notice>}
                  {match === false && <Notice kind="error" title="No match.">The checksums differ. The file may be incomplete, altered, or a different version. Do not trust it until you re-download it from the original source.</Notice>}
                </>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
