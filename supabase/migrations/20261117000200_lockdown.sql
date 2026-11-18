-- v2 phase 1, part 2: lockdown.
-- APPLY ONLY AFTER the v2 frontend is deployed. The v1 login form reads user_profiles directly
-- as anon, and this migration removes that access.
--
-- The live policy names on user_profiles and the admin policies are not all known, so the
-- policies are found by what they do, not only by name. The block at the end checks the result
-- and aborts the whole migration (nothing is applied) if an open policy is still in place.

-- ---------------------------------------------------------------------------
-- 1. user_profiles: remove the open SELECT and the open INSERT
-- ---------------------------------------------------------------------------

drop policy if exists "Allow phone lookup for login" on public.user_profiles;

do $$
declare
  p record;
begin
  -- Any other SELECT policy that lets everyone read every row
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'user_profiles'
      and cmd in ('SELECT', 'ALL')
      and btrim(coalesce(qual, '')) in ('true', '(true)')
  loop
    execute format('drop policy %I on public.user_profiles', p.policyname);
  end loop;

  -- Any INSERT policy that lets anyone insert any row, or that is for anon. Owner policies
  -- (for example FOR ALL TO public WITH CHECK (auth.uid() = id)) are left alone.
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'user_profiles'
      and cmd in ('INSERT', 'ALL')
      and (
        btrim(coalesce(with_check, '')) in ('true', '(true)')
        or (cmd = 'INSERT' and 'anon' = any (roles))
      )
  loop
    execute format('drop policy %I on public.user_profiles', p.policyname);
  end loop;
end $$;

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile" on public.user_profiles
  for insert to authenticated
  with check (auth.uid() = id);

-- Owners must still read and edit their own row, whatever the live policies were called.
drop policy if exists "Users can read own profile (v2)" on public.user_profiles;
create policy "Users can read own profile (v2)" on public.user_profiles
  for select to authenticated
  using (auth.uid() = id);
drop policy if exists "Users can update own profile (v2)" on public.user_profiles;
create policy "Users can update own profile (v2)" on public.user_profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. is_admin can never be written from the client
-- ---------------------------------------------------------------------------

revoke insert, update on public.user_profiles from anon, authenticated, public;
revoke select, delete on public.user_profiles from anon;
grant insert (id, first_name, last_name, phone, email) on public.user_profiles to authenticated;
grant update (first_name, last_name, phone, email) on public.user_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Admin read policies apply to signed-in users only
-- ---------------------------------------------------------------------------

-- Only SELECT policies that are purely the admin check are replaced. A policy that also lets
-- owners in (for example "auth.uid() = user_id OR is_current_user_admin()") is left alone.
do $$
declare
  p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('assessments', 'growth_plans', 'goals')
      and cmd = 'SELECT'
      and qual ilike '%is_current_user_admin%'
      and qual not ilike '%auth.uid%'
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

drop policy if exists "Admins can view all assessments" on public.assessments;
drop policy if exists "Admins can view all growth plans" on public.growth_plans;
drop policy if exists "Admins can view all goals" on public.goals;
create policy "Admins can view all assessments" on public.assessments
  for select to authenticated using (public.is_current_user_admin());
create policy "Admins can view all growth plans" on public.growth_plans
  for select to authenticated using (public.is_current_user_admin());
create policy "Admins can view all goals" on public.goals
  for select to authenticated using (public.is_current_user_admin());

-- Owners keep read access to their own rows whatever the live owner policies look like.
-- (Permissive policies add up, so these never take anything away.)
drop policy if exists "Owners read own assessments (v2)" on public.assessments;
create policy "Owners read own assessments (v2)" on public.assessments
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Owners read own plans (v2)" on public.growth_plans;
create policy "Owners read own plans (v2)" on public.growth_plans
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Owners read own goals (v2)" on public.goals;
create policy "Owners read own goals (v2)" on public.goals
  for select to authenticated using (
    exists (select 1 from public.growth_plans p where p.id = growth_plan_id and p.user_id = auth.uid())
  );

revoke execute on function public.is_current_user_admin() from anon, public;
grant execute on function public.is_current_user_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Check the result. Raising here rolls back the whole migration.
-- ---------------------------------------------------------------------------

do $$
declare
  v_bad int;
begin
  select count(*) into v_bad from pg_policies
  where schemaname = 'public' and tablename = 'user_profiles'
    and (
      (cmd in ('SELECT', 'ALL') and btrim(coalesce(qual, '')) in ('true', '(true)'))
      or (cmd in ('INSERT', 'ALL') and btrim(coalesce(with_check, '')) in ('true', '(true)'))
      or 'anon' = any (roles)
    );
  if v_bad > 0 then
    raise exception 'lockdown: % open policies remain on user_profiles', v_bad;
  end if;

  if has_column_privilege('authenticated', 'public.user_profiles', 'is_admin', 'UPDATE')
     or has_column_privilege('authenticated', 'public.user_profiles', 'is_admin', 'INSERT')
     or has_column_privilege('anon', 'public.user_profiles', 'is_admin', 'UPDATE')
     or has_column_privilege('anon', 'public.user_profiles', 'is_admin', 'INSERT') then
    raise exception 'lockdown: is_admin is still writable from the client';
  end if;

  if has_table_privilege('anon', 'public.user_profiles', 'SELECT') then
    raise exception 'lockdown: anon can still select user_profiles';
  end if;

  -- Owners must still be able to write their own plans and goals.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and cmd in ('INSERT', 'ALL'))
     or not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and cmd in ('UPDATE', 'ALL'))
     or not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'growth_plans' and cmd in ('INSERT', 'ALL'))
     or not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'assessments' and cmd in ('INSERT', 'ALL')) then
    raise exception 'lockdown: an owner write policy is missing';
  end if;
end $$;

notify pgrst, 'reload schema';
