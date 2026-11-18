-- Rebuilds the live (pre-v2) schema described in supabase/schema-baseline.md.
-- Used only by the local rehearsal and attack suites. Never run this against production.

drop table if exists public.goals cascade;
drop table if exists public.growth_plans cascade;
drop table if exists public.assessments cascade;
drop table if exists public.user_profiles cascade;
drop function if exists public.is_current_user_admin() cascade;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text unique,
  email text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  assessment_date timestamptz default now(),
  created_at timestamptz default now(),
  faith_score numeric not null check (faith_score between 1.0 and 10.0),
  relationships_score numeric not null check (relationships_score between 1.0 and 10.0),
  finances_score numeric not null check (finances_score between 1.0 and 10.0),
  health_score numeric not null check (health_score between 1.0 and 10.0),
  purpose_score numeric not null check (purpose_score between 1.0 and 10.0),
  character_score numeric not null check (character_score between 1.0 and 10.0),
  contentment_score numeric not null check (contentment_score between 1.0 and 10.0),
  faith_q1 int not null check (faith_q1 between 1 and 10),
  faith_q2 int not null check (faith_q2 between 1 and 10),
  faith_q3 int not null check (faith_q3 between 1 and 10),
  relationships_q1 int not null check (relationships_q1 between 1 and 10),
  relationships_q2 int not null check (relationships_q2 between 1 and 10),
  relationships_q3 int not null check (relationships_q3 between 1 and 10),
  finances_q1 int not null check (finances_q1 between 1 and 10),
  finances_q2 int not null check (finances_q2 between 1 and 10),
  finances_q3 int not null check (finances_q3 between 1 and 10),
  health_q1 int not null check (health_q1 between 1 and 10),
  health_q2 int not null check (health_q2 between 1 and 10),
  purpose_q1 int not null check (purpose_q1 between 1 and 10),
  purpose_q2 int not null check (purpose_q2 between 1 and 10),
  purpose_q3 int not null check (purpose_q3 between 1 and 10),
  character_q1 int not null check (character_q1 between 1 and 10),
  character_q2 int not null check (character_q2 between 1 and 10),
  character_q3 int not null check (character_q3 between 1 and 10),
  contentment_q1 int not null check (contentment_q1 between 1 and 10),
  contentment_q2 int not null check (contentment_q2 between 1 and 10),
  contentment_q3 int not null check (contentment_q3 between 1 and 10)
);

create table public.growth_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  year int check (year between 2026 and 2045),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, year)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  growth_plan_id uuid references public.growth_plans(id) on delete cascade,
  dimension text check (dimension in ('faith','relationships','finances','health','purpose','character','contentment')),
  discipline text,
  goal_name text,
  goal_text text not null,
  is_mandatory boolean default false,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create function public.is_current_user_admin() returns boolean
language sql stable security definer as $$
  select coalesce((select is_admin from public.user_profiles where id = auth.uid()), false);
$$;

alter table public.user_profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.growth_plans enable row level security;
alter table public.goals enable row level security;

-- user_profiles: the two open holes, plus owner read and owner update
create policy "Allow phone lookup for login" on public.user_profiles
  for select to anon using (true);
create policy "Allow profile creation during signup" on public.user_profiles
  for insert to anon with check (true);
create policy "Users can view own profile" on public.user_profiles
  for select to authenticated using (auth.uid() = id);
create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = id);

-- owners
create policy "Users can view own assessments" on public.assessments
  for select using (auth.uid() = user_id);
create policy "Users can insert own assessments" on public.assessments
  for insert with check (auth.uid() = user_id);
create policy "Users can view own plans" on public.growth_plans
  for select using (auth.uid() = user_id);
create policy "Users can insert own plans" on public.growth_plans
  for insert with check (auth.uid() = user_id);
create policy "Users can update own plans" on public.growth_plans
  for update using (auth.uid() = user_id);
create policy "Users can delete own plans" on public.growth_plans
  for delete using (auth.uid() = user_id);
-- Written in the combined owner-or-admin form on purpose, so the rehearsal proves the lockdown
-- does not drop an owner policy that also mentions the admin check.
create policy "Users can view own goals" on public.goals
  for select using (exists (select 1 from public.growth_plans p where p.id = growth_plan_id and p.user_id = auth.uid()) or public.is_current_user_admin());
create policy "Users can insert own goals" on public.goals
  for insert with check (exists (select 1 from public.growth_plans p where p.id = growth_plan_id and p.user_id = auth.uid()));
create policy "Users can update own goals" on public.goals
  for update using (exists (select 1 from public.growth_plans p where p.id = growth_plan_id and p.user_id = auth.uid()));
create policy "Users can delete own goals" on public.goals
  for delete using (exists (select 1 from public.growth_plans p where p.id = growth_plan_id and p.user_id = auth.uid()));

-- admins (no TO clause, so they also apply to anon)
create policy "Admins can view all assessments" on public.assessments
  for select using (public.is_current_user_admin());
create policy "Admins can view all growth plans" on public.growth_plans
  for select using (public.is_current_user_admin());
create policy "Admins can view all goals" on public.goals
  for select using (public.is_current_user_admin());

grant all on public.user_profiles, public.assessments, public.growth_plans, public.goals to anon, authenticated, service_role;
grant execute on function public.is_current_user_admin() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
