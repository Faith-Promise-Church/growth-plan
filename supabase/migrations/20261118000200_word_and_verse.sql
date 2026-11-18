-- A word of the year and a verse of the year on each plan. Additive only.
-- Apply after 20261118000100_plan_shares.sql.

alter table public.growth_plans
  add column if not exists word_of_year text,
  add column if not exists verse_of_year text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'growth_plans_word_of_year_check') then
    alter table public.growth_plans
      add constraint growth_plans_word_of_year_check check (
        word_of_year is null or (length(word_of_year) between 1 and 40 and word_of_year !~ '[\r\n]')
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'growth_plans_verse_of_year_check') then
    alter table public.growth_plans
      add constraint growth_plans_verse_of_year_check check (
        verse_of_year is null or (length(verse_of_year) between 1 and 80 and verse_of_year !~ '[\r\n]')
      );
  end if;
end $$;

-- A private link shows the word and verse only when the person left that box ticked.
alter table public.plan_shares
  add column if not exists include_word_verse boolean not null default true;

grant insert (include_word_verse) on public.plan_shares to authenticated;

notify pgrst, 'reload schema';
