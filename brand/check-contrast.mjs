#!/usr/bin/env node
// @ts-check
/**
 * WCAG 2.2 contrast of every token pair the site renders, in both themes (CONTRACT §15, DESIGN-DIRECTION §3).
 *   node brand/check-contrast.mjs          summary; exits 1 on any failure
 *   node brand/check-contrast.mjs --md     every check as a Markdown table
 *   node brand/check-contrast.mjs --json   every check as JSON
 *
 * WCAG 2 relative luminance with alpha compositing; translucent fills are composited over what sits behind them, and
 * no backdrop blur is ever credited. The single source is brand/tokens.json (resolved per theme by build-tokens.mjs),
 * so a token change is re-checked here before it ships. Rules:
 *   all-pairs        text (4.5:1) and UI (3:1) on every content surface: page fills, lit-solid card gradient stops (and
 *                    under the spotlight peak), chips, buttons, deep bands (also under the CTA blob peaks + scrim and the
 *                    .on-deep re-declared values), hero copy on every sky stop + aurora, toggle state cues
 *   focus-pairs      the two-tone ring: on every surface (art extremes and the brand button included) the better tone is
 *                    >= 3:1, and ring vs halo >= 3:1, in both themes and on deep bands
 *   glass-worst-case regular / thick / chrome over each art-palette extreme with ink, ink-2, ink-3 and brand; ultrathin and
 *                    thin only over page fills; media chips over art; the solid fallbacks; and each text-bearing
 *                    material's alpha >= its ca.rnc.minAlpha[theme], which must itself be >= the computed minimum
 */
import { readFileSync } from 'node:fs';
import { resolve as tok } from './build-tokens.mjs';
import { report } from '../site/tools/lib.mjs';

export const RULES = ['all-pairs', 'focus-pairs', 'glass-worst-case'];

// RNC_TOKENS=<file> checks another tokens file (fault-injection tests); the gate always reads brand/tokens.json.
const json = JSON.parse(readFileSync(process.env.RNC_TOKENS || new URL('./tokens.json', import.meta.url), 'utf8'));
/** @typedef {'dark'|'light'} Theme */
/** @type {Theme[]} */ const THEMES = ['dark', 'light'];

/** @param {string} s @returns {{ c: number[], a: number }} */
function parse(s) {
  const h = s.trim();
  if (h.startsWith('#')) {
    const x = h.length === 4 ? h.slice(1).split('').map((d) => d + d).join('') : h.slice(1);
    return { c: [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)), a: x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1 };
  }
  const n = (h.match(/[\d.]+/g) || []).map(Number);
  if (!/^rgba?\(/.test(h) || n.length < 3) throw new Error(`not a colour: ${s}`);
  return { c: n.slice(0, 3), a: n[3] ?? 1 };
}
const hex = (/** @type {number[]} */ c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
/** fg composited over an opaque bg. @param {string} fg @param {string} bg */
const over = (fg, bg) => { const f = parse(fg), b = parse(bg); return hex(f.c.map((v, i) => v * f.a + b.c[i] * (1 - f.a))); };
/** @param {string} s */
const lum = (s) => { const l = parse(s).c.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
/** WCAG contrast ratio; a translucent fg is composited over bg first. @param {string} fg @param {string} bg */
export const ratio = (fg, bg) => { const F = parse(fg).a < 1 ? over(fg, bg) : fg; const [x, y] = [lum(F), lum(bg)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/** Stops of a gradient token ($value array) in a theme. @param {string} path @param {Theme} t */
const stops = (path, t) => {
  let n = json; for (const k of path.split('.')) n = n[k];
  const css = t === 'light' ? n.$extensions?.['ca.rnc.light'] : n.$extensions?.['ca.rnc.css'];
  if (typeof css === 'string') return [...css.matchAll(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/g)].map((m) => m[1]);
  return n.$value.map((/** @type {{color: string}} */ s) => s.color);
};

/** @typedef {{ rule: string, theme: Theme, kind: string, fg: string, fgValue: string, surface: string, surfaceValue: string, ratio: number, min: number }} Row */
/** @type {Row[]} */ const rows = [];
/** @type {{ rule: string, message: string }[]} */ const extra = [];
/** @param {string} rule @param {Theme} theme @param {string} kind @param {string} fg @param {string} fgValue @param {string} surface @param {string} surfaceValue @param {number} min */
const add = (rule, theme, kind, fg, fgValue, surface, surfaceValue, min) => rows.push({ rule, theme, kind, fg, fgValue, surface, surfaceValue, ratio: ratio(fgValue, surfaceValue), min });

const TEXT = ['ink', 'ink-2', 'ink-3', 'brand', 'brand-2', 'placeholder', 'success', 'error'];
const onDeep = /** @type {string[]} */ (json.$extensions['ca.rnc.onDeep'] || []).filter((p) => p.startsWith('color.') && !/line|bg|brand-ink|brand-hover/.test(p));
const band = (/** @type {Theme} */ t) => [1, 2, 3].map((i) => [`band: blob ${i} peak + scrim`, over(tok(json, 'scene.band-scrim', t), over(tok(json, `scene.band-blob-${i}`, t), tok(json, 'scene.band-bg', t)))]);

for (const t of THEMES) {
  const C = (/** @type {string} */ k) => tok(json, `color.${k}`, t);
  const S = (/** @type {string} */ k) => tok(json, `scene.${k}`, t);
  const M = (/** @type {string} */ k) => tok(json, `material.${k}`, t);
  const F = (/** @type {string} */ k) => tok(json, `focus.${k}`, t);

  /* ---------- all-pairs ---------- */
  /** @type {Record<string, string>} */
  const surfaces = { bg: C('bg'), 'bg-elevated': C('bg-elevated'), 'bg-grouped': C('bg-grouped'), 'bg-tint': C('bg-tint') };
  stops('surface.card', t).forEach((s, i) => (surfaces[`surface.card stop ${i + 1}`] = s));
  stops('surface.card-hi', t).forEach((s, i) => (surfaces[`surface.card-hi stop ${i + 1}`] = s));
  surfaces['surface.card stop 1 + spotlight peak'] = over(tok(json, 'glow.spot', t), stops('surface.card', t)[0]);
  surfaces['surface.card-hi stop 1 + spotlight peak'] = over(tok(json, 'glow.spot', t), stops('surface.card-hi', t)[0]);
  for (const [sn, s] of Object.entries(surfaces)) {
    for (const k of TEXT) add('all-pairs', t, 'text', k, C(k), sn, s, 4.5);
    if (!sn.includes('spotlight')) add('all-pairs', t, 'non-text (field border)', 'line-strong', C('line-strong'), sn, s, 3);
  }
  for (const sn of ['bg', 'bg-elevated']) add('all-pairs', t, 'text (chip)', 'placeholder', C('placeholder'), `placeholder-bg over ${sn}`, over(C('placeholder-bg'), surfaces[sn]), 4.5);
  add('all-pairs', t, 'text (button)', 'brand-ink', C('brand-ink'), 'brand', C('brand'), 4.5);
  add('all-pairs', t, 'text (button)', 'brand-ink', C('brand-ink'), 'brand-hover', C('brand-hover'), 4.5);
  add('all-pairs', t, 'text (chip)', 'ink', C('ink'), 'bg-tint', C('bg-tint'), 4.5);
  add('all-pairs', t, 'text (illustration)', 'ink', C('ink'), 'sky', C('sky'), 4.5);
  // Deep bands are dark in both themes; .on-deep re-declares the dark text values there.
  /** @type {Record<string, string>} */
  const deep = { deep: C('deep'), 'deep-2': C('deep-2'), ...Object.fromEntries(band(t)) };
  for (const [sn, s] of Object.entries(deep)) {
    for (const k of ['on-deep', 'on-deep-2', 'accent-on-deep']) add('all-pairs', t, 'text on deep', k, C(k), sn, s, 4.5);
    for (const p of onDeep) add('all-pairs', t, 'text on deep (.on-deep value)', `${p.slice(6)} (dark)`, tok(json, p, 'dark'), sn, s, 4.5);
    add('all-pairs', t, 'text on deep (chip)', 'placeholder (dark)', tok(json, 'color.placeholder', 'dark'), `${sn} + placeholder-bg (dark)`, over(tok(json, 'color.placeholder-bg', 'dark'), s), 4.5);
  }
  add('all-pairs', t, 'text on deep (button)', 'brand-ink (dark)', tok(json, 'color.brand-ink', 'dark'), 'brand (dark)', tok(json, 'color.brand', 'dark'), 4.5);
  // Hero copy sits on the sky only (layout rule H1: copy never overlaps land), aurora at full alpha.
  for (const st of ['sky-top', 'sky-mid', 'sky-low']) {
    add('all-pairs', t, 'hero text', 'brand (accent)', C('brand'), st, S(st), 4.5);
    for (const a of ['aurora-1', 'aurora-2', 'aurora-3']) {
      const s = over(S(a), S(st));
      for (const k of ['ink', 'ink-2', 'brand']) add('all-pairs', t, 'hero text', k, C(k), `${st} + ${a}`, s, 4.5);
    }
  }
  // Toggle state cue: filled dot (brand) and hollow ring (ink-2) against the pill.
  for (const [sn, s] of [['pill (bg-elevated)', C('bg-elevated')], ['pill (chrome over sky-top)', over(M('chrome'), S('sky-top'))], ['pill (chrome over orb)', over(M('chrome'), S('orb'))]]) {
    add('all-pairs', t, 'non-text (toggle)', 'dot filled = brand', C('brand'), sn, s, 3);
    add('all-pairs', t, 'non-text (toggle)', 'dot hollow = ink-2', C('ink-2'), sn, s, 3);
  }

  /* ---------- glass-worst-case ---------- */
  /** @type {Record<string, string>} */
  const art = { orb: S('orb'), 'art-bright': S('art-bright'), 'art-glow': S('art-glow'), 'art-dark': S('art-dark'), 'far-range': S('far-range'), 'sky-top': S('sky-top'), 'sky-low': S('sky-low') };
  const GLASS_TEXT = ['ink', 'ink-2', 'ink-3', 'brand'];
  for (const m of ['regular', 'thick', 'chrome']) for (const [an, a] of Object.entries(art)) {
    const s = over(M(m), a);
    for (const k of GLASS_TEXT) add('glass-worst-case', t, 'glass over art', k, C(k), `${m} over ${an}`, s, 4.5);
  }
  for (const m of ['ultrathin', 'thin']) for (const sn of ['bg', 'bg-tint']) {
    const s = over(M(m), surfaces[sn]);
    for (const k of ['ink', 'ink-2']) add('glass-worst-case', t, 'glass over page only', k, C(k), `${m} over ${sn}`, s, 4.5);
  }
  for (const m of ['media', 'media-strong']) for (const [an, a] of Object.entries(art)) add('glass-worst-case', t, 'media chip over art', 'on-deep', C('on-deep'), `${m} over ${an}`, over(M(m), a), 4.5);
  // Solid fallbacks (prefers-reduced-transparency, prefers-contrast: more, no backdrop-filter): text materials become
  // bg-elevated (checked above as a content surface); media materials become their ca.rnc.solid colour.
  for (const m of ['media', 'media-strong']) {
    const solid = json.material[m].$extensions?.['ca.rnc.solid'];
    if (!solid) extra.push({ rule: 'glass-worst-case', message: `material.${m} has no ca.rnc.solid fallback` });
    else add('glass-worst-case', t, 'solid fallback', 'on-deep', C('on-deep'), `material.${m} solid`, solid, 4.5);
  }
  for (const k of GLASS_TEXT) add('glass-worst-case', t, 'solid fallback', k, C(k), 'material solid = bg-elevated', C('bg-elevated'), 4.5);
  // Minimum alphas: the least fill alpha at which every text colour still passes over every art extreme.
  for (const [m, texts, fg] of /** @type {[string, string[], ((k: string) => string)][]} */ ([['regular', GLASS_TEXT, C], ['thick', GLASS_TEXT, C], ['chrome', GLASS_TEXT, C], ['media', ['on-deep'], C], ['media-strong', ['on-deep'], C]])) {
    const fill = parse(M(m));
    const passes = (/** @type {number} */ a) => Object.values(art).every((bg) => texts.every((k) => ratio(fg(k), over(`rgba(${fill.c.join(', ')}, ${a})`, bg)) >= 4.5));
    let lo = 0, hi = 1;
    if (!passes(1)) { extra.push({ rule: 'glass-worst-case', message: `${t}: material.${m} fails 4.5:1 even when opaque` }); continue; }
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (passes(mid)) hi = mid; else lo = mid; }
    const need = Math.ceil(hi * 100) / 100;
    const declared = Number(json.material[m].$extensions?.['ca.rnc.minAlpha']?.[t]);
    if (!(declared >= need)) extra.push({ rule: 'glass-worst-case', message: `${t}: material.${m} ca.rnc.minAlpha is ${Number.isNaN(declared) ? 'missing' : declared}; the art extremes need >= ${need}` });
    if (fill.a < declared) extra.push({ rule: 'glass-worst-case', message: `${t}: material.${m} alpha ${fill.a} is below its minimum ${declared}` });
    rows.push({ rule: 'glass-worst-case', theme: t, kind: 'minimum alpha', fg: `alpha ${fill.a}`, fgValue: M(m), surface: `material.${m} needs >= ${need}`, surfaceValue: '', ratio: fill.a, min: need });
  }

  /* ---------- focus-pairs ---------- */
  const ring = F('ring'), halo = F('halo');
  /** @type {Record<string, string>} */
  const fs = { ...surfaces, brand: C('brand'), 'brand-hover': C('brand-hover'), 'bg-tint': C('bg-tint'), ...art, 'chrome over orb': over(M('chrome'), art.orb), 'thick over art-glow': over(M('thick'), art['art-glow']), 'sky-low + aurora-1': over(S('aurora-1'), S('sky-low')), 'placeholder-bg over bg': over(C('placeholder-bg'), C('bg')) };
  for (const [sn, s] of Object.entries(fs)) {
    const r1 = ratio(ring, s), r2 = ratio(halo, s);
    rows.push({ rule: 'focus-pairs', theme: t, kind: 'focus best tone', fg: `ring ${r1.toFixed(2)} / halo ${r2.toFixed(2)}`, fgValue: r1 >= r2 ? ring : halo, surface: sn, surfaceValue: s, ratio: Math.max(r1, r2), min: 3 });
  }
  add('focus-pairs', t, 'focus tones', 'focus.ring', ring, 'focus.halo', halo, 3);
  const rd = F('ring-on-deep'), hd = F('halo-on-deep');
  for (const [sn, s] of Object.entries(deep)) {
    const r1 = ratio(rd, s), r2 = ratio(hd, s);
    rows.push({ rule: 'focus-pairs', theme: t, kind: 'focus on deep (best tone)', fg: `ring-on-deep ${r1.toFixed(2)} / halo-on-deep ${r2.toFixed(2)}`, fgValue: r1 >= r2 ? rd : hd, surface: sn, surfaceValue: s, ratio: Math.max(r1, r2), min: 3 });
    add('focus-pairs', t, 'focus on deep (ring)', 'focus.ring-on-deep', rd, sn, s, 3);
  }
  add('focus-pairs', t, 'focus tones', 'focus.ring-on-deep', rd, 'focus.halo-on-deep', hd, 3);
  if (tok(json, 'color.focus', t) !== ring) extra.push({ rule: 'focus-pairs', message: `${t}: color.focus must alias focus.ring` });
}

/* ---------- forbidden pairs: never rendered; documented so the layout rules that prevent them stay justified ---------- */
const forbidden = THEMES.flatMap((t) => [
  { theme: t, rule: 'H1: hero copy never overlaps land', pair: 'ink-2 over far-range', r: ratio(tok(json, 'color.ink-2', t), tok(json, 'scene.far-range', t)) },
  { theme: t, rule: 'no text on ultrathin over art', pair: 'ink-2 over ultrathin over orb', r: ratio(tok(json, 'color.ink-2', t), over(tok(json, 'material.ultrathin', t), tok(json, 'scene.orb', t))) },
]);

const fails = rows.filter((x) => x.ratio < x.min);
if (process.argv.includes('--json')) console.log(JSON.stringify({ rows, forbidden, extra }, null, 2));
else if (process.argv.includes('--md')) {
  console.log('| Rule | Theme | Kind | Foreground | Surface (composited) | Ratio | Min | Result |\n|---|---|---|---|---|---|---|---|');
  for (const x of rows) console.log(`| ${x.rule} | ${x.theme} | ${x.kind} | ${x.fg} \`${x.fgValue}\` | ${x.surface}${x.surfaceValue ? ` \`${x.surfaceValue}\`` : ''} | ${x.ratio.toFixed(2)} | ${x.min} | ${x.ratio >= x.min ? 'pass' : '**FAIL**'} |`);
  console.log('\n| Theme | Forbidden pair (prevented by layout) | Ratio |\n|---|---|---|');
  for (const f of forbidden) console.log(`| ${f.theme} | ${f.rule}: ${f.pair} | ${f.r.toFixed(2)} |`);
} else {
  for (const rule of RULES) for (const t of THEMES) {
    const r = rows.filter((x) => x.rule === rule && x.theme === t && x.kind !== 'minimum alpha');
    const worst = r.reduce((a, b) => (b.ratio - b.min < a.ratio - a.min ? b : a));
    console.log(`${rule.padEnd(17)} ${t.padEnd(5)} ${String(r.length).padStart(4)} checks, min ${worst.ratio.toFixed(2)}:1 (${worst.fg} on ${worst.surface}, needs ${worst.min})`);
  }
  for (const x of rows.filter((r) => r.kind === 'minimum alpha')) console.log(`minimum alpha     ${x.theme.padEnd(5)} ${x.surface}; token alpha ${x.ratio}`);
  for (const f of forbidden) console.log(`forbidden         ${f.theme.padEnd(5)} ${f.rule}: ${f.pair} ${f.r.toFixed(2)}:1`);
}
const ok = report('check-contrast', [
  ...fails.map((x) => ({ rule: x.rule, path: 'brand/tokens.json', message: `${x.theme}: ${x.kind}: ${x.fg} (${x.fgValue}) on ${x.surface} (${x.surfaceValue}) is ${x.ratio.toFixed(2)}:1, needs ${x.min}:1` })),
  ...extra.map((x) => ({ ...x, path: 'brand/tokens.json' })),
]);
console.log(`${rows.length} checks, ${fails.length + extra.length} failure(s)`);
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
