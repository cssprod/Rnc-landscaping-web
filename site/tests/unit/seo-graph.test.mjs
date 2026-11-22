// @ts-check
/**
 * C6.1: one @id JSON-LD graph per page (lib/schema.mjs + lib/seo.mjs). The graph is rendered through the real routes and
 * layout, the way the build does it, and its shape is snapshotted for a home, service, area, project and guide page.
 * Content strings (names, descriptions, questions) are masked in the snapshots, so content edits do not break them;
 * the @types, @ids, references, site.json facts and the set of properties are compared exactly.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tokens, siteJson } from '../../site.config.mjs';
import { finalizeTokens } from '../../src/lib/tokens.mjs';
import { routes } from '../../src/pages/routes.mjs';
import * as schema from '../../src/lib/schema.mjs';
import { graph, headMeta, jsonLd, ldJson, ogCard, ogKey, ogType, pageType } from '../../src/lib/seo.mjs';
import { testEnv } from '../helpers/env.mjs';

/** Render one route like build.mjs (tokens resolved, chips in showcase). @param {string} path @param {any} [env] */
function render(path, env = testEnv()) {
  const r = routes(env).find((x) => x.path === path);
  assert.ok(r, path);
  return finalizeTokens(String(r.render()), { launch: env.launch, file: r.file, issues: [], html: true });
}
/** @param {string} h */
const ldBlocks = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

/** Content strings masked in snapshots (site.json facts such as place and service names are kept). */
const MASK = new Set(['name', 'description', 'headline', 'text', 'datePublished', 'dateModified', 'image', 'serviceType']);
/** @param {any} owner */
const keepName = (owner) => ['AdministrativeArea', 'WebSite', 'OfferCatalog'].includes(owner?.['@type'])
  || (owner?.['@type'] === 'Service' && !owner.description) || owner?.['@type'] === schema.BUSINESS_TYPE;
/** Shape of a graph for snapshots: content strings masked, FAQ questions counted. @param {any} v @param {string} [k] @param {any} [owner] */
function shape(v, k = '', owner = null) {
  if (Array.isArray(v)) return k === 'mainEntity' ? `<${v.length} questions>` : v.map((x) => shape(x, k, owner));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([kk, x]) => [kk, shape(x, kk, v)]));
  if (typeof v === 'string' && MASK.has(k) && !(k === 'name' && keepName(owner))) return '<text>';
  return v;
}

const AREAS = siteJson.municipalities.map((m) => ({ '@type': 'AdministrativeArea', '@id': `/areas/${m.slug}/#place`, name: `${m.name}, BC` }));
const CATALOG = siteJson.services.map((s) => ({ '@type': 'Service', '@id': `/services/${s.slug}/#service`, name: s.name, url: `/services/${s.slug}/` }));
const BUSINESS = {
  '@type': 'HomeAndConstructionBusiness', '@id': '/#business', name: 'RNC Landscaping', url: '/',
  logo: { '@type': 'ImageObject', url: '/assets/brand/icon-512.png', width: 512, height: 512 }, image: '<text>',
  address: { '@type': 'PostalAddress', addressRegion: 'BC', addressCountry: 'CA' },
  areaServed: AREAS,
  knowsAbout: siteJson.services.map((s) => s.name),
  hasOfferCatalog: { '@type': 'OfferCatalog', '@id': '/#services', name: 'Landscaping services', itemListElement: CATALOG },
};
const WEBSITE = { '@type': 'WebSite', '@id': '/#website', url: '/', name: 'RNC Landscaping', inLanguage: 'en-CA', publisher: { '@id': '/#business' } };
/** @param {string} path @param {string[]} trail */
const crumbs = (path, trail) => ({ '@type': 'BreadcrumbList', '@id': `${path}#breadcrumb`,
  itemListElement: trail.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: '<text>', item: p })) });
/** @param {string} path @param {any} [extra] */
const webpage = (path, extra = {}) => ({ '@type': 'WebPage', '@id': `${path}#webpage`, url: path, name: '<text>', description: '<text>', inLanguage: 'en-CA', isPartOf: { '@id': '/#website' }, ...extra });
/** @param {string} path */
const bc = (path) => ({ breadcrumb: { '@id': `${path}#breadcrumb` } });

const SVC = '/services/irrigation/';
const AREA = '/areas/oak-bay/';
const PROJECT = '/projects/oak-bay-front-garden-renewal/';
const GUIDE = '/resources/crd-watering-rules-guide/';

/** @type {Record<string, any[]>} */
const SNAPSHOTS = {
  '/': [BUSINESS, WEBSITE, webpage('/', { about: { '@id': '/#business' } })],
  [SVC]: [
    { ...BUSINESS, hasOfferCatalog: { ...BUSINESS.hasOfferCatalog, itemListElement: CATALOG.map((s) => (s['@id'] === `${SVC}#service` ? { '@id': s['@id'] } : s)) } },
    WEBSITE,
    { ...webpage(SVC, bc(SVC)), '@type': ['WebPage', 'FAQPage'], mainEntity: 'QUESTIONS' },
    crumbs(SVC, ['/', '/services/', SVC]),
    { '@type': 'Service', '@id': `${SVC}#service`, name: '<text>', serviceType: '<text>', description: '<text>', url: SVC,
      provider: { '@id': '/#business' }, areaServed: AREAS, mainEntityOfPage: { '@id': `${SVC}#webpage` } },
  ],
  [AREA]: [BUSINESS, WEBSITE, webpage(AREA, { about: { '@id': '/areas/oak-bay/#place' }, ...bc(AREA) }), crumbs(AREA, ['/', '/areas/', AREA])],
  [PROJECT]: [BUSINESS, WEBSITE, webpage(PROJECT, bc(PROJECT)), crumbs(PROJECT, ['/', '/projects/', PROJECT])],
  [GUIDE]: [BUSINESS, WEBSITE, webpage(GUIDE, bc(GUIDE)), crumbs(GUIDE, ['/', '/resources/', GUIDE]),
    { '@type': 'Article', '@id': `${GUIDE}#article`, headline: '<text>', description: '<text>', datePublished: '<text>', dateModified: '<text>',
      inLanguage: 'en-CA', image: '<text>', mainEntityOfPage: { '@id': `${GUIDE}#webpage` }, author: { '@id': '/#business' }, publisher: { '@id': '/#business' } }],
};

for (const [path, want] of Object.entries(SNAPSHOTS)) {
  test(`graph snapshot for ${path} #graph`, () => {
    const blocks = ldBlocks(render(path));
    assert.equal(blocks.length, 1, 'one JSON-LD block per page');
    assert.equal(blocks[0]['@context'], 'https://schema.org');
    const got = /** @type {any[]} */ (shape(blocks[0]['@graph']));
    const exp = JSON.parse(JSON.stringify(want));
    for (const n of exp) if (n.mainEntity === 'QUESTIONS') { n.mainEntity = got.find((g) => g['@id'] === n['@id'])?.mainEntity; assert.match(n.mainEntity, /^<[1-9]\d* questions>$/); }
    if (exp.some((n) => n['@type'] === 'Article')) {
      const art = blocks[0]['@graph'].find((/** @type {any} */ n) => n['@type'] === 'Article');
      assert.match(art.datePublished, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(art.dateModified, /^\d{4}-\d{2}-\d{2}$/);
    }
    assert.deepEqual(got, exp);
  });
}

/** Pure {"@id"} references that do not resolve to a node of the same graph. @param {any} g */
function unresolved(g) {
  /** @type {Set<string>} */ const ids = new Set();
  /** @type {string[]} */ const refs = [];
  const walk = (/** @type {any} */ v) => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    if (v['@id'] && Object.keys(v).length === 1) refs.push(v['@id']); else if (v['@id']) ids.add(v['@id']);
    Object.values(v).forEach(walk);
  };
  walk(g['@graph']);
  return refs.filter((r) => !ids.has(r));
}

test('every page: one graph, @ids resolve, no Review/AggregateRating, prices or placeholders #graph', () => {
  const env = testEnv();
  for (const r of routes(env).filter((x) => x.file.endsWith('.html'))) {
    const h = finalizeTokens(String(r.render()), { launch: false, file: r.file, issues: [], html: true });
    const blocks = ldBlocks(h);
    assert.equal(blocks.length, 1, `${r.path}: one JSON-LD block`);
    const raw = JSON.stringify(blocks[0]);
    assert.deepEqual(unresolved(blocks[0]), [], `${r.path}: unresolved @id references`);
    assert.doesNotMatch(raw, /"(Review|AggregateRating)"|"review"|"aggregateRating"|"price/, r.path);
    assert.doesNotMatch(raw, /\$\s?\d/, `${r.path}: no $ amounts`);
    assert.doesNotMatch(raw, /\[[A-Z][A-Z ]+\]/, `${r.path}: no placeholder tokens`);
    assert.doesNotMatch(raw, /&(amp|lt|gt|quot|#\d+);/, `${r.path}: no HTML entities inside JSON-LD`);
    const top = blocks[0]['@graph'];
    assert.equal(new Set(top.map((/** @type {any} */ n) => n['@id'])).size, top.length, `${r.path}: one node per @id`);
    const biz = top.find((/** @type {any} */ n) => n['@type'] === schema.BUSINESS_TYPE);
    assert.equal(biz.areaServed.length, 13, r.path);
    assert.equal(biz.hasOfferCatalog.itemListElement.length, 4, r.path);
    const wp = top.find((/** @type {any} */ n) => n['@id'] === `${r.path}#webpage`);
    assert.ok(wp, `${r.path}: WebPage node`);
    assert.equal(wp.url, r.path);
    if (r.path.split('/').filter(Boolean).length && r.path !== '/404.html') assert.ok(top.some((/** @type {any} */ n) => n['@type'] === 'BreadcrumbList'), `${r.path}: BreadcrumbList`);
    if (/^\/services\/[^/]+\/$/.test(r.path)) assert.ok(top.some((/** @type {any} */ n) => n['@type'] === 'Service'), `${r.path}: Service`);
    if (/^\/resources\/[^/]+\/$/.test(r.path)) assert.ok(top.some((/** @type {any} */ n) => n['@type'] === 'Article' && n.author), `${r.path}: Article with author`);
  }
});

test('launch graph: absolute https @ids, resolved facts published, placeholders omitted #graph', () => {
  const saved = { ...tokens };
  Object.assign(tokens, { DOMAIN: 'example.test', PHONE: '250-555-0199', EMAIL: 'hello@example.test', FOUNDED: '2001', 'LEGAL NAME': 'RNC Test Ltd.', ADDRESS: 'Serving Greater Victoria', 'OWNER NAME': 'Alex Example', 'GOOGLE PROFILE': 'https://g.page/example-test' });
  try {
    const env = testEnv({ launch: true });
    const path = '/resources/crd-watering-rules-guide/';
    const g = graph(env, { path, title: 'T', description: 'D', crumbs: [{ name: 'Home', path: '/' }, { name: 'Resources', path: '/resources/' }, { name: 'Guide', path }],
      jsonld: [schema.article(env, { title: 'Guide', summary: 'S', published: '2026-11-19', updated: '2026-11-21', author: { name: '[OWNER NAME]', org: 'RNC Landscaping', url: '/about/' } }, path, null)] });
    const top = /** @type {any[]} */ (g['@graph']);
    for (const n of top) assert.match(n['@id'], /^https:\/\/example\.test\//, n['@id']);
    const biz = top[0];
    assert.equal(biz['@type'], 'HomeAndConstructionBusiness');
    assert.equal(biz.telephone, '250-555-0199');
    assert.equal(biz.email, 'hello@example.test');
    assert.equal(biz.foundingDate, '2001');
    assert.equal(biz.legalName, 'RNC Test Ltd.');
    assert.equal(biz.address.streetAddress, undefined, 'a hidden address ("Serving Greater Victoria") is not a street address');
    assert.deepEqual(biz.sameAs, ['https://g.page/example-test']);
    const art = top.find((n) => n['@type'] === 'Article');
    assert.equal(art.author['@type'], 'Person');
    assert.equal(art.author.name, 'Alex Example');
    assert.deepEqual(art.author.worksFor, { '@id': 'https://example.test/#business' });
    assert.equal(art.datePublished, '2026-11-19');
    assert.equal(art.dateModified, '2026-11-21', "dateModified is the guide's real updated date");
    assert.deepEqual(unresolved(g), []);
  } finally { Object.assign(tokens, saved); }
  const biz2 = graph(testEnv(), { path: '/', title: 'T', description: 'D' })['@graph'][0];
  for (const k of ['telephone', 'email', 'foundingDate', 'legalName', 'sameAs']) assert.equal(biz2[k], undefined, `${k} omitted while unresolved`);
});

test('FAQ content folds into the page node; a question with a placeholder is left out #graph', () => {
  const env = testEnv();
  const faq = schema.faqPage([{ q: 'How fast do you reply?', a: 'Within [REPLY TIME].' }, { q: 'Do you quote?', a: 'Yes, see the [guide](/resources/x/).' }]);
  assert.equal(faq.mainEntity.length, 1);
  assert.equal(faq.mainEntity[0]?.acceptedAnswer.text, 'Yes, see the guide.');
  const g = graph(env, { path: '/faq/', title: 'T', description: 'D', crumbs: [{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq/' }], jsonld: [faq] });
  const pages = g['@graph'].filter((/** @type {any} */ n) => /Page\b/.test([].concat(n['@type']).join(' ')));
  assert.equal(pages.length, 1, 'one page node per URL');
  assert.equal(pages[0]['@type'], 'FAQPage');
  assert.equal(pageType('/services/'), 'CollectionPage');
  assert.equal(pageType('/about/'), 'AboutPage');
  assert.equal(pageType('/contact/'), 'ContactPage');
  assert.equal(pageType('/services/irrigation/'), 'WebPage');
});

test('head metadata: en_CA, website or article, self canonical, escaped once #graph', () => {
  const show = String(headMeta(testEnv(), { path: '/services/irrigation/', title: 'Irrigation & Repair', description: 'A "quoted" & plain description' }));
  assert.match(show, /<meta property="og:locale" content="en_CA">/);
  assert.match(show, /<meta property="og:type" content="website">/);
  assert.match(show, /<link rel="canonical" href="\/services\/irrigation\/">/);
  assert.match(show, /<meta property="og:url" content="\/services\/irrigation\/">/);
  assert.match(show, /<title>Irrigation &amp; Repair<\/title>/);
  assert.doesNotMatch(show, /&amp;amp;|&amp;quot;/);
  assert.match(show, /name="robots" content="noindex, nofollow"/);
  const saved = { ...tokens };
  Object.assign(tokens, { DOMAIN: 'example.test' });
  try {
    const env = testEnv({ launch: true });
    const art = schema.article(env, { title: 'G', published: '2026-11-19', updated: null }, '/resources/g/', null);
    const launch = String(headMeta(env, { path: '/resources/g/', title: 'G', description: 'D', jsonld: [art] }));
    assert.match(launch, /<meta property="og:type" content="article">/);
    assert.match(launch, /<meta property="article:published_time" content="2026-11-19">/);
    assert.match(launch, /<link rel="canonical" href="https:\/\/example\.test\/resources\/g\/">/);
    assert.match(launch, /<meta property="og:image" content="https:\/\//);
    assert.doesNotMatch(launch, /name="robots"/);
  } finally { Object.assign(tokens, saved); }
  assert.equal(ogType({ path: '/', title: '', description: '' }), 'website');
  assert.match(String(jsonLd(testEnv(), { path: '/x/', title: '</script><b>', description: 'D' })), /\\u003c\/script>/);
  assert.equal(ldJson({ a: '<' }), '{"a":"\\u003c"}');
});

test('per-page OG card with fallback: the page card, else the default card, else the brand icon #graph', () => {
  const dir = mkdtempSync(join(tmpdir(), 'seo-og-'));
  after(() => rmSync(dir, { recursive: true, force: true }));
  assert.equal(ogKey('/'), 'home');
  assert.equal(ogKey('/services/irrigation/'), 'services-irrigation');
  assert.equal(ogKey('/404.html'), '404');
  assert.equal(ogCard('/services/irrigation/', dir), null);
  writeFileSync(join(dir, 'areas-sooke.jpg'), 'x');
  assert.equal(ogCard('/areas/sooke/', dir), '/og/areas-sooke.jpg');
  const meta = String(headMeta(testEnv(), { path: '/nowhere/', title: 'T', description: 'D' }));
  assert.match(meta, /og:image" content="\/(og\/[\w-]+\.(jpg|png)|assets\/brand\/icon-512\.png)"/, 'offline builds fall back to a local image');
});
