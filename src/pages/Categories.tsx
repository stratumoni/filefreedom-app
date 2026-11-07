import { CategoryPill } from '@/components/ToolCards';
import { usePageTitle } from '@/lib/page';
import { CATEGORIES } from '@/registry/categories';

export default function Categories() {
  usePageTitle('Categories', 'Browse FileFreedom tools by category: images, PDF, data, documents and more.');
  return (
    <>
      <div className="page-head"><h1>Categories</h1><p>Each category shows how many tools you can use today. Planned categories are listed honestly so you know what is coming.</p></div>
      <ul className="cat-grid" role="list">{CATEGORIES.map((c) => <CategoryPill key={c.id} cat={c} />)}</ul>
    </>
  );
}
