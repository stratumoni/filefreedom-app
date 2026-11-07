import { useEffect } from 'react';

const SITE = 'FileFreedom';

function setMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

/** Sets the document title and description for the current page. */
export function usePageTitle(title: string | null, description?: string, opts: { noindex?: boolean } = {}) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}` : `${SITE}: free file tools that run in your browser`;
    if (description) setMeta('description', description);
    setMeta('robots', opts.noindex ? 'noindex' : 'index,follow');
  }, [title, description, opts.noindex]);
}
