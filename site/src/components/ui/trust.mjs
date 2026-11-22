// @ts-check
/**
 * Trust: testimonials, the credentials band, review cards, the reviews band and the credentials row.
 * API frozen in site/COMPONENTS.md (signatures only grow). Paired CSS: 44-ui-trust.css.
 * Honesty (CONTRACT §2): reviews are shown for people and linked to Google; no Review or AggregateRating markup, no
 * stars, ratings or counts. Samples carry the "Sample review" chip. Credentials show token values only.
 */
import { html, raw } from '../../lib/html.mjs';
import { has, tok } from '../../lib/tokens.mjs';
import { siteJson } from '../../../site.config.mjs';
import { icon } from '../sprite.mjs';
import { sampleLabel, serviceIcon } from './actions.mjs';
import { sectionHead } from './heads.mjs';

/** True in a launch build (SITE_MODE=launch). */
const isLaunch = () => process.env.SITE_MODE === 'launch';
/** Clamp a heading level to h2–h6. @param {number|undefined} n @param {number} d */
const hLevel = (n, d) => Math.min(6, Math.max(2, Math.round(Number(n) || d)));
/** @param {string} slug */
const serviceLabel = (slug) => siteJson.services.find((s) => s.slug === slug)?.navLabel || '';

/**
 * Testimonials as lit-solid cards (a static grid, never a carousel).
 * @param {any} data @param {any[]} list @param {{ heading?: string, lede?: string, id?: string, link?: any }} [o]
 */
export function testimonials(data, list, o = {}) {
  if (!list.length) return '';
  const id = o.id || 'quotes-h';
  return html`<section class="section quotes-band" aria-labelledby="${id}">
  <div class="wrap">
    ${sectionHead({ id, title: o.heading || 'What clients say', lede: o.lede, link: o.link })}
    <div class="quotes-wrap l-cq"><ul class="quotes">${list.map((t) => html`<li class="quote">
      ${icon('quote', { size: 28, className: 'quote__mark' })}
      <blockquote><p>${t.quote}</p></blockquote>
      <p class="quote__by"><span>${t.attribution}</span>${t.service ? html`<span class="quote__svc">${icon(serviceIcon(t.service), { size: 14 })}${data.services[t.service]?.navLabel || ''}</span>` : ''}</p>
      ${t.sample ? sampleLabel('review') : ''}
    </li>`)}</ul></div>
  </div>
</section>`;
}

/** Icon per site.json credential id. @type {Record<string, string>} */
const CREDENTIAL_ICON = { insurance: 'shield', worksafebc: 'shield', licences: 'doc', certifications: 'badge', memberships: 'users' };

/** Credentials band with the bracket tokens RNC must supply. */
export function trustBand() {
  // Labels and values come from content/site.json (credentials + warranty): the single source of business facts.
  const items = [
    ...siteJson.credentials.map((c) => [CREDENTIAL_ICON[c.id] || 'badge', c.label, c.value]),
    ['check', 'Workmanship warranty', siteJson.warranty],
  ];
  return html`<section class="section deep-band trust on-deep" aria-labelledby="trust-h">
  <div class="deep-band__glow" aria-hidden="true"></div>
  <div class="wrap">
    ${sectionHead({ id: 'trust-h', title: 'Credentials', lede: 'Insurance, safety and licensing details for owners, councils and facility teams.' })}
    <div class="trust-wrap l-cq"><dl class="trust__grid">${items.map(([ic, k, v]) => html`<div class="trust__item"><dt>${icon(ic, { size: 18 })}${k}</dt><dd>${v}</dd></div>`)}</dl></div>
  </div>
</section>`;
}

/**
 * One review: the quotation in Newsreader italic, the attribution (role + municipality, never a named person for a
 * sample), the service, and the "Sample review" chip when `sample`. A heading is emitted only when the caller chooses a
 * level (visually hidden, naming the attribution).
 * @param {any} t testimonial (CONTRACT §6) @param {{ headingLevel?: number }} [o]
 */
export function reviewCard(t, o = {}) {
  const svc = t.service ? serviceLabel(t.service) : '';
  return html`<figure class="review">
  ${o.headingLevel ? html`${raw(`<h${hLevel(o.headingLevel, 3)} class="vh">`)}Review from ${t.attribution}${raw(`</h${hLevel(o.headingLevel, 3)}>`)}` : ''}
  ${icon('quote', { size: 26, className: 'review__mark' })}
  <blockquote class="review__quote t-quote"><p>${t.quote}</p></blockquote>
  <figcaption class="review__by"><span class="review__who">${t.attribution}</span>${svc ? html`<span class="review__svc">${icon(serviceIcon(t.service), { size: 14 })}${svc}</span>` : ''}${t.sample ? sampleLabel('review') : ''}</figcaption>
</figure>`;
}

/**
 * "Read all reviews on Google": a link once [GOOGLE PROFILE] is set; text + chip without an href in showcase builds;
 * omitted in launch builds (optional token, CONTRACT §3).
 */
function googleReviewsLink() {
  if (has('GOOGLE PROFILE')) return html`<a class="link-more reviews-band__google" href="${tok('GOOGLE PROFILE')}" rel="noopener">Read all reviews on Google${icon('arrow-up-right', { size: 18 })}</a>`;
  if (isLaunch()) return '';
  return html`<p class="reviews-band__google reviews-band__google--pending">Read all reviews on Google ${siteJson.googleProfile}</p>`;
}

/**
 * Reviews band: up to three review cards and the Google link. Never emits Review schema.
 * @param {any} data @param {any[]} list testimonials @param {{ id: string, heading?: any, lede?: any, index?: string, eyebrow?: string }} o
 */
export function reviewsBand(data, list = [], o = /** @type {any} */ ({})) {
  void data;
  if (!list.length) return '';
  const id = o.id || 'reviews-h';
  return html`<section class="section reviews-band" aria-labelledby="${id}" data-reviews-band>
  <div class="wrap">
    ${sectionHead({ id, title: o.heading || 'What clients say', lede: o.lede, index: o.index, eyebrow: o.eyebrow })}
    <div class="reviews-wrap l-cq"><ul class="reviews">${list.slice(0, 3).map((t) => html`<li class="reviews__item">${reviewCard(t)}</li>`)}</ul></div>
    <div class="reviews-band__foot">${googleReviewsLink()}</div>
  </div>
</section>`;
}

/**
 * Credentials row: insurance, WorkSafeBC, licences, certifications and memberships from site.json (token values only;
 * the issuer link appears only when `issuerUrl` is set). Verifiable items only, never badges or logos.
 * @param {{ id?: string, items?: { id: string, label: string, value: string, issuerUrl: string|null }[], label?: string }} [o]
 */
export function credentialsRow(o = {}) {
  const items = o.items || siteJson.credentials;
  if (!items.length) return '';
  return html`<section class="credentials"${o.id ? raw(` id="${o.id}"`) : ''} aria-label="${o.label || 'Credentials'}">
  <dl class="credentials__list">${items.map((c) => html`<div class="credentials__item"><dt>${icon(CREDENTIAL_ICON[c.id] || 'badge', { size: 18 })}${c.label}</dt><dd>${c.value}${c.issuerUrl ? html` <a class="credentials__issuer" href="${c.issuerUrl}" rel="noopener">Check with the issuer</a>` : ''}</dd></div>`)}</dl>
</section>`;
}
