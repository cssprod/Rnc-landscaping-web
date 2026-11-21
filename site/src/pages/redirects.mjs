// @ts-check
/**
 * 301 map for every retired URL (blueprint A13 #2 / #35, C6 "_redirects for any
 * retired URLs"). build.mjs writes these to dist/_redirects for Netlify.
 * Format: [from, to, status]. Netlify uses the first matching rule, so the
 * specific rules come first and the /portfolio/* and /quote/* splats last.
 *
 * LEGACY_PROJECTS is frozen: the /portfolio/{service}/{slug}/ URLs the
 * pre-redesign site (commit cb2b933) published. If a project slug is renamed,
 * map the old slug to its new one in RENAMED rather than deleting the line;
 * tools/check-seo.mjs fails when a legacy URL has no live target.
 */
import { site } from '../../site.config.mjs';

/** Old /portfolio/{service}/{slug}/ URLs (pre-redesign site). */
export const LEGACY_PROJECTS = [
  'grounds-maintenance/deep-cove-acreage-upkeep',
  'irrigation/esquimalt-church-garden-drip-conversion',
  'landscape-installation/fernwood-strata-courtyard-planting',
  'grounds-maintenance/gordon-head-weekly-garden-care',
  'tree-vegetation/highlands-acreage-tree-pruning',
  'grounds-maintenance/keating-business-park-grounds-maintenance',
  'irrigation/langford-retail-centre-irrigation-repair',
  'landscape-installation/langford-townhouse-landscape-package',
  'tree-vegetation/metchosin-trail-edge-invasive-removal',
  'landscape-installation/oak-bay-front-garden-renewal',
  'irrigation/rockland-spring-start-up-and-repair',
  'landscape-installation/royal-bay-backyard-patio',
  'tree-vegetation/sidney-condo-hedge-reduction',
  'grounds-maintenance/sidney-strata-seasonal-grounds-care',
  'tree-vegetation/sooke-acreage-brush-and-broom-clearing',
  'irrigation/view-royal-townhouse-irrigation-audit',
];

/** Old project slug → current slug, for projects renamed after launch. @type {Record<string, string>} */
export const RENAMED = {};

/** Old service slugs (the /portfolio/{service}/ hubs). */
export const LEGACY_SERVICES = ['grounds-maintenance', 'landscape-installation', 'irrigation', 'tree-vegetation'];

/** @param {{ data: any }} env @returns {[string, string, number][]} */
export function redirects(env) {
  /** @type {[string, string, number][]} */
  const R = [
    ['/portfolio/', '/projects/', 301],
    ['/quote/', '/free-quote/', 301],
    ['/quote/thanks/', '/free-quote/', 301],
  ];
  const seen = new Set(R.map(([f]) => f));
  /** @param {string} from @param {string} to */
  const add = (from, to) => { if (!seen.has(from)) { seen.add(from); R.push([from, to, 301]); } };
  for (const s of new Set([...LEGACY_SERVICES, ...site.services])) add(`/portfolio/${s}/`, site.services.includes(s) ? `/projects/?service=${s}` : '/projects/');
  const live = new Set(Object.values(env.data.projects || {}).map((/** @type {any} */ p) => p.slug));
  for (const old of LEGACY_PROJECTS) {
    const [svc, slug] = old.split('/');
    const now = RENAMED[slug] || slug;
    add(`/portfolio/${svc}/${slug}/`, live.has(now) ? `/projects/${now}/` : `/projects/?service=${svc}`);
  }
  // Current projects too (covers a project whose service changed since the old site).
  for (const p of /** @type {any[]} */ (Object.values(env.data.projects || {}))) add(`/portfolio/${p.service}/${p.slug}/`, `/projects/${p.slug}/`);
  // Safety nets for anything else under the retired sections.
  R.push(['/portfolio/*', '/projects/', 301], ['/quote/*', '/free-quote/', 301]);
  return R;
}
