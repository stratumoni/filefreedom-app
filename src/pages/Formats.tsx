import { Link } from 'react-router';
import { usePageTitle } from '@/lib/page';
import { TOOLS } from '@/registry/tools';

export default function Formats() {
  usePageTitle('Supported formats', 'Which file formats each FileFreedom tool accepts and produces, and the known limits of each.');
  const live = TOOLS.filter((t) => t.status === 'available' || t.status === 'beta');
  return (
    <>
      <div className="page-head"><h1>Supported formats</h1><p>Generated from the same list the tools use, so it cannot drift out of date.</p></div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th scope="col">Tool</th><th scope="col">Accepts</th><th scope="col">Produces</th></tr></thead>
          <tbody>
            {live.map((t) => (
              <tr key={t.id}>
                <td><Link to={`/tools/${t.slug}`}>{t.name}</Link></td>
                <td>{t.inputFormats.join(', ')}</td>
                <td>{t.outputFormats.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="prose" style={{ marginTop: 'var(--space-5)' }}>
        <p>* Depends on your browser. FileFreedom tests what your browser can actually create and only offers those formats.</p>
        <p>Not supported yet: HEIC/HEIF photos (most browsers cannot open them), SVG as an image input, RAW camera files, and animated output. Files are recognised by their contents, not just their name, so a PNG renamed to .jpg is handled as a PNG.</p>
      </div>
    </>
  );
}
