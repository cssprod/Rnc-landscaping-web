#!/usr/bin/env node
// @ts-check
/**
 * Static HTML checks over every built page (SITE_DIST): lang, title, description, viewport, canonical, one h1,
 * img alt and size, unique ids, labelled inputs, aria references, unique titles/descriptions, heading order, plus:
 *   no-href-hash       no href="#" / empty href anywhere; menus are <button aria-expanded aria-controls> disclosures
 *                      (never a link with aria-expanded) whose aria-controls target exists (A13 #8).
 *   footer-tel-mailto  the footer carries tel:, sms: and mailto: links once [PHONE]/[EMAIL] are known, the
 *                      placeholder text (chip) until then, and never a token inside an href (A13 #26, CONTRACT §3).
 * Exits 0 when there is no dist. Failures are { rule, path, message }.
 */
import { existsSync } from 'node:fs';
import { DIST, files, read, report } from './lib.mjs';

export const RULES = ['lang', 'title', 'description', 'viewport', 'canonical', 'one-h1', 'img-alt', 'img-size', 'unique-ids',
  'labelled-inputs', 'aria-refs', 'heading-order', 'no-href-hash', 'footer-tel-mailto'];

/** @typedef {{ rule: string, path: string, message: string, toString(): string }} Failure */
/** @type {Failure[]} */
const failures = [];
/** @param {string} rule @param {string} path @param {string} message */
const fail = (rule, path, message) => failures.push({ rule, path, message, toString() { return `${path}: [${rule}] ${message}`; } });

/** @type {Map<string,string>} */ const titles = new Map();
/** @type {Map<string,string>} */ const descs = new Map();
for (const f of existsSync(DIST) ? files() : []) {
  const full = read(f);
  const h = full.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const e = (/** @type {string} */ rule, /** @type {string} */ m) => fail(rule, f, m);
  if (!/<html[^>]*\slang="[a-z]{2}/.test(h)) e('lang', 'missing <html lang>');
  const title = h.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
  if (!title) e('title', 'missing <title>'); else { if (titles.has(title)) e('title', `duplicate title (also ${titles.get(title)})`); titles.set(title, f); if (title.length > 70) e('title', `title is ${title.length} chars`); }
  const desc = h.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!desc) e('description', 'missing meta description'); else { if (descs.has(desc)) e('description', `duplicate description (also ${descs.get(desc)})`); descs.set(desc, f); }
  if (!/<meta name="viewport"/.test(h)) e('viewport', 'missing viewport');
  if (!/<link rel="canonical"/.test(h)) e('canonical', 'missing canonical');
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) e('one-h1', `${h1} <h1> elements`);
  for (const m of h.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) e('img-alt', `img without alt: ${m[0].slice(0, 80)}`);
  for (const m of h.matchAll(/<img\b[^>]*>/g)) if (!/\swidth="/.test(m[0]) || !/\sheight="/.test(m[0])) e('img-size', `img without width/height: ${m[0].slice(0, 80)}`);
  /** @type {Set<string>} */ const ids = new Set();
  for (const m of h.matchAll(/\sid="([^"]+)"/g)) { if (ids.has(m[1])) e('unique-ids', `duplicate id "${m[1]}"`); ids.add(m[1]); }
  for (const m of h.matchAll(/<(input|select|textarea)\b[^>]*>/g)) {
    const tag = m[0];
    if (/type="(hidden|submit|button)"/.test(tag)) continue;
    const id = tag.match(/\sid="([^"]+)"/)?.[1];
    const named = id && new RegExp(`<label[^>]*for="${id}"`).test(h);
    const before = h.slice(0, m.index);
    const wrapped = before.lastIndexOf('<label') > before.lastIndexOf('</label>');
    if (!named && !wrapped && !/aria-label=/.test(tag)) e('labelled-inputs', `unlabelled ${m[1]} ${id || ''}`);
  }
  for (const m of h.matchAll(/aria-(?:describedby|labelledby|controls)="([^"]+)"/g)) for (const ref of m[1].split(/\s+/)) if (ref && !ids.has(ref) && !new RegExp(`id="${ref}"`).test(h)) e('aria-refs', `aria reference to missing id "${ref}"`);
  let last = 0;
  for (const m of h.replace(/<header class="site-header"[\s\S]*?<\/header>/, '').replace(/<footer class="site-footer"[\s\S]*?<\/footer>/, '').matchAll(/<h([1-6])[\s>]/g)) {
    const lvl = Number(m[1]);
    if (last && lvl > last + 1) e('heading-order', `heading jumps h${last} → h${lvl}`);
    last = lvl;
  }

  /* ---- no-href-hash (A13 #8) ---- */
  for (const m of h.matchAll(/<a\b[^>]*\shref="(#?)"[^>]*>/g)) e('no-href-hash', `link with href="${m[1]}": use a <button> for actions and disclosures (${m[0].slice(0, 80)})`);
  for (const m of h.matchAll(/<(a|div|span|li)\b[^>]*\saria-expanded=[^>]*>/g)) e('no-href-hash', `aria-expanded on <${m[1]}>: disclosures are <button type="button" aria-expanded aria-controls> (${m[0].slice(0, 80)})`);
  const head = h.match(/<header class="site-header"[\s\S]*?<\/header>/)?.[0] || '';
  for (const m of head.matchAll(/<button\b[^>]*\saria-expanded=[^>]*>/g)) {
    if (!/\saria-controls="[^"]+"/.test(m[0])) e('no-href-hash', `header disclosure without aria-controls: ${m[0].slice(0, 80)}`);
    if (!/\stype="button"/.test(m[0])) e('no-href-hash', `header disclosure without type="button": ${m[0].slice(0, 80)}`);
  }

  /* ---- footer-tel-mailto (A13 #26) ---- */
  const foot = h.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0];
  if (!foot) e('footer-tel-mailto', 'no <footer class="site-footer">');
  else {
    const chip = (/** @type {string} */ t) => foot.includes(`>[${t}]</mark>`) || foot.includes(`[${t}]`);
    if (!/<a\b[^>]*\shref="tel:\+?\d/.test(foot) && !chip('PHONE')) e('footer-tel-mailto', 'footer has neither a tel: link nor the [PHONE] placeholder');
    if (!/<a\b[^>]*\shref="sms:\+?\d/.test(foot) && !chip('PHONE')) e('footer-tel-mailto', 'footer has neither an sms: link nor the [PHONE] placeholder');
    if (!/<a\b[^>]*\shref="mailto:[^"[\]@\s]+@[^"[\]\s]+"/.test(foot) && !chip('EMAIL')) e('footer-tel-mailto', 'footer has neither a mailto: link nor the [EMAIL] placeholder');
    if (/<a\b[^>]*\shref="tel:\+?\d/.test(foot) === false && /<a\b[^>]*\shref="sms:\+?\d/.test(foot)) e('footer-tel-mailto', 'footer has an sms: link but no tel: link');
    for (const m of foot.matchAll(/\shref="((?:tel|sms|mailto):[^"]*|https?:\/\/[^"]*)"/g)) if (/\[|%5B/i.test(m[1])) e('footer-tel-mailto', `token inside an href: ${m[1]} (render the text and the chip instead)`);
  }
}
const ok = report('check-html', /** @type {any} */ (failures));
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
