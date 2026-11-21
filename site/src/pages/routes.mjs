// @ts-check
/**
 * Route table (CONTRACT §5, §14): the aggregator. Frozen after W1. It concatenates the route families in a
 * fixed order; a new page goes into its family file, never into this one. Every route is
 * { path, file, render, sources[], scripts[], sitemap?, noindex?, showcaseOnly? }.
 */
import { html } from '../lib/html.mjs';
import { layout } from '../components/layout.mjs';
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

/**
 * `R`, `env`, `layout` and `html` stay in scope before the final `return R;`: w1/build's route-shape test
 * (tests/unit/build-dist.test.mjs) appends fixture routes there on a scratch copy.
 * @param {Env} env @returns {Route[]}
 */
export function routes(env) {
  void html; void layout;
  // showcaseOnly routes (/styleguide/) are never built in launch builds (the build also enforces it).
  /** @type {Route[]} */
  const R = FAMILIES.flatMap((f) => f.routes(env)).filter((r) => !(env.launch && r.showcaseOnly));
  return R;
}
