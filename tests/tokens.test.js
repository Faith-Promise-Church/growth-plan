import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../server/tokens.js';

const SECRET = 'test-secret-test-secret-test-secret-123';
const USER = '6f1c2a54-0d8b-4c1e-9a1b-2c3d4e5f6a7b';
const NOW = Date.UTC(2026, 11, 7, 13);

describe('signed links', () => {
  const checkin = signToken({ userId: USER, period: '2026-12-01', purpose: 'checkin', now: NOW }, SECRET);
  const unsub = signToken({ userId: USER, period: '2026-12-01', purpose: 'unsubscribe', now: NOW }, SECRET);

  it('verifies a good token', () => {
    expect(verifyToken(checkin, { purpose: 'checkin', now: NOW }, SECRET)).toEqual({ ok: true, userId: USER, period: '2026-12-01', purpose: 'checkin' });
  });

  it('check-in tokens last 35 days', () => {
    expect(verifyToken(checkin, { purpose: 'checkin', now: NOW + 34.9 * 86400000 }, SECRET).ok).toBe(true);
    expect(verifyToken(checkin, { purpose: 'checkin', now: NOW + 35 * 86400000 + 2000 }, SECRET)).toEqual({ ok: false, reason: 'expired' });
  });

  it('unsubscribe tokens never expire', () => {
    expect(verifyToken(unsub, { purpose: 'unsubscribe', now: NOW + 3650 * 86400000 }, SECRET).ok).toBe(true);
  });

  it('rejects the wrong purpose, including an unsubscribe token used to check in', () => {
    expect(verifyToken(unsub, { purpose: 'checkin', now: NOW }, SECRET)).toEqual({ ok: false, reason: 'wrong-purpose' });
    expect(verifyToken(checkin, { purpose: 'unsubscribe', now: NOW }, SECRET)).toEqual({ ok: false, reason: 'wrong-purpose' });
  });

  it('rejects tampering', () => {
    const [body, sig] = checkin.split('.');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    const forged = Buffer.from(JSON.stringify({ ...payload, u: '00000000-0000-4000-8000-000000000000' })).toString('base64url');
    expect(verifyToken(`${forged}.${sig}`, { purpose: 'checkin', now: NOW }, SECRET).ok).toBe(false);
    const longer = Buffer.from(JSON.stringify({ ...payload, e: payload.e + 999999 })).toString('base64url');
    expect(verifyToken(`${longer}.${sig}`, { purpose: 'checkin', now: NOW }, SECRET).ok).toBe(false);
    expect(verifyToken(`${body}.${sig.slice(0, -2)}AA`, { purpose: 'checkin', now: NOW }, SECRET).ok).toBe(false);
    expect(verifyToken(checkin, { purpose: 'checkin', now: NOW }, `${SECRET}x`).ok).toBe(false);
  });

  it('rejects junk', () => {
    for (const t of ['', 'abc', 'a.b.c', '.', `${'x'.repeat(700)}.y`, null, undefined, 42, {}]) {
      expect(verifyToken(t, { purpose: 'checkin', now: NOW }, SECRET).ok).toBe(false);
    }
  });

  it('refuses a short secret', () => {
    expect(() => signToken({ userId: USER, period: '2026-12-01', purpose: 'checkin' }, 'short')).toThrow();
  });
});
