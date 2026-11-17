// Database access for the server functions, through the existing Supabase client with the
// service role key. Every function the engine and endpoints need is here, so tests can swap in
// an in-memory version with the same shape (tests/helpers/fakeServerDb.js).

import { createClient } from '@supabase/supabase-js';
import { choosePlanForPeriod, orderedActiveHabits } from '../src/lib/checkinCore.js';

function must({ data, error }) {
  if (error) throw new Error(error.message || 'Database error');
  return data;
}

export function createServiceClient(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function createServerDb(supabase) {
  async function bundlesFor(userIds, period) {
    if (!userIds.length) return new Map();
    const [profiles, prefs, plans] = await Promise.all([
      supabase.from('user_profiles').select('id, first_name, email, is_admin').in('id', userIds).then(must),
      supabase.from('email_preferences').select('user_id, monthly_checkin, email').in('user_id', userIds).then(must),
      supabase.from('growth_plans').select('id, user_id, year, focus_dimensions').in('user_id', userIds).then(must),
    ]);
    const chosen = new Map();
    for (const id of userIds) {
      const plan = choosePlanForPeriod(plans.filter((p) => p.user_id === id), period);
      if (plan) chosen.set(id, plan);
    }
    const planIds = [...chosen.values()].map((p) => p.id);
    const goals = planIds.length
      ? must(
          await supabase
            .from('goals')
            .select('id, growth_plan_id, dimension, goal_name, goal_text, is_mandatory, sort_order, practice_key, status')
            .in('growth_plan_id', planIds),
        )
      : [];
    const out = new Map();
    for (const id of userIds) {
      const profile = profiles.find((p) => p.id === id) ?? null;
      const pref = prefs.find((p) => p.user_id === id) ?? null;
      const plan = chosen.get(id) ?? null;
      const planGoals = plan ? goals.filter((g) => g.growth_plan_id === plan.id) : [];
      out.set(id, {
        userId: id,
        firstName: profile?.first_name ?? '',
        email: (pref?.email || profile?.email || '').trim(),
        isAdmin: Boolean(profile?.is_admin),
        optedIn: Boolean(pref?.monthly_checkin),
        plan,
        habits: plan ? orderedActiveHabits(plan, planGoals) : [],
      });
    }
    return out;
  }

  return {
    async getEdition(period) {
      return must(await supabase.from('checkin_content').select('*').eq('period', period).maybeSingle());
    },
    async enqueue(period) {
      return must(await supabase.rpc('enqueue_checkin_sends', { p_period: period }));
    },
    async claim(period, claimId, limit, leaseSeconds) {
      return must(
        await supabase.rpc('claim_checkin_sends', {
          p_period: period,
          p_claim: claimId,
          p_limit: limit,
          p_lease_seconds: leaseSeconds,
        }),
      );
    },
    async markSent(rowId, claimId) {
      must(
        await supabase
          .from('checkin_sends')
          .update({ status: 'sent', sent_at: new Date().toISOString(), error: null, claimed_at: null })
          .eq('id', rowId)
          .eq('claim_id', claimId),
      );
    },
    async markFailed(rowId, claimId, error, permanent) {
      const patch = { status: 'failed', error: String(error).slice(0, 500) };
      if (permanent) patch.attempts = 3;
      must(await supabase.from('checkin_sends').update(patch).eq('id', rowId).eq('claim_id', claimId));
    },
    async markSkipped(rowId, claimId, reason) {
      must(
        await supabase
          .from('checkin_sends')
          .update({ status: 'skipped', error: reason, claimed_at: null })
          .eq('id', rowId)
          .eq('claim_id', claimId),
      );
    },
    async countUnfinished(period) {
      const { count, error } = await supabase
        .from('checkin_sends')
        .select('id', { count: 'exact', head: true })
        .eq('period', period)
        .in('status', ['queued', 'failed'])
        .lt('attempts', 3);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    async optedInUserIds() {
      const rows = must(await supabase.from('email_preferences').select('user_id').eq('monthly_checkin', true));
      return rows.map((r) => r.user_id);
    },
    async adminRecipients(period) {
      const admins = must(await supabase.from('user_profiles').select('id').eq('is_admin', true));
      const bundles = await bundlesFor(admins.map((a) => a.id), period);
      return [...bundles.values()].filter((b) => b.email);
    },
    bundlesFor,
    async bundleFor(userId, period) {
      return (await bundlesFor([userId], period)).get(userId) ?? null;
    },
    async getCheckin(userId, period) {
      return must(await supabase.from('checkins').select('*').eq('user_id', userId).eq('period', period).maybeSingle());
    },
    async upsertCheckin(row) {
      return must(
        await supabase
          .from('checkins')
          .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id,period' })
          .select()
          .single(),
      );
    },
    async optOut(userId) {
      must(
        await supabase
          .from('email_preferences')
          .upsert({ user_id: userId, monthly_checkin: false }, { onConflict: 'user_id' }),
      );
    },
    async userFromAccessToken(jwt) {
      const { data, error } = await supabase.auth.getUser(jwt);
      if (error || !data?.user) return null;
      return data.user;
    },
    async isAdmin(userId) {
      const row = must(await supabase.from('user_profiles').select('is_admin').eq('id', userId).maybeSingle());
      return Boolean(row?.is_admin);
    },
  };
}
