// Check-in logic shared by the server functions and the demo mode. No Node or browser APIs.

import { activeHabits, orderedDimensions } from './habits.js';
import { getCheckinAdjustments } from './checkinAdjustments.js';

export const MAX_NOTE_LENGTH = 2000;
export const MAX_BODY_BYTES = 16 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The plan an email or check-in is about: this period's year, or the latest earlier one.
export function choosePlanForPeriod(plans, period) {
  const year = Number(String(period).slice(0, 4));
  const sorted = [...(plans ?? [])].sort((a, b) => b.year - a.year);
  return sorted.find((p) => p.year === year) ?? sorted.find((p) => p.year < year) ?? sorted[0] ?? null;
}

// Active habits, focus areas first, then the usual dimension order and the person's order.
export function orderedActiveHabits(plan, goals) {
  const habits = activeHabits(goals);
  const order = orderedDimensions(plan?.focus_dimensions ?? []);
  return habits.sort((a, b) => {
    const da = order.indexOf(a.dimension);
    const db = order.indexOf(b.dimension);
    if (da !== db) return da - db;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export function publicHabit(goal) {
  return {
    id: goal.id,
    dimension: goal.dimension,
    sentence: String(goal.goal_text ?? '').trim(),
    practice_key: goal.practice_key ?? null,
    status: goal.status ?? 'active',
  };
}

/**
 * Validate a check-in body against the person's active habits.
 * @returns {{ ok: true, responses: object, note: string|null } | { ok: false, error: string }}
 */
export function validateCheckinSubmission(body, habitIds) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Invalid request.' };
  const { responses, note } = body;
  if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
    return { ok: false, error: 'Invalid responses.' };
  }
  const allowed = new Set((habitIds ?? []).map((id) => String(id).toLowerCase()));
  const keys = Object.keys(responses);
  if (keys.length === 0) return { ok: false, error: 'Answer at least one habit.' };
  if (keys.length > 100) return { ok: false, error: 'Too many responses.' };
  const clean = {};
  for (const key of keys) {
    const id = key.toLowerCase();
    if (!UUID_RE.test(id) || !allowed.has(id)) return { ok: false, error: 'That habit is not on this plan.' };
    const v = responses[key];
    if (!Number.isInteger(v) || v < 0 || v > 4) return { ok: false, error: 'Invalid answer.' };
    clean[id] = v;
  }
  let cleanNote = null;
  if (note != null) {
    if (typeof note !== 'string') return { ok: false, error: 'Invalid note.' };
    if (note.length > MAX_NOTE_LENGTH) return { ok: false, error: 'That note is too long.' };
    cleanNote = note.trim() || null;
  }
  return { ok: true, responses: clean, note: cleanNote };
}

export function buildAdjustments(habits, responses, lastResponses) {
  const out = {};
  for (const h of habits) {
    const thisMonth = responses?.[h.id];
    if (thisMonth == null) continue;
    out[h.id] = getCheckinAdjustments({
      habit: h,
      thisMonth,
      lastMonth: lastResponses?.[h.id] ?? null,
    });
  }
  return out;
}
