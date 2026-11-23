// @ts-check
/**
 * Retired URLs (CONTRACT §5; A13 #2, #35). Every dist/_redirects row: 301 → the C1 URL → 200, in one hop, with and without
 * the trailing slash; the page it lands on carries one self-referencing canonical, and no retired URL is in the sitemap.
 * serve.mjs applies _redirects the way Netlify does (wave-1-int), so these run on every branch.
 */
import { test, expect } from 'playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, redirectRows } from '../helpers/server.mjs';

const rows = redirectRows();

test('dist/_redirects lists the 23 url-map rules', () => {
  expect(rows.length).toBe(23);
});

for (const { from, to } of rows) {
  test(`${from} → ${to} in one hop #strict-redirects`, async ({ request }) => {
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

test('each redirect lands on a page with one self canonical; retired URLs are not in the sitemap #canonical-unique', async ({ request }) => {
  const sitemap = existsSync(join(DIST, 'sitemap.xml')) ? readFileSync(join(DIST, 'sitemap.xml'), 'utf8') : '';
  for (const { from, to } of rows) {
    expect(sitemap, from).not.toContain(`${from}</loc>`);
    const html = await (await request.get(to)).text();
    const canon = [...html.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map((m) => m[1]);
    expect(canon.length, to).toBe(1);
    expect(new URL(canon[0], 'http://x').pathname, to).toBe(to.split('?')[0]);
  }
});

test('following a retired link lands on the C1 page #strict-redirects', async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  await page.goto('/portfolio/irrigation/');
  await expect(page).toHaveURL(/\/projects\/\?service=irrigation$/);
  await expect(page.locator('[data-filters]').getByRole('radio', { name: 'Irrigation', exact: true })).toBeChecked();
  await page.goto('/quote/');
  await expect(page).toHaveURL(/\/free-quote\/$/);
});
