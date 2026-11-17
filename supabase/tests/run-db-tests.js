// Database pressure tests against a LOCAL Supabase stack (supabase start). Never point this at
// production: it drops and rebuilds the public schema.
//
//   1. Rebuild the live schema from supabase/tests/baseline.sql and seed it at production scale.
//   2. Checksum every pre-existing column.
//   3. Apply the additive migrations. Prove nothing changed and the v1 frontend still works.
//   4. Apply the lockdown migration. Prove nothing changed, the v2 frontend works and the old open
//      lookup fails.
//   5. Attack suite as anon and as an ordinary signed-in user.
//   6. Run the check-in engine against the real claim function, twice at the same moment.
//
// Run: npm run test:db   (results also go to supabase/tests/last-run.json)

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { createServerDb } from '../../server/db.js';
import { runMonthlyCheckin } from '../../server/engine.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DB_URL = process.env.LOCAL_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const results = [];
function record(section, name, ok, detail = '') {
  results.push({ section, name, ok: Boolean(ok), detail: String(detail ?? '') });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${section}] ${name}${detail && !ok ? `: ${detail}` : ''}`);
}

function psqlFile(file) {
  execFileSync('psql', [DB_URL, '-v', 'ON_ERROR_STOP=1', '-q', '-1', '-f', file], { stdio: ['ignore', 'ignore', 'pipe'] });
}

function psql(sql) {
  return execFileSync('psql', [DB_URL, '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], { encoding: 'utf8' }).trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function status() {
  try {
    const raw = execFileSync('npx', ['supabase', 'status', '-o', 'json'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const s = JSON.parse(raw.slice(raw.indexOf('{')));
    return { url: s.API_URL, anon: s.ANON_KEY, service: s.SERVICE_ROLE_KEY };
  } catch {
    return null;
  }
}

const BASE_COLUMNS = {
  user_profiles: 'id, first_name, last_name, phone, email, is_admin, created_at',
  assessments: `id, user_id, assessment_date, created_at, ${[
    'faith', 'relationships', 'finances', 'health', 'purpose', 'character', 'contentment',
  ].map((d) => `${d}_score`).join(', ')}, faith_q1, faith_q2, faith_q3, relationships_q1, relationships_q2, relationships_q3, finances_q1, finances_q2, finances_q3, health_q1, health_q2, purpose_q1, purpose_q2, purpose_q3, character_q1, character_q2, character_q3, contentment_q1, contentment_q2, contentment_q3`,
  growth_plans: 'id, user_id, year, created_at, updated_at',
  goals: 'id, growth_plan_id, dimension, discipline, goal_name, goal_text, is_mandatory, sort_order, created_at, updated_at',
};

function checksums() {
  const out = {};
  for (const [table, cols] of Object.entries(BASE_COLUMNS)) {
    out[table] = psql(`select count(*) || ':' || md5(coalesce(string_agg(row_to_json(t)::text, '|' order by t.id), '')) from (select ${cols} from public.${table}) t`);
  }
  return out;
}

async function waitForSchema(client, table) {
  for (let i = 0; i < 30; i += 1) {
    const { error } = await client.from(table).select('*', { head: true, count: 'exact' }).limit(1);
    if (!error || !/schema cache|does not exist|Could not find/i.test(error.message)) return;
    await sleep(500);
  }
}

async function main() {
  const keys = status();
  try {
    psql('select 1');
  } catch {
    console.log('NOT RUN: no local database at', DB_URL, '. Start one with `npx supabase start` (needs Docker).');
    writeFileSync(`${HERE}last-run.json`, JSON.stringify({ ran: false, reason: 'no local database' }, null, 2));
    process.exit(2);
  }
  if (!keys) {
    console.log('NOT RUN: `supabase status` failed; the local API is not running.');
    process.exit(2);
  }
  if (!/127\.0\.0\.1|localhost/.test(DB_URL) || !/127\.0\.0\.1|localhost/.test(keys.url)) {
    console.log('Refusing to run against a non-local database.');
    process.exit(2);
  }

  const service = createClient(keys.url, keys.service, { auth: { persistSession: false, autoRefreshToken: false } });
  const anon = () => createClient(keys.url, keys.anon, { auth: { persistSession: false, autoRefreshToken: false } });

  // ------------------------------------------------------------------
  // 1. Rebuild and seed
  // ------------------------------------------------------------------
  psql(`
    drop table if exists public.checkin_sends, public.checkin_content, public.checkins, public.email_preferences cascade;
    drop function if exists public.login_email_for_phone(text), public.phone_is_registered(text), public.admin_stats(),
      public.admin_checkin_stats(), public.enqueue_checkin_sends(date), public.claim_checkin_sends(date, uuid, int, int),
      public.email_preferences_stamp(), public.checkin_responses_valid(jsonb) cascade;
    drop trigger if exists growth_plan_on_auth_user_created on auth.users;
    drop function if exists public.handle_new_user() cascade;
    delete from auth.users;
  `);
  psqlFile(`${HERE}baseline.sql`);
  psqlFile(`${HERE}seed-production-scale.sql`);
  await sleep(1500);

  const PASSWORD = 'Local-Test-Passw0rd';
  async function makeUser(email, meta) {
    const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: meta });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    return data.user.id;
  }
  const alice = await makeUser('alice@example.com', { first_name: 'Alice', last_name: 'A', phone: '865-111-0001' });
  const bob = await makeUser('bob@example.com', { first_name: 'Bob', last_name: 'B', phone: '865-111-0002' });
  const admin = await makeUser('admin@example.com', { first_name: 'Ada', last_name: 'Admin', phone: '865-111-0003' });
  const noProfile = await makeUser('noprofile@example.com', { first_name: 'Nolan', last_name: 'None', phone: '865-111-0004' });
  psql(`
    insert into public.user_profiles (id, first_name, last_name, phone, email, is_admin) values
      ('${alice}', 'Alice', 'A', '865-111-0001', 'alice@example.com', false),
      ('${bob}', 'Bob', 'B', '865-111-0002', 'bob@example.com', false),
      ('${admin}', 'Ada', 'Admin', '865-111-0003', 'admin@example.com', true);
    insert into public.assessments (user_id, faith_q1, faith_q2, faith_q3, relationships_q1, relationships_q2, relationships_q3, finances_q1, finances_q2, finances_q3, health_q1, health_q2, purpose_q1, purpose_q2, purpose_q3, character_q1, character_q2, character_q3, contentment_q1, contentment_q2, contentment_q3, faith_score, relationships_score, finances_score, health_score, purpose_score, character_score, contentment_score)
      select u, 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5, 5,5,5,5,5,5,5
      from unnest(array['${alice}','${alice}','${alice}','${bob}','${bob}','${admin}']::uuid[]) u;
    insert into public.growth_plans (id, user_id, year) values
      ('aaaaaaaa-0000-4000-8000-000000000001', '${alice}', 2026),
      ('bbbbbbbb-0000-4000-8000-000000000001', '${bob}', 2026),
      ('cccccccc-0000-4000-8000-000000000001', '${admin}', 2026);
    insert into public.goals (id, growth_plan_id, dimension, discipline, goal_name, goal_text, is_mandatory, sort_order)
      select ('aaaaaaaa-1111-4000-8000-0000000000' || lpad(g::text, 2, '0'))::uuid, 'aaaaaaaa-0000-4000-8000-000000000001', 'faith', null, 'Alice goal', 'Alice goal ' || g, false, g from generate_series(1, 10) g;
    insert into public.goals (id, growth_plan_id, dimension, discipline, goal_name, goal_text, is_mandatory, sort_order)
      select ('bbbbbbbb-1111-4000-8000-0000000000' || lpad(g::text, 2, '0'))::uuid, 'bbbbbbbb-0000-4000-8000-000000000001', 'health', null, 'Bob goal', 'Bob goal ' || g, false, g from generate_series(1, 8) g;
    insert into public.goals (growth_plan_id, dimension, goal_name, goal_text, is_mandatory, sort_order)
      select 'cccccccc-0000-4000-8000-000000000001', 'faith', 'Admin goal', 'Admin goal ' || g, false, g from generate_series(1, 2) g;
  `);
  psql(`notify pgrst, 'reload schema'`);
  await sleep(1000);

  const counts = psql(`select (select count(*) from public.user_profiles) || ',' || (select count(*) from public.assessments) || ',' || (select count(*) from public.growth_plans) || ',' || (select count(*) from public.goals) || ',' || (select count(*) from auth.users u where not exists (select 1 from public.user_profiles p where p.id = u.id))`);
  const [nProfiles, nAssess, nPlans, nGoals, nOrphans] = counts.split(',').map(Number);
  record('rehearsal', `seeded ${nProfiles} profiles, ${nAssess} assessments, ${nPlans} plans, ${nGoals} goals, ${nOrphans} auth users with no profile`,
    nProfiles === 1200 && nAssess === 930 && nPlans === 730 && nGoals === 11200 && nOrphans === 16, counts);
  const awkward = psql(`select (select count(*) from public.goals where length(goal_text) >= 5000) || ',' || (select count(*) from public.goals where goal_text = '' and is_mandatory) || ',' || (select count(*) from public.growth_plans p where not exists (select 1 from public.goals g where g.growth_plan_id = p.id)) || ',' || (select count(*) from (select user_id from public.assessments group by user_id having count(*) = 6) x)`);
  record('rehearsal', 'seed includes 5,000-character text, blank required goals, plans with no goals, people with six assessments', awkward.split(',').every((n) => Number(n) > 0), awkward);

  const before = checksums();

  // ------------------------------------------------------------------
  // 2. The v1 frontend, before any migration (control)
  // ------------------------------------------------------------------
  async function signIn(email) {
    const c = anon();
    const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
    if (error) throw new Error(`sign in ${email}: ${error.message}`);
    return c;
  }
  async function v1Flows(label) {
    const a = anon();
    const { data: lookup } = await a.from('user_profiles').select('email').eq('phone', '865-111-0001').maybeSingle();
    record(label, 'v1 phone lookup (anon select) returns the email', lookup?.email === 'alice@example.com', JSON.stringify(lookup));
    const c = await signIn('alice@example.com');
    const { data: plan } = await c.from('growth_plans').select('*').eq('user_id', alice).eq('year', 2026).single();
    const { data: goals } = await c.from('goals').select('*').eq('growth_plan_id', plan?.id).order('sort_order');
    record(label, 'v1 load plan returns the plan and its goals', plan && goals?.length >= 1, `${goals?.length}`);
    // v1 save: delete the dimension's goals, then insert the new list
    const del = await c.from('goals').delete().eq('growth_plan_id', plan.id).eq('dimension', 'purpose');
    const ins = await c.from('goals').insert([{ growth_plan_id: plan.id, dimension: 'purpose', discipline: 'Serving', goal_name: 'Serving', goal_text: `v1 save ${label}`, is_mandatory: true, sort_order: 0 }]);
    record(label, 'v1 save goals (delete then insert) works', !del.error && !ins.error, del.error?.message || ins.error?.message);
    await c.from('goals').delete().eq('growth_plan_id', plan.id).eq('dimension', 'purpose');
    const ad = await signIn('admin@example.com');
    const { data: all, error: adErr } = await ad.from('assessments').select('faith_score');
    record(label, 'v1 admin page can read assessments', !adErr && all?.length > 900, adErr?.message ?? `${all?.length} rows (PostgREST caps at 1,000)`);
  }
  await v1Flows('before migrations');

  // ------------------------------------------------------------------
  // 3. Additive migrations
  // ------------------------------------------------------------------
  psqlFile(`${ROOT}supabase/migrations/20261117000100_additive.sql`);
  psqlFile(`${ROOT}supabase/migrations/20261117000150_checkins.sql`);
  await sleep(1500);
  await waitForSchema(service, 'email_preferences');
  record('rehearsal', 'additive migrations apply cleanly', true);
  const afterAdditive = checksums();
  for (const t of Object.keys(BASE_COLUMNS)) record('rehearsal', `${t}: every pre-existing column unchanged after the additive migrations`, before[t] === afterAdditive[t], `${before[t]} vs ${afterAdditive[t]}`);
  const defaults = psql(`select (select count(*) from public.assessments where version <> 1) || ',' || (select count(*) from public.goals where status <> 'active')`);
  record('rehearsal', 'existing rows read as version 1 and status active', defaults === '0,0', defaults);

  await v1Flows('after additive');

  // v1 signup against the additive schema: trigger creates the profile; the old client upsert may
  // fail and is ignored by the old code.
  {
    const a = anon();
    const { data: exists } = await a.from('user_profiles').select('id').eq('phone', '865-111-0005').maybeSingle();
    const { data: su, error } = await a.auth.signUp({ email: 'v1signup@example.com', password: PASSWORD, options: { data: { first_name: 'Vee', last_name: 'One', phone: '865-111-0005' } } });
    await a.from('user_profiles').upsert({ id: su?.user?.id, first_name: 'Vee', last_name: 'One', phone: '865-111-0005', email: 'v1signup@example.com' }, { onConflict: 'id' });
    const row = psql(`select first_name || '|' || phone || '|' || email from public.user_profiles where id = '${su?.user?.id}'`);
    record('after additive', 'v1 signup still creates a full profile (trigger)', !exists && !error && row === 'Vee|865-111-0005|v1signup@example.com', error?.message ?? row);
    const { data: l2 } = await a.from('user_profiles').select('email').eq('phone', '865-111-0005').maybeSingle();
    record('after additive', 'v1 login lookup finds the new signup', l2?.email === 'v1signup@example.com');
  }
  {
    // A duplicate phone never blocks a signup.
    const a = anon();
    const { data: su, error } = await a.auth.signUp({ email: 'dupphone@example.com', password: PASSWORD, options: { data: { first_name: 'Dup', phone: '865-111-0001' } } });
    const row = psql(`select coalesce(phone, 'null') from public.user_profiles where id = '${su?.user?.id}'`);
    record('after additive', 'signup with a phone already in use still succeeds, without the phone', !error && row === 'null', error?.message ?? row);
  }

  // ------------------------------------------------------------------
  // 4. Lockdown
  // ------------------------------------------------------------------
  const beforeLockdown = checksums();
  psqlFile(`${ROOT}supabase/migrations/20261117000200_lockdown.sql`);
  await sleep(1500);
  record('rehearsal', 'lockdown migration applies cleanly (its own checks passed)', true);
  const afterLockdown = checksums();
  for (const t of Object.keys(BASE_COLUMNS)) record('rehearsal', `${t}: every pre-existing column unchanged by the lockdown`, beforeLockdown[t] === afterLockdown[t]);
  // Rows added by the rehearsal's own v1 flows are the only difference from the original checksum.
  record('rehearsal', 'assessments and plans byte-identical from seed to lockdown', before.assessments === afterLockdown.assessments && before.growth_plans === afterLockdown.growth_plans);

  {
    const a = anon();
    const { data, error } = await a.from('user_profiles').select('email').eq('phone', '865-111-0001');
    record('after lockdown', 'the old open phone lookup no longer returns anything', (data ?? []).length === 0 || Boolean(error), JSON.stringify(data ?? error?.message));
  }

  // v2 frontend flows
  {
    const a = anon();
    const { data: email } = await a.rpc('login_email_for_phone', { p_phone: '865-111-0001' });
    record('v2 frontend', 'login_email_for_phone returns the email', email === 'alice@example.com', email);
    const { data: reg } = await a.rpc('phone_is_registered', { p_phone: '865-111-0002' });
    record('v2 frontend', 'phone_is_registered is true for a registered phone', reg === true);
    const c = await signIn(email);
    const { data: me } = await c.from('user_profiles').select('first_name, is_admin').eq('id', alice).maybeSingle();
    record('v2 frontend', 'a signed-in person can read their own profile', me?.first_name === 'Alice', JSON.stringify(me));
    const goalId = '0e0e0e0e-0000-4000-8000-000000000001';
    const up1 = await c.from('goals').upsert({ id: goalId, growth_plan_id: 'aaaaaaaa-0000-4000-8000-000000000001', dimension: 'health', goal_name: 'Sleep', goal_text: 'Go to bed on time every day.', practice_key: 'sleep', cadence: 'daily', status: 'active', is_mandatory: false, sort_order: 50 }, { onConflict: 'id' }).select().single();
    const up2 = await c.from('goals').upsert({ id: goalId, growth_plan_id: 'aaaaaaaa-0000-4000-8000-000000000001', dimension: 'health', goal_name: 'Sleep', goal_text: 'Go to bed by ten every day.', practice_key: 'sleep', cadence: 'daily', status: 'paused', is_mandatory: false, sort_order: 50 }, { onConflict: 'id' }).select().single();
    record('v2 frontend', 'per-goal upsert inserts, then updates the same row', !up1.error && !up2.error && up2.data?.goal_text === 'Go to bed by ten every day.', up1.error?.message || up2.error?.message);
    const del = await c.from('goals').delete().eq('id', goalId);
    record('v2 frontend', 'per-goal delete removes only that goal', !del.error && psql(`select count(*) from public.goals where growth_plan_id = 'aaaaaaaa-0000-4000-8000-000000000001'`) === '10');
    const plan = await c.from('growth_plans').update({ focus_dimensions: ['faith', 'health'] }).eq('id', 'aaaaaaaa-0000-4000-8000-000000000001').select().single();
    record('v2 frontend', 'focus areas save', !plan.error && plan.data.focus_dimensions.length === 2, plan.error?.message);
    const ins = await c.from('assessments').insert({ user_id: alice, version: 2, habit_responses: { faith_prayer: 3 }, habit_scores: { faith: 7.8 }, faith_q1: 7, faith_q2: 7, faith_q3: 7, relationships_q1: 7, relationships_q2: 7, relationships_q3: 7, finances_q1: 7, finances_q2: 7, finances_q3: 7, health_q1: 7, health_q2: 7, purpose_q1: 7, purpose_q2: 7, purpose_q3: 7, character_q1: 7, character_q2: 7, character_q3: 7, contentment_q1: 7, contentment_q2: 7, contentment_q3: 7, faith_score: 7, relationships_score: 7, finances_score: 7, health_score: 7, purpose_score: 7, character_score: 7, contentment_score: 7 }).select().single();
    record('v2 frontend', 'a version 2 assessment saves', !ins.error && ins.data.version === 2, ins.error?.message);
    const pref = await c.from('email_preferences').upsert({ user_id: alice, monthly_checkin: true, email: 'alice.checkins@example.com', opted_in_at: '2000-01-01T00:00:00Z' }, { onConflict: 'user_id' }).select().single();
    record('v2 frontend', 'opt-in saves, and the opt-in time is set by the server', !pref.error && pref.data.monthly_checkin && pref.data.opted_in_at > '2026', pref.error?.message ?? pref.data?.opted_in_at);
    const off = await c.from('email_preferences').update({ monthly_checkin: false }).eq('user_id', alice).select().single();
    record('v2 frontend', 'opt-out records its time', !off.error && Boolean(off.data.opted_out_at), off.error?.message);
    await c.from('email_preferences').update({ monthly_checkin: true }).eq('user_id', alice);
    const bad = await c.from('email_preferences').update({ email: 'x@y.z\r\nBcc: evil@example.com' }).eq('user_id', alice);
    record('v2 frontend', 'an address with a line break is refused', Boolean(bad.error));
    const ci = await c.from('checkins').upsert({ user_id: alice, growth_plan_id: 'aaaaaaaa-0000-4000-8000-000000000001', period: '2026-12-01', responses: { 'aaaaaaaa-1111-4000-8000-000000000001': 3 } }, { onConflict: 'user_id,period' }).select().single();
    record('v2 frontend', 'a signed-in check-in saves', !ci.error, ci.error?.message);
    const ci2 = await c.from('checkins').insert({ user_id: alice, period: '2026-12-01', responses: {} });
    record('v2 frontend', 'a second check-in for the same month is refused by the unique key', Boolean(ci2.error));
    const badResp = await c.from('checkins').upsert({ user_id: alice, period: '2027-01-01', responses: { 'aaaaaaaa-1111-4000-8000-000000000001': 9 } }, { onConflict: 'user_id,period' });
    record('v2 frontend', 'check-in answers outside 0 to 4 are refused', Boolean(badResp.error));

    // Self-heal for an auth user with no profile row
    const n = await signIn('noprofile@example.com');
    const heal = await n.from('user_profiles').upsert({ id: noProfile, first_name: 'Nolan', last_name: 'None', phone: '865-111-0004', email: 'noprofile@example.com' }, { onConflict: 'id', ignoreDuplicates: true });
    const healed = psql(`select first_name || '|' || is_admin from public.user_profiles where id = '${noProfile}'`);
    record('v2 frontend', 'self-heal creates a missing profile, never as admin', !heal.error && healed === 'Nolan|false', heal.error?.message ?? healed);
    const again = await n.from('user_profiles').upsert({ id: noProfile, first_name: 'Changed' }, { onConflict: 'id', ignoreDuplicates: true });
    record('v2 frontend', 'self-heal never overwrites an existing profile', !again.error && psql(`select first_name from public.user_profiles where id = '${noProfile}'`) === 'Nolan');

    const ad = await signIn('admin@example.com');
    const st = await ad.rpc('admin_stats');
    record('v2 frontend', 'admin_stats counts every row (past the 1,000-row cap)', !st.error && st.data.totals.assessments >= 931 && st.data.totals.goals >= 11200, st.error?.message ?? JSON.stringify(st.data?.totals));
    const cs = await ad.rpc('admin_checkin_stats');
    record('v2 frontend', 'admin_checkin_stats works for an admin', !cs.error && Array.isArray(cs.data.periods), cs.error?.message);
    const content = await ad.from('checkin_content').select('period');
    record('v2 frontend', 'admins read the thirteen seeded editions', !content.error && content.data.length === 13, content.error?.message ?? content.data?.length);
    const edit = await ad.from('checkin_content').update({ preheader: 'Edited by an admin.' }).eq('period', '2027-01-01').select();
    record('v2 frontend', 'admins can edit an edition', !edit.error && edit.data.length === 1, edit.error?.message);
  }

  // ------------------------------------------------------------------
  // 5. Attack suite
  // ------------------------------------------------------------------
  {
    const a = anon();
    const r1 = await a.from('user_profiles').select('*');
    record('attack: anon', 'cannot read a single row of user_profiles', (r1.data ?? []).length === 0, JSON.stringify(r1.error?.message ?? r1.data?.length));
    const r1b = await a.from('user_profiles').select('email').eq('id', alice);
    record('attack: anon', 'cannot read a profile by id', (r1b.data ?? []).length === 0);
    for (const p of ['865-111', '865-111-000', '%', '865%', '_65-111-0001', '', ' ', '865-111-0001 ', "865-111-0001' or '1'='1", null]) {
      const { data } = await a.rpc('login_email_for_phone', { p_phone: p });
      const { data: reg } = await a.rpc('phone_is_registered', { p_phone: p });
      record('attack: anon', `phone lookup returns nothing for ${JSON.stringify(p)}`, data == null && reg === false, `${data} / ${reg}`);
    }
    for (const t of ['assessments', 'growth_plans', 'goals', 'checkins', 'email_preferences', 'checkin_content', 'checkin_sends']) {
      const r = await a.from(t).select('*').limit(5);
      record('attack: anon', `reads nothing from ${t}`, (r.data ?? []).length === 0, r.error?.message ?? r.data?.length);
    }
    const ins = await a.from('user_profiles').insert({ id: '99999999-0000-4000-8000-000000000001', first_name: 'Evil', is_admin: true });
    record('attack: anon', 'cannot insert a profile', Boolean(ins.error));
    for (const fn of ['admin_stats', 'admin_checkin_stats', 'is_current_user_admin']) {
      const r = await a.rpc(fn);
      record('attack: anon', `cannot call ${fn}()`, Boolean(r.error), r.error?.message);
    }
    const cl = await a.rpc('claim_checkin_sends', { p_period: '2026-12-01', p_claim: '99999999-0000-4000-8000-000000000001' });
    record('attack: anon', 'cannot call the send claim function', Boolean(cl.error));
  }
  {
    const b = await signIn('bob@example.com');
    // Read
    for (const [t, col] of [['assessments', 'user_id'], ['growth_plans', 'user_id'], ['checkins', 'user_id'], ['email_preferences', 'user_id']]) {
      const r = await b.from(t).select('*').eq(col, alice);
      record('attack: user', `cannot read another person's ${t}`, (r.data ?? []).length === 0, r.data?.length);
    }
    const g = await b.from('goals').select('*').eq('id', 'aaaaaaaa-1111-4000-8000-000000000001');
    record('attack: user', "cannot read another person's goal by guessing its id", (g.data ?? []).length === 0);
    const gp = await b.from('goals').select('*').eq('growth_plan_id', 'aaaaaaaa-0000-4000-8000-000000000001');
    record('attack: user', "cannot read another person's goals by plan id", (gp.data ?? []).length === 0);
    const pr = await b.from('user_profiles').select('*').neq('id', bob);
    record('attack: user', "cannot read anyone else's profile", (pr.data ?? []).length === 0, pr.data?.length);
    // Change
    const before2 = psql(`select md5(string_agg(row_to_json(t)::text, '|' order by id)) from (select * from public.goals where growth_plan_id = 'aaaaaaaa-0000-4000-8000-000000000001') t`);
    await b.from('goals').update({ goal_text: 'hacked' }).eq('id', 'aaaaaaaa-1111-4000-8000-000000000001');
    await b.from('goals').delete().eq('id', 'aaaaaaaa-1111-4000-8000-000000000002');
    await b.from('goals').delete().eq('growth_plan_id', 'aaaaaaaa-0000-4000-8000-000000000001');
    const up = await b.from('goals').upsert({ id: 'aaaaaaaa-1111-4000-8000-000000000003', growth_plan_id: 'bbbbbbbb-0000-4000-8000-000000000001', dimension: 'faith', goal_text: 'stolen' }, { onConflict: 'id' });
    const intoA = await b.from('goals').insert({ growth_plan_id: 'aaaaaaaa-0000-4000-8000-000000000001', dimension: 'faith', goal_text: 'planted' });
    const after2 = psql(`select md5(string_agg(row_to_json(t)::text, '|' order by id)) from (select * from public.goals where growth_plan_id = 'aaaaaaaa-0000-4000-8000-000000000001') t`);
    record('attack: user', "cannot change, delete, take over or add to another person's goals", before2 === after2 && Boolean(up.error) && Boolean(intoA.error), `${up.error?.message} / ${intoA.error?.message}`);
    const ua = await b.from('assessments').update({ faith_score: 1 }).eq('user_id', alice).select();
    const da = await b.from('assessments').delete().eq('user_id', alice).select();
    const fa = await b.from('assessments').insert({ user_id: alice, faith_q1: 1, faith_q2: 1, faith_q3: 1, relationships_q1: 1, relationships_q2: 1, relationships_q3: 1, finances_q1: 1, finances_q2: 1, finances_q3: 1, health_q1: 1, health_q2: 1, purpose_q1: 1, purpose_q2: 1, purpose_q3: 1, character_q1: 1, character_q2: 1, character_q3: 1, contentment_q1: 1, contentment_q2: 1, contentment_q3: 1, faith_score: 1, relationships_score: 1, finances_score: 1, health_score: 1, purpose_score: 1, character_score: 1, contentment_score: 1 });
    record('attack: user', "cannot change, delete or forge another person's assessments", (ua.data ?? []).length === 0 && (da.data ?? []).length === 0 && Boolean(fa.error));
    const upPlan = await b.from('growth_plans').update({ year: 2030 }).eq('id', 'aaaaaaaa-0000-4000-8000-000000000001').select();
    const delPlan = await b.from('growth_plans').delete().eq('id', 'aaaaaaaa-0000-4000-8000-000000000001').select();
    record('attack: user', "cannot change or delete another person's plan", (upPlan.data ?? []).length === 0 && (delPlan.data ?? []).length === 0 && psql(`select year from public.growth_plans where id = 'aaaaaaaa-0000-4000-8000-000000000001'`) === '2026');
    const ciA = await b.from('checkins').insert({ user_id: alice, period: '2027-02-01', responses: {} });
    const ciPlan = await b.from('checkins').insert({ user_id: bob, growth_plan_id: 'aaaaaaaa-0000-4000-8000-000000000001', period: '2027-02-01', responses: {} });
    const ciUp = await b.from('checkins').update({ note: 'hacked' }).eq('user_id', alice).select();
    record('attack: user', "cannot write another person's check-ins or point one at their plan", Boolean(ciA.error) && Boolean(ciPlan.error) && (ciUp.data ?? []).length === 0);
    const epA = await b.from('email_preferences').upsert({ user_id: alice, monthly_checkin: false }, { onConflict: 'user_id' });
    const epU = await b.from('email_preferences').update({ email: 'bob@evil.example' }).eq('user_id', alice).select();
    record('attack: user', "cannot change another person's email preferences", Boolean(epA.error) && (epU.data ?? []).length === 0 && psql(`select monthly_checkin || '|' || email from public.email_preferences where user_id = '${alice}'`) === 'true|alice.checkins@example.com');
    // is_admin
    const u1 = await b.from('user_profiles').update({ is_admin: true }).eq('id', bob);
    const u2 = await b.from('user_profiles').upsert({ id: bob, first_name: 'Bob', is_admin: true }, { onConflict: 'id' });
    const u3 = await b.from('user_profiles').update({ first_name: 'Bobby' }).eq('id', bob).select();
    record('attack: user', 'cannot set is_admin by update or upsert', Boolean(u1.error) && Boolean(u2.error) && psql(`select is_admin from public.user_profiles where id = '${bob}'`) === 'f');
    record('attack: user', 'can still edit their own name', !u3.error && u3.data?.[0]?.first_name === 'Bobby', u3.error?.message);
    const c3 = await b.from('user_profiles').update({ first_name: 'Hacked' }).eq('id', alice).select();
    record('attack: user', "cannot edit another person's profile", (c3.data ?? []).length === 0 && psql(`select first_name from public.user_profiles where id = '${alice}'`) === 'Alice');
    // An auth user with no profile tries to create one as admin
    const orphanEmail = 'orphan-test@example.com';
    const orphan = await makeUser(orphanEmail, { first_name: 'O' });
    psql(`delete from public.user_profiles where id = '${orphan}'`);
    const o = await signIn(orphanEmail);
    const oi = await o.from('user_profiles').insert({ id: orphan, first_name: 'O', is_admin: true });
    const oi2 = await o.from('user_profiles').insert({ id: bob, first_name: 'Not me' });
    record('attack: user', 'cannot insert a profile with is_admin, or for someone else', Boolean(oi.error) && Boolean(oi2.error) && psql(`select count(*) from public.user_profiles where id = '${orphan}' and is_admin`) === '0');
    // Non-admin admin functions and tables
    for (const fn of ['admin_stats', 'admin_checkin_stats']) {
      const r = await b.rpc(fn);
      record('attack: user', `a non-admin cannot call ${fn}()`, Boolean(r.error), r.error?.message);
    }
    const cc = await b.from('checkin_content').select('*');
    const ccw = await b.from('checkin_content').update({ subject: 'hacked' }).eq('period', '2027-01-01').select();
    record('attack: user', 'a non-admin cannot read or edit checkin_content', (cc.data ?? []).length === 0 && (ccw.data ?? []).length === 0);
    const cs = await b.from('checkin_sends').select('*');
    record('attack: user', 'a non-admin cannot read checkin_sends', (cs.data ?? []).length === 0 && Boolean(cs.error), cs.error?.message);
    const cl = await b.rpc('claim_checkin_sends', { p_period: '2026-12-01', p_claim: '99999999-0000-4000-8000-000000000001' });
    const en = await b.rpc('enqueue_checkin_sends', { p_period: '2026-12-01' });
    record('attack: user', 'a signed-in user cannot run the send queue', Boolean(cl.error) && Boolean(en.error));
    const adminRead = await b.from('assessments').select('id');
    record('attack: user', 'reads only their own assessments', (adminRead.data ?? []).length === 2, adminRead.data?.length);
  }

  // ------------------------------------------------------------------
  // 6. Engine against the real claim function
  // ------------------------------------------------------------------
  {
    psql(`insert into public.email_preferences (user_id, monthly_checkin)
          select id, true from public.user_profiles where email like 'seed%' order by email limit 300
          on conflict (user_id) do update set monthly_checkin = true`);
    const db = createServerDb(service);
    const sent = [];
    const mailer = { async send(p) { sent.push(p.personalizations[0].to[0].email); await sleep(2); return { ok: true, status: 202 }; } };
    const env = { APP_URL: 'https://growthplan.example.org', CHECKIN_TOKEN_SECRET: 'local-secret-local-secret-local-secret', CHECKIN_FROM_EMAIL: 'x@example.org' };
    const now = new Date('2026-12-07T13:00:00Z');
    const runs = await Promise.all([
      runMonthlyCheckin({ now, db, mailer, env, options: { batchSize: 20, concurrency: 5 } }),
      runMonthlyCheckin({ now, db, mailer, env, options: { batchSize: 15, concurrency: 5 } }),
      runMonthlyCheckin({ now, db, mailer, env, options: { batchSize: 25, concurrency: 5 } }),
    ]);
    const expected = Number(psql(`select count(*) from public.email_preferences ep join public.user_profiles up on up.id = ep.user_id where ep.monthly_checkin and coalesce(ep.email, up.email) is not null`));
    record('engine (real database)', `three runs at the same moment send ${expected} emails, one each`, sent.length === expected && new Set(sent).size === expected, `${sent.length} sent, ${new Set(sent).size} unique, runs: ${runs.map((r) => r.sent).join('+')}`);
    const again = await runMonthlyCheckin({ now, db, mailer, env });
    record('engine (real database)', 'a fourth run sends nothing', again.sent === 0 && sent.length === expected);
    const rows = psql(`select count(*) || ',' || count(*) filter (where status = 'sent') from public.checkin_sends where period = '2026-12-01'`);
    record('engine (real database)', 'every queued row is marked sent', rows === `${expected},${expected}`, rows);
  }

  const failed = results.filter((r) => !r.ok);
  writeFileSync(`${HERE}last-run.json`, JSON.stringify({ ran: true, at: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('ERROR', err);
  process.exit(1);
});

