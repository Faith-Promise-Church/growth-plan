import { describe, it, expect } from 'vitest';
import { renderCheckinEmail } from '../server/email/render.js';
import { buildMessage } from '../server/engine.js';
import { CHECKIN_EDITIONS, EVERGREEN_EDITION } from '../src/content/checkinEditions.js';
import { TEST_ENV } from './helpers/fakeServerDb.js';
import { DIMENSION_ORDER } from '../src/content/dimensions.js';

const USER = '6f1c2a54-0d8b-4c1e-9a1b-2c3d4e5f6a7b';

function habits(n, long = false) {
  return Array.from({ length: n }, (_, i) => ({
    id: `h${i}`,
    dimension: DIMENSION_ORDER[i % 7],
    goal_text: long ? `${'Pray for my neighbors and coworkers by name '.repeat(10)}every day.` : `Read one Psalm before I pick up my phone on weekdays (${i + 1}).`,
  }));
}

const VARIANTS = [
  { name: 'no plan', firstName: 'Sam', plan: null, habits: [] },
  { name: 'plan, 0 habits', firstName: 'Sam', plan: { year: 2026, focus_dimensions: ['faith'] }, habits: [] },
  { name: '1 habit', firstName: 'Sam', plan: { year: 2026, focus_dimensions: ['faith'] }, habits: habits(1) },
  { name: '5 habits', firstName: 'Sam', plan: { year: 2026, focus_dimensions: ['faith', 'health'] }, habits: habits(5) },
  { name: '12 habits', firstName: 'Sam', plan: { year: 2026, focus_dimensions: ['faith', 'health', 'purpose'] }, habits: habits(12, true) },
  { name: 'long accented name', firstName: 'María-José Añez de la Peña Ólafsdóttir Brontë', plan: { year: 2026, focus_dimensions: [] }, habits: habits(2) },
];

function check(rendered, variant, edition) {
  const { html, text, subject } = rendered;
  // A plain-text part
  expect(text.length).toBeGreaterThan(100);
  // Working unsubscribe link in both parts
  expect(html).toMatch(/href="https:\/\/growthplan\.example\.org\/email\/preferences\?token=[^"]+"[^>]*>Unsubscribe</);
  expect(text).toMatch(/Unsubscribe: https:\/\/growthplan\.example\.org\/email\/preferences\?token=/);
  // Only absolute https links
  for (const m of html.matchAll(/(?:href|src)="([^"]*)"/g)) expect(m[1]).toMatch(/^https:\/\//);
  for (const m of text.matchAll(/\bhttps?:\/\/\S+/g)) expect(m[0]).toMatch(/^https:\/\//);
  // No leftovers
  for (const bad of ['{{', '}}', 'undefined', 'null', 'NaN', '[object Object]']) {
    expect(html.includes(bad), `${variant.name}: ${bad}`).toBe(false);
    expect(text.includes(bad), `${variant.name}: ${bad}`).toBe(false);
  }
  // Under Gmail's 102 KB clipping limit
  expect(Buffer.byteLength(html)).toBeLessThan(100 * 1024);
  // Content order and pieces
  expect(html).toContain('From Pastor Zac');
  expect(html).toContain('Worth reading this month');
  expect(html).toContain('Faith Promise Church, 10740 Faith Promise Lane, Knoxville, TN 37931');
  expect(html).toContain('You are getting this because you signed up for monthly check-ins in the Growth Plan Builder.');
  expect(subject).toBe(edition.subject);
  if (variant.habits.length && variant.plan) {
    expect(html).toContain('Check in on my plan');
    expect(html).toContain('Adjust my plan');
    expect((html.match(/border-top:1px solid/g) ?? []).length).toBe(Math.min(5, variant.habits.length));
  } else {
    expect(html).toContain('Start my plan');
    expect(html).not.toContain('Check in on my plan');
  }
}

describe('every rendered email', () => {
  for (const edition of [...CHECKIN_EDITIONS, { ...EVERGREEN_EDITION, period: '2028-02-01' }]) {
    for (const variant of VARIANTS) {
      it(`${edition.period} / ${variant.name}`, () => {
        const bundle = { userId: USER, firstName: variant.firstName, email: 'sam@example.com', plan: variant.plan, habits: variant.habits };
        const { rendered, payload } = buildMessage({ env: TEST_ENV, edition, period: edition.period, bundle });
        check(rendered, variant, edition);
        expect(payload.content.map((c) => c.type)).toEqual(['text/plain', 'text/html']);
      });
    }
  }
});

describe('escaping', () => {
  const hostile = '<script>alert(1)</script> "quoted" \'single\' & Co\r\nBcc: evil@example.com';
  const urls = {
    checkin: 'https://a.example/check-in?token=x',
    adjust: 'https://a.example/plan/2026',
    start: 'https://a.example/plan/2026/start',
    unsubscribe: 'https://a.example/email/preferences?token=y',
    preferences: 'https://a.example/email/preferences',
    logo: 'https://a.example/logo.png',
  };

  it('escapes names, habits and content in the email', () => {
    const r = renderCheckinEmail({
      edition: { ...CHECKIN_EDITIONS[1], zac_note: hostile, article_title: hostile, article_url: 'javascript:alert(1)' },
      period: '2027-01-01',
      urls,
      recipient: { firstName: hostile, focus: ['faith'], habits: [{ dimension: 'faith', sentence: hostile }], hasPlan: true },
    });
    expect(r.html).not.toMatch(/<script/i);
    expect(r.html).toContain('&lt;script&gt;');
    expect(r.html).not.toContain('javascript:');
    expect(r.text).not.toContain('\r');
    expect(r.text).not.toMatch(/\nBcc:/);
  });

  it('subject lines cannot be broken into extra headers', () => {
    const r = renderCheckinEmail({ edition: { ...CHECKIN_EDITIONS[1], subject: `Hello\r\nBcc: evil@example.com` }, period: '2027-01-01', urls, recipient: {} });
    expect(r.subject).toBe('Hello Bcc: evil@example.com');
    expect(r.subject).not.toMatch(/[\r\n]/);
  });

  it('a hostile first name cannot change the payload headers or subject', () => {
    const bundle = { userId: USER, firstName: hostile, email: 'sam@example.com', plan: null, habits: [] };
    const { payload } = buildMessage({ env: TEST_ENV, edition: CHECKIN_EDITIONS[0], period: '2026-12-01', bundle });
    expect(payload.subject).toBe(CHECKIN_EDITIONS[0].subject);
    expect(Object.keys(payload.headers)).toEqual(['List-Unsubscribe', 'List-Unsubscribe-Post']);
    expect(payload.personalizations[0].to[0].name).not.toMatch(/[\r\n]/);
  });
});

describe('seeded editions', () => {
  it('has thirteen editions, December twice', () => {
    expect(CHECKIN_EDITIONS.length).toBe(13);
    expect(CHECKIN_EDITIONS[0].zac_note).toBe(CHECKIN_EDITIONS[12].zac_note);
  });
  it('subjects have no leading zeroes, all caps or emoji', () => {
    for (const e of CHECKIN_EDITIONS) {
      expect(e.subject).not.toMatch(/\b0\d/);
      expect(e.subject).not.toMatch(/\b[A-Z]{4,}\b/);
      expect(e.subject).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
  it('Pastor Zac notes are 35 to 60 words', () => {
    for (const e of [...CHECKIN_EDITIONS, EVERGREEN_EDITION]) {
      const words = e.zac_note.trim().split(/\s+/).length;
      expect(words, e.period ?? 'evergreen').toBeGreaterThanOrEqual(35);
      expect(words, e.period ?? 'evergreen').toBeLessThanOrEqual(60);
    }
  });
});
