// @ts-check
/**
 * /free-quote/: the six-input quote builder (C5, C2 "Free quote", A13 #10, P1 #5). Owner: quote (W2).
 * Nothing is sent from the site: the form writes a mailto: and a copyable request. Tests read the composed URL from the
 * ready panel's [data-mailto] link instead of following it.
 */
import { test, expect } from 'playwright/test';
import { offline, collectErrors, siteFacts } from '../helpers/server.mjs';

test.beforeEach(async ({ page }) => { await offline(page); });

const URL_ = '/free-quote/';
const form = (/** @type {import('playwright/test').Page} */ page) => page.locator('form[data-quote-form]');

/** Fill every required answer (a phone number only when asked). @param {import('playwright/test').Page} page */
async function fillValid(page, o = { contact: 'email' }) {
  await page.locator('#q-services-irrigation').check();
  await page.locator('#q-area').selectOption('saanich');
  await page.locator('#q-details').fill('Spring start-up for a strata, about 12 zones; one valve leaks by the entrance.');
  await page.locator('#q-timing-this-season').check();
  await page.locator('#q-name').fill('Élodie Tremblay');
  await page.locator(`#q-contact-${o.contact}`).check();
  if (o.contact !== 'email') await page.locator('#q-phone').fill('250 555 0123');
}

test('six inputs, one name field, no email field and no CAPTCHA #six-inputs', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(URL_);
  await expect(form(page)).toHaveCount(1);
  const names = await form(page).locator('input:visible, select:visible, textarea:visible').evaluateAll((els) => [...new Set(els.map((e) => /** @type {HTMLInputElement} */ (e).name))]);
  expect(names).toEqual(['services', 'area', 'details', 'timing', 'name', 'contact']);
  // services: the 4 services as cards plus "Not sure yet"; municipality: the 13 plus somewhere else
  const { services, municipalities } = siteFacts();
  await expect(page.locator('input[name=services]')).toHaveCount(services.length + 1);
  await expect(page.locator('#q-services-not-sure')).toBeVisible();
  await expect(page.locator('#q-area option')).toHaveCount(municipalities.length + 2);
  await expect(page.locator('#q-area option[value=other]')).toHaveCount(1);
  await expect(page.locator('input[name=timing]')).toHaveCount(3);
  await expect(page.locator('input[name=contact]')).toHaveCount(3);
  // one name field, no email field, no CAPTCHA or third-party frame
  await expect(form(page).locator('input[autocomplete=name]')).toHaveCount(1);
  await expect(form(page).locator('input[type=email], [autocomplete=email], [autocomplete=given-name], [autocomplete=family-name]')).toHaveCount(0);
  await expect(page.locator('iframe, [class*=captcha i], [id*=captcha i], .g-recaptcha')).toHaveCount(0);
  // the phone field appears only for call or text
  await expect(page.locator('#q-phone')).toBeHidden();
  await page.locator('#q-contact-call').check();
  await expect(page.locator('#q-phone')).toBeVisible();
  await expect(page.locator('#q-phone')).toHaveAttribute('required', '');
  await page.locator('#q-contact-email').check();
  await expect(page.locator('#q-phone')).toBeHidden();
  expect(errors).toEqual([]);
});

test('page order: H1 → reassurance strip → builder → what happens next (3) → other contacts → privacy note #page-order', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(URL_);
    const parts = ['h1', '[data-quote-reassurance]', 'form[data-quote-form]', '[data-quote-next]', '[data-quote-contacts]', '[data-quote-privacy]'];
    for (const p of parts) await expect(page.locator(p)).toHaveCount(1);
    // document order
    const inOrder = await page.evaluate((sels) => sels.every((s, i) => i === 0 || !!(document.querySelector(sels[i - 1])?.compareDocumentPosition(/** @type {Node} */ (document.querySelector(s))) & Node.DOCUMENT_POSITION_FOLLOWING)), parts);
    expect(inOrder, `DOM order at ${width}`).toBe(true);
    // reading order on screen: each part starts below the previous one, or (from 64em) beside the builder
    const tops = await Promise.all(parts.map(async (p) => (await page.locator(p).boundingBox())?.y ?? -1));
    expect(tops[0]).toBeLessThan(tops[1]);
    expect(tops[1]).toBeLessThan(tops[2]);
    expect(tops[3]).toBeLessThan(tops[4]);
    expect(Math.max(tops[2], tops[4])).toBeLessThan(tops[5]);
    if (width < 1024) expect(tops[2]).toBeLessThan(tops[3]);
  }
  await expect(page.locator('[data-quote-reassurance] li')).toHaveCount(3);
  await expect(page.locator('[data-quote-reassurance]')).toContainText('Free, no obligation');
  await expect(page.locator('[data-quote-reassurance]')).toContainText('We reply within [REPLY TIME]');
  await expect(page.locator('[data-quote-reassurance]')).toContainText('No prices shown here');
  await expect(page.locator('[data-quote-next] h2')).toHaveText('What happens next');
  await expect(page.locator('[data-quote-next] li')).toHaveCount(3);
  await expect(page.locator('[data-quote-privacy] a[href="/privacy/"]')).toHaveCount(1);
  await expect(page.locator('main')).not.toContainText('$');
});

test('?area= and ?service= prefill the builder #prefill', async ({ page }) => {
  await page.goto(`${URL_}?area=oak-bay&service=irrigation`);
  await expect(page.locator('#q-area')).toHaveValue('oak-bay');
  await expect(page.locator('#q-services-irrigation')).toBeChecked();
  await expect(page.locator('input[name=services]:checked')).toHaveCount(1);
  for (const { slug } of siteFacts().municipalities) {
    await page.goto(`${URL_}?area=${slug}`);
    await expect(page.locator('#q-area'), slug).toHaveValue(slug);
  }
  await page.goto(`${URL_}?service=grounds-maintenance,tree-vegetation-management&area=nanaimo`);
  await expect(page.locator('#q-services-grounds-maintenance')).toBeChecked();
  await expect(page.locator('#q-services-tree-vegetation')).toBeChecked();
  await expect(page.locator('#q-area')).toHaveValue('');
  // the composed subject names the prefilled choices
  await page.goto(`${URL_}?area=sooke&service=landscape-installation`);
  await fillValid(page);
  await page.locator('#q-area').selectOption('sooke');
  await page.locator('#q-services-irrigation').uncheck();
  await form(page).locator('button[type=submit]').click();
  await expect(page.locator('[data-quote-summary]')).toHaveValue(/^Subject: Free quote request — Landscape installation — Sooke\n/);
});

test('ready panel: copy request with a status message, the address, call/text, Gmail and Outlook links #ready-panel', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(URL_);
  await fillValid(page, { contact: 'text' });
  await form(page).locator('button[type=submit]').click();
  const ready = page.locator('[data-quote-ready]');
  await expect(ready).toBeVisible();
  await expect(ready.locator('h2')).toBeFocused();
  const request = await page.locator('[data-quote-summary]').inputValue();
  expect(request).toContain('Subject: Free quote request — Irrigation — Saanich');
  expect(request).toContain('Name: Élodie Tremblay');
  expect(request).toContain('Best way to reach me: Text me');
  expect(request).toContain('Phone: 250 555 0123');
  // the mailto: is encoded and short enough for every email app
  const href = /** @type {string} */ (await page.locator('[data-mailto]').getAttribute('href'));
  expect(href).toMatch(/^mailto:\?subject=Free%20quote%20request%20%E2%80%94%20Irrigation%20%E2%80%94%20Saanich&body=/);
  expect(href).toContain('%C3%89lodie');
  expect(href.length).toBeLessThanOrEqual(1800);
  // Copy request → role=status confirmation, and the clipboard holds the full request
  const status = page.locator('[data-copy-status]');
  await expect(status).toHaveAttribute('role', 'status');
  await page.locator('[data-copy]').click();
  await expect(status).toHaveText('Request copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(request);
  // the address as text with its own copy button (chip until [EMAIL] is known)
  await expect(page.locator('[data-address]')).toContainText('[EMAIL]');
  await page.locator('[data-copy-address]').click();
  await expect(status).toHaveText('Address copied');
  // Call / Text: links once [PHONE] is known; until then the number shows as text and no tel:/sms: URL is built
  await expect(page.locator('[data-ready-talk]')).toContainText('[PHONE]');
  await expect(page.locator('main [href^="tel:"], main [href^="sms:"]')).toHaveCount(0);
  // Gmail / Outlook.com convenience links carry the same subject and body
  const gmail = new URL(/** @type {string} */ (await page.locator('[data-webmail=gmail]').getAttribute('href')));
  expect(gmail.hostname).toBe('mail.google.com');
  expect(gmail.searchParams.get('su')).toBe('Free quote request — Irrigation — Saanich');
  expect(gmail.searchParams.get('body')).toContain('Name: Élodie Tremblay');
  const outlook = new URL(/** @type {string} */ (await page.locator('[data-webmail=outlook]').getAttribute('href')));
  expect(outlook.hostname).toBe('outlook.live.com');
  expect(outlook.searchParams.get('subject')).toBe('Free quote request — Irrigation — Saanich');
  await expect(page.locator('[data-webmail=gmail]')).toHaveAttribute('target', '_blank');
  // a long request is shortened in the link, with a note to paste the copied full text
  await page.locator('#q-details').fill('Hedge renewal along the back lane — thuyas, laurel and holly. '.repeat(18));
  await form(page).locator('button[type=submit]').click();
  await expect(page.locator('[data-truncated]')).toBeVisible();
  const long = /** @type {string} */ (await page.locator('[data-mailto]').getAttribute('href'));
  expect(long.length).toBeLessThanOrEqual(1800);
  expect(decodeURIComponent(long.split('&body=')[1])).toMatch(/Paste the full request you copied[^\n]*$/);
  expect(await page.locator('[data-quote-summary]').inputValue()).toContain('Hedge renewal along the back lane — thuyas, laurel and holly. '.repeat(18).trim());
  // Start again clears the answers and the draft
  await page.locator('[data-restart]').click();
  await expect(ready).toBeHidden();
  await expect(page.locator('#q-name')).toHaveValue('');
  expect(await page.evaluate(() => sessionStorage.getItem('rnc-quote-draft'))).toBeNull();
});

test('validation: inline errors tied by aria-describedby, an error summary, values kept #validation', async ({ page }) => {
  await page.goto(URL_);
  await page.locator('#q-name').fill('Alex Example');
  await page.locator('#q-contact-call').check();
  await form(page).locator('button[type=submit]').click();
  const summary = page.locator('[data-error-summary]');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(summary).toHaveAttribute('role', 'alert');
  const items = summary.locator('li a');
  await expect(items).toHaveCount(5); // services, area, details, timing, phone
  for (const f of ['services', 'area', 'details', 'timing', 'phone']) await expect(page.locator(`[data-error-for="${f}"]`), f).toBeVisible();
  await expect(page.locator('[data-error-for="name"]')).toBeHidden();
  await expect(page.locator('[data-quote-ready]')).toBeHidden();
  // errors are described on the control and marked invalid
  await expect(page.locator('#q-area')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#q-area')).toHaveAttribute('aria-describedby', /q-area-help q-area-error/);
  await expect(page.locator('#q-services')).toHaveAttribute('aria-describedby', /q-services-error/);
  await expect(page.locator('#q-phone')).toHaveAttribute('aria-describedby', /q-phone-error/);
  // values are never cleared
  await expect(page.locator('#q-name')).toHaveValue('Alex Example');
  await expect(page.locator('#q-contact-call')).toBeChecked();
  // a summary link moves focus to its field
  await items.filter({ hasText: 'municipality' }).click();
  await expect(page.locator('#q-area')).toBeFocused();
  // fixing a field removes its error and its summary line
  await page.locator('#q-area').selectOption('langford');
  await expect(page.locator('[data-error-for="area"]')).toBeHidden();
  await expect(page.locator('#q-area')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#q-area')).toHaveAttribute('aria-describedby', 'q-area-help');
  await expect(items).toHaveCount(4);
  // a phone number needs its area code
  await page.locator('#q-phone').fill('555 0123');
  await page.locator('#q-phone').blur();
  await expect(page.locator('[data-error-for="phone"]')).toBeVisible();
  // whitespace is not a name
  await page.locator('#q-name').fill('   ');
  await form(page).locator('button[type=submit]').click();
  await expect(page.locator('[data-error-for="name"]')).toBeVisible();
  // all fixed: the email is written and the summary goes away
  await fillValid(page, { contact: 'call' });
  await form(page).locator('button[type=submit]').click();
  await expect(summary).toBeHidden();
  await expect(page.locator('[data-quote-ready]')).toBeVisible();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
});

test('the draft survives leaving the page and coming back, in sessionStorage only #draft-restore', async ({ page }) => {
  await page.goto(URL_);
  await fillValid(page, { contact: 'call' });
  await page.locator('#q-services-grounds-maintenance').check();
  const draft = JSON.parse(/** @type {string} */ (await page.evaluate(() => sessionStorage.getItem('rnc-quote-draft'))));
  expect(draft).toMatchObject({ services: ['grounds-maintenance', 'irrigation'], area: 'saanich', timing: 'this-season', name: 'Élodie Tremblay', contact: 'call', phone: '250 555 0123' });
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => /quote/i.test(k)))).toEqual([]);
  // a fresh navigation (not the back/forward cache) restores every answer
  await page.goto('/');
  await page.goto(URL_);
  await expect(page.locator('#q-services-irrigation')).toBeChecked();
  await expect(page.locator('#q-services-grounds-maintenance')).toBeChecked();
  await expect(page.locator('#q-area')).toHaveValue('saanich');
  await expect(page.locator('#q-details')).toHaveValue(/Spring start-up for a strata/);
  await expect(page.locator('#q-timing-this-season')).toBeChecked();
  await expect(page.locator('#q-name')).toHaveValue('Élodie Tremblay');
  await expect(page.locator('#q-contact-call')).toBeChecked();
  await expect(page.locator('#q-phone')).toBeVisible();
  await expect(page.locator('#q-phone')).toHaveValue('250 555 0123');
  // back navigation after the email app opened
  await form(page).locator('button[type=submit]').click();
  await page.goto('/about/');
  await page.goBack();
  await expect(page.locator('#q-name')).toHaveValue('Élodie Tremblay');
  // a ?area= link does not overwrite the visitor's own answer
  await page.goto(`${URL_}?area=sooke`);
  await expect(page.locator('#q-area')).toHaveValue('saanich');
  // another tab starts empty (sessionStorage is per tab)
  const other = await page.context().newPage();
  await offline(other);
  await other.goto(URL_);
  await expect(other.locator('#q-name')).toHaveValue('');
  await other.close();
});

test('without JS the form opens a mailto; with JS the fallbacks show address, call/text and a status #no-js-and-fallbacks', async ({ browser, page }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const nojs = await ctx.newPage();
  await offline(nojs);
  await nojs.goto(URL_);
  const f = nojs.locator('form[data-quote-form]');
  await expect(f).toHaveAttribute('action', /^mailto:[^?]*\?subject=Free%20quote%20request$/);
  await expect(f).toHaveAttribute('method', 'post');
  await expect(f).toHaveAttribute('enctype', 'text/plain');
  for (const id of ['#q-services-irrigation', '#q-area', '#q-details', '#q-timing-asap', '#q-name', '#q-contact-email', '#q-phone']) await expect(nojs.locator(id), id).toBeVisible();
  await expect(f.locator('button[type=submit]')).toBeVisible();
  await expect(f.locator('[data-quote-ready], [data-error-summary]')).toHaveCount(2);
  await expect(f.locator('[data-quote-ready]')).toBeHidden();
  // native validation guards the no-JS submit
  for (const id of ['#q-area', '#q-details', '#q-name', '#q-timing-asap', '#q-contact-email']) await expect(nojs.locator(id), id).toHaveAttribute('required', '');
  expect(await f.evaluate((el) => /** @type {HTMLFormElement} */ (el).checkValidity())).toBe(false);
  await expect(nojs.locator('.qb__nojs')).toBeVisible();
  // the other ways to reach us need no JS: phone, text, email as text plus chip until the tokens are known
  await expect(nojs.locator('[data-quote-contacts]')).toContainText('[PHONE]');
  await expect(nojs.locator('[data-quote-contacts]')).toContainText('[EMAIL]');
  await ctx.close();

  // With JS: the submit button opens the email app and the ready panel announces the fallbacks.
  await page.goto(URL_);
  await expect(page.locator('.qb__nojs')).toBeHidden();
  await fillValid(page);
  await form(page).locator('button[type=submit]').click();
  await expect(page.locator('[data-quote-ready]')).toBeVisible();
  await expect(page.locator('[data-quote-ready] [data-address]')).toBeVisible();
  await expect(page.locator('[data-ready-talk]')).toBeVisible();
  await expect(page.locator('[data-copy-status][role=status]')).toHaveCount(1);
  await expect(page).toHaveURL(new RegExp(`${URL_}$`));
});

test('analytics events carry no personal data #events-no-pii', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // Pretend a launch build turned Plausible on: inject the script tag and stub the script to record calls.
  await page.route('**/free-quote/', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace('<head>', '<head><script defer data-domain="example.test" src="https://plausible.io/js/script.js"></script>');
    await route.fulfill({ response: res, body });
  });
  await page.route('https://plausible.io/js/script.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.__ev=[];window.plausible=function(n,o){window.__ev.push([n,o||null])};' }));
  await page.goto(URL_);
  await fillValid(page, { contact: 'call' });
  await form(page).locator('button[type=submit]').click();
  await page.locator('[data-copy]').click();
  await expect(page.locator('[data-copy-status]')).toHaveText('Request copied');
  await page.locator('[data-webmail=gmail]').evaluate((a) => a.addEventListener('click', (e) => e.preventDefault()));
  await page.locator('[data-webmail=gmail]').click();
  const ev = /** @type {[string, any][]} */ (await page.evaluate(() => /** @type {any} */ (window).__ev));
  expect(ev.map(([n]) => n)).toEqual(['quote_started', 'quote_mailto_opened', 'quote_copied', 'quote_webmail_opened']);
  expect(ev[1][1]).toEqual({ props: { service: 'irrigation', area: 'saanich' } });
  expect(ev[3][1]).toEqual({ props: { provider: 'gmail' } });
  const text = JSON.stringify(ev);
  for (const pii of ['Élodie', 'Tremblay', '250', '555', '0123', 'strata', 'valve']) expect(text, pii).not.toContain(pii);
});
