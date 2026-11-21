// @ts-check
/**
 * <head> metadata and JSON-LD for every page (owned by the SEO work stream;
 * layout.mjs only calls headMeta() and jsonLd()). Blueprint C6 / A13 #18:
 * self-referencing canonicals, og:locale en_CA, og:type website (article for
 * guides), one OG image per page, one JSON-LD @graph, no Review/AggregateRating.
 *
 * OG images: tools/og-cards.mjs renders a 1200×630 JPEG title card per page into
 * site/static/og/<card>.jpg plus static/og/manifest.json (card → hash of its
 * inputs). A page uses its card when the file exists and the hash matches;
 * otherwise it falls back to the page photo (ogImage slot), then
 * /og/default.jpg, and the build prints one warning listing missing and stale
 * cards. Re-run `node tools/og-cards.mjs` after changing titles.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { html, raw } from './html.mjs';
import { site } from '../../site.config.mjs';
import { ogUrl } from './images.mjs';
import { TOKEN_RE } from './tokens.mjs';
import { tokens } from '../../site.config.mjs';
import * as schema from './schema.mjs';

/** @typedef {import('../components/layout.mjs').Env} Env */
/** @typedef {{ path: string, title: string, description: string, ogImage?: string, noindex?: boolean, jsonld?: object[] }} PageMeta */

/* ------------------------------------------------------------------ OG cards */

/** Bump when the card design in tools/og-cards.mjs changes (marks every card stale). */
export const OG_TEMPLATE_VERSION = 1;
export const OG_DIR = new URL('../../static/og/', import.meta.url);
export const OG_W = 1200;
export const OG_H = 630;

/** True when the text still holds a bracket token with no value. @param {string} s */
export const hasOpenToken = (s) => [...String(s).matchAll(TOKEN_RE)].some((m) => tokens[/** @type {keyof typeof tokens} */ (m[1])] == null);

/** Card file name for a path: / → home.jpg, /services/irrigation/ → services-irrigation.jpg. @param {string} path */
export const ogCardFile = (path) => `${path === '/' ? 'home' : path.replace(/\.html$/, '').replace(/^\/|\/$/g, '').replace(/\//g, '-')}.jpg`;

const EYEBROW = /** @type {Record<string,string>} */ ({
  services: 'Services', projects: 'Projects', areas: 'Service areas', resources: 'Seasonal guides', commercial: 'Commercial',
  process: 'How we work', about: 'About', reviews: 'Reviews', faq: 'Questions', contact: 'Contact', 'free-quote': 'Free quote',
});

/**
 * What a page's card shows. Shared with tools/og-cards.mjs so the hash matches.
 * @param {{ path: string, title: string }} p
 * @returns {{ file: string, path: string, title: string, eyebrow: string, hash: string }}
 */
export function ogCard(p) {
  const title = String(p.title).replace(/\s*[|–—-]\s*RNC(?: Landscaping)?\s*$/i, '').trim() || site.name;
  const seg = p.path.split('/').filter(Boolean)[0] || '';
  const eyebrow = EYEBROW[seg] || 'Landscape care and construction';
  const hash = createHash('sha256').update(JSON.stringify({ v: OG_TEMPLATE_VERSION, title, eyebrow })).digest('hex').slice(0, 12);
  return { file: ogCardFile(p.path), path: p.path, title, eyebrow, hash };
}

/** The default card (business image, fallback for every page). */
export const OG_DEFAULT = { ...ogCard({ path: '/og-default', title: 'Landscape care and construction across Greater Victoria' }), eyebrow: site.region, file: 'default.jpg' };

/** @type {Record<string,string>} */
let manifest = {};
try { manifest = JSON.parse(readFileSync(new URL('manifest.json', OG_DIR), 'utf8')).cards || {}; } catch { /* no cards yet */ }
const cardExists = (/** @type {string} */ f) => existsSync(new URL(f, OG_DIR));

/** Cards collected for tools/og-cards.mjs (OG_COLLECT=<file> node build.mjs …). */
/** @type {Map<string, ReturnType<typeof ogCard>>} */
const collected = new Map();
/** @type {{ missing: Set<string>, stale: Set<string> }} */
const ogIssues = { missing: new Set(), stale: new Set() };
let exitHooked = false;
function hookExit() {
  if (exitHooked) return;
  exitHooked = true;
  process.on('exit', () => {
    if (process.env.OG_COLLECT) { writeFileSync(process.env.OG_COLLECT, JSON.stringify([...collected.values()], null, 2)); return; }
    const [missing, stale] = [[...ogIssues.missing], [...ogIssues.stale]];
    const list = (/** @type {string[]} */ a) => `${a.length} (e.g. ${a.slice(0, 3).join(', ')})`;
    if (missing.length || stale.length) console.warn(`warn: OG cards ${[missing.length ? `missing ${list(missing)}` : '', stale.length ? `stale ${list(stale)}` : ''].filter(Boolean).join('; ')}: pages fall back to their photo. Run node tools/og-cards.mjs`);
  });
}

/**
 * OG image for a page: fresh card → page photo → default card → og-default photo.
 * @param {Env} env @param {PageMeta} p
 * @returns {{ url: string, card: boolean, alt: string } | null}
 */
export function ogImageFor(env, p) {
  hookExit();
  const card = ogCard(p);
  const tokenFree = !hasOpenToken(card.title);
  if (tokenFree && p.path !== '/404.html') collected.set(card.file, card);
  if (tokenFree && cardExists(card.file) && manifest[card.file] === card.hash) return { url: `${env.origin}/og/${card.file}`, card: true, alt: `${card.title}, ${site.name}` };
  if (tokenFree && p.path !== '/404.html') (cardExists(card.file) ? ogIssues.stale : ogIssues.missing).add(card.file);
  const photo = p.ogImage && ogUrl(p.ogImage);
  if (photo) return { url: photo, card: false, alt: '' };
  if (cardExists(OG_DEFAULT.file)) return { url: `${env.origin}/og/${OG_DEFAULT.file}`, card: true, alt: `${site.name}, ${site.region}` };
  const def = ogUrl('og-default');
  return def ? { url: def, card: false, alt: '' } : null;
}

/** Guides get og:type article. @param {string} path */
export const isArticle = (path) => /^\/resources\/[^/]+\/$/.test(path);

/** @param {PageMeta} p */
const articleNode = (p) => /** @type {any} */ ((p.jsonld || []).find((n) => /** @type {any} */ (n)['@type'] === 'Article'));

/* --------------------------------------------------------------- head tags */

/** @param {Env} env @param {PageMeta} p @param {{name:string,path:string}[]} crumbs */
export function headMeta(env, p, crumbs) {
  const canonical = env.launch ? `${env.origin}${p.path}` : p.path;
  const og = ogImageFor(env, p);
  const noindex = !env.launch || p.noindex;
  const art = isArticle(p.path) ? articleNode(p) : null;
  return html`<title>${p.title}</title>
<meta name="description" content="${p.description}">
<link rel="canonical" href="${canonical}">
${noindex ? raw('<meta name="robots" content="noindex, nofollow">') : ''}
<meta property="og:type" content="${art || isArticle(p.path) ? 'article' : 'website'}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="en_CA">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.description}">
<meta property="og:url" content="${canonical}">
${og ? html`<meta property="og:image" content="${og.url}">` : ''}
${og?.card ? html`<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="${OG_W}">
<meta property="og:image:height" content="${OG_H}">
<meta property="og:image:alt" content="${og.alt}">` : ''}
${art?.datePublished ? html`<meta property="article:published_time" content="${art.datePublished}">` : ''}
${art?.dateModified ? html`<meta property="article:modified_time" content="${art.dateModified}">` : ''}
<meta name="twitter:card" content="${og ? 'summary_large_image' : 'summary'}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#F4F6F2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0A0E0C" media="(prefers-color-scheme: dark)">`;
}

/* ----------------------------------------------------------------- JSON-LD */

/** Remove every string (and property) that still holds an unresolved bracket token. @param {any} v @returns {any} */
function scrub(v) {
  if (typeof v === 'string') return hasOpenToken(v) ? undefined : v;
  if (Array.isArray(v)) return v.map(scrub).filter((x) => x !== undefined);
  if (v && typeof v === 'object') {
    /** @type {Record<string, any>} */ const o = {};
    for (const [k, x] of Object.entries(v)) { const y = scrub(x); if (y !== undefined && !(Array.isArray(y) && !y.length && Array.isArray(x) && x.length)) o[k] = y; }
    return o;
  }
  return v;
}

const FRAG = /** @type {Record<string,string>} */ ({ FAQPage: 'faq', Service: 'service', Article: 'article', BreadcrumbList: 'breadcrumb' });

/**
 * One @graph per page: business, website, webpage, breadcrumb, plus the page's
 * own nodes (`p.jsonld`, built with schema.mjs). Returns one <script> element.
 * @param {Env} env @param {PageMeta} p @param {{name:string,path:string}[]} crumbs
 */
export function jsonLd(env, p, crumbs) {
  const extra = (p.jsonld || []).filter(Boolean).map((n) => {
    const { '@context': _ctx, ...node } = /** @type {any} */ (n);
    const type = String(node['@type'] || 'Thing');
    if (!node['@id']) node['@id'] = schema.nodeId(env, p.path, FRAG[type] || type.toLowerCase());
    if (type === 'FAQPage' && !node.isPartOf) node.isPartOf = { '@id': schema.nodeId(env, p.path, 'webpage') };
    return node;
  });
  const main = extra.find((n) => ['Service', 'Article'].includes(n['@type']));
  const art = extra.find((n) => n['@type'] === 'Article');
  const areaSlug = p.path.match(/^\/areas\/([^/]+)\/$/)?.[1];
  const about = p.path === '/' ? { '@id': schema.abs(env, '/#business') }
    : areaSlug && env.data.areas?.[areaSlug] ? { '@id': schema.placeId(env, areaSlug) }
      : main ? { '@id': main['@id'] } : undefined;
  const og = ogImageFor(env, p);
  const page = schema.webpage(env, p, { breadcrumb: crumbs.length > 1, image: og?.url || null, about, dates: art ? { published: art.datePublished, modified: art.dateModified } : undefined });
  if (main) page.mainEntity = { '@id': main['@id'] };
  const graph = [
    schema.business(env),
    schema.website(env),
    page,
    ...(crumbs.length > 1 ? [schema.breadcrumbs(env, crumbs, p.path)] : []),
    ...extra,
  ];
  const doc = scrub({ '@context': 'https://schema.org', '@graph': graph });
  return html`<script type="application/ld+json">${raw(JSON.stringify(doc).replace(/</g, '\\u003c'))}</script>`;
}
