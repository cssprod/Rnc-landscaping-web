#!/usr/bin/env node
// @ts-check
/**
 * Link codemod (CONTRACT §4, §6): rewrites links to retired URLs into their C1 targets, from .orchestra/url-map.json
 * (entries[] and aliases[] with status 301), in content/**.json and site/src/**.{mjs,js}.
 *   node tools/rewrite-links.mjs                 dry run (default): lists what would change, writes nothing
 *   node tools/rewrite-links.mjs --write         applies the changes: INTEGRATOR ONLY, after the last W1/W2 merge;
 *                                                 streams never run it on content/
 *   --root=DIR     repository root to operate on (e.g. a scratch copy)   --map=FILE   url-map file   --verbose
 * Rewritten forms: Markdown links ](/old/), href="/old/", and quoted string literals '/old/' "/old/" `/old/`; a query or
 * fragment on the old link is kept (merged with a query on the target). Dynamic paths (template literals that build a
 * retired URL) cannot be rewritten mechanically and are listed as manual.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const opt = (/** @type {string} */ k) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const ROOT = opt('root') || fileURLToPath(new URL('../..', import.meta.url));
const MAP = opt('map') || join(ROOT, '.orchestra/url-map.json');
const write = argv.includes('--write');
const verbose = argv.includes('--verbose');

/** @param {any} map @returns {Map<string, string>} retired path → C1 target */
export function redirectMap(map) {
  return new Map([...(map.entries || []), ...(map.aliases || [])].filter((e) => e.status === 301 && e.old).map((e) => [e.old, e.new]));
}

const LINK = /(\]\(|\shref="|['"`])(\/[A-Za-z0-9._~\/-]*)([?#][^)"'`\s]*)?(?=[)"'`])/g;

/**
 * Rewrite one file's text. @param {string} text @param {Map<string, string>} map
 * @returns {{ text: string, changes: { from: string, to: string }[], manual: string[] }}
 */
export function rewrite(text, map) {
  /** @type {{ from: string, to: string }[]} */ const changes = [];
  const out = text.replace(LINK, (whole, pre, path, rest = '') => {
    const key = path.endsWith('/') ? path : `${path}/`;
    const to = map.get(path) || map.get(key);
    if (!to) return whole;
    let target = to;
    if (rest) {
      const hash = rest.indexOf('#');
      const query = hash < 0 ? rest : rest.slice(0, hash);
      const frag = hash < 0 ? '' : rest.slice(hash);
      if (query) target += (target.includes('?') ? '&' : '?') + query.replace(/^\?/, '');
      target += frag;
    }
    changes.push({ from: path + rest, to: target });
    return `${pre}${target}`;
  });
  // A first path segment is retired when no C1 target lives under it (/portfolio/, /quote/; not /services/).
  const prefixes = [...new Set([...map.keys()].map((k) => `/${k.split('/')[1]}/`))].filter((x) => ![...map.values()].some((t) => t.startsWith(x)));
  const manual = [...text.matchAll(/[`'"](\/[A-Za-z0-9/_-]*)\$\{/g)].map((m) => m[1]).filter((p) => prefixes.some((x) => p.startsWith(x)));
  return { text: out, changes, manual };
}

/** @param {string} dir @param {RegExp} ext */
const list = (dir, ext) => (existsSync(dir) ? readdirSync(dir, { recursive: true }).map(String).filter((f) => ext.test(f) && statSync(join(dir, f)).isFile()).map((f) => join(dir, f)) : []);

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(MAP)) { console.log(`rewrite-links: no url-map at ${MAP}; nothing to do`); process.exit(0); }
  const map = redirectMap(JSON.parse(readFileSync(MAP, 'utf8')));
  const targets = [...list(join(ROOT, 'content'), /\.json$/), ...list(join(ROOT, 'site/src'), /\.(mjs|js)$/)];
  let total = 0, filesChanged = 0;
  /** @type {string[]} */ const manual = [];
  for (const f of targets) {
    const src = readFileSync(f, 'utf8');
    const r = rewrite(src, map);
    for (const m of r.manual) manual.push(`${relative(ROOT, f)}: ${m}\${…}`);
    if (!r.changes.length) continue;
    total += r.changes.length; filesChanged++;
    console.log(`${write ? 'rewrote' : 'would rewrite'} ${r.changes.length} link(s) in ${relative(ROOT, f)}`);
    if (verbose) for (const c of r.changes) console.log(`    ${c.from} → ${c.to}`);
    if (write) writeFileSync(f, r.text);
  }
  for (const m of manual) console.warn(`  manual: ${m} builds a retired URL dynamically; change it by hand`);
  console.log(`rewrite-links: ${total} link(s) in ${filesChanged} file(s) ${write ? 'rewritten' : 'to rewrite (dry run; --write applies, integrator only)'}`);
}
