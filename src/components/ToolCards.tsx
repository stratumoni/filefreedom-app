import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from './Icon';
import { ToolIllustration } from './ToolIllustration';
import { useFavorites } from '@/lib/storage';
import { categoryById } from '@/registry/categories';
import { TOOLS } from '@/registry/tools';
import type { Category, ToolMeta } from '@/registry/types';

export function ToolCard({ tool }: { tool: ToolMeta }) {
  const fav = useFavorites();
  const cat = categoryById(tool.category);
  const isFav = fav.has(tool.id);
  const [pop, setPop] = useState(false);
  return (
    <li>
      <div className="tool-card">
        <ToolIllustration id={tool.id} tone={cat?.tone ?? 'neutral'} />
        <div className="tool-body">
          <h3><Link className="stretch" to={`/tools/${tool.slug}`}>{tool.name}</Link></h3>
          <p>{tool.shortDescription}</p>
          <div className="tool-meta">
            <span>{cat?.name}</span>
            <span>{tool.inputFormats.slice(0, 3).join(', ')}</span>
          </div>
        </div>
        <span className="tool-arrow"><Icon name="arrowUpRight" size={16} /></span>
        <button type="button" className={`btn btn-quiet fav-btn${pop ? ' is-pop' : ''}`} aria-pressed={isFav} aria-label={`${isFav ? 'Remove' : 'Add'} ${tool.name} ${isFav ? 'from' : 'to'} favourites`} onClick={() => { setPop(!isFav); fav.toggle(tool.id); }} onAnimationEnd={() => setPop(false)}>
          <Icon name="star" size={19} strokeWidth={1.8} />
        </button>
      </div>
    </li>
  );
}

export function categoryCount(id: string) {
  return TOOLS.filter((t) => t.category === id && (t.status === 'available' || t.status === 'beta')).length;
}

export function CategoryPill({ cat }: { cat: Category }) {
  const n = categoryCount(cat.id);
  return (
    <li>
      <Link className={`tool-card cat-card${n === 0 ? ' is-planned' : ''}`} to={`/categories/${cat.id}`}>
        <ToolIllustration id={`cat-${cat.id}`} tone={cat.tone} />
        <span className="tool-body">
          <b>{cat.name}</b>
          <span className="sub">{n > 0 ? `${n} tool${n > 1 ? 's' : ''} available` : 'Planned'}</span>
        </span>
        <span className="tool-arrow"><Icon name="arrowUpRight" size={16} /></span>
      </Link>
    </li>
  );
}
