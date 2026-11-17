import { DIMENSION_ORDER } from '../content/dimensions.js';
import { FLOURISHING_QUESTIONS, HABIT_ITEMS } from '../content/assessment.js';

// One place for every threshold the results and Helper use.
export const THRESHOLDS = {
  flourishingStrong: 7.5,
  habitsSteady: 6.5,
};

export const READS = {
  start: { key: 'start', label: 'A good place to start' },
  'hard-season': { key: 'hard-season', label: 'Faithful in a hard season' },
  protect: { key: 'protect', label: 'Strong now, worth protecting' },
  steady: { key: 'steady', label: 'A steady strength' },
};

export function round1(x) {
  return Math.round((x + Number.EPSILON) * 10) / 10;
}

// The v1 function, kept verbatim so new scores can be checked against it.
export function legacyCalculateDimensionScore(responses) {
  if (!responses || responses.length === 0) return 0;
  const sum = responses.reduce((acc, val) => acc + val, 0);
  return (sum / responses.length).toFixed(1);
}

// Flourishing score for one dimension: the mean of its 1 to 10 answers, one decimal.
// Matches v1 exactly (v1 stored parseFloat(calculateDimensionScore(...))).
export function flourishingScore(answers) {
  return parseFloat(legacyCalculateDimensionScore(answers));
}

// Habit score: 1 + mean * 2.25 on the 0 to 4 answers, so it sits on the same 1 to 10 scale.
export function habitScore(answers) {
  if (!answers || answers.length === 0) return null;
  const mean = answers.reduce((a, b) => a + b, 0) / answers.length;
  return round1(1 + mean * 2.25);
}

export function getRead(flourishing, habit) {
  if (flourishing == null || habit == null || Number.isNaN(flourishing) || Number.isNaN(habit)) return null;
  const strong = flourishing >= THRESHOLDS.flourishingStrong;
  const steady = habit >= THRESHOLDS.habitsSteady;
  if (!strong && !steady) return READS.start;
  if (!strong && steady) return READS['hard-season'];
  if (strong && !steady) return READS.protect;
  return READS.steady;
}

// Build the row to insert from the answers. Throws if anything is missing, so an incomplete
// assessment can never be saved with made-up values (v1 filled gaps with 5).
export function buildAssessmentRow({ userId, flourishing, habits, now = new Date() }) {
  const row = { user_id: userId, assessment_date: now.toISOString(), version: 2 };
  const habitScores = {};
  const habitResponses = {};
  for (const dim of DIMENSION_ORDER) {
    const answers = FLOURISHING_QUESTIONS[dim].map((q) => {
      const v = flourishing[q.column];
      if (!Number.isInteger(v) || v < 1 || v > 10) throw new Error(`Missing answer for ${q.column}`);
      row[q.column] = v;
      return v;
    });
    row[`${dim}_score`] = flourishingScore(answers);
    const habitAnswers = HABIT_ITEMS[dim].map((h) => {
      const v = habits[h.key];
      if (!Number.isInteger(v) || v < 0 || v > 4) throw new Error(`Missing answer for ${h.key}`);
      habitResponses[h.key] = v;
      return v;
    });
    habitScores[dim] = habitScore(habitAnswers);
  }
  row.habit_responses = habitResponses;
  row.habit_scores = habitScores;
  return row;
}

export function scoresFromRow(row) {
  if (!row) return null;
  const out = {};
  for (const dim of DIMENSION_ORDER) {
    const f = row[`${dim}_score`];
    const h = row.version === 2 && row.habit_scores ? row.habit_scores[dim] : null;
    out[dim] = {
      flourishing: f == null ? null : Number(f),
      habit: h == null ? null : Number(h),
    };
  }
  return out;
}

// Two focus areas: lowest flourishing first, ties broken by lowest habits, then dimension order.
export function suggestFocus(scores, count = 2) {
  if (!scores) return [];
  return [...DIMENSION_ORDER]
    .filter((d) => scores[d]?.flourishing != null)
    .sort((a, b) => {
      const fa = scores[a].flourishing;
      const fb = scores[b].flourishing;
      if (fa !== fb) return fa - fb;
      const ha = scores[a].habit ?? Infinity;
      const hb = scores[b].habit ?? Infinity;
      if (ha !== hb) return ha - hb;
      return DIMENSION_ORDER.indexOf(a) - DIMENSION_ORDER.indexOf(b);
    })
    .slice(0, count);
}

export function formatScore(value) {
  if (value == null || Number.isNaN(Number(value))) return '';
  return Number(value).toFixed(1);
}

export function formatChange(current, previous) {
  if (current == null || previous == null) return null;
  const diff = round1(Number(current) - Number(previous));
  if (diff === 0) return { diff, label: 'No change' };
  return { diff, label: diff > 0 ? `Up ${diff.toFixed(1)}` : `Down ${Math.abs(diff).toFixed(1)}` };
}
