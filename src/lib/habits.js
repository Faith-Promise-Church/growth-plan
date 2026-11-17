import { getPractice, practiceForLegacyGoal } from '../content/practices.js';
import { DIMENSION_ORDER } from '../content/dimensions.js';

export const CADENCES = [
  { value: 'daily', label: 'Daily', phrase: 'every day' },
  { value: 'weekdays', label: 'Weekdays', phrase: 'on weekdays' },
  { value: 'few-weekly', label: 'A few times a week', phrase: 'a few times a week' },
  { value: 'weekly', label: 'Weekly', phrase: 'once a week' },
  { value: 'monthly', label: 'Monthly', phrase: 'once a month' },
  { value: 'other', label: 'Other', phrase: '' },
];

const CADENCE_BY_VALUE = Object.fromEntries(CADENCES.map((c) => [c.value, c]));

export const LIMITS = {
  what: 300,
  anchor: 120,
  cadenceText: 60,
  goalText: 5000,
};

// The cadence column stores one of the values above, or "other:<text>".
export function encodeCadence(cadence, cadenceText) {
  if (cadence === 'other') return `other:${(cadenceText ?? '').trim().slice(0, LIMITS.cadenceText)}`;
  return CADENCE_BY_VALUE[cadence] ? cadence : null;
}

export function decodeCadence(stored) {
  if (!stored) return { cadence: null, cadenceText: '' };
  if (stored.startsWith('other:')) return { cadence: 'other', cadenceText: stored.slice(6) };
  return CADENCE_BY_VALUE[stored] ? { cadence: stored, cadenceText: '' } : { cadence: null, cadenceText: '' };
}

export function cadencePhrase(cadence, cadenceText) {
  if (cadence === 'other') return (cadenceText ?? '').trim();
  return CADENCE_BY_VALUE[cadence]?.phrase ?? '';
}

function lowerFirst(text) {
  if (!text) return text;
  const first = text.split(/\s+/)[0];
  if (['I', "I'm", "I'll", 'God', "God's", 'Jesus', 'Scripture'].includes(first)) return text;
  if (text.length > 1 && text[1] === text[1].toUpperCase() && /[A-Z]/.test(text[1])) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function upperFirst(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function stripEndPunctuation(text) {
  return text.replace(/[\s.,;:!]+$/u, '');
}

// "Read one Psalm" + weekdays + "after my morning coffee"
//   -> "After my morning coffee, read one Psalm on weekdays."
export function composeHabitSentence({ what, cadence, cadenceText, anchor }) {
  const action = stripEndPunctuation((what ?? '').trim());
  if (!action) return '';
  const when = stripEndPunctuation((anchor ?? '').trim());
  const how = cadencePhrase(cadence, cadenceText);
  let sentence = when ? `${upperFirst(when)}, ${lowerFirst(action)}` : upperFirst(action);
  if (how) sentence += ` ${how}`;
  return `${sentence}.`;
}

export function starterToDraft(practice, size) {
  const starter = practice?.[size];
  if (!starter) return { what: '', cadence: 'weekly', cadenceText: '', anchor: '' };
  return {
    what: starter.what,
    cadence: starter.cadence,
    cadenceText: starter.cadenceText ?? '',
    anchor: '',
  };
}

export function starterSentence(practice, size) {
  return composeHabitSentence(starterToDraft(practice, size));
}

// ---------------------------------------------------------------------------
// Legacy (v1) goals
// ---------------------------------------------------------------------------

export function isBlank(text) {
  return !text || !String(text).trim();
}

// A v1 required goal with empty text was never started. It is hidden from the plan and print
// views and offered as a suggestion instead.
export function isNotStartedLegacy(goal) {
  return Boolean(goal?.is_mandatory) && isBlank(goal.goal_text);
}

// Goals that show in the plan: anything with text. Blank optional goals are hidden too.
export function isVisibleGoal(goal) {
  return !isBlank(goal?.goal_text);
}

export function goalPracticeKey(goal) {
  if (goal?.practice_key) return goal.practice_key;
  return practiceForLegacyGoal(goal)?.key ?? null;
}

export function goalTitle(goal) {
  const practice = getPractice(goalPracticeKey(goal));
  return goal?.goal_name?.trim() || practice?.name || 'My habit';
}

export function isActive(goal) {
  return (goal?.status ?? 'active') === 'active';
}

export function visibleGoals(goals) {
  return (goals ?? []).filter(isVisibleGoal);
}

export function activeHabits(goals) {
  return visibleGoals(goals).filter(isActive);
}

export function groupByDimension(goals) {
  const out = Object.fromEntries(DIMENSION_ORDER.map((d) => [d, []]));
  for (const g of goals ?? []) {
    if (out[g.dimension]) out[g.dimension].push(g);
  }
  for (const d of DIMENSION_ORDER) {
    out[d].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }
  return out;
}

// Order dimensions with focus areas first, then the usual order.
export function orderedDimensions(focus = []) {
  const f = (focus ?? []).filter((d) => DIMENSION_ORDER.includes(d));
  return [...f, ...DIMENSION_ORDER.filter((d) => !f.includes(d))];
}
