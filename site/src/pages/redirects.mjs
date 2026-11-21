// @ts-check
/**
 * dist/_redirects (CONTRACT §5): one 301 per retired URL, generated from .orchestra/url-map.json
 * (entries[] and aliases[] with status 301). Exactly one hop, no chains, no splats; a source is never
 * a live page and a destination is never itself a source. Written raw (no chips, no typographer).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { route } from './_shared.mjs';

export const URL_MAP_PATH = fileURLToPath(new URL('../../../.orchestra/url-map.json', import.meta.url));

/** @typedef {{ old?: string, new: string, status: number, kind?: string }} UrlMapRow */
/** @typedef {{ entries?: UrlMapRow[], aliases?: UrlMapRow[], added?: UrlMapRow[], redirectsFile?: string[] }} UrlMap */

/** @param {string} [file] @returns {UrlMap} */
export function loadUrlMap(file = URL_MAP_PATH) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * The 301 rules, in url-map order, validated (throws on a chain, a duplicate source, a splat or a shadowed live page).
 * @param {UrlMap} map @returns {{ from: string, to: string, status: 301 }[]}
 */
export function redirectRules(map) {
  const rows = [...(map.entries || []), ...(map.aliases || [])].filter((r) => r.status === 301 && r.old);
  const live = new Set([...(map.entries || []), ...(map.added || [])].filter((r) => r.status === 200).map((r) => r.new));
  const rules = rows.map((r) => ({ from: /** @type {string} */ (r.old), to: r.new, status: /** @type {301} */ (301) }));
  const sources = new Set();
  for (const r of rules) {
    if (/[*:]/.test(r.from)) throw new Error(`_redirects: splat or placeholder in ${r.from}`);
    if (sources.has(r.from)) throw new Error(`_redirects: duplicate source ${r.from}`);
    if (live.has(r.from)) throw new Error(`_redirects: ${r.from} would shadow a live page`);
    sources.add(r.from);
  }
  for (const r of rules) if (sources.has(r.to.split(/[?#]/)[0])) throw new Error(`_redirects: chain ${r.from} → ${r.to} → …`);
  return rules;
}

/** Netlify _redirects text: "<from>  <to>  301" per line. @param {UrlMap} map */
export function redirectsText(map) {
  const lines = redirectRules(map).map((r) => `${r.from}  ${r.to}  ${r.status}`);
  return `# Generated from .orchestra/url-map.json by site/src/pages/redirects.mjs (CONTRACT §5). Do not edit.\n${lines.join('\n')}\n`;
}

/** @param {import('./_shared.mjs').Env} env @returns {import('./_shared.mjs').Route[]} */
export function routes(env) {
  void env;
  return [route('/_redirects', { sources: ['.orchestra/url-map.json', 'site/src/pages/redirects.mjs'], sitemap: false }, () => redirectsText(loadUrlMap()))];
}
