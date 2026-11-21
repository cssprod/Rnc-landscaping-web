// @ts-check
/** Services (owner: ia in W1, t-services from W3). */
import { test, expect } from 'playwright/test';
import { offline, siteFacts } from '../helpers/server.mjs';

const { municipalities, services } = siteFacts();

test.beforeEach(async ({ page }) => { await offline(page); });

test('every service page links all 13 municipality pages and its filtered projects', async ({ request }) => {
  for (const s of services) {
    const html = await (await request.get(`/services/${s.slug}/`)).text();
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    for (const m of municipalities) expect(main, `${s.slug} → ${m.slug}`).toContain(`href="/areas/${m.slug}/"`);
    expect(main).toContain(`href="/projects/?service=${s.slug}"`);
  }
});

test('the hub lists the four service lines', async ({ page }) => {
  await page.goto('/services/');
  for (const s of services) await expect(page.locator(`main a[href="/services/${s.slug}/"]`).first()).toBeVisible();
});

test('commercial sits under Services and links the quote', async ({ page }) => {
  await page.goto('/commercial/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('main a[href="/free-quote/"]').first()).toBeVisible();
});
