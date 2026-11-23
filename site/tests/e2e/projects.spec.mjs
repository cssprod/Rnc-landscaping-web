// @ts-check
/** /projects/ and the flat case studies (C1; owner: ia in W1, t-projects from W3). */
import { test, expect } from 'playwright/test';
import { offline } from '../helpers/server.mjs';

test.beforeEach(async ({ page }) => { await offline(page); });

test('project filter narrows projects and updates the count', async ({ page }) => {
  await page.goto('/projects/');
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

test('?service= preselects the filter (the target of the retired /portfolio/{service}/ pages)', async ({ page }) => {
  await page.goto('/projects/?service=tree-vegetation');
  await expect(page.locator('[data-filters]').getByRole('radio', { name: 'Tree and vegetation', exact: true })).toBeChecked();
  await expect(page.locator('[data-project-grid] > li:visible')).toHaveCount(4);
});

test('project cards link to flat /projects/{slug}/ case studies, which link back to their service and municipality', async ({ page }) => {
  await page.goto('/projects/');
  const hrefs = await page.locator('[data-project-grid] a.card__link').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBe(16);
  for (const h of hrefs) expect(h).toMatch(/^\/projects\/[a-z0-9-]+\/$/);
  await page.goto(hrefs[0] || '/');
  await expect(page.locator('.spec-bar a[href^="/services/"]')).toHaveCount(1);
  await expect(page.locator('.spec-bar a[href^="/areas/"]')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects/');
  await expect(page.locator('.sample-label').first()).toBeVisible();
});
