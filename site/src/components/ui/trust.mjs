// @ts-check
/**
 * Trust: testimonials and the credentials band.
 * Split mechanically from components/ui.mjs in W1 (byte-identical output); API frozen in site/COMPONENTS.md.
 */
import { html } from '../../lib/html.mjs';
import { siteJson } from '../../../site.config.mjs';
import { icon } from '../sprite.mjs';
import { sampleLabel, serviceIcon } from './actions.mjs';
import { sectionHead } from './heads.mjs';

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

/** Icon per site.json credential id. @type {Record<string, string>} */
const CREDENTIAL_ICON = { insurance: 'shield', worksafebc: 'shield', licences: 'doc', certifications: 'badge', memberships: 'users' };

/** Credentials band with the bracket tokens RNC must supply. */
export function trustBand() {
  // Labels and values come from content/site.json (credentials + warranty): the single source of business facts.
  const items = [
    ...siteJson.credentials.map((c) => [CREDENTIAL_ICON[c.id] || 'badge', c.label, c.value]),
    ['check', 'Workmanship warranty', siteJson.warranty],
  ];
  return html`<section class="section deep-band trust" aria-labelledby="trust-h">
  <div class="deep-band__glow" aria-hidden="true"></div>
  <div class="wrap">
    ${sectionHead({ id: 'trust-h', title: 'Credentials', lede: 'Insurance, safety and licensing details for owners, councils and facility teams.' })}
    <dl class="trust__grid">${items.map(([ic, k, v]) => html`<div class="glass-card glass-card--media trust__item"><dt>${icon(ic, { size: 18 })}${k}</dt><dd>${v}</dd></div>`)}</dl>
  </div>
</section>`;
}
