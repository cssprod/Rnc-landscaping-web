// Unit tests for the pure quote builders in src/scripts/quote.js.
// Run: node --test site/tests/unit/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAILTO_MAX, TRUNCATION_NOTICE, enc, crlf, buildSubject, buildBody, buildMailto, buildWebmail, buildSms,
  validate, phoneRequired, validPhone, cleanAddress, mailtoEventProps,
} from '../../src/scripts/quote.js';

const labels = {
  services: { irrigation: 'Irrigation', 'grounds-maintenance': 'Grounds maintenance', 'tree-vegetation': 'Tree and vegetation work' },
  area: { saanich: 'Saanich', 'oak-bay': 'Oak Bay' },
  timing: { 'this-season': 'This season' },
  contact: { email: 'Reply by email', call: 'Call me', text: 'Text me' },
};
const base = { services: ['irrigation'], area: 'saanich', description: 'Two zones are not working after winter.', timing: 'this-season', name: 'Sam', contact: 'email', phone: '' };

test('subject format: "Free quote request — Irrigation — Saanich"', () => {
  assert.equal(buildSubject(base, labels), 'Free quote request — Irrigation — Saanich');
  assert.equal(buildSubject({ ...base, services: ['irrigation', 'grounds-maintenance'], area: 'oak-bay' }, labels), 'Free quote request — Irrigation, Grounds maintenance — Oak Bay');
  assert.equal(buildSubject({ ...base, area: '' }, labels), 'Free quote request — Irrigation');
  assert.equal(buildSubject({}, labels), 'Free quote request');
});

test('encoding: CRLF newlines, em dash, ampersand, plus, hash and non-Latin text round-trip', () => {
  assert.equal(crlf('a\nb\r\nc\rd'), 'a\r\nb\r\nc\r\nd');
  assert.equal(enc('a\nb'), 'a%0D%0Ab');
  const tricky = 'Fence & gate + 2 hedges #3 — café, 50% shade? 木 🌲';
  const { url } = buildMailto({ to: 'quotes@example.com', subject: buildSubject(base, labels), body: tricky });
  assert.ok(url.startsWith('mailto:quotes@example.com?subject='));
  assert.ok(!/[\s&]body=.*[&#\s]/.test(url.split('&body=')[1]), 'body has no raw &, # or spaces');
  const params = new URLSearchParams(url.slice(url.indexOf('?') + 1).replace(/\+/g, '%2B'));
  assert.equal(params.get('subject'), 'Free quote request — Irrigation — Saanich');
  assert.equal(params.get('body'), tricky);
  assert.ok(url.includes('%E2%80%94'), 'em dash is percent-encoded');
});

test('unknown address token is not used as a recipient', () => {
  assert.equal(cleanAddress('[EMAIL]'), '');
  assert.equal(cleanAddress(' hello@example.ca '), 'hello@example.ca');
  assert.ok(buildMailto({ to: '[EMAIL]', subject: 's', body: 'b' }).url.startsWith('mailto:?subject='));
});

test('body lists the answers and includes the phone only for call or text', () => {
  const b = buildBody(base, labels);
  for (const line of ['Services: Irrigation', 'Municipality: Saanich', 'Timing: This season', 'Name: Sam', 'Best way to reach me: Reply by email', base.description]) assert.ok(b.includes(line), line);
  assert.ok(!buildBody({ ...base, phone: '250 555 0123' }, labels).includes('250'));
  assert.ok(buildBody({ ...base, contact: 'call', phone: '250 555 0123' }, labels).includes('Best way to reach me: Call me at 250 555 0123'));
});

test('length cap: short requests are untouched, long ones are cut to fit with a notice', () => {
  const short = buildMailto({ to: 'q@example.com', subject: 'Free quote request', body: buildBody(base, labels) });
  assert.equal(short.truncated, false);
  assert.ok(short.url.length <= MAILTO_MAX);

  const long = buildBody({ ...base, description: 'Hedge along the back fence, roughly forty metres. '.repeat(40) }, labels);
  const m = buildMailto({ to: 'q@example.com', subject: buildSubject(base, labels), body: long });
  assert.equal(m.truncated, true);
  assert.ok(m.url.length <= MAILTO_MAX, `url ${m.url.length} chars`);
  assert.ok(m.url.length > MAILTO_MAX - 120, 'uses most of the available room');
  assert.ok(m.bodyText.endsWith(TRUNCATION_NOTICE));
  assert.ok(decodeURIComponent(m.url.split('&body=')[1]).replace(/\r\n/g, '\n').endsWith(TRUNCATION_NOTICE));

  // Multi-byte text (each emoji is 12 encoded chars) is never split mid-character.
  const emoji = buildMailto({ to: '', subject: 's', body: '🌲'.repeat(400) });
  assert.equal(emoji.truncated, true);
  assert.ok(emoji.url.length <= MAILTO_MAX);
  assert.doesNotThrow(() => decodeURIComponent(emoji.url.split('&body=')[1]));

  for (const max of [200, 600, 1000]) assert.ok(buildMailto({ to: 'q@example.com', subject: 's', body: long, max }).url.length <= max, `cap ${max}`);
});

test('webmail links carry the same subject and body', () => {
  const g = buildWebmail('gmail', { to: 'q@example.com', subject: 'Free quote request — Irrigation — Saanich', body: 'Hi\nthere' });
  assert.ok(g.url.startsWith('https://mail.google.com/mail/?view=cm&fs=1&to=q%40example.com&su=Free%20quote%20request%20%E2%80%94'));
  assert.ok(g.url.endsWith('&body=Hi%0D%0Athere'));
  const o = buildWebmail('outlook', { to: '', subject: 's', body: 'b' });
  assert.equal(o.url, 'https://outlook.live.com/mail/0/deeplink/compose?to=&subject=s&body=b');
});

test('sms link uses digits only and an encoded short body', () => {
  assert.equal(buildSms('250-555-0123', 'Hi RNC, quote sent'), 'sms:2505550123?body=Hi%20RNC%2C%20quote%20sent');
  assert.equal(buildSms('', 'x'), '');
});

test('phone requirement: required for call or text, not for email', () => {
  assert.equal(phoneRequired('call'), true);
  assert.equal(phoneRequired('text'), true);
  assert.equal(phoneRequired('email'), false);
  assert.deepEqual(validate(base), {});
  assert.deepEqual(validate({ ...base, contact: 'call' }), { phone: 'required' });
  assert.deepEqual(validate({ ...base, contact: 'text', phone: '555 01' }), { phone: 'format' });
  assert.deepEqual(validate({ ...base, contact: 'text', phone: '(250) 555-0123' }), {});
  assert.deepEqual(validate({ ...base, contact: 'email', phone: 'not a number' }), {}, 'hidden phone is ignored');
});

test('phone format', () => {
  for (const ok of ['250 555 0123', '(250) 555-0123', '1-250-555-0123', '+44 20 7946 0958']) assert.ok(validPhone(ok), ok);
  for (const bad of ['', '555-0123', '250 555 012', 'call me', '250 555 0123 ext 4']) assert.ok(!validPhone(bad), bad);
});

test('validation: required fields, description length, field order', () => {
  assert.deepEqual(Object.keys(validate({})), ['services', 'area', 'description', 'timing', 'name', 'contact']);
  assert.equal(validate({ ...base, description: 'short' }).description, 'minLength');
  assert.equal(validate({ ...base, description: 'x'.repeat(2001) }).description, 'maxLength');
  assert.equal(validate({ ...base, name: '   ' }).name, 'required');
});

test('analytics props carry no personal data', () => {
  assert.deepEqual(mailtoEventProps(base), { service: 'irrigation', area: 'saanich' });
  assert.deepEqual(mailtoEventProps({ ...base, services: ['irrigation', 'tree-vegetation'] }), { service: 'multiple', area: 'saanich' });
  assert.deepEqual(Object.keys(mailtoEventProps({ ...base, name: 'Sam', phone: '2505550123' })), ['service', 'area']);
});
