// @ts-check
/**
 * Calls to action: the CTA band and the contact method cards.
 * Split mechanically from components/ui.mjs in W1 (byte-identical output); API frozen in site/COMPONENTS.md.
 */
import { html } from '../../lib/html.mjs';
import { siteJson } from '../../../site.config.mjs';
import { telLink, mailLink } from '../../lib/tokens.mjs';
import { icon } from '../sprite.mjs';
import { quoteBtn, secondaryBtn } from './actions.mjs';

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

/** Contact method cards. */
export function contactCards() {
  return html`<ul class="contact-cards">
    <li class="glass-card contact-card"><span class="icon-tile">${icon('phone', { size: 22 })}</span><h3>Call</h3><p>${telLink('contact_page', { className: 'contact-card__value' })}</p></li>
    <li class="glass-card contact-card"><span class="icon-tile">${icon('mail', { size: 22 })}</span><h3>Email</h3><p>${mailLink('contact_page', { className: 'contact-card__value' })}</p></li>
    <li class="glass-card contact-card"><span class="icon-tile">${icon('clock', { size: 22 })}</span><h3>Hours</h3><p><span class="contact-card__value">${siteJson.hours.display}</span></p></li>
    <li class="glass-card contact-card"><span class="icon-tile">${icon('pin', { size: 22 })}</span><h3>Address</h3><p><span class="contact-card__value">${siteJson.nap.address}</span></p></li>
  </ul>`;
}
