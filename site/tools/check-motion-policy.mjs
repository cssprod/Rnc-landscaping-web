#!/usr/bin/env node
// @ts-check
/**
 * Static motion-policy lint (CONTRACT §2 Motion, §9; .orchestra/direction/motion-policy.md §0 and §6.2). Offline, no
 * browser: it reads the CSS and script sources plus the built HTML and art (SITE_DIST) when they exist.
 *
 * Rules:
 *   banned-effects            nothing the contract bans:
 *                               - @keyframes that animate a custom property, filter, backdrop-filter, font-*, or a
 *                                 layout property (width, height, inset, top/right/bottom/left, margin, padding);
 *                               - stroke-dashoffset keyframes used outside a [data-drawn] rule, or infinitely;
 *                               - animation-timeline: view() and view-timeline (J2 V10); custom cursors;
 *                               - loader, carousel, marquee, typewriter, glitch or tilt keyframes and class names;
 *                               - <video>, <canvas>, <marquee>, autoplay, SMIL (<animate*>, <set>), Lottie or WebGL in
 *                                 the built pages, art files and scripts.
 *                             Legacy slices are checked too (their owners delete them).
 *   raw-durations             component CSS animates through the motion tokens (var(--dur-*)), never with a literal
 *                             time: a transition or a one-shot animation with a non-zero "120ms"/".3s" fails. A T2
 *                             loop (an infinite animation of 5 s or longer) may state its period. Exempt: brand tokens,
 *                             95-motion.css (the policy's own file) and the legacy slices until they are deleted.
 *   reduced-motion-placement  prefers-reduced-motion appears only in brand/tokens.css and 95-motion.css (legacy slices
 *                             are exempt except 50-legacy-32-ds-core.css, the kill switch ds-core deletes in W2), in no
 *                             inline <style> of a built page, and scripts never call matchMedia('(prefers-reduced-
 *                             motion…)') except scripts/lib/prefs.js (they ask motionOn() / onMotionChange()).
 * Exits 0 when there are no sources. Failures name the source file (repo-relative) or the built page.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { DIST, REPO, SITE, files, read, report } from './lib.mjs';

export const RULES = ['banned-effects', 'raw-durations', 'reduced-motion-placement'];

/** @type {import('./lib.mjs').Failure[]} */
const failures = [];
const fail = (/** @type {string} */ rule, /** @type {string} */ path, /** @type {string} */ message) => failures.push({ rule, path, message });

/* ------------------------------------------------------------------ a small CSS walker */
/**
 * Style rules and keyframes of a stylesheet, with nesting (at-rules and native nesting) resolved into a prelude stack.
 * @param {string} css
 * @returns {{ rules: { selector: string, at: string[], decls: { prop: string, value: string, line: number }[], line: number }[], keyframes: { name: string, body: string, line: number }[] }}
 */
export function parseCss(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const lineAt = (/** @type {number} */ i) => src.slice(0, i).split('\n').length;
  /** @type {ReturnType<typeof parseCss>['rules']} */ const rules = [];
  /** @type {ReturnType<typeof parseCss>['keyframes']} */ const keyframes = [];
  /** @param {number} i @param {string[]} at @param {string|null} sel @returns {number} index after the block */
  function block(i, at, sel) {
    /** @type {{ prop: string, value: string, line: number }[]} */ const decls = [];
    const start = i;
    let buf = '', bufStart = i;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '"' || ch === "'") { const j = src.indexOf(ch, i + 1); buf += src.slice(i, j < 0 ? src.length : j + 1); i = j < 0 ? src.length : j + 1; continue; }
      if (ch === '{') {
        const prelude = buf.trim();
        if (/^@(-webkit-)?keyframes\b/i.test(prelude)) {
          let d = 1, j = i + 1;
          for (; j < src.length && d; j++) { if (src[j] === '{') d++; else if (src[j] === '}') d--; }
          keyframes.push({ name: prelude.replace(/^@(-webkit-)?keyframes\s+/i, '').trim(), body: src.slice(i + 1, j - 1), line: lineAt(i) });
          i = j;
        } else if (prelude.startsWith('@')) i = block(i + 1, [...at, prelude], sel);
        else {
          const nested = sel ? prelude.split(',').map((p) => (p.includes('&') ? p.replace(/&/g, sel) : `${sel} ${p.trim()}`)).join(', ') : prelude;
          i = block(i + 1, at, nested);
        }
        buf = ''; bufStart = i; continue;
      }
      if (ch === ';' || ch === '}') {
        const d = buf.trim();
        const m = d.match(/^(-?[\w-]+)\s*:\s*([\s\S]*)$/);
        if (m && sel !== null) decls.push({ prop: m[1].toLowerCase(), value: m[2].trim(), line: lineAt(bufStart + buf.indexOf(d.charAt(0))) });
        buf = ''; bufStart = i + 1; i++;
        if (ch === '}') break;
        continue;
      }
      buf += ch; i++;
    }
    if (sel !== null && decls.length) rules.push({ selector: sel, at, decls, line: lineAt(start) });
    return i;
  }
  block(0, [], null);
  return { rules, keyframes };
}

/** Times in a value, in ms. @param {string} v */
const times = (v) => [...v.replace(/var\([^)]*\)|calc\([^)]*\)/g, ' ').matchAll(/(?<![\w-])(\d*\.?\d+)(ms|s)\b/g)].map((m) => Number(m[1]) * (m[2] === 's' ? 1000 : 1));
const LAYOUT = /^(width|height|min-width|min-height|max-width|max-height|inset|top|right|bottom|left|margin(-\w+)?|padding(-\w+)?)$/;
const BANNED_NAME = /(?:^|[-_.\s])(loader|preloader|page-loader|loading-screen|splash|spinner|carousel|swiper|slick|marquee|ticker|typewriter|typing|glitch|tilt)(?:$|[-_\s:.[,>+~)])/i;

/* ------------------------------------------------------------------ CSS sources */
const STYLES = join(SITE, 'src', 'styles');
const cssFiles = existsSync(STYLES) ? readdirSync(STYLES).filter((f) => f.endsWith('.css')).sort() : [];
const rel = (/** @type {string} */ f) => relative(REPO, f);

for (const name of cssFiles) {
  const file = join(STYLES, name);
  const path = rel(file);
  const css = readFileSync(file, 'utf8');
  const legacy = /^50-legacy-/.test(name);
  const motionFile = name === '95-motion.css';
  const { rules, keyframes } = parseCss(css);

  /* reduced-motion-placement */
  const prmAllowed = motionFile || (legacy && !/^50-legacy-32-/.test(name));
  if (!prmAllowed) {
    css.split('\n').forEach((l, i) => { if (/prefers-reduced-motion/.test(l.replace(/\/\*.*?\*\//g, ''))) fail('reduced-motion-placement', path, `line ${i + 1}: prefers-reduced-motion belongs only in brand/tokens.css and 95-motion.css (use the --dur-* tokens and [data-t2] hooks)${/^50-legacy-32-/.test(name) ? '; this slice is the legacy kill switch ds-core deletes in W2' : ''}`); });
  }

  /* banned-effects: keyframes */
  /** @type {Set<string>} */ const dashKeyframes = new Set();
  for (const k of keyframes) {
    if (BANNED_NAME.test(` ${k.name} `)) fail('banned-effects', path, `line ${k.line}: @keyframes ${k.name}: loaders, carousels, marquees, typewriter, glitch and tilt effects are banned`);
    for (const m of k.body.matchAll(/(?:^|[;{\s])(-?[\w-]+)\s*:/g)) {
      const prop = m[1].toLowerCase();
      if (prop.startsWith('--')) fail('banned-effects', path, `line ${k.line}: @keyframes ${k.name} animates the custom property ${prop} (a main-thread @property loop)`);
      else if (/^(-webkit-)?(filter|backdrop-filter)$/.test(prop) || /^font(-|$)/.test(prop) || LAYOUT.test(prop)) fail('banned-effects', path, `line ${k.line}: @keyframes ${k.name} animates ${prop}; only transform and opacity animate`);
      else if (prop === 'stroke-dashoffset') dashKeyframes.add(k.name);
    }
  }
  for (const r of rules) {
    const sel = r.selector.replace(/\s+/g, ' ');
    if (BANNED_NAME.test(` ${sel.replace(/\[[^\]]*\]/g, '')} `.replace(/[#.]/g, ' '))) fail('banned-effects', path, `line ${r.line}: selector "${sel.slice(0, 80)}": loaders, carousels, marquees, typewriter, glitch and tilt effects are banned`);
    const iterInfinite = r.decls.some((d) => d.prop === 'animation-iteration-count' && /\binfinite\b/.test(d.value));
    for (const d of r.decls) {
      if (/^animation-timeline$/.test(d.prop) && /\bview\(/.test(d.value)) fail('banned-effects', path, `line ${d.line}: animation-timeline: view() is banned (J2 V10); use the [data-reveal] IO hook`);
      if (/^view-timeline/.test(d.prop)) fail('banned-effects', path, `line ${d.line}: ${d.prop} is banned (J2 V10)`);
      if (d.prop === 'cursor' && /url\(|\bnone\b/.test(d.value)) fail('banned-effects', path, `line ${d.line}: custom cursors are banned (cursor: ${d.value.slice(0, 40)})`);
      if (d.prop === 'animation' || d.prop === 'animation-name') {
        for (const k of dashKeyframes) if (new RegExp(`(^|[\\s,])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s,])`).test(d.value)) {
          if (!/\[data-drawn\]/.test(sel)) fail('banned-effects', path, `line ${d.line}: stroke-dashoffset keyframes "${k}" run outside a [data-drawn] rule (T1 draws only)`);
          if (/\binfinite\b/.test(d.value) || iterInfinite) fail('banned-effects', path, `line ${d.line}: stroke-dashoffset keyframes "${k}" loop infinitely`);
        }
      }

      /* raw-durations */
      if (legacy || motionFile) continue;
      if (!/^(transition|transition-duration|transition-delay|animation|animation-duration|animation-delay)$/.test(d.prop)) continue;
      const lit = times(d.value).filter((t) => t > 0);
      if (!lit.length) continue;
      const loop = d.prop.startsWith('animation') && (/\binfinite\b/.test(d.value) || iterInfinite) && !/delay/.test(d.prop);
      if (loop && Math.min(...lit) >= 5000 && d.prop !== 'animation-delay') continue; // T2 loop period
      fail('raw-durations', path, `line ${d.line}: ${d.prop}: ${d.value.slice(0, 60)}: use var(--dur-t0) / var(--dur-t1) / var(--dur-draw) so reduced motion and data-motion=off make it instant`);
    }
  }
}

/* ------------------------------------------------------------------ scripts */
const SCRIPTS = join(SITE, 'src', 'scripts');
const walk = (/** @type {string} */ d) => (existsSync(d) ? readdirSync(d, { recursive: true }).map(String).filter((f) => f.endsWith('.js') && statSync(join(d, f)).isFile()) : []);
for (const f of walk(SCRIPTS)) {
  const path = rel(join(SCRIPTS, f));
  const js = readFileSync(join(SCRIPTS, f), 'utf8');
  if (f.replace(/\\/g, '/') !== 'lib/prefs.js') js.split('\n').forEach((l, i) => { if (/matchMedia\s*\(\s*['"`]\s*\(?\s*prefers-reduced-motion/.test(l)) fail('reduced-motion-placement', path, `line ${i + 1}: reads matchMedia('(prefers-reduced-motion…)') directly; ask motionOn() and listen to onMotionChange() from lib/prefs.js`); });
  js.split('\n').forEach((l, i) => {
    if (/getContext\s*\(\s*['"`](webgl2?|experimental-webgl|2d|webgpu)/.test(l)) fail('banned-effects', path, `line ${i + 1}: canvas/WebGL drawing is banned`);
    if (/\b(lottie|bodymovin)\b/i.test(l)) fail('banned-effects', path, `line ${i + 1}: Lottie is banned`);
  });
}

/* ------------------------------------------------------------------ built pages and art */
if (existsSync(DIST)) {
  const checkMarkup = (/** @type {string} */ path, /** @type {string} */ h) => {
    const body = h.replace(/<script[\s\S]*?<\/script>/g, '');
    for (const [re, what] of /** @type {[RegExp, string][]} */ ([
      [/<video\b/i, '<video>'], [/<canvas\b/i, '<canvas>'], [/<marquee\b/i, '<marquee>'], [/<blink\b/i, '<blink>'],
      [/<(audio|video|iframe)\b[^>]*\sautoplay\b/i, 'autoplaying media'], [/<(animate|animateTransform|animateMotion|set)\b/, 'SMIL animation'],
      [/<lottie-player\b|<dotlottie-player\b|\.lottie\b/i, 'Lottie'], [/<model-viewer\b/i, '3D/WebGL viewer'],
    ])) if (re.test(body)) fail('banned-effects', path, `${what} is banned (CONTRACT §2 Motion)`);
    for (const m of h.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) if (/prefers-reduced-motion/.test(m[1])) fail('reduced-motion-placement', path, 'an inline <style> uses prefers-reduced-motion; it belongs only in tokens.css and 95-motion.css');
  };
  for (const f of files('.html')) checkMarkup(f, read(f));
  for (const f of files('.svg')) if (!f.startsWith('assets/fonts/')) checkMarkup(f, read(f));
}

console.log(`  check-motion-policy: ${cssFiles.length} stylesheet(s), ${walk(SCRIPTS).length} script(s)${existsSync(DIST) ? ', built pages and art' : ''}`);
const ok = report('check-motion-policy', failures);
if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = ok ? 0 : 1;
export default ok;
