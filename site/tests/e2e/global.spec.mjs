// @ts-check
/** Site-wide checks (owner: ia in W1; qa from W2). */
import { test, expect } from 'playwright/test';
import { allPages, offline, collectErrors } from '../helpers/server.mjs';

const pages = allPages();

test.describe('every page', () => {
  for (const scheme of /** @type {const} */ (['light', 'dark'])) {
    test(`loads without console errors (${scheme})`, async ({ browser }) => {
      test.setTimeout(180000);
      expect(pages.length).toBeGreaterThanOrEqual(55);
      const ctx = await browser.newContext({ colorScheme: scheme });
      const page = await ctx.newPage();
      await offline(page);
      const errors = collectErrors(page);
      for (const p of pages) {
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

test('the retired pages are no longer built (they are 301s in _redirects)', async ({ request }) => {
  for (const p of ['/portfolio/irrigation/rockland-spring-start-up-and-repair/']) expect(pages, p).not.toContain(p);
  expect(pages).toContain('/projects/');
  expect(pages).toContain('/free-quote/');
  expect(pages).toContain('/process/');
  expect((await request.get('/projects/rockland-spring-start-up-and-repair/')).status()).toBe(200);
});

test('site has no backend or sign-in surfaces', async ({ request }) => {
  for (const p of ['/admin/', '/free-quote/thanks/']) expect((await request.get(p)).status(), p).toBe(404);
  const html = await (await request.get('/free-quote/')).text();
  expect(html).not.toContain('data-netlify');
  expect(html).not.toContain('netlify-identity');
});

test('no page has a careers link', async ({ request }) => {
  for (const p of ['/', '/about/', '/contact/']) expect(await (await request.get(p)).text(), p).not.toMatch(/href="[^"]*careers/i);
});
