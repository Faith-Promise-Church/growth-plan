import { describe, it, expect } from 'vitest';
import { isUnreachable, readResetLink } from '../src/lib/resetLink.js';

const HASH = '20b9697f76710e470bca3df16d933da2ee82bc943083ee6fc88da443';

describe('the reset link in the address', () => {
  it('reads the one-time link the email carries', () => {
    expect(readResetLink(`?token_hash=${HASH}&type=recovery`)).toEqual({ kind: 'link', tokenHash: HASH });
    expect(readResetLink(`?type=recovery&token_hash=pkce_${HASH}`)).toEqual({ kind: 'link', tokenHash: `pkce_${HASH}` });
  });

  it('treats a missing type as a reset', () => {
    expect(readResetLink(`?token_hash=${HASH}`)).toEqual({ kind: 'link', tokenHash: HASH });
  });

  it('reports no link for an older email or a direct visit', () => {
    expect(readResetLink('')).toEqual({ kind: 'none' });
    expect(readResetLink(undefined)).toEqual({ kind: 'none' });
    expect(readResetLink('?next=/home')).toEqual({ kind: 'none' });
  });

  it('refuses a link of another kind or a broken one', () => {
    expect(readResetLink(`?token_hash=${HASH}&type=signup`)).toEqual({ kind: 'invalid' });
    expect(readResetLink('?token_hash=&type=recovery')).toEqual({ kind: 'invalid' });
    expect(readResetLink('?token_hash=short&type=recovery')).toEqual({ kind: 'invalid' });
    expect(readResetLink(`?token_hash=${HASH}%20OR%201&type=recovery`)).toEqual({ kind: 'invalid' });
    expect(readResetLink(`?token_hash=${'a'.repeat(300)}&type=recovery`)).toEqual({ kind: 'invalid' });
  });
});

describe('telling a lost connection from a spent link', () => {
  it('knows when the server was not reached', () => {
    expect(isUnreachable({ name: 'AuthRetryableFetchError', message: '' })).toBe(true);
    expect(isUnreachable({ message: 'Failed to fetch' })).toBe(true);
    expect(isUnreachable({ message: 'NetworkError when attempting to fetch resource.' })).toBe(true);
  });

  it('does not mistake a used link for a lost connection', () => {
    expect(isUnreachable({ code: 'otp_expired', message: 'Email link is invalid or has expired' })).toBe(false);
    expect(isUnreachable(null)).toBe(false);
  });
});
