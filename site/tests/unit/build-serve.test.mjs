// @ts-check
// serve.mjs behaves like the Netlify CDN (redirects, headers, MIME types), and the report()/baseline logic of tools/lib.mjs.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request } from 'node:http';
import { createSiteServer, parseRedirects, parseTomlHeaders, parseHeadersFile } from '../../tools/serve.mjs';
import { applyBaseline, toFailure } from '../../tools/lib.mjs';

/** Every temporary directory of this file lives under one root, removed when the file's tests end. */
const TMP_ROOT = mkdtempSync(join(tmpdir(), 'rnc-test-'));
after(() => rmSync(TMP_ROOT, { recursive: true, force: true }));
const tmp = (/** @type {string} */ p) => mkdtempSync(join(TMP_ROOT, p));

/** @param {number} port @param {string} path */
const get = (port, path) => new Promise((res, rej) => {
  const r = request({ host: 'localhost', port, path, method: 'GET' }, (x) => { let body = ''; x.on('data', (d) => { body += d; }); x.on('end', () => res({ status: x.statusCode, headers: x.headers, body })); });
  r.on('error', rej); r.end();
});

function fixtureDist() {
  const d = tmp('rnc-serve-');
  for (const f of ['index.html', 'projects/index.html', 'projects/a-slug/index.html', 'free-quote/index.html', 'stale/index.html', 'forced/index.html', '404.html']) { mkdirSync(join(d, f, '..'), { recursive: true }); writeFileSync(join(d, f), `<h1>${f}</h1>`); }
  for (const f of ['img/a.avif', 'img/a.webp', 'img/a.jpg', 'img/a.jpeg', 'm.mjs', 'site.webmanifest']) { mkdirSync(join(d, f, '..'), { recursive: true }); writeFileSync(join(d, f), 'x'); }
  writeFileSync(join(d, '_redirects'), '# retired URLs\n/portfolio/  /projects/  301\n/portfolio/irrigation/ /projects/?service=irrigation 301\n/portfolio/irrigation/a-slug/ /projects/a-slug/ 301\n/quote/ /free-quote/ 301\n/stale/ /projects/ 301\n/forced/ /projects/ 301!\n');
  writeFileSync(join(d, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n');
  return d;
}
const TOML = `[[headers]]\n  for = "/*"\n  [headers.values]\n    X-Frame-Options = "DENY"\n    Content-Security-Policy = "default-src 'self'; script-src 'self' 'sha256-abc='"\n\n[[headers]]\n  for = "/img/*"\n  [headers.values]\n    Cache-Control = "public, max-age=31536000, immutable"\n`;

test('serve.mjs applies _redirects (301, trailing-slash tolerant, query kept), _headers and netlify.toml headers #serve-netlify', async () => {
  const server = createSiteServer({ dist: fixtureDist(), toml: TOML });
  await new Promise((r) => server.listen(0, () => r(null)));
  const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
  try {
    /** @type {any} */ let r = await get(port, '/portfolio/');
    assert.equal(r.status, 301); assert.equal(r.headers.location, '/projects/');
    r = await get(port, '/portfolio'); // no trailing slash
    assert.equal(r.status, 301); assert.equal(r.headers.location, '/projects/');
    r = await get(port, '/portfolio/irrigation/');
    assert.equal(r.headers.location, '/projects/?service=irrigation', 'the destination query is kept');
    r = await get(port, '/quote/?service=irrigation');
    assert.equal(r.headers.location, '/free-quote/?service=irrigation', 'the request query passes through when the rule has none');
    r = await get(port, '/portfolio/irrigation/a-slug');
    assert.equal(r.headers.location, '/projects/a-slug/');
    r = await get(port, '/stale/');
    assert.equal(r.status, 200, 'an unforced rule does not shadow an existing page (Netlify)'); assert.match(r.body, /stale\/index\.html/);
    r = await get(port, '/stale');
    assert.equal(r.status, 301); assert.equal(r.headers.location, '/stale/', 'pretty-URL slash, not the shadowed rule');
    r = await get(port, '/forced/');
    assert.equal(r.status, 301, 'a forced rule ("301!") applies over an existing page'); assert.equal(r.headers.location, '/projects/');
    r = await get(port, '/projects/a-slug/');
    assert.equal(r.status, 200); assert.equal(r.headers['x-frame-options'], 'DENY');
    assert.match(String(r.headers['content-security-policy']), /script-src 'self' 'sha256-abc='/);
    assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow');
    r = await get(port, '/img/a.avif');
    assert.equal(r.headers['content-type'], 'image/avif'); assert.match(String(r.headers['cache-control']), /immutable/);
    assert.equal((/** @type {any} */ (await get(port, '/img/a.webp'))).headers['content-type'], 'image/webp');
    assert.equal((/** @type {any} */ (await get(port, '/img/a.jpg'))).headers['content-type'], 'image/jpeg');
    assert.equal((/** @type {any} */ (await get(port, '/img/a.jpeg'))).headers['content-type'], 'image/jpeg');
    assert.match(String((/** @type {any} */ (await get(port, '/m.mjs'))).headers['content-type']), /^text\/javascript/);
    assert.equal((/** @type {any} */ (await get(port, '/site.webmanifest'))).headers['content-type'], 'application/manifest+json');
    r = await get(port, '/nope/');
    assert.equal(r.status, 404); assert.match(r.body, /404\.html/);
    r = await get(port, '/projects');
    assert.equal(r.status, 301); assert.equal(r.headers.location, '/projects/');
    r = await get(port, '/../../etc/passwd');
    assert.notEqual(r.status, 200);
  } finally { server.close(); }
});

test('parsers: _redirects, netlify.toml [[headers]], _headers', () => {
  assert.deepEqual(parseRedirects('/a/ /b/\n/c/ /d/ 302\n# x\n\n/e/ /f/ 301!'), [{ from: '/a/', to: '/b/', status: 301, force: false }, { from: '/c/', to: '/d/', status: 302, force: false }, { from: '/e/', to: '/f/', status: 301, force: true }]);
  const h = parseTomlHeaders(TOML);
  assert.equal(h.length, 2); assert.equal(h[1].for, '/img/*'); assert.equal(h[0].values['X-Frame-Options'], 'DENY');
  assert.deepEqual(parseHeadersFile('/*\n  A: b\n/x/\n  C: d: e\n'), [{ for: '/*', values: { A: 'b' } }, { for: '/x/', values: { C: 'd: e' } }]);
});

test('report() baseline logic: listed failures are baselined, others fail, fixed entries are stale #baseline', () => {
  const fails = [{ rule: 'r1', path: 'a/index.html', message: 'm' }, { rule: 'r2', path: 'b/index.html', message: 'm' }];
  const base = { tool: 't', writtenAt: 'w2/x', entries: [{ rule: 'r1', path: 'a/index.html' }, { rule: 'r1', path: 'gone/index.html' }] };
  const r = applyBaseline(fails, base);
  assert.deepEqual(r.fresh.map((f) => f.rule), ['r2']);
  assert.deepEqual(r.baselined.map((f) => f.path), ['a/index.html']);
  assert.deepEqual(r.stale, [{ rule: 'r1', path: 'gone/index.html' }]);
  assert.equal(applyBaseline(fails, null).fresh.length, 2);
  assert.deepEqual(toFailure('about/index.html: missing h1'), { rule: 'unspecified', path: 'about/index.html', message: 'missing h1' });
  assert.deepEqual(toFailure('plain message'), { rule: 'unspecified', path: '', message: 'plain message' });
});
