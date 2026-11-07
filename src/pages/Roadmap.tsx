import { usePageTitle } from '@/lib/page';
import { CATEGORIES } from '@/registry/categories';
import { PLANNED_TOOLS } from '@/registry/planned';

export default function Roadmap() {
  usePageTitle('Roadmap', 'Tools planned for FileFreedom. None of these can be used yet.');
  return (
    <>
      <div className="page-head"><h1>Roadmap</h1><p>These tools are planned. They cannot be used yet and have no dates. A tool moves to the main list only after it works and has been tested.</p></div>
      {CATEGORIES.map((c) => {
        const items = PLANNED_TOOLS.filter((p) => p.category === c.id);
        if (!items.length) return null;
        return (
          <section key={c.id} className="section" style={{ marginTop: 'var(--space-6)' }} aria-labelledby={`r-${c.id}`}>
            <h2 id={`r-${c.id}`} style={{ fontSize: 'var(--text-lg)' }}>{c.name}</h2>
            <div className="chips">{items.map((p) => <span key={p.id} className="badge badge-plan">{p.name}</span>)}</div>
          </section>
        );
      })}
    </>
  );
}
