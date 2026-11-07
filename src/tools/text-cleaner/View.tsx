import { useDeferredValue, useMemo, useState } from 'react';
import { CopyButton, DownloadButton, Notice, Stat } from '@/components/ui';
import { TextFileButton, textBlob } from '../_shared/TextFileButton';
import { DEFAULT_CLEAN, cleanText, textStats, type CleanOptions } from './logic';

export default function View() {
  const [input, setInput] = useState('');
  const [o, setO] = useState<CleanOptions>(DEFAULT_CLEAN);
  const deferred = useDeferredValue(input);
  const set = <K extends keyof CleanOptions>(k: K, v: CleanOptions[K]) => setO((p) => ({ ...p, [k]: v }));
  const out = useMemo(() => cleanText(deferred, o), [deferred, o]);
  const before = textStats(deferred);
  const after = textStats(out);
  const tooBig = input.length > 5_000_000;

  const check = (k: 'trimLines' | 'collapseSpaces' | 'removeDuplicates' | 'duplicatesIgnoreCase' | 'straightenQuotes' | 'removeInvisible', label: string, hint?: string) => (
    <label className="check"><input type="checkbox" checked={o[k]} onChange={(e) => set(k, e.target.checked)} /><span>{label}{hint && <><br /><span className="hint">{hint}</span></>}</span></label>
  );

  return (
    <div className="tool-grid two">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="panel-title">Your text</h2>
          <TextFileButton onText={setInput} maxBytes={10_000_000} accept=".txt,.md,.log,.csv,text/plain" />
        </div>
        <div className="field">
          <label htmlFor="tc-in" className="sr-only">Text to clean</label>
          <textarea id="tc-in" className="textarea" style={{ minHeight: '14rem', fontFamily: 'var(--font-sans)' }} placeholder="Paste or type text here" value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
        <fieldset>
          <legend>Tidy up</legend>
          {check('trimLines', 'Trim spaces at the start and end of each line')}
          {check('collapseSpaces', 'Turn repeated spaces into one')}
          {check('removeInvisible', 'Remove invisible characters', 'Zero-width spaces and soft hyphens that often arrive when copying from web pages.')}
          {check('straightenQuotes', 'Replace curly quotes with straight quotes')}
        </fieldset>
        <div className="row">
          <div className="field"><label htmlFor="blank">Blank lines</label>
            <select id="blank" className="select" value={o.blankLines} onChange={(e) => set('blankLines', e.target.value as CleanOptions['blankLines'])}>
              <option value="keep">Keep as they are</option><option value="collapse">Keep at most one in a row</option><option value="remove">Remove all</option>
            </select></div>
          <div className="field"><label htmlFor="case">Letter case</label>
            <select id="case" className="select" value={o.caseMode} onChange={(e) => set('caseMode', e.target.value as CleanOptions['caseMode'])}>
              <option value="none">Leave as is</option><option value="upper">UPPERCASE</option><option value="lower">lowercase</option><option value="title">Capitalize Each Word</option><option value="sentence">Sentence case</option>
            </select></div>
        </div>
        <div className="row">
          <div className="field"><label htmlFor="sort">Sort lines</label>
            <select id="sort" className="select" value={o.sort} onChange={(e) => set('sort', e.target.value as CleanOptions['sort'])}>
              <option value="none">Do not sort</option><option value="az">A to Z</option><option value="za">Z to A</option><option value="natural">Natural (file2 before file10)</option><option value="length">Shortest first</option>
            </select>
            {o.sort !== 'none' && <span className="hint">Sorting removes blank lines.</span>}</div>
          <div className="field"><label htmlFor="eol">Line endings</label>
            <select id="eol" className="select" value={o.lineEnding} onChange={(e) => set('lineEnding', e.target.value as CleanOptions['lineEnding'])}>
              <option value="lf">Unix / macOS (LF)</option><option value="crlf">Windows (CRLF)</option>
            </select></div>
        </div>
        {check('removeDuplicates', 'Remove duplicate lines', 'Keeps the first copy of each line.')}
        {o.removeDuplicates && check('duplicatesIgnoreCase', 'Treat upper and lower case as the same')}
      </div>

      <div className="panel" aria-live="polite">
        <h2 className="panel-title">Cleaned text</h2>
        {tooBig && <Notice kind="warn">Large text can make this page slow.</Notice>}
        <dl className="stats">
          <Stat label="Characters" value={`${before.characters.toLocaleString()} → ${after.characters.toLocaleString()}`} small />
          <Stat label="Words" value={`${before.words.toLocaleString()} → ${after.words.toLocaleString()}`} small />
          <Stat label="Lines" value={`${before.lines.toLocaleString()} → ${after.lines.toLocaleString()}`} small />
        </dl>
        <div className="field">
          <label htmlFor="tc-out" className="sr-only">Cleaned text</label>
          <textarea id="tc-out" className="textarea" style={{ minHeight: '20rem', fontFamily: 'var(--font-sans)' }} readOnly value={out} placeholder="The cleaned text appears here" />
        </div>
        <div className="actions">
          <CopyButton text={out} label="Copy text" />
          <DownloadButton blob={textBlob(out, 'text/plain')} filename="cleaned.txt" />
        </div>
      </div>
    </div>
  );
}
