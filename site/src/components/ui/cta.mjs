// @ts-check
/**
 * Calls to action: the CTA band (deep "window into the night" in both themes, optionally living), the contact method
 * cards and the fallback contact panel. API frozen in site/COMPONENTS.md (signatures only grow). Paired CSS: 47-ui-cta.css.
 *
 * Living band (effects cta-band, conic-ring, grain): three pre-blurred blobs moved by transform and one rotated conic
 * ring on the primary button are T2 loops (`data-t2`: they run only under html[data-alive], pause off-screen through
 * `data-living` on the art layer, and never run without JS or with motion off). The copy sits on a fixed scrim.
 */
import { html, raw } from '../../lib/html.mjs';
import { siteJson } from '../../../site.config.mjs';
import { telLink, mailLink } from '../../lib/tokens.mjs';
import { icon } from '../sprite.mjs';
import { quoteBtn, secondaryBtn, contactLinks } from './actions.mjs';

/** Static survey contours for the band's right half (decorative, aria-hidden, never animated). */
const CONTOURS = raw(`<svg class="cta-band__contours" viewBox="0 0 600 400" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round">
<path d="M312 92l78-30 92 14 58 52 10 74-44 58-96 22-86-26-40-62 6-62z"/><path d="M340 112l58-20 70 12 42 40 6 54-34 42-72 16-62-20-28-44 4-44z"/><path d="M372 134l38-12 46 10 26 26 2 34-22 26-46 10-38-14-16-26 2-28z"/><path d="M404 156l20-6 24 6 12 14v16l-12 12-24 4-18-8-8-14 2-12z"/>
<path d="M120 262l60-26 70 6 44 34 4 46-36 32-74 10-58-20-24-40 6-30z"/><path d="M150 276l40-16 48 4 28 22 2 30-24 20-48 6-38-14-14-24 4-18z"/><path d="M182 290l20-8 24 2 14 12v14l-12 10-24 2-18-6-6-12 2-8z"/>
<path d="M486 286l44-14 40 12 20 30-8 34-36 20-42-4-26-26-2-30z"/><path d="M506 302l26-8 22 8 10 18-4 18-20 12-24-2-14-14-2-18z"/></g></svg>`);

/**
 * The CTA band. `living` adds the T2 blobs and the conic ring on the primary button (one per page by default);
 * `reply` adds the [REPLY TIME] promise and the trust line. `id` names the heading (default `cta-h`; two bands on one
 * page must pass distinct ids). `image` is kept for API compatibility (the band is drawn art, never a photo).
 * @param {{ heading?: any, body?: any, secondary?: any, image?: string, id?: string, living?: boolean, reply?: boolean }} [p]
 */
export function ctaBand(p = {}) {
  const id = p.id || 'cta-h';
  void p.image;
  const primary = p.living
    ? html`<span class="conic"><span class="conic__ring" data-t2 aria-hidden="true"></span>${quoteBtn({ tone: 'primary', size: 'lg' })}</span>`
    : quoteBtn({ tone: 'primary', size: 'lg' });
  return html`<section class="cta-band on-deep${p.living ? ' cta-band--living' : ''}" aria-labelledby="${id}">
  <div class="cta-band__bg" aria-hidden="true"${p.living ? raw(' data-living') : ''}>
    ${p.living ? html`<div class="cta-band__blobs"><span class="cta-band__blob cta-band__blob--1" data-t2></span><span class="cta-band__blob cta-band__blob--2" data-t2></span><span class="cta-band__blob cta-band__blob--3" data-t2></span></div>` : ''}
    ${CONTOURS}
    <span class="cta-band__grain"></span>
  </div>
  <div class="wrap">
    <div class="cta-band__panel">
      <h2 id="${id}">${p.heading || 'Tell us about your property'}</h2>
      <p class="cta-band__body">${p.body || 'Free quotes, no obligation. Share a few details and photos and we will follow up to arrange a site visit.'}</p>
      ${p.reply ? html`<p class="cta-band__reply">We get back to you within ${siteJson.replyTime} to ask any questions and arrange your free quote.</p>` : ''}
      <div class="cta-band__actions">${primary}${p.secondary || secondaryBtn('cta_band', { tone: 'glass', size: 'lg' })}</div>
      ${p.reply ? html`<p class="cta-band__trust">Reply within ${siteJson.replyTime} · No obligation · ${siteJson.municipalities.length} municipalities, Sidney to Sooke</p>` : ''}
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

/**
 * Fallback contact panel: Call / Text / Email links (tracked), hours, and the address as text with a copy button.
 * The copy button (`[data-copy]`, target selector in its value) ships `hidden` until a script wires it; the confirmation
 * goes to the `role="status"` element. `level` sets the heading level (default h2).
 * @param {{ id?: string, heading?: any, location?: string, level?: number }} [o]
 */
export function contactFallback(o = {}) {
  const id = o.id || 'contact-h';
  const location = o.location || 'contact_page';
  const H = `h${Math.min(6, Math.max(2, Math.round(Number(o.level) || 2)))}`;
  return html`<section class="contact-fallback" aria-labelledby="${id}">
  ${raw(`<${H} id="${id}" class="contact-fallback__title">`)}${o.heading || 'Other ways to reach us'}${raw(`</${H}>`)}
  ${contactLinks(location)}
  <dl class="contact-fallback__facts">
    <div class="contact-fallback__fact"><dt>${icon('clock', { size: 18 })}Hours</dt><dd>${siteJson.hours.display}</dd></div>
    <div class="contact-fallback__fact"><dt>${icon('pin', { size: 18 })}Address</dt><dd><span class="contact-fallback__address" id="${id}-address">${siteJson.nap.address}</span>
      <button type="button" class="btn btn--secondary btn--sm contact-fallback__copy" data-copy="#${id}-address" hidden>${icon('copy', { size: 16 })}<span data-copy-label>Copy address</span></button>
      <span class="contact-fallback__status" role="status" data-copy-status></span></dd></div>
  </dl>
</section>`;
}
