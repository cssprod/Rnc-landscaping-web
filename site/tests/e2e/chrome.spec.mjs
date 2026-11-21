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
  await expect(toggle).toHaveAccessibleName('Close menu');
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
