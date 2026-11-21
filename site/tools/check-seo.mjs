#!/usr/bin/env node
// @ts-check
/**
 * SEO and content-hygiene checks on the built site (REDESIGN-PLAN phase 3,
 * blueprint C6 "Technical", A13 #2, #4, #5, #8, #18, #19, #21, #24, #29).
 *   node tools/check-seo.mjs            all checks; exit 1 on any error
 *   node tools/check-seo.mjs --soft     report, but exit 0 (while content is in flux)
 * Reads SITE_DIST (default site/dist). Warnings never fail the run.
 *
 * Rules (each problem line is prefixed with its rule id):
 *   title-dup, title-len (≤ 60), desc-dup, desc-len (≤ 160), h1 (exactly one),
 *   alt-filename, double-encoded, href-hash, slug, lang (en-CA), canonical,
 *   og (locale, type, url, image), jsonld (one @graph, required nodes, no
 *   Review/AggregateRating, no tokens, @id refs resolve), repeat-para (same
 *   paragraph twice in <main>), typo, voice (banned brand-voice words, prices),
 *   redirects (every retired /portfolio/* and /quote/ URL → live page).
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, files, read } from './lib.mjs';
import { site } from '../site.config.mjs';
import { LEGACY_PROJECTS, LEGACY_SERVICES } from '../src/pages/redirects.mjs';
import { ogCardFile } from '../src/lib/seo.mjs';

const launch = process.env.SITE_MODE === 'launch';
/** @type {Map<string, string[]>} */ const errors = new Map();
/** @type {Map<string, string[]>} */ const warnings = new Map();
/** @param {Map<string,string[]>} m @param {string} rule @param {string} msg */
const push = (m, rule, msg) => m.set(rule, [...(m.get(rule) || []), msg]);
/** @param {string} rule @param {string} msg */ const err = (rule, msg) => push(errors, rule, msg);
/** @param {string} rule @param {string} msg */ const warn = (rule, msg) => push(warnings, rule, msg);

/** Decode the entities the generator emits (once). @param {string} s */
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => {
  const k = e.toLowerCase();
  if (k[0] === '#') return String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : Number(k.slice(1)));
  return /** @type {Record<string,string>} */ ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[k] ?? m;
});
/** Visible text of an HTML fragment. @param {string} h */
const text = (h) => decode(h.replace(/<(script|style|template|svg)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Path of a built file: about/index.html → /about/. @param {string} f */
const pathOf = (f) => (f === 'index.html' ? '/' : f.endsWith('/index.html') ? `/${f.slice(0, -10)}` : `/${f}`);
/** Does a site path resolve to a built file? @param {string} p */
const live = (p) => {
  const t = join(DIST, decodeURIComponent(p.split(/[?#]/)[0]));
  return existsSync(t) && (statSync(t).isFile() || existsSync(join(t, 'index.html')));
};

/* Misspellings (A13 #24) and US spellings in Canadian English copy. Lower-case keys, whole words. */
const TYPOS = /** @type {Record<string,string>} */ ({
  ceder: 'cedar', awlays: 'always', alway: 'always', recieve: 'receive', seperate: 'separate', occured: 'occurred', accomodate: 'accommodate',
  definately: 'definitely', untill: 'until', wich: 'which', teh: 'the', landscapping: 'landscaping', irigation: 'irrigation', irrigaton: 'irrigation',
  maintainance: 'maintenance', maintenence: 'maintenance', garentee: 'guarantee', guarentee: 'guarantee', gaurantee: 'guarantee', shrubery: 'shrubbery',
  perrenial: 'perennial', perennnial: 'perennial', fertiliser: 'fertilizer', mulching: '', saanitch: 'Saanich', esquimault: 'Esquimalt', langsford: 'Langford',
  neighbor: 'neighbour', neighbors: 'neighbours', neighborhood: 'neighbourhood', neighborhoods: 'neighbourhoods', color: 'colour', colors: 'colours',
  favorite: 'favourite', behavior: 'behaviour', honor: 'honour', labor: 'labour', center: 'centre', centers: 'centres', theater: 'theatre',
  defense: 'defence', offense: 'offence', catalog: 'catalogue', practise: '', license: 'licence (noun)', licenses: 'licences (noun)',
});
delete TYPOS.mulching; delete TYPOS.practise;
const TYPO_RE = new RegExp(`\\b(${Object.keys(TYPOS).join('|')})\\b`, 'gi');

/* Banned brand-voice words (brand/brand.md "Voice", research/positioning.md) and price talk (CONTRACT: no prices anywhere). */
const VOICE = [
  [/\btransform(?:s|ed|ing|ative)?\b/i, 'transform'], [/\boasis\b/i, 'oasis'], [/\belevat(?:e|es|ed|ing)\b/i, 'elevate'], [/\bpassion(?:ate)?\b/i, 'passion'],
  [/\bpremier\b/i, 'premier'], [/\bbest\b(?![- ](?:way|time|times|to|for|suited|practice|practices)\b)/i, 'best'], [/#1\b|\bnumber one\b/i, '#1'], [/\bworld[- ]class\b/i, 'world-class'],
  [/\bdream (?:yard|garden|landscape)s?\b/i, 'dream yard'], [/\bleading (?:landscap|provider|company|firm)/i, 'leading'], [/\btop[- ]rated\b/i, 'top-rated'],
  [/\baward[- ]winning\b/i, 'award-winning'], [/\beco[- ]friendly\b/i, 'eco-friendly'], [/\byears of experience\b|\b\d+\+? years in business\b/i, 'years of experience'],
  [/\bcheap(?:est)?\b/i, 'cheap'], [/\baffordabl[ey]\b/i, 'affordable'], [/\blowest price/i, 'lowest price'], [/\bstarting at\b/i, 'starting at'],
  [/\bguaranteed results\b/i, 'guaranteed results'], [/(?:^|[\s(])\$\s?\d|\b\d+\s?(?:CAD|dollars)\b/, 'price'],
];

/** Filename-looking alt text (A13 #4). @param {string} a */
const fileAlt = (a) => /\.(?:jpe?g|png|gif|webp|avif|svg|heic)\b/i.test(a) || /^(?:img|dsc|dscn|pxl|photo|image|screenshot)[-_ ]?\d+/i.test(a)
  || (/^[\w-]+(?: \(\d+\))?$/.test(a) && /[-_]/.test(a) && !/\s/.test(a.replace(/ \(\d+\)$/, '')));

/** Slug rule (A13 #21). @param {string} s */
const badSlug = (s) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) ? 'not lower-case-hyphenated' : s.length > 60 ? `${s.length} chars (> 60)` : '';

/* ---------------------------------------------------------------- pages */
/** @type {Map<string,string>} */ const titles = new Map();
/** @type {Map<string,string>} */ const descs = new Map();
/** @type {Map<string,string>} */ const ogImages = new Map();
const pages = files().filter((f) => !f.startsWith('og/'));
for (const f of pages) {
  const doc = read(f);
  const path = pathOf(f);
  const is404 = f === '404.html';
  const head = doc.match(/<head>([\s\S]*?)<\/head>/)?.[1] || '';
  const body = doc.replace(/<head>[\s\S]*?<\/head>/, '');
  const meta = (/** @type {string} */ attr, /** @type {string} */ name) => [...head.matchAll(new RegExp(`<meta ${attr}="${name.replace(/[:]/g, '\\:')}" content="([^"]*)"`, 'g'))].map((m) => decode(m[1]));

  // lang
  const lang = doc.match(/<html[^>]*\slang="([^"]*)"/)?.[1];
  if (lang !== 'en-CA') err('lang', `${f}: <html lang="${lang ?? ''}"> (want en-CA)`);

  // title / description
  const titleRaw = head.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
  const title = decode(titleRaw).trim();
  if (!title) err('title-len', `${f}: missing <title>`);
  else {
    if (title.length > 60) err('title-len', `${f}: title is ${title.length} chars (≤ 60): "${title}"`);
    if (titles.has(title) && !is404) err('title-dup', `${f}: duplicate title "${title}" (also ${titles.get(title)})`);
    titles.set(title, f);
  }
  const desc = meta('name', 'description')[0];
  if (!desc) err('desc-len', `${f}: missing meta description`);
  else {
    if (desc.length > 160) err('desc-len', `${f}: description is ${desc.length} chars (≤ 160)`);
    else if (desc.length < 70 && !is404) warn('desc-len', `${f}: description is only ${desc.length} chars`);
    if (descs.has(desc) && !is404) err('desc-dup', `${f}: duplicate description (also ${descs.get(desc)})`);
    descs.set(desc, f);
  }

  // exactly one H1
  const h1 = (body.replace(/<(script|template)\b[\s\S]*?<\/\1>/g, '').match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) err('h1', `${f}: ${h1} <h1> elements`);

  // alt text
  for (const m of body.matchAll(/<img\b[^>]*\salt="([^"]*)"/g)) { const a = decode(m[1]).trim(); if (a && fileAlt(a)) err('alt-filename', `${f}: alt looks like a filename: "${a}"`); }

  // double-encoded entities (A13 #19), in the HTML and inside JSON-LD strings
  for (const m of doc.matchAll(/&amp;(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi)) err('double-encoded', `${f}: "${m[0]}" near "${text(doc.slice(Math.max(0, (m.index || 0) - 40), (m.index || 0) + 20)).slice(-50)}"`);
  for (const m of doc.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) if (/&(?:amp|lt|gt|quot|#\d+);/.test(m[1])) err('double-encoded', `${f}: HTML entity inside JSON-LD`);

  // href="#" (A13 #8) and empty hrefs
  for (const m of body.matchAll(/<a\b[^>]*\shref="(#?)"/g)) err('href-hash', `${f}: <a href="${m[1]}"> (use a <button> or a real target)`);

  // slugs: own path + internal links
  for (const seg of path.replace(/\.html$/, '').split('/').filter(Boolean)) { const b = seg === '404' ? '' : badSlug(seg); if (b) err('slug', `${f}: path segment "${seg}" ${b}`); }

  // canonical + og:url
  const canon = [...head.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => decode(m[1]));
  const want = launch ? new RegExp(`^https://[^/]+${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) : null;
  if (canon.length !== 1) err('canonical', `${f}: ${canon.length} canonical links`);
  else if (want ? !want.test(canon[0]) : canon[0] !== path) err('canonical', `${f}: canonical "${canon[0]}" is not self-referencing (${path})`);
  else if (launch && !canon[0].startsWith('https://')) err('canonical', `${f}: canonical is not https`);
  if (canon[0] && meta('property', 'og:url')[0] !== canon[0]) err('og', `${f}: og:url differs from canonical`);

  // Open Graph (A13 #18)
  if (meta('property', 'og:locale')[0] !== 'en_CA') err('og', `${f}: og:locale is "${meta('property', 'og:locale')[0] ?? ''}" (want en_CA)`);
  const guide = /^\/resources\/[^/]+\/$/.test(path);
  const ogType = meta('property', 'og:type')[0];
  if (ogType !== (guide ? 'article' : 'website')) err('og', `${f}: og:type "${ogType}" (want ${guide ? 'article' : 'website'})`);
  const ogImg = meta('property', 'og:image')[0];
  if (!ogImg) err('og', `${f}: no og:image`);
  else {
    if (ogImg.includes('/og/') && !live(ogImg.replace(/^https?:\/\/[^/]+/, ''))) err('og', `${f}: og:image ${ogImg} does not exist`);
    if (!is404 && !ogImg.endsWith(`/og/${ogCardFile(path)}`)) warn('og', `${f}: no fresh OG card (using ${ogImg.replace(/^https?:\/\/[^/]+/, '').slice(0, 60)}); run node tools/og-cards.mjs`);
    if (!is404 && ogImages.has(ogImg)) warn('og', `${f}: same og:image as ${ogImages.get(ogImg)}`);
    ogImages.set(ogImg, f);
  }

  // JSON-LD (C6)
  const lds = [...doc.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (lds.length !== 1) err('jsonld', `${f}: ${lds.length} JSON-LD blocks (want one @graph)`);
  for (const m of lds) {
    /** @type {any} */ let j;
    try { j = JSON.parse(m[1]); } catch (e) { err('jsonld', `${f}: JSON-LD does not parse`); continue; }
    const graph = j['@graph'];
    if (!Array.isArray(graph)) { err('jsonld', `${f}: JSON-LD has no @graph`); continue; }
    const types = graph.map((n) => n['@type']).flat();
    for (const t of ['HomeAndConstructionBusiness', 'WebSite']) if (!types.includes(t)) err('jsonld', `${f}: no ${t} node`);
    if (!graph.some((n) => /Page$/.test(String(n['@type'])) && n['@id']?.endsWith('#webpage'))) err('jsonld', `${f}: no WebPage node`);
    if (/\/services\/[^/]+\/$/.test(path) && !types.includes('Service')) err('jsonld', `${f}: service page without a Service node`);
    if (guide) { const a = graph.find((n) => n['@type'] === 'Article'); if (!a) err('jsonld', `${f}: guide without an Article node`); else if (!a.author) err('jsonld', `${f}: Article without author`); }
    if (path.split('/').filter(Boolean).length >= 1 && !is404 && !types.includes('BreadcrumbList')) err('jsonld', `${f}: no BreadcrumbList`);
    const s = m[1];
    for (const bad of ['Review', 'AggregateRating', 'LandscapingBusiness']) if (new RegExp(`"@type":"${bad}"`).test(s)) err('jsonld', `${f}: ${bad} markup`);
    if (/\[(?:[A-Z]+(?: [A-Z]+)*)\]/.test(s)) err('jsonld', `${f}: bracket token in JSON-LD`);
    const biz = graph.find((n) => n['@type'] === 'HomeAndConstructionBusiness');
    if (biz) {
      if (biz.areaServed?.length !== site.areas.length) err('jsonld', `${f}: areaServed has ${biz.areaServed?.length ?? 0} places (want ${site.areas.length})`);
      if (biz.hasOfferCatalog?.itemListElement?.length !== site.services.length) err('jsonld', `${f}: hasOfferCatalog lists ${biz.hasOfferCatalog?.itemListElement?.length ?? 0} services (want ${site.services.length})`);
    }
    /** @type {Set<string>} */ const ids = new Set();
    /** @type {string[]} */ const refs = [];
    const walk = (/** @type {any} */ v) => {
      if (Array.isArray(v)) return v.forEach(walk);
      if (v && typeof v === 'object') {
        const keys = Object.keys(v);
        if (keys.length === 1 && keys[0] === '@id') refs.push(v['@id']); else if (v['@id']) ids.add(v['@id']);
        Object.values(v).forEach(walk);
      }
    };
    walk(graph);
    for (const r of new Set(refs)) if (!ids.has(r)) err('jsonld', `${f}: @id reference ${r} is not defined in the graph`);
  }

  // <main>: repeated paragraphs, typos, voice
  const main = body.match(/<main\b[\s\S]*?<\/main>/)?.[0] || '';
  if (!main) err('h1', `${f}: no <main>`);
  /** @type {Map<string, number>} */ const paraSeen = new Map();
  for (const m of main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const t = text(m[1]);
    if (t.length < 40) continue;
    paraSeen.set(t, (paraSeen.get(t) || 0) + 1);
  }
  for (const [t, n] of paraSeen) if (n > 1) err('repeat-para', `${f}: paragraph appears ${n}× in <main>: "${t.slice(0, 70)}…"`);
  const visible = `${title} ${desc || ''} ${text(body.replace(/<mark class="ph"[^>]*>[\s\S]*?<\/mark>/g, ' '))}`;
  for (const m of visible.matchAll(TYPO_RE)) {
    const w = m[1];
    if (w !== w.toLowerCase() && w.toLowerCase() === 'center') continue;
    err('typo', `${f}: "${w}" → ${TYPOS[w.toLowerCase()]} ("…${visible.slice(Math.max(0, (m.index || 0) - 30), (m.index || 0) + 30)}…")`);
  }
  for (const [re, label] of VOICE) {
    const m = visible.match(/** @type {RegExp} */ (re));
    if (m) err('voice', `${f}: "${label}" ("…${visible.slice(Math.max(0, (m.index || 0) - 35), (m.index || 0) + 35)}…")`);
  }
}

// internal link slugs (dedupe: one line per bad URL)
/** @type {Set<string>} */ const linkSeen = new Set();
for (const f of pages) for (const m of read(f).matchAll(/\shref="(\/[^"]*)"/g)) {
  const u = decode(m[1]).split(/[?#]/)[0];
  if (linkSeen.has(u) || /\.\w+$/.test(u)) continue;
  linkSeen.add(u);
  for (const seg of u.split('/').filter(Boolean)) { const b = badSlug(seg); if (b) err('slug', `link ${u} (from ${f}): segment "${seg}" ${b}`); }
}

/* ------------------------------------------------------------ redirects */
const rfile = join(DIST, '_redirects');
if (!existsSync(rfile)) err('redirects', '_redirects missing');
else {
  const rules = readFileSync(rfile, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.trim().split(/\s+/));
  /** @param {string} u */
  const match = (u) => rules.find(([from]) => from === u || (from.endsWith('/*') && u.startsWith(from.slice(0, -1))));
  const retired = ['/portfolio/', '/quote/', '/quote/thanks/', ...LEGACY_SERVICES.map((s) => `/portfolio/${s}/`), ...LEGACY_PROJECTS.map((p) => `/portfolio/${p}/`)];
  for (const u of retired) {
    const r = match(u);
    if (!r) { err('redirects', `${u} has no redirect`); continue; }
    if (r[2] !== '301') err('redirects', `${u} redirects with ${r[2]} (want 301)`);
    if (!live(r[1])) err('redirects', `${u} → ${r[1]}, which is not a live page`);
    if (r[0].endsWith('*')) warn('redirects', `${u} only caught by the ${r[0]} splat`);
    else if (/^\/portfolio\/[^/]+\/[^/]+\/$/.test(u) && !/^\/projects\/[^/?]+\/$/.test(r[1])) warn('redirects', `${u} → ${r[1]} (project slug renamed? add it to RENAMED in src/pages/redirects.mjs)`);
  }
  for (const [from, to] of rules) {
    if (live(from) && !from.endsWith('*')) err('redirects', `${from} is both a redirect source and a live page`);
    if (to.startsWith('/') && !live(to)) err('redirects', `${from} → ${to}: target missing`);
  }
}

/* --------------------------------------------------------------- report */
const soft = process.argv.includes('--soft');
let n = 0;
for (const [rule, list] of [...warnings].sort()) console.warn(`  warn [${rule}] ${list.length}: ${list.slice(0, 4).join(' | ')}${list.length > 4 ? ' | …' : ''}`);
for (const [rule, list] of [...errors].sort()) {
  n += list.length;
  console.error(`✗ SEO [${rule}] ${list.length} problem(s)\n${list.slice(0, 25).map((e) => `    - ${e}`).join('\n')}${list.length > 25 ? `\n    … and ${list.length - 25} more` : ''}`);
}
const ok = n === 0;
if (ok) console.log(`✓ SEO (${pages.length} pages)`);
else console.error(`✗ SEO: ${n} problem(s) in ${errors.size} rule(s) across ${pages.length} pages${soft ? ' (--soft: not failing)' : ''}`);
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok || soft ? 0 : 1);
export default ok || soft;
