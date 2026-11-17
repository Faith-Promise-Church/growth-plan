// Time helpers. Faith Promise is in Knoxville, so "today" and "this year" are Eastern time.

export const CHURCH_TIME_ZONE = 'America/New_York';
export const MIN_PLAN_YEAR = 2026;
export const MAX_PLAN_YEAR = 2045;

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatterCache = new Map();
function formatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        weekday: 'short',
        hourCycle: 'h23',
      }),
    );
  }
  return formatterCache.get(timeZone);
}

// { year, month (1-12), day, hour (0-23), minute, weekday (0 = Sunday) } in the given zone.
export function zonedParts(date, timeZone = CHURCH_TIME_ZONE) {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: WEEKDAYS[parts.weekday],
  };
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

// A calendar date as an ISO string, used for periods ("2027-01-01"). Not shown to people.
export function isoDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function periodOf(date, timeZone = CHURCH_TIME_ZONE) {
  const p = zonedParts(date, timeZone);
  return isoDate(p.year, p.month, 1);
}

export function clampPlanYear(year) {
  return Math.min(MAX_PLAN_YEAR, Math.max(MIN_PLAN_YEAR, year));
}

export function currentPlanYear(now = new Date()) {
  return clampPlanYear(zonedParts(now).year);
}

// From November 1, Home offers next year's plan.
export function offersNextYear(now = new Date()) {
  const p = zonedParts(now);
  return p.month >= 11 && p.year + 1 <= MAX_PLAN_YEAR;
}

export function isValidPlanYear(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= MIN_PLAN_YEAR && n <= MAX_PLAN_YEAR;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthName(period) {
  const m = Number(String(period).slice(5, 7));
  return MONTHS[m - 1] ?? '';
}

export function monthYearLabel(period) {
  return `${monthName(period)} ${String(period).slice(0, 4)}`;
}

export function shortMonth(period) {
  return monthName(period).slice(0, 3);
}

// "Nov 17, 2026" with no leading zeroes.
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: CHURCH_TIME_ZONE }).format(d);
}

export function daysBetween(a, b) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function addMonths(period, n) {
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7)) - 1 + n;
  const year = y + Math.floor(m / 12);
  const month = ((m % 12) + 12) % 12 + 1;
  return isoDate(year, month, 1);
}
