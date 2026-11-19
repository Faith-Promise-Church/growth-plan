// The reset email links to /reset-password?token_hash=...&type=recovery on our own site.
// Opening that page does nothing to the link. It is spent only when the person saves a new
// password, so a mail scanner that opens every link first cannot use it up.

const TOKEN = /^[A-Za-z0-9_-]{16,256}$/;

// Returns { kind: 'none' } when the address carries no link (an older email, or a direct visit),
// { kind: 'invalid' } when it carries one we cannot use, and { kind: 'link', tokenHash } otherwise.
export function readResetLink(search) {
  const params = new URLSearchParams(search ?? '');
  const tokenHash = params.get('token_hash');
  if (tokenHash == null) return { kind: 'none' };
  const type = params.get('type') ?? 'recovery';
  if (type !== 'recovery' || !TOKEN.test(tokenHash)) return { kind: 'invalid' };
  return { kind: 'link', tokenHash };
}

// True when a call failed because the server could not be reached, so nothing was spent.
export function isUnreachable(error) {
  if (!error) return false;
  return error.name === 'AuthRetryableFetchError' || /fetch|network/i.test(error.message ?? '');
}
