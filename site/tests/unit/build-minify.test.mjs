// @ts-check
// CSS and JS minifiers: golden outputs (tests/fixtures/build) and, where Chromium is available, CSSOM equality.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { minifyCss } from '../../src/lib/build/minify-css.mjs';
import { minifyJs } from '../../src/lib/build/minify-js.mjs';
import { bundleCss } from '../../src/lib/build/css.mjs';
import { generate as tokensCss, readTokens } from '../../../brand/build-tokens.mjs';

const FIX = fileURLToPath(new URL('../fixtures/build/', import.meta.url));
const SITE = fileURLToPath(new URL('../../', import.meta.url));
const read = (/** @type {string} */ f) => readFileSync(join(FIX, f), 'utf8');
const cssFixtures = readdirSync(FIX).filter((f) => f.endsWith('.css') && !f.endsWith('.min.css'));

for (const f of cssFixtures) {
  test(`minify-css golden: ${f} #minify-golden`, () => {
    assert.equal(minifyCss(read(f)), read(f.replace(/\.css$/, '.min.css')).replace(/\n$/, ''));
  });
}

test('minify-css keeps strings, url() bodies and conditions verbatim #minify-preserves', () => {
  const out = minifyCss(read('strings.css') + read('at-rules.css') + read('custom-props.css'));
  for (const s of ['"  two  spaces ; { } /* not a comment */ "', "'\\'quoted\\'  ;'", 'url("/img/a b.png")', "url(data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E)",
    '@media (min-width: 40em) and (max-width: 63.99em)', '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))', '@media not all and (monochrome)',
    '--shadow:0 1px 2px rgba(0, 0, 0, 0.2), 0 0 0 0.5px var(--line)', '--json:{ "a": [1, 2], "b": "c;d" }', '--with-comment:a /* kept */ b', '@layer reset{}', '.k[lang |= en i]', 'calc(1rem + 2vw)', '& .h{']) {
    assert.ok(out.includes(s), `missing ${s}`);
  }
  assert.ok(out.includes('div.m{'), 'a comment inside a compound selector must not become a descendant combinator');
  assert.ok(out.includes('border:1px solid red'), 'a comment between two words becomes a space');
});

test('minify-css is idempotent on the site bundle', () => {
  const { css } = bundleCss({ tokens: tokensCss(readTokens()), stylesDir: join(SITE, 'src/styles') });
  assert.equal(minifyCss(css), css);
});

test('minify-js golden: tricky.js #minify-js-golden', () => {
  assert.equal(minifyJs(read('tricky.js')), read('tricky.min.js'));
});

test('minify-js output of every site module and the fixture still parses and behaves the same', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rnc-minjs-'));
  const run = (/** @type {string} */ code, /** @type {string} */ name) => { const f = join(dir, name); writeFileSync(f, code); return execFileSync(process.execPath, [f], { encoding: 'utf8' }); };
  assert.equal(run(minifyJs(read('tricky.js')), 'b.mjs'), run(read('tricky.js'), 'a.mjs'));
  const scripts = join(SITE, 'src/scripts');
  for (const f of readdirSync(scripts, { recursive: true }).map(String).filter((x) => x.endsWith('.js'))) {
    const out = join(dir, f.replace(/[\\/]/g, '-').replace(/\.js$/, '.mjs'));
    writeFileSync(out, minifyJs(readFileSync(join(scripts, f), 'utf8')));
    execFileSync(process.execPath, ['--check', out]);
  }
});

/** @returns {Promise<any>} */
async function chromium() {
  try { return (await import('playwright')).chromium; } catch { return null; }
}

test('minified CSS parses identically in Chromium (fixtures and the site bundle) #minify-cssom', async (t) => {
  const c = await chromium();
  if (!c) { t.skip('playwright not linked (node tools/dev-setup.mjs)'); return; }
  const browser = await c.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  try {
    const page = await browser.newPage();
    const cssom = (/** @type {string} */ css) => page.evaluate((text) => {
      const s = new CSSStyleSheet();
      s.replaceSync(text);
      const walk = (/** @type {CSSRuleList} */ rules) => [...rules].map((r) => r.cssText);
      return walk(s.cssRules);
    }, css);
    const { css: raw } = bundleCss({ tokens: tokensCss(readTokens()), stylesDir: join(SITE, 'src/styles'), minify: false });
    for (const [name, src] of [...cssFixtures.map((f) => [f, read(f)]), ['site bundle', raw]]) {
      // Declarations holding var() keep their author text in the CSSOM (pending substitution), so spacing around
      // brackets and commas is normalised on both sides; every other difference is a real parse difference.
      const norm = (/** @type {string[]} */ r) => r.map((x) => x.replace(/\s*([(),])\s*/g, '$1'));
      const a = norm(await cssom(src));
      const b = norm(await cssom(minifyCss(src)));
      assert.ok(a.length > 0, `${name}: parsed to no rules`);
      assert.deepEqual(b, a, `${name}: CSSOM differs`);
    }
  } finally { await browser.close(); }
});
