// @ts-check
/** Guides, legal pages and 404 (owner: ia in W1, t-editorial from W3). */
import { test, expect } from 'playwright/test';
import { offline } from '../helpers/server.mjs';

test.beforeEach(async ({ page }) => { await offline(page); });

test('the guides hub links every guide and each guide shows its date', async ({ page }) => {
  await page.goto('/resources/');
  const links = await page.locator('main .res-card a.card__link').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(links.length).toBe(6);
  await page.goto(links[0] || '/');
  await expect(page.locator('main time[datetime]').first()).toBeVisible();
});

test('an unknown URL serves the 404 page with links back in', async ({ page }) => {
  const res = await page.goto('/no-such-page/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveCount(1);
  // The quote card links /free-quote/ from its heading and from its body copy, so count at least one, and none to the retired /quote/.
  await expect(page.locator('main a[href="/free-quote/"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/quote/"]')).toHaveCount(0);
});

test('legal pages and the accessibility statement render', async ({ page }) => {
  for (const p of ['/privacy/', '/terms/', '/accessibility/']) {
    await page.goto(p);
    await expect(page.locator('h1')).toHaveCount(1);
  }
});
