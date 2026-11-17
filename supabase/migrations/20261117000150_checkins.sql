-- v2 phase 6: monthly check-in emails. Additive only.
-- Safe to apply while the old (v1) frontend is still live. Apply after 20261117000100_additive.sql.

-- ---------------------------------------------------------------------------
-- email_preferences: opt-in is off by default for everyone.
-- `email` is an optional address for check-ins only. It never changes the login email.
-- ---------------------------------------------------------------------------

create table if not exists public.email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_checkin boolean not null default false,
  email text,
  opted_in_at timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_preferences_email_check check (
    email is null
    or (length(email) <= 254 and email ~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$')
  )
);

-- The opt-in and opt-out times are set here, never by the client.
create or replace function public.email_preferences_stamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.opted_in_at := case when new.monthly_checkin then now() else null end;
    new.opted_out_at := null;
    new.created_at := now();
  else
    new.user_id := old.user_id;
    new.created_at := old.created_at;
    new.opted_in_at := old.opted_in_at;
    new.opted_out_at := old.opted_out_at;
    if new.monthly_checkin and not old.monthly_checkin then
      new.opted_in_at := now();
    elsif old.monthly_checkin and not new.monthly_checkin then
      new.opted_out_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists email_preferences_stamp on public.email_preferences;
create trigger email_preferences_stamp
  before insert or update on public.email_preferences
  for each row execute function public.email_preferences_stamp();

alter table public.email_preferences enable row level security;

drop policy if exists "Owners read own email preferences" on public.email_preferences;
create policy "Owners read own email preferences" on public.email_preferences
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Owners insert own email preferences" on public.email_preferences;
create policy "Owners insert own email preferences" on public.email_preferences
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Owners update own email preferences" on public.email_preferences;
create policy "Owners update own email preferences" on public.email_preferences
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.email_preferences from anon, public;
grant select, insert, update on public.email_preferences to authenticated;

-- ---------------------------------------------------------------------------
-- checkins: one per person per month.
-- ---------------------------------------------------------------------------

create or replace function public.checkin_responses_valid(p jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p) = 'object'
    and (select count(*) from jsonb_object_keys(p)) <= 100
    and not exists (
      select 1 from jsonb_each(p) e
      where e.key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         or jsonb_typeof(e.value) <> 'number'
         or e.value::text not in ('0', '1', '2', '3', '4')
    );
$$;

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  growth_plan_id uuid references public.growth_plans(id) on delete set null,
  period date not null,
  responses jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkins_user_period_key unique (user_id, period),
  constraint checkins_period_check check (extract(day from period) = 1),
  constraint checkins_responses_check check (public.checkin_responses_valid(responses)),
  constraint checkins_note_check check (note is null or length(note) <= 2000)
);

alter table public.checkins enable row level security;

drop policy if exists "Owners read own checkins" on public.checkins;
create policy "Owners read own checkins" on public.checkins
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Owners insert own checkins" on public.checkins;
create policy "Owners insert own checkins" on public.checkins
  for insert to authenticated with check (
    auth.uid() = user_id
    and (growth_plan_id is null or exists (
      select 1 from public.growth_plans p where p.id = growth_plan_id and p.user_id = auth.uid()))
  );
drop policy if exists "Owners update own checkins" on public.checkins;
create policy "Owners update own checkins" on public.checkins
  for update to authenticated using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (growth_plan_id is null or exists (
      select 1 from public.growth_plans p where p.id = growth_plan_id and p.user_id = auth.uid()))
  );
drop policy if exists "Admins read all checkins" on public.checkins;
create policy "Admins read all checkins" on public.checkins
  for select to authenticated using (public.is_current_user_admin());

revoke all on public.checkins from anon, public;
grant select, insert, update on public.checkins to authenticated;

-- ---------------------------------------------------------------------------
-- checkin_sends: one row per person per month. The unique key is what stops
-- anyone from getting two emails. No client access at all.
-- ---------------------------------------------------------------------------

create table if not exists public.checkin_sends (
  id uuid primary key default gen_random_uuid(),
  period date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued',
  attempts int not null default 0,
  error text,
  sent_at timestamptz,
  claimed_at timestamptz,
  claim_id uuid,
  created_at timestamptz not null default now(),
  constraint checkin_sends_period_user_key unique (period, user_id),
  constraint checkin_sends_status_check check (status in ('queued', 'sent', 'failed', 'skipped'))
);

create index if not exists checkin_sends_period_status_idx on public.checkin_sends (period, status);

alter table public.checkin_sends enable row level security;
revoke all on public.checkin_sends from anon, authenticated, public;

-- Queue everyone who is opted in and has an address. Existing rows are left alone.
create or replace function public.enqueue_checkin_sends(p_period date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.checkin_sends (period, user_id, status)
  select p_period, ep.user_id, 'queued'
  from public.email_preferences ep
  join public.user_profiles up on up.id = ep.user_id
  where ep.monthly_checkin
    and nullif(btrim(coalesce(ep.email, up.email)), '') is not null
  on conflict (period, user_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Claim a batch to send. A row can be claimed when it is queued or failed with
-- fewer than three attempts and no live claim. Rows for people who have opted
-- out since they were queued are marked skipped and never sent.
create or replace function public.claim_checkin_sends(
  p_period date,
  p_claim uuid,
  p_limit int default 25,
  p_lease_seconds int default 600
)
returns table (id uuid, user_id uuid, attempts int)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  update public.checkin_sends s
  set status = 'skipped', error = 'opted out or no address', claimed_at = null, claim_id = null
  where s.period = p_period
    and s.status in ('queued', 'failed')
    and (s.claimed_at is null or s.claimed_at < now() - make_interval(secs => p_lease_seconds))
    and not exists (
      select 1 from public.email_preferences ep
      join public.user_profiles up on up.id = ep.user_id
      where ep.user_id = s.user_id
        and ep.monthly_checkin
        and nullif(btrim(coalesce(ep.email, up.email)), '') is not null
    );

  return query
  with candidates as (
    select c.id from public.checkin_sends c
    where c.period = p_period
      and c.status in ('queued', 'failed')
      and c.attempts < 3
      and (c.claimed_at is null or c.claimed_at < now() - make_interval(secs => p_lease_seconds))
    order by c.created_at, c.id
    limit greatest(1, least(p_limit, 200))
    for update skip locked
  )
  , claimed as (
    update public.checkin_sends s
    set claimed_at = now(), claim_id = p_claim, attempts = s.attempts + 1
    from candidates
    where s.id = candidates.id
    returning s.id as claimed_id, s.user_id as claimed_user_id, s.attempts as claimed_attempts
  )
  select claimed_id, claimed_user_id, claimed_attempts from claimed;
end;
$$;

revoke all on function public.enqueue_checkin_sends(date) from public, anon, authenticated;
revoke all on function public.claim_checkin_sends(date, uuid, int, int) from public, anon, authenticated;
grant execute on function public.enqueue_checkin_sends(date) to service_role;
grant execute on function public.claim_checkin_sends(date, uuid, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- checkin_content: one edition per month. Admins read and write.
-- ---------------------------------------------------------------------------

create table if not exists public.checkin_content (
  period date primary key,
  theme text not null default '',
  subject text not null,
  preheader text not null default '',
  zac_note text not null default '',
  article_title text not null default '',
  article_url text not null default '',
  article_source text not null default '',
  article_blurb text not null default '',
  updated_at timestamptz not null default now(),
  constraint checkin_content_period_check check (extract(day from period) = 1),
  constraint checkin_content_subject_check check (length(subject) between 1 and 150 and subject !~ '[\r\n]'),
  constraint checkin_content_preheader_check check (length(preheader) <= 200 and preheader !~ '[\r\n]'),
  constraint checkin_content_url_check check (article_url = '' or article_url ~ '^https://[^\s"<>]+$'),
  constraint checkin_content_lengths_check check (
    length(zac_note) <= 1200 and length(article_title) <= 300
    and length(article_source) <= 200 and length(article_blurb) <= 500 and length(theme) <= 120
  )
);

alter table public.checkin_content enable row level security;

drop policy if exists "Admins read checkin content" on public.checkin_content;
create policy "Admins read checkin content" on public.checkin_content
  for select to authenticated using (public.is_current_user_admin());
drop policy if exists "Admins insert checkin content" on public.checkin_content;
create policy "Admins insert checkin content" on public.checkin_content
  for insert to authenticated with check (public.is_current_user_admin());
drop policy if exists "Admins update checkin content" on public.checkin_content;
create policy "Admins update checkin content" on public.checkin_content
  for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

revoke all on public.checkin_content from anon, public;
grant select, insert, update on public.checkin_content to authenticated;

-- ---------------------------------------------------------------------------
-- Admin counts per month (checkin_sends has no client access).
-- ---------------------------------------------------------------------------

create or replace function public.admin_checkin_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return json_build_object(
    'opted_in_now', (select count(*) from public.email_preferences where monthly_checkin),
    'periods', coalesce((
      select json_agg(row_to_json(t) order by t.period desc)
      from (
        select p.period,
          (select count(*) from public.checkin_sends s where s.period = p.period) as queued,
          (select count(*) from public.checkin_sends s where s.period = p.period and s.status = 'sent') as sent,
          (select count(*) from public.checkin_sends s where s.period = p.period and s.status = 'failed') as failed,
          (select count(*) from public.checkin_sends s where s.period = p.period and s.status = 'skipped') as skipped,
          (select count(*) from public.checkins c where c.period = p.period) as checked_in
        from (
          select period from public.checkin_content
          union select period from public.checkin_sends
          union select period from public.checkins
        ) p
      ) t
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.admin_checkin_stats() from public, anon;
grant execute on function public.admin_checkin_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Seed the thirteen editions (generated from src/content/checkinEditions.js by
-- scripts/gen-checkin-seed.js; do not edit between the markers by hand).
-- Existing rows are not overwritten, so admin edits survive a re-run.
-- ---------------------------------------------------------------------------

-- BEGIN SEED
insert into public.checkin_content (period, theme, subject, preheader, zac_note, article_title, article_url, article_source, article_blurb)
values
  (date '2026-12-01', 'Looking back, looking ahead', 'Your December check-in: look back, look ahead', 'Thank God for this year, then give him the next one.', 'Look back on this year and thank God for every step you took, including the small ones. Then look ahead and give him the whole year to come. Take time this month to review your plan and build your next one, because I believe your best growth is still ahead of you.', 'Ten Questions for a New Year', 'https://www.desiringgod.org/articles/ten-questions-for-a-new-year', 'Don Whitney, Desiring God', 'Ten questions to pray through as one year closes and the next begins.'),
  (date '2027-01-01', 'Faith: prayer', 'Your January check-in: five minutes of prayer', 'Start the year with a few minutes of prayer each day.', 'You start this year as a loved son or daughter of God, and nothing you do this month will change that. So I want to challenge you to pray every day, even if you start with five minutes. We are praying together as a church this month, and I believe God will meet you there.', 'How to Make Prayer a Habit You Can''t Break', 'https://www.baptistpress.com/resource-library/bptoolbox/how-to-make-prayer-a-habit-you-cant-break', 'Baptist Press', 'A practical case for a small daily prayer habit that you keep.'),
  (date '2027-02-01', 'Relationships', 'Your February check-in: the people around you', 'This month, go deeper with the people God has given you.', 'God made you to need people. Your friends and family will shape who you become more than almost anything else this year. If you are not in a group yet, make this the month you join one. If you are in one, go a level deeper with someone and tell them how you are doing.', 'Good genes are nice, but joy is better', 'https://news.harvard.edu/gazette/story/2017/04/over-nearly-80-years-harvard-study-has-been-showing-how-to-live-a-healthy-and-happy-life/', 'Harvard Gazette', 'What an 80-year Harvard study found about close relationships and a good life.'),
  (date '2027-03-01', 'Character', 'Your March check-in: living in the light', 'Tell one trusted friend the truth about how you are doing.', 'Who you are when nobody is watching matters to God, and it matters to the people who count on you. This month, tell one trusted friend the truth about where you are struggling. You will find grace there, because Jesus has already forgiven you.', 'Walk in the Light: How God Uses Our Confession to Others', 'https://www.thegospelcoalition.org/article/confession-others-sin/', 'Garrett Kell, The Gospel Coalition', 'Why telling a trusted friend the truth loosens the hold of hidden sin.'),
  (date '2027-04-01', 'Purpose: who is next', 'Your April check-in: who is next?', 'Pray for one person by name every day this month.', 'Someone in your life needs to hear about Jesus, and I believe God put you near them on purpose. Write down their name and pray for them every day this month. Ask God for a chance to talk with them, and take it when it comes.', '5 Tips for Sharing the Gospel with Friends', 'https://www.jesusfilm.org/blog/sharing-gospel-with-friends/', 'Jesus Film Project', 'Five simple ways to talk about Jesus with people you already love, starting with prayer.'),
  (date '2027-05-01', 'Health', 'Your May check-in: caring for your body', 'Pick one habit for your body this month and stay with it.', 'Your body is a gift from God, and caring for it is part of following Jesus. You cannot give your best to your family, your work, or your calling when you are worn out. Choose one habit this month, whether that is sleep, movement, or how you eat, and stay with it.', 'A Brief Theology of Sleep', 'https://www.desiringgod.org/articles/a-brief-theology-of-sleep', 'John Piper, Desiring God', 'A short reflection on why God made us need rest every night.'),
  (date '2027-06-01', 'Contentment: rest', 'Your June check-in: a day of rest', 'Protect one day each week for worship, people and rest.', 'God rested, and he invites you to rest with him. A weekly day of rest reminds you that God is in charge and that you can trust him with what is left undone. Protect one day each week this month for worship, for the people you love, and for things you enjoy.', 'What Is the Sabbath in the Bible and Should Christians Observe It?', 'https://bibleproject.com/articles/keeping-the-sabbath-is-it-still-relevant-to-christians-today/', 'BibleProject', 'A six-minute walk through what the Bible says about a weekly day of rest.'),
  (date '2027-07-01', 'Starting again', 'Your July check-in: start again', 'Halfway through the year is a good time to start again.', 'Halfway through the year is a good time to be honest about where you are. If you have fallen behind on your plan, you have not failed, and God has not given up on you. Pick the smallest version of one habit and start again today.', 'Avoid the Second Mistake', 'https://jamesclear.com/second-mistake', 'James Clear', 'Missing once does not undo a habit. What matters is how quickly you start again.'),
  (date '2027-08-01', 'Faith: Scripture', 'Your August check-in: ten minutes in Scripture', 'Open your Bible before you open your phone this month.', 'God wants to speak to you through his Word every day. You will grow more from ten minutes in Scripture each morning than from an hour once in a while. Open your Bible before you open your phone this month, and ask God to show you one thing to put into practice.', 'How to Study the Bible for Beginners in 4 Simple Steps', 'https://finds.life.church/beginners-guide-to-studying-the-bible/', 'Life.Church', 'Where to begin and how to build a steady Bible habit.'),
  (date '2027-09-01', 'Finances', 'Your September check-in: a plan for your money', 'Put giving first this month, then make a plan for the rest.', 'Money shapes what we care about, which is why Jesus talked about it so often. A plan for your money gives you room to breathe and room to be generous. I invite you to sit down this month, put giving first, and make a plan for the rest.', 'How to Budget', 'https://www.ramseysolutions.com/budgeting/how-to-make-a-budget', 'Ramsey Solutions', 'A step-by-step guide to making a monthly budget before the month begins.'),
  (date '2027-10-01', 'Purpose: serving', 'Your October check-in: use your gifts', 'The best way to find your gifts is to start serving.', 'God gave you gifts that our church and our city need. Most people discover those gifts by serving, so the best next step is to start. Join the Winning Team this month, or take one new step where you already serve, and watch how God uses you.', 'How do I discover my spiritual gift?', 'https://thegospelcoalition.org/article/how-do-i-discover-my-spiritual-gift', 'Juan Sanchez, The Gospel Coalition', 'The best way to find your gifts is to start serving where you are needed.'),
  (date '2027-11-01', 'Contentment: gratitude', 'Your November check-in: three things each day', 'Begin each day by thanking God for three specific things.', 'Gratitude changes how you see everything God has already given you. Before this month gets busy, begin each day by thanking God for three specific things. I am thankful for you and for the way you keep growing.', 'Gratitude enhances health, brings happiness, and may even lengthen lives', 'https://www.health.harvard.edu/blog/gratitude-enhances-health-brings-happiness-and-may-even-lengthen-lives-202409113071', 'Harvard Health Publishing', 'Research on what a habit of giving thanks does for a person, with six questions to try.'),
  (date '2027-12-01', 'Looking back, looking ahead', 'Your December check-in: look back, look ahead', 'Thank God for this year, then give him the next one.', 'Look back on this year and thank God for every step you took, including the small ones. Then look ahead and give him the whole year to come. Take time this month to review your plan and build your next one, because I believe your best growth is still ahead of you.', 'Ten Questions for a New Year', 'https://www.desiringgod.org/articles/ten-questions-for-a-new-year', 'Don Whitney, Desiring God', 'Ten questions to pray through as one year closes and the next begins.')
on conflict (period) do nothing;
-- END SEED

notify pgrst, 'reload schema';
