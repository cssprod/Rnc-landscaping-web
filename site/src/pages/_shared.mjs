// @ts-check
/**
 * Shared helpers for the route families (frozen in W3). Each family file exports
 * `routes(env)` returning CONTRACT §14 route objects; routes.mjs concatenates them.
 */
import { html, raw } from '../lib/html.mjs';
import { picture } from '../lib/images.mjs';
import { icon } from '../components/sprite.mjs';
import { site } from '../../site.config.mjs';

/** @typedef {import('../components/layout.mjs').Env} Env */
/**
 * CONTRACT §14 route shape. `sources` are repo-relative files whose git date is the sitemap lastmod;
 * `scripts` are the feature modules the page loads besides main and living.
 * @typedef {{ path: string, file: string, render: () => any, sources: string[], scripts: string[], sitemap?: boolean, noindex?: boolean, showcaseOnly?: boolean }} Route
 * @typedef {{ sources?: string[], scripts?: string[], sitemap?: boolean, noindex?: boolean, showcaseOnly?: boolean }} RouteOptions
 */

export const HOME = { name: 'Home', path: '/' };

/** Output file for a URL: "/a/" → "a/index.html", "/404.html" → "404.html", "/_redirects" → "_redirects". @param {string} path */
export const fileFor = (path) => (path.endsWith('/') ? `${path.slice(1)}index.html` : path.slice(1));

/**
 * One route. Flags are only set when given, so the build's defaults apply.
 * @param {string} path @param {RouteOptions} o @param {() => any} render @returns {Route}
 */
export function route(path, o, render) {
  /** @type {Route} */
  const r = { path, file: fileFor(path), render, sources: o.sources || [], scripts: o.scripts || [] };
  if (o.sitemap !== undefined) r.sitemap = o.sitemap;
  if (o.noindex) r.noindex = true;
  if (o.showcaseOnly) r.showcaseOnly = true;
  return r;
}

/** Template file of a family (lastmod source). @param {string} name e.g. "home" */
export const tpl = (name) => `site/src/pages/${name}.mjs`;
/** Content file path (lastmod source). @param {string} rel e.g. "pages/home.json" */
export const src = (rel) => `content/${rel}`;
/** Sources every page shares: site.json facts, the layout and the shared helpers. */
export const SHARED_SOURCES = ['content/site.json', 'site/src/components/layout.mjs', 'site/src/pages/_shared.mjs'];

/** @param {string} s @param {number} n */
export const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s || '');

/** Legacy page date format kept byte-identical until the W3 templates switch to lib/dates.mjs formatDate(). @param {string} iso */
export function fmtDate(iso) {
  const dt = new Date(`${iso}T12:00:00Z`);
  return isNaN(+dt) ? iso : dt.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** A guide's publish date: `published` (schema v3), else the deprecated `date` alias. @param {any} r @returns {string} */
export const pubDate = (r) => r.published || r.date;

/** @param {string} u */
export function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }

/**
 * Per-build view of the content, shared by every family.
 * @param {Env} env
 */
export function ctx(env) {
  const d = env.data;
  const fallback = (/** @type {string} */ k) => ({ seo: { title: site.name, description: '' }, h1: k, sections: [] });
  /** A content page, or a placeholder. @param {string} k */
  const pg = (k) => d.pages[k] || fallback(k);
  /** The first content page that exists (new name first, then the transition fallback). @param {...string} ks */
  const pgAny = (...ks) => ks.map((k) => d.pages[k]).find(Boolean) || fallback(ks[0]);
  const projects = Object.values(d.projects).sort((a, b) => site.services.indexOf(a.service) - site.services.indexOf(b.service) || a.slug.localeCompare(b.slug));
  const testimonials = Object.values(d.testimonials);
  const resources = Object.values(d.resources).sort((a, b) => String(pubDate(b)).localeCompare(String(pubDate(a))) || a.slug.localeCompare(b.slug));
  const svcName = (/** @type {string} */ s) => d.services[s]?.name || s;
  const svcLabel = (/** @type {string} */ s) => d.services[s]?.navLabel || svcName(s);
  const areaName = (/** @type {string} */ a) => d.areas[a]?.name || a;
  /** @param {any} page @param {string} id */
  const sec = (page, id) => (page.sections || []).find((/** @type {any} */ s) => s.id === id);
  /** @param {any} page @param {string[]} ids */
  const without = (page, ids) => (page.sections || []).filter((/** @type {any} */ s) => !ids.includes(s.id));
  /** @param {any[]} list @param {{ headingLevel?: number }} [o] */
  const resourceCards = (list, o = {}) => html`<ul class="card-grid">${list.map((r) => html`<li class="card res-card"><a class="card__link" href="/resources/${r.slug}/">
    <div class="card__media">${picture(r.image, { sizes: '(min-width: 1100px) 380px, (min-width: 640px) 50vw, 100vw', credit: false, aspect: '3:2' })}</div>
    <div class="card__body"><span class="card__meta">${icon('calendar', { size: 16 })}<time datetime="${pubDate(r)}">${fmtDate(pubDate(r))}</time></span>${raw(`<h${o.headingLevel || 3} class="card__title">`)}${r.title}${raw(`</h${o.headingLevel || 3}>`)}<p class="card__text">${r.summary}</p></div>
  </a></li>`)}</ul>`;
  return { d, pubDate, pg, pgAny, projects, testimonials, resources, svcName, svcLabel, areaName, sec, without, resourceCards };
}
