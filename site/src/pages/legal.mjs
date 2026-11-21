// @ts-check
/** Privacy, terms, accessibility statement and the helpful 404. */
import { html, md, paras, raw, fmtDate } from '../lib/html.mjs';
import { picture, hasPhoto, getSlot } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui.mjs';
import { areaMap } from '../components/map.mjs';
import { quoteForm } from '../components/forms.mjs';
import { icon } from '../components/sprite.mjs';
import * as schema from '../lib/schema.mjs';
import { site } from '../../site.config.mjs';
import { telLink, mailLink } from '../lib/tokens.mjs';
import { route, HOME, clip, hostOf } from './_shared.mjs';

/** @param {import('./_shared.mjs').Env} env @param {import('./_shared.mjs').Ctx} ctx */
export default function legalPages(env, ctx) {
  const { d, pg, sec, without, projects, testimonials, resources, svcName, svcLabel, areaName } = ctx;
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];
  /** @param {string} path @param {() => any} render @param {{ sources?: string[], noindex?: boolean }} [o] */
  const add = (path, render, o) => R.push(route(path, render, o));
  for (const k of ['privacy', 'terms', 'accessibility']) {
    add(`/${k}/`, () => {
      const p = pg(k);
      return layout(env, {
        path: `/${k}/`, title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: p.h1, path: `/${k}/` }],
        body: html`${ui.pageHead({ ...p, extra: p.updated ? html`<p class="article__date">${icon('calendar', { size: 16 })}Updated <time datetime="${p.updated}">${fmtDate(p.updated)}</time></p>` : '' })}<div class="legal">${ui.sections(p.sections, { tone: 'prose-section--legal' })}</div>`,
      });
    });
  }
  add('/404.html', () => {
    const p = pg('404');
    const tryIt = sec(p, 'try');
    const links = [['/services/', 'Services', 'leaf'], ['/areas/', 'Areas', 'map'], ['/resources/', 'Guides', 'calendar'], ['/free-quote/', 'Free quote', 'mail']];
    return layout(env, {
      path: '/404.html', title: p.seo.title, description: p.seo.description, noindex: true,
      body: html`${ui.pageHead({ ...p, className: 'page-head--center', extra: html`<div class="page-head__ctas"><a class="btn btn--primary btn--lg" href="/">Go to the home page</a></div>` })}
      <section class="section section--flush" aria-labelledby="try-h"><div class="wrap"><h2 id="try-h" class="vh">${tryIt?.heading || 'Try one of these'}</h2><ul class="service-list service-list--compact">${links.map(([href, label, ic], n) => html`<li class="glass-card service-item"><span class="icon-tile">${icon(ic, { size: 22 })}</span><h3><a href="${href}">${tryIt?.items?.[n]?.title || label}</a></h3>${tryIt?.items?.[n]?.body ? html`<p>${md(tryIt.items[n].body)}</p>` : ''}</li>`)}</ul></div></section>`,
    });
  });
  return R;
}
