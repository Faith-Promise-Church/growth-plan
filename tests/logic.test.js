import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getCheckinAdjustments } from '../src/lib/checkinAdjustments.js';
import {
  composeHabitSentence,
  encodeCadence,
  decodeCadence,
  isNotStartedLegacy,
  isVisibleGoal,
  visibleGoals,
  goalPracticeKey,
  activeHabits,
} from '../src/lib/habits.js';
import { validateCheckinSubmission, choosePlanForPeriod, orderedActiveHabits } from '../src/lib/checkinCore.js';
import { DIMENSION_ORDER } from '../src/content/dimensions.js';

// ---------------------------------------------------------------------------
// Contrast
// ---------------------------------------------------------------------------
const css = readFileSync(new URL('../src/styles/variables.css', import.meta.url), 'utf8');
const vars = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('color tokens meet WCAG AA', () => {
  it('keeps the v1 colors exactly', () => {
    expect(vars['light-neutral']).toBe('#F4F2EE');
    expect(vars['dark-neutral']).toBe('#272624');
    expect([vars.faith, vars.relationships, vars.finances, vars.health, vars.purpose, vars.character, vars.contentment]).toEqual([
      '#d66b4a', '#e69c5a', '#dfbd60', '#83a672', '#409083', '#326565', '#283d49',
    ]);
  });

  for (const d of DIMENSION_ORDER) {
    it(`${d}: ink text passes 4.5:1 on the page and on white, white passes on the ink fill`, () => {
      const ink = vars[`${d}-ink`];
      expect(ink, `--${d}-ink`).toBeTruthy();
      expect(contrast(ink, vars['light-neutral'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    });
    it(`${d}: text on the full color passes the large-text level (3:1)`, () => {
      expect(contrast(vars[`${d}-on`], vars[d])).toBeGreaterThanOrEqual(3);
    });
  }

  it('body text, muted text and buttons pass 4.5:1', () => {
    expect(contrast(vars['dark-neutral'], vars['light-neutral'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars['ink-muted'], vars['light-neutral'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars['ink-muted'], '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', vars.character)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars.danger, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

// ---------------------------------------------------------------------------
// Habits and legacy goals
// ---------------------------------------------------------------------------
describe('habit sentences', () => {
  it('builds the sentence from its parts', () => {
    expect(composeHabitSentence({ what: 'Read one Psalm before I pick up my phone', cadence: 'weekdays' })).toBe(
      'Read one Psalm before I pick up my phone on weekdays.',
    );
    expect(composeHabitSentence({ what: 'Read one Psalm', cadence: 'daily', anchor: 'after my morning coffee' })).toBe(
      'After my morning coffee, read one Psalm every day.',
    );
    expect(composeHabitSentence({ what: 'Pray with my kids.', cadence: 'other', cadenceText: 'on school nights' })).toBe('Pray with my kids on school nights.');
    expect(composeHabitSentence({ what: '   ', cadence: 'daily' })).toBe('');
    expect(composeHabitSentence({ what: 'I will call Mom', cadence: 'weekly', anchor: 'On Sundays' })).toBe('On Sundays, I will call Mom once a week.');
  });

  it('round-trips cadence', () => {
    expect(decodeCadence(encodeCadence('other', 'twice a month'))).toEqual({ cadence: 'other', cadenceText: 'twice a month' });
    expect(decodeCadence(encodeCadence('weekly'))).toEqual({ cadence: 'weekly', cadenceText: '' });
    expect(encodeCadence('nonsense')).toBe(null);
  });
});

describe('legacy goals', () => {
  const blankRequired = { dimension: 'faith', discipline: 'Prayer', goal_name: 'Prayer', goal_text: '', is_mandatory: true };
  const writtenRequired = { dimension: 'faith', discipline: 'Prayer', goal_name: 'Prayer', goal_text: 'Pray every morning.', is_mandatory: true };
  const blankOptional = { dimension: 'faith', goal_name: 'Something', goal_text: ' ', is_mandatory: false };

  it('treats a blank required goal as not started and hides it', () => {
    expect(isNotStartedLegacy(blankRequired)).toBe(true);
    expect(isVisibleGoal(blankRequired)).toBe(false);
  });

  it('shows a written required goal like any other', () => {
    expect(isNotStartedLegacy(writtenRequired)).toBe(false);
    expect(isVisibleGoal(writtenRequired)).toBe(true);
    expect(goalPracticeKey(writtenRequired)).toBe('prayer');
  });

  it('hides blank optional goals and treats goals with no status as active', () => {
    expect(visibleGoals([blankRequired, writtenRequired, blankOptional])).toEqual([writtenRequired]);
    expect(activeHabits([writtenRequired]).length).toBe(1);
  });

  it('matches every v1 required discipline to a core practice', () => {
    const v1 = {
      faith: ['Scripture Reading', 'Prayer', 'Church Attendance'],
      relationships: ['Group Attendance'],
      finances: ['Tithing + Giving', 'Budgeting'],
      health: ['Sleep', 'Exercise', 'Nutrition'],
      purpose: ['Serving', 'Evangelism'],
      character: ['Scripture Memory', 'Daily Confession & Repentance'],
      contentment: ['Gratitude', 'Weekly Sabbath'],
    };
    for (const [dimension, list] of Object.entries(v1)) {
      for (const discipline of list) {
        expect(goalPracticeKey({ dimension, discipline, goal_name: discipline }), discipline).toBeTruthy();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Check-in adjustments
// ---------------------------------------------------------------------------
describe('getCheckinAdjustments', () => {
  const habit = { id: 'h', status: 'active', practice_key: 'prayer' };

  it('offers smaller, pause or let go after two hard months', () => {
    const r = getCheckinAdjustments({ habit, thisMonth: 1, lastMonth: 0 });
    expect(r.kind).toBe('smaller');
    expect(r.actions.map((a) => a.key)).toEqual(['smaller', 'pause', 'let-go']);
    expect(r.actions[0].sentence).toBe('Pray for five minutes before I start my day on weekdays.');
  });

  it('offers stretch or keep after two steady months', () => {
    const r = getCheckinAdjustments({ habit, thisMonth: 4, lastMonth: 3 });
    expect(r.kind).toBe('stretch');
    expect(r.actions.map((a) => a.key)).toEqual(['stretch', 'keep']);
  });

  it('only encourages otherwise, including the first month', () => {
    for (const [t, l] of [[1, 2], [3, 2], [2, 2], [0, null], [4, null], [1, 3]]) {
      const r = getCheckinAdjustments({ habit, thisMonth: t, lastMonth: l });
      expect(r.kind).toBe('encourage');
      expect(r.actions).toEqual([]);
      expect(r.message.length).toBeGreaterThan(0);
    }
  });

  it('never suggests an action for a paused or done habit', () => {
    for (const status of ['paused', 'done'])
      for (let t = 0; t <= 4; t += 1)
        for (const l of [null, 0, 1, 2, 3, 4]) {
          const r = getCheckinAdjustments({ habit: { ...habit, status }, thisMonth: t, lastMonth: l });
          expect(r.actions).toEqual([]);
        }
  });

  it('works for a habit with no practice', () => {
    const r = getCheckinAdjustments({ habit: { id: 'x', status: 'active', practice_key: null }, thisMonth: 0, lastMonth: 1 });
    expect(r.kind).toBe('smaller');
    expect(r.actions[0].sentence).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// Check-in submissions
// ---------------------------------------------------------------------------
describe('check-in validation', () => {
  const a = '11111111-1111-4111-8111-111111111111';
  const b = '22222222-2222-4222-8222-222222222222';
  const other = '33333333-3333-4333-8333-333333333333';

  it('accepts answers for the person\'s own habits', () => {
    expect(validateCheckinSubmission({ responses: { [a]: 3, [b]: 0 }, note: ' Hi ' }, [a, b])).toEqual({ ok: true, responses: { [a]: 3, [b]: 0 }, note: 'Hi' });
  });

  it('rejects another person\'s goal ids, bad values and bad notes', () => {
    expect(validateCheckinSubmission({ responses: { [other]: 3 } }, [a, b]).ok).toBe(false);
    expect(validateCheckinSubmission({ responses: { [a]: 5 } }, [a]).ok).toBe(false);
    expect(validateCheckinSubmission({ responses: { [a]: 1.5 } }, [a]).ok).toBe(false);
    expect(validateCheckinSubmission({ responses: { [a]: '3' } }, [a]).ok).toBe(false);
    expect(validateCheckinSubmission({ responses: {} }, [a]).ok).toBe(false);
    expect(validateCheckinSubmission({ responses: [] }, [a]).ok).toBe(false);
    expect(validateCheckinSubmission({ responses: { [a]: 1 }, note: 'x'.repeat(2001) }, [a]).ok).toBe(false);
    expect(validateCheckinSubmission({ responses: { [a]: 1 }, note: 42 }, [a]).ok).toBe(false);
    expect(validateCheckinSubmission(null, [a]).ok).toBe(false);
  });

  it('chooses this year\'s plan, or the latest earlier one', () => {
    const plans = [{ id: 'p26', year: 2026 }, { id: 'p27', year: 2027 }];
    expect(choosePlanForPeriod(plans, '2026-12-01').id).toBe('p26');
    expect(choosePlanForPeriod(plans, '2027-01-01').id).toBe('p27');
    expect(choosePlanForPeriod([plans[0]], '2027-01-01').id).toBe('p26');
    expect(choosePlanForPeriod([], '2027-01-01')).toBe(null);
  });

  it('orders active habits with focus areas first', () => {
    const goals = [
      { id: 1, dimension: 'faith', goal_text: 'A.', sort_order: 0 },
      { id: 2, dimension: 'health', goal_text: 'B.', sort_order: 0 },
      { id: 3, dimension: 'health', goal_text: '', sort_order: 1 },
      { id: 4, dimension: 'purpose', goal_text: 'C.', status: 'paused' },
    ];
    expect(orderedActiveHabits({ focus_dimensions: ['health'] }, goals).map((g) => g.id)).toEqual([2, 1]);
  });
});
