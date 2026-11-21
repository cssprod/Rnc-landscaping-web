// @ts-check
/**
 * 301 map for every retired URL (blueprint A13 #2, C6 "_redirects for any
 * retired URLs"). build.mjs writes these to dist/_redirects for Netlify and
 * tools/serve.mjs honours them locally. Format: [from, to, status].
 */
import { site } from '../../site.config.mjs';

/** @param {{ data: any }} env @returns {[string, string, number][]} */
export function redirects(env) {
  /** @type {[string, string, number][]} */
  const R = [
    ['/portfolio/', '/projects/', 301],
    ['/quote/', '/free-quote/', 301],
    ['/quote/thanks/', '/free-quote/', 301],
  ];
  for (const s of site.services) R.push([`/portfolio/${s}/`, `/projects/?service=${s}`, 301]);
  for (const p of Object.values(env.data.projects)) R.push([`/portfolio/${/** @type {any} */ (p).service}/${/** @type {any} */ (p).slug}/`, `/projects/${/** @type {any} */ (p).slug}/`, 301]);
  return R;
}
