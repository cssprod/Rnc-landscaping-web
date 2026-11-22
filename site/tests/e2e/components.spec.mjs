// @ts-check
/** Shared primitives (owner: ia in W1, ds-comp from W2). W2 primitives are proven on /styleguide/ (showcase builds only). */
import { test, expect } from 'playwright/test';
import { offline } from '../helpers/server.mjs';

test.beforeEach(async ({ page }) => { await offline(page); });

/** Set the stored theme / motion choice before the page loads (HEAD_SCRIPT applies it before paint). */
async function prefs(page, /** @type {{ theme?: string, motion?: string }} */ o) {
  await page.addInitScript((p) => { try { if (p.theme) localStorage.setItem('rnc-theme', p.theme); if (p.motion) localStorage.setItem('rnc-motion', p.motion); } catch { /* storage off */ } }, o);
}

test('before/after slider is keyboard operable', async ({ page }) => {
  await page.goto('/services/grounds-maintenance/');
  const ba = page.locator('[data-ba]');
  test.skip(await ba.count() === 0, 'before/after only renders when both photos exist (not in --offline-images builds)');
  const range = page.getByRole('slider', { name: 'Compare before and after' });
  await range.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(range).toHaveValue('52');
  await expect(ba.first()).toHaveAttribute('style', /--pos:\s*52%/);
  await page.keyboard.press('Home');
  await expect(range).toHaveValue('0');
});

test('sample items carry a visible Sample label', async ({ page }) => {
  await page.goto('/reviews/');
  await expect(page.locator('.quote .sample-label').first()).toHaveText(/^Sample\b/);
});

test('FAQ items are native disclosures', async ({ page }) => {
  await page.goto('/faq/');
  const item = page.locator('details.faq__item').first();
  await expect(item).not.toHaveAttribute('open', '');
  await item.locator('summary').click();
  await expect(item).toHaveAttribute('open', '');
});

test('/styleguide/ renders every C3 primitive once, noindex, with one H1 from the hero #styleguide', async ({ page }) => {
  const res = await page.goto('/styleguide/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('section.hero h1#page-title')).toHaveCount(1);
  for (const sel of ['.hero__scene', '.section-head__index', 'nav.toc[data-toc]', 'ul.contact-links', '.btn--call', 'ul.bento.bento--feature[data-spot-grid]',
    '.bento__card[data-spotlight]', 'ul.tiles', 'dl.spec-strip', 'section.plant-palette', 'figure.ba [data-ba-toggle]', 'figure.review', 'section.reviews-band[data-reviews-band]',
    'section.credentials dl', 'section.guarantee', 'ol.timeline', 'table.visit-table caption', 'div.seasons', 'section.local-rules', 'aside.regional[data-shared="regional"]',
    'section.conditions', 'a.source-chip', 'p.reviewed time[datetime]', 'ul.reassurance', 'details.faq__item', 'section.contact-fallback', 'section.cta-band.cta-band--living']) {
    expect(await page.locator(sel).count(), sel).toBeGreaterThan(0);
  }
  // Numbered section heads run 01–n in DOM order with no gaps.
  const nums = await page.locator('.section-head__index').allTextContents();
  expect(nums).toEqual(nums.map((_, i) => String(i + 1).padStart(2, '0')));
  // No unresolved token in an href, no data-tilt, no review schema.
  expect(await page.locator('a[href*="["], [data-tilt], [itemtype*="Review"]').count()).toBe(0);
});

for (const theme of ['dark', 'light']) {
  test(`/styleguide/ reflows at 320 px in the ${theme} theme: one column of cards, no horizontal scroll #container-queries`, async ({ page }) => {
    await prefs(page, { theme });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/styleguide/');
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw);
    // Container queries put every grid in one column at 320 px: cards share their left edge and fit the viewport.
    for (const sel of ['ul.bento--feature > li', 'ul.tiles > li', 'ul.reviews > li', 'div.seasons > div', 'dl.credentials__list > div', 'ol.timeline--auto > li']) {
      const boxes = await page.locator(sel).evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }));
      expect(boxes.length, sel).toBeGreaterThan(0);
      expect(new Set(boxes.map((b) => b[0])).size, `${sel}: one column`).toBe(1);
      for (const [, right] of boxes) expect(right, sel).toBeLessThanOrEqual(320);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    const wide = await page.locator('ul.bento--feature > li').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().left))).size);
    expect(wide, 'the same DOM reflows into columns at 1440').toBeGreaterThan(2);
  });
}

test('/styleguide/ touch targets: primary actions >= 44 px, every button, chip and card link >= 24 px #target-size', async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/styleguide/');
    const small = await page.locator('main').evaluate((main) => {
      const out = [];
      const sel = '.btn, .chip, .link-more, .source-chip, .contact-links__link, .toc__link, summary, .bento__link, .tile__link, .card__link, .credentials__issuer, input[type=range]';
      for (const el of main.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (!r.width || getComputedStyle(el).visibility === 'hidden') continue;
        // A bento title link is a target through the card (its ::after covers the card).
        const box = el.classList.contains('bento__link') ? /** @type {Element} */ (el.closest('.bento__card')).getBoundingClientRect() : r;
        const min = el.matches('.btn--primary, .btn--lg, .contact-links__link') ? 44 : 24;
        if (box.width < min || box.height < min) out.push(`${el.className || el.tagName} ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
      return out;
    });
    expect(small, `targets below the minimum at ${width}px`).toEqual([]);
  }
});

test('/styleguide/ living CTA band: no infinite animation with motion off, at most 2 conic rings, loops marked data-t2 #motion', async ({ page }) => {
  await prefs(page, { motion: 'off' });
  await page.goto('/styleguide/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  expect(await page.locator('.conic__ring').count()).toBeLessThanOrEqual(2);
  const t2 = page.locator('.cta-band [data-t2]');
  expect(await t2.count()).toBe(4);
  const running = () => page.evaluate(() => document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity && a.playState === 'running').length);
  expect(await running()).toBe(0);
  // With Animations on and the page alive, the band's loops (3 blobs + 1 ring) are the only ones it adds.
  await page.evaluate(() => { document.documentElement.setAttribute('data-motion', 'on'); document.documentElement.setAttribute('data-alive', ''); });
  await page.locator('.cta-band').scrollIntoViewIfNeeded();
  await expect.poll(running).toBeGreaterThan(0);
  expect(await running()).toBeLessThanOrEqual(8);
});

test('/styleguide/ call button and contact links never link an unresolved token #track-names', async ({ page }) => {
  await page.goto('/styleguide/');
  const call = page.locator('main .btn--call').first();
  if (await call.evaluate((e) => e.tagName) === 'A') {
    await expect(call).toHaveAttribute('href', /^tel:\+?\d/);
    await expect(call).toHaveAttribute('data-track', 'call_click');
  } else {
    await expect(call).toHaveClass(/btn--pending/);
    await expect(call.locator('mark.ph')).toHaveText('[PHONE]');
  }
  for (const v of await page.locator('main [data-track]').evaluateAll((els) => els.map((e) => e.getAttribute('data-track')))) {
    expect(['call_click', 'sms_click', 'email_click', 'capability_statement_downloaded']).toContain(v);
  }
});

for (const path of ['/', '/about/']) {
  for (const width of [320, 1440]) {
    test(`photo hero media fills the hero and its chip stays on screen: ${path} at ${width} px #hero-media`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const hero = page.locator('.hero--photo').first();
      const media = hero.locator('.hero__media .media');
      await expect(media).toHaveCount(1);
      const [h, m] = await Promise.all([hero.boundingBox(), media.boundingBox()]);
      if (!h || !m) throw new Error('hero or media has no box');
      // picture()'s inline aspect-ratio must not resize the box (41-ui-heads.css: aspect-ratio auto !important).
      for (const k of /** @type {const} */ (['x', 'y', 'width', 'height'])) expect(Math.abs(m[k] - h[k]), `${k}: media ${m[k]} vs hero ${h[k]}`).toBeLessThanOrEqual(1);
      const chips = hero.locator('.hero__media :is(.media__chip, .media__credit)');
      for (let i = 0; i < await chips.count(); i++) {
        const c = await chips.nth(i).boundingBox();
        if (!c) continue;
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x + c.width).toBeLessThanOrEqual(width);
      }
    });
  }
}
