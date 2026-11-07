import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { EmptyState } from './EmptyState';
import { Icon } from './Icon';
import { EXAMPLE_SEARCHES, search } from '@/lib/search';
import { categoryById } from '@/registry/categories';

interface Props { large?: boolean; autoFocus?: boolean; onDone?: () => void; placeholder?: string; showExamples?: boolean }

/** Typed text is shown muted and the completion in full strength, like a search suggestion. */
function Typed({ text, q }: { text: string; q: string }) {
  const t = q.trim();
  if (t && text.toLowerCase().startsWith(t.toLowerCase())) {
    return <><span className="typed">{text.slice(0, t.length)}</span>{text.slice(t.length)}</>;
  }
  return <>{text}</>;
}

export function SearchBox({ large, autoFocus, onDone, placeholder = 'Search', showExamples }: Props) {
  const nav = useNavigate();
  const listId = useId();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const res = useMemo(() => search(q), [q]);
  const tools = res.tools.slice(0, 6);
  const hasQuery = q.trim().length > 0;
  const expanded = open && hasQuery;

  const go = (to: string) => { setOpen(false); setQ(''); onDone?.(); nav(to); };

  function submit() {
    if (!hasQuery) { input.current?.focus(); return; }
    const target = tools[active >= 0 ? active : 0];
    go(target ? `/tools/${target.tool.slug}` : `/tools?q=${encodeURIComponent(q.trim())}`);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(tools.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === 'Escape') { if (open) { e.stopPropagation(); setOpen(false); setActive(-1); } }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (hasQuery) submit();
    }
  }

  return (
    <div className={`searchbox${large ? ' searchbox-lg' : ''}`}>
      <div className="searchbox-field">
        <Icon name="search" size={large ? 26 : 22} />
        <input
          ref={input} type="search" role="combobox" aria-expanded={expanded} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} aria-label="Search tools by task, name or file type"
          placeholder={placeholder} value={q} autoFocus={autoFocus} autoComplete="off" spellCheck={false} enterKeyHint="search"
          onChange={(e) => { setQ(e.target.value); setActive(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
        />
        <button type="button" className="searchbox-go" aria-label="Search" onMouseDown={(e) => e.preventDefault()} onClick={submit}><Icon name="next" size={large ? 22 : 18} /></button>
      </div>
      <div aria-live="polite" className="sr-only">{hasQuery ? `${res.tools.length} available tool${res.tools.length === 1 ? '' : 's'} found` : ''}</div>
      {expanded && (
        <ul id={listId} role="listbox" aria-label="Matching tools" className="results">
          {tools.map((h, i) => (
            <li key={h.tool.id} id={`${listId}-${i}`} role="option" aria-selected={i === active} className="result"
              onMouseDown={(e) => { e.preventDefault(); go(`/tools/${h.tool.slug}`); }} onMouseEnter={() => setActive(i)}>
              <Icon name="search" size={18} />
              <span className="result-text">
                <span className="result-title"><Typed text={h.tool.name} q={q} /></span>
              </span>
              <span className="result-where">{categoryById(h.tool.category)?.name}</span>
            </li>
          ))}
          {tools.length === 0 && (
            <li role="presentation" className="empty">
              <EmptyState art="search" compact heading="p" title={res.unsupportedFormat ? `No tool handles .${res.unsupportedFormat} files yet.` : `Nothing available matches “${q.trim()}”.`}>
                Try different words, such as “compress image”, “csv to json” or a file type like “png”.
              </EmptyState>
            </li>
          )}
          {tools.length === 0 && (
            <li role="presentation" style={{ padding: '0 var(--space-3) var(--space-3)' }}>
              <a className="chip" href={`/tools?q=${encodeURIComponent(q.trim())}`} onMouseDown={(e) => { e.preventDefault(); go(`/tools?q=${encodeURIComponent(q.trim())}`); }}>Browse all tools</a>
            </li>
          )}
        </ul>
      )}
      {showExamples && (
        <div className="chips" style={{ marginTop: 'var(--space-4)' }}>
          {EXAMPLE_SEARCHES.map((ex) => (
            <button key={ex} type="button" className="chip" onClick={() => { setQ(ex); setOpen(true); input.current?.focus(); }}>{ex}</button>
          ))}
        </div>
      )}
    </div>
  );
}
