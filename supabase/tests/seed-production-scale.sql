-- Production-scale seed for the local rehearsal: about 1,200 profiles, 930 v1 assessments,
-- 730 plans and 11,200 goals, with the awkward cases called out in the brief. Deterministic.
-- Run after baseline.sql and before any migration. Test users with passwords are created by the
-- runner through the auth API and add to these counts.

select setseed(0.20261117);

do $$
declare
  i int;
  uid uuid;
  first text;
  disciplines text[][] := array[
    ['faith','Scripture Reading'],['faith','Prayer'],['faith','Church Attendance'],
    ['relationships','Group Attendance'],['finances','Tithing + Giving'],['finances','Budgeting'],
    ['health','Sleep'],['health','Exercise'],['health','Nutrition'],['purpose','Serving'],
    ['purpose','Evangelism'],['character','Scripture Memory'],['character','Daily Confession & Repentance'],
    ['contentment','Gratitude'],['contentment','Weekly Sabbath']
  ];
  plan_id uuid;
  n_assess int;
  k int;
  txt text;
  goal_count int := 0;
  extra int;
begin
  -- 1,197 auth users with profiles (the runner adds three more with passwords)
  for i in 1..1197 loop
    uid := md5('seed-user-' || i)::uuid;
    first := case
      when i % 50 = 0 then 'Zoë 🌱'
      when i % 77 = 0 then '<b>Bold</b> <script>alert(1)</script>'
      when i % 91 = 0 then 'Robert''); DROP TABLE goals;--'
      when i % 97 = 0 then repeat('Long', 15)
      else 'Person' || i
    end;
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'seed' || i || '@example.com', '', now(), '', '', '', '', '{}'::jsonb,
      jsonb_build_object('first_name', first, 'last_name', 'Seed', 'phone', '865-' || (200 + i / 10000) || '-' || lpad((i % 10000)::text, 4, '0')),
      now() - (i || ' hours')::interval, now());
    insert into public.user_profiles (id, first_name, last_name, phone, email, is_admin, created_at)
    values (uid, first, 'Seed', '865-' || (200 + i / 10000) || '-' || lpad((i % 10000)::text, 4, '0'),
      'seed' || i || '@example.com', false, now() - (i || ' hours')::interval);
  end loop;

  -- 15 auth users with no profile row
  for i in 1..15 loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', md5('orphan-' || i)::uuid, 'authenticated', 'authenticated',
      'orphan' || i || '@example.com', '', now(), '', '', '', '', '{}'::jsonb, '{}'::jsonb, now(), now());
  end loop;

  -- Assessments: 20 people with six each, then one each, 924 in all (the runner adds six)
  k := 0;
  for i in 1..1197 loop
    exit when k >= 924;
    uid := md5('seed-user-' || i)::uuid;
    n_assess := case when i <= 20 then 6 else 1 end;
    for j in 1..n_assess loop
      exit when k >= 924;
      insert into public.assessments (user_id, assessment_date, created_at,
        faith_q1, faith_q2, faith_q3, relationships_q1, relationships_q2, relationships_q3,
        finances_q1, finances_q2, finances_q3, health_q1, health_q2, purpose_q1, purpose_q2, purpose_q3,
        character_q1, character_q2, character_q3, contentment_q1, contentment_q2, contentment_q3,
        faith_score, relationships_score, finances_score, health_score, purpose_score, character_score, contentment_score)
      select uid, now() - ((j * 30) || ' days')::interval, now() - ((j * 30) || ' days')::interval,
        q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8], q[9], q[10], q[11], q[12], q[13], q[14], q[15], q[16], q[17], q[18], q[19], q[20],
        round((q[1] + q[2] + q[3]) / 3.0, 1), round((q[4] + q[5] + q[6]) / 3.0, 1), round((q[7] + q[8] + q[9]) / 3.0, 1),
        round((q[10] + q[11]) / 2.0, 1), round((q[12] + q[13] + q[14]) / 3.0, 1), round((q[15] + q[16] + q[17]) / 3.0, 1),
        round((q[18] + q[19] + q[20]) / 3.0, 1)
      from (select array_agg(1 + floor(random() * 10)::int) as q from generate_series(1, 20)) r;
      k := k + 1;
    end loop;
  end loop;

  -- Plans: 727 (the runner adds three). 20 of them have no goals.
  for i in 1..727 loop
    uid := md5('seed-user-' || i)::uuid;
    plan_id := md5('seed-plan-' || i)::uuid;
    insert into public.growth_plans (id, user_id, year, created_at, updated_at)
    values (plan_id, uid, 2026, now() - '200 days'::interval, now() - '100 days'::interval);
    continue when i > 707;
    -- The 15 v1 required goals; about 60 percent left blank
    for d in 1..15 loop
      txt := case
        when random() < 0.6 then ''
        when i = 3 and d = 1 then repeat('Read and pray. ', 333) || 'Amen.'
        when i % 40 = 0 and d = 2 then 'Pray every morning 🙏 and thank God 😊'
        when i % 41 = 0 and d = 3 then '<img src=x onerror=alert(1)> <b>Church</b> every week'
        when i % 43 = 0 and d = 4 then '''; DELETE FROM goals; --'
        else 'Goal text for ' || disciplines[d][2] || ' number ' || i
      end;
      insert into public.goals (growth_plan_id, dimension, discipline, goal_name, goal_text, is_mandatory, sort_order)
      values (plan_id, disciplines[d][1], disciplines[d][2], disciplines[d][2], txt, true, d - 1);
      goal_count := goal_count + 1;
    end loop;
  end loop;

  -- Optional goals to reach 11,180 (the runner adds 20), including four more with 5,000 characters
  extra := 11180 - goal_count;
  for i in 1..extra loop
    plan_id := md5('seed-plan-' || (1 + (i % 707)))::uuid;
    insert into public.goals (growth_plan_id, dimension, discipline, goal_name, goal_text, is_mandatory, sort_order)
    values (plan_id, (array['faith','relationships','finances','health','purpose','character','contentment'])[1 + i % 7], null,
      'My own goal ' || i,
      case when i <= 4 then repeat('x', 5000) when i % 13 = 0 then '' else 'Something I want to do ' || i end,
      false, 20 + i);
  end loop;
end $$;
