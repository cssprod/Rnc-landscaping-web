// @ts-check
/**
 * ds-chrome (W2): the page shell's contracts that need no browser (CONTRACT §3, §5, §8, §11, §13; COMPONENTS.md §Chrome).
 * Token values are module state in site.config.mjs; tests that need a known PHONE / EMAIL set them and restore them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tokens } from '../../site.config.mjs';
import { telLink, smsLink, mailLink } from '../../src/lib/tokens.mjs';
import * as layoutModule from '../../src/components/layout.mjs';
import { sprite, icon, ICON_NAMES } from '../../src/components/sprite.mjs';
import { INLINE_SCRIPTS } from '../../src/lib/head-scripts.mjs';
import { testEnv } from '../helpers/env.mjs';

const { layout } = layoutModule;
const SRC = (/** @type {string} */ p) => readFileSync(new URL(`../../src/${p}`, import.meta.url), 'utf8');

/** Run fn with some tokens set, then restore them. @param {Record<string, string>} set @param {() => void} fn */
function withTokens(set, fn) {
  const before = Object.fromEntries(Object.keys(set).map((k) => [k, tokens[k]]));
  Object.assign(tokens, set);
  try { fn(); } finally { Object.assign(tokens, before); }
}

/** @param {any} env @param {object} [p] */
const page = (env, p = {}) => String(layout(env, { path: '/about/', title: 'About', description: 'About RNC', crumbs: [{ name: 'Home', path: '/' }, { name: 'About', path: '/about/' }], body: '<h1>About</h1>', ...p }));

test('contact links: plain text until the token is known, then tel:/sms:/mailto: with the CONTRACT §13 names #tel-sms-mailto', () => {
  withTokens({ PHONE: null, EMAIL: null }, () => {
    for (const out of [telLink('footer'), smsLink('footer', { label: 'Text' }), mailLink('footer')].map(String)) {
      assert.doesNotMatch(out, /href=/, out);
      assert.match(out, /^<span[^>]*>(Text )?\[(PHONE|EMAIL)\]<\/span>$/);
    }
  });
  withTokens({ PHONE: '250-555-0100 ext 2', EMAIL: 'hello@example.test' }, () => {
    assert.equal(String(telLink('footer')), '<a class="" href="tel:+12505550100;ext=2" data-track="call_click" data-track-location="footer">[PHONE]</a>');
    assert.equal(String(smsLink('footer', { label: 'Text' })), '<a class="" href="sms:+12505550100" data-track="sms_click" data-track-location="footer">Text [PHONE]</a>');
    assert.equal(String(mailLink('contact_page', { className: 'x' })), '<a class="x" href="mailto:hello@example.test" data-track="email_click" data-track-location="contact_page">[EMAIL]</a>');
  });
});

test('no retired v2 event name is emitted by the chrome sources #tel-sms-mailto', () => {
  for (const f of ['components/layout.mjs', 'lib/tokens.mjs', 'scripts/main.js']) {
    const src = SRC(f);
    assert.doesNotMatch(src, /\b(call_clicked|email_clicked|quote_submitted|quote_step_completed)\b/, f);
  }
  const main = SRC('scripts/main.js');
  for (const n of ['call_click', 'sms_click', 'email_click']) assert.match(main, new RegExp(`track\\('${n}'`));
});

test('the shell: one Main nav, disclosure hooks, toggles, sticky bar, no JS_FLAG #disclosure-breadcrumbs', () => {
  const env = testEnv();
  const html = page(env);
  assert.equal((html.match(/<nav\b[^>]*aria-label="Main"/g) || []).length, 1);
  assert.equal((html.match(/<header class="site-header" data-header>/g) || []).length, 1);
  assert.doesNotMatch(html, /data-mega/);
  assert.doesNotMatch(html, /href="#"/);
  const buttons = html.match(/<button type="button" class="site-nav__disclosure"[^>]*>/g) || [];
  assert.equal(buttons.length, 2);
  for (const b of buttons) assert.match(b, /aria-expanded="false" aria-controls="menu-(services|areas)" data-disclosure>/);
  assert.equal((html.match(/data-disclosure-panel/g) || []).length, 2);
  for (const [pref, name] of [['theme', 'Dark theme'], ['motion', 'Animations']]) {
    assert.match(html, new RegExp(`<button type="button" class="pref-toggle" data-pref="${pref}" aria-pressed="(true|false)">[\\s\\S]*?<span class="pref-toggle__label">${name}</span></button>`));
  }
  assert.match(html, /<div class="action-bar" data-action-bar>/);
  assert.match(html, /<nav class="crumbs" aria-label="Breadcrumb"><ol>/);
  assert.ok(!('JS_FLAG' in layoutModule), 'the seed-time JS_FLAG alias is deleted (CONTRACT §11)');
  // Only the frozen inline scripts.
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) assert.ok(INLINE_SCRIPTS.includes(m[1]), m[1].slice(0, 60));
});

test('sticky bar: Contact → /contact/ until PHONE is known, then a tracked tel: Call #sticky-bar', () => {
  const env = testEnv();
  withTokens({ PHONE: null }, () => {
    const bar = page(env).match(/<div class="action-bar" data-action-bar>[\s\S]*?<\/div>/)?.[0] || '';
    assert.match(bar, /<a class="btn action-bar__btn action-bar__call" href="\/contact\/">[\s\S]*Contact<\/a>/);
    assert.match(bar, /href="\/free-quote\/">Get a free quote<\/a>/);
    assert.doesNotMatch(bar, /tel:/);
  });
  withTokens({ PHONE: '250-555-0100' }, () => {
    const html = page(env);
    const bar = html.match(/<div class="action-bar" data-action-bar>[\s\S]*?<\/div>/)?.[0] || '';
    assert.match(bar, /href="tel:\+12505550100" data-track="call_click" data-track-location="sticky_bar">[\s\S]*Call<span class="vh"> \[PHONE\]<\/span><\/a>/, "the number is substituted by finalizeTokens at build time");
    assert.match(html, /class="site-nav__call" href="tel:\+12505550100" data-track="call_click" data-track-location="header"/);
  });
});

test('header Call: text + chip in showcase, omitted in launch while PHONE is unknown #header-call', () => {
  withTokens({ PHONE: null }, () => {
    assert.match(page(testEnv()), /<span class="site-nav__call">[\s\S]*?Call <\/span>\[PHONE\]<\/span><\/span>/);
    assert.doesNotMatch(page(testEnv({ launch: true })), /site-nav__call"/);
  });
});

test('Plausible only in launch builds with [PLAUSIBLE DOMAIN]; no other third-party origin in the head (A13 #28)', () => {
  const plausible = /<script defer data-domain="stats\.example\.test" src="https:\/\/plausible\.io\/js\/script\.js"><\/script>/;
  assert.doesNotMatch(page({ ...testEnv(), analyticsDomain: 'stats.example.test' }), /plausible/, 'never in a showcase build');
  assert.doesNotMatch(page(testEnv({ launch: true })), /plausible/, 'not without a domain');
  assert.match(page({ ...testEnv({ launch: true }), analyticsDomain: 'stats.example.test' }), plausible);
  const html = page(testEnv());
  const origins = new Set([...html.matchAll(/\s(?:src|href)="(https?:\/\/[^/"]+)/g)].map((m) => m[1]));
  assert.deepEqual([...origins], [], 'no third-party origin on a page without stock photos');
  assert.match(page(testEnv(), { body: '<h1>x</h1><img src="https://images.unsplash.com/photo-1">' }), /<link rel="preconnect" href="https:\/\/images\.unsplash\.com">/);
});

test('head: dark-first theme-color and color-scheme, both font preloads (CONTRACT §8)', () => {
  const html = page({ ...testEnv(), themeColors: { dark: '#06110C', light: '#F2F6F3', background: '#06110C' } });
  assert.match(html, /<meta name="color-scheme" content="dark light">/);
  assert.equal((html.match(/<meta name="theme-color"/g) || []).length, 1);
  assert.match(html, /<meta name="theme-color" content="#06110C">/);
  assert.doesNotMatch(html, /prefers-color-scheme/);
  assert.match(html, /<link rel="preload" href="\/assets\/fonts\/inter-latin-var\.woff2" as="font" type="font\/woff2" crossorigin>/);
  assert.match(html, /<link rel="preload" href="\/assets\/fonts\/newsreader-latin-italic-var\.woff2" as="font" type="font\/woff2" crossorigin>/);
});

test('footer: the drawn-art honesty line in every build; the showcase note only in showcase', () => {
  assert.match(page(testEnv()), /Illustrations are drawn art, not photos of RNC projects\./);
  assert.match(page(testEnv({ launch: true })), /Illustrations are drawn art, not photos of RNC projects\./);
  assert.doesNotMatch(page(testEnv({ launch: true })), /Showcase edition/);
  assert.match(page(testEnv()), /<footer class="site-footer">\s*<div class="site-footer__glow" aria-hidden="true"><\/div>\s*<div class="on-deep site-footer__body">/);
});

test('main.js: no pointer sheen, no static feature imports, no direct reduced-motion query (CONTRACT §8, §12)', () => {
  const main = SRC('scripts/main.js');
  assert.doesNotMatch(main, /prefers-reduced-motion/);
  assert.doesNotMatch(main, /import\s+['"]\.\/(quote|projects|areas|living)\.js['"]/);
  assert.doesNotMatch(main, /pointermove|--mx/);
  assert.match(main, /from '\.\/lib\/prefs\.js'/);
  for (const f of ['scripts/main.js', 'scripts/lib/track.js']) assert.doesNotMatch(SRC(f), /prefers-reduced-motion/, f);
  assert.doesNotMatch(SRC('components/layout.mjs'), /JS_FLAG\s*=/);
});

test('sprite: every icon DESIGN-DIRECTION.md and COMPONENTS.md name, each drawable and shakeable', () => {
  for (const n of ['moon', 'fireflies', 'phone', 'chat', 'mail', 'clock', 'pin', 'arrow', 'chevron', 'chevron-right', 'menu', 'close', 'check', 'copy',
    'external', 'calendar', 'shield', 'doc', 'badge', 'compass', 'map', 'question', 'info', 'alert', 'columns', 'building', 'home', 'leaf', 'spade',
    'drop', 'tree', 'sprout', 'sun', 'snow', 'download', 'quote', 'contour', 'route', 'plus', 'minus', 'filter']) {
    assert.ok(ICON_NAMES.includes(n), `missing icon ${n}`);
    assert.match(String(sprite()), new RegExp(`<symbol id="i-${n}" `));
  }
  assert.equal(String(icon('moon', { size: 22 })), '<svg class="i " width="22" height="22" aria-hidden="true" focusable="false"><use href="#i-moon"/></svg>');
  const only = String(sprite(['moon']));
  assert.match(only, /id="i-moon"/);
  assert.doesNotMatch(only, /id="i-phone"/);
  assert.match(only, /id="logo-tile"/, 'the logo symbols are always present');
});
