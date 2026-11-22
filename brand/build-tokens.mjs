#!/usr/bin/env node
// @ts-check
/**
 * Design-token compiler (zero dependencies), dark-first (CONTRACT §8, §9, §15).
 *   node brand/build-tokens.mjs          writes brand/tokens.css from brand/tokens.json
 *   node brand/build-tokens.mjs --check  exits 1 if tokens.css is out of date
 *
 * tokens.json follows the W3C Design Tokens (DTCG) format. $value is the dark ("Fir night") value: it is emitted on
 * :root, because a page without data-theme is dark for every visitor (prefers-color-scheme is never consulted).
 * Extensions used:
 *   $extensions['ca.rnc.default']  top level: "dark" (the theme $value describes)
 *   $extensions['ca.rnc.light']    light ("Pacific dawn") value, emitted under :root[data-theme="light"]
 *   $extensions['ca.rnc.css']      CSS expression used instead of $value (fluid clamp(), composites). {a.b} refs become var(--a-b).
 *   $extensions['ca.rnc.solid']    opaque value for prefers-reduced-transparency / prefers-contrast: more (media materials)
 *   $extensions['ca.rnc.onDeep']   top level: tokens re-declared with their dark value inside .on-deep (CTA band, footer)
 * The site build (site/build.mjs) imports generate() so the CSS it ships always matches tokens.json, and themeColors()
 * for <meta name="theme-color"> and site.webmanifest.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const here = (/** @type {string} */ p) => new URL(p, import.meta.url);

/** @param {string} path dotted path */
const varName = (path) => `--${path.replace(/\./g, '-')}`;

/** Replace {a.b} references with var(--a-b). @param {string} s */
const refs = (s) => s.replace(/\{([^}]+)\}/g, (_m, p) => `var(${varName(p)})`);

/** @param {any} v @param {string} [type] @returns {string} */
function cssValue(v, type) {
  if (typeof v === 'string') return refs(v);
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (type === 'fontFamily') return v.map((f) => (['serif', 'sans-serif', 'monospace', 'system-ui', '-apple-system', 'BlinkMacSystemFont'].includes(f) ? f : `"${f}"`)).join(', ');
    if (type === 'cubicBezier') return `cubic-bezier(${v.join(', ')})`;
    if (type === 'shadow') return v.map((s) => `${s.inset ? 'inset ' : ''}${cssValue(s.offsetX)} ${cssValue(s.offsetY)} ${cssValue(s.blur)} ${cssValue(s.spread)} ${refs(s.color)}`).join(', ');
    if (type === 'gradient') return `linear-gradient(180deg, ${v.map((s) => `${refs(s.color)} ${Math.round(s.position * 100)}%`).join(', ')})`;
  }
  if (v && typeof v === 'object' && 'value' in v && 'unit' in v) return `${v.value}${v.unit}`;
  throw new Error(`Cannot convert token value ${JSON.stringify(v)} (${type})`);
}

/**
 * @typedef {{ path: string, name: string, type?: string, dark: string, light?: string, solid?: string, description?: string }} Flat
 */
/**
 * Flatten the token tree.
 * @param {any} node @param {string[]} path @param {string|undefined} inheritedType @param {Flat[]} out
 */
function walk(node, path, inheritedType, out) {
  const type = node.$type || inheritedType;
  if ('$value' in node) {
    const ext = node.$extensions || {};
    const dark = ext['ca.rnc.css'] != null ? refs(ext['ca.rnc.css']) : cssValue(node.$value, type);
    const lightRaw = ext['ca.rnc.light'];
    const light = lightRaw == null ? undefined : (typeof lightRaw === 'string' ? refs(lightRaw) : cssValue(lightRaw, type));
    out.push({ path: path.join('.'), name: varName(path.join('.')), type, dark, light, solid: ext['ca.rnc.solid'], description: node.$description });
    return;
  }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$') && v && typeof v === 'object') walk(v, [...path, k], type, out);
}

/** @param {any} json @returns {Flat[]} */
export function flatten(json) {
  /** @type {Flat[]} */ const list = [];
  walk(json, [], undefined, list);
  return list;
}

/** @param {any} json @param {string} path */
function node(json, path) {
  let n = json;
  for (const k of path.split('.')) { n = n?.[k]; if (n == null) throw new Error(`unknown token ${path}`); }
  if (!('$value' in n)) throw new Error(`${path} is a group, not a token`);
  return n;
}

/**
 * The literal value of a token in one theme, following {a.b} references (a reference resolves in the same theme).
 * @param {any} json @param {string} path dotted token path @param {'dark'|'light'} [theme]
 * @returns {string}
 */
export function resolve(json, path, theme = 'dark') {
  const n = node(json, path);
  const raw = theme === 'light' && n.$extensions?.['ca.rnc.light'] != null ? n.$extensions['ca.rnc.light'] : n.$value;
  if (typeof raw !== 'string') return cssValue(raw, n.$type);
  const m = raw.match(/^\{([^}]+)\}$/);
  return m ? resolve(json, m[1], theme) : raw;
}

/** Browser chrome colours from the meta.* tokens: <meta name="theme-color"> per theme and the manifest colours. @param {any} json */
export function themeColors(json) {
  return { dark: resolve(json, 'meta.theme', 'dark'), light: resolve(json, 'meta.theme', 'light'), background: resolve(json, 'meta.background', 'dark') };
}

/** @param {any} json @returns {{ family: string, src: string, weight: string, style: string, display?: string, preload?: boolean }[]} */
export function fontFaces(json) {
  return json.$extensions?.['ca.rnc.fontFaces'] || [];
}

/** Contract aliases kept so older component code and CONTRACT.md names keep working (removed at W3b). */
const ALIASES = {
  '--font-display': 'var(--font-family-display)',
  '--font-text': 'var(--font-family-text)',
  '--font-quote': 'var(--font-family-serif)',
  '--step--1': 'var(--font-size-subheadline)',
  '--step-0': 'var(--font-size-body)',
  '--step-1': 'var(--font-size-title-3)',
  '--step-2': 'var(--font-size-title-2)',
  '--step-3': 'var(--font-size-title-1)',
  '--step-4': 'var(--font-size-large-title)',
  '--step-5': 'var(--font-size-display)',
  '--leading-tight': 'var(--font-leading-title)',
  '--leading-body': 'var(--font-leading-body)',
  '--content-max': 'var(--layout-content-max)',
  '--gutter': 'var(--layout-gutter)',
  '--dur-fast': 'var(--motion-duration-fast)',
  '--dur-base': 'var(--motion-duration-base)',
  '--dur-slow': 'var(--motion-duration-slow)',
  '--ease': 'var(--motion-easing-standard)',
  '--ease-out': 'var(--motion-easing-out)',
  '--ease-spring': 'var(--motion-easing-spring)',
};

/** Motion tiers (CONTRACT §9, motion-policy.md §1). Component CSS animates through these, never raw durations. */
const TIERS = {
  '--dur-t0': 'var(--motion-duration-base)',
  '--dur-t0-fast': 'var(--motion-duration-fast)',
  '--dur-t1': 'var(--motion-duration-reveal)',
  '--dur-theme': 'var(--motion-duration-slow)',
  '--dur-draw': 'var(--motion-duration-draw)',
  '--dur-dolly': 'var(--motion-duration-dolly)',
  '--dur-vt': 'var(--motion-duration-vt)',
  '--alive-play': 'running',
};

/** Everything that becomes 0ms when motion is not effective: the tier variables and the durations behind them. */
const ZERO = ['--motion-duration-fast', '--motion-duration-base', '--motion-duration-slow', '--motion-duration-reveal', '--motion-duration-draw', '--motion-duration-vt', '--motion-duration-dolly', '--dur-t0', '--dur-t0-fast', '--dur-t1', '--dur-theme', '--dur-draw', '--dur-dolly', '--dur-vt'];

/** @param {any} json @returns {string} */
export function generate(json) {
  if ((json.$extensions?.['ca.rnc.default'] ?? 'dark') !== 'dark') throw new Error('tokens.json: $extensions["ca.rnc.default"] must be "dark" (CONTRACT §15)');
  const list = flatten(json);
  const faces = fontFaces(json);
  const fallbacks = json.$extensions?.['ca.rnc.fallbacks'] || [];
  const onDeep = /** @type {string[]} */ (json.$extensions?.['ca.rnc.onDeep'] || []);
  const line = (/** @type {string} */ n, /** @type {string} */ v) => `  ${n}: ${v};`;
  const block = (/** @type {string} */ sel, /** @type {string[]} */ lines, indent = '') => `${indent}${sel} {\n${lines.map((l) => indent + l).join('\n')}\n${indent}}`;
  const out = [];
  out.push('/* RNC Landscaping design tokens: "Living Coast", dark-first (Fir night on :root, Pacific dawn under [data-theme="light"]).');
  out.push('   GENERATED from brand/tokens.json by brand/build-tokens.mjs. Edit the JSON, then run: node brand/build-tokens.mjs */');
  for (const f of faces) {
    out.push(`@font-face { font-family: "${f.family}"; src: url("${f.src}") format("woff2-variations"), url("${f.src}") format("woff2"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: ${f.display || 'swap'}; }`);
  }
  for (const f of fallbacks) {
    out.push(`@font-face { font-family: "${f.family}"; src: local("${f.local}"); size-adjust: ${f['size-adjust']}; ascent-override: ${f['ascent-override']}; descent-override: ${f['descent-override']}; line-gap-override: ${f['line-gap-override']}; }`);
  }
  // Dark is the default: no data-theme, or data-theme="dark" (an explicit stored choice that renders the same).
  out.push(block(':root', [line('color-scheme', 'dark'), ...list.map((t) => line(t.name, t.dark)), ...Object.entries(ALIASES).map(([n, v]) => line(n, v)), ...Object.entries(TIERS).map(([n, v]) => line(n, v))]));
  const light = list.filter((t) => t.light != null);
  out.push(block(':root[data-theme="light"]', [line('color-scheme', 'light'), ...light.map((t) => line(t.name, /** @type {string} */ (t.light)))]));
  // Deep bands (CTA band, footer) are a window into the night in both themes. Layered (base), so components can refine it.
  const byPath = new Map(list.map((t) => [t.path, t]));
  const deep = onDeep.map((p) => { const t = byPath.get(p); if (!t) throw new Error(`ca.rnc.onDeep names unknown token ${p}`); return line(t.name, t.dark); });
  out.push(`@layer base {\n${block('.on-deep', [line('color-scheme', 'dark'), ...deep], '  ')}\n}`);
  // Accessibility: materials turn solid and decoration flattens when people ask for less transparency or more contrast.
  // ":root[data-theme]" repeats the selector so the light block (higher specificity) cannot outrank these.
  const solids = list.filter((t) => t.name.startsWith('--material-')).map((t) => line(t.name, t.solid && /media/.test(t.name) ? t.solid : 'var(--color-bg-elevated)'));
  out.push(`@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {\n${block(':root, :root[data-theme]', [...solids, line('--glass-blur', '0px'), line('--grain-opacity', '0'), line('--stage-opacity', '0'), line('--surface-card', 'var(--color-bg-elevated)'), line('--surface-card-hi', 'var(--color-bg-elevated)')], '  ')}\n}`);
  out.push(`@media (prefers-contrast: more) {\n${block(':root, :root[data-theme], .on-deep', [line('--color-line', 'var(--color-line-strong)'), line('--color-ink-3', 'var(--color-ink-2)')], '  ')}\n}`);
  // Forced colours: system colours for the ring (02-base also drops the halo); decoration off.
  out.push(`@media (forced-colors: active) {\n${block(':root, :root[data-theme], .on-deep', [line('--focus-ring', 'Highlight'), line('--focus-halo', 'Canvas'), line('--focus-glow', 'transparent'), line('--grain-opacity', '0'), line('--stage-opacity', '0')], '  ')}\n}`);
  // Motion (CONTRACT §8, §9): reduce zeroes durations unless the visitor chose Animations on; data-motion=off always does.
  const zero = ZERO.map((n) => line(n, '0ms'));
  out.push(`@media (prefers-reduced-motion: reduce) {\n${block(':root:not([data-motion="on"])', zero, '  ')}\n}`);
  out.push(block(':root[data-motion="off"]', zero));
  // Print on paper: the light values, whatever the screen theme.
  out.push(`@media print {\n${block(':root, :root[data-theme]', [line('color-scheme', 'light'), ...light.map((t) => line(t.name, /** @type {string} */ (t.light)))], '  ')}\n}`);
  return `${out.join('\n')}\n`;
}

export function readTokens() {
  return JSON.parse(readFileSync(here('./tokens.json'), 'utf8'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const css = generate(readTokens());
  const target = here('./tokens.css');
  if (process.argv.includes('--check')) {
    let current = '';
    try { current = readFileSync(target, 'utf8'); } catch { /* missing */ }
    if (current !== css) { console.error('brand/tokens.css is out of date: run node brand/build-tokens.mjs'); process.exit(1); }
    console.log('✓ brand/tokens.css matches tokens.json');
  } else {
    writeFileSync(target, css);
    console.log(`Wrote brand/tokens.css (${css.length} bytes)`);
  }
}
