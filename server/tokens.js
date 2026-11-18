// Signed links for the check-in email. A token carries the user id, the period, a purpose and
// an expiry, and is signed with HMAC-SHA256 using CHECKIN_TOKEN_SECRET.
//
//   checkin      lasts 35 days; can read first name and active habit sentences, and save that
//                month's check-in. Nothing else.
//   unsubscribe  never expires; can turn off monthly check-ins. Nothing else.

import { createHmac, timingSafeEqual } from 'node:crypto';

export const PURPOSES = ['checkin', 'unsubscribe'];
export const CHECKIN_TOKEN_DAYS = 35;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERIOD_RE = /^\d{4}-\d{2}-01$/;
const MAX_TOKEN_LENGTH = 600;

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(secret, body) {
  return createHmac('sha256', secret).update(body).digest();
}

function assertSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('CHECKIN_TOKEN_SECRET must be at least 32 characters');
  }
}

export function signToken({ userId, period, purpose, now = Date.now() }, secret) {
  assertSecret(secret);
  if (!UUID_RE.test(userId)) throw new Error('bad user id');
  if (!PERIOD_RE.test(period)) throw new Error('bad period');
  if (!PURPOSES.includes(purpose)) throw new Error('bad purpose');
  const exp = purpose === 'checkin' ? Math.floor(now / 1000) + CHECKIN_TOKEN_DAYS * 86400 : 0;
  const body = b64url(JSON.stringify({ u: userId, p: period, k: purpose, e: exp }));
  return `${body}.${b64url(sign(secret, body))}`;
}

/**
 * @returns {{ ok: true, userId, period, purpose } | { ok: false, reason }}
 */
export function verifyToken(token, { purpose, now = Date.now() }, secret) {
  assertSecret(secret);
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'malformed' };
  }
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' };
  const [body, sig] = parts;
  let given;
  try {
    given = Buffer.from(sig, 'base64url');
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const expected = sign(secret, body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'bad-signature' };
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'malformed' };
  if (payload.k !== purpose) return { ok: false, reason: 'wrong-purpose' };
  if (!UUID_RE.test(payload.u || '') || !PERIOD_RE.test(payload.p || '')) return { ok: false, reason: 'malformed' };
  if (purpose === 'checkin') {
    if (!Number.isInteger(payload.e) || payload.e <= 0) return { ok: false, reason: 'malformed' };
    if (Math.floor(now / 1000) > payload.e) return { ok: false, reason: 'expired' };
  }
  return { ok: true, userId: payload.u.toLowerCase(), period: payload.p, purpose: payload.k };
}

export function safeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
