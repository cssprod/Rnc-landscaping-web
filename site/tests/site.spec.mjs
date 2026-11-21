// @ts-check
import { test, expect } from 'playwright/test';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const allPages = readdirSync(DIST, { recursive: true }).map(String)
  .filter((f) => f.endsWith('index.html') && statSync(join(DIST, f)).isFile())
  .map((f) => '/' + f.replace(/index\.html$/, ''));

test.describe('every page', () => {
  for (const scheme of /** @type {const} */ (['light', 'dark'])) {
    test(`loads without console errors (${scheme})`, async ({ browser }) => {
      test.setTimeout(180000);
      const ctx = await browser.newContext({ colorScheme: scheme });
      const page = await ctx.newPage();
      // External requests (CDN photos) are blocked so the test runs offline.
      await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
      /** @type {string[]} */ const errors = [];
      page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`); });
      page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
      for (const p of allPages) {
        const res = await page.goto(p);
        expect(res?.status(), p).toBe(200);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('main')).toBeVisible();
      }
      expect(errors).toEqual([]);
      await ctx.close();
    });
  }
});

test('main navigation reaches key sections', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  for (const [name, path] of [['Portfolio', '/portfolio/'], ['Areas', '/areas/'], ['Commercial', '/commercial/']]) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  await page.getByRole('link', { name: 'Skip to content' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('navigation capsule turns to dark glass over the hero and back to light below it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const header = page.locator('[data-header]');
  await expect(header).toHaveClass(/is-over-media/);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight / 2));
  await expect(header).not.toHaveClass(/is-over-media/);
  await expect(header).toHaveClass(/is-scrolled/);
});

test('services panel works by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const btn = page.getByRole('button', { name: 'Show service pages' });
  const panel = page.locator('#mega-services');
  await expect(panel).toBeHidden();
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(panel.locator('a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(btn).toBeFocused();
});

test('mobile menu sheet opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('[data-nav-toggle]');
  const nav = page.locator('#site-nav');
  await expect(nav).toBeHidden();
  await expect(toggle).toHaveAccessibleName('Menu');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAccessibleName('Close menu');
  await expect(nav.getByRole('link', { name: 'Get a free quote' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('portfolio filter narrows projects and updates the count', async ({ page }) => {
  await page.goto('/portfolio/');
  const cards = page.locator('[data-project-grid] > li');
  const total = await cards.count();
  expect(total).toBeGreaterThanOrEqual(16);
  await page.locator('[data-filters]').getByRole('radio', { name: 'Irrigation', exact: true }).check();
  await expect(page.locator('[data-project-grid] > li:visible')).toHaveCount(4);
  await expect(page.locator('[data-filters-count]')).toHaveText('4 projects shown');
  expect(page.url()).toContain('service=irrigation');
  await page.locator('#f-area').selectOption('langford');
  await expect(page.locator('[data-project-grid] > li:visible')).toHaveCount(1);
  await page.locator('[data-filters]').getByRole('radio', { name: 'All work', exact: true }).check();
  await page.locator('#f-area').selectOption('');
  await expect(page.locator('[data-project-grid] > li:visible')).toHaveCount(total);
});

test('before/after slider is keyboard operable', async ({ page }) => {
  await page.goto('/services/grounds-maintenance/');
  const ba = page.locator('[data-ba]');
  test.skip(await ba.count() === 0, 'before/after only renders when both photos exist (not in --offline-images builds)');
  const range = page.getByRole('slider', { name: 'Compare before and after' });
  await range.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(range).toHaveValue('52');
  await expect(ba.first()).toHaveAttribute('style', /--pos:\s*52%/);
  await page.keyboard.press('Home');
  await expect(range).toHaveValue('0');
});

test('quote form validates each step and writes the email', async ({ page }) => {
  await page.goto('/quote/');
  await expect(page.getByText('Step 1 of 4', { exact: true })).toBeVisible();
  const next = (/** @type {number} */ i) => page.locator(`fieldset[data-step="${i}"]`).locator('[data-next]');
  // step 1: nothing chosen
  await next(0).click();
  await expect(page.locator('[data-error-for="services"]')).toBeVisible();
  await expect(page.locator('[data-error-for="propertyType"]')).toBeVisible();
  await page.locator('input[name=services]').nth(2).check();
  await page.locator('input[name=propertyType]').nth(2).check();
  await next(0).click();
  // step 2: area required, "other" reveals the community field
  await expect(page.getByText('Step 2 of 4', { exact: true })).toBeVisible();
  await next(1).click();
  await expect(page.locator('[data-error-for="area"]')).toBeVisible();
  await expect(page.locator('#q-area')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#q-area').selectOption('other');
  await expect(page.locator('#q-areaOther')).toBeVisible();
  await next(1).click();
  await expect(page.locator('[data-error-for="areaOther"]')).toBeVisible();
  await page.locator('#q-area').selectOption('langford');
  await expect(page.locator('#q-areaOther')).toBeHidden();
  await page.locator('input[name=timing]').first().check();
  await next(1).click();
  // step 3: details too short
  await expect(page.getByText('Step 3 of 4', { exact: true })).toBeVisible();
  await page.locator('#q-details').fill('Short');
  await next(2).click();
  await expect(page.locator('[data-error-for="details"]')).toBeVisible();
  await page.locator('#q-details').fill('Spring start-up for a 40-unit strata, about 12 zones, one valve leaking.');
  await next(2).click();
  // step 4: name required; choosing phone makes the phone number required
  await expect(page.getByText('Step 4 of 4', { exact: true })).toBeVisible();
  await page.locator('[data-submit-row] button[type=submit]').click();
  await expect(page.locator('[data-error-for="name"]')).toBeVisible();
  await page.locator('#q-name').fill('Alex Example');
  await page.locator('input[name=contactPreference]').nth(1).check();
  await page.locator('[data-submit-row] button[type=submit]').click();
  await expect(page.locator('[data-error-for="phone"]')).toBeVisible();
  await page.locator('#q-phone').fill('250 555 0123');
  await page.locator('[data-submit-row] button[type=submit]').click();
  // the email is composed locally; nothing is posted anywhere
  const ready = page.locator('[data-quote-ready]');
  await expect(ready).toBeVisible();
  const summary = await page.locator('[data-quote-summary]').inputValue();
  expect(summary).toContain('Subject: Free quote request: Irrigation in Langford');
  expect(summary).toContain('Property: Strata or townhouse complex');
  expect(summary).toContain('Phone: 250 555 0123');
  await expect(page.locator('[data-mailto]')).toHaveAttribute('href', /^mailto:.*subject=Free%20quote%20request/);
  await page.locator('[data-restart]').click();
  await expect(page.getByText('Step 1 of 4', { exact: true })).toBeVisible();
});

test('quote form works without JavaScript as one long mailto form', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/quote/');
  await expect(page.locator('fieldset[data-step]')).toHaveCount(4);
  for (const i of [0, 1, 2, 3]) await expect(page.locator(`fieldset[data-step="${i}"]`)).toBeVisible();
  await expect(page.locator('[data-submit-row] button[type=submit]')).toBeVisible();
  await expect(page.locator('form[data-stepper]')).toHaveAttribute('action', /^mailto:/);
  await expect(page.locator('form[data-stepper]')).toHaveAttribute('enctype', 'text/plain');
  await ctx.close();
});

test('site has no backend or sign-in surfaces', async ({ request }) => {
  for (const p of ['/admin/', '/quote/thanks/']) expect((await request.get(p)).status(), p).toBe(404);
  const html = await (await request.get('/quote/')).text();
  expect(html).not.toContain('data-netlify');
  expect(html).not.toContain('netlify-identity');
});
