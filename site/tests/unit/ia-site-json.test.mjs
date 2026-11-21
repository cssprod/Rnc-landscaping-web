// @ts-check
/**
 * P0 #1: content/site.json is the single source for NAP, founding year, hours, licences and municipalities.
 * Each consumer (header, footer, JSON-LD, pages) is proven to read it: the in-memory site.json/token values are
 * changed and the rendered output must follow.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { siteJson, tokens, site, siteJsonPath } from '../../site.config.mjs';
import { finalizeTokens } from '../../src/lib/tokens.mjs';
import { routes } from '../../src/pages/routes.mjs';
import { testEnv } from '../helpers/env.mjs';

const SITE = fileURLToPath(new URL('../..', import.meta.url));
const real = JSON.parse(readFileSync(fileURLToPath(new URL('../../../content/site.json', import.meta.url)), 'utf8'));

/** Render one page like the build does (tokens resolved). @param {string} path */
function page(path, env = testEnv()) {
  const r = routes(env).find((x) => x.path === path);
  assert.ok(r, path);
  return finalizeTokens(String(r.render()), { launch: env.launch, file: r.file, issues: [], html: true });
}
const footer = (/** @type {string} */ h) => h.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0] || '';
const header = (/** @type {string} */ h) => h.match(/<header class="site-header"[\s\S]*?<\/header>/)?.[0] || '';
const business = (/** @type {string} */ h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((o) => /Business$/.test(o['@type']));

test('site.config reads content/site.json: tokens, services and municipalities #consumers', () => {
  assert.equal(siteJsonPath, fileURLToPath(new URL('../../../content/site.json', import.meta.url)));
  assert.deepEqual(Object.keys(tokens), Object.keys(real.tokens));
  for (const [k, v] of Object.entries(real.tokens)) assert.equal(tokens[/** @type {keyof typeof tokens} */ (k)], v, k);
  assert.deepEqual(site.services, real.services.map((/** @type {any} */ s) => s.slug));
  assert.deepEqual(site.areas, real.municipalities.map((/** @type {any} */ m) => m.slug));
  assert.equal(site.areas.length, 13);
  assert.equal(site.services.length, 4);
});

test('header, footer and JSON-LD follow site.json NAP, hours, founding year and credentials #consumers', () => {
  const saved = { ...tokens };
  Object.assign(tokens, { PHONE: '250-555-0199', EMAIL: 'hello@example.test', ADDRESS: '1 Test Road, Victoria', HOURS: 'Mon–Fri 8–4', FOUNDED: '2001', LICENCES: 'Licence TEST-1', 'GOOGLE PROFILE': 'https://g.page/example-test' });
  try {
    const h = page('/');
    const f = footer(h);
    assert.match(f, /href="tel:\+12505550199"/);
    assert.match(f, /href="sms:\+12505550199"/);
    assert.match(f, /href="mailto:hello@example.test"/);
    assert.ok(f.includes('1 Test Road, Victoria'));
    assert.ok(f.includes('Mon–Fri 8–4'));
    assert.match(f, /href="https:\/\/g\.page\/example-test"[^>]*>Google profile/);
    assert.match(header(h), /href="tel:\+12505550199"/);
    const b = business(h);
    assert.equal(b.telephone, '250-555-0199');
    assert.equal(b.email, 'hello@example.test');
    assert.equal(b.address.streetAddress, '1 Test Road, Victoria');
    assert.equal(b.foundingDate, '2001');
    assert.ok(!f.includes('2001') && !header(h).includes('2001'), 'the founding year never shows in visible copy');
    assert.ok(h.includes('Licence TEST-1'), 'credentials band reads site.json credentials');
    assert.ok(page('/contact/').includes('Mon–Fri 8–4'), 'contact cards read site.json hours');
  } finally { Object.assign(tokens, saved); }
});

test('the footer copyright takes the legal name as it is, with one period after "Ltd." #consumers', () => {
  const saved = { ...tokens };
  try {
    Object.assign(tokens, { 'LEGAL NAME': 'RNC Test Ltd.', YEAR: '2026' });
    const f = footer(page('/'));
    assert.ok(f.includes('© 2026 RNC Test Ltd. Serving'), f.match(/©[^<]*/)?.[0]);
    Object.assign(tokens, { 'LEGAL NAME': 'RNC Test Inc' });
    assert.ok(footer(page('/')).includes('© 2026 RNC Test Inc. Serving'));
  } finally { Object.assign(tokens, saved); }
});

test('municipalities and service labels come from site.json in the nav, footer and areaServed #consumers', () => {
  const m0 = siteJson.municipalities[0].name;
  const s0 = siteJson.services[0].navLabel;
  siteJson.municipalities[0].name = 'Victoria-from-site-json';
  siteJson.services[0].navLabel = 'Grounds-from-site-json';
  try {
    const h = page('/');
    assert.ok(footer(h).includes('>Victoria-from-site-json</a>'));
    assert.ok(header(h).includes('>Victoria-from-site-json</a>'));
    assert.ok(header(h).includes('Grounds-from-site-json'));
    assert.ok(footer(h).includes('Grounds-from-site-json'));
    assert.ok(business(h).areaServed.some((/** @type {any} */ a) => a.name === 'Victoria-from-site-json, BC'));
    const svc = page('/services/irrigation/');
    const ld = [...svc.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((o) => o['@type'] === 'Service');
    assert.ok(ld.areaServed.some((/** @type {any} */ a) => a.name === 'Victoria-from-site-json, BC'));
  } finally { siteJson.municipalities[0].name = m0; siteJson.services[0].navLabel = s0; }
});

test('unresolved tokens never go into an href; launch omits the optional Google profile link #consumers', () => {
  const h = page('/');
  const f = footer(h);
  assert.ok(!/href="(?:tel|sms|mailto):\[/.test(h));
  assert.ok(f.includes('Google profile'));
  assert.match(f, /<mark class="ph"[^>]*>\[PHONE\]<\/mark>/);
  const launch = String(routes(testEnv({ launch: true })).find((r) => r.path === '/')?.render());
  assert.ok(!footer(launch).includes('Google profile'));
});

test('no template types a NAP value, founding year or municipality list (check-content single-source) #consumers', () => {
  // Template findings only (content files are other streams' and are gated by check-content itself).
  const r = spawnSync(process.execPath, ['tools/check-content.mjs', '--all', '--rules=single-source,municipality-list,gbp-alignment,nap-consistency'], { cwd: SITE, encoding: 'utf8', env: { ...process.env, SITE_DIST: '/nonexistent-dist' } });
  const out = `${r.stdout}${r.stderr}`;
  assert.ok(!/site\/src\//.test(out), out);
  assert.ok(!/content\/site\.json/.test(out), out);
});
