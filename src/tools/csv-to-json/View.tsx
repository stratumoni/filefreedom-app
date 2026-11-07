import { useDeferredValue, useMemo, useState } from 'react';
import { CopyButton, DownloadButton, Notice, Seg, Stat } from '@/components/ui';
import { baseName } from '@/lib/format';
import { TextFileButton, textBlob } from '../_shared/TextFileButton';
import { DELIMITERS, convertRows, detectDelimiter, parseCsv, type ConvertOptions, type Delimiter } from './logic';

const PREVIEW = 100_000;
const SAMPLE = 'name,city,visits\nAda,London,12\n"Smith, Bob",Paris,007\n';

export default function View() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('data');
  const [delim, setDelim] = useState<'auto' | Delimiter>('auto');
  const [header, setHeader] = useState(true);
  const [infer, setInfer] = useState(false);
  const [shape, setShape] = useState<ConvertOptions['shape']>('objects');
  const [indent, setIndent] = useState<ConvertOptions['indent']>(2);
  const deferred = useDeferredValue(text);

  const out = useMemo(() => {
    if (deferred.trim() === '') return null;
    const d = delim === 'auto' ? detectDelimiter(deferred) : delim;
    const parsed = parseCsv(deferred, d);
    const conv = convertRows(parsed.rows, { header, infer, shape, indent });
    return { d, ...conv, warnings: [...parsed.warnings, ...conv.warnings] };
  }, [deferred, delim, header, infer, shape, indent]);

  const label = (d: Delimiter) => DELIMITERS.find((x) => x.value === d)!.label.toLowerCase();

  return (
    <div className="tool-grid two">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="panel-title">Your CSV</h2>
          <div className="actions">
            <button type="button" className="btn btn-sm" onClick={() => { setText(SAMPLE); setFileName('example'); }}>Try an example</button>
            <TextFileButton onText={(t, n) => { setText(t); setFileName(baseName(n)); }} maxBytes={20_000_000} accept=".csv,.tsv,.txt,text/csv,text/plain" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="csv-in" className="sr-only">CSV input</label>
          <textarea id="csv-in" className="textarea" style={{ minHeight: '16rem', whiteSpace: 'pre', overflow: 'auto' }} spellCheck={false} placeholder="Paste CSV here, or open a file" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="delim">Separator</label>
            <select id="delim" className="select" value={delim} onChange={(e) => setDelim(e.target.value as 'auto' | Delimiter)}>
              <option value="auto">Detect automatically{out && delim === 'auto' ? ` (${label(out.d)})` : ''}</option>
              {DELIMITERS.map((d) => <option key={d.label} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>
        <label className="check"><input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} /> The first row contains column names</label>
        <label className="check"><input type="checkbox" checked={infer} onChange={(e) => setInfer(e.target.checked)} /><span>Detect numbers, true/false and empty cells<br /><span className="hint">Off by default so no value is changed silently.</span></span></label>
        <Seg<ConvertOptions['shape']> name="shape" legend="Output shape" value={shape} onChange={setShape} options={[{ value: 'objects', label: 'List of objects' }, { value: 'arrays', label: 'List of lists' }]} />
        <Seg<string> name="csv-indent" legend="Layout" value={String(indent)} onChange={(v) => setIndent(Number(v) as ConvertOptions['indent'])} options={[{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: '0', label: 'Compact' }]} />
      </div>

      <div className="panel" aria-live="polite">
        <h2 className="panel-title">JSON result</h2>
        {!out && <Notice kind="info">Paste or open a CSV file to convert it.</Notice>}
        {out && (
          <>
            <dl className="stats"><Stat label="Rows" value={out.rowCount.toLocaleString()} /><Stat label="Columns" value={out.columnCount} /></dl>
            {out.warnings.map((w) => <Notice key={w} kind="warn">{w}</Notice>)}
            <pre className="output" tabIndex={0} aria-label="JSON output">{out.json.length > PREVIEW ? out.json.slice(0, PREVIEW) + '\n… preview shortened. Copy or download for the full result.' : out.json}</pre>
            <div className="actions">
              <CopyButton text={out.json} label="Copy JSON" />
              <DownloadButton blob={textBlob(out.json, 'application/json')} filename={`${fileName}.json`} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
