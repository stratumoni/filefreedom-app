import { Link } from 'react-router';
import { usePageTitle } from '@/lib/page';
import { TOOLS } from '@/registry/tools';

export default function Privacy() {
  usePageTitle('Privacy and security', 'How FileFreedom handles your files: in-browser processing, what is stored on your device, and how to verify it yourself.');
  const live = TOOLS.filter((t) => t.status === 'available' || t.status === 'beta');
  return (
    <div className="prose" style={{ maxWidth: '52rem' }}>
      <div className="page-head"><h1>Privacy and security</h1><p>What happens to your files, what we store, and how to check it yourself instead of taking our word for it.</p></div>

      <h2>Your files are processed in your browser</h2>
      <p>The tools listed below read the file you choose into your browser’s memory, do the work there, and create the result on your device. They have no upload step and no server that receives your file.</p>
      <p>Two protections are easy to confuse. <strong>HTTPS</strong> protects the page while it loads. <strong>Local processing</strong> means the file is never sent anywhere in the first place. FileFreedom relies on the second for your files.</p>

      <h2>Check it yourself</h2>
      <ol>
        <li>Open your browser’s developer tools (F12, or Cmd+Option+I on a Mac) and choose the <strong>Network</strong> tab.</li>
        <li>Clear the list, then choose a file in any tool and run it.</li>
        <li>Watch the list. Loading the tool’s code may appear once; your file should never appear as something being sent.</li>
      </ol>

      <h2>What FileFreedom stores on your device</h2>
      <ul>
        <li>Your theme choice, your favourite tools, and a short list of recently opened tools, in your browser’s local storage.</li>
        <li>No file names, file contents or results. Results exist in memory until you close or reset the tool.</li>
      </ul>
      <p>You can erase all of it in <Link to="/settings">Settings</Link>.</p>

      <h2>Third parties</h2>
      <p>This version of FileFreedom loads no analytics, advertising, tracking or third-party fonts and scripts. Everything the page needs comes from its own address. Like any website, the company that hosts it can see ordinary request information, such as your IP address, when you load a page.</p>

      <h2>Verification status per tool</h2>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th scope="col">Tool</th><th scope="col">Runs in your browser</th></tr></thead>
          <tbody>
            {live.map((t) => (
              <tr key={t.id}>
                <td><Link to={`/tools/${t.slug}`}>{t.name}</Link></td>
                <td>{t.privacy.verified ? 'Yes. Checked by an automated network test in Chromium' : 'Designed to, not yet verified'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Limits of these promises</h2>
      <ul>
        <li>Browser extensions you have installed can read pages you visit. FileFreedom cannot control that.</li>
        <li>Files you download are your responsibility. Keep copies of originals; FileFreedom never changes the original file.</li>
        <li>These tools are not a substitute for encryption. Processing locally keeps a file off our servers; it does not hide it from people who use your device.</li>
      </ul>
    </div>
  );
}
