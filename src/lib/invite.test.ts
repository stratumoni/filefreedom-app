import { describe, expect, it } from 'vitest';
import { inviteUrl } from './invite';

describe('inviteUrl', () => {
  it('is the site home page with exactly one trailing slash', () => {
    expect(inviteUrl('https://example.com')).toBe('https://example.com/');
    expect(inviteUrl('https://example.com/')).toBe('https://example.com/');
    expect(inviteUrl('http://localhost:4173')).toBe('http://localhost:4173/');
  });
});
