// @ts-check
/**
 * Site-wide checks (owner: qa from W2; ia in W1). Every built page (SITE_DIST) is served by tools/serve.mjs, so the
 * real netlify.toml CSP is enforced. Themes are set the CONTRACT §8 way (a stored rnc-theme), not by the OS scheme.
 */
import { test, expect } from 'playwright/test';
import { allPages, prefContext, collectProblems, overflowOf } from '../helpers/server.mjs';

const pages = allPages();
const THEMES = /** @type {const} */ (['dark', 'light']);
// The tests are independent page sweeps: let the workers share them.
test.describe.configure({ mode: 'parallel' });

test.describe('every page', () => {
  for (const theme of THEMES) {
    test(`returns 200 with one H1 and no console or CSP errors (${theme} theme) #no-console-csp-errors`, async ({ browser }) => {
      test.setTimeout(240000);
      expect(pages.length).toBeGreaterThanOrEqual(55);
      const ctx = await prefContext(browser, { theme, width: 1280 });
      const page = await ctx.newPage();
      const watch = await collectProblems(page);
      /** @type {string[]} */ const bad = [];
      for (const p of pages) {
        const res = await page.goto(p, { waitUntil: 'load' });
        if (res?.status() !== 200) bad.push(`${p}: status ${res?.status()}`);
        const h1 = await page.locator('h1').count();
        if (h1 !== 1) bad.push(`${p}: ${h1} <h1> elements`);
        if (!(await page.locator('main').isVisible())) bad.push(`${p}: <main> is not visible`);
        const t = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        if (t !== theme) bad.push(`${p}: data-theme is ${t}, expected the stored ${theme}`);
        await watch.flush();
      }
      expect([...bad, ...watch.problems]).toEqual([]);
      await ctx.close();
    });
  }
});

/*
 * WCAG 1.4.10 Reflow (C4.6): no horizontal scrolling at 320 CSS px, nor at 200 % zoom of a 1280 px window (a 640 CSS px
 * layout viewport at device scale 2, which is what browser zoom does). Both themes; 320 px with motion off and on;
 * 320 px with the mobile menu open on the template pages (motion-policy §6.5).
 */
test.describe('reflow', () => {
  const runs = /** @type {const} */ ([
    { width: 320, height: 640, dsf: 1, motion: 'off', label: '320 px, motion off' },
    { width: 320, height: 640, dsf: 1, motion: 'on', label: '320 px, motion on' },
    { width: 640, height: 400, dsf: 2, motion: 'off', label: '200 % zoom of a 1280 px window' },
  ]);
  for (const theme of THEMES) for (const r of runs) {
    test(`no horizontal overflow at ${r.label} (${theme} theme) #reflow-320-zoom-200`, async ({ browser }) => {
      test.setTimeout(240000);
      const ctx = await prefContext(browser, { theme, motion: r.motion, width: r.width, height: r.height, deviceScaleFactor: r.dsf });
      const page = await ctx.newPage();
      /** @type {string[]} */ const bad = [];
      for (const p of pages) {
        await page.goto(p, { waitUntil: 'load' });
        const o = await overflowOf(page);
        if (o) bad.push(`${p}: document is ${o.scrollWidth} px wide in a ${o.viewport} px viewport (${o.culprits.join(', ') || 'no single element'})`);
      }
      expect(bad).toEqual([]);
      await ctx.close();
    });
  }

  for (const theme of THEMES) {
    test(`no horizontal overflow at 320 px with the menu open (${theme} theme) #reflow-320-zoom-200`, async ({ browser }) => {
      test.setTimeout(120000);
      const ctx = await prefContext(browser, { theme, motion: 'on', width: 320, height: 640 });
      const page = await ctx.newPage();
      /** @type {string[]} */ const bad = [];
      for (const p of ['/', '/services/irrigation/', '/areas/oak-bay/', '/projects/', '/free-quote/', '/contact/'].filter((x) => pages.includes(x))) {
        await page.goto(p, { waitUntil: 'load' });
        const menu = page.locator('header').getByRole('button', { name: /menu/i }).first();
        if (!(await menu.isVisible().catch(() => false))) { bad.push(`${p}: no visible Menu button in the header at 320 px`); continue; }
        await menu.click();
        await expect(menu).toHaveAttribute('aria-expanded', 'true');
        const o = await overflowOf(page);
        if (o) bad.push(`${p} (menu open): document is ${o.scrollWidth} px wide in a ${o.viewport} px viewport (${o.culprits.join(', ') || 'no single element'})`);
      }
      expect(bad).toEqual([]);
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

test('pages are served with the netlify.toml CSP', async ({ request }) => {
  for (const p of ['/', '/free-quote/', '/projects/']) {
    const csp = (await request.get(p)).headers()['content-security-policy'] || '';
    expect(csp, p).toContain("script-src 'self'");
    expect(csp, p).toContain("object-src 'none'");
  }
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
