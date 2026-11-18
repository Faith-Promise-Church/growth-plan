// Request handlers for the check-in endpoints. The files in /api wire these to the real
// database and SendGrid; tests wire them to fakes.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { json, methodNotAllowed, readJson, readBody, bearer, errorResponse, BodyError } from './http.js';
import { verifyToken, safeEqualString } from './tokens.js';
import { runMonthlyCheckin, buildMessage } from './engine.js';
import { periodOf, addMonths, monthYearLabel } from '../src/lib/time.js';
import { publicHabit, validateCheckinSubmission, buildAdjustments } from '../src/lib/checkinCore.js';
import { EVERGREEN_EDITION } from '../src/content/checkinEditions.js';
import { isShareId, shareIsActive, buildSharedPlan } from '../src/lib/share.js';

const PERIOD_RE = /^\d{4}-\d{2}-01$/;

export function createHandlers({ env, db, mailer, now = () => new Date(), log = () => {} }) {
  // Who is this request for? A signed check-in token, or a signed-in Supabase session.
  async function resolveCheckinUser(request, tokenFromBody) {
    const url = new URL(request.url);
    const token = tokenFromBody ?? url.searchParams.get('token');
    if (token) {
      const v = verifyToken(token, { purpose: 'checkin', now: now().getTime() }, env.CHECKIN_TOKEN_SECRET);
      if (!v.ok) return { error: v.reason === 'expired' ? 'expired' : 'invalid' };
      return { userId: v.userId, period: v.period, via: 'token' };
    }
    const jwt = bearer(request);
    if (jwt) {
      const user = await db.userFromAccessToken(jwt);
      if (!user) return { error: 'invalid' };
      const requested = url.searchParams.get('period');
      const period = requested && PERIOD_RE.test(requested) ? requested : periodOf(now());
      return { userId: user.id, period, via: 'session' };
    }
    return { error: 'missing' };
  }

  function authError(error) {
    if (error === 'expired') return json(401, { error: 'This link has expired. Sign in to check in.', code: 'expired' });
    return json(401, { error: 'This link is not valid. Sign in to check in.', code: 'invalid' });
  }

  return {
    async cronMonthly(request) {
      if (request.method !== 'GET') return methodNotAllowed(['GET']);
      const auth = request.headers.get('authorization') || '';
      if (!env.CRON_SECRET || !safeEqualString(auth, `Bearer ${env.CRON_SECRET}`)) {
        return json(401, { error: 'Unauthorized' });
      }
      const url = new URL(request.url);
      const dry = url.searchParams.get('dry') === '1' || env.CHECKIN_DRY_RUN;
      const rendered = [];
      try {
        const summary = await runMonthlyCheckin({
          now: now(),
          db,
          mailer,
          env,
          dry,
          log,
          onRender: (r) => rendered.push(r),
        });
        if (dry && env.CHECKIN_DRY_RUN) {
          const dir = join(process.cwd(), 'docs', 'emails');
          mkdirSync(dir, { recursive: true });
          rendered.forEach((r, i) => {
            writeFileSync(join(dir, `dry-run-${summary.period}-${i + 1}.html`), r.html);
            writeFileSync(join(dir, `dry-run-${summary.period}-${i + 1}.txt`), r.text);
          });
        }
        if (dry) log('dry run', { period: summary.period, rendered: rendered.length });
        return json(200, { ...summary, rendered: dry ? rendered.length : undefined });
      } catch (err) {
        log('engine error', { error: err?.message });
        return json(500, { error: 'Engine error' });
      }
    },

    async checkinSession(request) {
      if (request.method !== 'GET') return methodNotAllowed(['GET']);
      try {
        const who = await resolveCheckinUser(request);
        if (who.error) return authError(who.error);
        const bundle = await db.bundleFor(who.userId, who.period);
        if (!bundle) return authError('invalid');
        // A check-in link reads only the first name and the active habit sentences (with the ids
        // needed to answer them, and focus areas so they can be shown first).
        const body = {
          firstName: bundle.firstName ?? '',
          period: who.period,
          monthLabel: monthYearLabel(who.period),
          focus: bundle.plan?.focus_dimensions ?? [],
          habits: bundle.habits.map((g) => {
            const h = publicHabit(g);
            return { id: h.id, dimension: h.dimension, sentence: h.sentence };
          }),
          via: who.via,
        };
        if (who.via === 'session') {
          body.planYear = bundle.plan?.year ?? null;
          const existing = await db.getCheckin(who.userId, who.period);
          body.existing = existing ? { responses: existing.responses, note: existing.note } : null;
        }
        return json(200, body);
      } catch (err) {
        return errorResponse(err);
      }
    },

    async checkinSubmit(request) {
      if (request.method !== 'POST') return methodNotAllowed(['POST']);
      try {
        const body = await readJson(request);
        const who = await resolveCheckinUser(request, typeof body.token === 'string' ? body.token : undefined);
        if (who.error) return authError(who.error);
        const bundle = await db.bundleFor(who.userId, who.period);
        if (!bundle || !bundle.plan) return json(400, { error: 'There is no plan to check in on yet.' });
        const habits = bundle.habits.map(publicHabit);
        const result = validateCheckinSubmission(body, habits.map((h) => h.id));
        if (!result.ok) return json(400, { error: result.error });
        const last = await db.getCheckin(who.userId, addMonths(who.period, -1));
        await db.upsertCheckin({
          user_id: who.userId,
          growth_plan_id: bundle.plan.id,
          period: who.period,
          responses: result.responses,
          note: result.note,
        });
        const adjustments = buildAdjustments(habits, result.responses, last?.responses ?? null);
        return json(200, { ok: true, period: who.period, adjustments });
      } catch (err) {
        return errorResponse(err);
      }
    },

    async unsubscribe(request) {
      const url = new URL(request.url);
      if (request.method === 'GET') {
        // Opening a link never changes anything. Send people to the page with the button.
        const token = url.searchParams.get('token') || '';
        const base = String(env.APP_URL || '').replace(/\/+$/, '');
        return new Response(null, {
          status: 303,
          headers: { Location: `${base}/email/preferences${token ? `?token=${encodeURIComponent(token)}` : ''}`, 'Cache-Control': 'no-store' },
        });
      }
      if (request.method !== 'POST') return methodNotAllowed(['GET', 'POST']);
      try {
        const raw = await readBody(request, 4096);
        let token = url.searchParams.get('token');
        const type = request.headers.get('content-type') || '';
        if (!token && type.includes('application/json') && raw) {
          try {
            token = JSON.parse(raw).token;
          } catch {
            throw new BodyError(400, 'Invalid JSON');
          }
        }
        const v = verifyToken(token, { purpose: 'unsubscribe', now: now().getTime() }, env.CHECKIN_TOKEN_SECRET);
        if (!v.ok) return json(400, { error: 'This link is not valid.' });
        await db.optOut(v.userId);
        return json(200, { ok: true });
      } catch (err) {
        return errorResponse(err);
      }
    },

    // A private read-only link to a plan. Anyone with the link may read it, so it returns as
    // little as possible: first name, the year, the word and verse of the year when the person
    // included them, and the habit sentences for the chosen areas.
    // A link that is unknown, stopped or expired gets the same answer.
    async sharedPlan(request) {
      if (request.method !== 'GET') return methodNotAllowed(['GET']);
      const gone = () => json(404, { error: 'This link is no longer active.', code: 'gone' }, { 'Cache-Control': 'no-store' });
      try {
        const id = new URL(request.url).searchParams.get('id');
        if (!isShareId(id)) return gone();
        const found = await db.getSharedPlan(id);
        if (!found?.plan || !shareIsActive(found.share, now().getTime())) return gone();
        const { year, word, verse, groups } = buildSharedPlan({
          plan: found.plan,
          goals: found.goals,
          dimensions: found.share.dimensions,
          includeWordVerse: found.share.include_word_verse !== false,
        });
        return json(200, { firstName: found.firstName ?? '', year, word, verse, groups, expiresAt: found.share.expires_at }, { 'Cache-Control': 'no-store' });
      } catch (err) {
        return errorResponse(err);
      }
    },

    async adminTest(request) {
      if (request.method !== 'POST') return methodNotAllowed(['POST']);
      try {
        const jwt = bearer(request);
        const user = jwt ? await db.userFromAccessToken(jwt) : null;
        if (!user) return json(401, { error: 'Sign in first.' });
        if (!(await db.isAdmin(user.id))) return json(403, { error: 'Only admins can send a test.' });
        const body = await readJson(request, 2048);
        const period = typeof body.period === 'string' && PERIOD_RE.test(body.period) ? body.period : periodOf(now());
        const bundle = await db.bundleFor(user.id, period);
        if (!bundle?.email) return json(400, { error: 'Your profile has no email address.' });
        const edition = (await db.getEdition(period)) ?? { ...EVERGREEN_EDITION, period };
        const { payload } = buildMessage({ env, edition, period, bundle, preview: true });
        const res = await mailer.send(payload);
        if (!res.ok) return json(502, { error: 'SendGrid did not accept the test. Check the API key and sender.' });
        return json(200, { ok: true, to: bundle.email });
      } catch (err) {
        return errorResponse(err);
      }
    },
  };
}
