// @ts-check
/** Service areas (owner: ia in W1, t-areas from W3). */
import { test, expect } from 'playwright/test';
import { offline, siteFacts } from '../helpers/server.mjs';

const { municipalities, services } = siteFacts();

test.beforeEach(async ({ page }) => { await offline(page); });

test('the hub links one page per municipality (13)', async ({ page }) => {
  await page.goto('/areas/');
  for (const m of municipalities) await expect(page.locator(`main .area-cards a[href="/areas/${m.slug}/"]`)).toHaveCount(1);
});

test('every municipality page links the 4 services', async ({ request }) => {
  for (const m of municipalities) {
    const html = await (await request.get(`/areas/${m.slug}/`)).text();
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    for (const s of services) expect(main, `${m.slug} → ${s.slug}`).toContain(`href="/services/${s.slug}/"`);
  }
});
