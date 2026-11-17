import { describe, it, expect } from 'vitest';
import { createHandlers } from '../server/handlers.js';
import { signToken } from '../server/tokens.js';
import { createFakeServerDb, createFakeMailer, TEST_ENV } from './helpers/fakeServerDb.js';

const NOW = new Date('2026-12-08T15:00:00Z');
const PERIOD = '2026-12-01';
const BASE = 'https://growthplan.example.org';

function setup() {
  const db = createFakeServerDb({ clock: () => NOW.getTime() });
  const mailer = createFakeMailer();
  const alice = db.addPerson({ first: 'Alice', habits: 3 });
  const bob = db.addPerson({ first: 'Bob', habits: 2 });
  const admin = db.addPerson({ first: 'Ada', admin: true });
  db.tables.authTokens.set('jwt-alice', alice);
  db.tables.authTokens.set('jwt-admin', admin);
  const h = createHandlers({ env: TEST_ENV, db, mailer, now: () => NOW });
  const tok = (userId, purpose = 'checkin', now = NOW.getTime()) => signToken({ userId, period: PERIOD, purpose, now }, TEST_ENV.CHECKIN_TOKEN_SECRET);
  const goalsOf = (userId) => {
    const plan = db.tables.plans.find((p) => p.user_id === userId);
    return db.tables.goals.filter((g) => g.growth_plan_id === plan.id);
  };
  return { db, mailer, h, alice, bob, admin, tok, goalsOf };
}

const req = (path, init = {}) => new Request(`${BASE}${path}`, init);
const post = (path, body, headers = {}) =>
  req(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

describe('check-in endpoints', () => {
  it('a check-in token reads only first name and active habit sentences', async () => {
    const { h, alice, tok } = setup();
    const res = await h.checkinSession(req(`/api/checkin/session?token=${encodeURIComponent(tok(alice))}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.firstName).toBe('Alice');
    expect(body.habits.length).toBe(3);
    expect(Object.keys(body).sort()).toEqual(['firstName', 'focus', 'habits', 'monthLabel', 'period', 'planYear', 'via']);
    expect(Object.keys(body.habits[0]).sort()).toEqual(['dimension', 'id', 'practice_key', 'sentence', 'status']);
    expect(JSON.stringify(body)).not.toContain('@');
  });

  it('saves a check-in with a token and returns suggestions', async () => {
    const { h, db, alice, tok, goalsOf } = setup();
    const [g1, g2] = goalsOf(alice);
    const res = await h.checkinSubmit(post('/api/checkin/submit', { token: tok(alice), responses: { [g1.id]: 0, [g2.id]: 4 }, note: 'Hard month' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.adjustments[g1.id].kind).toBe('encourage');
    expect(db.tables.checkins.length).toBe(1);
  });

  it('double submits save one row', async () => {
    const { h, db, alice, tok, goalsOf } = setup();
    const [g1] = goalsOf(alice);
    const body = { token: tok(alice), responses: { [g1.id]: 2 } };
    await Promise.all([h.checkinSubmit(post('/api/checkin/submit', body)), h.checkinSubmit(post('/api/checkin/submit', body))]);
    expect(db.tables.checkins.length).toBe(1);
  });

  it("rejects a valid token submitted with another person's goal ids", async () => {
    const { h, db, alice, bob, tok, goalsOf } = setup();
    const [bobGoal] = goalsOf(bob);
    const res = await h.checkinSubmit(post('/api/checkin/submit', { token: tok(alice), responses: { [bobGoal.id]: 3 } }));
    expect(res.status).toBe(400);
    expect(db.tables.checkins.length).toBe(0);
  });

  it('rejects tampered, expired and wrong-purpose tokens', async () => {
    const { h, alice, tok, goalsOf } = setup();
    const [g] = goalsOf(alice);
    const good = tok(alice);
    const cases = [
      `${good.slice(0, -3)}abc`,
      tok(alice, 'checkin', NOW.getTime() - 36 * 86400000),
      tok(alice, 'unsubscribe'),
      'not-a-token',
    ];
    for (const t of cases) {
      const s = await h.checkinSession(req(`/api/checkin/session?token=${encodeURIComponent(t)}`));
      expect(s.status).toBe(401);
      const p = await h.checkinSubmit(post('/api/checkin/submit', { token: t, responses: { [g.id]: 1 } }));
      expect(p.status).toBe(401);
    }
  });

  it('refuses oversized payloads', async () => {
    const { h, alice, tok } = setup();
    const huge = JSON.stringify({ token: tok(alice), responses: {}, note: 'x'.repeat(40000) });
    expect((await h.checkinSubmit(post('/api/checkin/submit', huge))).status).toBe(413);
    const lying = post('/api/checkin/submit', huge, { 'content-length': '10' });
    expect((await h.checkinSubmit(lying)).status).toBe(413);
  });

  it('refuses bad JSON and wrong methods', async () => {
    const { h } = setup();
    expect((await h.checkinSubmit(post('/api/checkin/submit', '{nope'))).status).toBe(400);
    expect((await h.checkinSubmit(req('/api/checkin/submit'))).status).toBe(405);
    expect((await h.checkinSession(post('/api/checkin/session', {}))).status).toBe(405);
  });

  it('works with a signed-in session too', async () => {
    const { h, alice, goalsOf } = setup();
    const res = await h.checkinSession(req('/api/checkin/session', { headers: { authorization: 'Bearer jwt-alice' } }));
    expect(res.status).toBe(200);
    expect((await res.json()).via).toBe('session');
    const [g] = goalsOf(alice);
    const sub = await h.checkinSubmit(post('/api/checkin/submit', { responses: { [g.id]: 2 } }, { authorization: 'Bearer jwt-alice' }));
    expect(sub.status).toBe(200);
    expect((await h.checkinSession(req('/api/checkin/session', { headers: { authorization: 'Bearer forged' } }))).status).toBe(401);
  });
});

describe('unsubscribe', () => {
  it('a GET changes nothing and redirects to the page with the button', async () => {
    const { h, db, alice, tok } = setup();
    const res = await h.unsubscribe(req(`/api/email/unsubscribe?token=${encodeURIComponent(tok(alice, 'unsubscribe'))}`));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toMatch(/^https:\/\/growthplan\.example\.org\/email\/preferences\?token=/);
    expect(db.tables.prefs.find((p) => p.user_id === alice).monthly_checkin).toBe(true);
  });

  it('one-click POST from a mail app turns check-ins off', async () => {
    const { h, db, alice, tok } = setup();
    const res = await h.unsubscribe(
      req(`/api/email/unsubscribe?token=${encodeURIComponent(tok(alice, 'unsubscribe'))}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click',
      }),
    );
    expect(res.status).toBe(200);
    expect(db.tables.prefs.find((p) => p.user_id === alice).monthly_checkin).toBe(false);
  });

  it('refuses a check-in token used to unsubscribe and junk tokens', async () => {
    const { h, db, alice, tok } = setup();
    for (const t of [tok(alice, 'checkin'), 'junk', '']) {
      const res = await h.unsubscribe(post('/api/email/unsubscribe', { token: t }));
      expect(res.status).toBe(400);
    }
    expect(db.tables.prefs.find((p) => p.user_id === alice).monthly_checkin).toBe(true);
  });
});

describe('cron and admin endpoints', () => {
  it('the cron endpoint refuses a missing or wrong secret', async () => {
    const { h } = setup();
    expect((await h.cronMonthly(req('/api/cron/monthly-checkin'))).status).toBe(401);
    expect((await h.cronMonthly(req('/api/cron/monthly-checkin', { headers: { authorization: 'Bearer wrong' } }))).status).toBe(401);
    expect((await h.cronMonthly(req('/api/cron/monthly-checkin', { headers: { authorization: `Bearer ${TEST_ENV.CRON_SECRET}x` } }))).status).toBe(401);
    const ok = await h.cronMonthly(req('/api/cron/monthly-checkin', { headers: { authorization: `Bearer ${TEST_ENV.CRON_SECRET}` } }));
    expect(ok.status).toBe(200);
  });

  it('the admin test endpoint refuses a non-admin and a signed-out caller', async () => {
    const { h, mailer } = setup();
    expect((await h.adminTest(post('/api/admin/checkin-test', {}))).status).toBe(401);
    expect((await h.adminTest(post('/api/admin/checkin-test', {}, { authorization: 'Bearer jwt-alice' }))).status).toBe(403);
    const ok = await h.adminTest(post('/api/admin/checkin-test', { period: PERIOD }, { authorization: 'Bearer jwt-admin' }));
    expect(ok.status).toBe(200);
    expect(mailer.sent.length).toBe(1);
    expect(mailer.sent[0].subject.startsWith('[Preview]')).toBe(true);
  });
});
