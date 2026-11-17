// When the monthly check-in sends. Vercel cron runs in UTC and cannot combine day-of-month with
// day-of-week, and Eastern time moves between UTC-5 and UTC-4. Two daily crons (12:00 and 13:00
// UTC) call the engine, and this gate decides what, if anything, to do.
//
// Send: Monday, day of month 7 or lower, 8 AM in New York.
// Preview: the Thursday before that Monday, 8 AM in New York.
// Resume: up to three days after the send day, at any hour, if rows are unfinished.

import { zonedParts, isoDate, CHURCH_TIME_ZONE } from './time.js';

export const SEND_HOUR = 8;
export const RESUME_DAYS = 3;

function addDaysToCivil({ year, month, day }, n) {
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() };
}

// The first Monday of a month as a civil date.
export function firstMonday(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (8 - first) % 7;
  return { year, month, day: 1 + offset };
}

export function isSendWindow(now) {
  const p = zonedParts(now, CHURCH_TIME_ZONE);
  return p.weekday === 1 && p.day <= 7 && p.hour === SEND_HOUR;
}

export function isPreviewWindow(now) {
  const p = zonedParts(now, CHURCH_TIME_ZONE);
  if (p.weekday !== 4 || p.hour !== SEND_HOUR) return null;
  const monday = addDaysToCivil(p, 4);
  if (monday.weekday !== 1 || monday.day > 7) return null;
  return isoDate(monday.year, monday.month, 1);
}

// The period whose send day was 0 to RESUME_DAYS days ago (in New York), if any.
export function resumablePeriod(now) {
  const p = zonedParts(now, CHURCH_TIME_ZONE);
  for (let back = 0; back <= RESUME_DAYS; back += 1) {
    const d = addDaysToCivil(p, -back);
    const fm = firstMonday(d.year, d.month);
    if (fm.day === d.day) {
      // On the send day itself, resuming only makes sense after the send hour.
      if (back === 0 && p.hour < SEND_HOUR) return null;
      return isoDate(d.year, d.month, 1);
    }
  }
  return null;
}

/**
 * @returns {{ action: 'send', period } | { action: 'preview', period } | { action: 'resume', period } | { action: 'none' }}
 * 'resume' only means "check for unfinished rows"; the engine sends nothing if all are done.
 */
export function getSendDecision(now) {
  if (isSendWindow(now)) {
    const p = zonedParts(now, CHURCH_TIME_ZONE);
    return { action: 'send', period: isoDate(p.year, p.month, 1) };
  }
  const preview = isPreviewWindow(now);
  if (preview) return { action: 'preview', period: preview };
  const resume = resumablePeriod(now);
  if (resume) return { action: 'resume', period: resume };
  return { action: 'none' };
}
