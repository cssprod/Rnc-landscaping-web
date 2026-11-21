// @ts-check
/**
 * Shared presentational components for the Liquid Glass design.
 */
import { html, md, paras, raw } from '../lib/html.mjs';
import { picture, hasPhoto } from '../lib/images.mjs';
import { site } from '../../site.config.mjs';
import { has, telHref, telLink, mailLink } from '../lib/tokens.mjs';
import { icon, SERVICE_ICON, SEASON_ICON } from './sprite.mjs';

/** Visible "Sample" chip. The class name is what the launch build looks for. */
export const sampleLabel = () => html`<span class="sample-label">Sample</span>`;

/** @param {string} slug */
export const serviceIcon = (slug) => SERVICE_ICON[/** @type {keyof typeof SERVICE_ICON} */ (slug)] || 'leaf';

/** Primary call to action. @param {{ tone?: 'primary'|'light', size?: string }} [o] */
export const quoteBtn = (o = {}) => html`<a class="btn btn--${o.tone || 'primary'}${o.size ? ` btn--${o.size}` : ''}" href="/quote/">Get a free quote</a>`;

/**
 * Secondary action: call once the number is known, otherwise the portfolio.
 * @param {string} location @param {{ tone?: 'glass'|'secondary'|'on-deep', size?: string }} [o]
 */
export function secondaryBtn(location, o = {}) {
  const cls = `btn btn--${o.tone || 'secondary'}${o.size ? ` btn--${o.size}` : ''}`;
  if (has('PHONE')) return html`<a class="${cls}" href="${telHref()}" data-track="call_clicked" data-track-location="${location}">${icon('phone', { size: 18 })} Call [PHONE]</a>`;
  return html`<a class="${cls}" href="/portfolio/">See our work</a>`;
}

/** Arrow link ("See all …"). @param {string} href @param {any} label */
export const linkMore = (href, label) => html`<a class="link-more" href="${href}">${label}${icon('arrow', { size: 18 })}</a>`;

/**
 * Full-bleed photographic hero with the headline on a scrim and glass actions.
 * @param {{ h1: string, lede?: string, image: string, ctas?: boolean, variant?: 'home'|'page', dock?: any, extra?: any }} p
 */
export function hero(p) {
  return html`<section class="hero hero--${p.variant || 'page'}" aria-labelledby="page-title">
  <div class="hero__media">${picture(p.image, { eager: true, sizes: '100vw', credit: true })}</div>
  <div class="hero__scrim" aria-hidden="true"></div>
  <div class="hero__content wrap">
    <!--crumbs-->
    <h1 id="page-title" class="hero__title">${p.h1}</h1>
    ${p.lede ? html`<p class="hero__lede">${md(p.lede)}</p>` : ''}
    ${p.ctas !== false ? html`<div class="hero__ctas">${quoteBtn({ tone: 'light', size: 'lg' })}${secondaryBtn('hero', { tone: 'glass', size: 'lg' })}</div>` : ''}
    ${p.extra || ''}
  </div>
  ${p.dock || ''}
</section>`;
}

/** Page header without a photo: aurora wash, breadcrumbs, title, lede. @param {{ h1: string, lede?: string, extra?: any, className?: string }} p */
export const pageHead = (p) => html`<header class="page-head ${p.className || ''}">
  <div class="aurora" aria-hidden="true"></div>
  <div class="wrap page-head__inner">
    <!--crumbs-->
    <h1 id="page-title">${p.h1}</h1>
    ${p.lede ? html`<p class="page-head__lede">${md(p.lede)}</p>` : ''}
    ${p.extra || ''}
  </div>
</header>`;

/**
 * Section heading row. @param {{ id: string, title: any, lede?: any, link?: any, level?: number }} p
 */
export const sectionHead = (p) => html`<div class="section-head">
  <div class="section-head__text">${raw(`<h${p.level || 2} id="${p.id}">`)}${p.title}${raw(`</h${p.level || 2}>`)}${p.lede ? html`<p class="section-head__lede">${typeof p.lede === 'string' ? md(p.lede) : p.lede}</p>` : ''}</div>
  ${p.link || ''}
</div>`;

/**
 * Generic content sections from page JSON: sticky heading column + body, items as glass cards.
 * @param {any[]} list @param {{ level?: number, tone?: string }} [o]
 */
export function sections(list = [], o = {}) {
  const H = `h${o.level || 2}`;
  return list.map((s) => html`<section class="section prose-section ${o.tone || ''}"${s.id ? raw(` id="${s.id}"`) : ''}>
  <div class="wrap prose-section__grid">
    <div class="prose-section__head">${s.heading ? raw(`<${H}>`) : ''}${s.heading || ''}${s.heading ? raw(`</${H}>`) : ''}</div>
    <div class="prose-section__body">
      ${paras(s.body)}
      ${s.items?.length ? html`<ul class="item-cards">${s.items.map((/** @type {any} */ i) => html`<li class="glass-card item-card"><h3>${i.title}</h3>${i.body ? html`<p>${md(i.body)}</p>` : ''}</li>`)}</ul>` : ''}
    </div>
  </div>
</section>`);
}

/**
 * Bento of glass feature cards with icons, over an aurora wash.
 * @param {{ id: string, heading: string, lede?: string, items: {title:string, body?:string}[], icons?: string[], link?: any }} p
 */
export function featureBento(p) {
  return html`<section class="section bento-band" aria-labelledby="${p.id}">
  <div class="aurora aurora--soft" aria-hidden="true"></div>
  <div class="wrap">
    ${sectionHead({ id: p.id, title: p.heading, lede: p.lede, link: p.link })}
    <ul class="bento bento--${p.items.length}">${p.items.map((i, n) => html`<li class="glass-card bento__card" data-tilt>
      <span class="icon-tile">${icon(p.icons?.[n] || 'check', { size: 22 })}</span>
      <h3>${i.title}</h3>${i.body ? html`<p>${md(i.body)}</p>` : ''}
    </li>`)}</ul>
  </div>
</section>`;
}

/** @param {any} data @param {{ heading?: string, lede?: string, id?: string, link?: boolean }} [o] */
export function serviceTiles(data, o = {}) {
  const id = o.id || 'svc-h';
  return html`<section class="section services-band" aria-labelledby="${id}">
  <div class="wrap">
    ${sectionHead({ id, title: o.heading || 'What we look after', lede: o.lede, link: o.link === false ? '' : linkMore('/services/', 'All services') })}
    <ul class="tiles">${site.services.map((slug) => {
      const s = data.services[slug];
      if (!s) return '';
      const summary = (s.includes || []).slice(0, 3).map((/** @type {any} */ i) => i.title).join(' · ');
      return html`<li class="tile">
      <a href="/services/${slug}/" class="tile__link">
        ${picture(s.hero?.image || `svc-${slug}-hero`, { sizes: '(min-width: 1100px) 290px, (min-width: 640px) 50vw, 100vw', credit: false, chip: false, aspect: '4:5' })}
        <span class="tile__glass">
          <span class="tile__icon">${icon(serviceIcon(slug), { size: 20 })}</span>
          <span class="tile__title">${s.name}</span>
          <span class="tile__text">${summary}</span>
        </span>
        <span class="tile__go" aria-hidden="true">${icon('arrow-up-right', { size: 18 })}</span>
      </a></li>`;
    })}</ul>
  </div>
</section>`;
}

/** @param {any} data @param {any} p project @param {{ headingLevel?: number }} [o] */
export function projectCard(data, p, o = {}) {
  const img = p.images?.after || p.images?.gallery?.[0] || `proj-${p.service}-1`;
  const H = `h${o.headingLevel || 3}`;
  return html`<li class="card project-card" data-service="${p.service}" data-area="${p.area}">
  <a href="/portfolio/${p.service}/${p.slug}/" class="card__link">
    <div class="card__media">${picture(img, { sizes: '(min-width: 1100px) 380px, (min-width: 640px) 50vw, 100vw', sample: !p.sample && hasPhoto(img), credit: false, aspect: '4:3' })}${p.sample ? sampleLabel() : ''}</div>
    <div class="card__body">
      <span class="card__meta">${icon(serviceIcon(p.service), { size: 16 })}${data.services[p.service]?.navLabel || p.service} · ${data.areas[p.area]?.name || p.area}</span>
      ${raw(`<${H} class="card__title">`)}${p.title}${raw(`</${H}>`)}
      <p class="card__text">${p.summary}</p>
    </div>
  </a>
</li>`;
}

/** @param {any} data @param {any[]} projects @param {{ filters?: boolean, headingLevel?: number }} [o] */
export function projectGrid(data, projects, o = {}) {
  const usedAreas = site.areas.filter((a) => projects.some((p) => p.area === a));
  const filters = o.filters ? html`<form class="filters glass-bar" action="" method="get" data-filters aria-label="Filter projects">
    <fieldset class="segmented"><legend class="vh">Service</legend>
      <label class="segmented__opt"><input type="radio" name="service" value="" checked><span>All work</span></label>
      ${site.services.map((s) => html`<label class="segmented__opt"><input type="radio" name="service" value="${s}"><span>${data.services[s]?.navLabel || s}</span></label>`)}
    </fieldset>
    <div class="filters__area"><label for="f-area">Area</label><div class="select"><select id="f-area" name="area"><option value="">All areas</option>${usedAreas.map((a) => html`<option value="${a}">${data.areas[a]?.name || a}</option>`)}</select>${icon('chevron', { size: 16 })}</div></div>
    <button class="btn btn--secondary btn--sm" type="submit" data-filters-submit>Apply</button>
    <p class="filters__count" role="status" aria-live="polite" data-filters-count>${projects.length} projects shown</p>
  </form>` : '';
  return html`${filters}<ul class="card-grid" data-project-grid>${projects.map((p) => projectCard(data, p, o))}</ul>
  ${o.filters ? html`<p class="filters__empty" data-filters-empty hidden>No projects match those filters yet. <a href="/portfolio/">Show all projects</a>.</p>` : ''}`;
}

/** Keyboard-operable before/after comparison (only rendered when both photos exist). @param {string} before @param {string} after @param {string} label */
export function beforeAfter(before, after, label) {
  return html`<figure class="ba" data-ba>
  <div class="ba__stage">
    <div class="ba__img ba__img--before"><span class="ba__tag">Before</span>${picture(before, { sizes: '(min-width: 1200px) 1200px, 100vw', credit: false, sample: hasPhoto(before) })}</div>
    <div class="ba__img ba__img--after"><span class="ba__tag">After</span>${picture(after, { sizes: '(min-width: 1200px) 1200px, 100vw', credit: false, sample: hasPhoto(after) })}</div>
    <span class="ba__handle" aria-hidden="true"><span class="ba__knob">${icon('chevron-right', { size: 16, className: 'ba__l' })}${icon('chevron-right', { size: 16 })}</span></span>
  </div>
  <div class="ba__control"><label for="ba-${before}">Compare before and after</label><input id="ba-${before}" type="range" min="0" max="100" value="50" step="1" data-ba-range aria-valuetext="50% after image shown"></div>
  <figcaption>${label}</figcaption>
</figure>`;
}

/**
 * Testimonials as glass cards (a static grid, never a carousel).
 * @param {any} data @param {any[]} list @param {{ heading?: string, lede?: string, id?: string, link?: any }} [o]
 */
export function testimonials(data, list, o = {}) {
  if (!list.length) return '';
  const id = o.id || 'quotes-h';
  return html`<section class="section quotes-band" aria-labelledby="${id}">
  <div class="aurora aurora--quotes" aria-hidden="true"></div>
  <div class="wrap">
    ${sectionHead({ id, title: o.heading || 'What clients say', lede: o.lede, link: o.link })}
    <ul class="quotes">${list.map((t) => html`<li class="glass-card quote">
      ${icon('quote', { size: 28, className: 'quote__mark' })}
      <blockquote><p>${t.quote}</p></blockquote>
      <p class="quote__by"><span>${t.attribution}</span>${t.service ? html`<span class="quote__svc">${icon(serviceIcon(t.service), { size: 14 })}${data.services[t.service]?.navLabel || ''}</span>` : ''}</p>
      ${t.sample ? sampleLabel() : ''}
    </li>`)}</ul>
  </div>
</section>`;
}

/** Credentials band with the bracket tokens RNC must supply. */
export function trustBand() {
  const items = [
    ['shield', 'Liability insurance', '[LIABILITY LIMIT]'], ['shield', 'WorkSafeBC', '[WORKSAFEBC STATUS]'], ['doc', 'Business licences', '[LICENCES]'],
    ['badge', 'Certifications', '[CERTIFICATIONS]'], ['users', 'Memberships', '[MEMBERSHIPS]'], ['check', 'Workmanship warranty', '[WARRANTY]'],
  ];
  return html`<section class="section deep-band trust" aria-labelledby="trust-h">
  <div class="deep-band__glow" aria-hidden="true"></div>
  <div class="wrap">
    ${sectionHead({ id: 'trust-h', title: 'Credentials', lede: 'Insurance, safety and licensing details for owners, councils and facility teams.' })}
    <dl class="trust__grid">${items.map(([ic, k, v]) => html`<div class="glass-card glass-card--media trust__item"><dt>${icon(ic, { size: 18 })}${k}</dt><dd>${v}</dd></div>`)}</dl>
  </div>
</section>`;
}

/** @param {{ heading?: string, body?: string, secondary?: any, image?: string }} [p] */
export function ctaBand(p = {}) {
  return html`<section class="cta-band" aria-labelledby="cta-h">
  <div class="cta-band__bg" aria-hidden="true"></div>
  <div class="wrap">
    <div class="cta-band__panel glass-card glass-card--media">
      <h2 id="cta-h">${p.heading || 'Tell us about your property'}</h2>
      <p>${p.body || 'Free quotes, no obligation. Share a few details and photos and we will follow up to arrange a site visit.'}</p>
      <div class="cta-band__actions">${quoteBtn({ tone: 'light', size: 'lg' })}${p.secondary || secondaryBtn('cta_band', { tone: 'glass', size: 'lg' })}</div>
    </div>
  </div>
</section>`;
}

/** iOS-style inset grouped list of questions. @param {{q:string,a:string}[]} faqs @param {{ heading?: string, id?: string, lede?: string }} [o] */
export function faqList(faqs = [], o = {}) {
  if (!faqs.length) return '';
  const id = o.id || 'faq-h';
  return html`<section class="section faq" aria-labelledby="${id}">
  <div class="wrap faq__grid">
    <div class="faq__head"><h2 id="${id}">${o.heading || 'Questions we hear often'}</h2>${o.lede ? html`<p>${o.lede}</p>` : ''}</div>
    <div class="inset-list">${faqs.map((f) => html`<details class="inset-list__row faq__item"><summary>${f.q}${icon('chevron', { size: 18, className: 'faq__chev' })}</summary><div class="faq__a">${paras(f.a)}</div></details>`)}</div>
  </div>
</section>`;
}

/** Seasonal planner cards. @param {{ season: string, items: string[] }[]} list */
export const seasons = (list) => html`<div class="seasons">${list.map((x) => html`<div class="glass-card season season--${String(x.season).toLowerCase()}">
  <h3>${icon(SEASON_ICON[/** @type {keyof typeof SEASON_ICON} */ (x.season)] || 'leaf', { size: 20 })}${x.season}</h3>
  <ul>${x.items.map((i) => html`<li>${i}</li>`)}</ul>
</div>`)}</div>`;

/** Pill links. @param {[string, string][]} links */
export const chips = (links) => html`<ul class="chip-list">${links.map(([href, label]) => html`<li><a class="chip" href="${href}">${label}</a></li>`)}</ul>`;

/** Contact method cards. */
export function contactCards() {
  return html`<ul class="contact-cards">
    <li class="glass-card contact-card"><span class="icon-tile">${icon('phone', { size: 22 })}</span><h3>Call</h3><p>${telLink('contact_page', { className: 'contact-card__value' })}</p></li>
    <li class="glass-card contact-card"><span class="icon-tile">${icon('mail', { size: 22 })}</span><h3>Email</h3><p>${mailLink('contact_page', { className: 'contact-card__value' })}</p></li>
    <li class="glass-card contact-card"><span class="icon-tile">${icon('clock', { size: 22 })}</span><h3>Hours</h3><p><span class="contact-card__value">[HOURS]</span></p></li>
    <li class="glass-card contact-card"><span class="icon-tile">${icon('pin', { size: 22 })}</span><h3>Address</h3><p><span class="contact-card__value">[ADDRESS]</span></p></li>
  </ul>`;
}
