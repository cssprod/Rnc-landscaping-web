#!/usr/bin/env node
// @ts-check
/**
 * Content checks (CONTRACT §2, §6): every content/**.json file against site/tools/schemas/*.schema.json plus the
 * rules other streams are gated by. Runs offline; dist checks run only when SITE_DIST (or site/dist) exists.
 *   schema-v3              required fields, enums, types, SEO lengths (title ≤ 60, description ≤ 155); no budget/price/
 *                          cost/rate keys and no $ amounts; slug = file name, lowercase-hyphen; image slots exist in
 *                          media/images.json (virtual art slots proj-<slug>-art and process-hero accepted; images.art
 *                          optional until W2); inline links and path fields point at real pages; cross references exist.
 *   single-source          no NAP value, founding year or business-fact token typed into a template (site/src) and no
 *                          phone number, email address or founding-year claim typed into content: they live in site.json.
 *                          A third-party phone or email inside a sourced object (one with a sourceUrl: area localRules,
 *                          conditions, localNotes, regional blocks) is a sourced fact and passes; RNC's own token values
 *                          never pass.
 *   municipality-list      site.json holds the one list of the 13 municipalities; one content/areas file per municipality
 *                          (and one built page each); no second list in content or templates.
 *   resource-byline-dates  guides: author "[OWNER NAME]", "RNC Landscaping", "/about/"; real ISO published date (not in
 *                          the future, equal to the deprecated date alias); updated null or later than published.
 *   guarantee              pages/process.json guarantee: heading + plain-language body built around [WARRANTY]; no prices
 *                          or superlatives.
 *   service-tables         each service: a perVisit table (caption, ≥ 3 task/detail rows, no prices) and all four seasons.
 *   service-faqs           each service: 5–6 short FAQs (a question, a short answer).
 *   area-unique-sentences  no sentence appears in two area files (summary, localRules, conditions, proof, servicesBlurb,
 *                          intro, localNotes; regional.json is excluded).
 *   area-local-blocks      each area: ≥ 1 own local rule, ≥ 1 sourced condition, ≥ 1 proof item, none shared with another
 *                          area; never "no bylaw exists".
 *   gbp-alignment          site.json = 13 contract municipalities + 4 service lines, names matching the area and service
 *                          files; the built JSON-LD areaServed / knowsAbout match them.
 *   nap-consistency        site.json NAP fields reference their tokens (one value, one place); every built page shows the
 *                          same NAP in the footer and JSON-LD, and the Google profile (review) link once it is set.
 * Flags: --rules=a,b (run a subset)   --root=DIR (repository root, e.g. a scratch copy)   --strict (retired links fail)
 *        --all (print every failure, not only the first 50)
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIST, report } from './lib.mjs';

export const RULES = ['schema-v3', 'single-source', 'municipality-list', 'resource-byline-dates', 'guarantee', 'service-tables',
  'service-faqs', 'area-unique-sentences', 'area-local-blocks', 'gbp-alignment', 'nap-consistency'];

const argv = process.argv.slice(2);
const opt = (/** @type {string} */ k) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const ROOT = opt('root') || fileURLToPath(new URL('../..', import.meta.url));
const ONLY = new Set((opt('rules') || '').split(',').filter(Boolean));
const strict = argv.includes('--strict') || process.env.SITE_MODE === 'launch';
const CONTENT = join(ROOT, 'content');
const SCHEMAS = fileURLToPath(new URL('./schemas/', import.meta.url));
const TODAY = new Date().toISOString().slice(0, 10);

/** Contract order (CONTRACT §1). */
export const SERVICES = ['grounds-maintenance', 'landscape-installation', 'irrigation', 'tree-vegetation'];
export const AREAS = ['victoria', 'saanich', 'oak-bay', 'esquimalt', 'langford', 'colwood', 'view-royal', 'sooke', 'central-saanich', 'north-saanich', 'sidney', 'highlands', 'metchosin'];
/** Business-fact tokens a template must read from site.json instead of typing (CONTRACT §6 consumers). */
const FACT_TOKENS = ['PHONE', 'EMAIL', 'ADDRESS', 'HOURS', 'LEGAL NAME', 'FOUNDED', 'OWNER NAME', 'OWNER BIO', 'CREW SIZE', 'LIABILITY LIMIT',
  'WORKSAFEBC STATUS', 'LICENCES', 'CERTIFICATIONS', 'MEMBERSHIPS', 'WARRANTY', 'REPLY TIME', 'GOOGLE PROFILE'];
const SUPERLATIVES = /\b(best|#1|number one|award[- ]winning|top[- ]rated|leading|unbeatable|cheapest|lowest price|guaranteed lowest|finest)\b/i;
const PRICE = /\$\s?\d|\b\d+\s?(?:dollars|CAD)\b|\bper hour\b|\bfrom \$/i;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]\d{3}[\s.-]\d{4}\b/;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/i;
const FOUNDING_RE = /\b(?:since|founded(?: in)?|established(?: in)?|est\.)\s+(?:in\s+)?(?:19|20)\d{2}\b|\b\d+\+?\s+years\s+(?:in business|of experience|serving)\b/i;
/** A real-looking phone number (the fictional 555 exchange used in form examples is allowed). @param {string} s */
const realPhone = (s) => [...s.matchAll(new RegExp(PHONE_RE.source, 'g'))].map((m) => m[0]).find((x) => !/\b555[\s.-]\d{4}\b/.test(x));
/** A real-looking email address (reserved example domains are allowed). @param {string} s */
const realEmail = (s) => [...s.matchAll(new RegExp(EMAIL_RE.source, 'gi'))].map((m) => m[0]).find((x) => !/@(?:[\w-]+\.)*example\.(?:com|org|net|ca)$|\.(?:test|invalid|example)$/i.test(x));
/** The 10 NANP digits of a phone value, without a country code or extension. @param {string} s */
const phoneDigits = (s) => s.replace(/(?:ext(?:ension)?\.?|x|#)\s*\d+\s*$/i, '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
/**
 * Whether text contains RNC's own value for token k, in any format: a phone in any punctuation or with a country code,
 * an email in any letter case, other values as typed.
 * @param {string} text @param {string} k @param {string} v
 */
const typesOwn = (text, k, v) => {
  if (k === 'PHONE') {
    const want = phoneDigits(v);
    if (want.length !== 10) return text.includes(v);
    return text.includes(v) || [...text.matchAll(new RegExp(PHONE_RE.source, 'g'))].some((m) => phoneDigits(m[0]) === want);
  }
  if (k === 'EMAIL') return text.toLowerCase().includes(v.toLowerCase());
  return text.includes(v);
};
const VIRTUAL_SLOT = /^(?:proj-[a-z0-9]+(?:-[a-z0-9]+)*-art|process-hero)$/;

/** @typedef {{ rule: string, path: string, message: string, toString(): string }} Failure */
/** @type {Failure[]} */
const failures = [];
/** @type {string[]} */
const warnings = [];
/** @param {string} rule @param {string} path @param {string} message */
function fail(rule, path, message) {
  if (ONLY.size && !ONLY.has(rule)) return;
  failures.push({ rule, path, message, toString() { return `${path}: [${rule}] ${message}`; } });
}
const on = (/** @type {string} */ rule) => !ONLY.size || ONLY.has(rule);

/* ------------------------------------------------------------------ loading */
/** @param {string} dir @returns {string[]} repo-relative JSON files */
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith('.json') && statSync(join(dir, f)).isFile()).sort();
}
/** @param {string} file */
function readJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) { fail('schema-v3', relative(ROOT, file), `invalid JSON: ${/** @type {Error} */ (e).message}`); return null; }
}

if (!existsSync(CONTENT)) {
  console.log(`  check-content: no content/ folder under ${ROOT}; nothing to check`);
} else {
  run();
}

function run() {
  /** content-relative path → parsed JSON. @type {Map<string, any>} */
  const docs = new Map();
  for (const f of walk(CONTENT)) { const d = readJson(join(CONTENT, f)); if (d !== null) docs.set(f.split('\\').join('/'), d); }
  const coll = (/** @type {string} */ name) => [...docs].filter(([f]) => f.startsWith(`${name}/`)).map(([f, d]) => ({ f, d, slug: basename(f, '.json') }));
  const siteJson = docs.get('site.json');
  const regional = docs.get('regional.json');
  const services = coll('services');
  const projects = coll('projects');
  const areas = coll('areas');
  const resources = coll('resources');
  const testimonials = coll('testimonials');
  const imagesFile = [join(ROOT, 'media/images.json'), join(ROOT, 'site/fixtures/media/images.json')].find(existsSync);
  const slots = new Set(imagesFile ? JSON.parse(readFileSync(imagesFile, 'utf8')).map((/** @type {any} */ s) => s.id) : []);
  const urlMapFile = join(ROOT, '.orchestra/url-map.json');
  const urlMap = existsSync(urlMapFile) ? JSON.parse(readFileSync(urlMapFile, 'utf8')) : null;
  const tokens = siteJson?.tokens || {};

  /* ---------------------------------------------------------------- schema-v3 */
  if (on('schema-v3')) {
    if (!siteJson) fail('schema-v3', 'content/site.json', 'missing: it is the single source of business facts');
    const schemas = readdirSync(SCHEMAS).filter((f) => f.endsWith('.schema.json')).map((f) => ({ name: f, s: JSON.parse(readFileSync(join(SCHEMAS, f), 'utf8')) }));
    const defs = schemas.find((x) => x.name === '_defs.schema.json')?.s || { definitions: {} };
    /** Most specific schema: an exact file name beats a folder glob. @param {string} f */
    const schemaFor = (f) => {
      const exact = schemas.find((x) => (x.s['x-files'] || []).includes(f));
      if (exact) return exact;
      return schemas.find((x) => (x.s['x-files'] || []).some((/** @type {string} */ g) => g.endsWith('/*.json') && f.startsWith(g.slice(0, -'*.json'.length)) && !f.slice(g.length - '*.json'.length).includes('/')));
    };
    /** Known pages (link targets): url-map C1 pages plus pages derived from content. */
    const pages = new Set(['/']);
    if (urlMap) for (const e of [...urlMap.entries, ...(urlMap.added || [])]) if ((e.status === 200 || e.status === 301) && !String(e.new).includes('?')) pages.add(e.new);
    for (const s of services) pages.add(`/services/${s.slug}/`);
    for (const a of areas) pages.add(`/areas/${a.slug}/`);
    for (const p of projects) pages.add(`/projects/${p.slug}/`);
    for (const r of resources) pages.add(`/resources/${r.slug}/`);
    /** content/pages/<name>.json → its C1 URL (also covers a checkout without .orchestra/url-map.json). */
    const PAGE_URL = /** @type {Record<string, string>} */ ({ home: '/', portfolio: '/projects/', quote: '/free-quote/', 404: '/404.html' });
    for (const [f] of docs) if (f.startsWith('pages/')) { const n = basename(f, '.json'); pages.add(PAGE_URL[n] || `/${n}/`); }
    const retired = new Set(urlMap ? [...urlMap.entries, ...(urlMap.aliases || [])].filter((e) => e.status === 301).map((e) => e.old) : []);
    const pending = new Set([siteJson?.capabilityStatement].filter(Boolean));
    let retiredLinks = 0;
    /** @param {string} file @param {string} target */
    const checkTarget = (file, target) => {
      const p = decodeURIComponent(target.split(/[?#]/)[0]);
      if (!p.startsWith('/') || p.startsWith('//')) return;
      if (pages.has(p) || pending.has(p) || existsSync(join(ROOT, 'site/static', p))) return;
      if (retired.has(p)) { if (strict) fail('schema-v3', file, `links to the retired URL ${target}: use its C1 URL`); else retiredLinks++; return; }
      fail('schema-v3', file, `link target ${target} is not a page`);
    };

    for (const [f, d] of docs) {
      const file = `content/${f}`;
      const sc = schemaFor(f);
      if (!sc) fail('schema-v3', file, 'no schema covers this file (add it to site/tools/schemas)');
      else {
        /** @type {string[]} */ const errs = [];
        /** @type {string[]} */ const slotRefs = [];
        validate(sc.s, d, '', errs, { root: sc.s, defs, slotRefs, file });
        for (const e of errs) fail('schema-v3', file, e);
        for (const id of slotRefs) if (id && !slots.has(id) && !VIRTUAL_SLOT.test(id)) fail('schema-v3', file, `image slot "${id}" is not in media/images.json`);
      }
      // slug = file name for collection files
      if (/^(services|projects|areas|resources|testimonials)\//.test(f)) {
        const name = basename(f, '.json');
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) fail('schema-v3', file, 'file name is not a lowercase-hyphen slug');
        if (d.slug !== name) fail('schema-v3', file, `slug "${d.slug}" does not match the file name`);
      }
      // forbidden keys, $ amounts, links
      visit(d, (key, val, path) => {
        if (key && (/budget|price|cost/i.test(key) || /^rates?$/i.test(key))) fail('schema-v3', file, `forbidden key "${path}" (no prices or budgets in content)`);
        if (typeof val !== 'string') return;
        if (!(f === 'site.json' && path.startsWith('tokens.')) && /\$\s?\d/.test(val)) fail('schema-v3', file, `$ amount at ${path}: no prices in content`);
        for (const m of val.matchAll(/\]\(([^)\s]+)\)/g)) checkTarget(file, m[1]);
        if (/(^|\.)(url|href|path)$/.test(path) && val.startsWith('/')) checkTarget(file, val);
      });
    }
    if (retiredLinks) warnings.push(`${retiredLinks} content link(s) to retired URLs (/quote/, /portfolio/…): the integrator's link codemod rewrites them; --strict fails`);
    // cross references
    const has = (/** @type {any[]} */ list, /** @type {string} */ slug) => list.some((x) => x.slug === slug);
    const regionalIds = new Set((regional?.blocks || []).map((/** @type {any} */ b) => b.id));
    const localIds = new Set(areas.flatMap((a) => (a.d.localRules || []).map((/** @type {any} */ r) => r.id)));
    for (const p of projects) if (p.d.testimonial && !has(testimonials, p.d.testimonial)) fail('schema-v3', `content/${p.f}`, `testimonial "${p.d.testimonial}" does not exist`);
    for (const a of areas) {
      const file = `content/${a.f}`;
      if (a.d.featuredProject && !has(projects, a.d.featuredProject)) fail('schema-v3', file, `featuredProject "${a.d.featuredProject}" does not exist`);
      for (const pr of a.d.proof || []) if (pr.kind === 'project' && !has(projects, pr.project)) fail('schema-v3', file, `proof project "${pr.project}" does not exist`);
      for (const n of a.d.neighbours || []) if (n === a.slug) fail('schema-v3', file, 'lists itself as a neighbour');
      for (const id of a.d.sharedRegional || []) if (!regionalIds.has(id)) fail('schema-v3', file, `sharedRegional "${id}" is not a block in content/regional.json`);
    }
    for (const s of services) for (const id of s.d.localRulesRefs || []) if (!regionalIds.has(id) && !localIds.has(id)) fail('schema-v3', `content/${s.f}`, `localRulesRefs "${id}" is not a regional block or an area local rule`);
    const home = docs.get('pages/home.json');
    for (const s of home?.featuredProjects || []) if (!has(projects, s)) fail('schema-v3', 'content/pages/home.json', `featured project "${s}" does not exist`);
    for (const s of home?.featuredTestimonials || []) if (!has(testimonials, s)) fail('schema-v3', 'content/pages/home.json', `featured testimonial "${s}" does not exist`);
    for (const t of testimonials) if (t.d.sample !== true && t.d.source !== 'google') fail('schema-v3', `content/${t.f}`, 'a non-sample testimonial needs source "google" (a real, consented review)');
  }

  /* ---------------------------------------------------------------- single-source */
  if (on('single-source')) {
    const values = Object.entries(tokens).filter(([k, v]) => v && ['PHONE', 'EMAIL', 'ADDRESS', 'LEGAL NAME', 'FOUNDED'].includes(k)).map(([k, v]) => [k, String(v)]);
    const SRC = join(ROOT, 'site/src');
    const exempt = new Set(['lib/tokens.mjs', 'lib/head-scripts.mjs']);
    for (const f of existsSync(SRC) ? readdirSync(SRC, { recursive: true }).map(String).filter((x) => x.endsWith('.mjs') || x.endsWith('.js')) : []) {
      const rel = f.split('\\').join('/');
      if (exempt.has(rel)) continue;
      const code = stripComments(readFileSync(join(SRC, f), 'utf8'));
      const file = `site/src/${rel}`;
      for (const t of FACT_TOKENS) if (code.includes(`[${t}]`)) fail('single-source', file, `types the business fact [${t}]: read it from siteJson (content/site.json)`);
      for (const [k, v] of values) if (typesOwn(code, k, v)) fail('single-source', file, `types the ${k} value "${v}": read it from siteJson`);
      const ph = realPhone(code.replace(/\d+(?:\.\d+)?(?:,\d+)+/g, ''));
      if (ph) fail('single-source', file, `types a phone number (${ph})`);
      const em = realEmail(code);
      if (em) fail('single-source', file, `types an email address (${em})`);
      if (FOUNDING_RE.test(code)) fail('single-source', file, `founding-year or years-in-business claim (${code.match(FOUNDING_RE)?.[0]})`);
    }
    for (const [f, d] of docs) {
      if (f === 'site.json') continue;
      const file = `content/${f}`;
      // A string inside an object that carries a sourceUrl (area localRules, conditions, localNotes, regional blocks) quotes
      // a third party, so a municipal phone number or email there is a sourced fact, not RNC's contact: only RNC's own token
      // values are flagged there. Elsewhere a phone or email is flagged with both ways out (RNC's token, or a source).
      visitSourced(d, (val, path, sourced) => {
        if (typeof val !== 'string' || /(^|\.)(sourceUrl|url|excerpt|sourceTitle)$/.test(path)) return;
        if (val.includes('[FOUNDED]')) fail('single-source', file, `[FOUNDED] at ${path}: the founding year appears only in JSON-LD`);
        if (FOUNDING_RE.test(val)) fail('single-source', file, `founding-year or years-in-business claim at ${path} ("${val.match(FOUNDING_RE)?.[0]}")`);
        const own = values.filter(([k, v]) => typesOwn(val, k, v));
        for (const [k] of own) fail('single-source', file, `${k} value typed at ${path}: use [${k}]`);
        if (sourced || own.length) return;
        const ph = realPhone(val);
        if (ph) fail('single-source', file, `phone number typed at ${path} (${ph}): if this is RNC's contact, use [PHONE]; a third-party contact needs a sourceUrl`);
        const em = realEmail(val);
        if (em) fail('single-source', file, `email address typed at ${path} (${em}): if this is RNC's contact, use [EMAIL]; a third-party contact needs a sourceUrl`);
      });
    }
  }

  /* ---------------------------------------------------------------- municipality-list */
  const names = new Map((siteJson?.municipalities || []).map((/** @type {any} */ m) => [m.slug, m.name]));
  const muniWords = new Set([...AREAS, ...names.values()].map((x) => String(x).toLowerCase()));
  if (on('municipality-list') && siteJson) {
    const slugs = (siteJson.municipalities || []).map((/** @type {any} */ m) => m.slug);
    if (JSON.stringify(slugs) !== JSON.stringify(AREAS)) fail('municipality-list', 'content/site.json', `municipalities must be the 13 contract slugs in order; found ${slugs.join(', ')}`);
    const files = new Set(areas.map((a) => a.slug));
    for (const s of AREAS) if (!files.has(s)) fail('municipality-list', `content/areas/${s}.json`, 'missing: one page per municipality');
    for (const s of files) if (!AREAS.includes(s)) fail('municipality-list', `content/areas/${s}.json`, 'not one of the 13 municipalities in site.json');
    for (const a of areas) if (names.has(a.slug) && a.d.name !== names.get(a.slug)) fail('municipality-list', `content/${a.f}`, `name "${a.d.name}" differs from site.json "${names.get(a.slug)}"`);
    for (const [f, d] of docs) {
      if (f === 'site.json') continue;
      visit(d, (key, val, path) => {
        if (key === 'appliesTo' || key === 'neighbours') return;
        if (Array.isArray(val)) {
          const hits = new Set(val.filter((v) => typeof v === 'string' && muniWords.has(v.toLowerCase())).map((v) => v.toLowerCase()));
          if (hits.size >= 5) fail('municipality-list', `content/${f}`, `${path} is a second municipality list (${hits.size} entries): site.json holds the only one`);
        }
      });
    }
    const SRC = join(ROOT, 'site/src');
    for (const f of existsSync(SRC) ? readdirSync(SRC, { recursive: true }).map(String).filter((x) => x.endsWith('.mjs')) : []) {
      const code = stripComments(readFileSync(join(SRC, f), 'utf8'));
      for (const m of code.matchAll(/\[[^[\]]*\]/g)) {
        const hits = new Set([...m[0].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1].toLowerCase()).filter((x) => muniWords.has(x)));
        if (hits.size >= 3) fail('municipality-list', `site/src/${f.split('\\').join('/')}`, `hard-coded municipality list (${[...hits].slice(0, 4).join(', ')}…): use siteJson.municipalities`);
      }
    }
    if (existsSync(DIST)) {
      const built = existsSync(join(DIST, 'areas')) ? readdirSync(join(DIST, 'areas')).filter((x) => existsSync(join(DIST, 'areas', x, 'index.html'))) : [];
      for (const s of AREAS) if (!built.includes(s)) fail('municipality-list', `areas/${s}/index.html`, 'not built: one page per municipality');
      for (const s of built) if (!AREAS.includes(s)) fail('municipality-list', `areas/${s}/index.html`, 'built area page for a slug that is not in site.json');
    }
  }

  /* ---------------------------------------------------------------- resource-byline-dates */
  if (on('resource-byline-dates')) {
    for (const r of resources) {
      const file = `content/${r.f}`;
      const a = r.d.author;
      if (!a || a.name !== '[OWNER NAME]' || a.org !== 'RNC Landscaping' || a.url !== '/about/') fail('resource-byline-dates', file, 'author must be { "name": "[OWNER NAME]", "org": "RNC Landscaping", "url": "/about/" }');
      if (!isIso(r.d.published)) fail('resource-byline-dates', file, 'published must be the real ISO publish date (YYYY-MM-DD)');
      else {
        if (r.d.published > TODAY) fail('resource-byline-dates', file, `published ${r.d.published} is in the future`);
        if (r.d.date && r.d.date !== r.d.published) fail('resource-byline-dates', file, `deprecated date ${r.d.date} differs from published ${r.d.published}: never invent or spread dates`);
      }
      if (r.d.updated !== null && r.d.updated !== undefined) {
        if (!isIso(r.d.updated)) fail('resource-byline-dates', file, 'updated must be null or an ISO date');
        else if (isIso(r.d.published) && r.d.updated <= r.d.published) fail('resource-byline-dates', file, 'updated must be later than published (set it only when the content really changed)');
        else if (r.d.updated > TODAY) fail('resource-byline-dates', file, `updated ${r.d.updated} is in the future`);
      }
      if (!('updated' in r.d)) fail('resource-byline-dates', file, 'missing "updated" (null until the content really changes)');
    }
  }

  /* ---------------------------------------------------------------- guarantee */
  if (on('guarantee')) {
    const p = docs.get('pages/process.json');
    const g = p?.guarantee;
    if (!p) fail('guarantee', 'content/pages/process.json', 'missing: the process page carries the workmanship guarantee');
    else if (!g || !g.heading || !Array.isArray(g.body) || !g.body.length) fail('guarantee', 'content/pages/process.json', 'guarantee needs a heading and plain-language body paragraphs');
    else {
      const text = [g.heading, ...g.body].join(' ');
      if (!text.includes('[WARRANTY]')) fail('guarantee', 'content/pages/process.json', 'the guarantee is built around [WARRANTY]; the token is missing');
      if (SUPERLATIVES.test(text)) fail('guarantee', 'content/pages/process.json', `superlative in the guarantee ("${text.match(SUPERLATIVES)?.[0]}")`);
      if (PRICE.test(text)) fail('guarantee', 'content/pages/process.json', 'price in the guarantee');
    }
  }

  /* ---------------------------------------------------------------- service-tables / service-faqs */
  for (const s of services) {
    const file = `content/${s.f}`;
    if (on('service-tables')) {
      const t = s.d.perVisit;
      if (!t || !t.caption || !Array.isArray(t.rows) || t.rows.length < 3) fail('service-tables', file, 'perVisit needs a caption and at least 3 task/detail rows');
      else for (const [i, r] of t.rows.entries()) {
        if (!r.task || !r.detail) fail('service-tables', file, `perVisit row ${i + 1} needs a task and a detail`);
        if (PRICE.test(`${r.task} ${r.detail}`)) fail('service-tables', file, `perVisit row ${i + 1} mentions a price`);
      }
      const seasons = new Set((s.d.seasonal || []).filter((/** @type {any} */ x) => x.items?.length).map((/** @type {any} */ x) => x.season));
      for (const want of ['Spring', 'Summer', 'Fall', 'Winter']) if (!seasons.has(want)) fail('service-tables', file, `seasonal table has no ${want} items`);
    }
    if (on('service-faqs')) {
      const faqs = s.d.faqs || [];
      if (faqs.length < 5 || faqs.length > 6) fail('service-faqs', file, `${faqs.length} FAQs: each service page carries 5–6`);
      for (const [i, q] of faqs.entries()) {
        if (!q.q || !/\?\s*$/.test(q.q)) fail('service-faqs', file, `FAQ ${i + 1}: the question should end with "?"`);
        if (!q.a) fail('service-faqs', file, `FAQ ${i + 1} has no answer`);
        else if (q.a.length > 600) fail('service-faqs', file, `FAQ ${i + 1}: answer is ${q.a.length} characters (keep it short, ≤ 600)`);
        if (q.a && PRICE.test(q.a)) fail('service-faqs', file, `FAQ ${i + 1} mentions a price`);
      }
    }
  }

  /* ---------------------------------------------------------------- area-unique-sentences */
  if (on('area-unique-sentences')) {
    /** @type {Map<string, Set<string>>} */ const seen = new Map();
    for (const a of areas) {
      const d = a.d;
      const texts = [...(d.summary || []), ...(d.intro || []), ...(d.localRules || []).map((/** @type {any} */ r) => r.text), ...(d.conditions || []).map((/** @type {any} */ r) => r.text),
        ...(d.proof || []).map((/** @type {any} */ r) => r.text), ...Object.values(d.servicesBlurb || {}), ...(d.localNotes || []).map((/** @type {any} */ r) => r.text)].filter((x) => typeof x === 'string');
      for (const s of new Set(texts.flatMap(sentences))) (seen.get(s) || seen.set(s, new Set()).get(s))?.add(a.slug);
    }
    for (const [s, set] of seen) if (set.size > 1) fail('area-unique-sentences', `content/areas/${[...set][0]}.json`, `sentence shared with ${[...set].slice(1).join(', ')}: "${s.slice(0, 90)}${s.length > 90 ? '…' : ''}"`);
  }

  /* ---------------------------------------------------------------- area-local-blocks */
  if (on('area-local-blocks')) {
    /** @type {Map<string, string[]>} */ const ruleOwner = new Map();
    /** @type {Map<string, string[]>} */ const projOwner = new Map();
    for (const a of areas) {
      for (const r of [...(a.d.localRules || []), ...(a.d.conditions || [])]) (ruleOwner.get(r.id) || ruleOwner.set(r.id, []).get(r.id))?.push(a.slug);
      for (const p of a.d.proof || []) if (p.kind === 'project') (projOwner.get(p.project) || projOwner.set(p.project, []).get(p.project))?.push(a.slug);
    }
    for (const a of areas) {
      const file = `content/${a.f}`;
      const sourced = (/** @type {any} */ r) => r && r.sourceUrl && r.excerpt && r.verify === true && 'reviewedOn' in r && (r.reviewedOn === null || isIso(r.reviewedOn));
      const own = (/** @type {any} */ r) => (ruleOwner.get(r.id) || []).length === 1;
      const rules = (a.d.localRules || []).filter((/** @type {any} */ r) => sourced(r) && own(r));
      const conds = (a.d.conditions || []).filter((/** @type {any} */ r) => sourced(r) && own(r));
      const proof = (a.d.proof || []).filter((/** @type {any} */ p) => (p.kind === 'project' && (projOwner.get(p.project) || []).length === 1 && projects.find((x) => x.slug === p.project)?.d.area === a.slug) || (p.kind === 'job-note' && p.text && p.sample === true));
      if (!rules.length) fail('area-local-blocks', file, 'needs at least one own local rule with sourceUrl, excerpt, verify:true and reviewedOn (date or null)');
      if (!conds.length) fail('area-local-blocks', file, 'needs at least one own sourced condition');
      if (!proof.length) fail('area-local-blocks', file, 'needs at least one proof item: a project in this municipality or a sample job note');
      for (const r of [...(a.d.localRules || []), ...(a.d.conditions || [])]) {
        if ((ruleOwner.get(r.id) || []).length > 1) fail('area-local-blocks', file, `block "${r.id}" is shared with ${ruleOwner.get(r.id)?.filter((x) => x !== a.slug).join(', ')}`);
        if (/\bno (?:tree )?bylaw (?:exists|applies)|there is no (?:tree )?bylaw|has no (?:tree )?bylaw/i.test(`${r.text} ${r.excerpt || ''}`)) fail('area-local-blocks', file, `"${r.id}" claims no bylaw exists: say the rule could not be confirmed instead`);
      }
    }
  }

  /* ---------------------------------------------------------------- gbp-alignment */
  /** JSON-LD business node of a built page. @param {string} html */
  const businessOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).find((o) => o && /Business$/.test(String(o['@type'])));
  const distPages = existsSync(DIST) ? readdirSync(DIST, { recursive: true }).map(String).filter((f) => f.endsWith('.html') && statSync(join(DIST, f)).isFile()) : [];
  if (on('gbp-alignment') && siteJson) {
    const svc = (siteJson.services || []).map((/** @type {any} */ s) => s.slug);
    if (JSON.stringify(svc) !== JSON.stringify(SERVICES)) fail('gbp-alignment', 'content/site.json', `services must be the 4 contract service lines in order; found ${svc.join(', ')}`);
    if ((siteJson.municipalities || []).length !== 13) fail('gbp-alignment', 'content/site.json', `${(siteJson.municipalities || []).length} municipalities: the Google profile lists 13 service areas`);
    for (const s of siteJson.services || []) {
      const d = services.find((x) => x.slug === s.slug)?.d;
      if (!d) fail('gbp-alignment', `content/services/${s.slug}.json`, 'missing service file');
      else if (d.name !== s.name || (d.navLabel && d.navLabel !== s.navLabel)) fail('gbp-alignment', `content/services/${s.slug}.json`, `name/navLabel "${d.name}"/"${d.navLabel}" differ from site.json "${s.name}"/"${s.navLabel}"`);
    }
    if (distPages.includes('index.html')) {
      const b = businessOf(readFileSync(join(DIST, 'index.html'), 'utf8'));
      if (!b) fail('gbp-alignment', 'index.html', 'no business JSON-LD');
      else {
        const want = (siteJson.municipalities || []).map((/** @type {any} */ m) => `${m.name}, BC`);
        const got = (b.areaServed || []).map((/** @type {any} */ x) => x.name);
        if (JSON.stringify(got) !== JSON.stringify(want)) fail('gbp-alignment', 'index.html', `JSON-LD areaServed (${got.length}) differs from site.json municipalities (${want.length})`);
        const ks = (siteJson.services || []).map((/** @type {any} */ s) => s.name);
        if (JSON.stringify(b.knowsAbout || []) !== JSON.stringify(ks)) fail('gbp-alignment', 'index.html', 'JSON-LD knowsAbout differs from the site.json service lines');
        if (b.name !== siteJson.nap?.name) fail('gbp-alignment', 'index.html', `JSON-LD name "${b.name}" differs from site.json nap.name`);
      }
    }
  }

  /* ---------------------------------------------------------------- nap-consistency */
  if (on('nap-consistency') && siteJson) {
    const refs = /** @type {[string, any, string][]} */ ([['nap.legalName', siteJson.nap?.legalName, 'LEGAL NAME'], ['nap.address', siteJson.nap?.address, 'ADDRESS'], ['nap.phone', siteJson.nap?.phone, 'PHONE'],
      ['nap.email', siteJson.nap?.email, 'EMAIL'], ['hours.display', siteJson.hours?.display, 'HOURS'], ['replyTime', siteJson.replyTime, 'REPLY TIME'], ['googleProfile', siteJson.googleProfile, 'GOOGLE PROFILE'],
      ['founded', siteJson.founded, 'FOUNDED'], ['owner.name', siteJson.owner?.name, 'OWNER NAME'], ['owner.bio', siteJson.owner?.bio, 'OWNER BIO'], ['crewSize', siteJson.crewSize, 'CREW SIZE'], ['warranty', siteJson.warranty, 'WARRANTY']]);
    for (const [path, v, t] of refs) if (v !== `[${t}]`) fail('nap-consistency', 'content/site.json', `${path} must be "[${t}]" (its value lives once, in tokens["${t}"])`);
    if (siteJson.nap?.name !== siteJson.name) fail('nap-consistency', 'content/site.json', 'nap.name differs from name');
    const credTok = { insurance: 'LIABILITY LIMIT', worksafebc: 'WORKSAFEBC STATUS', licences: 'LICENCES', certifications: 'CERTIFICATIONS', memberships: 'MEMBERSHIPS' };
    for (const c of siteJson.credentials || []) { const t = /** @type {any} */ (credTok)[c.id]; if (t && c.value !== `[${t}]`) fail('nap-consistency', 'content/site.json', `credentials.${c.id}.value must be "[${t}]"`); }
    // build.mjs runs typographer() over every page (8-5 → 8–5, ' → ’, " → “”), so both sides are compared in plain form.
    const shown = (/** @type {string} */ t) => tokens[t] ? plainTypo(escHtml(String(tokens[t]))) : `[${t}]`;
    for (const f of distPages) {
      const html = readFileSync(join(DIST, f), 'utf8');
      const foot = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0];
      if (!foot) { fail('nap-consistency', f, 'no footer'); continue; }
      const plainFoot = plainTypo(foot);
      for (const t of ['PHONE', 'EMAIL', 'ADDRESS', 'HOURS']) if (!plainFoot.includes(shown(t))) fail('nap-consistency', f, `footer does not show ${t} as site.json has it (${shown(t)})`);
      const gp = tokens['GOOGLE PROFILE'];
      if (gp && !foot.includes(`href="${escHtml(gp)}"`)) fail('nap-consistency', f, 'footer has no link to the Google profile');
      if (!gp && !/Google profile/.test(foot) && !/<meta name="robots" content="noindex/.test(html)) warnings.push(`${f}: no Google profile link (optional until [GOOGLE PROFILE] is set)`);
      const b = businessOf(html);
      if (!b) { fail('nap-consistency', f, 'no business JSON-LD'); continue; }
      if (b.name !== siteJson.nap?.name) fail('nap-consistency', f, 'JSON-LD name differs from site.json');
      if ((tokens.PHONE || undefined) !== b.telephone) fail('nap-consistency', f, `JSON-LD telephone "${b.telephone}" differs from site.json PHONE`);
      if ((tokens.EMAIL || undefined) !== b.email) fail('nap-consistency', f, `JSON-LD email "${b.email}" differs from site.json EMAIL`);
      if ((tokens.ADDRESS || undefined) !== b.address?.streetAddress) fail('nap-consistency', f, 'JSON-LD streetAddress differs from site.json ADDRESS');
      if ((tokens.FOUNDED || undefined) !== b.foundingDate) fail('nap-consistency', f, 'JSON-LD foundingDate differs from site.json FOUNDED');
    }
  }
}

/* ------------------------------------------------------------------ helpers */
/** @param {unknown} v */
function isIso(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !isNaN(+d) && d.toISOString().slice(0, 10) === v;
}
/** Undo the build's typographer() (src/lib/html.mjs) so a token value and its rendering compare equal. @param {string} s */
function plainTypo(s) {
  return s.replace(/&quot;|&#34;|[“”]/g, '"').replace(/&#39;|&apos;|[‘’]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...');
}
/** @param {string} s */
function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
/** Sentences of a text, normalised; short fragments (< 6 words) are ignored. @param {string} t */
function sentences(t) {
  return t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/(?<=[.!?])\s+/).map((s) => s.toLowerCase().replace(/[“”"’']/g, '').replace(/\s+/g, ' ').trim()).filter((s) => s.split(' ').length >= 6);
}
/** Drop JS comments (block, whole-line and trailing "// "), keeping strings such as https:// intact. @param {string} code */
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).map((l) => l.replace(/(^|\s)\/\/\s.*$/, '')).join('\n');
}
/**
 * Depth-first walk over JSON. @param {any} v @param {(key: string, val: any, path: string) => void} fn
 * @param {string} [path] @param {string} [key]
 */
function visit(v, fn, path = '', key = '') {
  fn(key, v, path);
  if (Array.isArray(v)) v.forEach((x, i) => visit(x, fn, `${path}[${i}]`, key));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, fn, path ? `${path}.${k}` : k, k);
}
/**
 * Like visit(), and also tells fn whether a containing object carries a sourceUrl (a sourced third-party fact).
 * @param {any} v @param {(val: any, path: string, sourced: boolean) => void} fn @param {string} [path] @param {boolean} [sourced]
 */
function visitSourced(v, fn, path = '', sourced = false) {
  fn(v, path, sourced);
  if (Array.isArray(v)) v.forEach((x, i) => visitSourced(x, fn, `${path}[${i}]`, sourced));
  else if (v && typeof v === 'object') {
    const s = sourced || (typeof v.sourceUrl === 'string' && v.sourceUrl !== '');
    for (const [k, x] of Object.entries(v)) visitSourced(x, fn, path ? `${path}.${k}` : k, s);
  }
}

/**
 * Minimal JSON Schema (draft-07 subset): type, const, enum, pattern, format:date, min/maxLength, min/maxItems, uniqueItems,
 * required, properties, additionalProperties, items, allOf, anyOf, $ref (local and _defs.schema.json), x-slot, x-deprecated.
 * @param {any} s @param {any} v @param {string} at @param {string[]} errs
 * @param {{ root: any, defs: any, slotRefs: string[], file: string }} c
 */
function validate(s, v, at, errs, c) {
  if (!s || typeof s !== 'object') return;
  const where = at || '(root)';
  if (s.$ref) {
    const [doc, ptr] = s.$ref.split('#');
    const root = doc ? c.defs : c.root;
    const target = ptr.split('/').filter(Boolean).reduce((o, k) => o?.[k], root);
    if (!target) errs.push(`schema error: unresolved $ref ${s.$ref}`);
    else validate(target, v, at, errs, { ...c, root });
  }
  if (s['x-deprecated'] && v !== undefined) warnings.push(`${c.file}: ${where} is deprecated (${s['x-deprecated']})`);
  if (s['x-slot'] && typeof v === 'string') c.slotRefs.push(v);
  if (s.type) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    const t = v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
    if (!types.includes(t) && !(t === 'integer' && types.includes('number'))) { errs.push(`${where}: expected ${types.join(' or ')}, got ${t}`); return; }
  }
  if ('const' in s && JSON.stringify(v) !== JSON.stringify(s.const)) errs.push(`${where}: must be ${JSON.stringify(s.const)}`);
  if (s.enum && !s.enum.some((/** @type {any} */ e) => JSON.stringify(e) === JSON.stringify(v))) errs.push(`${where}: "${v}" is not one of ${s.enum.join(', ')}`);
  if (typeof v === 'string') {
    if (s.minLength !== undefined && v.length < s.minLength) errs.push(`${where}: empty or shorter than ${s.minLength}`);
    if (s.maxLength !== undefined && v.length > s.maxLength) errs.push(`${where}: ${v.length} characters (max ${s.maxLength})`);
    if (s.pattern && !new RegExp(s.pattern).test(v)) errs.push(`${where}: "${v.slice(0, 60)}" does not match ${s.pattern}`);
    if (s.format === 'date' && !isIso(v)) errs.push(`${where}: "${v}" is not an ISO date (YYYY-MM-DD)`);
  }
  if (Array.isArray(v)) {
    if (s.minItems !== undefined && v.length < s.minItems) errs.push(`${where}: ${v.length} item(s), needs at least ${s.minItems}`);
    if (s.maxItems !== undefined && v.length > s.maxItems) errs.push(`${where}: ${v.length} items, at most ${s.maxItems}`);
    if (s.uniqueItems && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) errs.push(`${where}: items must be unique`);
    if (s.items) v.forEach((x, i) => validate(s.items, x, `${at}[${i}]`, errs, c));
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const k of s.required || []) if (!(k in v)) errs.push(`${where}: missing required "${k}"`);
    const props = s.properties || {};
    for (const [k, x] of Object.entries(v)) {
      const p = at ? `${at}.${k}` : k;
      if (props[k]) validate(props[k], x, p, errs, c);
      else if (s.additionalProperties === false) errs.push(`${where}: unexpected key "${k}"`);
      else if (s.additionalProperties && typeof s.additionalProperties === 'object') validate(s.additionalProperties, x, p, errs, c);
    }
  }
  for (const sub of s.allOf || []) validate(sub, v, at, errs, c);
  if (s.anyOf) {
    const results = s.anyOf.map((/** @type {any} */ sub) => { /** @type {string[]} */ const e = []; validate(sub, v, at, e, { ...c, slotRefs: [] }); return e; });
    const okIdx = results.findIndex((/** @type {string[]} */ e) => !e.length);
    if (okIdx < 0) errs.push(`${where}: matches none of the allowed shapes (${results.map((/** @type {string[]} */ e) => e[0]).join(' | ')})`);
    else validate(s.anyOf[okIdx], v, at, [], c);
  }
}

const deprecated = warnings.filter((w) => / is deprecated /.test(w)).length;
const rest = [...new Set(warnings.filter((w) => !/ is deprecated /.test(w)))];
for (const w of rest.slice(0, 12)) console.warn(`  warn: ${w}`);
if (rest.length > 12) console.warn(`  warn: … and ${rest.length - 12} more`);
if (deprecated) console.warn(`  warn: ${deprecated} deprecated field(s) still present (allowed until the W3 template stops reading them)`);
if (failures.length) {
  /** @type {Record<string, number>} */ const by = {};
  for (const f of failures) by[f.rule] = (by[f.rule] || 0) + 1;
  console.error(`  check-content by rule: ${Object.entries(by).map(([r, n]) => `${r} ${n}`).join(', ')}`);
  if (argv.includes('--all')) for (const f of failures) console.error(`  - ${f}`);
}
const ok = report('check-content', /** @type {any} */ (failures));
// exitCode, not process.exit(): a long report written to a pipe is flushed before the process ends.
if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = ok ? 0 : 1;
export default ok;
