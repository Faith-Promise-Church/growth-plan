// Every database call the app makes. Pages call these, never supabase directly, so errors are
// handled the same way everywhere.

import { supabase, isDemo } from './client.js';
import { periodOf, addMonths, monthYearLabel } from '../lib/time.js';
import { choosePlanForPeriod, orderedActiveHabits, publicHabit, validateCheckinSubmission, buildAdjustments } from '../lib/checkinCore.js';
import { cleanDimensions, isShareId, shareIsActive, shareExpiry, buildSharedPlan } from '../lib/share.js';

export class ApiError extends Error {
  constructor(message, { code, cause, status } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

const FRIENDLY = 'Something went wrong. Check your connection and try again.';

function unwrap({ data, error }, message = FRIENDLY) {
  if (error) throw new ApiError(message, { code: error.code, cause: error });
  return data;
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function loginEmailForPhone(phone) {
  return unwrap(await supabase.rpc('login_email_for_phone', { p_phone: phone }));
}

export async function phoneIsRegistered(phone) {
  return Boolean(unwrap(await supabase.rpc('phone_is_registered', { p_phone: phone })));
}

export async function getProfile(userId) {
  return unwrap(await supabase.from('user_profiles').select('id, first_name, last_name, phone, email, is_admin').eq('id', userId).maybeSingle());
}

// Self-heal: a signed-in person with no profile row gets one built from their auth metadata.
// ignoreDuplicates makes this ON CONFLICT DO NOTHING, so it never overwrites anything.
export async function ensureProfile(user) {
  const existing = await getProfile(user.id);
  if (existing) return existing;
  const meta = user.user_metadata ?? {};
  await supabase.from('user_profiles').upsert(
    {
      id: user.id,
      first_name: meta.first_name ?? null,
      last_name: meta.last_name ?? null,
      phone: meta.phone ?? null,
      email: user.email ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  return getProfile(user.id);
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

export async function listAssessments(userId, limit = 50) {
  return unwrap(
    await supabase.from('assessments').select('*').eq('user_id', userId).order('assessment_date', { ascending: false }).limit(limit),
  ) ?? [];
}

export async function insertAssessment(row) {
  return unwrap(await supabase.from('assessments').insert(row).select().single(), 'Your answers were not saved. Check your connection and try again.');
}

// ---------------------------------------------------------------------------
// Plans and goals
// ---------------------------------------------------------------------------

export async function listPlans(userId) {
  return unwrap(await supabase.from('growth_plans').select('*').eq('user_id', userId).order('year', { ascending: false })) ?? [];
}

export async function getPlan(userId, year) {
  return unwrap(await supabase.from('growth_plans').select('*').eq('user_id', userId).eq('year', year).maybeSingle());
}

export async function ensurePlan(userId, year, fields = {}) {
  const existing = await getPlan(userId, year);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('growth_plans')
    .insert({ user_id: userId, year, ...fields })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return getPlan(userId, year);
    throw new ApiError(FRIENDLY, { cause: error });
  }
  return data;
}

export async function updatePlan(planId, patch) {
  return unwrap(
    await supabase.from('growth_plans').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', planId).select().single(),
  );
}

export async function listGoals(planId) {
  return unwrap(await supabase.from('goals').select('*').eq('growth_plan_id', planId).order('sort_order', { ascending: true })) ?? [];
}

const GOAL_FIELDS = [
  'id', 'growth_plan_id', 'dimension', 'discipline', 'goal_name', 'goal_text', 'is_mandatory',
  'sort_order', 'practice_key', 'cadence', 'anchor', 'status',
];

// Saves one goal. Insert or update by id; never touches any other row.
export async function saveGoal(goal) {
  const row = Object.fromEntries(GOAL_FIELDS.filter((k) => goal[k] !== undefined).map((k) => [k, goal[k]]));
  if (!row.id) row.id = newId();
  row.goal_text = row.goal_text ?? '';
  row.updated_at = new Date().toISOString();
  return unwrap(await supabase.from('goals').upsert(row, { onConflict: 'id' }).select().single(), 'Your change was not saved.');
}

export async function deleteGoal(id) {
  unwrap(await supabase.from('goals').delete().eq('id', id), 'That habit was not removed.');
}

// ---------------------------------------------------------------------------
// Email preferences and check-ins
// ---------------------------------------------------------------------------

export async function getEmailPreferences(userId) {
  return unwrap(await supabase.from('email_preferences').select('*').eq('user_id', userId).maybeSingle());
}

export async function saveEmailPreferences(userId, { monthly_checkin, email }) {
  const row = { user_id: userId, monthly_checkin: Boolean(monthly_checkin) };
  if (email !== undefined) row.email = email ? email.trim() : null;
  return unwrap(
    await supabase.from('email_preferences').upsert(row, { onConflict: 'user_id' }).select().single(),
    'Your email preference was not saved.',
  );
}

export async function listCheckins(userId, limit = 12) {
  return unwrap(
    await supabase.from('checkins').select('*').eq('user_id', userId).order('period', { ascending: false }).limit(limit),
  ) ?? [];
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function adminStats() {
  return unwrap(await supabase.rpc('admin_stats'), 'Statistics could not be loaded.');
}

export async function adminCheckinStats() {
  return unwrap(await supabase.rpc('admin_checkin_stats'), 'Check-in numbers could not be loaded.');
}

export async function listCheckinContent() {
  return unwrap(await supabase.from('checkin_content').select('*').order('period', { ascending: true })) ?? [];
}

export async function saveCheckinContent(row) {
  return unwrap(
    await supabase
      .from('checkin_content')
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'period' })
      .select()
      .single(),
    'That edition was not saved.',
  );
}

// ---------------------------------------------------------------------------
// Server functions (/api). In demo mode these run in the browser against the demo data.
// ---------------------------------------------------------------------------

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

async function callApi(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const t = await accessToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let res;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (err) {
    throw new ApiError(FRIENDLY, { cause: err, status: 0 });
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw new ApiError(data?.error || FRIENDLY, { status: res.status, code: data?.code });
  return data;
}

// Demo stand-ins for the server functions. Tokens look like "demo:<userId>:<period>".
const demoServer = {
  async who(token, period) {
    if (token) {
      const m = /^demo:([0-9a-f-]{36}):(\d{4}-\d{2}-01)$/.exec(token);
      if (!m) throw new ApiError('This link is not valid. Sign in to check in.', { status: 401, code: 'invalid' });
      return { userId: m[1], period: m[2], via: 'token' };
    }
    const { data } = await supabase.auth.getSession();
    const id = data?.session?.user?.id;
    if (!id) throw new ApiError('Sign in to check in.', { status: 401, code: 'missing' });
    const p = period && /^\d{4}-\d{2}-01$/.test(period) ? period : periodOf(new Date());
    return { userId: id, period: p, via: 'session' };
  },
  bundle(userId, period) {
    const db = supabase._db;
    const profile = db.user_profiles.find((p) => p.id === userId);
    const plan = choosePlanForPeriod(db.growth_plans.filter((p) => p.user_id === userId), period);
    const goals = plan ? db.goals.filter((g) => g.growth_plan_id === plan.id) : [];
    return { profile, plan, habits: plan ? orderedActiveHabits(plan, goals).map(publicHabit) : [] };
  },
  async session(token, period) {
    const who = await this.who(token, period);
    const { profile, plan, habits } = this.bundle(who.userId, who.period);
    const existing = supabase._db.checkins.find((c) => c.user_id === who.userId && c.period === who.period);
    return {
      firstName: profile?.first_name ?? '',
      period: who.period,
      monthLabel: monthYearLabel(who.period),
      focus: plan?.focus_dimensions ?? [],
      planYear: plan?.year ?? null,
      habits,
      via: who.via,
      existing: who.via === 'session' && existing ? { responses: existing.responses, note: existing.note } : null,
    };
  },
  async submit(body) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ApiError(FRIENDLY, { status: 0 });
    const who = await this.who(body.token);
    const { plan, habits } = this.bundle(who.userId, who.period);
    if (!plan) throw new ApiError('There is no plan to check in on yet.', { status: 400 });
    const result = validateCheckinSubmission(body, habits.map((h) => h.id));
    if (!result.ok) throw new ApiError(result.error, { status: 400 });
    const db = supabase._db;
    const last = db.checkins.find((c) => c.user_id === who.userId && c.period === addMonths(who.period, -1));
    const idx = db.checkins.findIndex((c) => c.user_id === who.userId && c.period === who.period);
    const row = {
      id: idx >= 0 ? db.checkins[idx].id : newId(),
      user_id: who.userId,
      growth_plan_id: plan.id,
      period: who.period,
      responses: result.responses,
      note: result.note,
      created_at: idx >= 0 ? db.checkins[idx].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) db.checkins[idx] = row;
    else db.checkins.push(row);
    supabase._persist();
    return { ok: true, period: who.period, adjustments: buildAdjustments(habits, result.responses, last?.responses ?? null) };
  },
};

export async function fetchCheckinSession(token, period) {
  if (isDemo) return demoServer.session(token, period);
  const qs = token ? `?token=${encodeURIComponent(token)}` : period ? `?period=${encodeURIComponent(period)}` : '';
  return callApi(`/api/checkin/session${qs}`, { auth: !token });
}

export async function submitCheckin({ token, responses, note }) {
  if (isDemo) return demoServer.submit({ token, responses, note });
  return callApi('/api/checkin/submit', { method: 'POST', body: { token, responses, note }, auth: !token });
}

export async function unsubscribeWithToken(token) {
  if (isDemo) {
    const m = /^demo:([0-9a-f-]{36}):/.exec(token ?? '');
    if (!m) throw new ApiError('This link is not valid.', { status: 400 });
    const db = supabase._db;
    const row = db.email_preferences.find((p) => p.user_id === m[1]);
    if (row) {
      row.monthly_checkin = false;
      row.opted_out_at = new Date().toISOString();
    } else {
      db.email_preferences.push({ user_id: m[1], monthly_checkin: false, email: null, opted_in_at: null, opted_out_at: new Date().toISOString() });
    }
    supabase._persist();
    return { ok: true };
  }
  return callApi('/api/email/unsubscribe', { method: 'POST', body: { token }, auth: false });
}

export async function sendAdminTest(period) {
  if (isDemo) return { ok: true, to: 'adam@example.com', demo: true };
  return callApi('/api/admin/checkin-test', { method: 'POST', body: { period } });
}

// ---------------------------------------------------------------------------
// Private read-only links to a plan
// ---------------------------------------------------------------------------

export async function listPlanShares(planId) {
  const rows = unwrap(await supabase.from('plan_shares').select('*').eq('growth_plan_id', planId).order('created_at', { ascending: false })) ?? [];
  return rows.filter((r) => shareIsActive(r));
}

export async function createPlanShare({ userId, planId, dimensions }) {
  const chosen = cleanDimensions(dimensions);
  if (!chosen.length) throw new ApiError('Choose at least one area to share.');
  return unwrap(
    await supabase
      .from('plan_shares')
      .insert({ user_id: userId, growth_plan_id: planId, dimensions: chosen, expires_at: shareExpiry() })
      .select()
      .single(),
    'The link was not created. Try again.',
  );
}

export async function revokePlanShare(id) {
  unwrap(await supabase.from('plan_shares').update({ revoked_at: new Date().toISOString() }).eq('id', id), 'The link was not stopped. Try again.');
}

// What someone with the link sees. Works signed out.
export async function fetchSharedPlan(id) {
  const gone = () => new ApiError('This link is no longer active.', { status: 404, code: 'gone' });
  if (!isShareId(id)) throw gone();
  if (isDemo) {
    const db = supabase._db;
    const share = (db.plan_shares ?? []).find((s) => s.id === id);
    const plan = share ? db.growth_plans.find((p) => p.id === share.growth_plan_id) : null;
    if (!plan || !shareIsActive(share)) throw gone();
    const goals = db.goals.filter((g) => g.growth_plan_id === plan.id);
    const profile = db.user_profiles.find((p) => p.id === share.user_id);
    return { firstName: profile?.first_name ?? '', ...buildSharedPlan({ plan, goals, dimensions: share.dimensions }), expiresAt: share.expires_at };
  }
  return callApi(`/api/share/plan?id=${encodeURIComponent(id)}`, { auth: false });
}
