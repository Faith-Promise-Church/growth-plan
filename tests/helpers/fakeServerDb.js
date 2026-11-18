// In-memory stand-in for server/db.js with the same method shapes. Claims follow the same rules
// as claim_checkin_sends(): queued or failed, fewer than three attempts, no live lease. Each
// method does its work synchronously before its first await, so concurrent calls interleave the
// way separate database transactions would at statement boundaries.

import { randomUUID } from 'node:crypto';
import { choosePlanForPeriod, orderedActiveHabits } from '../../src/lib/checkinCore.js';

export function createFakeServerDb({ clock = () => Date.now() } = {}) {
  const t = {
    profiles: [],
    prefs: [],
    plans: [],
    goals: [],
    sends: [],
    checkins: [],
    content: [],
    authTokens: new Map(),
  };

  const tick = () => new Promise((r) => setImmediate(r));

  function bundle(userId, period) {
    const profile = t.profiles.find((p) => p.id === userId);
    const pref = t.prefs.find((p) => p.user_id === userId);
    const plan = choosePlanForPeriod(t.plans.filter((p) => p.user_id === userId), period);
    const goals = plan ? t.goals.filter((g) => g.growth_plan_id === plan.id) : [];
    return {
      userId,
      firstName: profile?.first_name ?? '',
      email: (pref?.email || profile?.email || '').trim(),
      isAdmin: Boolean(profile?.is_admin),
      optedIn: Boolean(pref?.monthly_checkin),
      plan: plan ?? null,
      habits: plan ? orderedActiveHabits(plan, goals) : [],
    };
  }

  const db = {
    tables: t,
    failNextBundles: 0,

    addPerson({ id = randomUUID(), first = 'Pat', email, optedIn = true, admin = false, habits = 2, planYear = 2026, focus = ['faith'] } = {}) {
      t.profiles.push({ id, first_name: first, email: email ?? `${id.slice(0, 8)}@example.com`, is_admin: admin });
      t.prefs.push({ user_id: id, monthly_checkin: optedIn, email: null });
      if (habits != null) {
        const planId = randomUUID();
        t.plans.push({ id: planId, user_id: id, year: planYear, focus_dimensions: focus });
        for (let i = 0; i < habits; i += 1) {
          t.goals.push({
            id: randomUUID(),
            growth_plan_id: planId,
            dimension: ['faith', 'health', 'purpose', 'finances', 'character'][i % 5],
            goal_name: '',
            goal_text: `Habit number ${i + 1} for ${first}.`,
            is_mandatory: false,
            sort_order: i,
            practice_key: i % 2 ? 'prayer' : 'sleep',
            status: 'active',
          });
        }
      }
      return id;
    },

    async getEdition(period) {
      const row = t.content.find((c) => c.period === period) ?? null;
      await tick();
      return row;
    },
    async enqueue(period) {
      let n = 0;
      for (const p of t.prefs) {
        if (!p.monthly_checkin) continue;
        const prof = t.profiles.find((x) => x.id === p.user_id);
        if (!(p.email || prof?.email)) continue;
        if (t.sends.some((s) => s.period === period && s.user_id === p.user_id)) continue;
        t.sends.push({ id: randomUUID(), period, user_id: p.user_id, status: 'queued', attempts: 0, error: null, sent_at: null, claimed_at: null, claim_id: null, created_at: clock() });
        n += 1;
      }
      await tick();
      return n;
    },
    async claim(period, claimId, limit, leaseSeconds) {
      const now = clock();
      const leaseOk = (s) => s.claimed_at == null || s.claimed_at < now - leaseSeconds * 1000;
      const rows = [];
      for (const s of t.sends) {
        if (rows.length >= limit) break;
        if (s.period !== period || !['queued', 'failed'].includes(s.status) || s.send_started_at || !leaseOk(s)) continue;
        const pref = t.prefs.find((p) => p.user_id === s.user_id);
        const prof = t.profiles.find((p) => p.id === s.user_id);
        if (!pref?.monthly_checkin || !(pref.email || prof?.email)) {
          s.status = 'skipped';
          s.error = 'opted out or no address';
          s.claimed_at = null;
          s.claim_id = null;
          continue;
        }
        if (s.attempts < 3) rows.push(s);
      }
      for (const s of rows) {
        s.claimed_at = now;
        s.claim_id = claimId;
        s.attempts += 1;
      }
      const out = rows.map((s) => ({ id: s.id, user_id: s.user_id, attempts: s.attempts }));
      await tick();
      return out;
    },
    failNextMarkSent: 0,
    async markSending(id, claimId) {
      const s = t.sends.find((x) => x.id === id && x.claim_id === claimId && !x.send_started_at);
      if (s) s.send_started_at = clock();
      await tick();
      return Boolean(s);
    },
    async periodHasRows(period) {
      return t.sends.some((s) => s.period === period);
    },
    async markSent(id, claimId) {
      if (db.failNextMarkSent > 0) {
        db.failNextMarkSent -= 1;
        throw new Error('simulated database failure on markSent');
      }
      const s = t.sends.find((x) => x.id === id && x.claim_id === claimId);
      if (s) Object.assign(s, { status: 'sent', sent_at: clock(), error: null, claimed_at: null });
      await tick();
    },
    async markFailed(id, claimId, error, permanent) {
      const s = t.sends.find((x) => x.id === id && x.claim_id === claimId);
      if (s) {
        s.status = 'failed';
        s.error = String(error).slice(0, 500);
        s.send_started_at = null;
        if (permanent) s.attempts = 3;
      }
      await tick();
    },
    async markSkipped(id, claimId, reason) {
      const s = t.sends.find((x) => x.id === id && x.claim_id === claimId);
      if (s) Object.assign(s, { status: 'skipped', error: reason, claimed_at: null });
      await tick();
    },
    async countUnfinished(period) {
      const n = t.sends.filter((s) => s.period === period && ['queued', 'failed'].includes(s.status) && s.attempts < 3 && !s.send_started_at).length;
      await tick();
      return n;
    },
    async optedInUserIds() {
      return t.prefs.filter((p) => p.monthly_checkin).map((p) => p.user_id);
    },
    async adminRecipients(period) {
      return t.profiles.filter((p) => p.is_admin).map((p) => bundle(p.id, period)).filter((b) => b.email);
    },
    async bundlesFor(userIds, period) {
      if (db.failNextBundles > 0) {
        db.failNextBundles -= 1;
        throw new Error('simulated database failure');
      }
      const m = new Map(userIds.map((id) => [id, bundle(id, period)]));
      await tick();
      return m;
    },
    async bundleFor(userId, period) {
      return bundle(userId, period);
    },
    async getCheckin(userId, period) {
      return t.checkins.find((c) => c.user_id === userId && c.period === period) ?? null;
    },
    async upsertCheckin(row) {
      const i = t.checkins.findIndex((c) => c.user_id === row.user_id && c.period === row.period);
      if (i >= 0) t.checkins[i] = { ...t.checkins[i], ...row };
      else t.checkins.push({ id: randomUUID(), ...row });
      return row;
    },
    async optOut(userId) {
      const p = t.prefs.find((x) => x.user_id === userId);
      if (p) p.monthly_checkin = false;
      else t.prefs.push({ user_id: userId, monthly_checkin: false, email: null });
    },
    async userFromAccessToken(jwt) {
      const id = t.authTokens.get(jwt);
      return id ? { id } : null;
    },
    async isAdmin(userId) {
      return Boolean(t.profiles.find((p) => p.id === userId)?.is_admin);
    },
  };
  return db;
}

// A SendGrid stand-in. `behavior(payload, n)` returns a result or throws; default is success.
export function createFakeMailer({ behavior, delayMs = 0 } = {}) {
  const sent = [];
  let calls = 0;
  return {
    sent,
    get calls() {
      return calls;
    },
    async send(payload) {
      calls += 1;
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      const result = behavior ? await behavior(payload, calls) : { ok: true, status: 202, retryable: false };
      if (result.ok) sent.push(payload);
      return result;
    },
  };
}

export const TEST_ENV = {
  APP_URL: 'https://growthplan.example.org',
  CHECKIN_TOKEN_SECRET: 'test-secret-test-secret-test-secret-123',
  CHECKIN_FROM_EMAIL: 'checkins@example.org',
  CHECKIN_FROM_NAME: 'Faith Promise Church',
  CHECKIN_REPLY_TO: 'hello@example.org',
  CRON_SECRET: 'cron-secret-value',
  SENDGRID_API_KEY: 'SG.test',
  CHECKIN_DRY_RUN: false,
};
