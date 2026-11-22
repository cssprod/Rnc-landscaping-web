// @ts-check
// ds-core (W2): the dark-first token contract, the C3 type scale, the motion tiers and the contrast gate
// (CONTRACT §8, §9, §15; DESIGN-DIRECTION §2–§5; traceability C3.2 unit/ds-core-tokens.test#type-scale).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate, readTokens, resolve, themeColors, flatten } from '../../../brand/build-tokens.mjs';
import { bundleCss } from '../../src/lib/build/css.mjs';

const SITE = fileURLToPath(new URL('../../', import.meta.url));
const REPO = join(SITE, '..');
const json = readTokens();
const css = generate(json);
const token = (/** @type {string} */ p) => { let n = /** @type {any} */ (json); for (const k of p.split('.')) n = n[k]; return n; };

/** Parse clamp(MINrem, Arem + Bvw, MAXrem) and evaluate it at a viewport width in px (16px root). @param {string} s @param {number} vw */
function clampAt(s, vw) {
  const m = s.match(/^clamp\(([\d.]+)rem,\s*([\d.]+)rem\s*\+\s*([\d.]+)vw,\s*([\d.]+)rem\)$/);
  assert.ok(m, `not a rem/vw clamp(): ${s}`);
  const [min, a, b, max] = m.slice(1).map(Number);
  return Math.min(max, Math.max(min, a + (b * vw) / 100 / 16));
}

test('C3 fluid type scale: display…small sizes, 360→1440 interpolation, body >= 16px, Inter 400/600/700, Newsreader italic only #type-scale', () => {
  // [token, min rem at 360px, max rem at 1440px] (DESIGN-DIRECTION §5, C3).
  const scale = [
    ['display', 2.5, 4.5], ['large-title', 2, 3.25], ['title-1', 1.5, 2.25], ['title-2', 1.25, 1.75],
    ['title-3', 1.25, 1.5], ['lede', 1.125, 1.375], ['body', 1.0625, 1.125],
  ];
  for (const [name, lo, hi] of /** @type {[string, number, number][]} */ (scale)) {
    const t = token(`font.size.${name}`);
    const expr = t.$extensions?.['ca.rnc.css'];
    assert.equal(t.$value.value, hi, `font.size.${name} $value is the 1440 size`);
    assert.ok(Math.abs(clampAt(expr, 360) - lo) < 0.01, `${name} at 360px is ${clampAt(expr, 360)}rem, want ${lo}`);
    assert.ok(Math.abs(clampAt(expr, 1440) - hi) < 0.01, `${name} at 1440px is ${clampAt(expr, 1440)}rem, want ${hi}`);
    assert.ok(clampAt(expr, 320) >= lo - 0.001 && clampAt(expr, 2560) <= hi + 0.001, `${name} is clamped outside 360–1440`);
    assert.ok(css.includes(`--font-size-${name}: ${expr};`), `tokens.css emits --font-size-${name}`);
  }
  // Steps descend: display > h1 > h2 > h3 at both ends.
  for (const vw of [320, 360, 768, 1440]) {
    const at = (/** @type {string} */ n) => clampAt(token(`font.size.${n}`).$extensions['ca.rnc.css'], vw);
    assert.ok(at('display') > at('large-title') && at('large-title') > at('title-1') && at('title-1') > at('title-3') && at('title-3') > at('body'), `scale order at ${vw}px`);
    assert.ok(at('body') * 16 >= 16, `body is >= 16px at ${vw}px`);
  }
  assert.equal(token('font.size.small').$value.value, 0.875);
  assert.ok(token('font.size.small').$value.value * 16 >= 14);
  // Weights: Inter 400 / 600 / 700 (medium and bold stay available for UI).
  assert.equal(token('font.weight.regular').$value, 400);
  assert.equal(token('font.weight.semibold').$value, 600);
  assert.equal(token('font.weight.display').$value, 700);
  assert.equal(token('font.leading.body').$value, 1.6);
  // Faces: Inter (normal, swap) and Newsreader (italic only, optional so the accent phrase never shifts the hero).
  const faces = json.$extensions['ca.rnc.fontFaces'];
  assert.deepEqual(faces.map((/** @type {any} */ f) => [f.family, f.style, f.display, f.preload]), [['Inter Variable', 'normal', 'swap', true], ['Newsreader Variable', 'italic', 'optional', true]]);
  assert.match(css, /font-family: "Newsreader Variable";[^}]*font-style: italic;[^}]*font-display: optional;/);
  assert.match(css, /font-family: "Inter Variable";[^}]*font-display: swap;/);
  assert.equal(token('font.family.serif').$value[0], 'Newsreader Variable');
  assert.equal(token('font.family.sans').$value[0], 'Inter Variable');
});

test('dark-first: :root carries the Fir night values, [data-theme=light] the Pacific dawn values, prefers-color-scheme is never consulted #dark-default', () => {
  assert.equal(json.$extensions['ca.rnc.default'], 'dark');
  assert.doesNotMatch(css, /prefers-color-scheme/);
  const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  assert.match(root, /color-scheme: dark;/);
  assert.match(root, /--color-bg: #06110C;/);
  assert.match(root, /--color-ink: #E8F4EC;/);
  const light = css.slice(css.indexOf(':root[data-theme="light"] {'), css.indexOf('}', css.indexOf(':root[data-theme="light"] {')));
  assert.match(light, /color-scheme: light;/);
  assert.match(light, /--color-bg: #F2F6F3;/);
  assert.match(light, /--focus-ring: #4A3FC2;/);
  // No v2 ca.rnc.dark extension survives the migration.
  assert.doesNotMatch(JSON.stringify(json), /ca\.rnc\.dark/);
  // Every token that has a light value is emitted exactly once in the light block.
  for (const t of flatten(json).filter((x) => x.light != null)) assert.ok(light.includes(`  ${t.name}: `), `${t.name} missing from the light block`);
  // Manifest / theme-color come from tokens.
  assert.deepEqual(themeColors(json), { dark: '#06110C', light: '#F2F6F3', background: '#06110C' });
  // The C3/P0 focus tokens exist in both themes, and color.focus aliases the ring.
  assert.equal(resolve(json, 'color.focus', 'dark'), resolve(json, 'focus.ring', 'dark'));
  assert.equal(resolve(json, 'color.focus', 'light'), resolve(json, 'focus.ring', 'light'));
  // .on-deep re-declares the dark values inside @layer base so components can refine it.
  assert.match(css, /@layer base \{\n {2}\.on-deep \{\n {4}color-scheme: dark;\n {4}--color-ink: #E8F4EC;/);
});

test('brand/tokens.css is the generated file and the bundle declares the layer order before any layer is used #tokens-css', () => {
  assert.equal(readFileSync(join(REPO, 'brand/tokens.css'), 'utf8'), css, 'run node brand/build-tokens.mjs');
  const { css: raw } = bundleCss({ tokens: css, stylesDir: join(SITE, 'src/styles'), minify: false });
  const bundle = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  const first = bundle.search(/@layer\s/);
  assert.equal(bundle.slice(first).match(/^@layer [^{;]+;/)?.[0], '@layer legacy, reset, base, layout, chrome, components, living, pages, utilities, motion, print;');
});

test('motion tiers: reduce zeroes durations unless data-motion=on, data-motion=off always zeroes them (generated CSS) #motion-tiers', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\n {2}:root:not\(\[data-motion="on"\]\) \{[^}]*--dur-t1: 0ms;[^}]*\}/);
  assert.match(css, /\n:root\[data-motion="off"\] \{[^}]*--dur-t0: 0ms;[^}]*--dur-t1: 0ms;[^}]*\}/);
  for (const v of ['--dur-t0', '--dur-t0-fast', '--dur-t1', '--dur-draw', '--dur-vt', '--dur-fast', '--dur-base', '--dur-slow']) assert.ok(css.includes(`  ${v}: var(`), `${v} is defined on :root`);
  // Nothing zeroes durations unconditionally under the OS setting (that would make data-motion=on impossible).
  assert.doesNotMatch(css, /prefers-reduced-motion: reduce\) \{\s*:root \{/);
  const styles = join(SITE, 'src/styles');
  for (const f of readdirSync(styles)) {
    const src = readFileSync(join(styles, f), 'utf8');
    assert.doesNotMatch(src, /animation-duration:\s*0m?s\s*!important|transition-duration:\s*0m?s\s*!important/, `${f}: no global motion kill switch (CONTRACT §8)`);
    if (!f.startsWith('50-legacy-') && f !== '95-motion.css') assert.doesNotMatch(src, /prefers-reduced-motion/, `${f}: prefers-reduced-motion belongs only in tokens.css and 95-motion.css`);
  }
});

test('motion tiers in Chromium: with the OS set to reduce, data-motion=on keeps T0/T1 durations, absent and off zero them #motion-tiers', async (t) => {
  /** @type {any} */ let pw;
  try { pw = await import('playwright'); } catch { t.skip('playwright not linked (node tools/dev-setup.mjs)'); return; }
  const browser = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  try {
    const { css: bundle } = bundleCss({ tokens: css, stylesDir: join(SITE, 'src/styles'), minify: false });
    for (const reduced of ['reduce', 'no-preference']) {
      const ctx = await browser.newContext({ reducedMotion: reduced });
      const page = await ctx.newPage();
      await page.setContent(`<!doctype html><html class="js"><head><style>${bundle}</style></head><body><a href="#x" class="t">x</a><main><h1>t</h1><section data-reveal="in" class="r">r</section><svg data-t2 class="l"></svg></main></body></html>`);
      for (const motion of [null, 'on', 'off']) {
        const got = await page.evaluate((m) => {
          const h = document.documentElement;
          if (m) h.setAttribute('data-motion', m); else h.removeAttribute('data-motion');
          const s = getComputedStyle(h);
          return { t0: s.getPropertyValue('--dur-t0').trim(), t1: s.getPropertyValue('--dur-t1').trim(), fast: s.getPropertyValue('--motion-duration-fast').trim(), reveal: getComputedStyle(/** @type {Element} */ (document.querySelector('.r'))).transitionDuration };
        }, motion);
        const effective = motion === 'on' || (motion === null && reduced === 'no-preference');
        const ms = (/** @type {string} */ v) => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000);
        const label = `reduce=${reduced} data-motion=${motion}`;
        if (effective) {
          assert.equal(ms(got.t0), 220, `${label}: --dur-t0`);
          assert.equal(ms(got.t1), 600, `${label}: --dur-t1`);
          assert.equal(ms(got.fast), 140, `${label}: --motion-duration-fast`);
          assert.match(got.reveal, /^0\.6s/, `${label}: T1 reveal transition runs`);
        } else {
          assert.equal(ms(got.t0), 0, `${label}: --dur-t0`);
          assert.equal(ms(got.t1), 0, `${label}: --dur-t1`);
          assert.equal(ms(got.fast), 0, `${label}: --motion-duration-fast`);
          assert.match(got.reveal, /^0s/, `${label}: T1 reveal is instant`);
        }
      }
      await ctx.close();
    }
  } finally { await browser.close(); }
});

test('contrast gate: every pair passes today, and a broken token fails the named rule #contrast-gate', () => {
  const tool = join(REPO, 'brand/check-contrast.mjs');
  const ok = spawnSync(process.execPath, [tool], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(readFileSync(tool, 'utf8'), /^export const RULES = \['all-pairs', 'focus-pairs', 'glass-worst-case'\];$/m);
  const dir = mkdtempSync(join(tmpdir(), 'rnc-contrast-'));
  try {
    /** @type {[string, (j: any) => void][]} */
    const faults = [
      ['focus-pairs', (j) => { j.focus.halo.$value = j.focus.ring.$value; }],
      ['all-pairs', (j) => { j.color['ink-3'].$value = '#3A4A40'; }],
      ['glass-worst-case', (j) => { j.material.regular.$value = 'rgba(10, 24, 18, 0.60)'; }],
    ];
    for (const [rule, mutate] of faults) {
      const j = JSON.parse(JSON.stringify(json));
      mutate(j);
      const f = join(dir, `${rule}.json`);
      writeFileSync(f, JSON.stringify(j));
      const r = spawnSync(process.execPath, [tool, '--no-baseline'], { encoding: 'utf8', env: { ...process.env, RNC_TOKENS: f } });
      assert.equal(r.status, 1, `${rule}: a broken token must fail\n${r.stdout}`);
      assert.match(r.stderr, new RegExp(`\\[${rule}\\]`), `${rule}: reported under its rule id`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
