// Per-habit suggestions after a monthly check-in. Pure function. These are offers only; applying
// one requires signing in.

import { getPractice } from '../content/practices.js';
import { starterSentence } from './habits.js';

const ENCOURAGEMENT = [
  'Keep going. Small steps add up over a year.',
  'Thank you for checking in. Keep this one going next month.',
  'You are building something steady. Keep at it.',
];

/**
 * @param {object} args
 * @param {object} args.habit  { id, status, practice_key }
 * @param {number|null} args.thisMonth  0..4
 * @param {number|null} args.lastMonth  0..4 or null
 * @returns {{ kind: 'none'|'encourage'|'smaller'|'stretch', actions: Array, message: string }}
 */
export function getCheckinAdjustments({ habit, thisMonth, lastMonth }) {
  const status = habit?.status ?? 'active';
  if (status !== 'active') {
    return { kind: 'none', actions: [], message: '' };
  }
  if (!Number.isInteger(thisMonth) || thisMonth < 0 || thisMonth > 4) {
    return { kind: 'none', actions: [], message: '' };
  }
  const practice = getPractice(habit?.practice_key);
  const both = (test) => Number.isInteger(lastMonth) && test(thisMonth) && test(lastMonth);

  if (both((v) => v <= 1)) {
    const actions = [];
    if (practice?.small) {
      actions.push({ key: 'smaller', label: 'Make it smaller', sentence: starterSentence(practice, 'small') });
    } else {
      actions.push({ key: 'smaller', label: 'Make it smaller', sentence: null });
    }
    actions.push({ key: 'pause', label: 'Pause it' });
    actions.push({ key: 'let-go', label: 'Let it go' });
    return {
      kind: 'smaller',
      actions,
      message: 'This one has been hard two months in a row. A smaller version may be easier to keep.',
    };
  }

  if (both((v) => v >= 3)) {
    const actions = [];
    actions.push({
      key: 'stretch',
      label: 'Stretch it',
      sentence: practice?.stretch ? starterSentence(practice, 'stretch') : null,
    });
    actions.push({ key: 'keep', label: 'Keep it as it is' });
    return {
      kind: 'stretch',
      actions,
      message: 'This has been steady two months in a row. You could stretch it or keep it as it is.',
    };
  }

  return {
    kind: 'encourage',
    actions: [],
    message: ENCOURAGEMENT[(thisMonth + (lastMonth ?? 0)) % ENCOURAGEMENT.length],
  };
}
