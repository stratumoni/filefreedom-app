import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { CopyButton, DownloadButton, Notice, Seg } from '@/components/ui';
import { formatBytes } from '@/lib/format';
import { TextFileButton, textBlob } from '../_shared/TextFileButton';
import { describeStructure, parseJson, serialize, type FormatOptions, type JsonError } from './logic';

type Outcome =
  | { kind: 'big' }
  | { kind: 'error'; error: JsonError }
  | { kind: 'ok'; output: string; warnings: string[]; bom: boolean; summary: string };

const MAX_LIVE = 5_000_000;
const SAMPLE = '{"name":"FileFreedom","tools":[{"id":1,"local":true},{"id":2,"local":true}],"note":"Edit me"}';

export default function View() {
  const [input, setInput] = useState('');
  const [indent, setIndent] = useState<FormatOptions['indent']>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const deferred = useDeferredValue(input);

  const result = useMemo<Outcome | null>(() => {
    if (deferred.trim() === '') return null;
    if (deferred.length > MAX_LIVE) return { kind: 'big' };
    const r = parseJson(deferred);
    if (!r.ok) return { kind: 'error', error: r.error };
    return { kind: 'ok', output: serialize(r.node, { indent, sortKeys }), warnings: r.warnings, bom: r.bomRemoved, summary: describeStructure(r.node) };
  }, [deferred, indent, sortKeys]);

  function jump(offset: number) {
    const el = area.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(offset, Math.min(offset + 1, el.value.length));
  }

  const snippet = (text: string, line: number) => text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/)[line - 1] ?? '';

  return (
    <div className="tool-grid two">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="panel-title">Your JSON</h2>
          <div className="actions">
            <button type="button" className="btn btn-sm" onClick={() => setInput(SAMPLE)}>Try an example</button>
            <TextFileButton onText={setInput} maxBytes={20_000_000} accept=".json,.txt,application/json,text/plain" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="json-in" className="sr-only">JSON input</label>
          <textarea ref={area} id="json-in" className="textarea" style={{ minHeight: '22rem' }} spellCheck={false} placeholder="Paste JSON here, or open a file" value={input} onChange={(e) => setInput(e.target.value)} aria-describedby="json-status" />
        </div>
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="hint">{formatBytes(new Blob([input]).size)}</span>
          {input && <button type="button" className="btn btn-sm btn-quiet" onClick={() => setInput('')}>Clear</button>}
        </div>
      </div>

      <div className="panel" id="json-status" aria-live="polite">
        <h2 className="panel-title">Result</h2>
        <Seg<string> name="indent" legend="Layout" value={String(indent)} onChange={(v) => setIndent(v === 'tab' || v === 'min' ? v : (Number(v) as 2 | 4))}
          options={[{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tabs' }, { value: 'min', label: 'Minified' }]} />
        <label className="check"><input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} /> Sort keys A to Z</label>

        {!result && <Notice kind="info">Paste or open some JSON to check and format it.</Notice>}
        {result?.kind === 'big' && <Notice kind="warn" title="This is too large to format as you type.">Files over {formatBytes(MAX_LIVE)} can make the page slow. Split the file, or use a command-line tool such as <code>jq</code>.</Notice>}
        {result?.kind === 'error' && (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <Notice kind="error" title={`Invalid JSON at line ${result.error.line}, column ${result.error.column}.`}>{result.error.message}</Notice>
            <pre className="output" aria-label="Line containing the error">{snippet(deferred, result.error.line).slice(0, 200)}{'\n'}{' '.repeat(Math.min(result.error.column - 1, 200))}^</pre>
            <div className="actions"><button type="button" className="btn btn-sm" onClick={() => jump(result.error.offset + (deferred.charCodeAt(0) === 0xfeff ? 1 : 0))}><Icon name="search" size={16} /> Jump to the error</button></div>
          </div>
        )}
        {result?.kind === 'ok' && (
          <>
            <Notice kind="ok" title="Valid JSON.">A {result.summary}.</Notice>
            {result.bom && <Notice kind="info">A hidden byte-order mark at the start of the file was removed.</Notice>}
            {result.warnings.map((w) => <Notice key={w} kind="warn">{w}</Notice>)}
            <pre className="output" tabIndex={0} aria-label="Formatted JSON">{result.output.length > 200_000 ? result.output.slice(0, 200_000) + '\n… preview shortened. Copy or download for the full result.' : result.output}</pre>
            <div className="actions">
              <CopyButton text={result.output} label="Copy result" />
              <DownloadButton blob={textBlob(result.output, 'application/json')} filename={indent === 'min' ? 'minified.json' : 'formatted.json'} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
