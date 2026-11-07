import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Icon } from '@/components/Icon';
import { SearchBox } from '@/components/SearchBox';
import { ToolCard } from '@/components/ToolCards';
import { EmptyState } from '@/components/EmptyState';
import { usePageTitle } from '@/lib/page';
import { search } from '@/lib/search';
import { clearRecents, useFavorites, useRecents } from '@/lib/storage';
import { CATEGORIES } from '@/registry/categories';
import { TOOLS } from '@/registry/tools';

export default function AllTools() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const view = params.get('view');
  const cat = params.get('category');
  const favs = useFavorites().ids;
  const recents = useRecents();
  usePageTitle(view === 'favorites' ? 'Favourite tools' : view === 'recent' ? 'Recent tools' : 'All tools', 'Every FileFreedom tool that is available now, searchable by task, name or file type.');

  const live = TOOLS.filter((t) => t.status === 'available' || t.status === 'beta');
  const result = useMemo(() => (q ? search(q) : null), [q]);

  let list = live;
  if (result) list = result.tools.map((h) => h.tool);
  else if (view === 'favorites') list = favs.map((id) => live.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  else if (view === 'recent') list = recents.map((id) => live.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  if (cat) list = list.filter((t) => t.category === cat);

  const title = q ? `Results for “${q}”` : view === 'favorites' ? 'Favourite tools' : view === 'recent' ? 'Recent tools' : 'All tools';
  const usedCats = CATEGORIES.filter((c) => live.some((t) => t.category === c.id));

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        <p>{q ? `${list.length} available tool${list.length === 1 ? '' : 's'} found.` : `${live.length} tools you can use right now. More are on the roadmap.`}</p>
        <SearchBox placeholder="Search" />
      </div>

      {!q && !view && (
        <div className="chips" role="group" aria-label="Filter by category" style={{ marginBottom: 'var(--space-5)' }}>
          <button type="button" className="chip" aria-pressed={!cat} onClick={() => setParams({})}>All</button>
          {usedCats.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={cat === c.id} onClick={() => setParams({ category: c.id })}>{c.name}</button>
          ))}
        </div>
      )}

      {view === 'recent' && recents.length > 0 && (
        <p style={{ marginBottom: 'var(--space-4)' }}><button type="button" className="btn btn-sm" onClick={clearRecents}><Icon name="trash" size={16} /> Clear recent tools</button></p>
      )}

      {list.length > 0 ? (
        <ul className="tool-list" role="list">{list.map((t) => <ToolCard key={t.id} tool={t} />)}</ul>
      ) : (
        <>
          {view === 'favorites' && !q && (
            <EmptyState art="favorites" title="No favourites yet." actions={<Link className="btn btn-primary" to="/tools">See all tools</Link>}>
              Choose the star on any tool to keep it here. Favourites are saved only in this browser.
            </EmptyState>
          )}
          {view === 'recent' && !q && (
            <EmptyState art="recent" title="No recent tools yet." actions={<Link className="btn btn-primary" to="/tools">See all tools</Link>}>
              Tools you open will appear here. This list is stored only in this browser.
            </EmptyState>
          )}
          {q && (
            <EmptyState
              art="search"
              title={result?.unsupportedFormat ? `No available tool handles .${result.unsupportedFormat} files yet.` : `No available tool matches “${q}”.`}
              actions={<><Link className="btn btn-primary" to="/categories">Browse the categories</Link><Link className="btn" to="/tools">See all tools</Link></>}
            >
              Try other words, such as “compress image”, “csv to json” or a file type like “png”.
            </EmptyState>
          )}
          {!q && !view && (
            <EmptyState art="category" title="No tools in this category yet." actions={<Link className="btn btn-primary" to="/tools">See all tools</Link>} />
          )}
        </>
      )}
    </>
  );
}
