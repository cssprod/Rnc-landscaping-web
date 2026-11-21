// @ts-check
/** /free-quote/ (owner: ia in W1 on the legacy stepper; quote from W2). */
import { test, expect } from 'playwright/test';
import { offline } from '../helpers/server.mjs';

test.beforeEach(async ({ page }) => { await offline(page); });

test('the quote form carries data-quote-form next to data-stepper', async ({ page }) => {
  await page.goto('/free-quote/');
  await expect(page.locator('form[data-quote-form][data-stepper]')).toHaveCount(1);
  await expect(page.locator('h1')).toBeVisible();
});

test('quote form validates each step and writes the email', async ({ page }) => {
  await page.goto('/free-quote/');
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
  await page.goto('/free-quote/');
  await expect(page.locator('fieldset[data-step]')).toHaveCount(4);
  for (const i of [0, 1, 2, 3]) await expect(page.locator(`fieldset[data-step="${i}"]`)).toBeVisible();
  await expect(page.locator('[data-submit-row] button[type=submit]')).toBeVisible();
  await expect(page.locator('form[data-stepper]')).toHaveAttribute('action', /^mailto:/);
  await expect(page.locator('form[data-stepper]')).toHaveAttribute('enctype', 'text/plain');
  await ctx.close();
});
