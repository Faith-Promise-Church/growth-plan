import { describe, it, expect } from 'vitest';
import { getSendDecision, firstMonday } from '../src/lib/schedule.js';
import { zonedParts, currentPlanYear, offersNextYear } from '../src/lib/time.js';

// Every cron call from December 1, 2026 to January 31, 2028, at both cron hours (12:00 and
// 13:00 UTC). This covers the March 14 and November 7, 2027 clock changes.
function cronCalls() {
  const out = [];
  for (let t = Date.UTC(2026, 11, 1); t <= Date.UTC(2028, 0, 31); t += 86400000) {
    out.push(new Date(t + 12 * 3600000), new Date(t + 13 * 3600000));
  }
  return out;
}

describe('the Eastern-time send gate', () => {
  const calls = cronCalls();
  const sends = calls.filter((d) => getSendDecision(d).action === 'send');
  const previews = calls.filter((d) => getSendDecision(d).action === 'preview');

  it('opens exactly one send window per month', () => {
    const periods = sends.map((d) => getSendDecision(d).period);
    expect(periods.length).toBe(14);
    expect(new Set(periods).size).toBe(14);
  });

  it('every send is on the first Monday at 8 AM Eastern', () => {
    for (const d of sends) {
      const p = zonedParts(d);
      expect(p.weekday).toBe(1);
      expect(p.day).toBeLessThanOrEqual(7);
      expect(p.hour).toBe(8);
      expect(p.minute).toBe(0);
      expect(p.day).toBe(firstMonday(p.year, p.month).day);
    }
  });

  it('uses 13:00 UTC in winter and 12:00 UTC in summer, across both clock changes', () => {
    const byPeriod = Object.fromEntries(sends.map((d) => [getSendDecision(d).period, d.toISOString()]));
    expect(byPeriod['2026-12-01']).toBe('2026-12-07T13:00:00.000Z');
    expect(byPeriod['2027-03-01']).toBe('2027-03-01T13:00:00.000Z'); // before March 14
    expect(byPeriod['2027-04-01']).toBe('2027-04-05T12:00:00.000Z'); // after March 14
    expect(byPeriod['2027-11-01']).toBe('2027-11-01T12:00:00.000Z'); // before November 7
    expect(byPeriod['2027-12-01']).toBe('2027-12-06T13:00:00.000Z'); // after November 7
    expect(byPeriod['2028-01-01']).toBe('2028-01-03T13:00:00.000Z');
  });

  it('previews only on the Thursday before each send, at 8 AM Eastern', () => {
    // One preview per send in range: the Thursday before each first Monday.
    expect(previews.map((d) => getSendDecision(d).period)).toEqual(sends.map((d) => getSendDecision(d).period));
    for (const d of previews) {
      const p = zonedParts(d);
      expect(p.weekday).toBe(4);
      expect(p.hour).toBe(8);
      const sendDay = new Date(d.getTime() + 4 * 86400000);
      const sp = zonedParts(sendDay);
      expect(sp.weekday).toBe(1);
      expect(sp.day).toBeLessThanOrEqual(7);
    }
    // The preview for February 2027 (send Feb 1) falls in January.
    const feb = previews.find((d) => getSendDecision(d).period === '2027-02-01');
    expect(zonedParts(feb).month).toBe(1);
    expect(zonedParts(feb).day).toBe(28);
  });

  it('resumes for up to three days after a send and never before it', () => {
    expect(getSendDecision(new Date('2026-12-07T12:00:00Z')).action).toBe('none'); // 7 AM, before the send
    expect(getSendDecision(new Date('2026-12-07T14:00:00Z'))).toEqual({ action: 'resume', period: '2026-12-01' });
    expect(getSendDecision(new Date('2026-12-10T13:00:00Z'))).toEqual({ action: 'resume', period: '2026-12-01' });
    expect(getSendDecision(new Date('2026-12-11T13:00:00Z')).action).toBe('none');
  });

  it('a Monday that is not the first Monday never sends', () => {
    expect(getSendDecision(new Date('2026-12-14T13:00:00Z')).action).toBe('none');
  });
});

describe('plan year', () => {
  it('uses the year in New York', () => {
    expect(currentPlanYear(new Date('2027-01-01T03:00:00Z'))).toBe(2026); // still Dec 31 in Knoxville
    expect(currentPlanYear(new Date('2027-01-01T06:00:00Z'))).toBe(2027);
  });
  it('offers next year from November 1', () => {
    expect(offersNextYear(new Date('2026-10-31T15:00:00Z'))).toBe(false);
    expect(offersNextYear(new Date('2026-11-01T15:00:00Z'))).toBe(true);
  });
});
