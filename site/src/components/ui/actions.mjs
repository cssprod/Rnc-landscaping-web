// @ts-check
/**
 * Actions: buttons, the Sample chip, arrow links and pill links.
 * Split mechanically from components/ui.mjs in W1 (byte-identical output); API frozen in site/COMPONENTS.md.
 */
import { html } from '../../lib/html.mjs';
import { has, telHref } from '../../lib/tokens.mjs';
import { siteJson } from '../../../site.config.mjs';
import { icon, SERVICE_ICON } from '../sprite.mjs';

/** Visible "Sample" chip. The class name is what the launch build looks for. */
export const sampleLabel = () => html`<span class="sample-label">Sample</span>`;

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
  if (has('PHONE')) return html`<a class="${cls}" href="${telHref()}" data-track="call_clicked" data-track-location="${location}">${icon('phone', { size: 18 })} Call ${siteJson.nap.phone}</a>`;
  return html`<a class="${cls}" href="/projects/">See our work</a>`;
}

/** Arrow link ("See all …"). @param {string} href @param {any} label */
export const linkMore = (href, label) => html`<a class="link-more" href="${href}">${label}${icon('arrow', { size: 18 })}</a>`;

/** Pill links. @param {[string, string][]} links */
export const chips = (links) => html`<ul class="chip-list">${links.map(([href, label]) => html`<li><a class="chip" href="${href}">${label}</a></li>`)}</ul>`;
