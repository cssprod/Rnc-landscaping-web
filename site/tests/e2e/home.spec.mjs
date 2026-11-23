// @ts-check
/** Home (owner: ia in W1, t-home from W3). */
import { test, expect } from 'playwright/test';
import { offline } from '../helpers/server.mjs';

test.beforeEach(async ({ page }) => { await offline(page); });

test('home links the C1 hubs and the quote, and shows the portfolio link once', async ({ page }) => {
  await page.goto('/');
  const main = page.locator('main');
  await expect(main.locator('a[href="/projects/"]').first()).toBeVisible();
  await expect(main.locator('a[href="/free-quote/"]').first()).toBeVisible();
  await expect(main.getByText('Browse the portfolio')).toHaveCount(0);
  await expect(main.getByRole('link', { name: 'Full portfolio' })).toHaveAttribute('href', '/projects/');
});
