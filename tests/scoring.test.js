import { describe, it, expect } from 'vitest';
import {
  legacyCalculateDimensionScore,
  flourishingScore,
  habitScore,
  getRead,
  buildAssessmentRow,
  scoresFromRow,
  suggestFocus,
  THRESHOLDS,
} from '../src/lib/scoring.js';
import { DIMENSION_ORDER } from '../src/content/dimensions.js';
import { FLOURISHING_QUESTIONS, HABIT_ITEMS, FLOURISHING_COLUMNS, HABIT_KEYS } from '../src/content/assessment.js';

// The v1 function, copied from src/utils/dimensionData.js before it was removed.
function v1CalculateDimensionScore(responses) {
  if (!responses || responses.length === 0) return 0;
  const sum = responses.reduce((acc, val) => acc + val, 0);
  return (sum / responses.length).toFixed(1);
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function randomAnswers(rand) {
  const flourishing = Object.fromEntries(FLOURISHING_COLUMNS.map((c) => [c, 1 + Math.floor(rand() * 10)]));
  const habits = Object.fromEntries(HABIT_KEYS.map((k) => [k, Math.floor(rand() * 5)]));
  return { flourishing, habits };
}

describe('flourishing scores', () => {
  it('keeps the 20 v1 questions in the same order and columns', () => {
    expect(FLOURISHING_COLUMNS).toEqual([
      'faith_q1', 'faith_q2', 'faith_q3', 'relationships_q1', 'relationships_q2', 'relationships_q3',
      'finances_q1', 'finances_q2', 'finances_q3', 'health_q1', 'health_q2', 'purpose_q1', 'purpose_q2',
      'purpose_q3', 'character_q1', 'character_q2', 'character_q3', 'contentment_q1', 'contentment_q2', 'contentment_q3',
    ]);
  });

  it('keeps the v1 wording exactly', () => {
    expect(FLOURISHING_QUESTIONS.faith[2].text).toBe('I regularly experience a sense of connection with God in my daily life, not just on Sundays.');
    expect(FLOURISHING_QUESTIONS.health[1].text).toBe("I generally feel emotionally resilient and capable of handling life's daily stressors.");
    expect(FLOURISHING_QUESTIONS.character[2].text).toBe(
      'My private thoughts and actions align with the person I present to others publicly (I am the same person in the dark as I am in the light).',
    );
    const harvard = DIMENSION_ORDER.flatMap((d) => FLOURISHING_QUESTIONS[d]).filter((q) => q.source.type === 'harvard');
    expect(harvard.length).toBe(11);
  });

  it('matches the old calculateDimensionScore exactly for 10,000 random answer sets', () => {
    const rand = seeded(20261117);
    for (let i = 0; i < 10000; i += 1) {
      const { flourishing, habits } = randomAnswers(rand);
      const row = buildAssessmentRow({ userId: 'u', flourishing, habits });
      for (const d of DIMENSION_ORDER) {
        const answers = FLOURISHING_QUESTIONS[d].map((q) => flourishing[q.column]);
        expect(row[`${d}_score`]).toBe(parseFloat(v1CalculateDimensionScore(answers)));
      }
    }
  });

  it('the kept legacy function is the v1 function', () => {
    expect(legacyCalculateDimensionScore([7, 8, 8])).toBe(v1CalculateDimensionScore([7, 8, 8]));
    expect(flourishingScore([5, 6])).toBe(5.5);
  });

  it('refuses to build a row with any missing answer', () => {
    const { flourishing, habits } = randomAnswers(seeded(1));
    delete flourishing.health_q2;
    expect(() => buildAssessmentRow({ userId: 'u', flourishing, habits })).toThrow(/health_q2/);
    const b = randomAnswers(seeded(2));
    delete b.habits.faith_prayer;
    expect(() => buildAssessmentRow({ userId: 'u', flourishing: b.flourishing, habits: b.habits })).toThrow(/faith_prayer/);
  });

  it('stores version 2, raw habit answers and habit scores', () => {
    const { flourishing, habits } = randomAnswers(seeded(3));
    const row = buildAssessmentRow({ userId: 'u', flourishing, habits });
    expect(row.version).toBe(2);
    expect(Object.keys(row.habit_responses)).toEqual(HABIT_KEYS);
    expect(Object.keys(row.habit_scores)).toEqual(DIMENSION_ORDER);
    for (const d of DIMENSION_ORDER) {
      expect(row.habit_scores[d]).toBe(habitScore(HABIT_ITEMS[d].map((h) => habits[h.key])));
    }
  });
});

describe('habit scores', () => {
  it('maps 0 to 4 onto 1 to 10 with 1 + mean * 2.25', () => {
    expect(habitScore([0, 0])).toBe(1);
    expect(habitScore([4, 4])).toBe(10);
    expect(habitScore([2, 2, 2])).toBe(5.5);
    expect(habitScore([1, 2])).toBe(4.4); // 1 + 1.5 * 2.25 = 4.375
    expect(habitScore([3, 4])).toBe(8.9); // 8.875
    expect(habitScore([0, 1, 1])).toBe(2.5); // 2.5
    expect(habitScore([1, 1, 2])).toBe(4); // 4.0
    expect(habitScore([])).toBe(null);
  });

  it('every possible combination stays between 1 and 10 with one decimal', () => {
    for (let a = 0; a <= 4; a += 1)
      for (let b = 0; b <= 4; b += 1)
        for (let c = 0; c <= 4; c += 1) {
          for (const v of [habitScore([a, b]), habitScore([a, b, c])]) {
            expect(v).toBeGreaterThanOrEqual(1);
            expect(v).toBeLessThanOrEqual(10);
            expect(Math.round(v * 10) / 10).toBe(v);
          }
        }
  });
});

describe('reads', () => {
  it('gives the four reads at the thresholds', () => {
    expect(THRESHOLDS).toEqual({ flourishingStrong: 7.5, habitsSteady: 6.5 });
    expect(getRead(7.4, 6.4).label).toBe('A good place to start');
    expect(getRead(7.4, 6.5).label).toBe('Faithful in a hard season');
    expect(getRead(7.5, 6.4).label).toBe('Strong now, worth protecting');
    expect(getRead(7.5, 6.5).label).toBe('A steady strength');
    expect(getRead(9, null)).toBe(null);
  });

  it('never shows a v1 assessment as a habit score of zero', () => {
    const v1 = { version: 1, habit_scores: null, faith_score: 7 };
    const s = scoresFromRow(v1);
    expect(s.faith.habit).toBe(null);
    expect(s.faith.flourishing).toBe(7);
  });
});

describe('focus suggestions', () => {
  const scores = (f, h) => Object.fromEntries(DIMENSION_ORDER.map((d, i) => [d, { flourishing: f[i], habit: h ? h[i] : null }]));

  it('suggests the two lowest flourishing areas', () => {
    expect(suggestFocus(scores([8, 5, 9, 4, 7, 8, 9], [5, 5, 5, 5, 5, 5, 5]))).toEqual(['health', 'relationships']);
  });

  it('breaks ties with the lowest habit score', () => {
    expect(suggestFocus(scores([5, 5, 5, 9, 9, 9, 9], [6, 3, 4, 5, 5, 5, 5]))).toEqual(['relationships', 'finances']);
  });

  it('then falls back to dimension order', () => {
    expect(suggestFocus(scores([5, 5, 5, 9, 9, 9, 9], null))).toEqual(['faith', 'relationships']);
  });
});
