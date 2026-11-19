// Full journeys and rough conditions, in demo mode, at 320, 390, 768 and 1440 wide.
import { test, expect } from '@playwright/test';
import { login, demoDb, setDemoDb, answerStep, expectNoHorizontalOverflow, PEOPLE, PASSWORD } from './helpers.js';

const WIDTHS = [320, 390, 768, 1440];

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('a new person: signup, assessment, focus areas, plan, opt-in, check-in', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('tab', { name: 'Create an account' }).click();
      await page.getByLabel('First name').fill('Taylor');
      await page.getByLabel('Last name').fill('Newcomer');
      await page.getByLabel('Phone number').fill(`865555${String(1000 + width).slice(-4)}`);
      await page.getByLabel('Email').fill(`taylor${width}@example.com`);
      await page.getByLabel('Password').fill('Growing2027');
      await page.getByRole('button', { name: 'Create my account' }).click();
      await page.waitForURL('**/home');
      await expect(page.getByRole('heading', { name: /Taylor/ })).toBeVisible();

      await page.getByRole('link', { name: 'Take the assessment' }).click();
      await page.getByRole('link', { name: 'Start the assessment' }).click();
      for (let step = 1; step <= 7; step += 1) {
        await expect(page.getByText(`${step} of 7`)).toBeVisible();
        const next = page.getByRole('button', { name: step === 7 ? 'See my results' : 'Next' });
        await expect(next).toBeDisabled();
        await answerStep(page, { flourishing: 4 + (step % 4), habit: step % 2 ? 'Once in a while' : 'Most of the time' });
        await expectNoHorizontalOverflow(page);
        await next.click();
      }
      await expect(page.getByRole('heading', { name: 'Your results' })).toBeVisible();
      await expect(page.getByText('Your answers are saved.')).toBeVisible();
      await page.getByRole('button', { name: 'Save and build my plan' }).click();
      await page.waitForURL('**/plan/2026');

      // Build: open a focus area and add the first suggestion from the Helper.
      await page.getByRole('link', { name: /^(Edit|Add a habit in) / }).first().click();
      await page.getByRole('button', { name: 'Add to my plan' }).first().click();
      const editor = page.locator('.habit-editor');
      await expect(editor).toBeVisible();
      await editor.getByLabel('When or where (optional)').fill('After breakfast');
      await editor.getByRole('button', { name: 'Add to my plan' }).click();
      await expect(editor.getByText('Saved')).toBeVisible();
      await editor.getByRole('button', { name: 'Done' }).click();
      await expect(page.locator('.habit__text').first()).toContainText('After breakfast,');

      // Opt in on the plan page.
      await page.goto('/plan/2026');
      await page.getByLabel('Email me a monthly check-in on the first Monday of each month.').check();
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText('You will get a check-in on the first Monday of each month.')).toBeVisible();

      // Check in.
      await page.goto('/check-in');
      await expect(page.locator('fieldset.freq').first()).toBeVisible();
      for (const fs of await page.locator('fieldset.freq').all()) await fs.getByText('About half the time').click();
      await page.getByRole('button', { name: 'Save my check-in' }).click();
      await expect(page.getByRole('heading', { name: 'Thank you for checking in' })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    test('a returning person with a v1 assessment and a legacy plan', async ({ page }) => {
      await login(page, 'lee');
      await page.goto('/assessment/results/20000000-0000-4000-8000-000000000021');
      await expect(page.getByText('it shows flourishing scores only')).toBeVisible();
      await expect(page.getByText('Habits', { exact: true })).toHaveCount(0);
      await page.goto('/plan/2026/faith');
      // The written v1 goal shows; the blank required ones do not.
      await expect(page.locator('.habit__text')).toHaveCount(1);
      await expect(page.locator('.habit__text')).toContainText('Read my Bible every morning before work.');
      // A blank required goal is offered as a suggestion; adding it fills the same row.
      const before = (await demoDb(page)).goals.length;
      const prayer = page.locator('.suggestion', { hasText: 'Prayer' });
      await prayer.getByRole('button', { name: 'Add to my plan' }).click();
      await page.locator('.habit-editor').getByRole('button', { name: 'Add to my plan' }).click();
      await expect(page.locator('.habit-editor').getByText('Saved')).toBeVisible();
      const db = await demoDb(page);
      expect(db.goals.length).toBe(before);
      const row = db.goals.find((g) => g.discipline === 'Prayer' && g.growth_plan_id === '10000000-0000-4000-8000-000000000002');
      expect(row.is_mandatory).toBe(true);
      expect(row.goal_text).toMatch(/^Pray for five minutes/);
      await expectNoHorizontalOverflow(page);
    });

    test('the new-year start flow copies kept habits', async ({ page }) => {
      await login(page, 'grace');
      await page.goto('/plan/2027/start');
      for (let i = 0; i < 4; i += 1) {
        const items = page.locator('.review-item');
        if (i === 0) await items.first().getByText('Let go').click();
        if (i === 1) {
          await items.first().getByText('Adjust').click();
          await items.first().getByLabel('What I will do').fill('Walk with a friend');
        }
        const next = page.getByRole('button', { name: /^Next$|Copy into my 2027 plan/ });
        await next.click();
      }
      await expect(page.getByRole('heading', { name: 'Choose your focus areas' })).toBeVisible();
      await page.getByRole('button', { name: 'Save focus areas' }).click();
      await expect(page.getByRole('heading', { name: 'Your 2027 plan is ready to build' })).toBeVisible();
      const db = await demoDb(page);
      const plan = db.growth_plans.find((p) => p.year === 2027 && p.user_id === '00000000-0000-4000-8000-000000000003');
      expect(plan.copied_from_plan_id).toBe('10000000-0000-4000-8000-000000000003');
      const goals = db.goals.filter((g) => g.growth_plan_id === plan.id);
      expect(goals.length).toBe(5);
      expect(goals.some((g) => g.goal_text.startsWith('Walk with a friend'))).toBe(true);
      await page.getByRole('button', { name: 'Go to my 2027 plan' }).click();
      await expectNoHorizontalOverflow(page);
    });
  });
}

test.describe('rough conditions', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('reload in the middle of the assessment and resume with nothing lost', async ({ page }) => {
    await login(page, 'nora');
    await page.goto('/assessment/take/1');
    await answerStep(page, { flourishing: 6 });
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForURL('**/take/2');
    const scales = page.locator('fieldset.scale');
    await scales.nth(0).getByText('9', { exact: true }).click();
    await page.reload();
    await expect(page.getByText('2 of 7')).toBeVisible();
    await expect(page.locator('fieldset.scale').nth(0).locator('input[value="9"]')).toBeChecked();
    await page.goto('/assessment');
    await expect(page.getByRole('link', { name: 'Keep going' })).toBeVisible();
    await page.goto('/assessment/take/1');
    await expect(page.locator('fieldset.scale').nth(0).locator('input[value="6"]')).toBeChecked();
  });

  test('no answer is preselected and steps cannot be skipped', async ({ page }) => {
    await login(page, 'nora');
    await page.goto('/assessment/take/1');
    await expect(page.locator('input[type=radio]:checked')).toHaveCount(0);
    await page.goto('/assessment/take/5');
    await expect(page).toHaveURL(/take\/1$/);
  });

  test('going offline during a habit autosave shows the retry banner and keeps the text', async ({ page, context }) => {
    await login(page, 'grace');
    await page.goto('/plan/2026/health');
    await page.locator('.habit').first().getByRole('button', { name: 'Edit' }).click();
    await context.setOffline(true);
    const what = page.locator('.habit-editor').getByLabel('What I will do');
    await what.fill('Put my phone in the kitchen before bed');
    await expect(page.getByText('Your change was not saved. Your text is still here.')).toBeVisible();
    await expect(what).toHaveValue('Put my phone in the kitchen before bed');
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('.habit-editor').getByText('Saved')).toBeVisible();
    const db = await demoDb(page);
    expect(db.goals.some((g) => g.goal_text.startsWith('Put my phone in the kitchen before bed'))).toBe(true);
  });

  test('autosave settles: typing during a save does not start a save loop, and the last text wins', async ({ page }) => {
    await login(page, 'grace');
    await page.evaluate(() => localStorage.setItem('gp-demo-latency', '300'));
    await page.goto('/plan/2026/health');
    await page.locator('.habit').first().getByRole('button', { name: 'Edit' }).click();
    const what = page.locator('.habit-editor').getByLabel('What I will do');
    await what.fill('First version');
    await page.waitForTimeout(700); // autosave starts
    await what.fill('Second version');
    await page.waitForTimeout(150);
    await what.fill('Final version');
    await page.waitForTimeout(2500);
    const settled = await page.evaluate(() => window.__demoWrites ?? 0);
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => window.__demoWrites ?? 0)).toBe(settled);
    expect(settled).toBeLessThanOrEqual(4);
    const db = await demoDb(page);
    expect(db.goals.some((g) => g.goal_text.startsWith('Final version'))).toBe(true);
    expect(db.goals.some((g) => g.goal_text.startsWith('Second version'))).toBe(false);
  });

  test('the final assessment save keeps the draft and offers a retry when offline', async ({ page, context }) => {
    await login(page, 'nora');
    await page.goto('/assessment/take/1');
    for (let s = 1; s <= 7; s += 1) {
      await answerStep(page);
      if (s < 7) {
        await page.getByRole('button', { name: 'Next' }).click();
        await page.waitForURL(`**/take/${s + 1}`);
      }
    }
    await context.setOffline(true);
    await page.getByRole('button', { name: 'See my results' }).click();
    await expect(page.getByText('Your answers were not saved.')).toBeVisible();
    await expect(page).toHaveURL(/take\/7$/);
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: 'Your results' })).toBeVisible();
  });

  test('double-tapping submit buttons saves once', async ({ page }) => {
    await login(page, 'nora');
    await page.goto('/assessment/take/1');
    for (let s = 1; s <= 7; s += 1) {
      await answerStep(page);
      if (s < 7) {
        await page.getByRole('button', { name: 'Next' }).click();
        await page.waitForURL(`**/take/${s + 1}`);
      }
    }
    await page.evaluate(() => localStorage.setItem('gp-demo-latency', '400'));
    await page.getByRole('button', { name: 'See my results' }).dblclick();
    await expect(page.getByRole('heading', { name: 'Your results' })).toBeVisible();
    let db = await demoDb(page);
    expect(db.assessments.filter((a) => a.user_id === '00000000-0000-4000-8000-000000000001').length).toBe(1);

    await page.getByRole('button', { name: 'Save and build my plan' }).dblclick();
    await page.waitForURL('**/plan/2026');
    db = await demoDb(page);
    expect(db.growth_plans.filter((p) => p.user_id === '00000000-0000-4000-8000-000000000001').length).toBe(1);

    await page.goto('/plan/2026/faith');
    await page.getByRole('button', { name: 'Add to my plan' }).first().click();
    await page.locator('.habit-editor').getByRole('button', { name: 'Add to my plan' }).dblclick();
    await expect(page.locator('.habit-editor').getByText('Saved')).toBeVisible();
    db = await demoDb(page);
    expect(db.goals.filter((g) => g.dimension === 'faith' && g.growth_plan_id === db.growth_plans.find((p) => p.user_id === '00000000-0000-4000-8000-000000000001').id).length).toBe(1);
  });

  test('the browser Back button works at every step', async ({ page }) => {
    await login(page, 'nora');
    await page.goto('/assessment');
    await page.getByRole('link', { name: 'Start the assessment' }).click();
    for (let s = 1; s <= 3; s += 1) {
      await answerStep(page);
      await page.getByRole('button', { name: 'Next' }).click();
      await page.waitForURL(`**/take/${s + 1}`);
    }
    await expect(page.getByText('4 of 7')).toBeVisible();
    for (const n of [3, 2, 1]) {
      await page.goBack();
      await expect(page.getByText(`${n} of 7`)).toBeVisible();
    }
    await page.goBack();
    await expect(page).toHaveURL(/\/assessment$/);
    await page.goto('/plan/2026/health');
    await page.goto('/plan/2026/faith');
    await page.goBack();
    await expect(page).toHaveURL(/\/plan\/2026\/health$/);
  });

  test('the assessment can be completed with the keyboard alone', async ({ page }) => {
    await login(page, 'nora');
    await page.goto('/assessment/take/1');
    for (let s = 1; s <= 7; s += 1) {
      await expect(page.getByText(`${s} of 7`)).toBeVisible();
      // The page moves focus to the top after each step loads. Wait for that, so it cannot
      // land in the middle of the key presses below.
      await expect(page.locator('#main')).toBeFocused();
      const groups = await page.locator('fieldset.scale, fieldset.freq').count();
      for (let g = 0; g < groups; g += 1) {
        const first = page.locator('fieldset.scale, fieldset.freq').nth(g).locator('input').first();
        await first.focus();
        await page.keyboard.press('Space');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
      }
      const btn = page.getByRole('button', { name: s === 7 ? 'See my results' : 'Next' });
      await btn.focus();
      await page.keyboard.press('Enter');
    }
    await expect(page.getByRole('heading', { name: 'Your results' })).toBeVisible();
    const db = await demoDb(page);
    const row = db.assessments.find((a) => a.user_id === '00000000-0000-4000-8000-000000000001');
    expect(row.faith_q1).toBe(3);
    expect(row.habit_responses.faith_scripture).toBe(2);
  });

  test('a 60-character name, a 500-character habit and 40 habits do not overflow, and print breaks into pages', async ({ page }) => {
    await login(page, 'grace');
    await setDemoDb(page, (db) => {
      const p = db.user_profiles.find((x) => x.first_name === 'Grace');
      p.first_name = 'Gracelynn-Annabelle-Marguerite-Josephine-Christabel-Evange';
      p.last_name = 'Growing';
      const plan = '10000000-0000-4000-8000-000000000003';
      const dims = ['faith', 'relationships', 'finances', 'health', 'purpose', 'character', 'contentment'];
      for (let i = 0; i < 34; i += 1) {
        db.goals.push({
          id: `30000000-0000-4000-8000-0000000009${String(i).padStart(2, '0')}`,
          growth_plan_id: plan,
          dimension: dims[i % 7],
          goal_name: '',
          goal_text: i === 0 ? `${'Spend unhurried time with God, reading slowly and writing what I notice, '.repeat(7)}every day.`.slice(0, 500) : `Extra habit number ${i + 1} with a reasonable amount of text to read every week.`,
          is_mandatory: false,
          sort_order: 10 + i,
          status: 'active',
        });
      }
    });
    await page.reload();
    for (const path of ['/home', '/plan/2026', '/plan/2026/faith', '/check-in']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalOverflow(page);
    }
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/plan/2026/faith');
    await expectNoHorizontalOverflow(page);
    await page.goto('/plan/2026/print');
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page);
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ format: 'Letter', printBackground: true, path: 'test-results/long-plan.pdf' });
    // US Letter with half-inch margins leaves 10 inches (960 CSS px) of content per page.
    const height = await page.evaluate(() => document.querySelector('.print-sheet').scrollHeight);
    expect(height).toBeGreaterThan(960);
    // Sections are kept whole where they fit, and each habit is never split.
    const rules = await page.evaluate(() =>
      [...document.styleSheets]
        .flatMap((s) => {
          try {
            return [...s.cssRules];
          } catch {
            return [];
          }
        })
        .map((r) => r.cssText)
        .join(' '),
    );
    expect(rules).toMatch(/break-inside: avoid/);
  });

  test('loading states show in place of blank screens on a slow network', async ({ page }) => {
    await login(page, 'grace');
    await page.evaluate(() => localStorage.setItem('gp-demo-latency', '2500'));
    await page.goto('/plan/2026');
    await expect(page.locator('.loading-block')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your 2026 growth plan' })).toBeVisible({ timeout: 15000 });
    await page.goto('/home');
    await expect(page.locator('.loading-block')).toBeVisible();
  });

  test('the check-in link works signed out, and suggestions ask for sign-in before changing anything', async ({ page }) => {
    await page.goto('/check-in?token=demo:00000000-0000-4000-8000-000000000003:2026-12-01');
    await expect(page).toHaveURL(/\/check-in$/);
    await expect(page.getByRole('heading', { name: 'December 2026 check-in' })).toBeVisible();
    await expect(page.locator('fieldset.freq').first()).toBeVisible();
    for (const fs of await page.locator('fieldset.freq').all()) await fs.getByText('Not right now').click();
    await page.getByRole('button', { name: 'Save my check-in' }).click();
    await expect(page.getByRole('heading', { name: 'Thank you for checking in' })).toBeVisible();
    const smaller = page.getByRole('button', { name: 'Make it smaller' }).first();
    await expect(smaller).toBeVisible();
    await smaller.click();
    await page.waitForURL('**/login');
    await page.getByLabel('Phone number').fill(PEOPLE.grace);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.locator('form').getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/check-in');
    await expect(page.getByRole('heading', { name: 'Thank you for checking in' })).toBeVisible();
  });

  test('opening an unsubscribe link changes nothing until the button is pressed', async ({ page }) => {
    await page.goto('/email/preferences?token=demo:00000000-0000-4000-8000-000000000003:2026-12-01');
    let db = await demoDb(page);
    expect(db.email_preferences.find((p) => p.user_id === '00000000-0000-4000-8000-000000000003').monthly_checkin).toBe(true);
    await page.getByRole('button', { name: 'Stop monthly check-ins' }).click();
    await expect(page.getByText('You will not get any more monthly check-ins.')).toBeVisible();
    db = await demoDb(page);
    expect(db.email_preferences.find((p) => p.user_id === '00000000-0000-4000-8000-000000000003').monthly_checkin).toBe(false);
  });

  test('a non-admin cannot use the admin pages', async ({ page }) => {
    await login(page, 'grace');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'This page is for admins' })).toBeVisible();
    await page.goto('/admin/check-ins');
    await expect(page.getByRole('heading', { name: 'This page is for admins' })).toBeVisible();
  });

  test('signed-out visitors are sent to log in and returned afterwards', async ({ page }) => {
    await page.goto('/plan/2026/health');
    await page.waitForURL('**/login');
    await page.getByLabel('Phone number').fill(PEOPLE.grace);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.locator('form').getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/plan/2026/health');
  });

  test('a wrong password and an unknown phone show the same message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Phone number').fill(PEOPLE.grace);
    await page.getByLabel('Password').fill('wrong');
    await page.locator('form').getByRole('button', { name: 'Log in' }).click();
    const a = await page.locator('.banner--error').textContent();
    await page.getByLabel('Phone number').fill('865-555-9999');
    await page.locator('form').getByRole('button', { name: 'Log in' }).click();
    await expect(page.locator('.banner--error')).toHaveText(a);
  });
});

test.describe('plan history and sharing', () => {
  test('a plan from an earlier year opens as a record and can be reopened', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2027-03-01T15:00:00Z'));
    await login(page, 'grace');

    // The current year has no plan yet, and the earlier year is one tap away.
    await page.goto('/plan/2027');
    await page.getByRole('navigation', { name: 'Plans by year' }).getByRole('link', { name: '2026' }).click();
    await expect(page.getByText('This is your 2026 plan. It is kept as a record.')).toBeVisible();
    await expect(page.getByRole('link', { name: /^(Edit|Add a habit in) / })).toHaveCount(0);

    await page.getByRole('link', { name: 'View Health' }).click();
    await expect(page.getByText('This plan is from 2026. It is kept as a record.')).toBeVisible();
    await expect(page.locator('.habit__text').first()).toBeVisible();
    await expect(page.locator('.habit').getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Helper' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Make changes' }).click();
    await expect(page.getByText('You are changing your 2026 plan.')).toBeVisible();
    await expect(page.locator('.habit').first().getByRole('button', { name: 'Edit' })).toBeVisible();

    await page.goto('/plans');
    await expect(page.getByRole('heading', { name: 'Plan history' })).toBeVisible();
    await expect(page.getByRole('link', { name: /2026 plan/ })).toBeVisible();
  });

  test('sharing: choose areas, make a private link, read it signed out, then stop it', async ({ page }) => {
    await login(page, 'grace');
    await page.goto('/plan/2026');
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const preview = dialog.locator('pre');
    await expect(preview).toContainText('My 2026 growth plan');
    await expect(preview).toContainText('Word of the year: Steady');
    await expect(preview).toContainText('Verse of the year: Galatians 6:9');
    await expect(preview).toContainText('Spend ten minutes in prayer');
    await expect(preview).not.toContainText('flourishing');

    // Leave Faith out. The preview follows.
    await dialog.getByText('Faith', { exact: true }).click();
    await expect(preview).not.toContainText('Spend ten minutes in prayer');

    const before = (await demoDb(page)).plan_shares.length;
    await dialog.getByRole('button', { name: 'Create a link' }).click();
    await expect.poll(async () => (await demoDb(page)).plan_shares.length).toBe(before + 1);
    const share = (await demoDb(page)).plan_shares.at(-1);
    expect(share.dimensions).not.toContain('faith');

    // Signed out, the link shows the chosen habits and nothing about scores.
    await page.evaluate(() => localStorage.removeItem('gp-demo-session-v1'));
    await page.goto(`/shared/${share.id}`);
    await expect(page.getByRole('heading', { name: "Grace's 2026 growth plan" })).toBeVisible();
    await expect(page.getByText('Steady', { exact: true })).toBeVisible();
    await expect(page.getByText('Galatians 6:9', { exact: true })).toBeVisible();
    await expect(page.getByText('Put my phone away thirty minutes before bed on weekdays.')).toBeVisible();
    await expect(page.getByText('Spend ten minutes in prayer')).toHaveCount(0);
    await expect(page.getByText(/Flourishing|Habits \d/)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    // Stopped, it no longer works.
    await login(page, 'grace');
    await page.goto('/plan/2026');
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    const row = page.getByRole('dialog').locator('.share__list li').first();
    await row.getByRole('button', { name: 'Stop sharing' }).click();
    await expect.poll(async () => (await demoDb(page)).plan_shares.find((s) => s.id === share.id)?.revoked_at ?? null).not.toBeNull();
    await page.evaluate(() => localStorage.removeItem('gp-demo-session-v1'));
    await page.goto(`/shared/${share.id}`);
    await expect(page.getByRole('heading', { name: 'This link is no longer active' })).toBeVisible();
  });

  test('a word and verse of the year can be added, changed and left out of a share', async ({ page }) => {
    await login(page, 'lee');
    await page.goto('/plan/2026');
    await page.getByRole('button', { name: 'Add a word and verse of the year' }).click();
    await page.getByLabel('Word of the year').fill('Rooted');
    await page.getByLabel('Verse of the year').fill('Colossians 2:6-7');
    await page.getByRole('button', { name: 'Save', exact: true }).first().click();
    await expect(page.locator('.word-verse__word')).toHaveText('Rooted');
    await expect(page.locator('.word-verse__verse')).toHaveText('Colossians 2:6-7');
    const plan = (await demoDb(page)).growth_plans.find((p) => p.user_id === '00000000-0000-4000-8000-000000000002');
    expect(plan).toMatchObject({ word_of_year: 'Rooted', verse_of_year: 'Colossians 2:6-7' });
    await expectNoHorizontalOverflow(page);

    // It prints with the plan.
    await page.goto('/plan/2026/print');
    await expect(page.getByText('Word of the year:')).toBeVisible();
    await expect(page.getByText('Colossians 2:6-7')).toBeVisible();

    // It is shared by default, and one tick leaves it out.
    await page.goto('/plan/2026');
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    const preview = page.getByRole('dialog').locator('pre');
    await expect(preview).toContainText('Word of the year: Rooted');
    await page.getByRole('dialog').getByText('Include my word and verse of the year').click();
    await expect(preview).not.toContainText('Rooted');
    await expect(preview).not.toContainText('Colossians');
  });

  test('a reset link from email is not spent by opening it, only by saving a new password', async ({ page, context }) => {
    const GRACE = '00000000-0000-4000-8000-000000000003';
    const link = `/reset-password?token_hash=demo-reset-${GRACE}&type=recovery`;
    const save = page.getByRole('button', { name: 'Save my new password' });

    // A mail scanner opens the link first, then the person opens it. Neither visit uses it up.
    await page.goto(link);
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await page.reload();
    await expect(save).toBeEnabled();
    expect((await demoDb(page)).used_reset_links ?? []).toEqual([]);

    // A dropped connection does not spend it either.
    await page.getByLabel('New password').fill('Steady2027');
    await page.getByLabel('Type it again').fill('Steady2027');
    await context.setOffline(true);
    await save.click();
    await expect(page.getByText('We could not reach the server.')).toBeVisible();
    await context.setOffline(false);

    // Saving spends the link, changes the password and takes the link out of the address.
    await save.click();
    await expect(page.getByText('Your password is changed.')).toBeVisible();
    expect(page.url()).not.toContain('token_hash');
    const db = await demoDb(page);
    expect(db.auth_users.find((u) => u.id === GRACE).password).toBe('Steady2027');
    expect(db.used_reset_links).toHaveLength(1);
    await page.getByRole('button', { name: 'Go to my plan' }).click();
    await page.waitForURL('**/home');
    await expect(page.getByRole('heading', { name: /Grace/ })).toBeVisible();

    // The same link does not work a second time, and the password stays as it was set.
    await page.goto(link);
    await page.getByLabel('New password').fill('Another2028');
    await page.getByLabel('Type it again').fill('Another2028');
    await save.click();
    await expect(page.getByText('This reset link has expired or was already used.')).toBeVisible();
    expect((await demoDb(page)).auth_users.find((u) => u.id === GRACE).password).toBe('Steady2027');
    await expectNoHorizontalOverflow(page);
  });

  test('a broken reset link and a visit with no link both ask for a new one', async ({ page }) => {
    await page.goto('/reset-password?token_hash=nope&type=recovery');
    await expect(page.getByText('This reset link has expired or was already used.')).toBeVisible();
    await page.goto('/reset-password');
    await expect(page.getByText('This reset link has expired or was already used.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to log in' })).toBeVisible();
  });
});
