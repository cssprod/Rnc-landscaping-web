// @ts-check
/**
 * Head metadata and the JSON-LD graph for one page (blueprint C6, A13 #18/#19/#29; CONTRACT §2, §3). layout.mjs only
 * calls these two:
 *   headMeta(env, p)  <title>, description, canonical, robots, Open Graph (en_CA; website, article for guides) and Twitter
 *   jsonLd(env, p)    ONE <script type="application/ld+json"> holding {"@context","@graph"} (see graph())
 * Canonical and og:url are absolute (https://<DOMAIN>) only in launch builds. Showcase builds are noindex and use the
 * root-relative path, so no href is ever built on the unresolved [DOMAIN] token (CONTRACT §3).
 * OG image per page: the page's card in site/static/og/<key>.(png|jpg) when og-render (W5) has committed it
 * (tools/og-cards.mjs), else the default card, else the page's photo slot (online builds; never under /projects/, where
 * stock is not allowed), else the og-default slot, else the brand icon.
 * Strings are escaped exactly once, by the html`` template; JSON-LD is raw JSON with "<" written as <.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { html, raw } from './html.mjs';
import { hasPhoto, ogUrl } from './images.mjs';
import * as schema from './schema.mjs';
import { site, siteJson } from '../../site.config.mjs';

/**
 * @typedef {{ name: string, path: string }} Crumb
 * @typedef {{ launch: boolean, origin: string, data?: any }} SeoEnv
 * @typedef {{ path: string, title: string, description: string, crumbs?: Crumb[], jsonld?: object[], ogImage?: string, ogType?: string, noindex?: boolean }} SeoPage
 * @typedef {{ url: string, width?: number, height?: number, kind: 'card'|'photo'|'icon' }} OgImage
 */

/** site/static/og: committed OG cards (owned by seo; rendered by og-render in W5 with tools/og-cards.mjs). */
export const OG_DIR = fileURLToPath(new URL('../../static/og/', import.meta.url));
/** Card size (the Open Graph large-image ratio, 1.91:1). */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_EXTS = ['png', 'jpg'];
/** Hubs: pages that list other pages (CollectionPage; A13 #6 needs an H1 on each). */
export const HUBS = ['/', '/services/', '/areas/', '/projects/', '/resources/'];

/** Card key for a page path: "/" → "home", "/services/irrigation/" → "services-irrigation", "/404.html" → "404". @param {string} path */
export const ogKey = (path) => (path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/\.html$/, '').replace(/\//g, '-'));

/** @type {Map<string, string|null>} */
const cardCache = new Map();
/** Root-relative URL of the page's committed card, or null. @param {string} path @param {string} [dir] card folder (tests) */
export function ogCard(path, dir = OG_DIR) {
  const key = `${dir}\u0000${ogKey(path)}`;
  if (!cardCache.has(key)) cardCache.set(key, OG_EXTS.map((e) => `${ogKey(path)}.${e}`).find((f) => existsSync(join(dir, f))) ?? null);
  const f = cardCache.get(key);
  return f ? `/og/${f}` : null;
}

/** @param {SeoEnv} env @param {string} path */
export const canonicalUrl = (env, path) => (env.launch ? `${env.origin}${path}` : path);

/** Showcase builds are never indexed; a launch page is indexed unless it asks not to be. @param {SeoEnv} env @param {SeoPage} p */
export const isNoindex = (env, p) => !env.launch || !!p.noindex;

/** @param {SeoEnv} env @param {SeoPage} p @returns {OgImage} */
export function ogImage(env, p) {
  const card = ogCard(p.path) || ogCard('/default/');
  if (card) return { url: schema.abs(env, card), ...OG_SIZE, kind: 'card' };
  // Stock photos are never shown as RNC's work: no photo card under /projects/ (CONTRACT §2, §7).
  if (!p.path.startsWith('/projects/')) for (const id of [p.ogImage, 'og-default']) if (id && hasPhoto(id)) { const u = ogUrl(id); if (u) return { url: u, kind: 'photo' }; }
  return { url: schema.abs(env, '/assets/brand/icon-512.png'), width: 512, height: 512, kind: 'icon' };
}

/** @param {object[]|undefined} nodes @param {string} type */
const hasType = (nodes, type) => (nodes || []).some((n) => [].concat(/** @type {any} */ (n)['@type']).includes(type));

/** og:type: "article" for guides (pages that carry an Article node), else "website". @param {SeoPage} p */
export const ogType = (p) => p.ogType || (hasType(p.jsonld, 'Article') ? 'article' : 'website');

/** @param {SeoEnv} env @param {SeoPage} p */
export function headMeta(env, p) {
  const canonical = canonicalUrl(env, p.path);
  const og = ogImage(env, p);
  const type = ogType(p);
  const art = type === 'article' ? /** @type {any} */ ((p.jsonld || []).find((n) => /** @type {any} */ (n)['@type'] === 'Article')) : null;
  return html`<title>${p.title}</title>
<meta name="description" content="${p.description}">
<link rel="canonical" href="${canonical}">
${isNoindex(env, p) ? raw('<meta name="robots" content="noindex, nofollow">') : ''}
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="en_CA">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${og.url}">
${og.width ? html`<meta property="og:image:width" content="${og.width}">
<meta property="og:image:height" content="${og.height}">
` : ''}${art?.datePublished ? html`<meta property="article:published_time" content="${art.datePublished}">
` : ''}${art?.dateModified ? html`<meta property="article:modified_time" content="${art.dateModified}">
` : ''}<meta name="twitter:card" content="${og.kind === 'icon' ? 'summary' : 'summary_large_image'}">`;
}

/** schema.org page type for a path. @param {string} path */
export function pageType(path) {
  if (path === '/about/') return 'AboutPage';
  if (path === '/contact/') return 'ContactPage';
  if (path === '/faq/') return 'FAQPage';
  if (path !== '/' && HUBS.includes(path)) return 'CollectionPage';
  return 'WebPage';
}

/**
 * Replace nested copies of a top-level node by `{"@id"}` references (one node per @id in the graph).
 * @param {any} v @param {Set<string>} top @param {boolean} [isTop]
 */
function dedupe(v, top, isTop = false) {
  if (Array.isArray(v)) return v.map((x) => dedupe(x, top));
  if (!v || typeof v !== 'object') return v;
  if (!isTop && v['@id'] && top.has(v['@id']) && Object.keys(v).length > 1) return { '@id': v['@id'] };
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dedupe(x, top)]));
}

/**
 * The page's JSON-LD graph: business, website, the page's own WebPage (typed per pageType(); FAQ content folded in),
 * the BreadcrumbList on depth-2+ pages, and the nodes the page passed in `jsonld` (Service, Article, …).
 * @param {SeoEnv} env @param {SeoPage} p
 */
export function graph(env, p) {
  const crumbs = p.crumbs || [{ name: 'Home', path: '/' }];
  const own = (p.jsonld || []).map((n) => { const { '@context': _c, ...rest } = /** @type {any} */ (n); return rest; });
  const faq = own.filter((n) => n['@type'] === 'FAQPage');
  const others = own.filter((n) => n['@type'] !== 'FAQPage');
  const questions = faq.flatMap((n) => n.mainEntity || []);
  let type = /** @type {string|string[]} */ (pageType(p.path));
  if (questions.length && type !== 'FAQPage') type = [/** @type {string} */ (type), 'FAQPage'];
  const area = siteJson.municipalities.find((m) => p.path === `/areas/${m.slug}/`);
  const webpage = {
    '@type': type,
    '@id': schema.ids.webpage(env, p.path),
    url: schema.abs(env, p.path),
    name: p.title,
    description: p.description,
    inLanguage: 'en-CA',
    isPartOf: schema.ref(schema.ids.website(env)),
    about: p.path === '/' || p.path === '/about/' || p.path === '/contact/' ? schema.ref(schema.ids.business(env)) : area ? schema.ref(schema.ids.place(env, area.slug)) : undefined,
    breadcrumb: crumbs.length > 1 ? schema.ref(schema.ids.breadcrumb(env, p.path)) : undefined,
    mainEntity: questions.length ? questions : undefined,
  };
  const nodes = [schema.business(env), schema.website(env), webpage, ...(crumbs.length > 1 ? [schema.breadcrumbs(env, crumbs, p.path)] : []), ...others];
  const top = new Set(nodes.map((n) => n?.['@id']).filter(Boolean));
  return { '@context': schema.CONTEXT, '@graph': /** @type {any[]} */ (schema.scrub(nodes.map((n) => dedupe(n, top, true)))) };
}

/** JSON for a <script> data block: "<" is escaped so "</script>" can never close it early. @param {object} o */
export const ldJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

/** @param {SeoEnv} env @param {SeoPage} p */
export function jsonLd(env, p) {
  return html`<script type="application/ld+json">${raw(ldJson(graph(env, p)))}</script>`;
}
