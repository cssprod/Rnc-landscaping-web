// @ts-check
/**
 * Route table. Each page family lives in its own module so templates can be
 * worked on in parallel; this file only concatenates them in sitemap order.
 */
import { makeCtx } from './_shared.mjs';
import home from './home.mjs';
import services from './services.mjs';
import projects from './projects.mjs';
import areas from './areas.mjs';
import company from './company.mjs';
import resources from './resources.mjs';
import quote from './quote.mjs';
import legal from './legal.mjs';

/** @typedef {import('./_shared.mjs').Route} Route */

/** @param {import('./_shared.mjs').Env} env @returns {Route[]} */
export function routes(env) {
  const ctx = makeCtx(env);
  return [home, services, projects, areas, company, resources, quote, legal].flatMap((m) => m(env, ctx));
}
