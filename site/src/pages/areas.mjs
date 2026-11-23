// @ts-check
/** Service-area family: the hub and one page per municipality in content/site.json (W3 owner: t-areas). */
import { html, md, paras } from '../lib/html.mjs';
import { picture } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui/index.mjs';
import { areaMap } from '../components/map.mjs';
import { icon } from '../components/sprite.mjs';
import { site } from '../../site.config.mjs';
import { ctx, route, tpl, src, clip, hostOf, HOME, SHARED_SOURCES } from './_shared.mjs';

/** @param {import('./_shared.mjs').Env} env @returns {import('./_shared.mjs').Route[]} */
export function routes(env) {
  const { d, pg, projects, svcName, areaName } = ctx(env);
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];
  const T = tpl('areas');

  R.push(route('/areas/', { sources: [T, src('pages/areas.json'), 'content/areas', ...SHARED_SOURCES] }, () => {
    const p = pg('areas');
    return layout(env, {
      path: '/areas/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Areas', path: '/areas/' }],
      body: html`${ui.pageHead(p)}${areaMap(d, { heading: 'Thirteen municipalities' })}
      <section class="section" aria-labelledby="ac-h"><div class="wrap">${ui.sectionHead({ id: 'ac-h', title: 'Area guides' })}<ul class="card-grid area-cards">${site.areas.map((a) => d.areas[a] ? html`<li class="card area-card"><a class="card__link" href="/areas/${a}/">
        <div class="card__media">${picture(d.areas[a].image || `area-${a}`, { sizes: '(min-width: 1100px) 380px, (min-width: 640px) 50vw, 100vw', credit: false, aspect: '16:9' })}</div>
        <div class="card__body"><h3 class="card__title">${areaName(a)}</h3><p class="card__text">${clip(d.areas[a].intro?.[0] || '', 130)}</p></div></a></li>` : '')}</ul></div></section>
      ${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  }));

  for (const slug of site.areas) {
    const a = d.areas[slug];
    if (!a) continue;
    const path = `/areas/${slug}/`;
    const fp = a.featuredProject ? d.projects[a.featuredProject] : projects.find((p) => p.area === slug);
    const more = projects.filter((p) => p.area === slug && p !== fp);
    R.push(route(path, { sources: [T, src(`areas/${slug}.json`), 'content/regional.json', 'content/projects', ...SHARED_SOURCES] }, () => layout(env, {
      path, title: a.seo.title, description: a.seo.description, ogImage: a.image, hero: true,
      crumbs: [HOME, { name: 'Areas', path: '/areas/' }, { name: a.name, path }],
      body: html`${ui.hero({ h1: a.h1, lede: a.intro?.[0], image: a.image || `area-${slug}` })}
      <section class="section" aria-label="About ${a.name}"><div class="wrap area-intro"><div class="area-intro__body prose">${paras((a.intro || []).slice(1))}</div>
        <dl class="area-facts glass-card">${a.neighbourhoods?.length ? html`<div><dt>${icon('pin', { size: 16 })}Neighbourhoods</dt><dd><ul class="chip-list">${a.neighbourhoods.map((/** @type {string} */ n) => html`<li><span class="chip chip--static">${n}</span></li>`)}</ul></dd></div>` : ''}${a.propertyTypes?.length ? html`<div><dt>${icon('leaf', { size: 16 })}Typical properties</dt><dd><ul class="check-list">${a.propertyTypes.map((/** @type {string} */ t) => html`<li>${icon('check', { size: 16 })}${t.charAt(0).toUpperCase() + t.slice(1)}</li>`)}</ul></dd></div>` : ''}</dl></div></section>
      <section class="section section--elevated" aria-labelledby="as-h"><div class="wrap">${ui.sectionHead({ id: 'as-h', title: `Services in ${a.name}` })}<ul class="service-list">${site.services.map((s) => html`<li class="glass-card service-item"><span class="icon-tile">${icon(ui.serviceIcon(s), { size: 22 })}</span><h3><a href="/services/${s}/">${svcName(s)}</a></h3><p>${md(a.servicesBlurb?.[s] || d.services[s]?.hero?.lede || '')}</p></li>`)}</ul></div></section>
      ${a.localNotes?.length ? html`<section class="section" aria-labelledby="ln-h"><div class="wrap">${ui.sectionHead({ id: 'ln-h', title: 'Local notes', lede: 'Rules change, so each note links to the official source.' })}<ul class="notes">${a.localNotes.map((/** @type {any} */ n) => html`<li class="glass-card note-card"><p>${md(n.text)}</p>${n.sourceUrl ? html`<a class="source-chip" href="${n.sourceUrl}" rel="noopener">${icon('arrow-up-right', { size: 14 })}Source: ${hostOf(n.sourceUrl)}</a>` : ''}</li>`)}</ul></div></section>` : ''}
      ${fp ? html`<section class="section" aria-labelledby="fp-h"><div class="wrap">${ui.sectionHead({ id: 'fp-h', title: `Work in ${a.name}` })}<ul class="card-grid">${[fp, ...more].slice(0, 3).map((x) => ui.projectCard(d, x))}</ul></div></section>` : ''}
      ${areaMap(d, { current: slug, heading: 'Nearby areas', id: 'near-h' })}
      ${ui.ctaBand({ heading: `Free quotes in ${a.name}` })}`,
    })));
  }
  return R;
}
