// @ts-check
/** Shared primitives (owner: ia in W1, ds-comp from W2). */
import { test, expect } from 'playwright/test';
import { offline } from '../helpers/server.mjs';

test.beforeEach(async ({ page }) => { await offline(page); });

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

test('sample items carry a visible Sample label', async ({ page }) => {
  await page.goto('/reviews/');
  await expect(page.locator('.quote .sample-label').first()).toHaveText('Sample');
});

test('FAQ items are native disclosures', async ({ page }) => {
  await page.goto('/faq/');
  const item = page.locator('details.faq__item').first();
  await expect(item).not.toHaveAttribute('open', '');
  await item.locator('summary').click();
  await expect(item).toHaveAttribute('open', '');
});
