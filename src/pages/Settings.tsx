import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { InviteLink } from '@/components/InviteCard';
import { clearRecents, resetAllPreferences, setTheme, useFavorites, useRecents, useTheme, type ThemePref } from '@/lib/storage';
import { usePageTitle } from '@/lib/page';

/* Same look as the sidebar: plain line icon, label, muted count, pill hover. Titled groups, no cards. */

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="set-group" aria-labelledby={id}>
      <h2 id={id} className="set-heading">{title}</h2>
      {children}
    </section>
  );
}

function LinkRow({ to, icon, title, meta }: { to: string; icon: string; title: string; meta?: string }) {
  return (
    <li>
      <Link to={to} className="set-row">
        <Icon name={icon} size={18} />
        <span className="set-title">{title}</span>
        {meta && <span className="set-meta">{meta}</span>}
        <Icon name="next" size={16} className="set-chev" />
      </Link>
    </li>
  );
}

function ButtonRow({ icon, title, onClick, disabled, danger }: { icon: string; title: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <li>
      <button type="button" className={danger ? 'set-row is-danger' : 'set-row'} onClick={onClick} disabled={disabled}>
        <Icon name={icon} size={18} />
        <span className="set-title">{title}</span>
      </button>
    </li>
  );
}

const THEMES: { value: ThemePref; label: string; icon: string }[] = [
  { value: 'system', label: 'Match my device', icon: 'monitor' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dim', label: 'Dim', icon: 'dim' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

function Mini({ look }: { look: 'light' | 'dim' | 'dark' }) {
  return <span className="theme-mini" data-look={look}><i /><b /><i /></span>;
}

/** A plain row like the others, with four little previews under it instead of a list of words. */
function ThemeCard() {
  const theme = useTheme();
  return (
    <div className="set-theme">
      <div className="set-row"><Icon name="palette" size={18} /><span className="set-title">Theme</span></div>
      <fieldset>
        <legend className="sr-only">Theme</legend>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <label key={t.value} className="theme-opt">
              <input type="radio" name="theme" value={t.value} checked={theme === t.value} onChange={() => setTheme(t.value)} />
              <span className="theme-swatch" aria-hidden="true">
                {t.value === 'system' ? <><Mini look="light" /><Mini look="dark" /></> : <Mini look={t.value} />}
                <Icon name="check" size={14} className="theme-check" strokeWidth={3} />
              </span>
              <span className="theme-name"><Icon name={t.icon} size={16} />{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export default function Settings() {
  usePageTitle('Settings', 'Theme, invite link and stored preferences for FileFreedom.');
  const favs = useFavorites();
  const recents = useRecents();
  const [msg, setMsg] = useState('');
  return (
    <div className="set-page">
      <div className="page-head"><h1>Settings</h1><p>Everything here is saved only in this browser. No files or file names are stored.</p></div>

      <Group title="Appearance">
        <ThemeCard />
      </Group>

      <Group title="Invite">
        <InviteLink />
      </Group>

      <Group title="Stored on this device">
        <ul className="set-list">
          <LinkRow to="/tools?view=favorites" icon="star" title="Favourite tools" meta={String(favs.ids.length)} />
          <LinkRow to="/tools?view=recent" icon="history" title="Recent tools" meta={String(recents.length)} />
          <ButtonRow icon="reset" title="Clear recent tools" disabled={recents.length === 0} onClick={() => { clearRecents(); setMsg('Recent tools cleared.'); }} />
          <ButtonRow icon="trash" danger title="Erase all saved preferences" onClick={() => { resetAllPreferences(); setMsg('All saved preferences were erased.'); }} />
        </ul>
        <p className="set-status" aria-live="polite">{msg}</p>
      </Group>

      <Group title="Help and about">
        <ul className="set-list">
          <LinkRow to="/privacy" icon="shield" title="Privacy & security" />
          <LinkRow to="/formats" icon="files" title="Supported formats" />
          <LinkRow to="/roadmap" icon="route" title="Roadmap" />
          <LinkRow to="/about" icon="info" title="About" />
        </ul>
      </Group>
    </div>
  );
}
