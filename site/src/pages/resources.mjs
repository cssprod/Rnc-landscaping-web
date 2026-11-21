// @ts-check
/** Seasonal guides hub and articles (named author, real dates: blueprint A13 #20). */
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
export default function resourcesPages(env, ctx) {
  const { d, pg, sec, without, projects, testimonials, resources, svcName, svcLabel, areaName } = ctx;
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];
  /** @param {string} path @param {() => any} render @param {{ sources?: string[], noindex?: boolean }} [o] */
  const add = (path, render, o) => R.push(route(path, render, o));
  /* ---------- Resources ---------- */
  add('/resources/', () => {
    const p = pg('resources');
    return layout(env, {
      path: '/resources/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Resources', path: '/resources/' }],
      body: html`${ui.pageHead(p)}<section class="section section--flush" aria-labelledby="rl-h"><div class="wrap"><h2 id="rl-h" class="vh">Articles</h2>${ui.resourceCards(resources)}</div></section>${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  });
  for (const r of resources) {
    const path = `/resources/${r.slug}/`;
    const img = getSlot(r.image)?.stock?.imageUrl || null;
    add(path, () => layout(env, {
      path, title: r.seo?.title || clip(`${r.title} | ${site.name}`, 60), description: r.seo?.description || r.summary, ogImage: r.image,
      crumbs: [HOME, { name: 'Resources', path: '/resources/' }, { name: r.title, path }],
      jsonld: [schema.article(env, r, path, img)],
      body: html`<article class="article">
        ${ui.pageHead({ h1: r.title, lede: r.summary, className: 'article__head', extra: html`<p class="article__date">${icon('calendar', { size: 16 })}Published <time datetime="${r.date}">${fmtDate(r.date)}</time></p>` })}
        <div class="wrap article__media">${picture(r.image, { eager: true, sizes: '(min-width: 1200px) 1200px, 100vw', aspect: '21:9' })}</div>
        <div class="article__body prose">${(r.body || []).map((/** @type {any} */ b) => b.h2 ? html`<h2>${b.h2}</h2>` : b.list ? html`<ul>${b.list.map((/** @type {string} */ i) => html`<li>${md(i)}</li>`)}</ul>` : b.p ? html`<p>${md(b.p)}</p>` : '')}
        ${r.sources?.length ? html`<h2>Sources</h2><ul class="sources">${r.sources.map((/** @type {any} */ s) => html`<li><a href="${s.url}" rel="noopener">${s.label}</a></li>`)}</ul>` : ''}</div>
      </article>${ui.ctaBand()}`,
    }));
  }

  return R;
}
