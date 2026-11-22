// @ts-check
// --out / SITE_DIST, the .rnc-dist guard, parallel builds, showcaseOnly/sitemap rules, and the inline-script policy
// end to end: an injected unhashed inline <script> fails the build AND is blocked by the CSP that serve.mjs sends.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareDist, DistGuardError, MARKER } from '../../src/lib/build/dist-guard.mjs';
import { inlineScriptProblems, cspScriptHashes, sha256 } from '../../src/lib/build/inline-scripts.mjs';
import { INLINE_SCRIPTS } from '../../src/lib/head-scripts.mjs';

/** Every temporary directory of this file lives under one root, removed when the file's tests end. */
const TMP_ROOT = mkdtempSync(join(tmpdir(), 'rnc-test-'));
after(() => rmSync(TMP_ROOT, { recursive: true, force: true }));
const tmp = (/** @type {string} */ p) => mkdtempSync(join(TMP_ROOT, p));

const SITE = fileURLToPath(new URL('../../', import.meta.url));
const REPO = join(SITE, '..');

/** @param {string} cwd @param {string[]} args @param {Record<string, string>} [env] */
const build = (cwd, args, env = {}) => spawnSync(process.execPath, ['build.mjs', '--offline-images', ...args], { cwd, encoding: 'utf8', env: { ...process.env, SITE_DIST: '', ...env } });
/** Every file under dir with its content, for comparing two builds. @param {string} dir */
const snapshot = (dir) => Object.fromEntries(readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name)).sort().map((f) => [relative(dir, f), readFileSync(f, 'utf8')]));

test('the guard refuses a directory that is neither empty nor marked, and clears a marked one #dist-guard', () => {
  const foreign = tmp('rnc-foreign-');
  writeFileSync(join(foreign, 'precious.txt'), 'keep me');
  assert.throws(() => prepareDist(foreign), DistGuardError);
  assert.equal(readFileSync(join(foreign, 'precious.txt'), 'utf8'), 'keep me');

  const marked = tmp('rnc-marked-');
  prepareDist(marked);
  assert.ok(existsSync(join(marked, MARKER)));
  writeFileSync(join(marked, 'stale.html'), 'old');
  prepareDist(marked);
  assert.ok(!existsSync(join(marked, 'stale.html')) && existsSync(join(marked, MARKER)));

  const fresh = join(tmp('rnc-fresh-'), 'a', 'b');
  prepareDist(fresh);
  assert.ok(existsSync(join(fresh, MARKER)));
  assert.throws(() => prepareDist('/'), DistGuardError);
});

/** A directory with the fingerprint of a pre-marker build, plus a file that is not part of any build. @param {string} dir */
function legacyLooking(dir) {
  mkdirSync(join(dir, 'assets', 'build'), { recursive: true });
  for (const f of ['index.html', 'sitemap.xml', 'robots.txt']) writeFileSync(join(dir, f), 'x');
  writeFileSync(join(dir, 'my-notes.md'), 'precious');
  return dir;
}
const listing = (/** @type {string} */ dir) => readdirSync(dir, { recursive: true }).map(String).sort();

test('only the default site/dist may be a pre-marker build; a legacy-looking --out with user files is refused untouched #dist-guard', () => {
  const other = legacyLooking(tmp('rnc-legacy-out-'));
  const before = listing(other);
  assert.throws(() => prepareDist(other), DistGuardError, 'no legacyDir: refused');
  assert.throws(() => prepareDist(other, { legacyDir: join(tmp('rnc-legacy-default-'), 'dist') }), DistGuardError, 'legacyDir names another path: refused');
  assert.deepEqual(listing(other), before);
  assert.equal(readFileSync(join(other, 'my-notes.md'), 'utf8'), 'precious');

  // The default path itself (what build.mjs passes as legacyDir) is accepted once and marked.
  const def = legacyLooking(join(tmp('rnc-legacy-site-'), 'dist'));
  assert.deepEqual(prepareDist(def, { legacyDir: def }), { dir: def, legacy: true });
  assert.deepEqual(readdirSync(def), [MARKER]);
  // A directory at the default path without the fingerprint is still refused.
  const plain = join(tmp('rnc-legacy-plain-'), 'dist');
  mkdirSync(plain); writeFileSync(join(plain, 'notes.md'), 'mine');
  assert.throws(() => prepareDist(plain, { legacyDir: plain }), DistGuardError);
  assert.deepEqual(readdirSync(plain), ['notes.md']);
});

test('build.mjs --out refuses a legacy-looking directory that is not site/dist #dist-guard', () => {
  const other = legacyLooking(tmp('rnc-legacy-build-'));
  const before = listing(other);
  const r = build(SITE, [`--out=${other}`]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /refusing to delete/);
  assert.deepEqual(listing(other), before);
});

test('build.mjs --out refuses a non-dist directory and leaves it untouched #dist-guard', () => {
  const foreign = tmp('rnc-foreign-build-');
  writeFileSync(join(foreign, 'notes.md'), '# mine');
  const r = build(SITE, [`--out=${foreign}`]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /refusing to delete/);
  assert.deepEqual(readdirSync(foreign), ['notes.md']);
});

test('two builds into different --out directories in parallel do not interfere #parallel-out', async () => {
  const a = join(tmp('rnc-par-'), 'a');
  const b = join(tmp('rnc-par-'), 'b');
  const run = (/** @type {string[]} */ args, /** @type {Record<string, string>} */ env = {}) => new Promise((res) => {
    const p = spawn(process.execPath, ['build.mjs', '--offline-images', ...args], { cwd: SITE, env: { ...process.env, ...env } });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => res({ code, err }));
  });
  // One via --out, one via SITE_DIST.
  const [ra, rb] = /** @type {{ code: number, err: string }[]} */ (await Promise.all([run([`--out=${a}`], { SITE_DIST: '' }), run([], { SITE_DIST: b })]));
  assert.equal(ra.code, 0, ra.err);
  assert.equal(rb.code, 0, rb.err);
  const sa = snapshot(a), sb = snapshot(b);
  assert.ok(Object.keys(sa).length > 100);
  assert.deepEqual(Object.keys(sa), Object.keys(sb));
  for (const f of Object.keys(sa)) assert.equal(sa[f], sb[f], `${f} differs between the two builds`);
  assert.ok(existsSync(join(a, MARKER)) && existsSync(join(b, MARKER)));
  // The sitemap never lists 404.html.
  assert.ok(!readFileSync(join(a, 'sitemap.xml'), 'utf8').includes('404'));
});

test('inline scripts must be INLINE_SCRIPTS entries whose hash is in the CSP #inline-scripts', () => {
  const toml = readFileSync(join(REPO, 'netlify.toml'), 'utf8');
  const cspHashes = cspScriptHashes(toml);
  for (const s of INLINE_SCRIPTS) assert.ok(cspHashes.includes(sha256(s)));
  const ok = `<script>${INLINE_SCRIPTS[0]}</script><script type="speculationrules">${INLINE_SCRIPTS[1]}</script><script type="application/ld+json">{"a":1}</script><script type="module" src="/m.js"></script>`;
  assert.deepEqual(inlineScriptProblems(ok, { allowed: INLINE_SCRIPTS, cspHashes }), []);
  assert.equal(inlineScriptProblems(`${ok}<script>alert(1)</script>`, { allowed: INLINE_SCRIPTS, cspHashes }).length, 1);
  // Whole attribute names only: data-src is not src, data-type is not type.
  assert.equal(inlineScriptProblems('<script data-src="x">alert(1)</script>', { allowed: INLINE_SCRIPTS, cspHashes }).length, 1, 'data-src is not an external script');
  assert.equal(inlineScriptProblems('<script data-type="application/ld+json">alert(1)</script>', { allowed: INLINE_SCRIPTS, cspHashes }).length, 1, 'data-type is not a JSON-LD type');
  assert.deepEqual(inlineScriptProblems('<script id="ld" type="application/ld+json" data-x>{"a":1}</script><script defer src=/a.js></script>', { allowed: INLINE_SCRIPTS, cspHashes }), []);
  assert.equal(inlineScriptProblems(`<script>${INLINE_SCRIPTS[0]} </script>`, { allowed: INLINE_SCRIPTS, cspHashes }).length, 1, 'byte-equal, not similar');
  assert.match(inlineScriptProblems(`<script>${INLINE_SCRIPTS[0]}</script>`, { allowed: INLINE_SCRIPTS, cspHashes: [] })[0], /missing from the netlify.toml CSP/);
});

/** A throwaway copy of the repository (no .git, no builds), so a fault can be injected into a forbidden-to-edit file. */
function repoCopy() {
  const dir = tmp('rnc-copy-');
  const skip = new Set(['.git', 'node_modules', 'dist', 'screenshots', 'test-results', '.claude']);
  for (const e of readdirSync(REPO)) {
    if (skip.has(e)) continue;
    cpSync(join(REPO, e), join(dir, e), { recursive: true, filter: (src) => !relative(REPO, src).split('/').some((p) => skip.has(p)) });
  }
  return dir;
}

test('an injected unhashed inline <script> fails the build and is blocked by the served CSP #inline-script-injection', async (t) => {
  const copy = repoCopy();
  const layout = join(copy, 'site/src/components/layout.mjs');
  const src = readFileSync(layout, 'utf8');
  const injected = src.replace('<script>${raw(HEAD_SCRIPT)}</script>', '<script>${raw(HEAD_SCRIPT)}</script><script>document.documentElement.dataset.injected = "1"</script>');
  assert.notEqual(injected, src, 'layout.mjs still emits HEAD_SCRIPT the way this test expects');
  writeFileSync(layout, injected);
  const out = join(copy, 'site/dist');
  const r = build(join(copy, 'site'), []);
  assert.equal(r.status, 1, 'the build must fail');
  assert.match(r.stderr, /index\.html: inline <script> is not an INLINE_SCRIPTS entry/);

  // The pages were written before the build failed; serve them like Netlify and watch Chromium enforce the CSP.
  let chromium;
  try { chromium = (await import('playwright')).chromium; } catch { t.skip('playwright not linked (node tools/dev-setup.mjs)'); return; }
  const { createSiteServer } = await import('../../tools/serve.mjs');
  const server = createSiteServer({ dist: out });
  await new Promise((res) => server.listen(0, () => res(null)));
  const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  try {
    const page = await browser.newPage();
    /** @type {string[]} */ const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://localhost:${port}/`);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.injected ?? null), null, 'the injected script must not run');
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains('js')), 'the hashed HEAD_SCRIPT still runs');
    assert.ok(errors.some((e) => /Content Security Policy/.test(e) && /script-src/.test(e)), `expected a CSP console error, got: ${errors.join(' | ')}`);
  } finally { await browser.close(); server.close(); }
});

test('showcaseOnly routes are skipped in launch builds; sitemap:false, noindex and showcaseOnly stay out of the sitemap #route-shape', () => {
  const copy = repoCopy();
  // Patch a family file, not the frozen routes.mjs aggregator (requests/ia.md): rebind styleguide.mjs's exported
  // routes(env) so it appends test routes. /styleguide/ itself is the showcaseOnly, sitemap:false route.
  appendFileSync(join(copy, 'site/src/pages/styleguide.mjs'), `
const baseRoutes = routes;
// @ts-ignore reassigning the exported function binding (ESM live binding) is the point of this test
routes = (env) => [...baseRoutes(env),
  { path: '/hidden/', file: 'hidden/index.html', noindex: true, sources: [], scripts: [], render: () => layout(env, { path: '/hidden/', title: 'Hidden', description: 'x', body: html\`<h1>Hidden</h1>\` }) },
  { path: '/_test-raw', file: '_test-raw', sitemap: false, sources: [], scripts: [], render: () => '/a/ /b/ 301\\n' },
];
`);
  const site = join(copy, 'site');
  const r = build(site, []);
  assert.equal(r.status, 0, r.stderr);
  const dist = join(site, 'dist');
  assert.ok(existsSync(join(dist, 'styleguide/index.html')) && existsSync(join(dist, 'hidden/index.html')));
  assert.equal(readFileSync(join(dist, '_test-raw'), 'utf8'), '/a/ /b/ 301\n', 'non-.html routes are written raw');
  const sm = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  for (const p of ['/styleguide/', '/hidden/', '/_test-raw', '/404.html']) assert.ok(!sm.includes(`]${p}<`) && !sm.includes(`${p}</loc>`), `${p} must not be in the sitemap`);
  assert.match(sm, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  // Launch: the build fails on tokens, but the showcase-only page is never written.
  const out2 = join(tmp('rnc-launch-'), 'd');
  build(site, [`--out=${out2}`], { SITE_MODE: 'launch' });
  assert.ok(existsSync(join(out2, 'index.html')), 'launch build wrote pages');
  assert.ok(!existsSync(join(out2, 'styleguide/index.html')), 'showcaseOnly is not built in launch mode');
});
