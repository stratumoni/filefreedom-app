import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { SHARE_TEXT, SHARE_TITLE, inviteUrl } from '@/lib/invite';

type Status = 'copied' | 'copied-to-share' | 'copy-failed' | null;

/** Invite link: the site's address on one line, with Copy and Share. Without a share sheet, Share copies the link. */
export function InviteLink() {
  const url = inviteUrl(window.location.origin);
  const field = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), status === 'copy-failed' ? 8000 : 2500);
    return () => clearTimeout(t);
  }, [status]);

  async function copy(done: 'copied' | 'copied-to-share' = 'copied') {
    try {
      await navigator.clipboard.writeText(url);
      setStatus(done);
    } catch {
      // Clipboard blocked (insecure page, denied permission): select the link so the visitor can copy it by hand.
      field.current?.focus();
      field.current?.select();
      setStatus('copy-failed');
    }
  }

  async function share() {
    if (typeof navigator.share !== 'function') { await copy('copied-to-share'); return; }
    try {
      await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return; // the visitor closed the share sheet
      await copy('copied-to-share');
    }
  }

  return (
    <>
      <div className="set-invite">
        <Icon name="link" size={18} />
        <input ref={field} type="text" readOnly value={url} aria-label="Invite link" spellCheck={false} autoComplete="off" onFocus={(e) => e.currentTarget.select()} />
        <div className="actions">
          <button type="button" className="btn btn-sm" onClick={() => copy()}>
            <Icon name={status === 'copied' ? 'check' : 'copy'} size={16} />
            {status === 'copied' ? 'Copied' : 'Copy'}
          </button>
          <button type="button" className="btn btn-sm" onClick={share}><Icon name="share" size={16} /> Share</button>
        </div>
      </div>
      <p className="set-status" aria-live="polite">
        {status === 'copied' && 'Link copied.'}
        {status === 'copied-to-share' && 'Link copied. Paste it wherever you want to share it.'}
        {status === 'copy-failed' && 'Your browser blocked copying. The link is selected: press Ctrl+C (⌘C on a Mac).'}
      </p>
    </>
  );
}
