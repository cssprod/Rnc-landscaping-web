// @ts-check
/**
 * The check rules ia authors catch what they claim to catch: each test runs a tool on a small broken fixture
 * (a temporary dist or repository root) and expects its rule id in the report, then a clean fixture passes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('../..', import.meta.url));
const REPO = join(SITE, '..');

/** Run a tool. @param {string} tool @param {string[]} args @param {Record<string, string>} [env] */
function run(tool, args, env = {}) {
  const r = spawnSync(process.execPath, [`tools/${tool}.mjs`, ...args], { cwd: SITE, encoding: 'utf8', env: { ...process.env, SITE_MODE: '', ...env } });
  // One line format for both report() versions: the seed's "path: [rule] message" and w1/build's "[rule] path: message".
  const out = `${r.stdout}${r.stderr}`.replace(/^(\s*- )\[([\w-]+)\] (\S+?): /gm, '$1$3: [$2] ');
  return { code: r.status, out };
}
/** @param {string} dir @param {Record<string, string>} files */
function writeTree(dir, files) {
  for (const [f, s] of Object.entries(files)) { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), s); }
  return dir;
}
const FOOT_OK = '<footer class="site-footer"><a href="/about/">About</a><span><mark class="ph">[PHONE]</mark></span> <span>Text <mark class="ph">[PHONE]</mark></span> <span><mark class="ph">[EMAIL]</mark></span></footer>';
const HEAD_OK = '<header class="site-header"><nav aria-label="Main"><button type="button" aria-expanded="false" aria-controls="menu-services">Services</button><div class="mega" id="menu-services"><a href="/services/a/">A</a></div></nav></header>';
/** @param {string} title @param {string} body @param {{ head?: string, foot?: string }} [o] */
const page = (title, body, o = {}) => `<!doctype html><html lang="en-CA"><head><title>${title}</title><meta name="description" content="${title} page"><meta name="viewport" content="width=device-width"><link rel="canonical" href="/"></head><body>${o.head ?? HEAD_OK}<main><h1>${title}</h1>${body}</main>${o.foot ?? FOOT_OK}</body></html>`;
/** @param {Record<string, string>} files */
const dist = (files) => writeTree(mkdtempSync(join(tmpdir(), 'ia-dist-')), files);

test('check-html flags href="#" and a link used as a disclosure #no-href-hash', () => {
  const bad = run('check-html', [], { SITE_DIST: dist({ 'index.html': page('Home', '<a href="#">Menu</a><a href="/x/" aria-expanded="false">More</a>') }) });
  assert.equal(bad.code, 1);
  assert.match(bad.out, /\[no-href-hash\] link with href="#"/);
  assert.match(bad.out, /\[no-href-hash\] aria-expanded on <a>/);
  const noControls = run('check-html', [], { SITE_DIST: dist({ 'index.html': page('Home', '', { head: '<header class="site-header"><button aria-expanded="false">Services</button></header>' }) }) });
  assert.match(noControls.out, /\[no-href-hash\] header disclosure without aria-controls/);
  const ok = run('check-html', [], { SITE_DIST: dist({ 'index.html': page('Home', '<p>Fine</p>') }) });
  assert.equal(ok.code, 0, ok.out);
});

test('check-html wants tel:/sms:/mailto: (or their placeholders) in the footer and no token in an href #footer-tel-mailto', () => {
  const missing = run('check-html', [], { SITE_DIST: dist({ 'index.html': page('Home', '', { foot: '<footer class="site-footer"><a href="/about/">About</a></footer>' }) }) });
  assert.equal(missing.code, 1);
  assert.match(missing.out, /\[footer-tel-mailto\] footer has neither a tel: link/);
  assert.match(missing.out, /\[footer-tel-mailto\] footer has neither a mailto: link/);
  const token = run('check-html', [], { SITE_DIST: dist({ 'index.html': page('Home', '', { foot: '<footer class="site-footer"><a href="tel:[PHONE]">[PHONE]</a><a href="mailto:[EMAIL]">[EMAIL]</a></footer>' }) }) });
  assert.match(token.out, /\[footer-tel-mailto\] token inside an href: tel:\[PHONE\]/);
  const linked = run('check-html', [], { SITE_DIST: dist({ 'index.html': page('Home', '', { foot: '<footer class="site-footer"><a href="tel:2505550100">Call</a> <a href="sms:2505550100">Text</a> <a href="mailto:hi@example.test">Email</a></footer>' }) }) });
  assert.equal(linked.code, 0, linked.out);
});

test('check-links flags a footer that links the same URL twice #footer-duplicates', () => {
  const r = run('check-links', ['--url-map=/nonexistent.json'], { SITE_DIST: dist({ 'index.html': page('Home', '', { foot: FOOT_OK.replace('</footer>', '<a href="/about/">About us</a></footer>') }), 'about/index.html': page('About', '') }) });
  assert.match(r.out, /\[footer-duplicates\] footer links \/about\/ 2 times/);
});

test('check-links flags broken links and missing trailing slashes; a link through a 301 fails only with --strict #internal-200', () => {
  const files = { 'index.html': page('Home', '<a href="/missing/">x</a><a href="/about">y</a><a href="/old/">z</a>'), 'about/index.html': page('About', ''), '_redirects': '/old/  /about/  301\n' };
  const r = run('check-links', ['--url-map=/nonexistent.json'], { SITE_DIST: dist(files) });
  assert.match(r.out, /\[internal-200\] broken link \/missing\//);
  assert.match(r.out, /\[internal-200\] missing trailing slash \/about/);
  assert.ok(!/links to \/old\//.test(r.out));
  const s = run('check-links', ['--url-map=/nonexistent.json', '--strict'], { SITE_DIST: dist(files) });
  assert.match(s.out, /\[internal-200\] links to \/old\/, which is a 301/);
});

test('check-links finds pages nothing links to and service or area pages missing from the header menus #orphans', () => {
  const sm = '<urlset><url><loc>https://x.test/</loc></url><url><loc>https://x.test/lonely/</loc></url><url><loc>https://x.test/services/a/</loc></url><url><loc>https://x.test/services/b/</loc></url></urlset>';
  const r = run('check-links', ['--url-map=/nonexistent.json'], { SITE_DIST: dist({ 'index.html': page('Home', '<a href="/services/b/">b</a>'), 'lonely/index.html': page('Lonely', ''), 'services/a/index.html': page('A', ''), 'services/b/index.html': page('B', ''), 'sitemap.xml': sm }) });
  assert.match(r.out, /\/lonely\/: \[orphans\] no other page links here/);
  assert.match(r.out, /\/services\/b\/: \[orphans\] not listed in the header Services menu/);
  assert.match(r.out, /\[orphans\] header has no Service areas menu/);
});

test('check-links compares built pages and the sitemap with the url-map #sitemap-matches-url-map', () => {
  const root = mkdtempSync(join(tmpdir(), 'ia-map-'));
  const mapFile = join(root, 'url-map.json');
  writeFileSync(mapFile, JSON.stringify({ entries: [{ old: '/', new: '/', status: 200 }, { old: '/a/', new: '/a/', status: 200 }, { old: '/404.html', new: '/404.html', status: 200 }, { old: '/old/', new: '/a/', status: 301 }], added: [{ new: '/new/', status: 200 }], newSitemapExcludes: ['/404.html'] }));
  const sm = '<urlset><url><loc>https://x.test/</loc></url><url><loc>https://x.test/404.html</loc></url><url><loc>https://x.test/extra/</loc></url></urlset>';
  const r = run('check-links', [`--url-map=${mapFile}`], { SITE_DIST: dist({ 'index.html': page('Home', '<a href="/a/">a</a><a href="/extra/">e</a>'), 'a/index.html': page('A', ''), '404.html': page('404', ''), 'extra/index.html': page('Extra', ''), 'sitemap.xml': sm, '_redirects': '/old/  /a/  301\n' }) });
  assert.match(r.out, /\/new\/: \[sitemap-matches-url-map\] url-map page is not built/);
  assert.match(r.out, /\/extra\/: \[sitemap-matches-url-map\] built page is not in the url-map/);
  assert.match(r.out, /sitemap\.xml: \[sitemap-matches-url-map\] missing \/a\//);
  assert.match(r.out, /sitemap\.xml: \[sitemap-matches-url-map\] lists \/404\.html, which must stay out of the sitemap/);
});

test('check-links checks every _redirects row against the url-map: missing, chained, unbuilt #strict-redirects', () => {
  const root = mkdtempSync(join(tmpdir(), 'ia-map-'));
  const mapFile = join(root, 'url-map.json');
  writeFileSync(mapFile, JSON.stringify({ entries: [{ old: '/', new: '/', status: 200 }, { old: '/a/', new: '/a/', status: 200 }, { old: '/x/', new: '/a/', status: 301 }, { old: '/y/', new: '/a/', status: 301 }] }));
  const r = run('check-links', [`--url-map=${mapFile}`], { SITE_DIST: dist({ 'index.html': page('Home', '<a href="/a/">a</a>'), 'a/index.html': page('A', ''), '_redirects': '/x/  /z/  301\n/z/  /a/  301\n' }) });
  assert.match(r.out, /\[strict-redirects\] missing \/y\/ → \/a\//);
  assert.match(r.out, /\[strict-redirects\] line 1: \/x\/ → \/z\/, url-map says \/a\//);
  assert.match(r.out, /\[strict-redirects\] line 1: chain \/x\/ → \/z\/ → \/a\//);
  assert.match(r.out, /\[strict-redirects\] line 2: \/z\/ is not a url-map retired URL/);
});

/* ---------------- check-content on a scratch repository root ---------------- */
/** A small repository root: the real content and media, plus overrides. @param {Record<string, any>} over */
function repo(over) {
  const root = mkdtempSync(join(tmpdir(), 'ia-repo-'));
  cpSync(join(REPO, 'content'), join(root, 'content'), { recursive: true });
  cpSync(join(REPO, 'media/images.json'), join(root, 'media/images.json'));
  for (const [f, v] of Object.entries(over)) { mkdirSync(dirname(join(root, f)), { recursive: true }); writeFileSync(join(root, f), typeof v === 'string' ? v : JSON.stringify(v, null, 2)); }
  return root;
}
/** @param {string} rel */
const real = (rel) => JSON.parse(readFileSync(join(REPO, rel), 'utf8'));
/** @param {string} root @param {string} rules */
const content = (root, rules) => run('check-content', [`--root=${root}`, `--rules=${rules}`, '--all'], { SITE_DIST: '/nonexistent-dist' });

test('check-content validates against the v3 schemas: enums, forbidden price keys, $ amounts, slugs, link targets #schema-v3', () => {
  const p = real('content/projects/oak-bay-front-garden-renewal.json');
  const root = repo({
    'content/projects/oak-bay-front-garden-renewal.json': { ...p, clientType: 'Landlord', budget: '10k', summary: 'Cost was $4,000.', slug: 'other-slug' },
    'content/pages/faq.json': { ...real('content/pages/faq.json'), lede: 'See [this](/no-such-page/).' },
  });
  const r = content(root, 'schema-v3');
  assert.equal(r.code, 1);
  assert.match(r.out, /\[schema-v3\] clientType: "Landlord" is not one of/);
  assert.match(r.out, /\[schema-v3\] forbidden key "budget"/);
  assert.match(r.out, /\[schema-v3\] \$ amount at summary/);
  assert.match(r.out, /\[schema-v3\] slug "other-slug" does not match the file name/);
  assert.match(r.out, /\[schema-v3\] link target \/no-such-page\/ is not a page/);
  assert.match(r.out, /\[schema-v3\] \(root\): missing required "season"/);
});

test('check-content finds business facts typed outside site.json #single-source', () => {
  const root = repo({
    'content/pages/about.json': { ...real('content/pages/about.json'), lede: 'Founded in 1998. Call 250-382-1234 or write to owner@rnc-landscaping.ca.' },
    'site/src/pages/x.mjs': "export const footer = '<p>[PHONE] [ADDRESS]</p>';\n",
  });
  const r = content(root, 'single-source');
  assert.match(r.out, /content\/pages\/about\.json: \[single-source\] founding-year/);
  assert.match(r.out, /\[single-source\] phone number typed at lede/);
  assert.match(r.out, /\[single-source\] email address typed at lede/);
  assert.match(r.out, /site\/src\/pages\/x\.mjs: \[single-source\] types the business fact \[PHONE\]/);
});

test('check-content keeps one municipality list and one area file per municipality #municipality-list', () => {
  const sj = real('content/site.json');
  const root = repo({
    'content/site.json': { ...sj, municipalities: sj.municipalities.slice(0, 12) },
    'content/pages/home.json': { ...real('content/pages/home.json'), towns: ['Victoria', 'Saanich', 'Oak Bay', 'Esquimalt', 'Langford'] },
    'site/src/pages/y.mjs': "const AREAS = ['victoria', 'saanich', 'sooke'];\n",
  });
  const r = content(root, 'municipality-list');
  assert.match(r.out, /content\/site\.json: \[municipality-list\] municipalities must be the 13 contract slugs/);
  assert.match(r.out, /content\/pages\/home\.json: \[municipality-list\] towns is a second municipality list/);
  assert.match(r.out, /site\/src\/pages\/y\.mjs: \[municipality-list\] hard-coded municipality list/);
});

test('check-content wants the named byline and real dates on guides #resource-byline-dates', () => {
  const g = real('content/resources/crd-watering-rules-guide.json');
  const root = repo({ 'content/resources/crd-watering-rules-guide.json': { ...g, author: { name: 'Staff', org: 'RNC Landscaping', url: '/about/' }, published: '2099-01-01', updated: '2026-01-01' } });
  const r = content(root, 'resource-byline-dates');
  assert.match(r.out, /\[resource-byline-dates\] author must be/);
  assert.match(r.out, /\[resource-byline-dates\] published 2099-01-01 is in the future/);
  assert.match(r.out, /\[resource-byline-dates\] updated must be later than published/);
});

test('check-content wants a plain guarantee built around [WARRANTY] #guarantee', () => {
  const r1 = content(repo({ 'content/pages/process.json': { seo: { title: 't', description: 'd' }, h1: 'How we work', guarantee: { heading: 'The best guarantee', body: ['We stand behind our work.'] } } }), 'guarantee');
  assert.match(r1.out, /\[guarantee\] the guarantee is built around \[WARRANTY\]/);
  assert.match(r1.out, /\[guarantee\] superlative/);
  const r2 = content(repo({ 'content/pages/process.json': { seo: { title: 't', description: 'd' }, h1: 'How we work', guarantee: { heading: 'Our workmanship guarantee', body: ['[WARRANTY] on the work we do.'] } } }), 'guarantee');
  assert.equal(r2.code, 0, r2.out);
});

test('check-content wants a per-visit table and four seasons on each service #service-tables', () => {
  const s = real('content/services/irrigation.json');
  const r = content(repo({ 'content/services/irrigation.json': { ...s, perVisit: { caption: 'Each visit', rows: [{ task: 'Check', detail: 'From $90' }, { task: 'Adjust', detail: 'Heads' }, { task: 'Report', detail: 'Notes' }] }, seasonal: s.seasonal.slice(0, 2) } }), 'service-tables');
  assert.match(r.out, /irrigation\.json: \[service-tables\] perVisit row 1 mentions a price/);
  assert.match(r.out, /irrigation\.json: \[service-tables\] seasonal table has no (Fall|Winter) items/);
});

test('check-content wants 5–6 short FAQs per service #service-faqs', () => {
  const s = real('content/services/irrigation.json');
  const r = content(repo({ 'content/services/irrigation.json': { ...s, faqs: [{ q: 'Is it?', a: 'Yes.' }, { q: 'No question mark', a: 'x'.repeat(700) }] } }), 'service-faqs');
  assert.match(r.out, /irrigation\.json: \[service-faqs\] 2 FAQs/);
  assert.match(r.out, /\[service-faqs\] FAQ 2: the question should end with "\?"/);
  assert.match(r.out, /\[service-faqs\] FAQ 2: answer is 700 characters/);
});

test('check-content finds a sentence shared by two area files #area-unique-sentences', () => {
  const a = real('content/areas/sooke.json');
  const b = real('content/areas/metchosin.json');
  const shared = 'Rocky shallow soils dry out fast on these south-facing slopes in July.';
  const r = content(repo({ 'content/areas/sooke.json': { ...a, summary: [shared] }, 'content/areas/metchosin.json': { ...b, summary: [`Local text first. ${shared}`] } }), 'area-unique-sentences');
  assert.match(r.out, /\[area-unique-sentences\] sentence shared with (sooke|metchosin): "rocky shallow soils/);
});

test('check-content wants an own rule, condition and proof per area and never "no bylaw exists" #area-local-blocks', () => {
  const a = real('content/areas/sooke.json');
  const rule = { id: 'sooke-trees', topic: 'trees', text: 'Sooke has no tree bylaw.', sourceUrl: 'https://sooke.ca/x', excerpt: 'x', verify: true, reviewedOn: null };
  const r = content(repo({ 'content/areas/sooke.json': { ...a, localRules: [rule], conditions: [], proof: [] } }), 'area-local-blocks');
  assert.match(r.out, /sooke\.json: \[area-local-blocks\] needs at least one own sourced condition/);
  assert.match(r.out, /sooke\.json: \[area-local-blocks\] needs at least one proof item/);
  assert.match(r.out, /sooke\.json: \[area-local-blocks\] "sooke-trees" claims no bylaw exists/);
});

test('check-content aligns site.json with the Google profile facts: 13 areas, 4 services, matching names #gbp-alignment', () => {
  const sj = real('content/site.json');
  const r = content(repo({ 'content/site.json': { ...sj, services: [...sj.services.slice(0, 3), { slug: 'tree-vegetation', name: 'Tree Care', navLabel: 'Trees' }] } }), 'gbp-alignment');
  assert.match(r.out, /tree-vegetation\.json: \[gbp-alignment\] name\/navLabel/);
  const ok = content(repo({}), 'gbp-alignment');
  assert.equal(ok.code, 0, ok.out);
});

test('check-content keeps one NAP value in one place #nap-consistency', () => {
  const sj = real('content/site.json');
  const r = content(repo({ 'content/site.json': { ...sj, nap: { ...sj.nap, phone: '250-382-1234' } } }), 'nap-consistency');
  assert.match(r.out, /content\/site\.json: \[nap-consistency\] nap\.phone must be "\[PHONE\]"/);
  const ok = content(repo({}), 'nap-consistency');
  assert.equal(ok.code, 0, ok.out);
});
