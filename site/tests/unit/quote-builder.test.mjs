// @ts-check
/**
 * Quote builder (C5; CONTRACT §6, §12): the pure string builders in scripts/quote.js and the rendered form.
 * Owner: quote. Checks: unit/quote-builder.test#mailto (C5.2).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testEnv } from '../helpers/env.mjs';

// quote.js is a browser module: give it an empty document so it loads in node without wiring anything.
/** @type {any} */ (globalThis).document ??= { querySelector: () => null };
const Q = await import('../../src/scripts/quote.js');
const { quoteForm, quoteContacts } = await import('../../src/components/forms.mjs');
const { routes } = await import('../../src/pages/quote.mjs');

const page = JSON.parse(readFileSync(new URL('../../../content/pages/quote.json', import.meta.url), 'utf8'));
const siteJson = JSON.parse(readFileSync(new URL('../../../content/site.json', import.meta.url), 'utf8'));
const TEMPLATE = page.subject;

test('subject: "Free quote request — X — Y" from the content template; empty parts drop with their dash #subject', () => {
  assert.equal(Q.buildSubject(TEMPLATE, { services: ['Irrigation'], area: 'Saanich' }), 'Free quote request — Irrigation — Saanich');
  assert.equal(Q.buildSubject(TEMPLATE, { services: ['Irrigation', 'Grounds maintenance'], area: 'Oak Bay' }), 'Free quote request — Irrigation, Grounds maintenance — Oak Bay');
  assert.equal(Q.buildSubject(TEMPLATE, { services: [], area: 'Sooke' }), 'Free quote request — Sooke');
  assert.equal(Q.buildSubject(TEMPLATE, { services: ['Not sure yet'] }), 'Free quote request — Not sure yet');
  assert.equal(Q.buildSubject(TEMPLATE), 'Free quote request');
});

test('body: one "Label: value" line per answer, the description as its own paragraph, no empty lines for skipped answers #body', () => {
  const body = Q.buildBody({ services: ['Irrigation'], area: 'Saanich', timing: 'This season', name: 'Alex Example', contact: 'Reply by email', phone: '', details: 'Line one\r\nLine two' }, page.summary);
  assert.equal(body, [
    'Free quote request', '',
    'Services: Irrigation', 'Municipality: Saanich', 'Timing: This season', 'Name: Alex Example', 'Best way to reach me: Reply by email', '',
    'About the property or job:', 'Line one', 'Line two', '',
    page.summary.footer,
  ].join('\n'));
  assert.ok(!/^Phone:/m.test(body), 'no phone line without a phone number');
});

test('mailto: encoded subject and body, URL at most 1,800 characters, truncation note, works for non-ASCII #mailto', () => {
  // Short request: nothing is cut; RFC 6068 encoding (UTF-8, %20, CRLF line breaks).
  const subject = Q.buildSubject(TEMPLATE, { services: ['Irrigation'], area: 'Saanich' });
  const short = Q.buildMailto('', subject, 'Name: Élodie\nCafé & co: 100% sure?');
  assert.equal(short.truncated, false);
  assert.ok(short.href.startsWith('mailto:?subject=Free%20quote%20request%20%E2%80%94%20Irrigation%20%E2%80%94%20Saanich&body='), short.href);
  assert.ok(short.href.includes('%C3%89lodie%0D%0ACaf%C3%A9%20%26%20co%3A%20100%25%20sure%3F'), short.href);
  assert.ok(!/[ \n+]/.test(short.href.slice(7)), 'no raw spaces, newlines or ambiguous + in the URL');

  // A recipient is used only once [EMAIL] is a real address (CONTRACT §3: never a URL on a token).
  assert.ok(Q.buildMailto('hello@example.ca', 's', 'b').href.startsWith('mailto:hello@example.ca?subject='));
  assert.ok(Q.buildMailto('[EMAIL]', 's', 'b').href.startsWith('mailto:?subject='));

  // Long request (multi-byte text that expands 3–12× when encoded): the URL stays within 1,800 characters.
  const long = ['Free quote request', '', 'Name: Zoë Ångström', '', 'About the property or job:', 'Haie de thuyas — élagage 🌲 '.repeat(200)].join('\n');
  for (const to of ['', 'quotes@example.ca']) {
    const m = Q.buildMailto(to, subject, long);
    assert.equal(m.truncated, true);
    assert.ok(m.href.length <= Q.MAX_URL, `URL is ${m.href.length} characters`);
    assert.ok(m.href.length > Q.MAX_URL - 200, 'uses most of the budget');
    const decoded = decodeURIComponent(m.href.split('&body=')[1]); // throws on a cut-in-half character
    assert.ok(decoded.endsWith('Paste the full request you copied.'), 'tells the visitor to paste the full copied text');
    assert.ok(decoded.startsWith('Free quote request\r\n\r\nName: Zoë Ångström'), 'keeps the start of the request');
    assert.equal(m.body, decoded.replace(/\r\n/g, '\n'));
  }
  // The content note is used when given, and the cap is configurable.
  const custom = Q.buildMailto('', subject, long, { max: 600, note: page.messages.truncatedNote });
  assert.ok(custom.href.length <= 600 && custom.body.endsWith(page.messages.truncatedNote));

  // capLength never splits a surrogate pair and respects any budget.
  for (const max of [40, 41, 42, 43, 44, 45, 60, 99]) {
    const c = Q.capLength('🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲', max, { note: 'cut' });
    assert.ok(Q.encodeMail(c.text).length <= max, `max ${max}`);
    assert.doesNotThrow(() => decodeURIComponent(Q.encodeMail(c.text)));
  }
});

test('webmail and sms links: Gmail / Outlook compose URLs; no sms: until the phone number is known #webmail', () => {
  const g = new URL(Q.buildWebmail('gmail', 'quotes@example.ca', 'Free quote request — Irrigation', 'A\nB é'));
  assert.equal(g.origin, 'https://mail.google.com');
  assert.equal(g.searchParams.get('to'), 'quotes@example.ca');
  assert.equal(g.searchParams.get('su'), 'Free quote request — Irrigation');
  assert.equal(g.searchParams.get('body'), 'A\r\nB é');
  const o = new URL(Q.buildWebmail('outlook', '[EMAIL]', 'S', 'B'));
  assert.equal(o.origin, 'https://outlook.live.com');
  assert.equal(o.searchParams.get('to'), null, 'no recipient while [EMAIL] is unresolved');
  assert.equal(o.searchParams.get('subject'), 'S');
  assert.equal(Q.buildSms('[PHONE]', 'hi'), '');
  assert.equal(Q.buildSms('', 'hi'), '');
  assert.equal(Q.buildSms('+12505550123', 'Hi RNC: Irrigation, Saanich.'), 'sms:+12505550123?body=Hi%20RNC%3A%20Irrigation%2C%20Saanich.');
  assert.equal(Q.buildSms('250-555-0123'), 'sms:2505550123');
});

test('prefill: ?service= takes slugs (comma list, repeats, retired alias) and ?area= one of the 13 #prefill', () => {
  const services = siteJson.services.map((/** @type {any} */ s) => s.slug);
  const areas = siteJson.municipalities.map((/** @type {any} */ a) => a.slug);
  assert.deepEqual(Q.prefillServices(new URLSearchParams('service=irrigation'), services), ['irrigation']);
  assert.deepEqual(Q.prefillServices(new URLSearchParams('service=irrigation,tree-vegetation-management&service=nope'), services), ['irrigation', 'tree-vegetation']);
  for (const s of services) assert.deepEqual(Q.prefillServices(new URLSearchParams(`service=${s}`), services), [s], s);
  for (const a of areas) assert.equal(Q.prefillArea(new URLSearchParams(`area=${a}`), areas), a, a);
  assert.equal(Q.prefillArea(new URLSearchParams('area=Oak-Bay'), areas), 'oak-bay');
  assert.equal(Q.prefillArea(new URLSearchParams('area=nanaimo'), areas), '');
});

test('phone check: 10–15 digits #phone', () => {
  assert.equal(Q.phoneLooksValid('250 555 0123'), true);
  assert.equal(Q.phoneLooksValid('+1 (250) 555-0123'), true);
  assert.equal(Q.phoneLooksValid('555 0123'), false);
  assert.equal(Q.phoneLooksValid(''), false);
});

test('the form: six inputs, a mailto action that works without JS, no email field, options from site.json #form', () => {
  const html = String(quoteForm({}, page));
  const form = /<form[^>]*>/.exec(html)?.[0] || '';
  assert.match(form, /\smethod="post"/);
  assert.match(form, /\senctype="text\/plain"/);
  assert.match(form, /\saction="mailto:\?subject=Free%20quote%20request"/, 'no recipient while [EMAIL] is unresolved');
  assert.match(form, /\sdata-quote-form/);
  assert.doesNotMatch(form, /\snovalidate/, 'native validation stays on without JS');
  const names = [...new Set([...html.matchAll(/<(?:input|select|textarea)\b[^>]*\sname="([^"]+)"/g)].map((m) => m[1]))];
  assert.deepEqual(names, ['services', 'area', 'details', 'timing', 'name', 'contact', 'phone']);
  assert.doesNotMatch(html, /type="email"|autocomplete="(?:email|given-name|family-name)"|captcha/i);
  for (const s of siteJson.services) assert.match(html, new RegExp(`name="services" value="${s.slug}"`), s.slug);
  assert.match(html, /name="services" value="not-sure"/);
  const options = [...html.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(options, ['', ...siteJson.municipalities.map((/** @type {any} */ m) => m.slug), 'other']);
  assert.match(html, /<select id="q-area" name="area" required/);
  assert.match(html, /<textarea id="q-details" name="details"[^>]*\srequired/);
  assert.match(html, /<input id="q-name" name="name" type="text" required autocomplete="name"/);
  assert.match(html, /data-show-when="contact=call,text"/);
  // Inline errors are tied by aria-describedby only while shown (quote.js), so a hidden error is never read out.
  assert.doesNotMatch(html, /aria-describedby="[^"]*-error/);
  for (const hook of ['data-error-summary', 'data-quote-ready', 'data-copy', 'data-copy-status', 'data-mailto', 'data-webmail="gmail"', 'data-webmail="outlook"', 'data-restart']) assert.ok(html.includes(hook), hook);
  assert.match(html, /role="status" data-copy-status/);
  // Messages quote.js writes from data-* get the same curly quotes as the server-rendered text.
  assert.match(html, /data-field="timing" data-msg="Choose when you’d like the work done\."/);
  assert.doesNotMatch(html, /data-(?:msg|copy-failed|truncated-note|label-[a-z-]+)="[^"]*(?:&#39;|')/);
});

test('ready panel: Call / Text links only once the phone number is known; never a URL on a token #ready-links', () => {
  const unknown = String(quoteForm({}, page)) + String(quoteContacts(page));
  assert.doesNotMatch(unknown, /href="(?:tel|sms):/);
  assert.doesNotMatch(unknown, /\s(?:href|action|src)="[^"]*(?:\[[A-Z ]+\]|%5B)/);
  // Copy address only once [EMAIL] is known: never a placeholder on the clipboard.
  assert.doesNotMatch(unknown, /data-copy-address/);
  const known = String(quoteForm({}, page, { phone: '250-555-0123', email: 'quotes@example.ca' }));
  assert.match(known, /<a class="btn btn--secondary" href="tel:\+12505550123" data-track="call_click" data-track-location="quote_ready">/);
  assert.match(known, /href="sms:\+12505550123" data-sms data-phone="\+12505550123" data-track="sms_click" data-track-location="quote_ready"/);
  assert.match(known, /action="mailto:quotes@example\.ca\?subject=Free%20quote%20request"/);
  assert.match(known, /<strong>quotes@example\.ca<\/strong><\/span>\s*<button type="button" class="btn btn--secondary btn--sm" data-copy-address>/);
  const contacts = String(quoteContacts(page, { phone: '250-555-0123', email: 'quotes@example.ca' }));
  assert.match(contacts, /href="tel:\+12505550123" data-track="call_click" data-track-location="quote_aside"/);
  assert.match(contacts, /href="sms:\+12505550123" data-track="sms_click" data-track-location="quote_aside"/);
  assert.match(contacts, /href="mailto:quotes@example\.ca" data-track="email_click" data-track-location="quote_aside"/);
});

test('/free-quote/ order: H1 → reassurance → builder → what happens next (3) → other contacts → privacy #page-order-unit', () => {
  const env = testEnv();
  const r = routes(env).find((x) => x.path === '/free-quote/');
  assert.ok(r);
  assert.deepEqual(r.scripts, ['quote']);
  const html = String(r.render());
  const at = (/** @type {RegExp} */ re) => { const m = re.exec(html); assert.ok(m, String(re)); return /** @type {RegExpExecArray} */ (m).index; };
  const order = [/<h1\b/, /data-quote-reassurance/, /<form[^>]*data-quote-form/, /data-quote-next/, /data-quote-contacts/, /data-quote-privacy/].map(at);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /We reply within \[REPLY TIME\]/);
  assert.equal((/<ol class="quote-next__list">([\s\S]*?)<\/ol>/.exec(html)?.[1].match(/<li>/g) || []).length, 3);
  assert.doesNotMatch(html, /\$\s?\d/, 'no prices');
});
