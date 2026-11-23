// @ts-check
/** Home page family (W3 owner: t-home). */
import { html, md } from '../lib/html.mjs';
import { picture } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui/index.mjs';
import { areaMap } from '../components/map.mjs';
import { icon } from '../components/sprite.mjs';
import { site } from '../../site.config.mjs';
import { ctx, route, tpl, src, SHARED_SOURCES } from './_shared.mjs';

/** The inline "Browse the portfolio" link in home.json is replaced by the section's own link; matches the old and the C1 URL. */
export const PORTFOLIO_LINK_RE = /\s*\[Browse the portfolio\]\((?:\/portfolio\/|\/projects\/)\)\.?/;
const AREAS_LINK_RE = /\s*\[See all service areas\]\(\/areas\/\)\.?/;

/** @param {import('./_shared.mjs').Env} env @returns {import('./_shared.mjs').Route[]} */
export function routes(env) {
  const { d, pg, sec, svcLabel, resources, resourceCards } = ctx(env);
  return [route('/', { sources: [tpl('home'), src('pages/home.json'), 'content/projects', 'content/testimonials', ...SHARED_SOURCES] }, () => {
    const p = pg('home');
    const what = sec(p, 'services');
    const how = sec(p, 'why');
    const who = sec(p, 'audiences');
    const cta = sec(p, 'cta');
    const featured = (p.featuredProjects || []).map((/** @type {string} */ s) => d.projects[s]).filter(Boolean);
    const quotes = (p.featuredTestimonials || []).map((/** @type {string} */ s) => d.testimonials[s]).filter(Boolean);
    const dock = html`<div class="hero__dock wrap"><nav class="dock glass-bar glass-bar--media" aria-label="Service shortcuts">${site.services.map((s) => html`<a class="dock__item" href="/services/${s}/">${icon(ui.serviceIcon(s), { size: 18 })}<span>${svcLabel(s)}</span></a>`)}<span class="dock__note">${icon('pin', { size: 16 })}13 municipalities, Sidney to Sooke</span></nav></div>`;
    return layout(env, {
      path: '/', title: p.seo.title, description: p.seo.description, bodyClass: 'is-home', ogImage: 'home-hero', hero: true,
      body: html`${ui.hero({ h1: p.h1, lede: p.lede, image: 'home-hero', variant: 'home', dock })}
      ${ui.serviceTiles(d, { heading: what?.heading || 'What we do', lede: what?.body?.[0] })}
      ${how ? ui.featureBento({ id: 'how-h', heading: how.heading, items: how.items, icons: ['compass', 'doc', 'chat'] }) : ''}
      <section class="section" aria-labelledby="feat-h"><div class="wrap">
        ${ui.sectionHead({ id: 'feat-h', title: 'Recent work', lede: sec(p, 'projects')?.body?.[0]?.replace(PORTFOLIO_LINK_RE, ''), link: ui.linkMore('/projects/', 'Full portfolio') })}
        <ul class="card-grid card-grid--4">${featured.map((/** @type {any} */ x) => ui.projectCard(d, x))}</ul>
      </div></section>
      ${areaMap(d, { lede: sec(p, 'areas')?.body?.[0]?.replace(AREAS_LINK_RE, '') || undefined })}
      ${ui.testimonials(d, quotes, { link: ui.linkMore('/reviews/', 'All reviews') })}
      ${who ? html`<section class="section" aria-labelledby="who-h"><div class="wrap">
        ${ui.sectionHead({ id: 'who-h', title: who.heading })}
        <div class="feature-split">
          <a class="feature-split__media" href="/commercial/">${picture('home-commercial', { sizes: '(min-width: 1100px) 700px, 100vw', credit: false })}
            <span class="feature-split__glass glass-card glass-card--media"><span class="feature-split__title">For strata, commercial and public sites</span><span>Scheduled grounds maintenance, documented site visits and clear scopes for councils, property managers and facility teams.</span><span class="link-more link-more--light">Commercial and public sector${icon('arrow', { size: 18 })}</span></span></a>
          <ul class="stack-cards">${who.items.map((/** @type {any} */ i, n) => html`<li class="glass-card item-card item-card--row"><span class="icon-tile">${icon(['leaf', 'users', 'doc'][n] || 'check', { size: 20 })}</span><div><h3>${i.title}</h3><p>${md(i.body)}</p></div></li>`)}</ul>
        </div>
      </div></section>` : ''}
      ${ui.trustBand()}
      <section class="section" aria-labelledby="res-h"><div class="wrap">${ui.sectionHead({ id: 'res-h', title: 'Seasonal guides', lede: 'Practical, local notes on lawns, gardens, irrigation and trees through the year.', link: ui.linkMore('/resources/', 'All guides') })}${resourceCards(resources.slice(0, 3))}</div></section>
      ${ui.ctaBand({ heading: cta?.heading, body: cta?.body?.[0] })}`,
    });
  })];
}
