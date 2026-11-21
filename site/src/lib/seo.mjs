// @ts-check
/**
 * Head metadata and JSON-LD for one page (moved out of layout.mjs in W1; layout only calls these).
 *   headMeta(env, p)  <title>, description, canonical, robots, Open Graph and Twitter tags
 *   jsonLd(env, p)    the business node, breadcrumbs (depth ≥ 2) and the page's own nodes
 * Canonical URLs are absolute only in launch builds; showcase builds use the path, so no
 * href is ever built on the unresolved [DOMAIN] token (CONTRACT §3).
 */
import { html, raw } from './html.mjs';
import { ogUrl } from './images.mjs';
import * as schema from './schema.mjs';
import { site } from '../../site.config.mjs';

/**
 * @typedef {{ name: string, path: string }} Crumb
 * @typedef {{ launch: boolean, origin: string, data: any }} SeoEnv
 * @typedef {{ path: string, title: string, description: string, crumbs?: Crumb[], jsonld?: object[], ogImage?: string, ogType?: string, noindex?: boolean }} SeoPage
 */

/** @param {SeoEnv} env @param {string} path */
export const canonicalUrl = (env, path) => (env.launch ? `${env.origin}${path}` : path);

/** Showcase builds are never indexed; a launch page is indexed unless it asks not to be. @param {SeoEnv} env @param {SeoPage} p */
export const isNoindex = (env, p) => !env.launch || !!p.noindex;

/** @param {SeoEnv} env @param {SeoPage} p */
export function headMeta(env, p) {
  const canonical = canonicalUrl(env, p.path);
  const og = (p.ogImage && ogUrl(p.ogImage)) || ogUrl('og-default');
  return html`<title>${p.title}</title>
<meta name="description" content="${p.description}">
<link rel="canonical" href="${canonical}">
${isNoindex(env, p) ? raw('<meta name="robots" content="noindex, nofollow">') : ''}
<meta property="og:type" content="${p.ogType || 'website'}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="en_CA">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.description}">
<meta property="og:url" content="${canonical}">
${og ? html`<meta property="og:image" content="${og}">` : ''}
<meta name="twitter:card" content="${og ? 'summary_large_image' : 'summary'}">`;
}

/** @param {SeoEnv} env @param {SeoPage} p */
export function jsonLd(env, p) {
  const crumbs = p.crumbs || [{ name: 'Home', path: '/' }];
  const ld = [schema.business(env), ...(crumbs.length > 1 ? [schema.breadcrumbs(env, crumbs)] : []), ...(p.jsonld || [])];
  return ld.map((o) => html`<script type="application/ld+json">${raw(JSON.stringify(o).replace(/</g, '\\u003c'))}</script>`);
}
