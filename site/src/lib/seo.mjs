// @ts-check
/**
 * <head> metadata and JSON-LD for every page (owned by the SEO work stream;
 * layout.mjs only calls these two functions). Blueprint C6: self-referencing
 * canonicals, og:locale en_CA, og:type website, one OG image per page,
 * one JSON-LD graph, no Review/AggregateRating.
 */
import { html, raw } from './html.mjs';
import { site } from '../../site.config.mjs';
import { ogUrl } from './images.mjs';
import * as schema from './schema.mjs';

/** @typedef {import('../components/layout.mjs').Env} Env */
/** @typedef {{ path: string, title: string, description: string, ogImage?: string, noindex?: boolean, jsonld?: object[] }} PageMeta */

/** @param {Env} env @param {PageMeta} p @param {{name:string,path:string}[]} crumbs */
export function headMeta(env, p, crumbs) {
  const canonical = env.launch ? `${env.origin}${p.path}` : p.path;
  const og = (p.ogImage && ogUrl(p.ogImage)) || ogUrl('og-default');
  const noindex = !env.launch || p.noindex;
  return html`<title>${p.title}</title>
<meta name="description" content="${p.description}">
<link rel="canonical" href="${canonical}">
${noindex ? raw('<meta name="robots" content="noindex, nofollow">') : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="en_CA">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.description}">
<meta property="og:url" content="${canonical}">
${og ? html`<meta property="og:image" content="${og}">` : ''}
<meta name="twitter:card" content="${og ? 'summary_large_image' : 'summary'}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#F4F6F2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0A0E0C" media="(prefers-color-scheme: dark)">`;
}

/** @param {Env} env @param {PageMeta} p @param {{name:string,path:string}[]} crumbs */
export function jsonLd(env, p, crumbs) {
  const ld = [schema.business(env), ...(crumbs.length > 1 ? [schema.breadcrumbs(env, crumbs)] : []), ...(p.jsonld || [])];
  return ld.map((o) => html`<script type="application/ld+json">${raw(JSON.stringify(o).replace(/</g, '\\u003c'))}</script>`);
}
