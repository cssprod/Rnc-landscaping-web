// @ts-check
/** Route families, C1 URLs, the route shape (CONTRACT §5, §14), scripts[] and the layout fallback. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routes, FAMILIES } from '../../src/pages/routes.mjs';
import { PORTFOLIO_LINK_RE } from '../../src/pages/home.mjs';
import { loadUrlMap } from '../../src/pages/redirects.mjs';
import { scriptTags } from '../../src/components/layout.mjs';
import { formatDate, timeEl, isIsoDate } from '../../src/lib/dates.mjs';
import { testEnv } from '../helpers/env.mjs';

const env = testEnv();
const R = routes(env);
const byPath = new Map(R.map((r) => [r.path, r]));
const map = loadUrlMap();

test('every route has the CONTRACT §14 shape and a unique path and file', () => {
  assert.equal(new Set(R.map((r) => r.path)).size, R.length);
  assert.equal(new Set(R.map((r) => r.file)).size, R.length);
  for (const r of R) {
    assert.equal(typeof r.render, 'function', r.path);
    assert.ok(Array.isArray(r.sources) && r.sources.length, `${r.path} sources[]`);
    assert.ok(Array.isArray(r.scripts), `${r.path} scripts[]`);
    assert.equal(r.file, r.path.endsWith('/') ? `${r.path.slice(1)}index.html` : r.path.slice(1));
  }
});

test('the routes are exactly the url-map C1 pages plus _redirects #sitemap-matches-url-map', () => {
  const want = new Set([
    ...map.entries.filter((e) => e.status === 200 || (e.status === 301 && !e.new.includes('?'))).map((e) => e.new),
    ...(map.added || []).map((e) => e.new), '/_redirects',
  ]);
  assert.deepEqual(new Set(R.map((r) => r.path)), want);
  for (const p of ['/projects/', '/free-quote/', '/process/', '/styleguide/', '/projects/oak-bay-front-garden-renewal/']) assert.ok(byPath.has(p), p);
  for (const r of R) assert.ok(!r.path.startsWith('/portfolio/') && r.path !== '/quote/', `retired URL still built: ${r.path}`);
});

test('feature scripts: quote on /free-quote/, projects on /projects/ and every case study', () => {
  assert.deepEqual(byPath.get('/free-quote/')?.scripts, ['quote']);
  assert.deepEqual(byPath.get('/projects/')?.scripts, ['projects']);
  const cases = R.filter((r) => /^\/projects\/[^/]+\/$/.test(r.path));
  assert.equal(cases.length, 16);
  for (const r of cases) assert.deepEqual(r.scripts, ['projects'], r.path);
  assert.deepEqual(byPath.get('/')?.scripts, []);
});

test('/styleguide/ is showcase-only, noindex and out of the sitemap; /404.html is out of the sitemap', () => {
  const sg = byPath.get('/styleguide/');
  assert.equal(sg?.showcaseOnly, true);
  assert.equal(sg?.noindex, true);
  assert.equal(sg?.sitemap, false);
  assert.equal(byPath.get('/404.html')?.sitemap, false);
  const launch = routes(testEnv({ launch: true }));
  assert.ok(!launch.some((r) => r.path === '/styleguide/'), 'never built with SITE_MODE=launch');
});

test('families are concatenated in a fixed order (the sitemap order)', () => {
  assert.equal(FAMILIES.length, 9);
  assert.equal(R[0].path, '/');
  assert.equal(R.at(-1)?.path, '/_redirects');
});

test('pages render with C1 links only (no /quote/ or /portfolio/ written by a template)', () => {
  // Content links to /quote/ and /portfolio/ are rewritten by the integrator's codemod; template links are already C1.
  for (const r of R.filter((x) => x.file.endsWith('.html'))) {
    const html = String(r.render());
    assert.ok(!/href="\/portfolio\/[^"]+\//.test(html), `${r.path}: deep /portfolio/ link`);
    const chrome = (html.match(/<header class="site-header"[\s\S]*?<\/header>/)?.[0] || '') + (html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0] || '');
    assert.ok(!/href="\/(?:quote|portfolio)\//.test(chrome), `${r.path}: retired URL in the header or footer`);
  }
  const home = String(byPath.get('/')?.render());
  assert.ok(home.includes('href="/projects/"'));
  assert.ok(String(byPath.get('/projects/oak-bay-front-garden-renewal/')?.render()).includes('href="/projects/?service=landscape-installation"'));
});

test('the home lede strips the inline portfolio link on the old and the C1 URL', () => {
  const s = 'Recent jobs. [Browse the portfolio](/portfolio/).';
  assert.equal(s.replace(PORTFOLIO_LINK_RE, ''), 'Recent jobs.');
  assert.equal('Recent jobs. [Browse the portfolio](/projects/).'.replace(PORTFOLIO_LINK_RE, ''), 'Recent jobs.');
});

test('the quote form keeps data-stepper and gains data-quote-form', () => {
  const html = String(byPath.get('/free-quote/')?.render());
  assert.match(html, /<form[^>]*\sdata-stepper data-quote-form/);
});

test('layout scripts: env.assets.js fallback without modules; module graph with modulepreload when present', () => {
  assert.equal(String(scriptTags(env, ['quote'])), '<script type="module" src="/assets/build/main.test.js"></script>');
  const modules = {
    'lib-track': { src: '/assets/build/lib-track.a.js', deps: [] },
    'lib-prefs': { src: '/assets/build/lib-prefs.b.js', deps: [] },
    main: { src: '/assets/build/main.c.js', deps: ['/assets/build/lib-track.a.js', '/assets/build/lib-prefs.b.js'] },
    living: { src: '/assets/build/living.d.js', deps: ['/assets/build/lib-prefs.b.js'] },
    quote: { src: '/assets/build/quote.e.js', deps: ['lib-track'] },
  };
  const out = String(scriptTags(testEnv({ modules }), ['quote']));
  assert.equal(out, '<link rel="modulepreload" href="/assets/build/lib-track.a.js"><link rel="modulepreload" href="/assets/build/lib-prefs.b.js">'
    + '<script type="module" src="/assets/build/main.c.js"></script><script type="module" src="/assets/build/living.d.js"></script><script type="module" src="/assets/build/quote.e.js"></script>');
  const page = String(byPath.get('/free-quote/')?.render());
  assert.ok(page.includes('<script type="module" src="/assets/build/main.test.js"></script>'));
});

test('dates: "19 November 2026" and <time datetime>', () => {
  assert.equal(formatDate('2026-11-19'), '19 November 2026');
  assert.equal(formatDate('2026-01-05'), '5 January 2026');
  assert.equal(String(timeEl('2026-11-19')), '<time datetime="2026-11-19">19 November 2026</time>');
  assert.equal(String(timeEl(null)), '');
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(formatDate('soon'), 'soon');
});
