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

  -- Any INSERT policy that lets anyone insert any row, or that applies to anon
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'user_profiles'
      and cmd in ('INSERT', 'ALL')
      and (
        btrim(coalesce(with_check, '')) in ('true', '(true)')
        or 'anon' = any (roles)
        or 'public' = any (roles)
      )
  loop
    execute format('drop policy %I on public.user_profiles', p.policyname);
  end loop;
end $$;

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile" on public.user_profiles
  for insert to authenticated
  with check (auth.uid() = id);

-- Owners must still read their own row once the open SELECT is gone.
drop policy if exists "Users can read own profile (v2)" on public.user_profiles;
create policy "Users can read own profile (v2)" on public.user_profiles
  for select to authenticated
  using (auth.uid() = id);

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

do $$
declare
  p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('assessments', 'growth_plans', 'goals')
      and qual ilike '%is_current_user_admin%'
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "Admins can view all assessments" on public.assessments
  for select to authenticated using (public.is_current_user_admin());
create policy "Admins can view all growth plans" on public.growth_plans
  for select to authenticated using (public.is_current_user_admin());
create policy "Admins can view all goals" on public.goals
  for select to authenticated using (public.is_current_user_admin());

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
end $$;

notify pgrst, 'reload schema';
