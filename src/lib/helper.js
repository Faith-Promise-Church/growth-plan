// The Helper: rule-based suggestions for one dimension. Pure function, no AI, no side effects.
// It only ever returns offers. Adding anything happens when the person presses "Add to my plan".

import { practicesFor } from '../content/practices.js';
import { HABIT_ITEMS } from '../content/assessment.js';
import { dimensionName } from '../content/dimensions.js';
import { getRead } from './scoring.js';
import { goalPracticeKey, isNotStartedLegacy, isActive, isVisibleGoal } from './habits.js';

export const MAX_SUGGESTIONS = 3;
export const SOFT_LIMIT_HABITS = 3;
export const SOFT_LIMIT_FOCUS = 3;

function sizeForAnswer(answer) {
  if (answer == null) return 'small';
  if (answer <= 1) return 'small';
  if (answer === 2) return 'steady';
  return 'stretch';
}

function leadLine({ mode, read, name, isFocus, strongFlourishing }) {
  if (mode === 'general') {
    return `Here are a few places to start in ${name}. Take the assessment and these will fit you better.`;
  }
  if (mode === 'flourishing-only') {
    return strongFlourishing
      ? `${name} is going well for you. A small habit can help you keep it that way.`
      : `Here are a few small places to start in ${name}.`;
  }
  switch (read) {
    case 'start':
      return isFocus
        ? `${name} is one of your focus areas. Start with one small habit you can keep.`
        : `Start small in ${name}. One habit you can keep is better than three you drop.`;
    case 'hard-season':
      return `You are already keeping steady habits in ${name} during a hard season. Adding more may not be what you need right now. Support from other people may help more.`;
    case 'protect':
      return `${name} is strong right now. A steady habit will help you protect it.`;
    case 'steady':
      return `${name} is a steady strength for you. If you want a stretch, here are a few ideas.`;
    default:
      return `Here are a few ideas for ${name}.`;
  }
}

/**
 * @param {object} args
 * @param {string} args.dimension
 * @param {number|null} args.flourishing  1 to 10, or null with no assessment
 * @param {number|null} args.habitScore   1 to 10, or null (v1 assessment or none)
 * @param {object|null} args.habitResponses  { habit_item_key: 0..4 }
 * @param {Array} args.goals  this dimension's goals in the plan
 * @param {boolean} args.isFocus
 * @param {string[]} [args.dismissed]  practice keys the person marked "Not for me"
 * @param {number} [args.focusCount]  number of focus areas on the plan
 */
export function getSuggestions({
  dimension,
  flourishing = null,
  habitScore = null,
  habitResponses = null,
  goals = [],
  isFocus = false,
  dismissed = [],
  focusCount = 0,
}) {
  const name = dimensionName(dimension);
  const hasAssessment = flourishing != null;
  const hasHabits = hasAssessment && habitScore != null && habitResponses != null;
  const mode = !hasAssessment ? 'general' : hasHabits ? 'assessed' : 'flourishing-only';
  const read = hasHabits ? getRead(flourishing, habitScore)?.key ?? null : null;

  // What is already in the plan: anything started, by practice key. A blank legacy required
  // goal does not count; it is offered again as a suggestion.
  const inPlan = new Set(
    (goals ?? [])
      .filter((g) => g.dimension === dimension || g.dimension == null)
      .filter((g) => !isNotStartedLegacy(g) && isVisibleGoal(g))
      .map((g) => goalPracticeKey(g))
      .filter(Boolean),
  );
  const skip = new Set([...inPlan, ...(dismissed ?? [])]);

  const library = practicesFor(dimension);
  const answerFor = (p) => {
    if (!hasHabits || !p.habitItem) return null;
    const v = habitResponses[p.habitItem];
    return Number.isInteger(v) ? v : null;
  };

  let ordered;
  if (read === 'hard-season') {
    // Lead with support: a group, a pastor, counseling or coaching. Then core practices.
    const support = library.filter((p) => p.support);
    const core = library.filter((p) => p.core && !p.support);
    ordered = [...support, ...core, ...library.filter((p) => !p.support && !p.core)];
  } else if (mode === 'assessed') {
    const core = library.filter((p) => p.core);
    const tier = (p) => {
      const a = answerFor(p);
      if (a == null) return 2;
      if (a <= 1) return 0;
      if (a === 2) return 1;
      return 2;
    };
    const coreSorted = [...core].sort((a, b) => tier(a) - tier(b));
    ordered = [...coreSorted, ...library.filter((p) => !p.core)];
  } else {
    // General mode, or a v1 assessment without habit answers: core practices, small starters.
    ordered = [...library.filter((p) => p.core), ...library.filter((p) => !p.core && !p.support), ...library.filter((p) => p.support && !p.core)];
  }

  const suggestions = [];
  for (const p of ordered) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    if (skip.has(p.key)) continue;
    if (suggestions.some((sg) => sg.practice.key === p.key)) continue;
    const answer = answerFor(p);
    const size = mode === 'assessed' && read !== 'hard-season' ? sizeForAnswer(answer) : 'small';
    suggestions.push({
      practice: p,
      key: p.key,
      size,
      recommended: p.core,
      // With a steady rhythm already (3 or 4), offer to add it as it is.
      offerAsIs: mode === 'assessed' && answer != null && answer >= 3,
      answer,
    });
  }

  const activeCount = (goals ?? []).filter((g) => isVisibleGoal(g) && isActive(g)).length;
  const notes = [];
  if (activeCount > SOFT_LIMIT_HABITS) {
    notes.push(
      `You have ${activeCount} active habits in ${name}. That is a lot to carry. Think about keeping the ones that matter most and pausing the rest.`,
    );
  }
  if (focusCount > SOFT_LIMIT_FOCUS) {
    notes.push(`Your plan has ${focusCount} focus areas. Most people grow more when they focus on two or three.`);
  }

  return {
    dimension,
    mode,
    read,
    lead: leadLine({ mode, read, name, isFocus, strongFlourishing: hasAssessment && flourishing >= 7.5 }),
    suggestions,
    showCare: read === 'hard-season',
    inviteAssessment: mode === 'general',
    notes,
    habitItems: HABIT_ITEMS[dimension] ?? [],
  };
}
