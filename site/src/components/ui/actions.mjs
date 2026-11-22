// @ts-check
/**
 * Actions: buttons, the Sample chip, arrow links, pill links, the call button and the contact links.
 * API frozen in site/COMPONENTS.md (signatures only grow). Paired CSS: 40-ui-actions.css.
 *
 * Token-dependent links (CONTRACT §3): a URL built from an unresolved [PHONE] / [EMAIL] is never written into an href.
 * Showcase builds render the label as plain text followed by the token (finalizeTokens() turns it into a chip);
 * launch builds omit the link. Analytics names follow CONTRACT §13 (call_click, sms_click, email_click).
 */
import { html } from '../../lib/html.mjs';
import { has, telHref, smsHref, tok } from '../../lib/tokens.mjs';
import { siteJson } from '../../../site.config.mjs';
import { icon, SERVICE_ICON } from '../sprite.mjs';

/** True in a launch build (SITE_MODE=launch). Read at call time so tests can switch it. */
const isLaunch = () => process.env.SITE_MODE === 'launch';

/**
 * Visible "Sample" chip. The class attribute must stay exactly `class="sample-label"`: the launch build looks for it.
 * @param {string} [noun] optional word after "Sample" ("project" → "Sample project", "review" → "Sample review")
 */
export const sampleLabel = (noun) => html`<span class="sample-label">Sample${noun ? ` ${noun}` : ''}</span>`;

/** @param {string} slug */
export const serviceIcon = (slug) => SERVICE_ICON[/** @type {keyof typeof SERVICE_ICON} */ (slug)] || 'leaf';

/** Primary call to action. @param {{ tone?: 'primary'|'light', size?: string }} [o] */
export const quoteBtn = (o = {}) => html`<a class="btn btn--${o.tone || 'primary'}${o.size ? ` btn--${o.size}` : ''}" href="/free-quote/">Get a free quote</a>`;

/**
 * Secondary action: call once the number is known, otherwise the portfolio.
 * @param {string} location @param {{ tone?: 'glass'|'secondary'|'on-deep', size?: string }} [o]
 */
export function secondaryBtn(location, o = {}) {
  const cls = `btn btn--${o.tone || 'secondary'}${o.size ? ` btn--${o.size}` : ''}`;
  if (has('PHONE')) return html`<a class="${cls}" href="${telHref()}" data-track="call_click" data-track-location="${location}">${icon('phone', { size: 18 })} Call ${siteJson.nap.phone}</a>`;
  return html`<a class="${cls}" href="/projects/">See our work</a>`;
}

/** Arrow link ("See all …"). @param {string} href @param {any} label */
export const linkMore = (href, label) => html`<a class="link-more" href="${href}">${label}${icon('arrow', { size: 18 })}</a>`;

/** Pill links. @param {[string, string][]} links */
export const chips = (links) => html`<ul class="chip-list">${links.map(([href, label]) => html`<li><a class="chip" href="${href}">${label}</a></li>`)}</ul>`;

/**
 * Call button. PHONE known: `a.btn.btn--call` with a tel: href and `data-track="call_click"`.
 * PHONE unresolved: a non-link `span.btn.btn--call.btn--pending` with the label and the [PHONE] chip in showcase builds
 * (never `href="tel:[PHONE]"`), and nothing in launch builds.
 * @param {string} location analytics location (CONTRACT §13) @param {{ tone?: 'primary'|'secondary'|'glass'|'on-deep'|'light', size?: string, label?: string }} [o]
 */
export function callBtn(location, o = {}) {
  const cls = `btn btn--call btn--${o.tone || 'secondary'}${o.size ? ` btn--${o.size}` : ''}`;
  const label = o.label || 'Call';
  if (has('PHONE')) return html`<a class="${cls}" href="${telHref()}" data-track="call_click" data-track-location="${location}">${icon('phone', { size: 18 })}${label} ${siteJson.nap.phone}</a>`;
  if (isLaunch()) return '';
  return html`<span class="${cls} btn--pending">${icon('phone', { size: 18 })}${label} ${siteJson.nap.phone}</span>`;
}

/**
 * Call / Text / Email links with their visible values (`ul.contact-links`). Each link carries `data-track`
 * (`call_click`, `sms_click`, `email_click`) and `data-track-location`. An unresolved token renders as text + chip in
 * showcase builds and is left out in launch builds.
 * @param {string} location analytics location @param {{ sms?: boolean, email?: boolean }} [o]
 */
export function contactLinks(location, o = {}) {
  const launch = isLaunch();
  /** @param {string} ic @param {string} label @param {string} value @param {string|null} href @param {string} event */
  const row = (ic, label, value, href, event) => {
    if (href) return html`<li class="contact-links__item"><a class="contact-links__link" href="${href}" data-track="${event}" data-track-location="${location}">${icon(ic, { size: 20, className: 'contact-links__icon' })}<span class="contact-links__label">${label}</span> <span class="contact-links__value">${value}</span></a></li>`;
    if (launch) return '';
    return html`<li class="contact-links__item"><span class="contact-links__link contact-links__link--pending">${icon(ic, { size: 20, className: 'contact-links__icon' })}<span class="contact-links__label">${label}</span> <span class="contact-links__value">${value}</span></span></li>`;
  };
  const phone = has('PHONE');
  const items = [
    row('phone', 'Call', siteJson.nap.phone, phone ? telHref() : null, 'call_click'),
    o.sms === false ? '' : row('chat', 'Text', siteJson.nap.phone, phone ? smsHref() : null, 'sms_click'),
    o.email === false ? '' : row('mail', 'Email', siteJson.nap.email, has('EMAIL') ? `mailto:${tok('EMAIL')}` : null, 'email_click'),
  ];
  if (items.every((i) => !i)) return '';
  return html`<ul class="contact-links">${items}</ul>`;
}
