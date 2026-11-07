/** Invite link: the site's own address plus the wording used when it is shared. Nothing is sent or stored. */
export const SHARE_TITLE = 'FileFreedom';
export const SHARE_TEXT = 'Free file tools that run in your browser, so your files stay on your device.';

/** The address people are invited to: this site's home page. */
export function inviteUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/`;
}
