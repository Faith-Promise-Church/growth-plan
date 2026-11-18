// Demo data for VITE_DEMO=1. Four people: no assessment, a v1 assessment with a legacy plan
// (blank required goals), a full v2 assessment and plan, and an admin. Password for all: Demo1234

import { CHECKIN_EDITIONS } from '../content/checkinEditions.js';

export const DEMO_PASSWORD = 'Demo1234';

export const DEMO_PEOPLE = [
  { id: '00000000-0000-4000-8000-000000000001', first: 'Nora', last: 'New', phone: '865-555-0101', email: 'nora@example.com' },
  { id: '00000000-0000-4000-8000-000000000002', first: 'Lee', last: 'Legacy', phone: '865-555-0102', email: 'lee@example.com' },
  { id: '00000000-0000-4000-8000-000000000003', first: 'Grace', last: 'Growing', phone: '865-555-0103', email: 'grace@example.com' },
  { id: '00000000-0000-4000-8000-000000000004', first: 'Adam', last: 'Admin', phone: '865-555-0104', email: 'adam@example.com', admin: true },
];

const [NORA, LEE, GRACE, ADAM] = DEMO_PEOPLE.map((p) => p.id);
const LEE_PLAN = '10000000-0000-4000-8000-000000000002';
const GRACE_PLAN = '10000000-0000-4000-8000-000000000003';
const ADAM_PLAN = '10000000-0000-4000-8000-000000000004';

function v1Assessment(id, userId, date, answers) {
  const cols = [
    'faith_q1', 'faith_q2', 'faith_q3', 'relationships_q1', 'relationships_q2', 'relationships_q3',
    'finances_q1', 'finances_q2', 'finances_q3', 'health_q1', 'health_q2', 'purpose_q1', 'purpose_q2',
    'purpose_q3', 'character_q1', 'character_q2', 'character_q3', 'contentment_q1', 'contentment_q2', 'contentment_q3',
  ];
  const row = { id, user_id: userId, assessment_date: date, created_at: date, version: 1, habit_responses: null, habit_scores: null };
  cols.forEach((c, i) => (row[c] = answers[i]));
  const dims = { faith: 3, relationships: 3, finances: 3, health: 2, purpose: 3, character: 3, contentment: 3 };
  let i = 0;
  for (const [d, n] of Object.entries(dims)) {
    const vals = answers.slice(i, i + n);
    row[`${d}_score`] = parseFloat((vals.reduce((a, b) => a + b, 0) / n).toFixed(1));
    i += n;
  }
  return row;
}

function v2Assessment(id, userId, date, answers, habitResponses) {
  const row = v1Assessment(id, userId, date, answers);
  row.version = 2;
  row.habit_responses = habitResponses;
  const groups = {
    faith: ['faith_scripture', 'faith_prayer', 'faith_worship'],
    relationships: ['relationships_group', 'relationships_attention'],
    finances: ['finances_giving', 'finances_plan'],
    health: ['health_sleep', 'health_movement', 'health_eating'],
    purpose: ['purpose_serving', 'purpose_who_next'],
    character: ['character_memory', 'character_confession'],
    contentment: ['contentment_gratitude', 'contentment_rest'],
  };
  row.habit_scores = Object.fromEntries(
    Object.entries(groups).map(([d, keys]) => {
      const mean = keys.reduce((a, k) => a + habitResponses[k], 0) / keys.length;
      return [d, Math.round((1 + mean * 2.25) * 10) / 10];
    }),
  );
  return row;
}

function goal(id, planId, dimension, fields) {
  return {
    id,
    growth_plan_id: planId,
    dimension,
    discipline: null,
    goal_name: '',
    goal_text: '',
    is_mandatory: false,
    sort_order: 0,
    practice_key: null,
    cadence: null,
    anchor: null,
    status: 'active',
    created_at: '2026-01-20T15:00:00Z',
    updated_at: '2026-01-20T15:00:00Z',
    ...fields,
  };
}

const LEGACY_REQUIRED = [
  ['faith', 'Scripture Reading'], ['faith', 'Prayer'], ['faith', 'Church Attendance'],
  ['relationships', 'Group Attendance'], ['finances', 'Tithing + Giving'], ['finances', 'Budgeting'],
  ['health', 'Sleep'], ['health', 'Exercise'], ['health', 'Nutrition'], ['purpose', 'Serving'],
  ['purpose', 'Evangelism'], ['character', 'Scripture Memory'], ['character', 'Daily Confession & Repentance'],
  ['contentment', 'Gratitude'], ['contentment', 'Weekly Sabbath'],
];

export function buildDemoDb() {
  const auth_users = DEMO_PEOPLE.map((p) => ({
    id: p.id,
    email: p.email,
    password: DEMO_PASSWORD,
    user_metadata: { first_name: p.first, last_name: p.last, phone: p.phone },
  }));
  const user_profiles = DEMO_PEOPLE.map((p) => ({
    id: p.id,
    first_name: p.first,
    last_name: p.last,
    phone: p.phone,
    email: p.email,
    is_admin: Boolean(p.admin),
    created_at: '2026-01-10T15:00:00Z',
  }));

  const assessments = [
    v1Assessment('20000000-0000-4000-8000-000000000021', LEE, '2026-01-15T14:00:00Z',
      [9, 7, 6, 6, 4, 5, 8, 6, 7, 5, 6, 7, 5, 6, 7, 6, 7, 7, 6, 8]),
    v1Assessment('20000000-0000-4000-8000-000000000031', GRACE, '2026-03-10T14:00:00Z',
      [8, 6, 5, 7, 5, 6, 7, 5, 6, 4, 5, 7, 6, 6, 7, 6, 7, 6, 6, 7]),
    v2Assessment('20000000-0000-4000-8000-000000000032', GRACE, '2026-10-02T14:00:00Z',
      [9, 8, 7, 8, 6, 7, 8, 6, 8, 5, 6, 8, 7, 7, 8, 7, 8, 8, 7, 8],
      {
        faith_scripture: 3, faith_prayer: 2, faith_worship: 4,
        relationships_group: 3, relationships_attention: 2,
        finances_giving: 4, finances_plan: 1,
        health_sleep: 1, health_movement: 1, health_eating: 2,
        purpose_serving: 3, purpose_who_next: 1,
        character_memory: 0, character_confession: 2,
        contentment_gratitude: 3, contentment_rest: 2,
      }),
    v2Assessment('20000000-0000-4000-8000-000000000041', ADAM, '2026-09-20T14:00:00Z',
      [9, 9, 8, 8, 7, 7, 9, 8, 8, 6, 7, 8, 8, 7, 8, 7, 8, 8, 8, 8],
      {
        faith_scripture: 4, faith_prayer: 3, faith_worship: 4,
        relationships_group: 4, relationships_attention: 3,
        finances_giving: 4, finances_plan: 3,
        health_sleep: 2, health_movement: 2, health_eating: 2,
        purpose_serving: 4, purpose_who_next: 2,
        character_memory: 2, character_confession: 3,
        contentment_gratitude: 3, contentment_rest: 3,
      }),
  ];

  const growth_plans = [
    { id: LEE_PLAN, user_id: LEE, year: 2026, created_at: '2026-01-20T15:00:00Z', updated_at: '2026-01-20T15:00:00Z', focus_dimensions: null, copied_from_plan_id: null },
    { id: GRACE_PLAN, user_id: GRACE, year: 2026, created_at: '2026-10-02T15:00:00Z', updated_at: '2026-10-02T15:00:00Z', focus_dimensions: ['health', 'character'], copied_from_plan_id: null },
    { id: ADAM_PLAN, user_id: ADAM, year: 2026, created_at: '2026-09-20T15:00:00Z', updated_at: '2026-09-20T15:00:00Z', focus_dimensions: ['health'], copied_from_plan_id: null },
  ];

  const goals = [];
  // Lee: the 15 required goals from v1, most left blank, plus two written goals and one custom goal.
  LEGACY_REQUIRED.forEach(([dim, discipline], i) => {
    const text =
      discipline === 'Scripture Reading' ? 'Read my Bible every morning before work.'
      : discipline === 'Exercise' ? 'Walk three times a week with my neighbor.'
      : discipline === 'Tithing + Giving' ? 'Give ten percent every payday.'
      : '';
    goals.push(goal(`30000000-0000-4000-8000-0000000002${String(i + 10)}`, LEE_PLAN, dim, {
      discipline, goal_name: discipline, goal_text: text, is_mandatory: true, sort_order: i,
    }));
  });
  goals.push(goal('30000000-0000-4000-8000-000000000290', LEE_PLAN, 'purpose', {
    goal_name: 'Learn guitar for worship', goal_text: 'Practice guitar so I can serve on the youth worship team.', sort_order: 20,
  }));

  // Grace: a v2 plan with practice-based habits.
  const graceHabits = [
    ['health', 'sleep', 'Put my phone away thirty minutes before bed on weekdays.', 'weekdays', null],
    ['health', 'exercise', 'After work, take a fifteen-minute walk a few times a week.', 'few-weekly', 'After work'],
    ['character', 'scripture-memory', 'Learn one verse once a week.', 'weekly', null],
    ['character', 'confession', 'End my day by telling God where I fell short every day.', 'daily', null],
    ['faith', 'prayer', 'Spend ten minutes in prayer with a short list of people and needs every day.', 'daily', null],
    ['finances', 'budgeting', 'Write a simple spending plan before the month begins once a month.', 'monthly', null],
  ];
  graceHabits.forEach(([dim, key, text, cadence, anchor], i) => {
    goals.push(goal(`30000000-0000-4000-8000-0000000003${String(i + 10)}`, GRACE_PLAN, dim, {
      goal_name: '', goal_text: text, practice_key: key, cadence, anchor, sort_order: i,
    }));
  });
  goals.push(goal('30000000-0000-4000-8000-000000000400', ADAM_PLAN, 'health', {
    goal_text: 'Move my body for thirty minutes a few times a week.', practice_key: 'exercise', cadence: 'few-weekly', sort_order: 0,
  }));

  const email_preferences = [
    { user_id: GRACE, monthly_checkin: true, email: null, opted_in_at: '2026-10-02T15:10:00Z', opted_out_at: null },
    { user_id: ADAM, monthly_checkin: true, email: null, opted_in_at: '2026-09-20T15:10:00Z', opted_out_at: null },
  ];

  const checkins = [
    {
      id: '40000000-0000-4000-8000-000000000031', user_id: GRACE, growth_plan_id: GRACE_PLAN, period: '2026-10-01',
      responses: {
        '30000000-0000-4000-8000-000000000310': 1, '30000000-0000-4000-8000-000000000311': 2,
        '30000000-0000-4000-8000-000000000312': 3, '30000000-0000-4000-8000-000000000313': 3,
        '30000000-0000-4000-8000-000000000314': 2, '30000000-0000-4000-8000-000000000315': 1,
      },
      note: null, created_at: '2026-10-05T13:00:00Z', updated_at: '2026-10-05T13:00:00Z',
    },
    {
      id: '40000000-0000-4000-8000-000000000032', user_id: GRACE, growth_plan_id: GRACE_PLAN, period: '2026-11-01',
      responses: {
        '30000000-0000-4000-8000-000000000310': 1, '30000000-0000-4000-8000-000000000311': 3,
        '30000000-0000-4000-8000-000000000312': 4, '30000000-0000-4000-8000-000000000313': 3,
        '30000000-0000-4000-8000-000000000314': 2, '30000000-0000-4000-8000-000000000315': 0,
      },
      note: 'Sleep is still hard with the new baby.', created_at: '2026-11-02T13:00:00Z', updated_at: '2026-11-02T13:00:00Z',
    },
  ];

  const checkin_content = CHECKIN_EDITIONS.map((e) => ({ ...e, updated_at: '2026-11-17T12:00:00Z' }));
  const checkin_sends = [
    { id: '50000000-0000-4000-8000-000000000001', period: '2026-11-01', user_id: GRACE, status: 'sent', attempts: 1, error: null, sent_at: '2026-11-02T13:00:05Z', created_at: '2026-11-02T13:00:00Z' },
    { id: '50000000-0000-4000-8000-000000000002', period: '2026-11-01', user_id: ADAM, status: 'sent', attempts: 1, error: null, sent_at: '2026-11-02T13:00:06Z', created_at: '2026-11-02T13:00:00Z' },
  ];

  return { auth_users, user_profiles, assessments, growth_plans, goals, email_preferences, checkins, checkin_content, checkin_sends };
}

export const DEMO_IDS = { NORA, LEE, GRACE, ADAM, LEE_PLAN, GRACE_PLAN, ADAM_PLAN };
