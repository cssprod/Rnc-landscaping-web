// @ts-check
/**
 * Module-graph hashing (CONTRACT §12).
 *
 * Every site/src/scripts/*.js and site/src/scripts/lib/*.js file is an ES module. The graph is hashed leaves first:
 * a module's relative import specifiers are rewritten to its dependencies' hashed URLs before the module itself is
 * hashed, so a change in a leaf changes the URL of everything that imports it. There is no import map.
 *
 *   name:   scripts/main.js → "main", scripts/lib/track.js → "lib-track"
 *   output: /assets/build/<name>.<hash10>.js
 *   result: { main: { src, deps: [every transitive dependency's src, leaves first] }, … }
 *
 *   buildModules(scriptsDir, { minify }) → { modules, files: [{ url, code, name }] }   minify (default true): minify-js.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { minifyJs } from './minify-js.mjs';

const hash10 = (/** @type {string} */ s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

/**
 * Static import / re-export specifiers (and literal dynamic imports) in a module, with their positions.
 * Comments and strings that are not specifiers are skipped by matching only statement shapes.
 * @param {string} code
 * @returns {{ spec: string, start: number, end: number }[]} start/end cover the specifier text without quotes
 */
export function findImports(code) {
  /** @type {{ spec: string, start: number, end: number }[]} */
  const out = [];
  // Blank out comments so commented-out imports are ignored (keep offsets).
  const masked = code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:\\'"`])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
  const re = /(?:^|[;\n}])\s*(?:import\s*(?:[\w*{}\s,$]+?\s*from\s*)?|export\s*(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*)(['"])([^'"\n]+)\1|\bimport\s*\(\s*(['"])([^'"\n]+)\3\s*\)/g;
  for (const m of masked.matchAll(re)) {
    const spec = m[2] ?? m[4];
    const q = m[1] ?? m[3];
    const full = m[0];
    const at = (m.index ?? 0) + full.lastIndexOf(q + spec + q) + 1;
    out.push({ spec, start: at, end: at + spec.length });
  }
  return out;
}

/** @param {string} rel path relative to the scripts dir, e.g. "lib/track.js" */
export const moduleName = (rel) => rel.replace(/\.m?js$/, '').split(/[\\/]/).join('-');

/**
 * @param {string} scriptsDir absolute path of site/src/scripts
 * @param {{ base?: string, minify?: boolean }} [o] base: public URL directory for the outputs
 */
export function buildModules(scriptsDir, o = {}) {
  const base = o.base || '/assets/build';
  /** @type {string[]} */
  const rels = [];
  for (const f of readdirSync(scriptsDir, { recursive: true }).map(String).sort()) {
    if (!/\.m?js$/.test(f)) continue;
    if (!statSync(join(scriptsDir, f)).isFile()) continue;
    const parts = f.split(/[\\/]/);
    // scripts/*.js and scripts/lib/*.js only (CONTRACT §12).
    if (parts.length > 2 || (parts.length === 2 && parts[0] !== 'lib')) throw new Error(`scripts: ${f} is outside scripts/*.js and scripts/lib/*.js`);
    rels.push(parts.join('/'));
  }
  /** @type {Map<string, { code: string, imports: { spec: string, start: number, end: number, dep: string|null }[] }>} */
  const src = new Map();
  for (const rel of rels) {
    const text = readFileSync(join(scriptsDir, rel), 'utf8');
    let code;
    try { code = o.minify === false ? text : minifyJs(text); } catch (e) { throw new Error(`scripts/${rel}: ${e instanceof Error ? e.message : e}`); }
    const imports = findImports(code).map((im) => {
      if (!/^\.\.?\//.test(im.spec)) return { ...im, dep: null }; // bare or absolute: left alone
      const abs = resolve(dirname(join(scriptsDir, rel)), im.spec);
      const depRel = relative(scriptsDir, abs).split(sep).join('/');
      if (!rels.includes(depRel)) throw new Error(`scripts/${rel}: import "${im.spec}" does not resolve to a module in site/src/scripts`);
      return { ...im, dep: depRel };
    });
    src.set(rel, { code, imports });
  }
  // Topological order, leaves first; a cycle is an error (hashes would depend on themselves).
  /** @type {string[]} */
  const order = [];
  /** @type {Map<string, 1|2>} */
  const state = new Map();
  const visit = (/** @type {string} */ rel, /** @type {string[]} */ trail) => {
    if (state.get(rel) === 2) return;
    if (state.get(rel) === 1) throw new Error(`scripts: import cycle ${[...trail, rel].join(' → ')}`);
    state.set(rel, 1);
    for (const im of src.get(rel)?.imports || []) if (im.dep) visit(im.dep, [...trail, rel]);
    state.set(rel, 2);
    order.push(rel);
  };
  for (const rel of rels) visit(rel, []);

  /** @type {Record<string, { src: string, deps: string[] }>} */
  const modules = {};
  /** @type {Map<string, string>} rel → url */
  const url = new Map();
  /** @type {Map<string, Set<string>>} rel → transitive dep rels */
  const closure = new Map();
  /** @type {{ url: string, code: string, name: string }[]} */
  const files = [];
  for (const rel of order) {
    const { code, imports } = /** @type {NonNullable<ReturnType<typeof src.get>>} */ (src.get(rel));
    let out = '';
    let at = 0;
    /** @type {Set<string>} */
    const deps = new Set();
    for (const im of [...imports].sort((p, q) => p.start - q.start)) {
      if (!im.dep) continue;
      out += code.slice(at, im.start) + url.get(im.dep);
      at = im.end;
      for (const d of closure.get(im.dep) || []) deps.add(d);
      deps.add(im.dep);
    }
    out += code.slice(at);
    const name = moduleName(rel);
    const u = `${base}/${name}.${hash10(out)}.js`;
    url.set(rel, u);
    closure.set(rel, deps);
    // Leaves first: keep the global topological order for the preload list.
    modules[name] = { src: u, deps: order.filter((r) => deps.has(r)).map((r) => /** @type {string} */ (url.get(r))) };
    files.push({ url: u, code: out, name });
  }
  return { modules, files };
}

/**
 * Add <link rel="modulepreload"> for every dependency of the module scripts on a page, right before the first module
 * script, skipping any the page already preloads. Layout code that emits its own preloads keeps working unchanged.
 * @param {string} html
 * @param {Record<string, { src: string, deps: string[] }>} modules
 */
export function addModulePreloads(html, modules) {
  const bySrc = new Map(Object.values(modules).map((m) => [m.src, m]));
  const scripts = [...html.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
  if (!scripts.length) return html;
  const have = new Set([...html.matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/g)].map((m) => m[1]));
  const own = new Set(scripts.map((m) => m[1]));
  /** @type {string[]} */
  const want = [];
  for (const m of scripts) for (const d of bySrc.get(m[1])?.deps || []) if (!have.has(d) && !own.has(d) && !want.includes(d)) want.push(d);
  if (!want.length) return html;
  const first = /** @type {RegExpMatchArray} */ (scripts[0]);
  const at = /** @type {number} */ (first.index);
  return `${html.slice(0, at)}${want.map((d) => `<link rel="modulepreload" href="${d}">\n`).join('')}${html.slice(at)}`;
}
