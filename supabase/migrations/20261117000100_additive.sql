-- v2 phase 1, part 1: additive only.
-- Safe to apply while the old (v1) frontend is still live. Nothing here removes, rewrites or
-- tightens anything the old frontend uses. Apply order is in docs/STATE.md and the PR description.

-- ---------------------------------------------------------------------------
-- Login helpers. These replace the open SELECT on user_profiles that the login
-- and signup forms used. Each returns one value for one exact phone match.
-- ---------------------------------------------------------------------------

create or replace function public.login_email_for_phone(p_phone text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select up.email
  from public.user_profiles up
  where p_phone is not null
    and length(btrim(p_phone)) between 7 and 20
    and up.phone = p_phone
  limit 1;
$$;

create or replace function public.phone_is_registered(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where p_phone is not null
      and length(btrim(p_phone)) between 7 and 20
      and up.phone = p_phone
  );
$$;

revoke all on function public.login_email_for_phone(text) from public;
revoke all on function public.phone_is_registered(text) from public;
grant execute on function public.login_email_for_phone(text) to anon, authenticated;
grant execute on function public.phone_is_registered(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Create the profile row on the server when an auth user is created, from the
-- metadata the signup form already sends. This must never block a signup, so a
-- duplicate phone falls back to a row without the phone, and any other failure
-- is logged and skipped (the app self-heals a missing profile at sign-in).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := nullif(btrim(new.raw_user_meta_data ->> 'first_name'), '');
  v_last  text := nullif(btrim(new.raw_user_meta_data ->> 'last_name'), '');
  v_phone text := nullif(btrim(new.raw_user_meta_data ->> 'phone'), '');
begin
  begin
    insert into public.user_profiles (id, first_name, last_name, phone, email)
    values (new.id, v_first, v_last, v_phone, new.email)
    on conflict (id) do nothing;
  exception
    when unique_violation then
      begin
        insert into public.user_profiles (id, first_name, last_name, email)
        values (new.id, v_first, v_last, new.email)
        on conflict (id) do nothing;
      exception when others then
        raise warning 'handle_new_user: could not create profile for %: %', new.id, sqlerrm;
      end;
    when others then
      raise warning 'handle_new_user: could not create profile for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists growth_plan_on_auth_user_created on auth.users;
create trigger growth_plan_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Pin the search_path of the existing admin check (a SECURITY DEFINER function
-- without one can be hijacked through objects in other schemas).
-- ---------------------------------------------------------------------------

alter function public.is_current_user_admin() set search_path = public;

-- ---------------------------------------------------------------------------
-- New columns. Existing rows keep every value they have today.
-- ---------------------------------------------------------------------------

alter table public.assessments
  add column if not exists version smallint not null default 1,
  add column if not exists habit_responses jsonb,
  add column if not exists habit_scores jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assessments_version_check') then
    alter table public.assessments
      add constraint assessments_version_check check (version in (1, 2));
  end if;
end $$;

alter table public.growth_plans
  add column if not exists focus_dimensions text[],
  add column if not exists copied_from_plan_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'growth_plans_focus_dimensions_check') then
    alter table public.growth_plans
      add constraint growth_plans_focus_dimensions_check check (
        focus_dimensions is null
        or (
          cardinality(focus_dimensions) <= 3
          and focus_dimensions <@ array['faith','relationships','finances','health','purpose','character','contentment']::text[]
        )
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'growth_plans_copied_from_plan_id_fkey') then
    alter table public.growth_plans
      add constraint growth_plans_copied_from_plan_id_fkey
      foreign key (copied_from_plan_id) references public.growth_plans(id) on delete set null;
  end if;
end $$;

alter table public.goals
  add column if not exists practice_key text,
  add column if not exists cadence text,
  add column if not exists anchor text,
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'goals_status_check') then
    alter table public.goals
      add constraint goals_status_check check (status in ('active', 'paused', 'done'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Admin statistics, computed in the database. The old admin page selected every
-- assessment row in the browser, which PostgREST caps at 1,000 rows.
-- ---------------------------------------------------------------------------

create or replace function public.admin_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  if not public.is_current_user_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select json_build_object(
    'generated_at', now(),
    'totals', json_build_object(
      'users', (select count(*) from public.user_profiles),
      'assessments', (select count(*) from public.assessments),
      'assessments_v1', (select count(*) from public.assessments where version = 1),
      'assessments_v2', (select count(*) from public.assessments where version = 2),
      'plans', (select count(*) from public.growth_plans),
      'goals', (select count(*) from public.goals),
      'habits', (select count(*) from public.goals where btrim(goal_text) <> '')
    ),
    'flourishing', (
      select json_build_object(
        'faith', round(avg(faith_score), 1),
        'relationships', round(avg(relationships_score), 1),
        'finances', round(avg(finances_score), 1),
        'health', round(avg(health_score), 1),
        'purpose', round(avg(purpose_score), 1),
        'character', round(avg(character_score), 1),
        'contentment', round(avg(contentment_score), 1)
      ) from public.assessments
    ),
    'questions', (
      select json_build_object(
        'faith_q1', round(avg(faith_q1), 1), 'faith_q2', round(avg(faith_q2), 1), 'faith_q3', round(avg(faith_q3), 1),
        'relationships_q1', round(avg(relationships_q1), 1), 'relationships_q2', round(avg(relationships_q2), 1), 'relationships_q3', round(avg(relationships_q3), 1),
        'finances_q1', round(avg(finances_q1), 1), 'finances_q2', round(avg(finances_q2), 1), 'finances_q3', round(avg(finances_q3), 1),
        'health_q1', round(avg(health_q1), 1), 'health_q2', round(avg(health_q2), 1),
        'purpose_q1', round(avg(purpose_q1), 1), 'purpose_q2', round(avg(purpose_q2), 1), 'purpose_q3', round(avg(purpose_q3), 1),
        'character_q1', round(avg(character_q1), 1), 'character_q2', round(avg(character_q2), 1), 'character_q3', round(avg(character_q3), 1),
        'contentment_q1', round(avg(contentment_q1), 1), 'contentment_q2', round(avg(contentment_q2), 1), 'contentment_q3', round(avg(contentment_q3), 1),
        'responses', count(*)
      ) from public.assessments
    ),
    'habits', (
      select json_build_object(
        'faith', round(avg((habit_scores ->> 'faith')::numeric), 1),
        'relationships', round(avg((habit_scores ->> 'relationships')::numeric), 1),
        'finances', round(avg((habit_scores ->> 'finances')::numeric), 1),
        'health', round(avg((habit_scores ->> 'health')::numeric), 1),
        'purpose', round(avg((habit_scores ->> 'purpose')::numeric), 1),
        'character', round(avg((habit_scores ->> 'character')::numeric), 1),
        'contentment', round(avg((habit_scores ->> 'contentment')::numeric), 1),
        'responses', count(*)
      ) from public.assessments where version = 2 and habit_scores is not null
    ),
    'plans_by_year', coalesce((
      select json_agg(json_build_object('year', year, 'count', n) order by year)
      from (select year, count(*) as n from public.growth_plans group by year) y
    ), '[]'::json),
    'avg_habits_per_plan', (
      select case when count(*) = 0 then null
        else round(((select count(*) from public.goals where btrim(goal_text) <> '')::numeric / count(*)), 1) end
      from public.growth_plans
    ),
    'top_practices', coalesce((
      select json_agg(json_build_object('practice_key', practice_key, 'count', n) order by n desc, practice_key)
      from (
        select practice_key, count(*) as n
        from public.goals
        where practice_key is not null and btrim(goal_text) <> ''
        group by practice_key
        order by n desc, practice_key
        limit 10
      ) p
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

notify pgrst, 'reload schema';
