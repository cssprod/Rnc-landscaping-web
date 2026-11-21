#!/usr/bin/env node
// Usage: node brand/check-contrast.mjs [--quiet]
// Reads tokens.json and checks WCAG 2.2 contrast for every text, UI and focus/background pairing
// the site uses, in the light and dark appearances. Exits 1 on any failure.
//
// A colour reference is a color token name ("ink"), "material.<name>@<base>" (a translucent
// material composited over a base colour token or #hex), or a literal "#RRGGBB".
// Focus rules (WCAG 1.4.11 / 2.4.13): the ring needs >= 3:1 against every surface it is drawn on.
//   --color-focus          light surfaces (bg, elevated, grouped, tint, sky, chrome and menu glass)
//   --color-focus-on-deep  Fir night bands (footer, CTA, credentials), dark glass, photo scrims
//   --color-focus-halo     dark halo outside the ring on photos (ring vs halo, halo vs light pixels)
import { readFileSync } from 'node:fs';
const T = JSON.parse(readFileSync(new URL('./tokens.json', import.meta.url), 'utf8'));
const quiet = process.argv.includes('--quiet');

/** @param {any} n @param {string} mode */
const pick = (n, mode) => (mode === 'dark' ? (n.$extensions?.['ca.rnc.dark'] ?? n.$value) : n.$value);
/** @param {string} k @param {string} mode @returns {string} */
const tokenVal = (k, mode) => {
  const n = T.color[k];
  if (!n) throw new Error(`unknown colour token ${k}`);
  const v = pick(n, mode);
  return /^\{color\.(.+)\}$/.test(v) ? tokenVal(v.slice(7, -1), mode) : v;
};
const rgb = (/** @type {string} */ s) => (s.startsWith('#') ? [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)) : s.match(/[\d.]+/g).slice(0, 3).map(Number));
const alpha = (/** @type {string} */ s) => (s.startsWith('rgba') ? Number(s.match(/[\d.]+/g)[3]) : 1);
const hex = (/** @type {number[]} */ c) => `#${c.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
const over = (/** @type {string} */ fg, /** @type {string} */ bg) => { const a = alpha(fg), f = rgb(fg), b = rgb(bg); return hex(f.map((c, i) => c * a + b[i] * (1 - a))); };
/** Resolve a reference to an opaque #hex. @param {string} ref @param {string} mode @param {string} [base] */
function resolve(ref, mode, base) {
  if (ref.startsWith('#')) return ref;
  if (ref.startsWith('material.')) {
    const [m, on] = ref.slice(9).split('@');
    const fill = pick(T.material[m], mode);
    return over(fill, resolve(on || 'bg', mode));
  }
  const v = tokenVal(ref, mode);
  return alpha(v) < 1 ? over(v, base || resolve('bg', mode)) : (v.startsWith('#') ? v : hex(rgb(v)));
}
const lum = (/** @type {string} */ h) => { const l = rgb(h).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
const ratio = (/** @type {string} */ a, /** @type {string} */ b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const LIGHT_SURFACES = ['bg', 'bg-elevated', 'bg-grouped', 'bg-tint', 'placeholder-bg', 'material.chrome@bg', 'material.thick@bg-elevated', 'material.thick@bg'];
const DEEP_SURFACES = ['deep', 'deep-2', 'material.media@deep', 'material.media-strong@#000000', 'material.media-strong@deep', 'focus-halo'];

/** [foreground, background, required, use] */
const P = [
  // text
  ['ink', 'bg', 4.5, 'body text'], ['ink', 'bg-elevated', 4.5, 'card text'], ['ink', 'bg-grouped', 4.5, 'sunken'], ['ink', 'bg-tint', 4.5, 'chips'],
  ['ink', 'material.chrome@bg', 4.5, 'header text on glass'], ['ink', 'material.thick@bg-elevated', 4.5, 'menu text on glass'],
  ['ink-2', 'bg', 4.5, 'secondary'], ['ink-2', 'bg-elevated', 4.5, 'secondary'], ['ink-2', 'bg-grouped', 4.5, 'secondary'], ['ink-2', 'bg-tint', 4.5, 'secondary'],
  ['ink-3', 'bg', 4.5, 'tertiary'], ['ink-3', 'bg-elevated', 4.5, 'tertiary'], ['ink-3', 'bg-grouped', 4.5, 'tertiary'],
  ['brand', 'bg', 4.5, 'links'], ['brand', 'bg-elevated', 4.5, 'links'], ['brand', 'bg-tint', 4.5, 'links on tint'], ['brand', 'material.chrome@bg', 4.5, 'nav links'],
  ['brand-ink', 'brand', 4.5, 'primary button'], ['brand-2', 'bg', 4.5, 'fern links'], ['brand-2', 'bg-elevated', 3, 'icons'],
  ['on-deep', 'deep', 4.5, 'deep band text'], ['on-deep-2', 'deep', 4.5, 'deep band secondary'], ['on-deep', 'deep-2', 4.5, 'deep-2 text'], ['on-deep-2', 'deep-2', 4.5, 'deep-2 secondary'],
  ['#FFFFFF', 'material.media-strong@#FFFFFF', 4.5, 'white text on dark glass over a white photo'],
  ['placeholder', 'placeholder-bg', 4.5, 'placeholder chip'], ['success', 'bg', 4.5, 'status'], ['error', 'bg', 4.5, 'errors'], ['error', 'bg-elevated', 4.5, 'errors'],
  // UI boundaries
  ['line-strong', 'bg', 3, 'field border'], ['line-strong', 'bg-elevated', 3, 'field border'],
  // focus rings: every pairing
  ...LIGHT_SURFACES.map((s) => ['focus', s, 3, 'focus ring']),
  ...DEEP_SURFACES.map((s) => ['focus-on-deep', s, 3, 'focus ring (deep / photo)']),
  ['focus-halo', '#FFFFFF', 3, 'focus halo against light photo pixels'],
  ['focus-halo', '#DCE9EC', 3, 'focus halo against a pale sky in a photo'],
];

let fail = 0;
for (const mode of ['light', 'dark']) {
  if (!quiet) console.log(`\n${mode}\n| Foreground | Background | Ratio | Required | Use | Pass |\n|---|---|---|---|---|---|`);
  for (const [f, b, req, use] of P) {
    const bg = resolve(String(b), mode);
    const fg = resolve(String(f), mode, bg);
    const r = ratio(fg, bg);
    if (r < Number(req)) fail++;
    if (!quiet || r < Number(req)) console.log(`| ${f} | ${b} | ${r.toFixed(2)}:1 | ${req}:1 | ${use} | ${r >= Number(req) ? 'yes' : 'NO'} |`);
  }
}
console.log(fail ? `\n${fail} pairing(s) fail` : `\n✓ ${P.length * 2} pairings pass in light and dark`);
process.exit(fail ? 1 : 0);
