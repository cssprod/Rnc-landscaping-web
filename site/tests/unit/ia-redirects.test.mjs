// @ts-check
/** redirects.mjs emits exactly the url-map redirect rules (CONTRACT §5; A13 #2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadUrlMap, redirectRules, redirectsText, routes } from '../../src/pages/redirects.mjs';

const map = loadUrlMap();

test('_redirects lines equal the url-map redirectsFile, one 301 per retired URL #strict-redirects', () => {
  const lines = redirectsText(map).split('\n').filter((l) => l && !l.startsWith('#'));
  assert.deepEqual(lines, map.redirectsFile);
  const retired = [...(map.entries || []), ...(map.aliases || [])].filter((e) => e.status === 301);
  assert.equal(lines.length, retired.length);
  assert.equal(lines.length, 23);
  for (const e of retired) assert.ok(lines.includes(`${e.old}  ${e.new}  301`), e.old);
});

test('no chains, no splats, no live page shadowed', () => {
  const rules = redirectRules(map);
  const sources = new Set(rules.map((r) => r.from));
  for (const r of rules) {
    assert.ok(!sources.has(r.to.split('?')[0]), `chain via ${r.to}`);
    assert.ok(!/[*:]/.test(r.from), r.from);
  }
  const live = new Set(map.entries.filter((e) => e.status === 200).map((e) => e.new));
  for (const r of rules) assert.ok(!live.has(r.from), r.from);
});

test('the four retired service filters keep their filter as a query; case studies go flat', () => {
  const rules = new Map(redirectRules(map).map((r) => [r.from, r.to]));
  assert.equal(rules.get('/portfolio/'), '/projects/');
  assert.equal(rules.get('/quote/'), '/free-quote/');
  assert.equal(rules.get('/services/tree-vegetation-management/'), '/services/tree-vegetation/');
  assert.equal(rules.get('/portfolio/irrigation/'), '/projects/?service=irrigation');
  assert.equal(rules.get('/portfolio/landscape-installation/oak-bay-front-garden-renewal/'), '/projects/oak-bay-front-garden-renewal/');
});

test('a chain or a duplicate in the map is refused', () => {
  const bad = { entries: [{ old: '/a/', new: '/b/', status: 301 }, { old: '/b/', new: '/c/', status: 301 }] };
  assert.throws(() => redirectRules(bad), /chain/);
  const dup = { entries: [{ old: '/a/', new: '/b/', status: 301 }], aliases: [{ old: '/a/', new: '/c/', status: 301 }] };
  assert.throws(() => redirectRules(dup), /duplicate/);
  const shadow = { entries: [{ old: '/a/', new: '/a/', status: 200 }, { old: '/a/', new: '/b/', status: 301 }] };
  assert.throws(() => redirectRules(shadow), /shadow/);
});

test('the _redirects route is raw and stays out of the sitemap', () => {
  const [r] = routes(/** @type {any} */ ({}));
  assert.equal(r.path, '/_redirects');
  assert.equal(r.file, '_redirects');
  assert.equal(r.sitemap, false);
  assert.ok(String(r.render()).includes('/quote/  /free-quote/  301'));
});
