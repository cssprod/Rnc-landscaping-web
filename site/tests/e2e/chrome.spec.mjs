// @ts-check
/** Header, navigation and footer (C1; owner: ia in W1, ds-chrome from W2). */
import { test, expect } from 'playwright/test';
import { offline, siteFacts } from '../helpers/server.mjs';

const { municipalities, services } = siteFacts();

test.beforeEach(async ({ page }) => { await offline(page); });

test('primary nav: Services ▾ · Projects · Service areas ▾ · Process · About · Call · Free quote #primary-nav', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav).toHaveCount(1);
  const items = nav.locator('.site-nav__list > li > :is(a, button)');
  await expect(items).toHaveText(['Services', 'Projects', 'Service areas', 'Process', 'About']);
  // the two disclosures are buttons, never href="#"
  for (const [name, panel] of [['Services', 'menu-services'], ['Service areas', 'menu-areas']]) {
    const btn = nav.getByRole('button', { name, exact: true });
    await expect(btn).toHaveAttribute('type', 'button');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(btn).toHaveAttribute('aria-controls', panel);
    await expect(page.locator(`#${panel}`)).toHaveCount(1);
  }
  await expect(page.locator('a[href="#"]')).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('href', '/projects/');
  await expect(nav.getByRole('link', { name: 'Process', exact: true })).toHaveAttribute('href', '/process/');
  await expect(nav.getByRole('link', { name: 'About', exact: true })).toHaveAttribute('href', '/about/');
  // header actions: Call (a tel: link once [PHONE] is known; plain text + chip until then) and Free quote
  const actions = nav.locator('.site-nav__actions');
  await expect(actions).toContainText('Call');
  await expect(actions.locator('a[href^="tel:["]')).toHaveCount(0);
  await expect(actions.getByRole('link', { name: 'Get a free quote' })).toHaveAttribute('href', '/free-quote/');
  await expect(actions.getByRole('link', { name: 'Get a free quote' })).toBeVisible();
});

test('the Services menu lists every service page and Commercial; Service areas lists the 13 municipalities #primary-nav', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const svc = page.locator('#menu-services');
  await expect(svc).toBeHidden();
  await page.getByRole('button', { name: 'Services', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Services', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(svc).toBeVisible();
  for (const s of services) await expect(svc.locator(`a[href="/services/${s.slug}/"]`)).toBeVisible();
  await expect(svc.locator('a[href="/commercial/"]')).toBeVisible();
  await expect(svc.locator('a[href="/services/"]')).toBeVisible();
  const areas = page.locator('#menu-areas');
  await page.getByRole('button', { name: 'Service areas', exact: true }).click();
  await expect(areas).toBeVisible();
  for (const m of municipalities) await expect(areas.getByRole('link', { name: m.name, exact: true })).toHaveAttribute('href', `/areas/${m.slug}/`);
  await expect(areas.locator('a[href="/areas/"]')).toBeVisible();
});

test('disclosures work by keyboard: Enter opens, Tab enters the panel, Escape closes and returns focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  for (const [name, id] of [['Services', 'menu-services'], ['Service areas', 'menu-areas']]) {
    const btn = page.getByRole('button', { name, exact: true });
    const panel = page.locator(`#${id}`);
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(panel.locator('a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(btn).toBeFocused();
  }
});

test('main navigation reaches key sections and marks the current page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  for (const [name, path] of [['Projects', '/projects/'], ['Process', '/process/'], ['About', '/about/']]) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}$`));
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  await page.getByRole('link', { name: 'Skip to content' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('navigation capsule turns to dark glass over the hero and back below it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const header = page.locator('[data-header]');
  await expect(header).toHaveClass(/is-over-media/);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight / 2));
  await expect(header).not.toHaveClass(/is-over-media/);
  await expect(header).toHaveClass(/is-scrolled/);
});

test('mobile menu sheet opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('[data-nav-toggle]');
  const nav = page.locator('#site-nav');
  await expect(nav).toBeHidden();
  await expect(toggle).toHaveAccessibleName('Menu');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  // The name stays "Menu" while open (COMPONENTS.md §Chrome; aria-expanded carries the state, WCAG 2.5.3).
  await expect(toggle).toHaveAccessibleName('Menu');
  await expect(toggle).not.toHaveAttribute('aria-label', /close/i);
  await expect(nav.getByRole('button', { name: 'Services', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Get a free quote' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('footer: services, municipalities, NAP, hours, tel/sms/mailto, legal and Google profile, no careers, no duplicates #footer', async ({ page }) => {
  await page.goto('/about/');
  const footer = page.locator('footer.site-footer');
  const svc = footer.getByRole('navigation', { name: 'Services' });
  for (const s of services) await expect(svc.getByRole('link', { name: s.navLabel, exact: true })).toHaveAttribute('href', `/services/${s.slug}/`);
  await expect(svc.locator('a[href="/commercial/"]')).toHaveCount(1);
  const areas = footer.getByRole('navigation', { name: 'Service areas' });
  await expect(areas.getByRole('link')).toHaveCount(13);
  for (const m of municipalities) await expect(areas.getByRole('link', { name: m.name, exact: true })).toHaveAttribute('href', `/areas/${m.slug}/`);
  const company = footer.getByRole('navigation', { name: 'Company' });
  for (const [name, href] of [['Projects', '/projects/'], ['Process', '/process/'], ['Reviews', '/reviews/'], ['Resources', '/resources/'], ['FAQ', '/faq/'], ['Contact', '/contact/']]) {
    await expect(company.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
  // NAP + hours from site.json: tel:/sms:/mailto: once known, the placeholder chip (never inside an href) until then
  const address = footer.locator('address');
  for (const t of ['[PHONE]', '[EMAIL]', '[HOURS]', '[ADDRESS]']) await expect(address).toContainText(t);
  await expect(address).toContainText('Text');
  const telLinks = await footer.locator('a[href^="tel:"], a[href^="sms:"], a[href^="mailto:"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  for (const h of telLinks) expect(h).not.toMatch(/\[|%5B/);
  if (!(await address.locator('mark.ph').count())) {
    await expect(footer.locator('a[href^="tel:"]')).toHaveCount(1);
    await expect(footer.locator('a[href^="sms:"]')).toHaveCount(1);
    await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(1);
  }
  const legal = footer.locator('.site-footer__legal');
  for (const [name, href] of [['Privacy', '/privacy/'], ['Terms', '/terms/'], ['Accessibility', '/accessibility/']]) await expect(legal.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  await expect(legal).toContainText('Google profile');
  await expect(footer).not.toContainText(/careers/i);
  const hrefs = await footer.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(20);
  expect(new Set(hrefs).size, 'duplicate footer links').toBe(hrefs.length);
});

/* ---------------- W2 ds-chrome: CONTRACT §3, §5, §8, §13; DESIGN-DIRECTION §13–§14 ---------------- */

/** CONTRACT §13 event names (v3) the chrome may emit. */
const TRACK_NAMES = ['call_click', 'sms_click', 'email_click', 'capability_statement_downloaded'];
/** Pages that carry every kind of chrome and contact link. */
const CONTACT_PAGES = ['/', '/about/', '/contact/', '/free-quote/', '/services/irrigation/'];

/** The WCAG 1.4.12 Text Spacing override (line height 1.5, letter .12em, word .16em, paragraph 2em). */
const TEXT_SPACING = '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }';

/** Overlaps between consecutive header-row parts (logo · nav list · Call / Free quote · toggles), and capsule overflow. @param {import('playwright/test').Page} page */
async function rowOverlaps(page) {
  return page.evaluate(() => {
    const parts = [...document.querySelectorAll('.nav-capsule > .brand, .site-nav__list, .site-nav__actions, .site-tools')].map((e) => e.getBoundingClientRect());
    const bad = [];
    for (let i = 1; i < parts.length; i++) if (parts[i].left < parts[i - 1].right - 0.5) bad.push(`part ${i} starts at ${parts[i].left}, part ${i - 1} ends at ${parts[i - 1].right}`);
    const cap = /** @type {HTMLElement} */ (document.querySelector('.nav-capsule'));
    if (cap.scrollWidth > cap.clientWidth) bad.push(`capsule overflows by ${cap.scrollWidth - cap.clientWidth}px`);
    return bad;
  });
}

/** @param {import('playwright/test').Locator} loc */
async function box(loc) {
  const b = await loc.boundingBox();
  if (!b) throw new Error('element has no box');
  return b;
}

test('tel:/sms:/mailto: in header, footer and sticky bar; never a token in an href; v3 data-track names #tel-sms-mailto', async ({ page }) => {
  for (const path of CONTACT_PAGES) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const phoneKnown = !(await page.locator('footer address mark.ph', { hasText: '[PHONE]' }).count());
      const emailKnown = !(await page.locator('footer address mark.ph', { hasText: '[EMAIL]' }).count());
      // No URL is ever built from an unresolved token (CONTRACT §3), in any attribute.
      const bad = await page.locator('[href*="["], [href*="%5B"], [action*="["], [src*="["]').evaluateAll((els) => els.map((e) => e.outerHTML.slice(0, 120)));
      expect(bad, `${path}: token inside a URL`).toEqual([]);
      // Every tel:/sms:/mailto: link in the chrome carries its CONTRACT §13 name and a location.
      const chromeLinks = page.locator(':is(header.site-header, footer.site-footer, [data-action-bar]) a:is([href^="tel:"], [href^="sms:"], [href^="mailto:"])');
      for (const a of await chromeLinks.all()) {
        const href = /** @type {string} */ (await a.getAttribute('href'));
        const want = href.startsWith('tel:') ? 'call_click' : href.startsWith('sms:') ? 'sms_click' : 'email_click';
        await expect(a, `${path} ${href}`).toHaveAttribute('data-track', want);
        await expect(a).toHaveAttribute('data-track-location', /^(header|sticky_bar|footer)$/);
        if (!href.startsWith('mailto:')) expect(href).toMatch(/^(tel|sms):\+\d{6,}(;ext=\d+)?$/);
      }
      // Every data-track value in the chrome is a v3 name (the retired v2 names are gone from it).
      const names = await page.locator(':is(header.site-header, footer.site-footer, [data-action-bar]) [data-track]').evaluateAll((els) => els.map((e) => e.getAttribute('data-track')));
      for (const n of names) expect(TRACK_NAMES, `${path}: data-track="${n}"`).toContain(n);
      const footer = page.locator('footer.site-footer address');
      if (phoneKnown) {
        await expect(footer.locator('a[href^="tel:"]')).toHaveCount(1);
        await expect(footer.locator('a[href^="sms:"]')).toHaveCount(1);
      } else {
        // Showcase: plain text plus the chip, never a link.
        await expect(footer.locator('a[href^="tel:"], a[href^="sms:"]')).toHaveCount(0);
        await expect(footer).toContainText('Text [PHONE]');
      }
      if (emailKnown) await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(1);
      else await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0);
      // The sticky bar (< 64em): Call → tel: once PHONE is known, "Contact" → /contact/ until then.
      if (width < 1024) {
        const bar = page.locator('[data-action-bar]');
        if (phoneKnown) await expect(bar.locator('a[href^="tel:"][data-track-location="sticky_bar"]')).toHaveCount(1);
        else await expect(bar.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', '/contact/');
        await expect(bar.getByRole('link', { name: 'Get a free quote' })).toHaveAttribute('href', '/free-quote/');
      }
    }
  }
});

test('header Call and Free quote at >= 64em only; logo, toggles and Menu at every width #header-call', async ({ page }) => {
  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about/');
    const header = page.locator('header.site-header');
    const quote = header.locator('.site-nav__actions').getByRole('link', { name: 'Get a free quote' });
    await expect(quote).toBeVisible();
    await expect(quote).toHaveAttribute('href', '/free-quote/');
    expect((await box(quote)).height).toBeGreaterThanOrEqual(44);
    const call = header.locator('.site-nav__call');
    await expect(call).toBeVisible();
    await expect(call).toContainText('Call');
    if (await call.evaluate((e) => e.tagName === 'A')) {
      await expect(call).toHaveAttribute('href', /^tel:\+\d/);
      await expect(call).toHaveAttribute('data-track', 'call_click');
      await expect(call).toHaveAttribute('data-track-location', 'header');
      const b = await box(call);
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    } else await expect(call.locator('mark.ph')).toHaveText('[PHONE]');
    // Nothing in the header row overflows or overlaps (logo · nav · Call · Free quote · toggles).
    const boxes = await page.locator('.nav-capsule > .brand, .site-nav__list, .site-nav__actions, .site-tools').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].left, `header row overlap at ${width}`).toBeGreaterThanOrEqual(boxes[i - 1].right - 0.5);
    const cap = await page.locator('.nav-capsule').evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
    expect(cap.sw).toBeLessThanOrEqual(cap.cw);
    await expect(page.locator('[data-action-bar]')).toBeHidden();
    await expect(page.locator('[data-nav-toggle]')).toBeHidden();
  }
  // WCAG 1.4.12 Text Spacing: with the standard override the row degrades (data-fit: icon toggles, tighter items, then
  // the tile without the wordmark) instead of overlapping, and every control keeps its name and its 44 px.
  for (const width of [1024, 1100, 1280, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about/');
    await page.addStyleTag({ content: TEXT_SPACING });
    await expect(page.locator('header.site-header')).toHaveAttribute('data-fit', /^(compact|tight)$/);
    await expect.poll(() => rowOverlaps(page), `header row overlap with text spacing at ${width}`).toEqual([]);
    for (const sel of ['.nav-capsule > .brand', '.site-nav__quote', '.site-nav__call', '[data-pref="theme"]', '[data-pref="motion"]']) {
      const b = await box(page.locator(sel));
      expect(b.height, `${sel} height with text spacing at ${width}`).toBeGreaterThanOrEqual(44);
      expect(b.width, `${sel} width with text spacing at ${width}`).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('.nav-capsule > .brand')).toHaveAccessibleName('RNC Landscaping home');
    await expect(page.getByRole('button', { name: 'Dark theme' })).toBeVisible();
  }
  for (const width of [320, 390, 768, 1023]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/about/');
    // Below 64em the header row holds the logo, both toggles and Menu; Call and Free quote ride in the sticky bar.
    await expect(page.locator('.site-nav__actions')).toBeHidden();
    for (const sel of ['.nav-capsule > .brand', '[data-pref="theme"]', '[data-pref="motion"]', '[data-nav-toggle]']) {
      const el = page.locator(sel);
      await expect(el, `${sel} at ${width}`).toBeVisible();
      const b = await box(el);
      expect(b.height, `${sel} height at ${width}`).toBeGreaterThanOrEqual(44);
      expect(b.width, `${sel} width at ${width}`).toBeGreaterThanOrEqual(44);
      expect(b.x + b.width, `${sel} inside the viewport at ${width}`).toBeLessThanOrEqual(width);
    }
    const doc = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(doc.sw, `horizontal scroll at ${width}`).toBeLessThanOrEqual(doc.cw);
    await expect(page.locator('[data-action-bar]')).toBeVisible();
  }
});

test('mobile sheet: inert background, focus moves in, accordions, Escape steps out, focus returns #mobile-sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/services/irrigation/');
  const toggle = page.locator('[data-nav-toggle]');
  const nav = page.locator('#site-nav');
  await expect(page.locator('nav[aria-label="Main"]')).toHaveCount(1);
  await expect(toggle).toHaveAttribute('aria-controls', 'site-nav');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).toBeVisible();
  // Focus moves to the first control in the sheet; everything outside the header is inert.
  await expect(nav.getByRole('button', { name: 'Services', exact: true })).toBeFocused();
  const inert = await page.evaluate(() => [...document.body.children].filter((e) => !e.matches('header, svg.sprite, script')).map((e) => [e.tagName + (e.className ? `.${String(e.className).split(' ')[0]}` : ''), /** @type {HTMLElement} */ (e).inert]));
  for (const [name, isInert] of inert) expect(isInert, `${name} is inert while the sheet is open`).toBe(true);
  await expect(page.locator('main')).toHaveJSProperty('inert', true);
  await expect(page.locator('[data-action-bar]')).toHaveJSProperty('inert', true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).toBe('hidden');
  // Accordions: the disclosures open in place; Escape closes the open one and keeps the sheet.
  const svc = nav.getByRole('button', { name: 'Services', exact: true });
  await page.keyboard.press('Enter');
  await expect(svc).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#menu-services')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('#menu-services a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(svc).toHaveAttribute('aria-expanded', 'false');
  await expect(svc).toBeFocused();
  await expect(nav).toBeVisible();
  // Both accordions can be open together in the sheet.
  await svc.click();
  await nav.getByRole('button', { name: 'Service areas', exact: true }).click();
  await expect(page.locator('#menu-services')).toBeVisible();
  await expect(page.locator('#menu-areas')).toBeVisible();
  await expect(page.locator('#menu-areas').getByRole('link', { name: 'Oak Bay', exact: true })).toBeVisible();
  // Escape closes the open accordion, then the sheet; focus returns to Menu and inert lifts.
  await page.locator('#menu-areas').getByRole('link', { name: 'Oak Bay', exact: true }).focus();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAccessibleName('Menu');
  await expect(page.locator('main')).toHaveJSProperty('inert', false);
  await expect(page.locator('[data-action-bar]')).toHaveJSProperty('inert', false);
  // A tap on the dimmed page closes it too; so does widening to the desktop row.
  await toggle.click();
  await page.mouse.click(200, 820);
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.setViewportSize({ width: 1280, height: 844 });
  await expect(toggle).toBeHidden();
  await expect(page.locator('main')).toHaveJSProperty('inert', false);
  await expect(page.locator('#menu-services')).toBeHidden();
});

test('sticky Call / Free-quote bar below 64em: 48 px buttons, safe area, shown without JS #sticky-bar', async ({ page, browser }) => {
  for (const width of [320, 390, 768, 1023]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/about/');
    const bar = page.locator('[data-action-bar]');
    await expect(bar).toBeVisible();
    const b = await box(bar);
    expect(b.y + b.height, 'the bar sits at the bottom edge').toBeLessThanOrEqual(800);
    expect(b.y + b.height).toBeGreaterThan(800 - 40);
    const links = bar.getByRole('link');
    await expect(links).toHaveCount(2);
    /** @type {{ x: number, y: number, width: number, height: number }[]} */ const boxes = [];
    for (const l of await links.all()) {
      const lb = await box(l);
      expect(lb.height, `bar button height at ${width}`).toBeGreaterThanOrEqual(48);
      expect(lb.width).toBeGreaterThanOrEqual(48);
      boxes.push(lb);
    }
    // Both fit on one row at 320 px.
    expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(1);
  }
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/about/');
    await expect(page.locator('[data-action-bar]')).toBeHidden();
  }
  // The bar keeps clear of the home indicator: its offset includes env(safe-area-inset-bottom).
  const rules = await page.evaluate(() => [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; } }).join('\n'));
  expect(rules).toMatch(/\.action-bar\s*\{[^}]*safe-area-inset-bottom/);
  // Without JS the bar is always shown (and the toggles are hidden).
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 800 } });
  const nojs = await ctx.newPage();
  await offline(nojs);
  await nojs.goto('/free-quote/');
  await expect(nojs.locator('[data-action-bar]')).toBeVisible();
  await expect(nojs.locator('[data-pref]').first()).toBeHidden();
  await ctx.close();
});

test('sticky bar hides over the quote form, while the keyboard is open and while the sheet is open #sticky-bar-hides', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/free-quote/');
  const bar = page.locator('[data-action-bar]');
  const form = page.locator('[data-quote-form]');
  await form.scrollIntoViewIfNeeded();
  await expect(bar).toHaveClass(/is-hidden/);
  // Hidden = slid out and visibility: hidden (out of the tab order and the accessibility tree). The scroll-driven hide
  // flips only the class, never inert / aria-hidden (motion-audit #no-auto-advance).
  await expect(bar).toHaveCSS('visibility', 'hidden');
  await expect(bar).toBeHidden();
  await expect(bar).toHaveJSProperty('inert', false);
  await expect(bar).not.toHaveAttribute('aria-hidden', /.*/);
  await expect(bar).not.toBeInViewport();
  // Past the form (the footer), the bar comes back.
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(bar).not.toHaveClass(/is-hidden/);
  await expect(bar).toHaveCSS('visibility', 'visible');
  await expect(bar.getByRole('link', { name: 'Get a free quote' })).toBeVisible();
  await expect(bar).toBeInViewport();
  // On-screen keyboard: the visual viewport shrinks by more than 150 px.
  await page.evaluate(() => {
    const vv = /** @type {VisualViewport} */ (window.visualViewport);
    Object.defineProperty(vv, 'height', { configurable: true, get: () => innerHeight - 300 });
    vv.dispatchEvent(new Event('resize'));
  });
  await expect(bar).toHaveClass(/is-hidden/);
  await page.evaluate(() => {
    const vv = /** @type {VisualViewport} */ (window.visualViewport);
    Object.defineProperty(vv, 'height', { configurable: true, get: () => innerHeight });
    vv.dispatchEvent(new Event('resize'));
  });
  await expect(bar).not.toHaveClass(/is-hidden/);
  // While the sheet is open.
  await page.locator('[data-nav-toggle]').click();
  await expect(bar).toHaveClass(/is-hidden/);
  await page.keyboard.press('Escape');
  await expect(bar).not.toHaveClass(/is-hidden/);
});

test('keyboard-only pass: no focused element is hidden by the header or the sticky bar, 320–1440 #focus-not-obscured', async ({ page }) => {
  test.setTimeout(180000);
  for (const width of [320, 390, 768, 1024, 1440]) {
    for (const [path, key] of [['/services/irrigation/', 'Tab'], ['/about/', 'Tab'], ['/services/irrigation/', 'Shift+Tab']]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto(path);
      // Backwards from the bottom of the page: scroll-padding-top has to keep focus clear of the header.
      if (key === 'Shift+Tab') await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      /** @type {string[]} */ const hidden = [];
      let first = '', stops = 0;
      for (let i = 0; i < 200; i++) {
        await page.keyboard.press(key);
        const r = await page.evaluate(() => {
          const el = /** @type {HTMLElement|null} */ (document.activeElement);
          if (!el || el === document.body) return null;
          const id = `${[...document.querySelectorAll('*')].indexOf(el)}:${el.tagName}:${(el.textContent || '').trim().slice(0, 30)}:${el.getAttribute('href') || ''}`;
          const chrome = 'header.site-header, [data-action-bar]';
          if (el.closest(chrome)) return { id, covered: false };
          const b = el.getBoundingClientRect();
          const vis = { l: Math.max(b.left, 0), t: Math.max(b.top, 0), r: Math.min(b.right, innerWidth), btm: Math.min(b.bottom, innerHeight) };
          if (vis.r <= vis.l || vis.btm <= vis.t) return { id, covered: true };
          // Sample the visible area on a grid: the element is hidden when every sample point hits the header or the bar.
          let clear = 0;
          for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
            const px = vis.l + ((x + 0.5) / 5) * (vis.r - vis.l), py = vis.t + ((y + 0.5) / 5) * (vis.btm - vis.t);
            const hit = document.elementFromPoint(px, py);
            if (!hit?.closest(chrome)) clear++;
          }
          return { id, covered: clear === 0 };
        });
        if (!r) continue;
        if (r.id === first) break;
        if (!first) first = r.id;
        stops++;
        if (r.covered) hidden.push(`${width} ${path} ${key} ${r.id}`);
      }
      expect(stops, `${width} ${path} ${key}: the pass covered the page`).toBeGreaterThan(30);
      expect(hidden).toEqual([]);
    }
  }
});

test('disclosure-button menus (never href="#"), one Main nav, breadcrumbs on every page below home #disclosure-breadcrumbs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ['/', '/services/irrigation/', '/areas/oak-bay/', '/projects/', '/resources/', '/about/', '/free-quote/', '/privacy/']) {
    await page.goto(path);
    await expect(page.locator('a[href="#"], a[href=""]')).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Main"]')).toHaveCount(1);
    await expect(page.locator('[data-mega], [data-mega-toggle], [data-mega-panel]')).toHaveCount(0);
    const disclosures = page.locator('header [data-disclosure]');
    await expect(disclosures).toHaveCount(2);
    for (const d of await disclosures.all()) {
      await expect(d).toHaveJSProperty('tagName', 'BUTTON');
      await expect(d).toHaveAttribute('type', 'button');
      await expect(d).toHaveAttribute('aria-expanded', 'false');
      const id = /** @type {string} */ (await d.getAttribute('aria-controls'));
      await expect(page.locator(`#${id}[data-disclosure-panel]`)).toHaveCount(1);
    }
    // Opening one desktop menu closes the other; a click outside closes it.
    await page.getByRole('button', { name: 'Services', exact: true }).click();
    await page.getByRole('button', { name: 'Service areas', exact: true }).click();
    await expect(page.locator('#menu-services')).toBeHidden();
    await expect(page.locator('#menu-areas')).toBeVisible();
    await page.evaluate(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await expect(page.locator('#menu-areas')).toBeHidden();
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    if (path === '/') { await expect(crumbs).toHaveCount(0); continue; }
    await expect(crumbs).toHaveCount(1);
    await expect(crumbs.getByRole('link').first()).toHaveAttribute('href', '/');
    const last = crumbs.locator('ol > li').last().getByRole('link');
    await expect(last).toHaveAttribute('aria-current', 'page');
    await expect(last).toHaveAttribute('href', path);
  }
});

test('a desktop disclosure stays open when its own panel is clicked; Tab out or a click outside closes it #disclosure-breadcrumbs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about/');
  const btn = page.getByRole('button', { name: 'Services', exact: true });
  const panel = page.locator('#menu-services');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  // A click on non-focusable panel content (the aside text, the panel padding) blurs the button with no relatedTarget.
  await panel.locator('.mega__aside p').click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await panel.click({ position: { x: 5, y: 60 } }); // the panel's 10 px padding, clear of the rounded corner
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  // Keyboard focus leaving the item closes it.
  await btn.focus();
  const links = await panel.locator('a').count();
  for (let i = 0; i <= links; i++) await page.keyboard.press('Tab');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  // A click outside closes it.
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.click(5, 890);
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
});

test('breadcrumbs over the hero reach 4.5:1 against the art behind them, in both themes #disclosure-breadcrumbs', async ({ page }) => {
  for (const themeName of ['light', 'dark']) {
    await page.addInitScript((t) => { try { localStorage.setItem('rnc-theme', t); } catch { /* blocked storage */ } }, themeName);
    for (const width of [320, 390, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/about/', '/services/irrigation/', '/commercial/', '/areas/oak-bay/']) {
        await page.goto(path);
        const links = page.locator('.hero .crumbs a');
        if (!(await links.count())) continue;
        await expect(page.locator('html')).toHaveAttribute('data-theme', themeName);
        const colours = await links.evaluateAll((els) => els.map((e) => getComputedStyle(e).color));
        // Photograph the background under each crumb with the text made transparent, then find its lightest pixel.
        const style = await page.addStyleTag({ content: '.hero .crumbs a, .hero .crumbs__sep { color: transparent !important; }' });
        const boxes = await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
        for (let i = 0; i < boxes.length; i++) {
          const b = boxes[i];
          const png = await page.screenshot({ clip: { x: b.x, y: b.y, width: Math.max(1, b.width), height: Math.max(1, b.height) }, animations: 'disabled' });
          const ratio = await page.evaluate(async ([b64, fg]) => {
            const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
            const cv = new OffscreenCanvas(bmp.width, bmp.height);
            const ctx = /** @type {OffscreenCanvasRenderingContext2D} */ (cv.getContext('2d'));
            ctx.drawImage(bmp, 0, 0);
            const px = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
            const lin = (/** @type {number} */ c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
            const lum = (/** @type {number[]} */ c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
            const m = /** @type {RegExpMatchArray} */ (fg.match(/[\d.]+/g)).map(Number);
            const a = m.length > 3 ? m[3] : 1;
            let worst = Infinity;
            for (let k = 0; k < px.length; k += 4) {
              const bg = [px[k], px[k + 1], px[k + 2]];
              const text = [0, 1, 2].map((j) => m[j] * a + bg[j] * (1 - a));
              const [l1, l2] = [lum(text), lum(bg)].sort((x, y) => y - x);
              worst = Math.min(worst, (l1 + 0.05) / (l2 + 0.05));
            }
            return worst;
          }, [png.toString('base64'), colours[i]]);
          expect(ratio, `${themeName} ${width}px ${path} crumb ${i + 1} (${colours[i]})`).toBeGreaterThanOrEqual(4.5);
        }
        await style.evaluate((s) => s.remove());
      }
    }
  }
});

test('Dark theme and Animations toggles: aria-pressed, 44 px, persisted, theme-color follows #pref-toggles', async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/about/');
    for (const [pref, name] of [['theme', 'Dark theme'], ['motion', 'Animations']]) {
      const btn = page.getByRole('button', { name, exact: true });
      await expect(btn).toHaveCount(1);
      await expect(btn).toHaveAttribute('data-pref', pref);
      await expect(btn).toHaveAttribute('type', 'button');
      await expect(btn).toBeVisible();
      const b = await box(btn);
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
  }
  const theme = page.getByRole('button', { name: 'Dark theme', exact: true });
  const motion = page.getByRole('button', { name: 'Animations', exact: true });
  const meta = page.locator('meta[name="theme-color"]');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark light');
  await expect(theme).toHaveAttribute('aria-pressed', 'true');
  const dark = /** @type {string} */ (await meta.getAttribute('content'));
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(theme).toHaveAttribute('aria-pressed', 'false');
  await expect(theme).toBeFocused();
  await expect(meta).not.toHaveAttribute('content', dark);
  expect(await page.evaluate(() => localStorage.getItem('rnc-theme'))).toBe('light');
  const on = await motion.getAttribute('aria-pressed');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-pressed', on === 'true' ? 'false' : 'true');
  await expect(page.locator('html')).toHaveAttribute('data-motion', on === 'true' ? 'off' : 'on');
  expect(await page.evaluate(() => localStorage.getItem('rnc-motion'))).toBe(on === 'true' ? 'off' : 'on');
  // Both choices survive a reload (applied before paint by the head script, mirrored by aria-pressed).
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(theme).toHaveAttribute('aria-pressed', 'false');
  await expect(motion).toHaveAttribute('aria-pressed', on === 'true' ? 'false' : 'true');
  await expect(meta).not.toHaveAttribute('content', dark);
  await theme.click();
  await expect(theme).toHaveAttribute('aria-pressed', 'true');
  await expect(meta).toHaveAttribute('content', dark);
  // With motion off, Animations reads off and no data-alive is set.
  await page.evaluate(() => localStorage.setItem('rnc-motion', 'off'));
  await page.reload();
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).not.toHaveAttribute('data-alive', /.*/);
  // Under an OS reduce setting with no stored choice, Animations reads off; switching it on wins (data-motion=on).
  await page.evaluate(() => localStorage.removeItem('rnc-motion'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
});
