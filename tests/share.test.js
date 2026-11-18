import { describe, it, expect } from 'vitest';
import { createHandlers } from '../server/handlers.js';
import { createFakeServerDb, createFakeMailer, TEST_ENV } from './helpers/fakeServerDb.js';
import { buildShareText, buildSharedPlan, cleanDimensions, isShareId, shareIsActive, shareableDimensions, shareExpiry, SHARE_DAYS } from '../src/lib/share.js';

const plan = { id: 'p1', year: 2026, focus_dimensions: ['health'] };
const goal = (dimension, text, extra = {}) => ({ id: `${dimension}-${text}`, growth_plan_id: 'p1', dimension, goal_text: text, sort_order: 0, status: 'active', ...extra });
const goals = [
  goal('faith', 'Pray for ten minutes every day.'),
  goal('health', 'Walk for fifteen minutes a few times a week.'),
  goal('health', 'Go to bed at the same time every day.', { sort_order: 1 }),
  goal('finances', 'Meet with a financial coach once a month.', { status: 'paused' }),
  goal('character', '', { is_mandatory: true }),
];

describe('sharing a plan: what is included', () => {
  it('offers only areas with an active habit, focus areas first', () => {
    expect(shareableDimensions(plan, goals)).toEqual(['health', 'faith']);
  });

  it('keeps only the chosen areas and only active habits', () => {
    const shared = buildSharedPlan({ plan, goals, dimensions: ['health', 'finances', 'character'] });
    expect(shared.year).toBe(2026);
    expect(shared.groups).toEqual([
      { dimension: 'health', habits: ['Walk for fifteen minutes a few times a week.', 'Go to bed at the same time every day.'] },
    ]);
  });

  it('ignores anything that is not an area name', () => {
    expect(cleanDimensions(['health', 'nope', 'health', 42, 'faith'])).toEqual(['faith', 'health']);
    expect(cleanDimensions('health')).toEqual([]);
  });

  it('writes a text summary with no scores unless asked', () => {
    const text = buildShareText({ plan, goals, dimensions: ['health', 'faith'] });
    expect(text).toBe(
      [
        'My 2026 growth plan',
        '',
        'Health',
        '- Walk for fifteen minutes a few times a week.',
        '- Go to bed at the same time every day.',
        '',
        'Faith',
        '- Pray for ten minutes every day.',
        '',
        'Made with the Growth Plan Builder at Faith Promise Church.',
      ].join('\n'),
    );
    expect(text).not.toMatch(/\d\.\d/);
  });

  it('adds scores to the text only when they are passed in', () => {
    const text = buildShareText({ plan, goals, dimensions: ['health'], scores: { health: { flourishing: 5.5, habit: 4 } } });
    expect(text).toContain('Health (flourishing 5.5, habits 4.0)');
  });

  it('is empty when nothing is chosen', () => {
    expect(buildShareText({ plan, goals, dimensions: [] })).toBe('');
  });
});

describe('sharing a plan: links', () => {
  const NOW = Date.parse('2026-12-01T12:00:00Z');

  it('a link is active until it expires or is stopped', () => {
    expect(shareIsActive({ expires_at: '2026-12-02T12:00:00Z', revoked_at: null }, NOW)).toBe(true);
    expect(shareIsActive({ expires_at: '2026-12-01T11:59:59Z', revoked_at: null }, NOW)).toBe(false);
    expect(shareIsActive({ expires_at: '2026-12-02T12:00:00Z', revoked_at: '2026-12-01T00:00:00Z' }, NOW)).toBe(false);
    expect(shareIsActive({ expires_at: 'not a date' }, NOW)).toBe(false);
    expect(shareIsActive(null, NOW)).toBe(false);
  });

  it('a new link lasts thirty days', () => {
    expect(SHARE_DAYS).toBe(30);
    expect(shareExpiry(NOW)).toBe('2026-12-31T12:00:00.000Z');
  });

  it('only a full random id is accepted', () => {
    expect(isShareId('60000000-0000-4000-8000-000000000003')).toBe(true);
    expect(isShareId('60000000-0000-4000-8000')).toBe(false);
    expect(isShareId("' or 1=1 --")).toBe(false);
    expect(isShareId(undefined)).toBe(false);
  });
});

describe('the shared plan endpoint', () => {
  const NOW = new Date('2026-12-08T15:00:00Z');
  const ID = '60000000-0000-4000-8000-0000000000aa';

  function setup(shareFields = {}) {
    const db = createFakeServerDb({ clock: () => NOW.getTime() });
    const alice = db.addPerson({ first: 'Alice', habits: 4, email: 'alice@example.com' });
    const p = db.tables.plans.find((x) => x.user_id === alice);
    db.tables.goals.find((g) => g.growth_plan_id === p.id && g.dimension === 'health').status = 'paused';
    db.tables.shares.push({
      id: ID,
      user_id: alice,
      growth_plan_id: p.id,
      dimensions: ['faith', 'health', 'purpose'],
      expires_at: '2026-12-20T00:00:00Z',
      revoked_at: null,
      ...shareFields,
    });
    const h = createHandlers({ env: TEST_ENV, db, mailer: createFakeMailer(), now: () => NOW });
    const get = (id) => h.sharedPlan(new Request(`https://growthplan.example.org/api/share/plan?id=${encodeURIComponent(id)}`));
    return { db, h, get, alice };
  }

  it('returns first name, year and the habits in the chosen areas, and nothing else', async () => {
    const { get } = setup();
    const res = await get(ID);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(['expiresAt', 'firstName', 'groups', 'year']);
    expect(body.firstName).toBe('Alice');
    expect(body.year).toBe(2026);
    // faith is the focus area and comes first; the paused health habit and the unshared
    // finances habit are left out.
    expect(body.groups.map((g) => g.dimension)).toEqual(['faith', 'purpose']);
    expect(JSON.stringify(body)).not.toContain('alice@example.com');
    expect(JSON.stringify(body)).not.toMatch(/user_id|growth_plan_id|practice_key/);
  });

  it('gives the same answer for an unknown, stopped or expired link', async () => {
    const unknown = await setup().get('60000000-0000-4000-8000-0000000000bb');
    const stopped = await setup({ revoked_at: '2026-12-01T00:00:00Z' }).get(ID);
    const expired = await setup({ expires_at: '2026-12-08T14:59:59Z' }).get(ID);
    const malformed = await setup().get('abc');
    for (const res of [unknown, stopped, expired, malformed]) {
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'This link is no longer active.', code: 'gone' });
    }
  });

  it('refuses anything but GET', async () => {
    const { h } = setup();
    const res = await h.sharedPlan(new Request(`https://growthplan.example.org/api/share/plan?id=${ID}`, { method: 'POST' }));
    expect(res.status).toBe(405);
  });
});
