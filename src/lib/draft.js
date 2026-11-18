// Assessment draft, saved to localStorage per person after every answer.

import { DIMENSION_ORDER } from '../content/dimensions.js';
import { FLOURISHING_QUESTIONS, HABIT_ITEMS } from '../content/assessment.js';

const key = (userId) => `gp-assessment-draft:${userId}`;

export function emptyDraft() {
  return { flourishing: {}, habits: {}, updatedAt: null };
}

export function loadDraft(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return { flourishing: d.flourishing ?? {}, habits: d.habits ?? {}, updatedAt: d.updatedAt ?? null };
  } catch {
    return null;
  }
}

export function saveDraft(userId, draft) {
  if (!userId) return;
  try {
    localStorage.setItem(key(userId), JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
  } catch {
    // Storage full or blocked: the assessment still works, it just cannot resume.
  }
}

export function clearDraft(userId) {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    // ignore
  }
}

export function isStepComplete(draft, dimension) {
  if (!draft) return false;
  return (
    FLOURISHING_QUESTIONS[dimension].every((q) => Number.isInteger(draft.flourishing[q.column])) &&
    HABIT_ITEMS[dimension].every((h) => Number.isInteger(draft.habits[h.key]))
  );
}

export function completedSteps(draft) {
  let n = 0;
  for (const d of DIMENSION_ORDER) {
    if (isStepComplete(draft, d)) n += 1;
    else break;
  }
  return n;
}

export function hasAnyAnswer(draft) {
  return Boolean(draft) && (Object.keys(draft.flourishing).length > 0 || Object.keys(draft.habits).length > 0);
}

export function readDraftSummary(userId) {
  const d = loadDraft(userId);
  if (!hasAnyAnswer(d)) return null;
  return { done: completedSteps(d) };
}
