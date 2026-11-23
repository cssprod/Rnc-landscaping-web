// @ts-check
/** Company pages (owner: ia in W1, t-company from W3). */
import { test, expect } from 'playwright/test';
import { offline } from '../helpers/server.mjs';

test.beforeEach(async ({ page }) => { await offline(page); });

test('/process/ exists with its four-step overview (stub until W3)', async ({ page }) => {
  await page.goto('/process/');
  await expect(page.locator('h1')).toHaveText(/How we work/);
  await expect(page.locator('main ol.steps').first().locator('li')).toHaveCount(4);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Process');
});

test('about, reviews, FAQ and contact render with one h1 and their breadcrumb', async ({ page }) => {
  for (const [path, crumb] of [['/about/', 'About'], ['/reviews/', 'Reviews'], ['/faq/', 'FAQ'], ['/contact/', 'Contact']]) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]')).toHaveText(crumb);
  }
});

test('contact shows the NAP from site.json', async ({ page }) => {
  await page.goto('/contact/');
  const cards = page.locator('.contact-cards');
  for (const t of ['[PHONE]', '[EMAIL]', '[HOURS]', '[ADDRESS]']) await expect(cards).toContainText(t);
});
