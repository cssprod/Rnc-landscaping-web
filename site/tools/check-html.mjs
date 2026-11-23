#!/usr/bin/env node
// @ts-check
/**
 * Static HTML checks over every built page (SITE_DIST): lang, title, description, viewport, canonical, one h1,
 * img alt and size, unique ids, labelled inputs, aria references, unique titles/descriptions, heading order, plus:
 *   no-href-hash       no href="#" / empty href anywhere; menus are <button aria-expanded aria-controls> disclosures
 *                      (never a link with aria-expanded) whose aria-controls target exists (A13 #8).
 *   footer-tel-mailto  the footer carries tel:, sms: and mailto: links once [PHONE]/[EMAIL] are known, the
 *                      placeholder text (chip) until then, and never a token inside an href (A13 #26, CONTRACT §3);
 *                      the token check covers every page and every href/action/formaction/src attribute.
 *   data-track-names   every data-track="…" value in a page and every track('…') name in a built script is an event of
 *                      site/event-schema.yaml, and none is a deprecated v2 name (an intent starting "Deprecated:",
 *                      quoted or not; CONTRACT §13).
 * Exits 0 when there is no dist. Failures are { rule, path, message }.
 */
import { existsSync, readFileSync } from 'node:fs';
import { DIST, SITE, files, read, report } from './lib.mjs';

/**
 * Event names in an event-schema.yaml: { name → deprecated }. A line-based reader for the file's fixed shape
 * (`events:`, two-space event keys, four-space `intent:`), tolerant of quoted intents.
 * @param {string} yaml
 */
export function eventNames(yaml) {
  /** @type {Map<string, boolean>} */ const out = new Map();
  let inEvents = false, cur = '';
  for (const line of yaml.split('\n')) {
    if (/^events:\s*$/.test(line)) { inEvents = true; continue; }
    if (/^\S/.test(line)) { inEvents = false; continue; }
    if (!inEvents) continue;
    const ev = line.match(/^ {2}([A-Za-z_][\w]*):\s*(?:#.*)?$/);
    if (ev) { cur = ev[1]; out.set(cur, false); continue; }
    const intent = line.match(/^ {4}intent:\s*(.*)$/);
    if (intent && cur && /^["']?\s*Deprecated\s*:/i.test(intent[1])) out.set(cur, true);
  }
  return out;
}
const SCHEMA_FILE = `${SITE}/event-schema.yaml`;
const events = existsSync(SCHEMA_FILE) ? eventNames(readFileSync(SCHEMA_FILE, 'utf8')) : null;
/** @param {string} where @param {string} name @param {string} how */
const checkEvent = (where, name, how) => {
  if (!events) return;
  if (!events.has(name)) fail('data-track-names', where, `${how} "${name}" is not an event in site/event-schema.yaml (CONTRACT §13)`);
  else if (events.get(name)) fail('data-track-names', where, `${how} "${name}" is a deprecated v2 event name; use the CONTRACT §13 name`);
};

export const RULES = ['lang', 'title', 'description', 'viewport', 'canonical', 'one-h1', 'img-alt', 'img-size', 'unique-ids',
  'labelled-inputs', 'aria-refs', 'heading-order', 'no-href-hash', 'footer-tel-mailto', 'data-track-names'];

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
  }
  // CONTRACT §3, every page: no URL attribute (href, action, formaction, src) is built on a bracket token.
  for (const m of h.matchAll(/\s(href|action|formaction|src)="([^"]*)"/g)) if (/\[[A-Z][A-Z ]*\]|%5B[A-Z][A-Z %20]*%5D/i.test(m[2])) e('footer-tel-mailto', `token inside an ${m[1]}: ${m[2].slice(0, 80)} (render the text and the chip instead)`);
}
/* ---- data-track-names (CONTRACT §13) ---- */
if (existsSync(DIST)) {
  for (const f of files()) for (const m of read(f).matchAll(/\sdata-track="([^"]*)"/g)) checkEvent(f, m[1], 'data-track');
  // A hashed module (assets/build/lib-track.<hash>.js) is reported as its source, so the baseline key is stable.
  const source = (/** @type {string} */ f) => { const m = f.match(/^assets\/build\/(lib-)?([\w-]+?)\.[0-9a-f]{6,}\.js$/); return m ? `site/src/scripts/${m[1] ? 'lib/' : ''}${m[2]}.js` : f; };
  for (const f of files('.js')) for (const m of read(f).matchAll(/\btrack\(\s*(['"`])([\w-]+)\1/g)) checkEvent(source(f), m[2], 'track()');
}
const ok = report('check-html', /** @type {any} */ (failures));
// exitCode, not process.exit(): a long report written to a pipe is flushed before the process ends.
if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = ok ? 0 : 1;
export default ok;
