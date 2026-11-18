// The monthly check-in engine. Called by /api/cron/monthly-checkin twice a day (12:00 and 13:00
// UTC). It decides from the New York clock whether to send, preview, resume or do nothing.
//
// Idempotency: every recipient gets one checkin_sends row per period (unique key). Rows are
// claimed in small batches with a lease (claim_checkin_sends), so two runs at the same moment
// never send to the same person, and a run that stops halfway leaves rows the next run finishes.

import { randomUUID } from 'node:crypto';
import { getSendDecision } from '../src/lib/schedule.js';
import { EVERGREEN_EDITION } from '../src/content/checkinEditions.js';
import { currentPlanYear } from '../src/lib/time.js';
import { renderCheckinEmail } from './email/render.js';
import { buildSendgridPayload } from './sendgrid.js';
import { signToken } from './tokens.js';

export const DEFAULTS = {
  batchSize: 25,
  concurrency: 8,
  leaseSeconds: 600,
  budgetMs: 240_000,
};

export function appUrls(env, { userId, period, year }) {
  const base = String(env.APP_URL || '').replace(/\/+$/, '');
  const checkinToken = signToken({ userId, period, purpose: 'checkin' }, env.CHECKIN_TOKEN_SECRET);
  const unsubToken = signToken({ userId, period, purpose: 'unsubscribe' }, env.CHECKIN_TOKEN_SECRET);
  return {
    checkin: `${base}/check-in?token=${encodeURIComponent(checkinToken)}`,
    adjust: `${base}/plan/${year}`,
    start: `${base}/plan/${year}/start`,
    unsubscribe: `${base}/email/preferences?token=${encodeURIComponent(unsubToken)}`,
    preferences: `${base}/email/preferences`,
    listUnsubscribe: `${base}/api/email/unsubscribe?token=${encodeURIComponent(unsubToken)}`,
    logo: `${base}/assets/logos/growth-plan.png`,
  };
}

export function buildMessage({ env, edition, period, bundle, preview = false }) {
  const year = bundle.plan?.year ?? currentPlanYear(new Date(`${period}T12:00:00Z`));
  const urls = appUrls(env, { userId: bundle.userId, period, year });
  const rendered = renderCheckinEmail({
    edition,
    period,
    preview,
    urls,
    recipient: {
      firstName: bundle.firstName,
      focus: bundle.plan?.focus_dimensions ?? [],
      habits: bundle.habits.map((h) => ({ dimension: h.dimension, sentence: h.goal_text })),
      hasPlan: Boolean(bundle.plan),
    },
  });
  const payload = buildSendgridPayload({
    to: { email: bundle.email, name: bundle.firstName },
    from: { email: env.CHECKIN_FROM_EMAIL, name: env.CHECKIN_FROM_NAME || 'Faith Promise Church' },
    replyTo: env.CHECKIN_REPLY_TO ? { email: env.CHECKIN_REPLY_TO } : null,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    headers: {
      'List-Unsubscribe': `<${urls.listUnsubscribe}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    categories: [preview ? 'checkin-preview' : 'monthly-checkin'],
    customArgs: { period },
  });
  return { rendered, payload, urls };
}

async function pool(items, concurrency, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i];
      i += 1;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function loadEdition(db, period) {
  const row = await db.getEdition(period);
  return row ? { edition: row, missing: false } : { edition: { ...EVERGREEN_EDITION, period }, missing: true };
}

async function notifyAdmins({ db, mailer, env, period, subject, text, log }) {
  const admins = await db.adminRecipients(period);
  for (const a of admins) {
    const payload = buildSendgridPayload({
      to: { email: a.email, name: a.firstName },
      from: { email: env.CHECKIN_FROM_EMAIL, name: env.CHECKIN_FROM_NAME || 'Faith Promise Church' },
      subject,
      text,
      html: `<p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;">${text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</p>`,
    });
    const res = await mailer.send(payload);
    if (!res.ok) log?.('admin notice failed', { error: res.error });
  }
}

/**
 * @param {object} args
 * @param {Date} args.now
 * @param {object} args.db      see server/db.js
 * @param {object} args.mailer  { send(payload) }
 * @param {object} args.env
 * @param {boolean} [args.dry]  render and log, send nothing, write nothing
 * @param {function} [args.onRender]  called with each rendered email in dry runs
 * @param {function} [args.clock]  returns ms, for the time budget (tests pass a fake)
 */
export async function runMonthlyCheckin({ now, db, mailer, env, dry = false, onRender, log = () => {}, clock = Date.now, options = {} }) {
  const opts = { ...DEFAULTS, ...options };
  const started = clock();
  const decision = getSendDecision(now);
  const summary = { action: decision.action, period: decision.period ?? null, sent: 0, failed: 0, skipped: 0, claimed: 0, timedOut: false, dry };

  if (decision.action === 'none') return summary;

  const { period } = decision;
  const { edition, missing } = await loadEdition(db, period);
  summary.missingContent = missing;

  if (decision.action === 'preview') {
    const admins = await db.adminRecipients(period);
    for (const admin of admins) {
      const { rendered, payload } = buildMessage({ env, edition, period, bundle: admin, preview: true });
      if (dry) {
        onRender?.({ userId: admin.userId, ...rendered });
        continue;
      }
      const res = await mailer.send(payload);
      if (res.ok) summary.sent += 1;
      else summary.failed += 1;
    }
    if (missing && !dry) {
      await notifyAdmins({
        db, mailer, env, period, log,
        subject: '[Growth Plan] Check-in content is missing for next week',
        text: `There is no check-in content for ${period}. If it is not added before Monday, people will get the evergreen edition. Add it in the admin page under Check-ins.`,
      });
    }
    return summary;
  }

  if (dry) {
    const ids = await db.optedInUserIds();
    const bundles = await db.bundlesFor(ids, period);
    for (const b of bundles.values()) {
      if (!b.email) continue;
      const { rendered } = buildMessage({ env, edition, period, bundle: b });
      onRender?.({ userId: b.userId, ...rendered });
      summary.sent += 1;
    }
    return summary;
  }

  if (decision.action === 'send') {
    summary.enqueued = await db.enqueue(period);
    if (missing) {
      await notifyAdmins({
        db, mailer, env, period, log,
        subject: '[Growth Plan] Check-in content was missing this month',
        text: `There was no check-in content for ${period}, so this month's email used the evergreen edition. Add next month's content in the admin page under Check-ins.`,
      });
    }
  } else if (!(await db.periodHasRows(period))) {
    // The send-hour run never happened (a missed cron). Queue now so the month is not lost.
    summary.enqueued = await db.enqueue(period);
    summary.lateStart = true;
  } else {
    const remaining = await db.countUnfinished(period);
    if (remaining === 0) {
      summary.action = 'none';
      return summary;
    }
  }

  const claimId = randomUUID();
  while (clock() - started < opts.budgetMs) {
    const rows = await db.claim(period, claimId, opts.batchSize, opts.leaseSeconds);
    if (!rows?.length) break;
    summary.claimed += rows.length;
    const userIds = rows.map((r) => r.user_id);
    let bundles;
    try {
      bundles = await db.bundlesFor(userIds, period);
    } catch (err) {
      for (const r of rows) {
        await db.markFailed(r.id, claimId, `load failed: ${err.message}`, false);
        summary.failed += 1;
      }
      continue;
    }
    await pool(rows, opts.concurrency, async (row) => {
      try {
        const bundle = bundles.get(row.user_id);
        if (!bundle || !bundle.optedIn || !bundle.email) {
          await db.markSkipped(row.id, claimId, 'opted out or no address');
          summary.skipped += 1;
          return;
        }
        const { payload } = buildMessage({ env, edition, period, bundle });
        // Mark the row before calling SendGrid. If anything goes wrong after this point, the
        // row is never sent again automatically, because the email may already be on its way.
        if (!(await db.markSending(row.id, claimId))) {
          summary.skipped += 1;
          return;
        }
        const res = await mailer.send(payload);
        if (res.ok) {
          let recorded = false;
          for (let i = 0; i < 3 && !recorded; i += 1) {
            try {
              await db.markSent(row.id, claimId);
              recorded = true;
            } catch (err) {
              log('could not record a sent email; it will not be resent', { error: err?.message });
            }
          }
          summary.sent += 1;
          if (!recorded) summary.unconfirmed = (summary.unconfirmed ?? 0) + 1;
        } else {
          await db.markFailed(row.id, claimId, res.error ?? `status ${res.status}`, !res.retryable);
          summary.failed += 1;
        }
      } catch (err) {
        // One person's failure never stops the run.
        try {
          await db.markFailed(row.id, claimId, err?.message ?? String(err), false);
        } catch (inner) {
          log('could not record failure', { error: inner?.message });
        }
        summary.failed += 1;
      }
    });
  }
  summary.timedOut = clock() - started >= opts.budgetMs;
  summary.remaining = await db.countUnfinished(period);
  return summary;
}
