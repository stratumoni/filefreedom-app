import { Link } from 'react-router';
import { usePageTitle } from '@/lib/page';

export default function About() {
  usePageTitle('About', 'What FileFreedom is, the principles behind it, and what is not built yet.');
  return (
    <div className="prose" style={{ maxWidth: '48rem' }}>
      <div className="page-head"><h1>About FileFreedom</h1><p>Practical file tools that respect the file.</p></div>
      <p>FileFreedom is a collection of everyday file tools: make a photo smaller, change its format, check what a file really is, tidy some text. The tools that are available now do their work in your browser.</p>
      <h2>Principles</h2>
      <ul>
        <li><strong>Local first.</strong> If a task can be done on your device, it is.</li>
        <li><strong>Honest labels.</strong> “Runs in your browser” appears only after an automated network test confirms it. Unbuilt tools are marked Planned and cannot be opened.</li>
        <li><strong>Plain results.</strong> You see what changed, in measured numbers, before you download. Originals are never modified.</li>
        <li><strong>No account, no tracking.</strong> Nothing to sign up for.</li>
      </ul>
      <h2>What is not here yet</h2>
      <p>Video, audio, PDF and many other tools are on the <Link to="/roadmap">roadmap</Link>. This version is an early release: it includes only tools that have been built and tested. If something does not work as described, that is a bug worth knowing about.</p>
    </div>
  );
}
