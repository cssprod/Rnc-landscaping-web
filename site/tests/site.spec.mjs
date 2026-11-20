// @ts-check
import { test, expect } from 'playwright/test';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const allPages = readdirSync(DIST, { recursive: true }).map(String)
  .filter((f) => f.endsWith('index.html') && !f.startsWith('admin') && statSync(join(DIST, f)).isFile())
  .map((f) => '/' + f.replace(/index\.html$/, ''));

test.describe('every page', () => {
  test('loads without console errors', async ({ page }) => {
    test.setTimeout(120000);
    // External requests (fonts, CDN photos) are blocked so the test runs offline.
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    /** @type {string[]} */ const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
    for (const p of allPages) {
      const res = await page.goto(p);
      expect(res?.status(), p).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });
});

test('main navigation reaches key sections', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  for (const [name, path] of [['Portfolio', '/portfolio/'], ['Areas', '/areas/'], ['Commercial', '/commercial/']]) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
  await page.getByRole('link', { name: 'Skip to content' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('services mega-menu works by keyboard', async ({ page }) => {
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

test('mobile menu opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Menu' });
  const nav = page.locator('#site-nav');
  await expect(nav).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByRole('link', { name: 'Get a Free Quote' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('portfolio filter narrows projects and updates the count', async ({ page }) => {
  await page.goto('/portfolio/');
  const cards = page.locator('[data-project-grid] > li');
  const total = await cards.count();
  expect(total).toBeGreaterThanOrEqual(16);
  await page.locator('#f-service').selectOption('irrigation');
  await expect(page.locator('[data-project-grid] > li:visible')).toHaveCount(4);
  await expect(page.locator('[data-filters-count]')).toHaveText('4 projects shown');
  expect(page.url()).toContain('service=irrigation');
  await page.locator('#f-service').selectOption('');
  await expect(page.locator('[data-project-grid] > li:visible')).toHaveCount(total);
});

test('before/after slider is keyboard operable', async ({ page }) => {
  await page.goto('/services/irrigation/');
  const range = page.getByRole('slider', { name: 'Compare before and after' });
  await range.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(range).toHaveValue('52');
  await expect(page.locator('[data-ba]').first()).toHaveAttribute('style', /--pos:\s*52%/);
  await page.keyboard.press('Home');
  await expect(range).toHaveValue('0');
});

test('quote form validates each step and submits', async ({ page }) => {
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
  // step 2: area required, "other" reveals community field
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
  // step 3: short details and a wrong file type
  await expect(page.getByText('Step 3 of 4', { exact: true })).toBeVisible();
  await page.locator('#q-details').fill('Short');
  await next(2).click();
  await expect(page.locator('[data-error-for="details"]')).toBeVisible();
  await page.locator('#q-photo1').setInputFiles({ name: 'notes.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') });
  await page.locator('#q-details').fill('Spring start-up for a 40-unit strata, about 12 zones, one valve leaking.');
  await next(2).click();
  await expect(page.locator('[data-error-for="photos"]')).toContainText('not a JPG');
  await page.locator('#q-photo1').setInputFiles({ name: 'yard.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(1024) });
  await next(2).click();
  // step 4
  await expect(page.getByText('Step 4 of 4', { exact: true })).toBeVisible();
  await page.locator('[data-submit-row] button[type=submit]').click();
  await expect(page.locator('[data-error-for="name"]')).toBeVisible();
  await page.locator('#q-name').fill('Alex Example');
  await page.locator('#q-email').fill('alex@example.ca');
  await page.locator('input[name=contactPreference]').nth(1).check();
  await page.locator('#q-consent').check();
  await page.locator('[data-submit-row] button[type=submit]').click();
  await expect(page.locator('[data-error-for="phone"]')).toBeVisible(); // phone chosen but empty
  await page.locator('#q-phone').fill('250 555 0123');
  await page.locator('[data-submit-row] button[type=submit]').click();
  await expect(page).toHaveURL(/\/quote\/thanks\/$/); // local server stubs the Netlify POST
});

test('quote form works without JavaScript as one long form', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/quote/');
  await expect(page.locator('fieldset[data-step]')).toHaveCount(4);
  for (const i of [0, 1, 2, 3]) await expect(page.locator(`fieldset[data-step="${i}"]`)).toBeVisible();
  await expect(page.locator('[data-submit-row] button[type=submit]')).toBeVisible();
  await ctx.close();
});
