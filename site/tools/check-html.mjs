#!/usr/bin/env node
// @ts-check
/** Static HTML checks: lang, title, description, one h1, img alt, unique ids, labelled inputs, unique titles/descriptions, heading order. */
import { files, read, report } from './lib.mjs';
const errors = [];
/** @type {Map<string,string>} */ const titles = new Map();
/** @type {Map<string,string>} */ const descs = new Map();
for (const f of files()) {
  const h = read(f).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const e = (/** @type {string} */ m) => errors.push(`${f}: ${m}`);
  if (!/<html[^>]*\slang="[a-z]{2}/.test(h)) e('missing <html lang>');
  const title = h.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
  if (!title) e('missing <title>'); else { if (titles.has(title)) e(`duplicate title (also ${titles.get(title)})`); titles.set(title, f); if (title.length > 70) e(`title is ${title.length} chars`); }
  const desc = h.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!desc) e('missing meta description'); else { if (descs.has(desc)) e(`duplicate description (also ${descs.get(desc)})`); descs.set(desc, f); }
  if (!/<meta name="viewport"/.test(h)) e('missing viewport');
  if (!/<link rel="canonical"/.test(h)) e('missing canonical');
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) e(`${h1} <h1> elements`);
  for (const m of h.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) e(`img without alt: ${m[0].slice(0, 80)}`);
  for (const m of h.matchAll(/<img\b[^>]*>/g)) if (!/\swidth="/.test(m[0]) || !/\sheight="/.test(m[0])) e(`img without width/height: ${m[0].slice(0, 80)}`);
  /** @type {Set<string>} */ const ids = new Set();
  for (const m of h.matchAll(/\sid="([^"]+)"/g)) { if (ids.has(m[1])) e(`duplicate id "${m[1]}"`); ids.add(m[1]); }
  for (const m of h.matchAll(/<(input|select|textarea)\b[^>]*>/g)) {
    const tag = m[0];
    if (/type="(hidden|submit|button)"/.test(tag)) continue;
    const id = tag.match(/\sid="([^"]+)"/)?.[1];
    const named = id && new RegExp(`<label[^>]*for="${id}"`).test(h);
    const before = h.slice(0, m.index);
    const wrapped = before.lastIndexOf('<label') > before.lastIndexOf('</label>');
    if (!named && !wrapped && !/aria-label=/.test(tag)) e(`unlabelled ${m[1]} ${id || ''}`);
  }
  for (const m of h.matchAll(/aria-(?:describedby|labelledby|controls)="([^"]+)"/g)) for (const ref of m[1].split(/\s+/)) if (ref && !ids.has(ref) && !new RegExp(`id="${ref}"`).test(h)) e(`aria reference to missing id "${ref}"`);
  let last = 0;
  for (const m of h.replace(/<header class="site-header"[\s\S]*?<\/header>/, '').replace(/<footer class="site-footer"[\s\S]*?<\/footer>/, '').matchAll(/<h([1-6])[\s>]/g)) {
    const lvl = Number(m[1]);
    if (last && lvl > last + 1) e(`heading jumps h${last} → h${lvl}`);
    last = lvl;
  }
}
const ok = report('HTML structure', errors);
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
