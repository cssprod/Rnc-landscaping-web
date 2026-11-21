// @ts-check
/**
 * /styleguide/: the component showcase. Showcase builds only (showcaseOnly, noindex, never in the sitemap,
 * never built with SITE_MODE=launch). W1 stub; W2 ds-comp fills in the specimens.
 */
import { html } from '../lib/html.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui/index.mjs';
import { route, tpl, HOME, SHARED_SOURCES } from './_shared.mjs';

export const STYLEGUIDE_PATH = '/styleguide/';

/** @param {import('./_shared.mjs').Env} env @returns {import('./_shared.mjs').Route[]} */
export function routes(env) {
  return [route(STYLEGUIDE_PATH, { sources: [tpl('styleguide'), 'site/COMPONENTS.md', ...SHARED_SOURCES], sitemap: false, noindex: true, showcaseOnly: true }, () => layout(env, {
    path: STYLEGUIDE_PATH, title: 'Component showcase | RNC Landscaping', description: 'The RNC Landscaping component showcase: every interface primitive in one place, for design review only.', noindex: true,
    crumbs: [HOME, { name: 'Styleguide', path: STYLEGUIDE_PATH }],
    body: html`${ui.pageHead({ h1: 'Component showcase', lede: 'Specimens of every primitive in site/COMPONENTS.md arrive here in W2.' })}`,
  }))];
}
