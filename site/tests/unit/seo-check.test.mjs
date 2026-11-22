// @ts-check
/**
 * tools/check-seo.mjs: every rule is proven on the real offline build (the seo-owned rules pass) and on a one-line
 * mutation of a real page (the rule fires). tools/og-cards.mjs: card list and coverage. Test titles name the rule.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokens } from '../../site.config.mjs';
import { finalizeTokens } from '../../src/lib/tokens.mjs';
import { routes } from '../../src/pages/routes.mjs';
import { testEnv } from '../helpers/env.mjs';

const SITE = fileURLToPath(new URL('../..', import.meta.url));
// check-seo runs on import: point it at an empty dist first, so the import itself checks nothing.
process.env.SITE_DIST = mkdtempSync(join(tmpdir(), 'seo-empty-'));
const savedDomain = tokens.DOMAIN;
tokens.DOMAIN = 'example.test'; // check-seo reads DOMAIN once, at import (used only by launch-mode checks)
const seo = await import('../../tools/check-seo.mjs');
tokens.DOMAIN = savedDomain;

/** The seo stream's own rules (CONTRACT §16 verifier = implementer): they pass on the real build. */
const OWN = ['og-tags', 'double-encoding', 'slug-lint', 'canonical', 'canonical-unique', 'title-meta', 'technical', 'jsonld-graph'];

const DIST = mkdtempSync(join(tmpdir(), 'seo-dist-'));
/** @type {Map<string, string>} */ const real = new Map();
const siteFile = (/** @type {string} */ f) => { try { return readFileSync(join(DIST, f), 'utf8'); } catch { return null; } };

before(() => {
  execFileSync(process.execPath, ['build.mjs', '--offline-images', `--out=${DIST}`], { cwd: SITE, stdio: 'pipe', env: { ...process.env, SITE_DIST: DIST } });
  for (const f of readdirSync(DIST, { recursive: true }).map(String)) if (f.endsWith('.html') && statSync(join(DIST, f)).isFile()) real.set(f.replace(/\\/g, '/'), readFileSync(join(DIST, f), 'utf8'));
});

after(() => { for (const d of [DIST, /** @type {string} */ (process.env.SITE_DIST)]) rmSync(d, { recursive: true, force: true }); });

const projects = () => {
  /** @type {Record<string, {service: string, area: string}>} */ const out = {};
  const dir = join(SITE, '..', 'content', 'projects');
  for (const f of readdirSync(dir)) { const p = JSON.parse(readFileSync(join(dir, f), 'utf8')); out[p.slug] = { service: p.service, area: p.area }; }
  return out;
};

/**
 * Run checkSite over the real build with some pages changed, added or removed.
 * @param {Record<string, string|null|((h: string) => string)>} [edits] file → new HTML, a transform, or null (delete)
 * @param {{ robots?: string|null, sitemap?: string|null, redirects?: string|null }} [files]
 */
function run(edits = {}, files = {}) {
  const pages = new Map(real);
  for (const [f, e] of Object.entries(edits)) {
    if (e === null) pages.delete(f);
    else pages.set(f, typeof e === 'function' ? e(/** @type {string} */ (pages.get(f))) : e);
  }
  return seo.checkSite({
    pages: [...pages].map(([f, h]) => seo.pageOf(f, h)),
    sitemap: 'sitemap' in files ? files.sitemap ?? null : siteFile('sitemap.xml'),
    robots: 'robots' in files ? files.robots ?? null : siteFile('robots.txt'),
    redirects: 'redirects' in files ? files.redirects ?? null : siteFile('_redirects'),
    headers: siteFile('_headers'),
    projects: projects(),
    exists: () => true,
  });
}
/** @param {ReturnType<typeof run>} out @param {string} rule @param {string} [file] */
const fired = (out, rule, file) => out.filter((x) => x.rule === rule && (!file || x.path === file));
/** Insert HTML just before </main>. @param {string} s */
const inMain = (s) => (/** @type {string} */ h) => h.replace('</main>', `${s}</main>`);

test('RULES lists every check-seo rule the briefs name, statically', () => {
  const src = readFileSync(join(SITE, 'tools', 'check-seo.mjs'), 'utf8');
  const lit = src.match(/export const RULES = \[([\s\S]*?)\];/)?.[1] || '';
  const ids = [...lit.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
  for (const r of ['single-nav-dom', 'repeated-text', 'alt-filename', 'h1-count', 'h1-present-on-hubs', 'decorative-duplicate', 'og-tags', 'double-encoding',
    'slug-lint', 'time-format', 'canonical', 'sentence-case', 'canonical-unique', 'internal-links-service', 'internal-links-area', 'internal-links-project',
    'breadcrumbs', 'title-meta', 'cross-area-duplicates', 'technical', 'jsonld-graph']) assert.ok(ids.includes(r), r);
  assert.deepEqual(ids, seo.RULES);
  const og = readFileSync(join(SITE, 'tools', 'og-cards.mjs'), 'utf8');
  assert.match(og, /export const RULES = \['coverage'\];/);
});

test('the real showcase build passes every seo-owned rule #og-tags #double-encoding #slug-lint #canonical #canonical-unique #title-meta #technical #jsonld-graph', () => {
  const out = run().filter((x) => OWN.includes(x.rule));
  assert.deepEqual(out, []);
  const cli = spawnSync(process.execPath, ['tools/check-seo.mjs', '--no-baseline', `--rules=${OWN.join(',')}`], { cwd: SITE, env: { ...process.env, SITE_DIST: DIST }, encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr + cli.stdout);
});

test('one nav DOM; no duplicated header or footer links #single-nav-dom', () => {
  assert.equal(fired(run(), 'single-nav-dom').length, 0);
  assert.ok(fired(run({ 'index.html': inMain('<nav aria-label="Main"><a href="/">Home</a></nav>') }), 'single-nav-dom', 'index.html').length);
  assert.ok(fired(run({ 'index.html': (h) => h.replace('</footer>', '<a href="/about/">About</a><a href="/about/">About us</a></footer>') }), 'single-nav-dom', 'index.html').length);
});

test('repeated text in <main> fires; [data-shared] is exempt #repeated-text', () => {
  const p = '<p>This paragraph is long enough to count as a repeated text block.</p>';
  assert.ok(fired(run({ 'about/index.html': inMain(p + p) }), 'repeated-text', 'about/index.html').length);
  assert.equal(fired(run({ 'about/index.html': inMain(`${p}<aside data-shared="regional">${p}</aside>`) }), 'repeated-text', 'about/index.html').length, 0);
});

test('file-name alt text fires; descriptive alt passes #alt-filename', () => {
  for (const alt of ['front-garden-01.jpg', 'IMG_2041', 'DSC01234', 'oak_bay_garden', 'front-garden-01']) {
    assert.ok(fired(run({ 'about/index.html': inMain(`<img src="/img/x-480.jpg" alt="${alt}" width="4" height="3">`) }), 'alt-filename', 'about/index.html').length, alt);
  }
  assert.equal(fired(run({ 'about/index.html': inMain('<img src="/img/x-480.jpg" alt="Flagstone path through deer-resistant planting" width="4" height="3">') }), 'alt-filename').length, 0);
});

test('two H1s fire; an H1 outside <main> fires #h1-count', () => {
  assert.equal(fired(run(), 'h1-count').length, 0);
  assert.ok(fired(run({ 'contact/index.html': inMain('<h1>Contact us today</h1>') }), 'h1-count', 'contact/index.html').length);
});

test('a hub with an empty H1 fires #h1-present-on-hubs', () => {
  assert.ok(fired(run({ 'resources/index.html': (h) => h.replace(/<h1([^>]*)>[\s\S]*?<\/h1>/, '<h1$1></h1>') }), 'h1-present-on-hubs', 'resources/index.html').length);
});

test('decorative text read out twice fires; an aria-hidden copy passes #decorative-duplicate', () => {
  const d = '<p class="eyebrow">Get away every day</p>';
  assert.ok(fired(run({ 'index.html': inMain(d + d) }), 'decorative-duplicate', 'index.html').length);
  assert.equal(fired(run({ 'index.html': inMain(`${d}<p class="eyebrow" aria-hidden="true">Get away every day</p>`) }), 'decorative-duplicate', 'index.html').length, 0);
});

test('og:locale en_US, og:type article on a static page, a missing og:image or og:url ≠ canonical fire #og-tags', () => {
  assert.ok(fired(run({ 'about/index.html': (h) => h.replace('content="en_CA"', 'content="en_US"') }), 'og-tags', 'about/index.html').length);
  assert.ok(fired(run({ 'about/index.html': (h) => h.replace('og:type" content="website"', 'og:type" content="article"') }), 'og-tags', 'about/index.html').length);
  assert.ok(fired(run({ 'about/index.html': (h) => h.replace(/<meta property="og:image"[^>]*>/, '') }), 'og-tags', 'about/index.html').length);
  assert.ok(fired(run({ 'about/index.html': (h) => h.replace('og:url" content="/about/"', 'og:url" content="/about"') }), 'og-tags', 'about/index.html').length);
  assert.ok(fired(run({ 'resources/crd-watering-rules-guide/index.html': (h) => h.replace('og:type" content="article"', 'og:type" content="website"') }), 'og-tags').length, 'guides are articles');
});

test('&amp;amp; in a title and an entity inside JSON-LD fire #double-encoding', () => {
  const f = 'services/irrigation/index.html';
  assert.ok(fired(run({ [f]: (h) => h.replace('&amp;', '&amp;amp;') }), 'double-encoding', f).length);
  assert.ok(fired(run({ [f]: (h) => h.replace('"name":"RNC Landscaping"', '"name":"RNC &amp; Landscaping"') }), 'double-encoding', f).length);
});

test('a truncated or non-ASCII slug fires #slug-lint', () => {
  const g = real.get('resources/fall-cleanup-and-leaf-guide/index.html');
  assert.ok(fired(run({ 'resources/fall-cleanup-and-leaf-gui/index.html': g || '' }), 'slug-lint', 'resources/fall-cleanup-and-leaf-gui/index.html').length);
  assert.ok(fired(run({ 'areas/Oak_Bay/index.html': real.get('areas/oak-bay/index.html') || '' }), 'slug-lint', 'areas/Oak_Bay/index.html').length);
});

test('dates: a bare ISO date and the wrong display format fire #time-format', () => {
  assert.ok(fired(run({ 'about/index.html': inMain('<p>Updated 2026-11-19.</p>') }), 'time-format', 'about/index.html').length);
  assert.ok(fired(run({ 'about/index.html': inMain('<p><time datetime="2026-11-19">Nov 19, 2026</time></p>') }), 'time-format', 'about/index.html').length);
  assert.equal(fired(run({ 'about/index.html': inMain('<p><time datetime="2026-11-19">19 November 2026</time></p>') }), 'time-format', 'about/index.html').length, 0);
});

test('http, token, non-self and duplicate canonicals fire #canonical', () => {
  const f = 'about/index.html';
  for (const href of ['http://example.test/about/', 'https://[DOMAIN]/about/', '/about/?x=1', '/contact/']) {
    assert.ok(fired(run({ [f]: (h) => h.replace('<link rel="canonical" href="/about/">', `<link rel="canonical" href="${href}">`) }), 'canonical', f).length, href);
  }
  assert.ok(fired(run({ [f]: (h) => h.replace('</head>', '<link rel="canonical" href="/about/"></head>') }), 'canonical', f).length);
});

test('a retired URL that is still built or linked, and a shared canonical, fire #canonical-unique', () => {
  assert.ok(fired(run({ 'portfolio/index.html': real.get('projects/index.html') || '' }), 'canonical-unique', '_redirects').length);
  assert.ok(fired(run({ 'about/index.html': inMain('<p><a href="/quote/">Quote</a></p>') }), 'canonical-unique', 'about/index.html').length);
  assert.ok(fired(run({ 'terms/index.html': (h) => h.replace('<link rel="canonical" href="/terms/">', '<link rel="canonical" href="/privacy/">') }), 'canonical-unique').length);
  assert.ok(fired(run({}, { redirects: '/old/  /nowhere/  301\n' }), 'canonical-unique', '_redirects').length);
});

test('lowercase headings, lowercase place names and all-caps shouting fire #sentence-case', () => {
  assert.ok(fired(run({ 'about/index.html': inMain('<h2>our services</h2>') }), 'sentence-case', 'about/index.html').length);
  assert.ok(fired(run({ 'about/index.html': inMain('<p>We work across oak bay and sidney.</p>') }), 'sentence-case', 'about/index.html').length);
  assert.ok(fired(run({ 'about/index.html': inMain('<p>GET YOUR FREE QUOTE</p>') }), 'sentence-case', 'about/index.html').length);
  assert.equal(fired(run({ 'about/index.html': inMain('<p>Read our <a href="/resources/">watering guide</a> first.</p>') }), 'sentence-case', 'about/index.html').length, 0);
});

test('a service page that misses a municipality link fires #internal-links-service', () => {
  const f = 'services/irrigation/index.html';
  assert.ok(fired(run({ [f]: (h) => h.split('href="/areas/sooke/"').join('href="/areas/"') }), 'internal-links-service', f).length);
});

test('a municipality page that misses a service link fires #internal-links-area', () => {
  const f = 'areas/oak-bay/index.html';
  assert.ok(fired(run({ [f]: (h) => h.split('href="/services/irrigation/"').join('href="/services/"') }), 'internal-links-area', f).length);
});

test('a project without links back to its service and municipality fires #internal-links-project', () => {
  const f = 'projects/oak-bay-front-garden-renewal/index.html';
  assert.ok(fired(run({ [f]: (h) => h.split('href="/areas/oak-bay/"').join('href="/areas/"') }), 'internal-links-project', f).length);
});

test('a trail without aria-current, or out of step with the JSON-LD, fires #breadcrumbs', () => {
  const f = 'areas/oak-bay/index.html';
  assert.equal(fired(run(), 'breadcrumbs').length, 0);
  assert.ok(fired(run({ [f]: (h) => h.replace(/<nav class="crumbs"[\s\S]*?<\/nav>/, (n) => n.replace(' aria-current="page"', '')) }), 'breadcrumbs', f).length);
  assert.ok(fired(run({ [f]: (h) => h.replace('"name":"Oak Bay","item":"/areas/oak-bay/"', '"name":"Oak Bay district","item":"/areas/oak-bay/"') }), 'breadcrumbs', f).length);
  assert.ok(fired(run({ [f]: (h) => h.replace(/<nav class="crumbs"[\s\S]*?<\/nav>/, '') }), 'breadcrumbs', f).length);
});

test('a long title, a long or duplicate description and an area title without its place fire #title-meta', () => {
  const f = 'about/index.html';
  const long = 'About RNC Landscaping and every service line we run across Greater Victoria';
  assert.ok(fired(run({ [f]: (h) => h.replace(/<title>[^<]*<\/title>/, `<title>${long}</title>`) }), 'title-meta', f).length);
  assert.ok(fired(run({ [f]: (h) => h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${'Garden care. '.repeat(13)}">`) }), 'title-meta', f).length);
  const d = real.get('contact/index.html')?.match(/<meta name="description" content="[^"]*">/)?.[0] || '';
  assert.ok(fired(run({ [f]: (h) => h.replace(/<meta name="description" content="[^"]*">/, d) }), 'title-meta').length);
  assert.ok(fired(run({ 'areas/sooke/index.html': (h) => h.replace(/<title>[^<]*<\/title>/, '<title>Landscaping on the West Shore | RNC Landscaping</title>') }), 'title-meta', 'areas/sooke/index.html').length);
  // Lengths are counted after decoding: an entity or an em dash is one character.
  assert.equal(seo.visibleLength('A &amp; B — C&#39;s'), 11);
});

test('a sentence shared by two municipality pages fires; place names are normalised; [data-shared] is exempt #cross-area-duplicates', () => {
  const a = 'areas/sooke/index.html';
  const b = 'areas/sidney/index.html';
  const s = (/** @type {string} */ place) => `<p>Every garden in ${place} gets a written plan for the season ahead.</p>`;
  const before = fired(run(), 'cross-area-duplicates').filter((x) => x.path === a || x.path === b).length;
  const out = run({ [a]: inMain(s('Sooke')), [b]: inMain(s('Sidney')) });
  assert.ok(fired(out, 'cross-area-duplicates', a).length && fired(out, 'cross-area-duplicates', b).length);
  const shared = run({ [a]: inMain(`<aside data-shared="regional">${s('Sooke')}</aside>`), [b]: inMain(`<aside data-shared="regional">${s('Sidney')}</aside>`) });
  assert.equal(fired(shared, 'cross-area-duplicates').filter((x) => x.path === a || x.path === b).length, before);
});

test('lang, robots, sitemap and _redirects problems fire #technical', () => {
  assert.ok(fired(run({ 'about/index.html': (h) => h.replace('<html lang="en-CA">', '<html lang="en">') }), 'technical', 'about/index.html').length);
  assert.ok(fired(run({}, { robots: null }), 'technical', 'robots.txt').length);
  assert.ok(fired(run({}, { robots: 'User-agent: *\nAllow: /\n' }), 'technical', 'robots.txt').length, 'a showcase build must disallow everything');
  assert.ok(fired(run({}, { sitemap: null }), 'technical', 'sitemap.xml').length);
  assert.ok(fired(run({ 'about/index.html': null }), 'technical', 'sitemap.xml').length, 'a sitemap <loc> that is not built');
  assert.ok(fired(run({ 'extra/index.html': real.get('about/index.html') || '' }), 'technical', 'extra/index.html').length, 'a page missing from the sitemap');
  assert.ok(fired(run({}, { redirects: '/old/ /new/ 302\n' }), 'technical', '_redirects').length);
  assert.ok(fired(run({ 'about/index.html': (h) => h.replace('<meta name="robots" content="noindex, nofollow">', '') }), 'technical', 'about/index.html').length, 'showcase pages are noindex');
});

test('Review markup, prices, placeholders, a second block or an unresolved @id fire #jsonld-graph', () => {
  const f = 'reviews/index.html';
  const ld = (/** @type {(g: any) => void} */ fn) => (/** @type {string} */ h) => h.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (m, a, body, c) => { const g = JSON.parse(body); fn(g); return a + JSON.stringify(g) + c; });
  assert.ok(fired(run({ [f]: ld((g) => g['@graph'].push({ '@type': 'Review', '@id': '/reviews/#r1', reviewBody: 'Great' })) }), 'jsonld-graph', f).length);
  assert.ok(fired(run({ [f]: ld((g) => { g['@graph'][0].aggregateRating = { '@type': 'AggregateRating', ratingValue: 5 }; }) }), 'jsonld-graph', f).length);
  assert.ok(fired(run({ [f]: ld((g) => { g['@graph'][0].priceRange = '$$'; }) }), 'jsonld-graph', f).length);
  assert.ok(fired(run({ [f]: ld((g) => { g['@graph'][0].telephone = '[PHONE]'; }) }), 'jsonld-graph', f).length);
  assert.ok(fired(run({ [f]: ld((g) => { g['@graph'][1].publisher = { '@id': '/#nobody' }; }) }), 'jsonld-graph', f).length);
  assert.ok(fired(run({ [f]: ld((g) => { g['@graph'][0].areaServed.pop(); }) }), 'jsonld-graph', f).length);
  assert.ok(fired(run({ [f]: ld((g) => { g['@graph'][0]['@type'] = 'LandscapingBusiness'; }) }), 'jsonld-graph', f).length);
  assert.ok(fired(run({ [f]: (h) => h.replace('</head>', '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Thing"}</script></head>') }), 'jsonld-graph', f).length);
});

test('launch build: absolute https canonicals and @ids on the DOMAIN pass; relative or http ones fail #canonical #jsonld-graph #og-tags #technical', () => {
  const saved = { ...tokens };
  Object.assign(tokens, { DOMAIN: 'example.test' });
  try {
    const env = testEnv({ launch: true });
    const r = routes(env).find((x) => x.path === '/about/');
    const h = finalizeTokens(String(r?.render()), { launch: true, file: 'about/index.html', issues: [], html: true });
    const site = {
      pages: [seo.pageOf('about/index.html', h), seo.pageOf('404.html', (real.get('404.html') || '').replace(/(href|content)="\/404\.html"/g, '$1="https://example.test/404.html"'))],
      sitemap: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://example.test/about/</loc><lastmod>2026-11-21</lastmod></url>\n</urlset>\n',
      robots: 'User-agent: *\nAllow: /\n\nSitemap: https://example.test/sitemap.xml\n', redirects: '', headers: '', projects: {}, exists: () => true,
    };
    const own = (/** @type {any[]} */ out) => out.filter((x) => ['canonical', 'og-tags', 'jsonld-graph'].includes(x.rule) && x.path === 'about/index.html');
    assert.deepEqual(own(seo.checkSite(site)), []);
    assert.deepEqual(seo.checkSite(site).filter((x) => x.rule === 'technical' && x.path !== '404.html'), []);
    const rel = { ...site, pages: [seo.pageOf('about/index.html', h.replace('href="https://example.test/about/"', 'href="/about/"'))] };
    assert.ok(fired(seo.checkSite(rel), 'canonical', 'about/index.html').length, 'relative canonical in launch');
    const http = { ...site, pages: [seo.pageOf('about/index.html', h.split('https://example.test').join('http://example.test'))] };
    assert.ok(fired(seo.checkSite(http), 'canonical', 'about/index.html').length);
    assert.ok(fired(seo.checkSite(http), 'jsonld-graph', 'about/index.html').length);
    assert.ok(fired(seo.checkSite({ ...site, robots: 'User-agent: *\nDisallow: /\nSitemap: https://example.test/sitemap.xml\n' }), 'technical', 'robots.txt').length);
  } finally { Object.assign(tokens, saved); }
});

test('og-cards lists one card per page (not /404.html or the styleguide) plus a default, and coverage fails until cards exist #coverage', () => {
  const dir = mkdtempSync(join(tmpdir(), 'og-cards-'));
  after(() => rmSync(dir, { recursive: true, force: true }));
  const list = spawnSync(process.execPath, ['tools/og-cards.mjs', `--dir=${dir}`], { cwd: SITE, env: { ...process.env, SITE_DIST: DIST }, encoding: 'utf8' });
  assert.equal(list.status, 0, list.stderr);
  const cards = /** @type {any[]} */ (JSON.parse(list.stdout));
  const pages = [...real.keys()].filter((f) => f !== '404.html' && !f.startsWith('styleguide/'));
  assert.equal(cards.length, pages.length + 1);
  assert.ok(cards.some((c) => c.key === 'home' && c.path === '/'));
  assert.ok(cards.some((c) => c.key === 'default'));
  assert.ok(cards.filter((c) => c.path.startsWith('/projects/') && c.path !== '/projects/').every((c) => c.sample), 'sample projects carry the Sample label');
  const check = spawnSync(process.execPath, ['tools/og-cards.mjs', '--check', '--no-baseline', `--dir=${dir}`], { cwd: SITE, env: { ...process.env, SITE_DIST: DIST }, encoding: 'utf8' });
  assert.equal(check.status, 1);
  mkdirSync(dir, { recursive: true });
  for (const c of cards) writeFileSync(join(dir, `${c.key}.jpg`), `card ${c.key}`);
  const ok = spawnSync(process.execPath, ['tools/og-cards.mjs', '--check', '--no-baseline', `--dir=${dir}`], { cwd: SITE, env: { ...process.env, SITE_DIST: DIST }, encoding: 'utf8' });
  assert.match(ok.stdout + ok.stderr, /og:image is|✓ og-cards/, 'distinct cards under 45 KB pass; the page check waits for a rebuild');
  writeFileSync(join(dir, 'about.jpg'), 'card home');
  const dup = spawnSync(process.execPath, ['tools/og-cards.mjs', '--check', '--no-baseline', `--dir=${dir}`], { cwd: SITE, env: { ...process.env, SITE_DIST: DIST }, encoding: 'utf8' });
  assert.match(dup.stderr, /identical/);
});
