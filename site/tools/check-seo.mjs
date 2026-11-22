#!/usr/bin/env node
// @ts-check
/**
 * SEO checks over the built site (SITE_DIST; blueprint A9, A13, C1, C6; CONTRACT §5, §6, §14, §17). Runs offline with only
 * SITE_DIST (plus content/ for project → municipality facts) and exits 0 when there is no dist.
 *
 * Rules (each failure is { rule, path, message } through tools/lib.mjs report(), which applies the baseline):
 *   single-nav-dom          one nav[aria-label=Main], one site header and footer, unique nav labels, no href twice in the
 *                           footer or in the header outside its disclosures (A13 #3a, #25)
 *   repeated-text           no block of text (≥ 40 characters) twice in <main> outside [data-shared] (A13 #3b)
 *   alt-filename            no alt text that looks like a file name, a camera name or the image's own file name (A13 #4)
 *   h1-count                exactly one <h1>, inside <main> (A13 #5)
 *   h1-present-on-hubs      /, /services/, /areas/, /projects/ and /resources/ have a non-empty <h1> (A13 #6)
 *   decorative-duplicate    no short display text (2+ words) twice in <main> where both copies are exposed to assistive
 *                           technology: mark the decorative copy aria-hidden="true" or render it once (A13 #17)
 *   og-tags                 one each of og:type/title/description/url/image/locale/site_name; en_CA; "article" on guides
 *                           and "website" elsewhere; og:url = canonical; og:title = <title>; the image resolves; no stock image
 *                           on /projects/ pages (A13 #18; CONTRACT §2)
 *   double-encoding         no "&amp;amp;"-style entity in HTML and no HTML entity inside JSON-LD (A13 #19)
 *   slug-lint               lowercase-hyphen slugs ≤ 60 characters, area/service slugs from site.json, no truncated words
 *                           (every slug word appears in the page's title, H1 or description) (A13 #21)
 *   time-format             <time datetime="YYYY-MM-DD"> shown as "19 November 2026"; no bare ISO or d/m/y dates in text (A13 #22)
 *   canonical               one self-referencing canonical: https://<DOMAIN><path> in launch, <path> in showcase builds;
 *                           never http://, a token, a query or a fragment (A13 #29)
 *   sentence-case           headings, links, buttons and labels start with a capital; no all-caps shouting; place names,
 *                           RNC Landscaping and Greater Victoria never lowercased in text (A13 #33)
 *   canonical-unique        no two pages share a canonical; no retired URL is built, in the sitemap or linked; every 301
 *                           lands on a built page (A13 #35)
 *   internal-links-service  every service page links to all 13 municipality pages from <main> (C1.4a)
 *   internal-links-area     every municipality page links to the 4 services and to 1–3 of its own projects (C1.4b)
 *   internal-links-project  every project links back to its service and its municipality (C1.4c)
 *   breadcrumbs             depth-2+ pages: one Breadcrumb nav from Home to the current page (aria-current), matching
 *                           the BreadcrumbList in the JSON-LD (C1.5)
 *   title-meta              title ≤ 60 and description ≤ 155 characters (decoded), both present, unique and tidy; area
 *                           titles and descriptions name the place; service titles name Victoria (C6.2)
 *   cross-area-duplicates   no sentence (6+ words, place names normalised) on two municipality pages outside [data-shared] (C6.4b)
 *   technical               sitemap.xml, robots.txt, _redirects, lang="en-CA", 404 noindex, showcase noindex (C6.6)
 *   jsonld-graph            one parseable @graph per page with @ids that resolve; the business subtype with 13 areaServed
 *                           and 4 catalogue services; WebSite and WebPage; Service/Article/BreadcrumbList where due; no
 *                           Review/AggregateRating, prices or placeholders; og:locale en_CA and lang en-CA (P3 #14)
 * Options: --rules=a,b (only these rules), --json (print every failure as JSON), --no-baseline, and the lib.mjs baseline flags (integrator only).
 * [data-shared] blocks are exempt from the duplicate rules (CONTRACT §6).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, REPO, files, read, report } from './lib.mjs';
import { siteJson, tokens } from '../site.config.mjs';

export const RULES = ['single-nav-dom', 'repeated-text', 'alt-filename', 'h1-count', 'h1-present-on-hubs', 'decorative-duplicate',
  'og-tags', 'double-encoding', 'slug-lint', 'time-format', 'canonical', 'sentence-case', 'canonical-unique',
  'internal-links-service', 'internal-links-area', 'internal-links-project', 'breadcrumbs', 'title-meta',
  'cross-area-duplicates', 'technical', 'jsonld-graph'];

export const TITLE_MAX = 60;
export const DESC_MAX = 155;
export const HUBS = ['/', '/services/', '/areas/', '/projects/', '/resources/'];
export const BUSINESS_TYPE = 'HomeAndConstructionBusiness';
const PAGE_TYPES = ['WebPage', 'CollectionPage', 'AboutPage', 'ContactPage', 'FAQPage'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* ------------------------------------------------------------------ HTML parsing (tolerant, dependency-free) */

/** @typedef {{ tag: string, attrs: Record<string, string>, children: Nd[], parent: El|null }} El */
/** @typedef {{ text: string, parent: El|null }} Tx */
/** @typedef {El|Tx} Nd */

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAWTEXT = new Set(['script', 'style', 'textarea', 'title']);
const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'body', 'br', 'dd', 'details', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'section', 'summary', 'table', 'td', 'th', 'tr', 'ul', 'option', 'label', 'legend', 'caption']);
/** Leaf text blocks for the duplicate rules. */
const TEXT_BLOCKS = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'figcaption', 'dd', 'dt', 'td', 'th', 'summary', 'caption']);

const ENT = /** @type {Record<string, string>} */ ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', middot: '·', copy: '©' });
/** Decode HTML character references once. @param {string} s */
export const decode = (s) => s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] ?? m;
});

/** @param {string} s @returns {Record<string, string>} */
function parseAttrs(s) {
  /** @type {Record<string, string>} */ const a = {};
  for (const m of s.matchAll(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) a[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return a;
}

/** Parse an HTML document into a small element tree. @param {string} src @returns {El} */
export function parse(src) {
  /** @type {El} */ const root = { tag: '#root', attrs: {}, children: [], parent: null };
  let cur = root;
  let i = 0;
  const re = /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
  const pushText = (/** @type {string} */ t) => { if (t) cur.children.push({ text: decode(t), parent: cur }); };
  for (let m = re.exec(src); m; m = re.exec(src)) {
    pushText(src.slice(i, m.index));
    i = re.lastIndex;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      /** @type {El|null} */ let n = cur;
      while (n && n.tag !== tag) n = n.parent;
      if (n && n.parent) cur = n.parent;
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      /** @type {El} */ const el = { tag, attrs: parseAttrs(m[3] || ''), children: [], parent: cur };
      cur.children.push(el);
      if (RAWTEXT.has(tag)) {
        const end = src.toLowerCase().indexOf(`</${tag}`, i);
        const stop = end < 0 ? src.length : end;
        const body = src.slice(i, stop);
        el.children.push({ text: tag === 'script' || tag === 'style' ? body : decode(body), parent: el });
        const close = src.indexOf('>', stop);
        i = close < 0 ? src.length : close + 1;
        re.lastIndex = i;
      } else if (!VOID.has(tag) && !m[4]) cur = el;
    }
  }
  pushText(src.slice(i));
  return root;
}

/** @param {Nd} n @returns {n is El} */
const isEl = (n) => 'tag' in n;

/** Every element under `n` (depth first) that matches. @param {El} n @param {(e: El) => boolean} pred @returns {El[]} */
export function findAll(n, pred) {
  /** @type {El[]} */ const out = [];
  const walk = (/** @type {El} */ e) => { for (const c of e.children) if (isEl(c)) { if (pred(c)) out.push(c); walk(c); } };
  walk(n);
  return out;
}
/** @param {El} n @param {(e: El) => boolean} pred */
export const find = (n, pred) => findAll(n, pred)[0] || null;

/** Is the element (or an ancestor) hidden from assistive technology or exempt? @param {El|null} e @param {string} attr */
const within = (e, attr) => { for (let n = e; n; n = n.parent) if (attr in n.attrs && (attr !== 'aria-hidden' || n.attrs[attr] === 'true')) return true; return false; };
/** @param {El|null} e @param {string} tag */
const inside = (e, tag) => { for (let n = e; n; n = n.parent) if (n.tag === tag) return true; return false; };

/**
 * Text content. Skips script, style, template and SVG; with `visible`, skips aria-hidden="true" subtrees; with `unshared`,
 * skips [data-shared] subtrees.
 * @param {Nd} n @param {{ visible?: boolean, unshared?: boolean }} [o]
 */
export function textOf(n, o = {}) {
  if (!isEl(n)) return n.text;
  if (['script', 'style', 'template', 'svg', 'noscript'].includes(n.tag)) return '';
  if (o.visible && n.attrs['aria-hidden'] === 'true') return '';
  if (o.unshared && 'data-shared' in n.attrs) return '';
  const t = n.children.map((c) => textOf(c, o)).join('');
  return BLOCK.has(n.tag) ? ` ${t} ` : t;
}
/** @param {string} s */
export const norm = (s) => s.replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ site facts */

const MUNIS = /** @type {{slug: string, name: string}[]} */ (siteJson.municipalities || []);
const SERVICES = /** @type {{slug: string, name: string}[]} */ (siteJson.services || []);
const DOMAIN = tokens.DOMAIN || null;
const TOKEN_RE = new RegExp(`\\[(${Object.keys(tokens).join('|')})\\]`);

/** content/projects/*.json → { slug: { service, area } } (empty when content/ is absent). */
function projectFacts() {
  const dir = join(REPO, 'content', 'projects');
  /** @type {Record<string, { service: string, area: string }>} */ const out = {};
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    try { const p = JSON.parse(readFileSync(join(dir, f), 'utf8')); if (p.slug) out[p.slug] = { service: p.service, area: p.area }; } catch { /* check-content reports bad JSON */ }
  }
  return out;
}

/** URL path of a dist file: "index.html" → "/", "a/b/index.html" → "/a/b/", "404.html" → "/404.html". @param {string} f */
export const pathOf = (f) => `/${f.replace(/\\/g, '/').replace(/(^|\/)index\.html$/, '$1')}`;

/** Internal path of an href (origin, query and fragment removed), or null for external/special links. @param {string} href */
export function internalPath(href) {
  if (!href || /^(mailto|tel|sms|javascript|data):/i.test(href) || href.startsWith('#')) return null;
  let h = href;
  if (/^https?:\/\//i.test(h)) {
    try { const u = new URL(h); if (!DOMAIN || u.hostname.replace(/^www\./, '') !== DOMAIN.replace(/^www\./, '')) return null; h = u.pathname; } catch { return null; }
  }
  if (!h.startsWith('/')) return null;
  return h.split(/[?#]/)[0];
}

/** "19 November 2026" for an ISO date. @param {string} iso */
export const longDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

/** Lowercase words of a string, for slug comparisons. @param {string} s */
export const slugWords = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter(Boolean);

/** Visible character length of an attribute or title (entities decoded once). @param {string} s */
export const visibleLength = (s) => [...decode(s)].length;

/* ------------------------------------------------------------------ page model */

/**
 * @typedef {{ file: string, path: string, raw: string, doc: El, main: El|null, title: string|null, titleRaw: string|null,
 *   description: string|null, descriptionRaw: string|null, canonicals: string[], meta: (n: string) => string[], robots: string,
 *   ld: { raw: string, json: any, error?: string }[], h1: El[] }} Page
 */

/** @param {string} file @param {string} raw @returns {Page} */
export function pageOf(file, raw) {
  const doc = parse(raw);
  const head = find(doc, (e) => e.tag === 'head') || doc;
  const metas = findAll(head, (e) => e.tag === 'meta');
  const meta = (/** @type {string} */ n) => metas.filter((m) => (m.attrs.property || m.attrs.name) === n).map((m) => m.attrs.content ?? '');
  const titleEl = find(head, (e) => e.tag === 'title');
  const titleRaw = raw.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? null;
  const descriptionRaw = raw.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? null;
  const ld = findAll(doc, (e) => e.tag === 'script' && e.attrs.type === 'application/ld+json').map((s) => {
    const body = /** @type {Tx} */ (s.children[0])?.text || '';
    try { return { raw: body, json: JSON.parse(body) }; } catch (e) { return { raw: body, json: null, error: String(/** @type {Error} */ (e).message) }; }
  });
  return {
    file, path: pathOf(file), raw, doc,
    main: find(doc, (e) => e.tag === 'main'),
    title: titleEl ? norm(textOf(titleEl)) : null, titleRaw,
    description: meta('description')[0] ?? null, descriptionRaw,
    canonicals: findAll(head, (e) => e.tag === 'link' && (e.attrs.rel || '').split(/\s+/).includes('canonical')).map((l) => l.attrs.href ?? ''),
    meta, robots: meta('robots').join(','),
    ld,
    h1: findAll(doc, (e) => e.tag === 'h1' && !inside(e, 'template')),
  };
}

/** Graph nodes of a page: top-level @graph items plus every nested object that carries an @id and more. @param {any} g */
export function graphNodes(g) {
  /** @type {Map<string, any>} */ const byId = new Map();
  /** @type {any[]} */ const refs = [];
  const walk = (/** @type {any} */ v) => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    const keys = Object.keys(v);
    if (v['@id'] && keys.length === 1) refs.push(v['@id']);
    else if (v['@id'] && !byId.has(v['@id'])) byId.set(v['@id'], v);
    for (const k of keys) if (k !== '@id') walk(v[k]);
  };
  walk(g?.['@graph']);
  return { byId, refs, top: /** @type {any[]} */ (Array.isArray(g?.['@graph']) ? g['@graph'] : []) };
}
/** @param {any} n @param {string} t */
const typeIs = (n, t) => [].concat(n?.['@type'] ?? []).includes(/** @type {never} */ (t));

/* ------------------------------------------------------------------ the checks */

/**
 * Run every rule over a list of pages and the site files. Pure (given the inputs), so unit tests can drive it.
 * @param {{ pages: Page[], sitemap: string|null, robots: string|null, redirects: string|null, headers: string|null, projects?: Record<string, {service: string, area: string}>, exists?: (distPath: string) => boolean }} site
 * @returns {{ rule: string, path: string, message: string }[]}
 */
export function checkSite(site) {
  /** @type {{ rule: string, path: string, message: string }[]} */ const out = [];
  const fail = (/** @type {string} */ rule, /** @type {string} */ path, /** @type {string} */ message) => out.push({ rule, path, message });
  const projects = site.projects || {};
  const exists = site.exists || (() => true);
  const launch = !!site.robots && /^Sitemap:\s*https:\/\//m.test(site.robots);
  const origin = launch && DOMAIN ? `https://${DOMAIN}` : '';
  const byPath = new Map(site.pages.map((p) => [p.path, p]));
  const isGuide = (/** @type {string} */ p) => /^\/resources\/[^/]+\/$/.test(p);
  const isShowcaseOnly = (/** @type {string} */ p) => p.startsWith('/styleguide/');
  const absPath = (/** @type {string} */ u) => (origin && u.startsWith(origin) ? u.slice(origin.length) : u);

  /* redirects: rows "from to 301" */
  /** @type {{ from: string, to: string, status: string, line: string }[]} */ const rows = [];
  for (const line of (site.redirects || '').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))) {
    const [from = '', to = '', status = ''] = line.split(/\s+/);
    rows.push({ from, to, status, line });
  }
  const retired = new Set(rows.flatMap((r) => [r.from, r.from.replace(/\/$/, '')]));

  /* sitemap */
  const locs = [...(site.sitemap || '').matchAll(/<url>\s*<loc>([^<]*)<\/loc>(?:\s*<lastmod>([^<]*)<\/lastmod>)?/g)].map((m) => ({ loc: decode(m[1]), lastmod: m[2] || '' }));
  const smHost = launch && DOMAIN ? `https://${DOMAIN}` : 'https://[DOMAIN]';
  const smPaths = new Set(locs.map((l) => (l.loc.startsWith(smHost) ? l.loc.slice(smHost.length) : l.loc)));

  /** @type {Map<string, string>} */ const titles = new Map();
  /** @type {Map<string, string>} */ const descs = new Map();
  /** @type {Map<string, string>} */ const canon = new Map();
  /** @type {Map<string, Set<string>>} */ const areaSentences = new Map();

  for (const p of site.pages) {
    const f = p.file;
    const e = (/** @type {string} */ rule, /** @type {string} */ m) => fail(rule, f, m);
    const body = find(p.doc, (x) => x.tag === 'body') || p.doc;
    const main = p.main;
    const crumbsPage = p.path !== '/' && p.path !== '/404.html';
    const canonical = p.canonicals[0] ?? '';
    const expectCanon = `${origin}${p.path}`;

    /* ---- single-nav-dom (A13 #3a, #25) ---- */
    const navs = findAll(body, (x) => x.tag === 'nav');
    const mainNav = navs.filter((x) => x.attrs['aria-label'] === 'Main');
    if (mainNav.length !== 1) e('single-nav-dom', `${mainNav.length} <nav aria-label="Main"> (one nav DOM for every width)`);
    /** @type {Map<string, number>} */ const labels = new Map();
    for (const n of navs) { const l = n.attrs['aria-label'] || n.attrs['aria-labelledby'] || ''; labels.set(l, (labels.get(l) || 0) + 1); }
    for (const [l, c] of labels) if (c > 1) e('single-nav-dom', `${c} <nav> elements share the label "${l || '(none)'}"`);
    const headers = findAll(body, (x) => x.tag === 'header' && /\bsite-header\b/.test(x.attrs.class || ''));
    const footers = findAll(body, (x) => x.tag === 'footer' && /\bsite-footer\b/.test(x.attrs.class || ''));
    if (headers.length > 1) e('single-nav-dom', `${headers.length} site headers`);
    if (footers.length > 1) e('single-nav-dom', `${footers.length} site footers`);
    const dupHrefs = (/** @type {El} */ root, /** @type {(a: El) => boolean} */ skip) => {
      /** @type {Map<string, number>} */ const seen = new Map();
      for (const a of findAll(root, (x) => x.tag === 'a' && !!x.attrs.href && !skip(x))) seen.set(a.attrs.href, (seen.get(a.attrs.href) || 0) + 1);
      return [...seen].filter(([, c]) => c > 1).map(([h, c]) => `${h} ×${c}`);
    };
    const inDisclosure = (/** @type {El} */ a) => { for (let n = a.parent; n; n = n.parent) if (n.attrs.id && /^menu-/.test(n.attrs.id) || 'data-mega-panel' in n.attrs || 'data-disclosure-panel' in n.attrs) return true; return false; };
    for (const h of headers) { const d = dupHrefs(h, inDisclosure); if (d.length) e('single-nav-dom', `header repeats links: ${d.slice(0, 5).join(', ')}`); }
    for (const ft of footers) { const d = dupHrefs(ft, () => false); if (d.length) e('single-nav-dom', `footer repeats links: ${d.slice(0, 5).join(', ')}`); }

    /* ---- repeated-text (A13 #3b) and decorative-duplicate (A13 #17) ---- */
    if (main) {
      const blocks = findAll(main, (x) => TEXT_BLOCKS.has(x.tag) && !findAll(x, (y) => TEXT_BLOCKS.has(y.tag)).length && !within(x, 'data-shared') && !within(x, 'aria-hidden') && !inside(x, 'template') && !inside(x, 'nav'));
      /** @type {Map<string, number>} */ const seen = new Map();
      for (const b of blocks) { const t = norm(textOf(b, { visible: true })); if (t.length >= 40) seen.set(t, (seen.get(t) || 0) + 1); }
      for (const [t, c] of seen) if (c > 1) e('repeated-text', `text repeated ×${c} in <main>: "${t.slice(0, 70)}…" (render once, or mark shared blocks data-shared)`);
      const interactive = (/** @type {El} */ x) => { for (let n = /** @type {El|null} */ (x); n; n = n.parent) if (['a', 'button', 'label', 'option', 'select', 'summary', 'mark'].includes(n.tag)) return true; return false; };
      /** @type {Map<string, number>} */ const short = new Map();
      // Display text only: headings and decorative classes (eyebrows, taglines, hero words). Form labels and errors,
      // definition-list labels, tables and navigation repeat by design and are not checked.
      const DISPLAY = /\b(?:eyebrow|kicker|tagline|display|deco|decor|watermark|marquee|ticker|hero__\w*|outline-text|big-word)\b/;
      const display = findAll(main, (x) => (/^h[1-6]$/.test(x.tag) || DISPLAY.test(x.attrs.class || '')) && !interactive(x) && !within(x, 'data-shared')
        && !within(x, 'aria-hidden') && !inside(x, 'template') && !inside(x, 'svg') && !inside(x, 'form') && !inside(x, 'nav') && !inside(x, 'dl') && !inside(x, 'table'));
      for (const x of display) {
        const own = norm(textOf(x, { visible: true }));
        if (own.length >= 8 && own.length < 80 && own.split(' ').length >= 2) short.set(own, (short.get(own) || 0) + 1);
      }
      for (const [t, c] of short) if (c > 1) e('decorative-duplicate', `"${t}" appears ×${c} in <main> and every copy is read out: add aria-hidden="true" to the decorative copy or render it once`);
    }

    /* ---- alt-filename (A13 #4) ---- */
    for (const img of findAll(body, (x) => x.tag === 'img')) {
      const alt = (img.attrs.alt ?? '').trim();
      if (!alt) continue;
      const base = (img.attrs.src || '').split(/[?#]/)[0].split('/').pop()?.replace(/\.[a-z0-9]+$/i, '').toLowerCase() || '';
      if (/\.(jpe?g|png|gif|webp|avif|svg|heic|tiff?)\b/i.test(alt) || /^(img|image|dsc[nf]?|pxl|photo|picture|screenshot|untitled|unsplash)[\s_-]*\d*$/i.test(alt)
        || /^(img|dsc[nf]?|pxl)[\s_-]*\d+/i.test(alt) || /^[\w]+(?:[-_][\w]+)+$/.test(alt) || /\d{3,}\s*x\s*\d{3,}/.test(alt) || (base && alt.toLowerCase() === base)) {
        e('alt-filename', `alt text looks like a file name: alt="${alt.slice(0, 60)}" (write what the image shows, or alt="" if decorative)`);
      }
    }

    /* ---- h1-count (A13 #5), h1-present-on-hubs (A13 #6) ---- */
    if (p.h1.length !== 1) e('h1-count', `${p.h1.length} <h1> elements (one per template; embedded blocks start at <h2>)`);
    else if (!inside(p.h1[0], 'main')) e('h1-count', 'the <h1> is outside <main>');
    if (HUBS.includes(p.path) && !p.h1.some((h) => norm(textOf(h)).length)) e('h1-present-on-hubs', 'index page without a non-empty <h1>');

    /* ---- og-tags (A13 #18) ---- */
    for (const k of ['og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'og:locale', 'og:site_name', 'twitter:card']) {
      const v = p.meta(k);
      if (v.length !== 1) e('og-tags', `${v.length} ${k} tags (exactly one)`);
      else if (!v[0].trim()) e('og-tags', `empty ${k}`);
    }
    const [ogType] = p.meta('og:type');
    const wantType = isGuide(p.path) ? 'article' : 'website';
    if (ogType !== undefined && ogType !== wantType) e('og-tags', `og:type "${ogType}" (want "${wantType}")`);
    const [ogLocale] = p.meta('og:locale');
    if (ogLocale !== undefined && ogLocale !== 'en_CA') e('og-tags', `og:locale "${ogLocale}" (want en_CA)`);
    const [ogUrl] = p.meta('og:url');
    if (ogUrl !== undefined && ogUrl !== canonical) e('og-tags', `og:url "${ogUrl}" differs from the canonical "${canonical}"`);
    const [ogTitle] = p.meta('og:title');
    if (ogTitle !== undefined && p.title !== null && norm(ogTitle) !== p.title) e('og-tags', 'og:title differs from <title>');
    const [ogImg] = p.meta('og:image');
    if (ogImg) {
      if (/^http:\/\//.test(ogImg) || TOKEN_RE.test(ogImg)) e('og-tags', `og:image is not an https URL: ${ogImg}`);
      else if (ogImg.startsWith('/')) { if (launch) e('og-tags', `og:image must be absolute in launch builds: ${ogImg}`); if (!exists(ogImg)) e('og-tags', `og:image ${ogImg} is not in the build`); }
      else if (origin && ogImg.startsWith(origin) && !exists(ogImg.slice(origin.length))) e('og-tags', `og:image ${ogImg} is not in the build`);
      else if (!/^https:\/\//.test(ogImg)) e('og-tags', `og:image is neither https nor root-relative: ${ogImg}`);
      if (p.path.startsWith('/projects/') && /^https:\/\//.test(ogImg) && !(origin && ogImg.startsWith(origin))) e('og-tags', `stock og:image on a project page: ${ogImg} (no stock under /projects/)`);
    }

    /* ---- double-encoding (A13 #19) ---- */
    const dbl = p.raw.replace(/<script[\s\S]*?<\/script>/g, '').match(/&amp;(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+|[a-z]{2,8});/gi);
    if (dbl) e('double-encoding', `double-encoded entities: ${[...new Set(dbl)].slice(0, 4).join(', ')} (escape once, at build)`);
    for (const l of p.ld) { const m = l.raw.match(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/i); if (m) e('double-encoding', `HTML entity ${m[0]} inside JSON-LD (JSON is raw text: no HTML escaping)`); }
    if (p.title && /&(?:amp|lt|gt|quot|#\d+);/.test(p.title)) e('double-encoding', `<title> shows an entity after decoding: "${p.title}"`);
    const dDesc = p.description ?? '';
    if (/&(?:amp|lt|gt|quot|#\d+);/.test(dDesc)) e('double-encoding', 'meta description shows an entity after decoding');

    /* ---- slug-lint (A13 #21) ---- */
    if (p.path !== '/404.html') {
      const segs = p.path.split('/').filter(Boolean);
      if (!p.path.endsWith('/')) e('slug-lint', `URL without a trailing slash: ${p.path}`);
      for (const s of segs) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) e('slug-lint', `slug "${s}" is not lowercase-hyphen ASCII`);
        if (s.length > 60) e('slug-lint', `slug "${s}" is ${s.length} characters (≤ 60)`);
      }
      const [top, slug] = segs;
      if (top === 'areas' && slug && !MUNIS.some((m) => m.slug === slug)) e('slug-lint', `/areas/${slug}/ is not a site.json municipality slug`);
      if (top === 'services' && slug && !SERVICES.some((m) => m.slug === slug)) e('slug-lint', `/services/${slug}/ is not a site.json service slug`);
      if ((top === 'projects' || top === 'resources') && slug && segs.length === 2) {
        const words = new Set(slugWords(`${p.title || ''} ${p.h1.map((h) => textOf(h)).join(' ')} ${p.description || ''} ${p.meta('og:title').join(' ')}`));
        // A slug word must be a word of the page (or an inflection: "repair" ↔ "repaired", "planting" ↔ "replanting");
        // a slug word that is only the start of a page word ("oakvill" ↔ "oakville") is a truncation.
        const SUFFIX = /^(?:s|es|ed|d|ing|er|ers|ation|ations)$/;
        const known = (/** @type {string} */ w) => words.has(w) || [...words].some((x) => (x.startsWith(w) && SUFFIX.test(x.slice(w.length))) || (x.endsWith(w) && x.length > w.length));
        const missing = slug.split('-').filter((w) => !known(w) && !/^\d+$/.test(w));
        if (missing.length) e('slug-lint', `slug word(s) ${missing.map((w) => `"${w}"`).join(', ')} not in the title, H1 or description (truncated or stale slug?)`);
      }
    }

    /* ---- time-format (A13 #22) ---- */
    for (const t of findAll(body, (x) => x.tag === 'time')) {
      const dt = t.attrs.datetime || '';
      const shown = norm(textOf(t));
      if (!/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:\d{2})?)?$/.test(dt)) e('time-format', `<time> without an ISO datetime ("${dt}")`);
      else if (/^\d{4}-\d{2}-\d{2}$/.test(dt) && shown !== longDate(dt)) e('time-format', `<time datetime="${dt}"> shows "${shown}" (want "${longDate(dt)}")`);
    }
    if (main) {
      const bare = norm(textOf(main, { visible: true }).replace(/\s+/g, ' '));
      const stripped = findAll(main, (x) => x.tag === 'time').reduce((s, t) => s.replace(norm(textOf(t)), ' '), bare);
      const m = stripped.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/);
      if (m) e('time-format', `date "${m[0]}" in text outside <time>: show dates as "19 November 2026" in a <time datetime>`);
    }

    /* ---- canonical (A13 #29) ---- */
    if (p.canonicals.length !== 1) e('canonical', `${p.canonicals.length} canonical links (exactly one)`);
    if (p.canonicals.length) {
      if (/^http:\/\//i.test(canonical)) e('canonical', `canonical uses http: ${canonical}`);
      if (TOKEN_RE.test(canonical) || /%5B/i.test(canonical)) e('canonical', `canonical built on a placeholder token: ${canonical}`);
      if (/[?#]/.test(canonical)) e('canonical', `canonical carries a query or fragment: ${canonical}`);
      if (canonical !== expectCanon) e('canonical', `canonical "${canonical}" is not self-referencing (want "${expectCanon}")`);
      if (launch && !/^https:\/\//.test(canonical)) e('canonical', `launch canonical must be absolute https: ${canonical}`);
      if (canon.has(canonical)) e('canonical-unique', `canonical ${canonical} is also used by ${canon.get(canonical)}`);
      canon.set(canonical, f);
    }

    /* ---- sentence-case (A13 #33) ---- */
    const labelled = findAll(body, (x) => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'a', 'label', 'legend', 'summary', 'th', 'caption', 'option'].includes(x.tag) && !inside(x.parent, 'svg'));
    const PROSE = new Set(['p', 'li', 'dd', 'td', 'blockquote', 'figcaption', 'small']);
    for (const x of labelled) {
      const t = norm(textOf(x).replace(/\[[A-Z][A-Z ]*\]/g, ''));
      // A link or button inside a sentence follows the sentence ("read our [watering guide]"); only stand-alone labels are checked.
      if (['a', 'button'].includes(x.tag)) {
        let blk = x.parent;
        while (blk && !PROSE.has(blk.tag) && !BLOCK.has(blk.tag)) blk = blk.parent;
        if (blk && PROSE.has(blk.tag) && norm(textOf(blk).replace(/\[[A-Z][A-Z ]*\]/g, '')) !== t) continue;
      }
      const first = t.match(/\p{L}/u)?.[0];
      if (first && first !== first.toUpperCase() && /^[^\p{L}\d]*\p{Ll}/u.test(t) && !/^(e\.g\.|i\.e\.|www\.|https?:)/.test(t) && !/@/.test(t)) e('sentence-case', `<${x.tag}> text starts in lowercase: "${t.slice(0, 50)}" (proper case in the source; lowercase via CSS if wanted)`);
    }
    const allText = norm(textOf(body).replace(/\[[A-Z][A-Z ]*\]/g, ' '));
    const shout = allText.match(/(?<![\w/.-])(?:[A-Z]{2,}(?:\s+[A-Z]{2,}){2,}|[A-Z]{7,})(?![\w/.-])/);
    if (shout) e('sentence-case', `all-caps text in the source: "${shout[0]}" (write it in sentence case and use text-transform)`);
    for (const name of [...MUNIS.map((m) => m.name), 'RNC Landscaping', 'Greater Victoria', 'British Columbia', 'Vancouver Island']) {
      const low = name.toLowerCase();
      if (low === name) continue;
      const re = new RegExp(`(?<![\\w/.@-])${low.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w/.@-])`);
      if (re.test(allText)) e('sentence-case', `"${low}" in lowercase in the page text (write "${name}")`);
    }

    /* ---- internal links (C1.4) ---- */
    const mainLinks = new Set(main ? findAll(main, (x) => x.tag === 'a' && !!x.attrs.href).map((a) => internalPath(a.attrs.href)).filter(Boolean) : []);
    const svcMatch = p.path.match(/^\/services\/([^/]+)\/$/);
    if (svcMatch && SERVICES.some((s) => s.slug === svcMatch[1])) {
      const missing = MUNIS.filter((m) => !mainLinks.has(`/areas/${m.slug}/`));
      if (missing.length) e('internal-links-service', `service page does not link to ${missing.length} municipality page(s) from <main>: ${missing.map((m) => m.slug).join(', ')}`);
    }
    const areaMatch = p.path.match(/^\/areas\/([^/]+)\/$/);
    if (areaMatch && MUNIS.some((m) => m.slug === areaMatch[1])) {
      const slug = areaMatch[1];
      const missing = SERVICES.filter((s) => !mainLinks.has(`/services/${s.slug}/`));
      if (missing.length) e('internal-links-area', `municipality page does not link to service(s) ${missing.map((s) => s.slug).join(', ')} from <main>`);
      const local = Object.entries(projects).filter(([, v]) => v.area === slug).map(([k]) => k);
      const linked = local.filter((k) => mainLinks.has(`/projects/${k}/`));
      if (local.length && (linked.length < 1 || linked.length > 3)) e('internal-links-area', `links to ${linked.length} of its ${local.length} local project(s) (want 1–3)`);
    }
    const projMatch = p.path.match(/^\/projects\/([^/]+)\/$/);
    if (projMatch && projects[projMatch[1]]) {
      const { service, area } = projects[projMatch[1]];
      if (service && !mainLinks.has(`/services/${service}/`)) e('internal-links-project', `project does not link back to /services/${service}/ from <main>`);
      if (area && !mainLinks.has(`/areas/${area}/`)) e('internal-links-project', `project does not link back to /areas/${area}/ from <main>`);
    }

    /* ---- breadcrumbs (C1.5) ---- */
    const crumbNavs = navs.filter((x) => x.attrs['aria-label'] === 'Breadcrumb');
    if (crumbsPage) {
      if (crumbNavs.length !== 1) e('breadcrumbs', `${crumbNavs.length} <nav aria-label="Breadcrumb"> on a depth-2+ page`);
      else {
        const items = findAll(crumbNavs[0], (x) => x.tag === 'li').map((li) => find(li, (x) => x.tag === 'a')).filter(Boolean).map((a) => ({ name: norm(textOf(/** @type {El} */ (a))), href: /** @type {El} */ (a).attrs.href || '', current: /** @type {El} */ (a).attrs['aria-current'] === 'page' }));
        if (!find(crumbNavs[0], (x) => x.tag === 'ol')) e('breadcrumbs', 'breadcrumb trail is not an ordered list');
        if (items.length < 2) e('breadcrumbs', `${items.length} breadcrumb link(s) (Home → … → this page)`);
        else {
          if (items[0].href !== '/') e('breadcrumbs', `first crumb links to ${items[0].href} (want /)`);
          const last = items[items.length - 1];
          if (last.href !== p.path || !last.current) e('breadcrumbs', `last crumb must be this page with aria-current="page" (got ${last.href}${last.current ? '' : ', not current'})`);
          for (const c of items.slice(1, -1)) if (!p.path.startsWith(c.href) || c.href === p.path) e('breadcrumbs', `crumb ${c.href} is not an ancestor of ${p.path}`);
          const ldCrumbs = p.ld.flatMap((l) => graphNodes(l.json).top).find((n) => typeIs(n, 'BreadcrumbList'));
          if (!ldCrumbs) e('breadcrumbs', 'no BreadcrumbList in the JSON-LD');
          else {
            const li = /** @type {any[]} */ (ldCrumbs.itemListElement || []);
            const same = li.length === items.length && li.every((x, i) => x.position === i + 1 && absPath(String(x.item)) === items[i].href && norm(String(x.name)) === items[i].name);
            if (!same) e('breadcrumbs', 'the JSON-LD BreadcrumbList does not match the visible trail');
          }
        }
      }
    }

    /* ---- title-meta (C6.2) ---- */
    const tRaw = p.titleRaw ?? '';
    const dRaw = p.descriptionRaw ?? '';
    if (!p.title) e('title-meta', 'missing or empty <title>');
    else {
      const tl = visibleLength(tRaw);
      if (tl > TITLE_MAX) e('title-meta', `title is ${tl} characters (≤ ${TITLE_MAX}): "${p.title}"`);
      if (tl < 15) e('title-meta', `title is ${tl} characters (too short to describe the page)`);
      if (titles.has(p.title)) e('title-meta', `duplicate title (also ${titles.get(p.title)})`);
      titles.set(p.title, f);
      if (/\s{2,}|^\s|\s$|\|\s*\||^[|—–-]|[|—–-]$/.test(decode(tRaw))) e('title-meta', `untidy title: "${p.title}"`);
      if (TOKEN_RE.test(p.title)) e('title-meta', `placeholder token in the title: "${p.title}"`);
    }
    if (!p.description) e('title-meta', 'missing or empty meta description');
    else {
      const dl = visibleLength(dRaw);
      if (dl > DESC_MAX) e('title-meta', `meta description is ${dl} characters (≤ ${DESC_MAX})`);
      if (dl < 50) e('title-meta', `meta description is ${dl} characters (too short)`);
      const d = norm(decode(dRaw));
      if (descs.has(d)) e('title-meta', `duplicate meta description (also ${descs.get(d)})`);
      descs.set(d, f);
      if (p.title && d === p.title) e('title-meta', 'meta description repeats the title');
      if (TOKEN_RE.test(d)) e('title-meta', 'placeholder token in the meta description');
    }
    if (areaMatch && p.title) {
      const m = MUNIS.find((x) => x.slug === areaMatch[1]);
      if (m && !p.title.includes(m.name)) e('title-meta', `area title does not name ${m.name}: "${p.title}"`);
      if (m && p.description && !decode(p.description).includes(m.name)) e('title-meta', `area description does not name ${m.name}`);
    }
    if (svcMatch && p.title && !/Victoria/.test(p.title)) e('title-meta', `service title has no local modifier (Victoria / Greater Victoria): "${p.title}"`);

    /* ---- cross-area-duplicates (C6.4b): collect ---- */
    if (areaMatch && main) {
      /** @type {Set<string>} */ const sents = new Set();
      const blocks = findAll(main, (x) => TEXT_BLOCKS.has(x.tag) && !findAll(x, (y) => TEXT_BLOCKS.has(y.tag)).length && !within(x, 'data-shared') && !within(x, 'aria-hidden') && x.attrs['aria-label'] !== 'Breadcrumb' && !inside(x, 'nav'));
      for (const b of blocks) for (const s of norm(textOf(b, { visible: true, unshared: true })).split(/(?<=[.!?])\s+/)) {
        let k = s.toLowerCase();
        for (const m of [...MUNIS].sort((a, b2) => b2.name.length - a.name.length)) k = k.split(m.name.toLowerCase()).join('{place}');
        k = k.replace(/[^\p{L}\p{N}{} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
        if (k.split(' ').length >= 6) sents.add(k);
      }
      areaSentences.set(f, sents);
    }

    /* ---- technical (C6.6) ---- */
    const lang = find(p.doc, (x) => x.tag === 'html')?.attrs.lang;
    if (lang !== 'en-CA') e('technical', `<html lang="${lang ?? ''}"> (want en-CA)`);
    if (!/<meta charset="utf-8">/i.test(p.raw)) e('technical', 'missing <meta charset="utf-8">');
    if (p.path === '/404.html' && !/noindex/.test(p.robots)) e('technical', '404 page is not noindex');
    if (!launch && !/noindex/.test(p.robots)) e('technical', 'showcase build page is not noindex');
    if (launch && /noindex/.test(p.robots) && smPaths.has(p.path)) e('technical', 'noindex page is in the sitemap');
    if (!smPaths.has(p.path) && p.path !== '/404.html' && !isShowcaseOnly(p.path) && !(launch && /noindex/.test(p.robots))) e('technical', 'indexable page missing from sitemap.xml');

    /* ---- jsonld-graph (P3 #14) ---- */
    if (p.ld.length !== 1) e('jsonld-graph', `${p.ld.length} JSON-LD blocks (one @graph per page)`);
    for (const l of p.ld) if (l.error) e('jsonld-graph', `JSON-LD does not parse: ${l.error}`);
    const g = p.ld[0]?.json;
    if (g) {
      if (g['@context'] !== 'https://schema.org') e('jsonld-graph', `@context is ${JSON.stringify(g['@context'])} (want "https://schema.org")`);
      if (!Array.isArray(g['@graph'])) e('jsonld-graph', 'no @graph array');
      const { byId, refs, top } = graphNodes(g);
      /** @type {Set<string>} */ const topIds = new Set();
      for (const n of top) {
        if (!n['@type'] || !n['@id']) e('jsonld-graph', `graph node without @type and @id: ${JSON.stringify(n).slice(0, 60)}`);
        if (n['@id'] && topIds.has(n['@id'])) e('jsonld-graph', `duplicate node ${n['@id']}`);
        topIds.add(n['@id']);
        if (n['@id'] && launch && !String(n['@id']).startsWith(`${origin}/`)) e('jsonld-graph', `@id ${n['@id']} is not on https://${DOMAIN}`);
      }
      for (const r of new Set(refs)) if (!byId.has(r)) e('jsonld-graph', `@id reference ${r} does not resolve in the graph`);
      const biz = top.find((n) => typeIs(n, BUSINESS_TYPE));
      if (!biz) e('jsonld-graph', `no ${BUSINESS_TYPE} node`);
      else {
        if (!/\/#business$/.test(biz['@id'] || '')) e('jsonld-graph', `business @id ${biz['@id']} (want <origin>/#business)`);
        const areas = /** @type {any[]} */ ([].concat(biz.areaServed || []));
        if (areas.length !== MUNIS.length || !MUNIS.every((m) => areas.some((a) => a?.name === `${m.name}, BC`))) e('jsonld-graph', `areaServed lists ${areas.length} places (want the ${MUNIS.length} site.json municipalities)`);
        const cat = /** @type {any[]} */ (biz.hasOfferCatalog?.itemListElement || []);
        if (cat.length !== SERVICES.length) e('jsonld-graph', `hasOfferCatalog lists ${cat.length} services (want ${SERVICES.length})`);
        if (!biz.name) e('jsonld-graph', 'business without a name');
      }
      if (!top.some((n) => typeIs(n, 'WebSite'))) e('jsonld-graph', 'no WebSite node');
      const wp = top.find((n) => PAGE_TYPES.some((t) => typeIs(n, t)));
      if (!wp) e('jsonld-graph', 'no WebPage node');
      else {
        if (wp.url !== expectCanon) e('jsonld-graph', `WebPage url ${wp.url} differs from the canonical ${expectCanon}`);
        if (wp['@id'] !== `${expectCanon}#webpage`) e('jsonld-graph', `WebPage @id ${wp['@id']} (want ${expectCanon}#webpage)`);
        if (wp.inLanguage !== 'en-CA') e('jsonld-graph', 'WebPage inLanguage is not en-CA');
        if (crumbsPage && !wp.breadcrumb) e('jsonld-graph', 'depth-2+ WebPage without a breadcrumb');
      }
      if (crumbsPage && !top.some((n) => typeIs(n, 'BreadcrumbList'))) e('jsonld-graph', 'depth-2+ page without a BreadcrumbList');
      if (svcMatch) {
        const s = top.find((n) => typeIs(n, 'Service'));
        if (!s) e('jsonld-graph', 'service page without a Service node');
        else {
          if (s.provider?.['@id'] !== biz?.['@id']) e('jsonld-graph', 'Service provider is not the business @id');
          if (s.url !== expectCanon) e('jsonld-graph', `Service url ${s.url} differs from the canonical`);
          if (!s.areaServed) e('jsonld-graph', 'Service without areaServed');
        }
      }
      if (isGuide(p.path)) {
        const a = top.find((n) => typeIs(n, 'Article'));
        if (!a) e('jsonld-graph', 'guide without an Article node');
        else {
          if (!a.author) e('jsonld-graph', 'Article without an author');
          if (!/^\d{4}-\d{2}-\d{2}/.test(a.datePublished || '')) e('jsonld-graph', 'Article without an ISO datePublished');
          if (!a.headline) e('jsonld-graph', 'Article without a headline');
        }
      }
      const rawLd = p.ld[0].raw;
      for (const t of ['Review', 'AggregateRating']) if (new RegExp(`"@type":\\s*(?:\\[[^\\]]*)?"${t}"`).test(rawLd)) e('jsonld-graph', `${t} markup (never on own pages)`);
      for (const k of ['review', 'aggregateRating', 'price', 'priceRange', 'priceSpecification', 'lowPrice', 'highPrice']) if (new RegExp(`"${k}"\\s*:`).test(rawLd)) e('jsonld-graph', `"${k}" property (no reviews or prices in schema)`);
      if (/\$\s?\d/.test(rawLd)) e('jsonld-graph', '"$" amount in the JSON-LD (no prices)');
      const tok = rawLd.match(TOKEN_RE);
      if (tok) e('jsonld-graph', `placeholder ${tok[0]} published in the JSON-LD (omit unknown facts)`);
    }
    if (p.meta('og:locale')[0] !== 'en_CA') e('jsonld-graph', 'og:locale is not en_CA');
    if (lang !== 'en-CA') e('jsonld-graph', 'lang is not en-CA');
  }

  /* ---- cross-area-duplicates (C6.4b): compare ---- */
  /** @type {Map<string, string[]>} */ const where = new Map();
  for (const [f, s] of areaSentences) for (const k of s) where.set(k, [...(where.get(k) || []), f]);
  /** @type {Map<string, string[]>} */ const perPage = new Map();
  for (const [k, fs] of where) if (fs.length > 1) for (const f of fs) perPage.set(f, [...(perPage.get(f) || []), k]);
  for (const [f, ks] of perPage) fail('cross-area-duplicates', f, `${ks.length} sentence(s) also on another municipality page outside [data-shared] (place names normalised), e.g. "${ks[0].slice(0, 80)}"`);

  /* ---- canonical-unique (A13 #35): retired URLs ---- */
  for (const r of rows) {
    const src = r.from;
    if (byPath.has(src) || byPath.has(`${src.replace(/\/$/, '')}/`)) fail('canonical-unique', '_redirects', `retired URL ${src} is still built as a page (duplicate content)`);
    if (smPaths.has(src)) fail('canonical-unique', 'sitemap.xml', `retired URL ${src} is in the sitemap`);
    const dest = r.to.split(/[?#]/)[0];
    const target = byPath.get(dest);
    if (!target) fail('canonical-unique', '_redirects', `${src} → ${r.to}: the destination is not a built page`);
    else if (target.canonicals[0] !== `${origin}${dest}`) fail('canonical-unique', '_redirects', `${src} → ${r.to}: the destination's canonical is ${target.canonicals[0]}`);
  }
  for (const p of site.pages) {
    const linked = new Set(findAll(p.doc, (x) => x.tag === 'a' && !!x.attrs.href).map((a) => internalPath(a.attrs.href)).filter((h) => h && retired.has(h)));
    if (linked.size) fail('canonical-unique', p.file, `links to retired URL(s) ${[...linked].slice(0, 4).join(', ')} (link the canonical URL directly)`);
  }

  /* ---- technical (C6.6): site files ---- */
  if (site.sitemap === null) fail('technical', 'sitemap.xml', 'missing sitemap.xml');
  else {
    if (!/<urlset\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(site.sitemap)) fail('technical', 'sitemap.xml', 'not a sitemaps.org <urlset>');
    /** @type {Set<string>} */ const seen = new Set();
    for (const l of locs) {
      if (!l.loc.startsWith(`${smHost}/`)) fail('technical', 'sitemap.xml', `<loc> ${l.loc} is not on ${smHost}`);
      const path = l.loc.startsWith(smHost) ? l.loc.slice(smHost.length) : l.loc;
      if (seen.has(path)) fail('technical', 'sitemap.xml', `duplicate <loc> ${l.loc}`);
      seen.add(path);
      if (!byPath.has(path)) fail('technical', 'sitemap.xml', `<loc> ${path} is not a built page`);
      if (path === '/404.html' || isShowcaseOnly(path)) fail('technical', 'sitemap.xml', `${path} must not be in the sitemap`);
      if (!/^\d{4}-\d{2}-\d{2}/.test(l.lastmod)) fail('technical', 'sitemap.xml', `<loc> ${path} without an ISO <lastmod>`);
    }
    if (!locs.length) fail('technical', 'sitemap.xml', 'empty sitemap');
  }
  if (site.robots === null) fail('technical', 'robots.txt', 'missing robots.txt');
  else if (launch) {
    if (DOMAIN && !site.robots.includes(`Sitemap: https://${DOMAIN}/sitemap.xml`)) fail('technical', 'robots.txt', `robots.txt does not point at https://${DOMAIN}/sitemap.xml`);
    if (/^Disallow:\s*\/\s*$/m.test(site.robots)) fail('technical', 'robots.txt', 'launch robots.txt disallows the whole site');
  } else if (!/^Disallow:\s*\/\s*$/m.test(site.robots)) fail('technical', 'robots.txt', 'showcase robots.txt must disallow everything');
  if (site.headers !== null && site.headers !== undefined) {
    const global = /^\/\*\s*\n(?:[ \t]+.*\n?)*/m.exec(site.headers)?.[0] || '';
    if (launch && /X-Robots-Tag:\s*noindex/i.test(global)) fail('technical', '_headers', 'launch _headers sends X-Robots-Tag: noindex for every page');
  }
  if (site.redirects === null) fail('technical', '_redirects', 'missing _redirects');
  else for (const r of rows) if (!r.from.startsWith('/') || !r.to.startsWith('/') || r.status !== '301' || r.line.split(/\s+/).length !== 3) fail('technical', '_redirects', `malformed row "${r.line}" (want "<old> <new> 301")`);
  if (!byPath.has('/404.html')) fail('technical', '404.html', 'missing 404.html');
  return out;
}

/* ------------------------------------------------------------------ run */

const only = process.argv.find((a) => a.startsWith('--rules='))?.slice(8).split(',').filter(Boolean);
const optional = (/** @type {string} */ f) => (existsSync(join(DIST, f)) ? read(f) : null);
let failures = /** @type {{ rule: string, path: string, message: string }[]} */ ([]);
if (existsSync(DIST) && existsSync(join(DIST, 'index.html'))) {
  const pages = files('.html').map((f) => pageOf(f.replace(/\\/g, '/'), read(f)));
  failures = checkSite({
    pages, sitemap: optional('sitemap.xml'), robots: optional('robots.txt'), redirects: optional('_redirects'), headers: optional('_headers'),
    projects: projectFacts(), exists: (p) => existsSync(join(DIST, decodeURIComponent(p.replace(/^\//, '')))),
  });
  if (only) failures = failures.filter((x) => only.includes(x.rule));
}
if (process.argv.includes('--json')) console.log(JSON.stringify(failures, null, 1));
const ok = report('check-seo', failures);
if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = ok ? 0 : 1;
export default ok;
