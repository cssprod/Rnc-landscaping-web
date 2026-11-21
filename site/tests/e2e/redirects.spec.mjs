// @ts-check
/**
 * Retired URLs (CONTRACT §5; A13 #2). Every dist/_redirects row: 301 → the C1 URL → 200, in one hop, with and without
 * the trailing slash. Needs w1/build's serve.mjs (which applies _redirects), so these run at the integrator (@integration).
 */
import { test, expect } from 'playwright/test';
import { redirectRows } from '../helpers/server.mjs';

const rows = redirectRows();

test('dist/_redirects lists the 23 url-map rules', () => {
  expect(rows.length).toBe(23);
});

for (const { from, to } of rows) {
  test(`${from} → ${to} in one hop #strict-redirects @integration`, async ({ request }) => {
    for (const req of [from, from.replace(/\/$/, '')]) {
      const res = await request.get(req, { maxRedirects: 0 });
      expect(res.status(), req).toBe(301);
      const loc = new URL(res.headers().location || '', 'http://x');
      expect(`${loc.pathname}${loc.search}`, req).toBe(to);
      const next = await request.get(to, { maxRedirects: 0 });
      expect(next.status(), to).toBe(200);
    }
  });
}

test('following a retired link lands on the C1 page #strict-redirects @integration', async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  await page.goto('/portfolio/irrigation/');
  await expect(page).toHaveURL(/\/projects\/\?service=irrigation$/);
  await expect(page.locator('[data-filters]').getByRole('radio', { name: 'Irrigation', exact: true })).toBeChecked();
  await page.goto('/quote/');
  await expect(page).toHaveURL(/\/free-quote\/$/);
});
