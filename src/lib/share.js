// Sharing a plan. Two ways, both chosen by the person:
//   1. A plain-text summary handed to the phone's share sheet (nothing is stored).
//   2. A private read-only link that shows chosen areas for a limited time.
// Both show habits only. Scores are added to the text summary only when the person asks.

import { DIMENSION_ORDER, DIMENSIONS } from '../content/dimensions.js';
import { activeHabits, groupByDimension, orderedDimensions } from './habits.js';
import { formatScore } from './scoring.js';

// How long a private link works.
export const SHARE_DAYS = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isShareId(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

// Keep only real dimension names, once each, in the app's usual order.
export function cleanDimensions(input) {
  const wanted = new Set(Array.isArray(input) ? input : []);
  return DIMENSION_ORDER.filter((d) => wanted.has(d));
}

// The areas that have at least one active habit, focus areas first.
export function shareableDimensions(plan, goals) {
  const byDim = groupByDimension(activeHabits(goals));
  return orderedDimensions(plan?.focus_dimensions ?? []).filter((d) => byDim[d].length > 0);
}

// What a shared plan contains: the year and, for each chosen area, its active habit sentences.
export function buildSharedPlan({ plan, goals, dimensions }) {
  const chosen = new Set(cleanDimensions(dimensions));
  const byDim = groupByDimension(activeHabits(goals));
  const groups = orderedDimensions(plan?.focus_dimensions ?? [])
    .filter((d) => chosen.has(d) && byDim[d].length > 0)
    .map((d) => ({
      dimension: d,
      habits: byDim[d].map((g) => String(g.goal_text ?? '').trim()).filter(Boolean),
    }))
    .filter((g) => g.habits.length > 0);
  return { year: plan?.year ?? null, groups };
}

// The text handed to the share sheet.
export function buildShareText({ plan, goals, dimensions, scores = null }) {
  const { year, groups } = buildSharedPlan({ plan, goals, dimensions });
  if (!groups.length) return '';
  const lines = [`My ${year} growth plan`, ''];
  for (const group of groups) {
    const s = scores?.[group.dimension];
    const parts = [];
    if (s?.flourishing != null) parts.push(`flourishing ${formatScore(s.flourishing)}`);
    if (s?.habit != null) parts.push(`habits ${formatScore(s.habit)}`);
    lines.push(parts.length ? `${DIMENSIONS[group.dimension].name} (${parts.join(', ')})` : DIMENSIONS[group.dimension].name);
    for (const habit of group.habits) lines.push(`- ${habit}`);
    lines.push('');
  }
  lines.push('Made with the Growth Plan Builder at Faith Promise Church.');
  return lines.join('\n');
}

// Is a stored share still usable?
export function shareIsActive(share, now = Date.now()) {
  if (!share || share.revoked_at) return false;
  const expires = new Date(share.expires_at).getTime();
  return Number.isFinite(expires) && expires > now;
}

export function shareExpiry(now = Date.now(), days = SHARE_DAYS) {
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
}
