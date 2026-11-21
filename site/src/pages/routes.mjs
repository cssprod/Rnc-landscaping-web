// @ts-check
/**
 * Route table (CONTRACT §5, §14): the aggregator. Frozen after W1. It concatenates the route families in a
 * fixed order; a new page goes into its family file, never into this one. Every route is
 * { path, file, render, sources[], scripts[], sitemap?, noindex?, showcaseOnly? }.
 */
import * as home from './home.mjs';
import * as services from './services.mjs';
import * as areas from './areas.mjs';
import * as projects from './projects.mjs';
import * as company from './company.mjs';
import * as editorial from './editorial.mjs';
import * as quote from './quote.mjs';
import * as styleguide from './styleguide.mjs';
import * as redirects from './redirects.mjs';

/** @typedef {import('./_shared.mjs').Route} Route */
/** @typedef {import('../components/layout.mjs').Env} Env */

/** Family order (fixed): it is the order of the sitemap. */
export const FAMILIES = [home, services, areas, projects, company, editorial, quote, styleguide, redirects];

/** @param {Env} env @returns {Route[]} */
export function routes(env) {
  const all = FAMILIES.flatMap((f) => f.routes(env));
  // showcaseOnly routes (/styleguide/) are never built in launch builds (the build also enforces it).
  return env.launch ? all.filter((r) => !r.showcaseOnly) : all;
}
