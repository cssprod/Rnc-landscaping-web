#!/usr/bin/env node
// @ts-check
/**
 * Design-token compiler (zero dependencies).
 *   node brand/build-tokens.mjs          writes brand/tokens.css from brand/tokens.json
 *   node brand/build-tokens.mjs --check  exits 1 if tokens.css is out of date
 *
 * tokens.json follows the W3C Design Tokens (DTCG) format. Extensions used:
 *   $extensions['ca.rnc.css']   CSS expression used instead of $value (fluid clamp(), composites). {a.b} refs become var(--a-b).
 *   $extensions['ca.rnc.dark']  value for the dark appearance (prefers-color-scheme: dark, or data-theme="dark").
 *   $extensions['ca.rnc.solid'] opaque value for prefers-reduced-transparency / prefers-contrast: more (materials).
 * The site build (site/build.mjs) imports generate() so the CSS it ships always matches tokens.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const here = (/** @type {string} */ p) => new URL(p, import.meta.url);

/** @param {string} path dotted path */
const varName = (path) => `--${path.replace(/\./g, '-')}`;

/** Replace {a.b} references with var(--a-b). @param {string} s */
const refs = (s) => s.replace(/\{([^}]+)\}/g, (_m, p) => `var(${varName(p)})`);

/** @param {any} v @param {string} [type] */
function cssValue(v, type) {
  if (typeof v === 'string') return refs(v);
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (type === 'fontFamily') return v.map((f) => (['serif', 'sans-serif', 'monospace', 'system-ui', '-apple-system', 'BlinkMacSystemFont'].includes(f) ? f : `"${f}"`)).join(', ');
    if (type === 'cubicBezier') return `cubic-bezier(${v.join(', ')})`;
    if (type === 'shadow') return v.map((s) => `${s.inset ? 'inset ' : ''}${cssValue(s.offsetX)} ${cssValue(s.offsetY)} ${cssValue(s.blur)} ${cssValue(s.spread)} ${s.color}`).join(', ');
    if (type === 'gradient') return `linear-gradient(180deg, ${v.map((s) => `${s.color} ${Math.round(s.position * 100)}%`).join(', ')})`;
  }
  if (v && typeof v === 'object' && 'value' in v && 'unit' in v) return `${v.value}${v.unit}`;
  throw new Error(`Cannot convert token value ${JSON.stringify(v)} (${type})`);
}

/**
 * Flatten the token tree.
 * @param {any} node @param {string[]} path @param {string|undefined} inheritedType
 * @param {{ name: string, light: string, dark?: string, solid?: string, description?: string }[]} out
 */
function walk(node, path, inheritedType, out) {
  const type = node.$type || inheritedType;
  if ('$value' in node) {
    const ext = node.$extensions || {};
    const light = ext['ca.rnc.css'] != null ? refs(ext['ca.rnc.css']) : cssValue(node.$value, type);
    const darkRaw = ext['ca.rnc.dark'];
    const dark = darkRaw == null ? undefined : (typeof darkRaw === 'string' ? refs(darkRaw) : cssValue(darkRaw, type));
    out.push({ name: varName(path.join('.')), light, dark, solid: ext['ca.rnc.solid'], description: node.$description });
    return;
  }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$') && v && typeof v === 'object') walk(v, [...path, k], type, out);
}

/** Contract aliases kept so older component code and CONTRACT.md names keep working. */
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

/** @param {any} json @returns {string} */
export function generate(json) {
  /** @type {{ name: string, light: string, dark?: string, solid?: string, description?: string }[]} */
  const list = [];
  walk(json, [], undefined, list);
  const faces = json.$extensions?.['ca.rnc.fontFaces'] || [];
  const fallbacks = json.$extensions?.['ca.rnc.fallbacks'] || [];
  const line = (/** @type {string} */ n, /** @type {string} */ v) => `  ${n}: ${v};`;
  const out = [];
  out.push('/* RNC Landscaping design tokens: "Liquid Glass".');
  out.push('   GENERATED from brand/tokens.json by brand/build-tokens.mjs. Edit the JSON, then run: node brand/build-tokens.mjs */');
  for (const f of faces) {
    out.push(`@font-face { font-family: "${f.family}"; src: url("${f.src}") format("woff2-variations"), url("${f.src}") format("woff2"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`);
  }
  for (const f of fallbacks) {
    out.push(`@font-face { font-family: "${f.family}"; src: local("${f.local}"); size-adjust: ${f['size-adjust']}; ascent-override: ${f['ascent-override']}; descent-override: ${f['descent-override']}; line-gap-override: ${f['line-gap-override']}; }`);
  }
  out.push(':root {');
  out.push('  color-scheme: light dark;');
  for (const t of list) out.push(line(t.name, t.light));
  for (const [n, v] of Object.entries(ALIASES)) out.push(line(n, v));
  out.push('}');
  const dark = list.filter((t) => t.dark != null).map((t) => line(t.name, /** @type {string} */ (t.dark)));
  out.push(`@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n  ${dark.join('\n  ')}\n  }\n}`);
  out.push(`:root[data-theme="dark"] {\n  color-scheme: dark;\n${dark.join('\n')}\n}`);
  out.push(':root[data-theme="light"] { color-scheme: light; }');
  const solids = list.filter((t) => t.name.startsWith('--material-')).map((t) => line(t.name, t.solid && /media/.test(t.name) ? t.solid : 'var(--color-bg-elevated)'));
  out.push(`/* Accessibility: glass turns solid when people ask for less transparency or more contrast. */\n@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {\n  :root {\n${solids.join('\n')}\n    --glass-blur: 0px;\n    --glass-blur-strong: 0px;\n  }\n}`);
  out.push('@media (prefers-contrast: more) {\n  :root { --color-line: var(--color-line-strong); --color-ink-3: var(--color-ink-2); }\n}');
  out.push('@media (prefers-reduced-motion: reduce) {\n  :root { --motion-duration-fast: 0ms; --motion-duration-base: 0ms; --motion-duration-slow: 0ms; }\n}');
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
