import { Component, Suspense, lazy, useEffect, type ComponentType, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Icon } from '@/components/Icon';
import { ToolCard } from '@/components/ToolCards';
import { Notice } from '@/components/ui';
import { usePageTitle } from '@/lib/page';
import { addRecent } from '@/lib/storage';
import { categoryById } from '@/registry/categories';
import { TOOLS, toolBySlug } from '@/registry/tools';
import type { ToolMeta } from '@/registry/types';
import NotFound from './NotFound';

const VIEWS: Record<string, ComponentType> = Object.fromEntries(TOOLS.filter((t) => t.loadModule).map((t) => [t.id, lazy(t.loadModule!)]));

class LoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Notice kind="error" title="This tool could not be loaded.">
        Check your connection and <button type="button" className="btn btn-sm" onClick={() => location.reload()}>reload the page</button>. Your files are not affected.
      </Notice>
    );
  }
}

export function ProcessingBadge({ tool }: { tool: ToolMeta }) {
  return tool.privacy.verified
    ? <span className="badge badge-ok"><Icon name="lock" size={14} /> Runs in your browser</span>
    : <span className="badge badge-warn"><Icon name="warn" size={14} /> Local processing not yet verified</span>;
}

export default function ToolPage() {
  const { slug = '' } = useParams();
  const tool = toolBySlug(slug);
  const usable = !!tool && !!tool.loadModule && (tool.status === 'available' || tool.status === 'beta');
  usePageTitle(usable ? tool.name : null, usable ? `${tool.name}: ${tool.shortDescription}` : undefined, { noindex: !usable });
  useEffect(() => { if (usable) addRecent(tool.id); }, [usable, tool?.id]);

  if (!usable) return <NotFound />;
  const cat = categoryById(tool.category);
  const View = VIEWS[tool.id]!;
  const related = tool.related.map((id) => TOOLS.find((t) => t.id === id)).filter((t): t is ToolMeta => !!t && t.status === 'available');

  return (
    <>
      <ol className="crumbs">
        <li><Link to="/">Home</Link></li>
        <li><Link to={`/categories/${tool.category}`}>{cat?.name}</Link></li>
        <li aria-current="page">{tool.name}</li>
      </ol>
      <header className="tool-head">
        <h1>{tool.name}</h1>
        <p style={{ color: 'var(--c-muted)', fontSize: 'var(--text-md)' }}>{tool.shortDescription}</p>
        <div className="badges">
          <ProcessingBadge tool={tool} />
          <span className="badge">Accepts {tool.inputFormats.join(', ')}</span>
        </div>
      </header>

      <LoadBoundary>
        <Suspense fallback={<p role="status">Loading tool…</p>}><View /></Suspense>
      </LoadBoundary>

      <section className="tool-about" aria-label="About this tool">
        <div className="prose">
          <h2>About your file’s privacy</h2>
          <p>{tool.privacy.explanation}</p>
          {!tool.privacy.verified && <p>This claim has not been verified for this tool yet, so treat it as the design intent until the badge above says otherwise.</p>}
          <p><Link to="/privacy">How to check this yourself</Link></p>
        </div>
        <div className="prose">
          <h2>Good to know</h2>
          <ul>{tool.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
        {related.length > 0 && (
          <div className="prose">
            <h2>Related tools</h2>
            <ul className="tool-list" role="list">{related.map((t) => <ToolCard key={t.id} tool={t} />)}</ul>
          </div>
        )}
      </section>
    </>
  );
}
