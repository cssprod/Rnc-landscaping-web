// @ts-check
/**
 * Shared presentational components.
 * (Astro port: one .astro file per export under src/components/.)
 */
import { html, md, paras, raw } from '../lib/html.mjs';
import { picture, isStock } from '../lib/images.mjs';
import { site } from '../../site.config.mjs';
import { telHref } from '../lib/tokens.mjs';

export const sampleLabel = () => html`<span class="sample-label">Sample</span>`;

/**
 * Editorial hero: headline column + photograph bleeding to the edge.
 * @param {{ h1: string, lede?: string, image?: string, ctas?: boolean, kicker?: any, variant?: string }} p
 */
export function hero(p) {
  return html`<section class="hero ${p.variant ? `hero--${p.variant}` : ''}" aria-labelledby="page-title">
  <div class="hero__text">
    ${p.kicker || ''}
    <h1 id="page-title" class="hero__title">${p.h1}</h1>
    ${p.lede ? html`<p class="hero__lede">${md(p.lede)}</p>` : ''}
    ${p.ctas !== false ? html`<div class="hero__ctas"><a class="btn btn--accent btn--lg" href="/quote/">Get a Free Quote</a><a class="btn btn--ghost btn--lg" href="${telHref()}" data-track="call_clicked" data-track-location="hero">Call [PHONE]</a></div>` : ''}
  </div>
  ${p.image ? html`<div class="hero__media">${picture(p.image, { eager: true, sizes: '(min-width: 960px) 55vw, 100vw' })}</div>` : ''}
</section>`;
}

/** Simple page header (no photo). @param {{ h1: string, lede?: string, extra?: any }} p */
export const pageHead = (p) => html`<header class="page-head wrap"><h1 id="page-title">${p.h1}</h1>${p.lede ? html`<p class="page-head__lede">${md(p.lede)}</p>` : ''}${p.extra || ''}</header>`;

/**
 * Generic content sections from page JSON.
 * @param {any[]} sections @param {{ level?: number }} [o]
 */
export function sections(sections = [], o = {}) {
  const H = `h${o.level || 2}`;
  return sections.map((s) => html`<section class="prose-section wrap" ${s.id ? raw(`id="${s.id}"`) : ''}>
  <div class="prose-section__head">${s.heading ? raw(`<${H}>`) : ''}${s.heading || ''}${s.heading ? raw(`</${H}>`) : ''}</div>
  <div class="prose-section__body">
    ${paras(s.body)}
    ${s.items?.length ? html`<ul class="item-list">${s.items.map((/** @type {any} */ i) => html`<li><h3>${i.title}</h3>${i.body ? html`<p>${md(i.body)}</p>` : ''}</li>`)}</ul>` : ''}
  </div>
</section>`);
}

/** @param {any} data @param {{ heading?: string, lede?: string }} [o] */
export function serviceCards(data, o = {}) {
  return html`<section class="services-band wrap" aria-labelledby="svc-h">
  <div class="band-head"><h2 id="svc-h">${o.heading || 'What we look after'}</h2>${o.lede ? html`<p>${o.lede}</p>` : ''}</div>
  <ul class="service-cards">${site.services.map((slug) => {
    const s = data.services[slug];
    if (!s) return '';
    return html`<li class="service-card">
      <a href="/services/${slug}/" class="service-card__link">
        ${picture(s.hero?.image || `svc-${slug}-hero`, { sizes: '(min-width: 960px) 25vw, (min-width: 600px) 50vw, 100vw', credit: false })}
        <h3 class="service-card__title">${s.name}</h3>
        <p class="service-card__text">${s.hero?.lede || s.seo?.description || ''}</p>
        <span class="service-card__more">Explore ${s.navLabel || s.name}</span>
      </a></li>`;
  })}</ul>
</section>`;
}

/** @param {any} data @param {any} p project @param {{ headingLevel?: number }} [o] */
export function projectCard(data, p, o = {}) {
  const img = p.images?.after || p.images?.gallery?.[0] || `proj-${p.service}-1`;
  const H = `h${o.headingLevel || 3}`;
  return html`<li class="project-card" data-service="${p.service}" data-area="${p.area}">
  <a href="/portfolio/${p.service}/${p.slug}/" class="project-card__link">
    ${picture(img, { sizes: '(min-width: 960px) 33vw, (min-width: 600px) 50vw, 100vw', sample: isStock(img), credit: false })}
    <span class="project-card__meta">${data.services[p.service]?.navLabel || p.service} <span aria-hidden="true">/</span> ${data.areas[p.area]?.name || p.area}</span>
    ${raw(`<${H} class="project-card__title">`)}${p.title}${raw(`</${H}>`)}
    <p>${p.summary}</p>
    ${p.sample ? sampleLabel() : ''}
  </a>
</li>`;
}

/** @param {any} data @param {any[]} projects @param {{ filters?: boolean, headingLevel?: number }} [o] */
export function projectGrid(data, projects, o = {}) {
  const usedAreas = site.areas.filter((a) => projects.some((p) => p.area === a));
  const filters = o.filters ? html`<form class="filters" action="" method="get" data-filters aria-label="Filter projects">
    <div class="field field--inline"><label for="f-service">Service</label><select id="f-service" name="service"><option value="">All services</option>${site.services.map((s) => html`<option value="${s}">${data.services[s]?.navLabel || s}</option>`)}</select></div>
    <div class="field field--inline"><label for="f-area">Area</label><select id="f-area" name="area"><option value="">All areas</option>${usedAreas.map((a) => html`<option value="${a}">${data.areas[a]?.name || a}</option>`)}</select></div>
    <button class="btn btn--ghost" type="submit" data-filters-submit>Apply</button>
    <p class="filters__count" role="status" aria-live="polite" data-filters-count>${projects.length} projects</p>
  </form>` : '';
  return html`${filters}<ul class="project-grid" data-project-grid>${projects.map((p) => projectCard(data, p, o))}</ul>
  ${o.filters ? html`<p class="filters__empty" data-filters-empty hidden>No projects match those filters yet. <a href="/portfolio/">Show all projects</a>.</p>` : ''}`;
}

/** Keyboard-operable before/after comparison. @param {string} before @param {string} after @param {string} label */
export function beforeAfter(before, after, label) {
  return html`<figure class="ba" data-ba>
  <div class="ba__stage">
    <div class="ba__img ba__img--before"><span class="ba__tag">Before</span>${picture(before, { sizes: '(min-width: 960px) 60vw, 100vw', credit: false, sample: isStock(before) })}</div>
    <div class="ba__img ba__img--after"><span class="ba__tag">After</span>${picture(after, { sizes: '(min-width: 960px) 60vw, 100vw', credit: false, sample: isStock(after) })}</div>
    <span class="ba__handle" aria-hidden="true"></span>
  </div>
  <div class="ba__control"><label for="ba-${before}">Compare before and after</label><input id="ba-${before}" type="range" min="0" max="100" value="50" step="1" data-ba-range aria-valuetext="50% after image shown"></div>
  <figcaption>${label}</figcaption>
</figure>`;
}

/**
 * Testimonials render as a static grid rather than a carousel: auto-rotating
 * content is hard to read for screen-magnifier and cognitive-access users, and
 * a grid exposes every quote to keyboard and screen readers at once.
 * @param {any} data @param {any[]} list @param {{ heading?: string }} [o]
 */
export function testimonials(data, list, o = {}) {
  if (!list.length) return '';
  return html`<section class="quotes wrap" aria-labelledby="quotes-h">
  <div class="band-head"><h2 id="quotes-h">${o.heading || 'What clients say'}</h2></div>
  <ul class="quotes__grid">${list.map((t) => html`<li class="quote">
    <blockquote><p>${t.quote}</p></blockquote>
    <p class="quote__by">${t.attribution}${t.service ? html` <span class="quote__svc">${data.services[t.service]?.navLabel || ''}</span>` : ''}</p>
    ${t.sample ? sampleLabel() : ''}
  </li>`)}</ul>
</section>`;
}

/** Credentials / trust strip with the bracket tokens RNC must supply. */
export function trustStrip() {
  const items = [
    ['Liability insurance', '[LIABILITY LIMIT]'], ['WorkSafeBC', '[WORKSAFEBC STATUS]'], ['Licences', '[LICENCES]'],
    ['Certifications', '[CERTIFICATIONS]'], ['Memberships', '[MEMBERSHIPS]'], ['Workmanship warranty', '[WARRANTY]'],
  ];
  return html`<section class="trust" aria-labelledby="trust-h"><div class="wrap"><h2 id="trust-h" class="trust__h">Credentials</h2>
  <dl class="trust__list">${items.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl></div></section>`;
}

/** @param {{ heading?: string, body?: string, secondary?: any }} [p] */
export function ctaBand(p = {}) {
  return html`<section class="cta-band" aria-labelledby="cta-h"><div class="wrap cta-band__inner">
  <div><h2 id="cta-h">${p.heading || 'Tell us about your property'}</h2><p>${p.body || 'Free quotes, no obligation. Send a few details and photos and we will follow up to arrange a site visit.'}</p></div>
  <div class="cta-band__actions"><a class="btn btn--accent btn--lg" href="/quote/">Get a Free Quote</a>${p.secondary || html`<a class="btn btn--on-dark btn--lg" href="${telHref()}" data-track="call_clicked" data-track-location="cta_band">Call [PHONE]</a>`}</div>
</div></section>`;
}

/** @param {{q:string,a:string}[]} faqs @param {{ heading?: string, id?: string }} [o] */
export function faqList(faqs = [], o = {}) {
  if (!faqs.length) return '';
  return html`<section class="faq wrap" aria-labelledby="${o.id || 'faq-h'}"><div class="band-head"><h2 id="${o.id || 'faq-h'}">${o.heading || 'Questions we hear often'}</h2></div>
  <div class="faq__list">${faqs.map((f) => html`<details class="faq__item"><summary>${f.q}</summary><div class="faq__a">${paras(f.a)}</div></details>`)}</div></section>`;
}
