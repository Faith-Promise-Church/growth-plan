import { describe, it, expect } from 'vitest';
import { runMonthlyCheckin } from '../server/engine.js';
import { createFakeServerDb, createFakeMailer, TEST_ENV } from './helpers/fakeServerDb.js';
import { CHECKIN_EDITIONS } from '../src/content/checkinEditions.js';

// First Monday of December 2026 is the 7th. 8 AM Eastern (EST, UTC-5) is 13:00 UTC.
const SEND = new Date('2026-12-07T13:00:00Z');
const PERIOD = '2026-12-01';

function setup(n = 3, opts = {}) {
  let now = SEND.getTime();
  const db = createFakeServerDb({ clock: () => now });
  db.tables.content.push(...CHECKIN_EDITIONS.map((e) => ({ ...e })));
  const ids = Array.from({ length: n }, (_, i) => db.addPerson({ first: `P${i}`, ...opts }));
  return { db, ids, advance: (ms) => (now += ms), nowMs: () => now };
}

function sentTo(mailer) {
  return mailer.sent.map((p) => p.personalizations[0].to[0].email);
}

describe('monthly check-in engine', () => {
  it('does nothing outside a send, preview or resume window', async () => {
    const { db } = setup(2);
    const mailer = createFakeMailer();
    const res = await runMonthlyCheckin({ now: new Date('2026-12-08T13:00:00Z'), db, mailer, env: TEST_ENV });
    expect(res.action).toBe('none');
    expect(mailer.calls).toBe(0);
  });

  it('sends once to every opted-in person', async () => {
    const { db } = setup(5);
    db.addPerson({ first: 'Out', optedIn: false });
    const mailer = createFakeMailer();
    const res = await runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV });
    expect(res.action).toBe('send');
    expect(res.sent).toBe(5);
    expect(new Set(sentTo(mailer)).size).toBe(5);
  });

  it('running twice in a row sends nobody a second email', async () => {
    const { db } = setup(6);
    const mailer = createFakeMailer();
    await runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV });
    await runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV });
    const to = sentTo(mailer);
    expect(to.length).toBe(6);
    expect(new Set(to).size).toBe(6);
  });

  it('running twice at the same moment sends nobody a second email', async () => {
    const { db } = setup(60);
    const mailer = createFakeMailer({ delayMs: 1 });
    await Promise.all([
      runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV, options: { batchSize: 7, concurrency: 3 } }),
      runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV, options: { batchSize: 5, concurrency: 4 } }),
      runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV, options: { batchSize: 9, concurrency: 2 } }),
    ]);
    const to = sentTo(mailer);
    expect(to.length).toBe(60);
    expect(new Set(to).size).toBe(60);
  });

  it('a run stopped halfway is finished by the next invocation', async () => {
    const { db, advance } = setup(40);
    const mailer = createFakeMailer();
    let fakeMs = 0;
    // The first run has a budget that runs out after two batches.
    const first = await runMonthlyCheckin({
      now: SEND, db, mailer, env: TEST_ENV,
      clock: () => (fakeMs += 50),
      options: { batchSize: 10, budgetMs: 120 },
    });
    expect(first.timedOut).toBe(true);
    expect(first.sent).toBeGreaterThan(0);
    expect(first.sent).toBeLessThan(40);
    // The 13:00 UTC cron on the same day is 9 AM Eastern: outside the hour gate, so it resumes.
    advance(60 * 60 * 1000);
    const second = await runMonthlyCheckin({ now: new Date(SEND.getTime() + 3600_000), db, mailer, env: TEST_ENV });
    expect(second.action).toBe('resume');
    expect(first.sent + second.sent).toBe(40);
    expect(new Set(sentTo(mailer)).size).toBe(40);
    expect(second.remaining).toBe(0);
  });

  it('rows claimed by a run that died are picked up after the lease ends', async () => {
    const { db, advance } = setup(10);
    const mailer = createFakeMailer();
    await db.enqueue(PERIOD);
    // A run claims a batch and dies before sending.
    await db.claim(PERIOD, 'dead-run', 10, 600);
    advance(11 * 60 * 1000);
    const res = await runMonthlyCheckin({ now: new Date(SEND.getTime() + 3600_000), db, mailer, env: TEST_ENV });
    expect(res.sent).toBe(10);
  });

  it('records failures, keeps going, and stops retrying at three attempts', async () => {
    const { db, ids, advance } = setup(8);
    const bad = new Set(ids.slice(0, 4).map((id) => db.tables.profiles.find((p) => p.id === id).email));
    const kinds = ['429', '500', 'timeout', 'bad-address'];
    const mailer = createFakeMailer({
      behavior: (payload) => {
        const to = payload.personalizations[0].to[0].email;
        if (!bad.has(to)) return { ok: true, status: 202 };
        const k = kinds[[...bad].indexOf(to)];
        if (k === '429') return { ok: false, status: 429, retryable: true, error: 'SendGrid 429' };
        if (k === '500') return { ok: false, status: 500, retryable: true, error: 'SendGrid 500' };
        if (k === 'timeout') return { ok: false, status: 0, retryable: true, error: 'SendGrid timeout' };
        return { ok: false, status: 400, retryable: false, error: 'SendGrid 400: invalid email' };
      },
    });
    const first = await runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV });
    expect(first.sent).toBe(4);
    expect(first.failed).toBe(4);
    const rows = db.tables.sends;
    expect(rows.filter((r) => r.status === 'failed').every((r) => r.error)).toBe(true);
    // Retry over the next days: each retry waits for the lease.
    for (let i = 1; i <= 4; i += 1) {
      advance(3600_000 * 6);
      await runMonthlyCheckin({ now: new Date(SEND.getTime() + i * 6 * 3600_000), db, mailer, env: TEST_ENV });
    }
    for (const r of rows.filter((x) => x.status === 'failed')) expect(r.attempts).toBe(3);
    // Three attempts for each of the three retryable failures, one for the bad address.
    const failedCalls = mailer.calls - 4;
    expect(failedCalls).toBe(3 * 3 + 1);
  });

  it("one person's database error does not stop the run", async () => {
    const { db } = setup(30);
    db.failNextBundles = 1;
    const mailer = createFakeMailer();
    const res = await runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV, options: { batchSize: 10 } });
    expect(res.failed).toBe(10);
    expect(res.sent).toBe(20);
  });

  it('someone who opts out after being queued and before being sent gets nothing', async () => {
    const { db, ids } = setup(5);
    await db.enqueue(PERIOD);
    db.tables.prefs.find((p) => p.user_id === ids[2]).monthly_checkin = false;
    const mailer = createFakeMailer();
    const res = await runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV });
    expect(res.sent).toBe(4);
    expect(db.tables.sends.find((s) => s.user_id === ids[2]).status).toBe('skipped');
  });

  it('5,000 people finish inside the time limit or resume cleanly', async () => {
    const { db } = setup(5000, { habits: 3 });
    const mailer = createFakeMailer();
    const started = Date.now();
    const res = await runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV });
    const elapsed = Date.now() - started;
    if (res.timedOut) {
      const more = await runMonthlyCheckin({ now: new Date(SEND.getTime() + 3600_000), db, mailer, env: TEST_ENV });
      expect(res.sent + more.sent).toBe(5000);
    } else {
      expect(res.sent).toBe(5000);
    }
    expect(new Set(sentTo(mailer)).size).toBe(5000);
    expect(elapsed).toBeLessThan(240_000);
  }, 120_000);

  it('uses the evergreen edition and tells the admins when a month is missing', async () => {
    const { db } = setup(2);
    db.tables.content = [];
    db.addPerson({ first: 'Admin', admin: true, optedIn: false });
    const mailer = createFakeMailer();
    const res = await runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV });
    expect(res.missingContent).toBe(true);
    expect(res.sent).toBe(2);
    const subjects = mailer.sent.map((p) => p.subject);
    expect(subjects.filter((s) => s.includes('missing')).length).toBe(1);
    expect(subjects.filter((s) => s === 'Your monthly check-in').length).toBe(2);
  });

  it('sends a preview to admins only on the Thursday before', async () => {
    const { db } = setup(4);
    db.addPerson({ first: 'Admin', admin: true });
    const mailer = createFakeMailer();
    const res = await runMonthlyCheckin({ now: new Date('2026-12-03T13:00:00Z'), db, mailer, env: TEST_ENV });
    expect(res.action).toBe('preview');
    expect(mailer.sent.length).toBe(1);
    expect(mailer.sent[0].subject.startsWith('[Preview] ')).toBe(true);
    expect(db.tables.sends.length).toBe(0);
  });

  it('dry run renders and sends and writes nothing', async () => {
    const { db } = setup(3);
    const mailer = createFakeMailer();
    const rendered = [];
    const res = await runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV, dry: true, onRender: (r) => rendered.push(r) });
    expect(res.dry).toBe(true);
    expect(rendered.length).toBe(3);
    expect(mailer.calls).toBe(0);
    expect(db.tables.sends.length).toBe(0);
  });

  it('builds a SendGrid payload with both parts, unsubscribe headers and tracking off', async () => {
    const { db } = setup(1);
    const mailer = createFakeMailer();
    await runMonthlyCheckin({ now: SEND, db, mailer, env: TEST_ENV });
    const p = mailer.sent[0];
    expect(p.content[0].type).toBe('text/plain');
    expect(p.content[1].type).toBe('text/html');
    expect(p.headers['List-Unsubscribe']).toMatch(/^<https:\/\/growthplan\.example\.org\/api\/email\/unsubscribe\?token=/);
    expect(p.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(p.tracking_settings.click_tracking.enable).toBe(false);
    expect(p.tracking_settings.open_tracking.enable).toBe(false);
    expect(p.subject).toBe('Your December check-in: look back, look ahead');
    expect(p.reply_to.email).toBe('hello@example.org');
  });
});
