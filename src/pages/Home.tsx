import { Link } from 'react-router';
import { HeroStickers } from '@/components/HeroStickers';
import { SearchBox } from '@/components/SearchBox';
import { ToolIllustration, type Tone } from '@/components/ToolIllustration';
import { CategoryPill, ToolCard } from '@/components/ToolCards';
import { usePageTitle } from '@/lib/page';
import { useFavorites, useRecents } from '@/lib/storage';
import { CATEGORIES } from '@/registry/categories';
import { TOOLS, toolBySlug } from '@/registry/tools';

const TASKS: { label: string; to: string; art: string; tone: Tone }[] = [
  { label: 'Make a photo smaller', to: '/tools/image-compressor', art: 'image-compressor', tone: 'image' },
  { label: 'Get an image under 2 MB', to: '/tools/image-compressor?target=2', art: 'image-resizer', tone: 'image' },
  { label: 'Find out why a site rejects my image', to: '/tools/image-requirements-checker', art: 'image-requirements-checker', tone: 'image' },
  { label: 'Turn a CSV file into JSON', to: '/tools/csv-to-json', art: 'csv-to-json', tone: 'data' },
  { label: 'Check what a file really is', to: '/tools/file-inspector', art: 'file-inspector', tone: 'neutral' },
  { label: 'Verify a download’s checksum', to: '/tools/file-checksum', art: 'file-checksum', tone: 'security' },
];

export function Home() {
  usePageTitle(null, 'Compress, resize, convert and inspect files with free tools. Supported operations run on your device, so the file never has to be uploaded.');
  const recents = useRecents();
  const favs = useFavorites().ids;
  const recentTools = recents.map((id) => TOOLS.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t).slice(0, 3);
  const favTools = favs.map((id) => TOOLS.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t).slice(0, 3);
  void toolBySlug;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-stage">
          <HeroStickers />
          <div className="hero-copy">
            <h1 id="hero-title"><span>Every file.</span><span>Every tool.</span><span>Your device.</span></h1>
            <p className="hero-sub">Compress, convert, inspect and clean up files with free tools. Supported operations run in your browser, so the file stays with you.</p>
            <SearchBox large showExamples />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="tasks-title">
        <div className="section-head"><h2 id="tasks-title">Start with a task</h2></div>
        <ul className="task-list" role="list">
          {TASKS.map((t) => (
            <li key={t.label}>
              <Link className="task" to={t.to}>
                <ToolIllustration id={t.art} tone={t.tone} className="task-art" /><span>{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {(recentTools.length > 0 || favTools.length > 0) && (
        <section className="section" aria-labelledby="mine-title">
          <div className="section-head">
            <h2 id="mine-title">{favTools.length ? 'Your favourites' : 'Pick up where you left off'}</h2>
            <p>Saved only in this browser.</p>
          </div>
          <ul className="tool-list" role="list">{(favTools.length ? favTools : recentTools).map((t) => <ToolCard key={t.id} tool={t} />)}</ul>
        </section>
      )}

      <section className="section" aria-labelledby="cats-title">
        <div className="section-head">
          <h2 id="cats-title">Browse by category</h2>
          <p>Categories marked Planned are on the <Link to="/roadmap">roadmap</Link> and cannot be used yet.</p>
        </div>
        <ul className="cat-grid" role="list">{CATEGORIES.map((c) => <CategoryPill key={c.id} cat={c} />)}</ul>
      </section>

      <section className="section" aria-labelledby="how-title">
        <div className="section-head"><h2 id="how-title">What happens to your file</h2></div>
        <div className="how">
          <ol className="steps">
            <li><div><h3>You choose a file</h3><p>Your browser reads it from your device. FileFreedom does not have an upload step for these tools.</p></div></li>
            <li><div><h3>Your device does the work</h3><p>Compressing, converting and inspecting happen inside the page, in your browser’s memory.</p></div></li>
            <li><div><h3>You download the result</h3><p>The new file is created on your device. Closing the tab clears it. <Link to="/privacy">See how to verify this yourself.</Link></p></div></li>
          </ol>
        </div>
      </section>
    </>
  );
}
