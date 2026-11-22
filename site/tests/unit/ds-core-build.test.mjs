// @ts-check
// ds-core (W2): build integration of the design system: manifest / theme colours from tokens, the CSS bundle order, and
// the route-shape rules proven without patching the frozen routes.mjs aggregator (carry item, requests/ia.md): extra
// routes are appended to a family file (pages/styleguide.mjs) in a scratch copy of the repository.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, appendFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readTokens, themeColors } from '../../../brand/build-tokens.mjs';

const SITE = fileURLToPath(new URL('../../', import.meta.url));
const REPO = join(SITE, '..');
const TMP_ROOT = mkdtempSync(join(tmpdir(), 'rnc-dscore-'));
after(() => rmSync(TMP_ROOT, { recursive: true, force: true }));

/** @param {string} cwd @param {string[]} args @param {Record<string, string>} [env] */
const build = (cwd, args, env = {}) => spawnSync(process.execPath, ['build.mjs', '--offline-images', ...args], { cwd, encoding: 'utf8', env: { ...process.env, SITE_DIST: '', ...env } });

function repoCopy() {
  const dir = mkdtempSync(join(TMP_ROOT, 'copy-'));
  const skip = new Set(['.git', 'node_modules', 'dist', 'screenshots', 'test-results', '.claude']);
  for (const e of readdirSync(REPO)) {
    if (skip.has(e)) continue;
    cpSync(join(REPO, e), join(dir, e), { recursive: true, filter: (src) => !relative(REPO, src).split('/').some((p) => skip.has(p)) });
  }
  return dir;
}

test('showcaseOnly, noindex and sitemap:false routes from a family file stay out of the sitemap; non-.html routes are raw; launch skips showcaseOnly #route-shape', () => {
  const copy = repoCopy();
  // A family file is the extension point: its routes(env) binding is replaced by one that appends test routes.
  appendFileSync(join(copy, 'site/src/pages/styleguide.mjs'), `
const baseRoutes = routes;
// @ts-ignore reassigning the exported function binding (ESM live binding) is the point of this test
routes = (env) => [...baseRoutes(env),
  { path: '/hidden/', file: 'hidden/index.html', noindex: true, sources: [], scripts: [], render: () => layout(env, { path: '/hidden/', title: 'Hidden', description: 'x', body: html\`<h1>Hidden</h1>\` }) },
  { path: '/_test-raw', file: '_test-raw', sitemap: false, sources: [], scripts: [], render: () => '/a/ /b/ 301\\n' },
];
`);
  const site = join(copy, 'site');
  const out = join(TMP_ROOT, 'showcase');
  const r = build(site, [`--out=${out}`]);
  assert.equal(r.status, 0, r.stderr);
  for (const f of ['styleguide/index.html', 'hidden/index.html', '_test-raw']) assert.ok(existsSync(join(out, f)), `${f} is built`);
  assert.equal(readFileSync(join(out, '_test-raw'), 'utf8'), '/a/ /b/ 301\n', 'non-.html routes are written raw');
  const sm = readFileSync(join(out, 'sitemap.xml'), 'utf8');
  for (const p of ['/styleguide/', '/hidden/', '/_test-raw', '/404.html']) assert.ok(!sm.includes(`${p}</loc>`), `${p} must not be in the sitemap`);
  assert.match(sm, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  const launchOut = join(TMP_ROOT, 'launch');
  build(site, [`--out=${launchOut}`], { SITE_MODE: 'launch' });
  assert.ok(existsSync(join(launchOut, 'index.html')), 'launch build wrote pages');
  assert.ok(!existsSync(join(launchOut, 'styleguide/index.html')), 'showcaseOnly is not built in launch mode');
});

test('the manifest colours and the stylesheet come from the dark-first tokens #manifest-colours', () => {
  const out = join(TMP_ROOT, 'manifest');
  const r = build(SITE, [`--out=${out}`]);
  assert.equal(r.status, 0, r.stderr);
  const manifest = JSON.parse(readFileSync(join(out, 'site.webmanifest'), 'utf8'));
  const c = themeColors(readTokens());
  assert.equal(manifest.theme_color, c.dark);
  assert.equal(manifest.background_color, c.background);
  const cssFile = readdirSync(join(out, 'assets/build')).find((f) => /^site\.[0-9a-f]{10}\.css$/.test(f));
  assert.ok(cssFile, 'hashed stylesheet written');
  const css = readFileSync(join(out, 'assets/build', /** @type {string} */ (cssFile)), 'utf8');
  assert.ok(css.indexOf('@layer legacy,reset,base') !== -1 || css.indexOf('@layer legacy, reset, base') !== -1, 'layer order declared');
  assert.ok(css.search(/@layer legacy, ?reset/) < css.indexOf('--color-bg:'), 'the layer order comes before the tokens');
  assert.match(css, /:root\{color-scheme:dark;--color-bg:#06110C;/, 'dark-first: :root carries Fir night');
  assert.doesNotMatch(css, /animation-duration:0m?s!important/, 'no global motion kill switch');
});
