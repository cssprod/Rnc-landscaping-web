// @ts-check
/**
 * Quote analytics (CONTRACT §13; C5.6): Plausible custom events carry no personal data, and the event schema and its
 * generated types agree. Owner: quote. Checks: unit/quote-events.test#no-pii.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** @type {any} */ (globalThis).document ??= { querySelector: () => null };
const Q = await import('../../src/scripts/quote.js');
const { generate, parseEvents } = await import('../../tools/gen-event-types.mjs');

const read = (/** @type {string} */ rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const siteJson = JSON.parse(read('../../../content/site.json'));
const SERVICES = siteJson.services.map((/** @type {any} */ s) => s.slug);
const AREAS = siteJson.municipalities.map((/** @type {any} */ m) => m.slug);
const known = { services: SERVICES, areas: AREAS };
const yaml = read('../../event-schema.yaml');
const events = parseEvents(yaml);
const quoteSrc = read('../../src/scripts/quote.js');

/** Personal data a visitor might type into the builder. */
const PII = ['Alex Example', '250 555 0123', '2505550123', 'alex@example.ca', '1234 Rockland Ave', 'my back hedge'];

test('quote events carry only fixed slugs, never a name, phone, email, address or description #no-pii', () => {
  const allowedService = new Set([...SERVICES, 'multiple', 'not-sure']);
  const allowedArea = new Set([...AREAS, 'other']);
  /** Every shape a visitor's answers can take, including hostile values in the option fields. */
  const picks = [
    { services: [], area: '' },
    { services: ['not-sure'], area: 'other' },
    { services: ['irrigation'], area: 'saanich' },
    { services: ['irrigation', 'not-sure'], area: 'oak-bay' },
    { services: ['irrigation', 'grounds-maintenance'], area: 'sooke' },
    { services: [PII[0]], area: PII[1] },
    { services: ['irrigation', PII[2]], area: PII[3] },
    ...SERVICES.flatMap((/** @type {string} */ s) => AREAS.map((/** @type {string} */ a) => ({ services: [s], area: a }))),
  ];
  for (const pick of picks) {
    const props = Q.mailtoEventProps({ ...pick, name: PII[0], phone: PII[1], details: PII[5] }, known);
    assert.deepEqual(Object.keys(props).sort(), ['area', 'service'], JSON.stringify(pick));
    assert.ok(allowedService.has(props.service), `service ${props.service}`);
    assert.ok(allowedArea.has(props.area), `area ${props.area}`);
    const text = JSON.stringify(props);
    for (const p of PII) assert.ok(!text.includes(p), `${p} leaked into ${text}`);
  }
  assert.deepEqual(Q.mailtoEventProps({ services: ['irrigation', 'tree-vegetation'], area: 'victoria' }, known), { service: 'multiple', area: 'victoria' });
  assert.deepEqual(Q.mailtoEventProps({ services: ['not-sure'], area: 'other' }, known), { service: 'not-sure', area: 'other' });
  assert.deepEqual(Q.webmailEventProps('gmail'), { provider: 'gmail' });
  assert.deepEqual(Q.webmailEventProps(PII[3]), { provider: 'outlook' });

  // quote.js sends exactly the §13 quote events, with props only from the two builders above (or none).
  const calls = [...quoteSrc.matchAll(/\btrack\(([^;]*?)\);/g)].map((m) => m[1].trim());
  assert.ok(calls.length >= 4, calls.join(' | '));
  for (const c of calls) {
    assert.match(c, /^'(quote_started|quote_mailto_opened|quote_copied|quote_webmail_opened)'(?:, (?:mailtoEventProps|webmailEventProps)\()?/, c);
    assert.doesNotMatch(c, /\b(name|phone|details|req|request|value|summary|body)\b(?!\))/i, c);
  }
  const sent = new Set(calls.map((c) => /^'([a-z_]+)'/.exec(c)?.[1]));
  assert.deepEqual([...sent].sort(), ['quote_copied', 'quote_mailto_opened', 'quote_started', 'quote_webmail_opened']);

  // The schema declares no free-text property on a quote event: enums, or the area slug.
  for (const name of ['quote_started', 'quote_mailto_opened', 'quote_copied', 'quote_webmail_opened']) {
    const e = events[name];
    assert.ok(e && !e.deprecated, name);
    for (const [prop, spec] of Object.entries(e.props)) {
      assert.ok(spec.type === 'enum' || (name === 'quote_mailto_opened' && prop === 'area'), `${name}.${prop} is ${spec.type}`);
    }
  }
});

test('event schema: CONTRACT §13 names present, v2 quote events retired, d.ts generated from the YAML #schema', () => {
  for (const n of ['quote_started', 'quote_mailto_opened', 'quote_copied', 'quote_webmail_opened', 'call_click', 'sms_click', 'email_click', 'capability_statement_downloaded']) {
    assert.ok(events[n] && !events[n].deprecated, n);
  }
  for (const n of ['quote_submitted', 'quote_step_completed']) assert.equal(events[n], undefined, n);
  for (const [n, e] of Object.entries(events)) if (e.deprecated) assert.ok(['call_clicked', 'email_clicked'].includes(n), `${n} is deprecated but still listed`);
  assert.equal(read('../../event-schema.d.ts'), generate(yaml), 'event-schema.d.ts is stale: run node tools/gen-event-types.mjs');
  // The data-track names the quote templates emit are live §13 names.
  const forms = read('../../src/components/forms.mjs');
  for (const m of forms.matchAll(/data-track="([a-z_]+)"/g)) assert.ok(events[m[1]] && !events[m[1]].deprecated, m[1]);
});
