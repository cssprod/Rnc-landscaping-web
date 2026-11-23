// @ts-check
/**
 * Living art (owner: living from W2): data-alive, loop budgets, motion off, off-screen and hidden-tab pausing, theme
 * reactivity, the spotlight, and per-project art with no stock under /projects/ (CONTRACT §7–§9).
 * Pages carry scenes through media/images.json in W2: the home hero (home-hero), every area hero (area-<slug>) and
 * every project card and case study (project art). Scenes inside legacy heroes render still (data-still, 0 loops),
 * because legacy hero buttons and the dock still blur (backdrop-filter) over them; the loop runtime is exercised on a
 * live scene placed outside any glass (`liveScene()`, the same markup W3 hero(p) and livingSpecimens() render).
 */
import { test, expect } from 'playwright/test';
import { offline, collectErrors } from '../helpers/server.mjs';
import { livingScene } from '../../src/components/living.mjs';

/**
 * Place a live scene (full loop budget) as the first block of <main>, in a positioned 70vh stage with no glass over
 * it, before living.js starts (it observes scenes on load).
 * @param {import('playwright/test').BrowserContext} ctx @param {string} sceneId
 */
const liveScene = (ctx, sceneId) => ctx.addInitScript((markup) => {
  document.addEventListener('DOMContentLoaded', () => {
    const stage = document.createElement('section');
    stage.setAttribute('data-live-fixture', '');
    stage.style.cssText = 'position:relative;height:70vh;overflow:hidden';
    stage.innerHTML = markup;
    (document.querySelector('main') || document.body).prepend(stage);
  });
}, String(livingScene(sceneId, { uid: 'e2e-live' })));
const FIX = '[data-live-fixture] [data-living]';

/** Running infinite animations on the page. @param {import('playwright/test').Page} page */
const running = (page) => page.evaluate(() => document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity && a.playState === 'running').length);
/** @param {import('playwright/test').BrowserContext} ctx @param {'on'|'off'|null} motion @param {'dark'|'light'|null} [theme] */
const prefs = (ctx, motion, theme = null) => ctx.addInitScript(([m, t]) => { try { if (m) localStorage.setItem('rnc-motion', m); if (t) localStorage.setItem('rnc-theme', t); } catch { /* storage blocked */ } }, [motion, theme]);

test('without JavaScript nothing is alive: no data-alive, no js class', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('data-alive', /.*/);
  await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
  // The static frame is fully composed: the hero scene and its chip are there, nothing loops.
  await expect(page.locator('[data-living][data-scene="home"]')).toHaveCount(1);
  await expect(page.locator('[data-living] .media__chip--art')).toHaveText('Illustration');
  expect(await running(page)).toBe(0);
  await ctx.close();
});

test('motion on: data-alive after load + idle, a live hero scene runs ≤ 7 loops, all ambient loops pause off-screen #loops', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await prefs(ctx, 'on');
  await liveScene(ctx, 'home');
  const page = await ctx.newPage();
  const errors = collectErrors(page);
  await offline(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-alive', '');
  await expect.poll(() => running(page)).toBeGreaterThan(0);
  expect(await running(page)).toBeLessThanOrEqual(7);
  // Scroll the scene out of view: it gets data-offscreen and every loop pauses.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator(FIX)).toHaveAttribute('data-offscreen', '');
  await expect.poll(() => running(page)).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator(FIX)).not.toHaveAttribute('data-offscreen', /.*/);
  await expect.poll(() => running(page)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('legacy heroes (under backdrop-filter glass) render still: 0 loops with motion on #legacy-still', async ({ browser }) => {
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await prefs(ctx, 'on');
    const page = await ctx.newPage();
    await offline(page);
    for (const path of ['/', '/areas/oak-bay/', '/services/grounds-maintenance/']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-alive', '');
      const hero = page.locator('.hero__media [data-living]');
      await expect(hero).toHaveCount(1);
      await expect(hero).toHaveAttribute('data-still', '');
      await expect(hero.locator('[data-t2]')).toHaveCount(0);
      await page.waitForTimeout(300);
      expect(await running(page), `${path} at ${width}`).toBe(0);
    }
    await ctx.close();
  }
});

test('motion off (stored choice) and OS reduce with no choice: no infinite animation runs, T1 hooks settle still #motion-off', async ({ browser }) => {
  for (const [motion, reduced] of /** @type {const} */ ([['off', 'no-preference'], [null, 'reduce']])) {
    const ctx = await browser.newContext({ reducedMotion: reduced });
    await prefs(ctx, motion);
    const page = await ctx.newPage();
    await offline(page);
    for (const path of ['/', '/areas/oak-bay/']) {
      await page.goto(path);
      await page.waitForLoadState('load');
      await expect(page.locator('[data-living]').first()).toHaveAttribute('data-entered', 'still');
      await page.waitForTimeout(2500);
      await expect(page.locator('html')).not.toHaveAttribute('data-alive', /.*/);
      expect(await running(page), `${path} motion=${motion} reduce=${reduced}`).toBe(0);
    }
    await ctx.close();
  }
});

test('turning Animations off at runtime stops every loop; turning it on restarts them; hidden tabs pause #runtime', async ({ browser }) => {
  const ctx = await browser.newContext();
  await prefs(ctx, 'on');
  await liveScene(ctx, 'area-sooke');
  const page = await ctx.newPage();
  await offline(page);
  await page.goto('/areas/sooke/');
  await expect(page.locator('html')).toHaveAttribute('data-alive', '');
  await expect.poll(() => running(page)).toBeGreaterThan(0);
  expect(await running(page)).toBeLessThanOrEqual(5);
  // What prefs.setMotion(false) does (the header toggle lands with ds-chrome).
  await page.evaluate(() => { document.documentElement.setAttribute('data-motion', 'off'); document.dispatchEvent(new CustomEvent('rnc:motion', { detail: { on: false, source: 'user' } })); });
  await expect(page.locator('html')).not.toHaveAttribute('data-alive', /.*/);
  await expect.poll(() => running(page)).toBe(0);
  await page.evaluate(() => { document.documentElement.setAttribute('data-motion', 'on'); document.dispatchEvent(new CustomEvent('rnc:motion', { detail: { on: true, source: 'user' } })); });
  await expect(page.locator('html')).toHaveAttribute('data-alive', '');
  await expect.poll(() => running(page)).toBeGreaterThan(0);
  // A hidden tab: data-alive goes, data-hidden pauses --alive-play.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('html')).toHaveAttribute('data-hidden', '');
  await expect(page.locator('html')).not.toHaveAttribute('data-alive', /.*/);
  await expect.poll(() => running(page)).toBe(0);
  await ctx.close();
});

test('scenes follow the theme: night by default, dawn under data-theme=light, from one DOM #theme', async ({ browser }) => {
  const fill = (/** @type {import('playwright/test').Page} */ page) => page.locator('[data-scene="home"] .f-far1').first().evaluate((el) => getComputedStyle(el).fill);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await offline(page);
  await page.goto('/');
  expect(await fill(page)).toBe('rgb(27, 55, 70)');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  expect(await fill(page)).toBe('rgb(174, 184, 207)');
  await expect(page.locator('[data-scene="home"] .sc-stars-a')).toHaveCSS('opacity', '0');
  await ctx.close();
});

test('/projects/ shows per-project art with the Illustration chip and no stock photo #no-stock', async ({ page }) => {
  await offline(page);
  /** @type {string[]} */ const stock = [];
  page.on('request', (r) => { if (/unsplash|pexels/.test(r.url())) stock.push(r.url()); });
  await page.goto('/projects/');
  const cards = page.locator('[data-project-grid] > li');
  await expect(cards).toHaveCount(16);
  for (let i = 0; i < 16; i++) {
    const card = cards.nth(i);
    await expect(card.locator('.card__media [data-scene^="proj-"]')).toHaveCount(1);
    await expect(card.locator('.media__chip--art')).toHaveText('Illustration');
    await expect(card.locator('.card__media img')).toHaveCount(0);
  }
  const href = await cards.first().locator('a.card__link').getAttribute('href');
  await page.goto(href || '/projects/');
  await expect(page.locator('main img[src*="unsplash"], main source[srcset*="unsplash"]')).toHaveCount(0);
  await expect(page.locator('.case__visual [data-scene^="proj-"]')).toHaveCount(1);
  expect(stock).toEqual([]);
});

test('the T3 spotlight follows a fine pointer over [data-spotlight] cards and stays off with motion off #spotlight', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await prefs(ctx, 'on');
  const page = await ctx.newPage();
  await offline(page);
  await page.goto('/projects/');
  await expect(page.locator('html')).toHaveAttribute('data-alive', '');
  // Mark a card as a spotlight card (ds-comp's bento cards carry the hook), then let living.js pick it up.
  await page.evaluate(() => { document.querySelector('[data-project-grid] > li')?.setAttribute('data-spotlight', ''); document.dispatchEvent(new CustomEvent('rnc:motion', { detail: { on: true, source: 'user' } })); });
  const card = page.locator('[data-spotlight]');
  const box = await card.boundingBox();
  if (!box) throw new Error('no card');
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.move(box.x + 120, box.y + 90, { steps: 4 });
  await expect(card.locator('> .spot[aria-hidden="true"] > .spot-glow')).toHaveCount(1);
  await expect.poll(() => card.locator('.spot-glow').evaluate((el) => /** @type {HTMLElement} */ (el).style.transform)).toMatch(/^translate3d\(\d+px,\s?\d+px,\s?0(px)?\)$/);
  // Motion off: the glow is hidden (no data-alive) and no further writes happen.
  await page.evaluate(() => { document.documentElement.setAttribute('data-motion', 'off'); document.dispatchEvent(new CustomEvent('rnc:motion', { detail: { on: false, source: 'user' } })); });
  await expect(card.locator('.spot-glow')).toHaveCSS('opacity', '0');
  const before = await card.locator('.spot-glow').evaluate((el) => /** @type {HTMLElement} */ (el).style.transform);
  await page.mouse.move(box.x + 200, box.y + 150, { steps: 4 });
  expect(await card.locator('.spot-glow').evaluate((el) => /** @type {HTMLElement} */ (el).style.transform)).toBe(before);
  await ctx.close();
});

test('mobile 390: the hero scene fills its land band and the page does not scroll sideways #mobile', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await offline(page);
  await page.goto('/');
  await expect(page.locator('[data-scene="home"] .sc-mfore')).toBeVisible();
  // The T1 dolly (95-motion.css) holds .sc-land at scale 1.04 until living.js marks the scene [data-entered], then
  // transitions it to 1, so a box read mid-transition is wider than the band. Wait for the mark, then for every finite
  // time-based animation or transition on the land box to finish (T4 parallax is scroll-linked, never finishes, and
  // only translates). getAnimations() flushes style, so a transition the mark has just triggered is included.
  const scene = page.locator('[data-scene="home"]');
  const land = scene.locator('.sc-land');
  await expect(scene).toHaveAttribute('data-entered', /^(go|still)$/);
  await land.evaluate((el) => Promise.all(el.getAnimations()
    .filter((a) => a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().endTime !== Infinity)
    .map((a) => a.finished.catch(() => null))));
  // Layout width (unaffected by transforms) and the painted box both match the 960px mobile band.
  expect(await land.evaluate((el) => /** @type {HTMLElement} */ (el).offsetWidth)).toBe(960);
  expect((await land.boundingBox())?.width).toBe(960);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await ctx.close();
});
