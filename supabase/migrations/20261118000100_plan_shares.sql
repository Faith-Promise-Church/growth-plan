-- Private read-only links to a plan. Additive only. Apply after the lockdown.
--
-- A row is one link. The link carries the row id, which is random and cannot be guessed. The
-- page behind the link is served by a server function with the service role, so signed-out
-- visitors never touch this table or any other table directly.

create table if not exists public.plan_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  growth_plan_id uuid not null references public.growth_plans(id) on delete cascade,
  dimensions text[] not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint plan_shares_dimensions_check check (
    cardinality(dimensions) between 1 and 7
    and dimensions <@ array['faith','relationships','finances','health','purpose','character','contentment']::text[]
  ),
  -- A link lasts at most 90 days from the moment it was made.
  constraint plan_shares_expires_check check (
    expires_at > created_at and expires_at <= created_at + interval '90 days'
  )
);

create index if not exists plan_shares_user_idx on public.plan_shares (user_id);

alter table public.plan_shares enable row level security;

drop policy if exists "Owners read own plan shares" on public.plan_shares;
create policy "Owners read own plan shares" on public.plan_shares
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Owners create own plan shares" on public.plan_shares;
create policy "Owners create own plan shares" on public.plan_shares
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (select 1 from public.growth_plans p where p.id = growth_plan_id and p.user_id = auth.uid())
  );

drop policy if exists "Owners stop own plan shares" on public.plan_shares;
create policy "Owners stop own plan shares" on public.plan_shares
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The client may read its own rows, add a row, and set revoked_at. It cannot choose the id or
-- the created time, change who or what a link points at, extend a link, or delete or truncate.
revoke all on public.plan_shares from anon, authenticated, public;
grant select on public.plan_shares to authenticated;
grant insert (user_id, growth_plan_id, dimensions, expires_at) on public.plan_shares to authenticated;
grant update (revoked_at) on public.plan_shares to authenticated;

do $$
begin
  if has_table_privilege('anon', 'public.plan_shares', 'SELECT')
     or has_table_privilege('authenticated', 'public.plan_shares', 'DELETE')
     or has_table_privilege('authenticated', 'public.plan_shares', 'TRUNCATE')
     or has_column_privilege('authenticated', 'public.plan_shares', 'expires_at', 'UPDATE')
     or has_column_privilege('authenticated', 'public.plan_shares', 'id', 'INSERT') then
    raise exception 'plan_shares: a grant is wider than intended';
  end if;
end $$;

notify pgrst, 'reload schema';
