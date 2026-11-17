import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const PEOPLE = {
  nora: '865-555-0101', // no assessment
  lee: '865-555-0102', // v1 assessment, legacy plan with blank required goals
  grace: '865-555-0103', // v2 assessment and plan, opted in, check-ins
  adam: '865-555-0104', // admin
};
export const PASSWORD = 'Demo1234';

export async function login(page, who) {
  await page.goto('/login');
  await page.getByLabel('Phone number').fill(PEOPLE[who]);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/home');
}

// Read or change the demo database that the app keeps in localStorage.
export async function demoDb(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('gp-demo-db-v1') || 'null'));
}

export async function setDemoDb(page, mutate) {
  await page.evaluate(`(() => {
    const db = JSON.parse(localStorage.getItem('gp-demo-db-v1'));
    (${mutate.toString()})(db);
    localStorage.setItem('gp-demo-db-v1', JSON.stringify(db));
  })()`);
}

export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > doc.clientWidth + 1 && getComputedStyle(el).position !== 'fixed') {
        if (!el.closest('.table-scroll, .data-table, dialog')) offenders.push(`${el.tagName.toLowerCase()}.${el.className}`);
      }
    }
    return { scroll: doc.scrollWidth - doc.clientWidth, offenders: offenders.slice(0, 5) };
  });
  expect(overflow.scroll, `page scrolls sideways: ${overflow.offenders.join(', ')}`).toBeLessThanOrEqual(1);
  expect(overflow.offenders, 'elements wider than the screen').toEqual([]);
}

export async function expectSmallTapTargetsAbsent(page) {
  const small = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button, a.btn, .scale__box, .freq__box, .chip > span, label.checkbox, .tabbar__link, .topnav__link')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && (r.height < 43.5 || r.width < 43.5) && getComputedStyle(el).visibility !== 'hidden') {
        if (!el.closest('.visually-hidden')) out.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return out;
  });
  expect(small, 'tap targets under 44px').toEqual([]);
}

export async function expectNoSeriousAxeViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  expect(
    serious.map((v) => `${v.id}: ${v.help} (${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')})`),
    'serious or critical axe violations',
  ).toEqual([]);
}

export async function answerStep(page, { flourishing = 7, habit = 'Most of the time', step } = {}) {
  const current = step ?? Number(/take\/(\d)/.exec(page.url())?.[1]);
  if (current) await expect(page.getByText(`${current} of 7`, { exact: true })).toBeVisible();
  const scales = page.locator('fieldset.scale');
  const n = await scales.count();
  for (let i = 0; i < n; i += 1) await scales.nth(i).getByText(String(flourishing), { exact: true }).click();
  const freqs = page.locator('fieldset.freq');
  const m = await freqs.count();
  for (let i = 0; i < m; i += 1) await freqs.nth(i).getByText(habit, { exact: true }).click();
}
