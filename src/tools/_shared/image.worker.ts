/// <reference lib="webworker" />
import { EngineError, renderJob, type RenderJob } from './imageEngine';

interface Msg { id: number; job: RenderJob }

self.onmessage = async (e: MessageEvent<Msg>) => {
  const { id, job } = e.data;
  try {
    const out = await renderJob(job, undefined, (message) => self.postMessage({ id, progress: message }));
    self.postMessage({ id, ok: out });
  } catch (err) {
    const code = err instanceof EngineError ? err.code : 'decode';
    self.postMessage({ id, error: { code, message: err instanceof Error ? err.message : 'Processing failed.' } });
  }
};
