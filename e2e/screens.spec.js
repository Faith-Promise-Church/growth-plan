// Captures every route at 390x844 and 1440x900 into docs/screens/, and checks each for sideways
// overflow, small tap targets and serious accessibility problems.
import { test } from '@playwright/test';
import { login, expectNoHorizontalOverflow, expectNoSeriousAxeViolations, expectSmallTapTargetsAbsent } from './helpers.js';

const GRACE_V2 = '20000000-0000-4000-8000-000000000032';
const LEE_V1 = '20000000-0000-4000-8000-000000000021';
const GRACE_ID = '00000000-0000-4000-8000-000000000003';

const SCREENS = [
  { name: 'login', who: null, path: '/login' },
  { name: 'reset-password', who: null, path: '/reset-password' },
  { name: 'check-in-from-email', who: null, path: `/check-in?token=demo:${GRACE_ID}:2026-12-01` },
  { name: 'email-unsubscribe', who: null, path: `/email/preferences?token=demo:${GRACE_ID}:2026-12-01` },
  { name: 'home-new', who: 'nora', path: '/home' },
  { name: 'home-legacy', who: 'lee', path: '/home' },
  { name: 'home', who: 'grace', path: '/home' },
  { name: 'assessment-intro', who: 'nora', path: '/assessment' },
  { name: 'assessment-step-1', who: 'nora', path: '/assessment/take/1' },
  { name: 'results-v2', who: 'grace', path: `/assessment/results/${GRACE_V2}` },
  { name: 'results-v1', who: 'lee', path: `/assessment/results/${LEE_V1}` },
  { name: 'assessment-history', who: 'grace', path: '/assessment/history' },
  { name: 'plan', who: 'grace', path: '/plan/2026' },
  { name: 'plan-legacy', who: 'lee', path: '/plan/2026' },
  { name: 'plan-empty', who: 'nora', path: '/plan/2026' },
  { name: 'plan-dimension', who: 'grace', path: '/plan/2026/health' },
  { name: 'plan-dimension-legacy', who: 'lee', path: '/plan/2026/faith' },
  { name: 'plan-dimension-general', who: 'nora', path: '/plan/2026/finances' },
  { name: 'plan-start-next-year', who: 'grace', path: '/plan/2027/start' },
  { name: 'plan-print', who: 'grace', path: '/plan/2026/print' },
  { name: 'check-in', who: 'grace', path: '/check-in' },
  { name: 'email-preferences', who: 'grace', path: '/email/preferences' },
  { name: 'admin', who: 'adam', path: '/admin' },
  { name: 'admin-check-ins', who: 'adam', path: '/admin/check-ins' },
  { name: 'not-found', who: 'grace', path: '/nope' },
];

const SIZES = [
  { w: 390, h: 844 },
  { w: 1440, h: 900 },
];

for (const s of SCREENS) {
  for (const size of SIZES) {
    test(`${s.name} at ${size.w}`, async ({ page }) => {
      await page.setViewportSize({ width: size.w, height: size.h });
      if (s.who) await login(page, s.who);
      await page.goto(s.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `docs/screens/${s.name}-${size.w}.png`, fullPage: true });
      await expectNoHorizontalOverflow(page);
      await expectSmallTapTargetsAbsent(page);
      if (size.w === 390) await expectNoSeriousAxeViolations(page);
    });
  }
}
