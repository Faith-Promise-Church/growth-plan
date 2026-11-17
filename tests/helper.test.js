import { describe, it, expect } from 'vitest';
import { getSuggestions, MAX_SUGGESTIONS } from '../src/lib/helper.js';
import { practicesFor, PRACTICES } from '../src/content/practices.js';
import { HABIT_ITEMS } from '../src/content/assessment.js';
import { DIMENSION_ORDER } from '../src/content/dimensions.js';

const allAnswers = (v) => Object.fromEntries(DIMENSION_ORDER.flatMap((d) => HABIT_ITEMS[d].map((h) => [h.key, v])));
const goal = (dimension, practice_key, extra = {}) => ({ id: `${practice_key}-id`, dimension, practice_key, goal_text: 'Something I do.', status: 'active', ...extra });

describe('the Helper', () => {
  it('works in general mode with no assessment: core practices, small starters, invite', () => {
    const r = getSuggestions({ dimension: 'faith', goals: [] });
    expect(r.mode).toBe('general');
    expect(r.inviteAssessment).toBe(true);
    expect(r.suggestions.map((s) => s.key)).toEqual(['scripture-reading', 'prayer', 'church-attendance']);
    expect(r.suggestions.every((s) => s.size === 'small' && s.recommended)).toBe(true);
  });

  it('orders core practices at 0 or 1 first, then core at 2', () => {
    const habitResponses = { ...allAnswers(3), faith_scripture: 2, faith_prayer: 0, faith_worship: 1 };
    const r = getSuggestions({ dimension: 'faith', flourishing: 5, habitScore: 3, habitResponses, goals: [] });
    expect(r.suggestions.map((s) => s.key)).toEqual(['prayer', 'church-attendance', 'scripture-reading']);
  });

  it('sizes the starter: 0 or 1 small, 2 steady, 3 or 4 stretch with the current rhythm offered', () => {
    const habitResponses = { ...allAnswers(0), health_sleep: 1, health_movement: 2, health_eating: 4 };
    const r = getSuggestions({ dimension: 'health', flourishing: 5, habitScore: 4, habitResponses, goals: [] });
    const by = Object.fromEntries(r.suggestions.map((s) => [s.key, s]));
    expect(by.sleep.size).toBe('small');
    expect(by.exercise.size).toBe('steady');
    expect(by.nutrition.size).toBe('stretch');
    expect(by.nutrition.offerAsIs).toBe(true);
    expect(by.sleep.offerAsIs).toBe(false);
  });

  it('skips anything already in the plan, and counts a blank v1 required goal as not started', () => {
    const goals = [
      goal('faith', 'prayer'),
      { id: 'legacy', dimension: 'faith', discipline: 'Scripture Reading', goal_name: 'Scripture Reading', goal_text: '', is_mandatory: true },
    ];
    const r = getSuggestions({ dimension: 'faith', goals });
    const keys = r.suggestions.map((s) => s.key);
    expect(keys).not.toContain('prayer');
    expect(keys).toContain('scripture-reading');
  });

  it('a v1 goal with text counts as in the plan by its discipline', () => {
    const goals = [{ id: 'l', dimension: 'faith', discipline: 'Prayer', goal_name: 'Prayer', goal_text: 'Pray daily.', is_mandatory: true }];
    expect(getSuggestions({ dimension: 'faith', goals }).suggestions.map((s) => s.key)).not.toContain('prayer');
  });

  it('leads with support in a hard season and says adding more may not help', () => {
    const r = getSuggestions({ dimension: 'finances', flourishing: 4, habitScore: 8, habitResponses: allAnswers(3), goals: [] });
    expect(r.read).toBe('hard-season');
    expect(r.lead).toMatch(/Adding more may not be what you need/);
    expect(r.showCare).toBe(true);
    expect(r.suggestions[0].practice.support).toBe(true);
    expect(r.suggestions[0].key).toBe('financial-coaching');
  });

  it('gives each read its own lead line', () => {
    const leads = new Set(
      [
        [5, 4],
        [5, 8],
        [9, 4],
        [9, 8],
      ].map(([f, h]) => getSuggestions({ dimension: 'purpose', flourishing: f, habitScore: h, habitResponses: allAnswers(2), goals: [] }).lead),
    );
    expect(leads.size).toBe(4);
  });

  it('gives a gentle note past three active habits or three focus areas, never a block', () => {
    const goals = ['prayer', 'fasting', 'journaling', 'personal-worship'].map((k) => goal('faith', k));
    const r = getSuggestions({ dimension: 'faith', goals, focusCount: 4 });
    expect(r.notes.length).toBe(2);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('respects "Not for me"', () => {
    const r = getSuggestions({ dimension: 'faith', goals: [], dismissed: ['scripture-reading'] });
    expect(r.suggestions.map((s) => s.key)).not.toContain('scripture-reading');
  });

  it('every practice has a why and three starters with a cadence', () => {
    for (const p of PRACTICES) {
      expect(p.why, p.key).toBeTruthy();
      for (const size of ['small', 'steady', 'stretch']) {
        expect(p[size]?.what, `${p.key} ${size}`).toBeTruthy();
        expect(p[size]?.cadence, `${p.key} ${size}`).toBeTruthy();
      }
    }
    expect(PRACTICES.filter((p) => p.core).length).toBe(15);
    for (const d of DIMENSION_ORDER) expect(practicesFor(d).some((p) => p.support), d).toBe(true);
  });

  it('holds its rules under every combination of inputs', () => {
    const fs = [null, 1, 5, 7.4, 7.5, 10];
    const hs = [null, 1, 6.4, 6.5, 10];
    for (const dimension of DIMENSION_ORDER) {
      const library = practicesFor(dimension);
      const items = HABIT_ITEMS[dimension];
      for (const flourishing of fs)
        for (const habit of hs)
          for (let combo = 0; combo < 5 ** items.length; combo += 1) {
            const habitResponses = {};
            let c = combo;
            for (const it of items) {
              habitResponses[it.key] = c % 5;
              c = Math.floor(c / 5);
            }
            // Vary how much of the library is already in the plan.
            const inPlanCount = combo % (library.length + 1);
            const goals = library.slice(0, inPlanCount).map((p) => goal(dimension, p.key));
            const before = JSON.stringify(goals);
            const r = getSuggestions({ dimension, flourishing, habitScore: habit, habitResponses: habit == null ? null : habitResponses, goals });
            expect(r.suggestions.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
            const inPlan = new Set(goals.map((g) => g.practice_key));
            for (const s of r.suggestions) expect(inPlan.has(s.key)).toBe(false);
            // It never adds anything by itself.
            expect(JSON.stringify(goals)).toBe(before);
            // It always has something to offer while the library has anything left.
            if (inPlanCount < library.length) expect(r.suggestions.length).toBeGreaterThan(0);
            expect(r.lead.length).toBeGreaterThan(0);
          }
    }
  });
});
