// @ts-check
/**
 * Shared helpers for the page modules in src/pages/. Every page module
 * exports `default (env, ctx) => Route[]`; routes.mjs concatenates them.
 */
import { site } from '../../site.config.mjs';

/** @typedef {import('../components/layout.mjs').Env} Env */
/**
 * A rendered URL. `sources` lists repo-relative files whose last git commit
 * date becomes the sitemap <lastmod> (blueprint C6). `noindex` keeps a route
 * out of the sitemap.
 * @typedef {{ path: string, file: string, render: () => any, sources?: string[], noindex?: boolean }} Route
 */

export const HOME = { name: 'Home', path: '/' };

/** Shorten to n characters on a word boundary. @param {string} s @param {number} n */
export const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s || '');

export { fmtDate } from '../lib/html.mjs';

/** @param {string} u */
export function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }

/**
 * Route builder: `/x/` → `x/index.html`, `/404.html` → `404.html`.
 * @param {string} path @param {() => any} render @param {{ sources?: string[], noindex?: boolean }} [o]
 * @returns {Route}
 */
export const route = (path, render, o = {}) => ({ path, file: path.endsWith('.html') ? path.slice(1) : `${path.slice(1)}index.html`, render, ...o });

/** @param {Env} env */
export function makeCtx(env) {
  const d = env.data;
  /** Page content with a safe fallback. @param {string} k */
  const pg = (k) => d.pages[k] || { seo: { title: site.name, description: '' }, h1: k, sections: [] };
  /** @param {any} page @param {string} id */
  const sec = (page, id) => (page.sections || []).find((/** @type {any} */ s) => s.id === id);
  /** @param {any} page @param {string[]} ids */
  const without = (page, ids) => (page.sections || []).filter((/** @type {any} */ s) => !ids.includes(s.id));
  /** @type {any[]} */
  const projects = Object.values(d.projects).sort((a, b) => site.services.indexOf(a.service) - site.services.indexOf(b.service) || a.slug.localeCompare(b.slug));
  /** @type {any[]} */
  const testimonials = Object.values(d.testimonials);
  /** @type {any[]} */
  const resources = Object.values(d.resources).sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.slug.localeCompare(b.slug));
  const svcName = (/** @type {string} */ s) => d.services[s]?.name || s;
  const svcLabel = (/** @type {string} */ s) => d.services[s]?.navLabel || svcName(s);
  const areaName = (/** @type {string} */ a) => d.areas[a]?.name || a;
  return { d, pg, sec, without, projects, testimonials, resources, svcName, svcLabel, areaName };
}
/** @typedef {ReturnType<typeof makeCtx>} Ctx */
