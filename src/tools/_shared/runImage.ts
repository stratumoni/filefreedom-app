import { EngineError, renderJob, type EngineCode, type RenderJob, type RenderOutput } from './imageEngine';

export interface RunOptions { signal?: AbortSignal; onProgress?: (msg: string) => void }

/** Run an image job in a worker; fall back to the main thread when workers or OffscreenCanvas are unavailable. */
export function runImage(job: RenderJob, opts: RunOptions = {}): Promise<RenderOutput> {
  const canWorker = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
  if (!canWorker) return renderJob(job, opts.signal, opts.onProgress);

  return new Promise<RenderOutput>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      renderJob(job, opts.signal, opts.onProgress).then(resolve, reject);
      return;
    }
    const finish = () => { opts.signal?.removeEventListener('abort', onAbort); worker.terminate(); };
    const onAbort = () => { finish(); reject(new EngineError('aborted', 'Cancelled.')); };
    if (opts.signal?.aborted) return onAbort();
    opts.signal?.addEventListener('abort', onAbort);
    worker.onmessage = (e: MessageEvent<{ progress?: string; ok?: RenderOutput; error?: { code: EngineCode; message: string } }>) => {
      if (e.data.progress) opts.onProgress?.(e.data.progress);
      else if (e.data.ok) { finish(); resolve(e.data.ok); }
      else if (e.data.error) { finish(); reject(new EngineError(e.data.error.code, e.data.error.message)); }
    };
    worker.onerror = () => {
      // Worker failed to start (for example blocked by policy): retry once on the main thread.
      finish();
      renderJob(job, opts.signal, opts.onProgress).then(resolve, reject);
    };
    worker.postMessage({ id: 1, job });
  });
}
