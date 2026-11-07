import { Link, useParams } from 'react-router';
import { ToolCard } from '@/components/ToolCards';
import { ToolIllustration } from '@/components/ToolIllustration';
import { EmptyState } from '@/components/EmptyState';
import { usePageTitle } from '@/lib/page';
import { categoryById } from '@/registry/categories';
import { TOOLS } from '@/registry/tools';
import NotFound from './NotFound';

export default function CategoryPage() {
  const { id = '' } = useParams();
  const cat = categoryById(id);
  const tools = TOOLS.filter((t) => t.category === id && (t.status === 'available' || t.status === 'beta'));
  usePageTitle(cat ? cat.name : null, cat ? `${cat.name} tools on FileFreedom. ${cat.blurb}` : undefined, { noindex: !cat || tools.length === 0 });
  if (!cat) return <NotFound />;
  return (
    <>
      <ol className="crumbs"><li><Link to="/">Home</Link></li><li><Link to="/categories">Categories</Link></li><li aria-current="page">{cat.name}</li></ol>
      <div className="page-head">
        <div className="row" style={{ alignItems: 'center' }}><ToolIllustration id={`cat-${cat.id}`} tone={cat.tone} className="head-art" /><h1>{cat.name}</h1></div>
        <p>{cat.blurb}</p>
      </div>
      {tools.length > 0
        ? <ul className="tool-list" role="list">{tools.map((t) => <ToolCard key={t.id} tool={t} />)}</ul>
        : (
          <EmptyState art={`cat-${cat.id}`} title="No tools in this category are available yet." actions={<Link className="btn btn-primary" to="/tools">See available tools</Link>}>
            This category is still being built. In the meantime, browse the tools that work today.
          </EmptyState>
        )}
    </>
  );
}
