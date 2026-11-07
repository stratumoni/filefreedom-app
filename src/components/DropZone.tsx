import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { Icon } from './Icon';
import { UploadArt, type ArtPhase } from './UploadArt';
import { Notice } from './ui';
import { formatBytes } from '@/lib/format';
import { KIND_INFO, sniffFile, isAnimated, sniffBytes, type Kind } from '@/lib/sniff';
import { ART_ICON, ART_LABEL, artFor, stepMs, type ArtKind } from '@/lib/uploadArt';

export interface PickedFile {
  file: File;
  kind: Kind;
  /** Extra things the user should know, e.g. extension does not match contents or image is animated. */
  notes: string[];
}

interface Props {
  /** File kinds the tool can process. `null` accepts anything. */
  kinds: Kind[] | null;
  /** Value for the native file input's accept attribute (a convenience for pickers, never trusted). */
  accept?: string;
  formatsLabel: string;
  maxBytes: number;
  multiple?: boolean;
  onPick: (files: PickedFile[]) => void;
  hint?: string;
  buttonLabel?: string;
}

const EXT_KIND: Record<string, Kind> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp', bmp: 'bmp', avif: 'avif', pdf: 'pdf' };

export async function inspectPicked(file: File, kinds: Kind[] | null): Promise<{ ok: PickedFile } | { error: string }> {
  if (file.size === 0) return { error: `“${file.name}” is empty (0 bytes), so there is nothing to process.` };
  const kind = await sniffFile(file).catch(() => 'unknown' as Kind);
  if (kinds && !kinds.includes(kind)) {
    if (kind === 'heic') return { error: `“${file.name}” is a HEIC/HEIF photo (the default format on many iPhones). Most browsers cannot open it. On an iPhone, choose Settings → Camera → Formats → Most Compatible, or share the photo as JPG.` };
    const want = kinds.map((k) => KIND_INFO[k].ext.toUpperCase()).join(', ');
    return { error: `“${file.name}” looks like ${KIND_INFO[kind].label.toLowerCase()} based on its contents. This tool accepts ${want}. Your original file has not been changed.` };
  }
  const notes: string[] = [];
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  const claimed = EXT_KIND[ext];
  if (claimed && claimed !== kind && kind !== 'unknown') notes.push(`The file name ends in .${ext} but the contents are ${KIND_INFO[kind].label}. FileFreedom uses the contents.`);
  if (kind === 'gif' || kind === 'png' || kind === 'webp') {
    const cap = kind === 'gif' ? 50_000_000 : 3_000_000;
    const bytes = new Uint8Array(await file.slice(0, cap).arrayBuffer());
    if (sniffBytes(bytes) === kind && isAnimated(bytes, kind)) notes.push('This is an animated image. Only its first frame will be used, so the result will not be animated.');
  }
  return { ok: { file, kind, notes } };
}

type RowState = 'wait' | 'read' | 'ok' | 'skip';
interface Row { name: string; size: number; art: ArtKind; state: RowState }

const sleep = (ms: number) => (ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve());
const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** How long the finished folder stays on screen before the tool takes over. */
const DONE_HOLD_MS = 600;

const STATUS_TEXT: Record<RowState, string> = { wait: 'Waiting', read: 'Reading…', ok: 'Ready', skip: 'Skipped' };

export function DropZone({ kinds, accept, formatsLabel, maxBytes, multiple, onPick, hint, buttonLabel }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const run = useRef(0); // bumped to cancel an intake that is in progress
  const [over, setOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [phase, setPhase] = useState<'idle' | 'adding' | 'done'>('idle');
  const [rows, setRows] = useState<Row[]>([]);
  // The artwork keeps its kinds while it fades back to the idle stack, so the folder never loses what is dropping into it.
  const [artKinds, setArtKinds] = useState<ArtKind[]>([]);
  const [cur, setCur] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const r = run;
    return () => { r.current += 1; };
  }, []);

  const busy = phase !== 'idle';
  const artPhase: ArtPhase = busy ? phase : over ? 'over' : 'idle';
  const patch = (i: number, state: RowState) => setRows((all) => all.map((r, n) => (n === i ? { ...r, state } : r)));

  /**
   * Nothing is uploaded: "adding" means reading each file on this device. The animation is paced to the real work
   * (each file's check must finish before its row turns Ready) with a short minimum so that it can be seen.
   */
  async function handle(list: FileList | File[]) {
    const files = Array.from(list);
    if (input.current) input.current.value = ''; // allow choosing the same file again
    if (files.length === 0) return;
    const chosen = multiple ? files : files.slice(0, 1);
    const errs: string[] = [];
    if (!multiple && files.length > 1) errs.push('This tool works on one file at a time, so only the first file was used.');

    const me = ++run.current;
    const live = () => run.current === me;
    const reduced = prefersReducedMotion();
    const heads = await Promise.all(chosen.map((f) => sniffFile(f).catch(() => 'unknown' as Kind)));
    if (!live()) return;

    const ms = stepMs(chosen.length, reduced);
    setErrors([]);
    setStep(ms);
    setCur(0);
    const made: Row[] = chosen.map((f, n) => ({ name: f.name, size: f.size, art: artFor(heads[n]!, f.name), state: 'wait' }));
    setRows(made);
    setArtKinds(made.map((r) => r.art));
    setPhase('adding');

    const ok: PickedFile[] = [];
    for (let n = 0; n < chosen.length; n++) {
      const f = chosen[n]!;
      setCur(n);
      patch(n, 'read');
      const work: ReturnType<typeof inspectPicked> = f.size > maxBytes
        ? Promise.resolve({ error: `“${f.name}” is ${formatBytes(f.size)}, which is over this tool’s ${formatBytes(maxBytes)} limit for your device’s safety.` })
        : inspectPicked(f, kinds);
      const [r] = await Promise.all([work, sleep(ms)]);
      if (!live()) return;
      if ('error' in r) errs.push(r.error); else ok.push(r.ok);
      patch(n, 'error' in r ? 'skip' : 'ok');
    }

    if (ok.length) {
      setCur(chosen.length);
      setPhase('done');
      await sleep(reduced ? 0 : DONE_HOLD_MS);
      if (!live()) return;
    }
    setErrors(errs);
    setPhase('idle');
    setRows([]);
    if (ok.length) onPick(ok);
  }

  function cancel() {
    run.current += 1;
    setPhase('idle');
    setRows([]);
  }

  const isFileDrag = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');
  const noun = multiple ? 'files' : 'file';
  const total = rows.length;

  return (
    <div className="upload">
      <div
        className="dropzone"
        data-phase={artPhase}
        onClick={() => { if (!busy) input.current?.click(); }}
        onDragEnter={(e) => { if (!busy && isFileDrag(e)) { e.preventDefault(); setOver(true); } }}
        onDragOver={(e) => { if (isFileDrag(e)) { e.preventDefault(); if (!busy) setOver(true); } }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false); }}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) void handle(e.dataTransfer.files); }}
      >
        <UploadArt phase={artPhase} kinds={artKinds} cur={cur} stepMs={step} />
        {busy ? (
          <p className="drop-title" role="status">
            {phase === 'adding'
              ? <><span className="up-spin" aria-hidden="true" /> {total === 1 ? 'Adding file…' : `Adding ${total} files…`}</>
              : <><Icon name="ok" size={18} className="up-ok-icon" /> {total === 1 ? 'File ready' : `${total} files ready`}</>}
          </p>
        ) : (
          <>
            <p className="drop-title">
              <span>{over ? <strong>Drop to add</strong> : <><strong>Click</strong> or drag your {noun} here</>}</span>
            </p>
            <input
              ref={input} id={id} type="file" hidden tabIndex={-1} aria-hidden="true" accept={accept} multiple={multiple}
              onChange={(e) => e.target.files && void handle(e.target.files)}
            />
            <button type="button" className="btn btn-primary" onClick={(e) => { e.stopPropagation(); input.current?.click(); }}>
              <Icon name="upload" size={18} /> {buttonLabel ?? (multiple ? 'Choose files' : 'Choose file')}
            </button>
            <p className="formats">{formatsLabel} · up to {formatBytes(maxBytes)}{hint ? ` · ${hint}` : ''}</p>
          </>
        )}
      </div>

      {total > 0 && (
        <div className="up-list">
          <ul className="up-rows" aria-label="Files being added">
            {rows.map((r, n) => (
              <li key={n} className="up-row" data-state={r.state}>
                <span className="up-tile" data-art={r.art}><Icon name={ART_ICON[r.art]} size={20} /></span>
                <span className="up-name"><b>{r.name}</b><span className="up-kind">{ART_LABEL[r.art]}</span></span>
                <span className="up-status">
                  {r.state === 'read' && <span className="up-spin" aria-hidden="true" />}
                  {r.state === 'ok' && <Icon name="check" size={15} />}
                  {r.state === 'skip' && <Icon name="warn" size={15} />}
                  {STATUS_TEXT[r.state]}
                </span>
                <span className="up-size">{formatBytes(r.size)}</span>
              </li>
            ))}
          </ul>
          <div className="up-foot">
            <span>Total {total} {total === 1 ? 'file' : 'files'}</span>
            {phase === 'adding' && <button type="button" className="btn btn-sm" onClick={cancel}>Cancel</button>}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {errors.map((e) => <Notice key={e} kind="error">{e}</Notice>)}
        </div>
      )}
    </div>
  );
}
