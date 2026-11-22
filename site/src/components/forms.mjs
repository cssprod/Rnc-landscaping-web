// @ts-check
/**
 * Free quote builder (C5; CONTRACT §6 quote.json v3, §13 events). One page, six inputs: services, area, details,
 * timing, name and contact (the phone field appears for call or text and is then required). There is no email
 * field and no backend: the form's action is a mailto:, so without JavaScript it opens the visitor's email app with
 * the answers one per line (method=post, enctype=text/plain). With JavaScript, scripts/quote.js validates in place,
 * writes a formatted email and shows the ready panel (copy, address, call/text, webmail).
 * All copy comes from content/pages/quote.json; services and municipalities come from content/site.json.
 */
import { html, raw, md } from '../lib/html.mjs';
import { tok, has, telHref, smsHref, e164 } from '../lib/tokens.mjs';
import { siteJson } from '../../site.config.mjs';
import { icon, SERVICE_ICON } from './sprite.mjs';

const NOT_SURE = 'not-sure';
const OTHER_AREA = 'other';

/**
 * Contact values for links, with test overrides. A value is '' while its token is unresolved, so no URL is ever built
 * on a bracket token (CONTRACT §3).
 * @param {{ email?: string, phone?: string }} o
 */
function contactValues(o) {
  const email = o.email ?? (has('EMAIL') ? tok('EMAIL') : '');
  const phone = o.phone ?? (has('PHONE') ? tok('PHONE') : '');
  const tel = phone ? (o.phone ? `tel:${e164(phone)}` : telHref()) : '';
  const sms = phone ? (o.phone ? `sms:${e164(phone)}` : smsHref()) : '';
  return { email, phone, tel, sms };
}

/** Inline error line, hidden until quote.js shows it. @param {string} id @param {string} field @param {string} msg */
const errorLine = (id, field, msg) => html`<p class="field__error" id="${id}-error" data-error-for="${field}" hidden>${icon('close', { size: 14 })}<span data-error-text>${msg}</span></p>`;

/**
 * The six-input quote builder form.
 * @param {any} data build data (env.data); services and municipalities are read from content/site.json
 * @param {any} page content/pages/quote.json (v3)
 * @param {{ email?: string, phone?: string, id?: string }} [o] `email` / `phone` override the [EMAIL] / [PHONE] tokens (tests);
 *   `id` prefixes every id (default "q")
 */
export function quoteForm(data, page, o = {}) {
  void data;
  const F = page?.fields || {};
  const b = page?.buttons || {};
  const m = page?.messages || {};
  const pre = o.id || 'q';
  const { email, phone, tel, sms } = contactValues(o);
  const services = siteJson.services || [];
  const areas = siteJson.municipalities || [];
  const sv = F.services || {}, ar = F.area || {}, dt = F.details || {}, tm = F.timing || {}, nm = F.name || {}, ct = F.contact || {};
  const ph = ct.phone || {};
  const choices = (/** @type {string} */ name, /** @type {{ value: string, label: string }[]} */ opts, /** @type {string} */ type, /** @type {string} */ checkedValue) =>
    opts.map((opt, i) => html`<label class="qb-choice"><input type="${type}" name="${name}" value="${opt.value}" id="${pre}-${name}-${opt.value}"${type === 'radio' && i === 0 ? raw(' required') : ''}${opt.value === checkedValue ? raw(' checked') : ''}><span class="qb-choice__label" data-label>${opt.label}</span></label>`);
  const detailsHelp = [dt.help, dt.examples?.length ? `For example: ${dt.examples.slice(0, -1).join(', ')}${dt.examples.length > 1 ? ', or ' : ''}${dt.examples[dt.examples.length - 1]}.` : ''].filter(Boolean);

  return html`<form class="qb" id="${pre}-form" name="quote" method="post" action="mailto:${email}?subject=Free%20quote%20request" enctype="text/plain" accept-charset="utf-8" data-stepper data-quote-form
  data-email="${email || tok('EMAIL')}" data-subject="${page?.subject || 'Free quote request — {services} — {area}'}" data-max-url="1800"
  data-summary-labels="${JSON.stringify(page?.summary || {})}" data-label-copied="${b.copied || 'Copied'}" data-label-address-copied="${b.addressCopied || 'Address copied'}"
  data-copy-failed="${m.copyFailed || ''}" data-truncated-note="${m.truncatedNote || '[…] Shortened to fit an email link. Paste the full request you copied.'}">
  <div class="qb__summary" id="${pre}-errors" data-error-summary tabindex="-1" role="alert" aria-labelledby="${pre}-errors-h" hidden>
    <h2 class="qb__summary-h" id="${pre}-errors-h">${m.errorSummary || 'Check these answers'}</h2>
    <ul></ul>
  </div>

  <fieldset class="field qb-field" id="${pre}-services" data-field="services" data-msg="${sv.error || ''}" aria-describedby="${pre}-services-help">
    <legend class="field__label">${sv.label || 'What do you need?'}</legend>
    <p class="field__help" id="${pre}-services-help">${sv.help || ''}</p>
    <div class="qb-cards">${services.map((s) => html`<label class="qb-card"><input type="checkbox" name="services" value="${s.slug}" id="${pre}-services-${s.slug}"><span class="qb-card__icon" aria-hidden="true">${icon(/** @type {any} */ (SERVICE_ICON)[s.slug] || 'leaf', { size: 22 })}</span><span class="qb-card__label" data-label>${s.navLabel || s.name}</span></label>`)}
      <label class="qb-card qb-card--plain"><input type="checkbox" name="services" value="${NOT_SURE}" id="${pre}-services-${NOT_SURE}"><span class="qb-card__icon" aria-hidden="true">${icon('chat', { size: 22 })}</span><span class="qb-card__label" data-label>${sv.notSure || 'Not sure yet'}</span></label></div>
    ${errorLine(`${pre}-services`, 'services', sv.error || '')}
  </fieldset>

  <div class="field qb-field" data-field="area" data-msg="${ar.error || ''}">
    <label class="field__label" for="${pre}-area">${ar.label || 'Municipality'}</label>
    <p class="field__help" id="${pre}-area-help">${ar.help || ''}</p>
    <div class="select"><select id="${pre}-area" name="area" required aria-describedby="${pre}-area-help"><option value="">${ar.placeholder || 'Choose…'}</option>${areas.map((a) => html`<option value="${a.slug}">${a.name}</option>`)}<option value="${OTHER_AREA}">${ar.other || 'Somewhere else in Greater Victoria'}</option></select>${icon('chevron', { size: 18 })}</div>
    ${errorLine(`${pre}-area`, 'area', ar.error || '')}
  </div>

  <div class="field qb-field" data-field="details" data-msg="${dt.error || ''}">
    <label class="field__label" for="${pre}-details">${dt.label || 'About the property or job'}</label>
    <div class="field__help" id="${pre}-details-help">${detailsHelp.map((t) => html`<p>${md(t)}</p>`)}</div>
    <textarea id="${pre}-details" name="details" rows="6" required minlength="${dt.minLength || 10}" maxlength="${dt.maxLength || 1200}" placeholder="${dt.placeholder || ''}" aria-describedby="${pre}-details-help"></textarea>
    ${errorLine(`${pre}-details`, 'details', dt.error || '')}
  </div>

  <fieldset class="field qb-field" id="${pre}-timing" data-field="timing" data-msg="${tm.error || ''}">
    <legend class="field__label">${tm.label || 'Timing'}</legend>
    <div class="qb-choices">${choices('timing', tm.options || [], 'radio', '')}</div>
    ${errorLine(`${pre}-timing`, 'timing', tm.error || '')}
  </fieldset>

  <div class="field qb-field" data-field="name" data-msg="${nm.error || ''}">
    <label class="field__label" for="${pre}-name">${nm.label || 'Your name'}</label>
    <input id="${pre}-name" name="name" type="text" required autocomplete="name" autocapitalize="words" spellcheck="false" maxlength="${nm.maxLength || 100}">
    ${errorLine(`${pre}-name`, 'name', nm.error || '')}
  </div>

  <fieldset class="field qb-field" id="${pre}-contact" data-field="contact" data-msg="${ct.error || ''}"${ct.help ? raw(` aria-describedby="${pre}-contact-help"`) : ''}>
    <legend class="field__label">${ct.label || 'Best way to reach you'}</legend>
    ${ct.help ? html`<p class="field__help" id="${pre}-contact-help">${ct.help}</p>` : ''}
    <div class="qb-choices">${choices('contact', ct.options || [], 'radio', 'email')}</div>
    ${errorLine(`${pre}-contact`, 'contact', ct.error || '')}
  </fieldset>
  <div class="qb-reveal" data-show-when="contact=call,text">
    <div class="field qb-field" data-field="phone" data-msg="${ph.error || ''}">
      <label class="field__label" for="${pre}-phone">${ph.label || 'Phone number'}</label>
      <p class="field__help" id="${pre}-phone-help">${ph.help || ''}</p>
      <input id="${pre}-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" aria-describedby="${pre}-phone-help">
      ${errorLine(`${pre}-phone`, 'phone', ph.error || '')}
    </div>
  </div>

  <div class="qb__submit" data-submit-row>
    <button class="btn btn--primary btn--lg" type="submit">${icon('mail', { size: 18 })}${b.submit || 'Open my email app'}</button>
    <p class="field__help">${m.submitHelp || ''}${email ? '' : html` ${m.noRecipient || `Add ${siteJson.nap.email} as the recipient before you send.`}`}</p>
    ${m.noJs ? html`<p class="field__help qb__nojs">${m.noJs}</p>` : ''}
  </div>

  <section class="qb-ready" data-quote-ready hidden aria-labelledby="${pre}-ready-h">
    <span class="qb-ready__badge" aria-hidden="true">${icon('check', { size: 22 })}</span>
    <h2 id="${pre}-ready-h" tabindex="-1" data-ready-heading>${m.ready?.heading || 'Your email is ready to send'}</h2>
    <p>${md(m.ready?.body || '')}</p>
    <p class="qb-ready__note" data-truncated hidden>${m.truncated || ''}</p>
    <label class="field__label" for="${pre}-request">${m.requestLabel || 'Your request'}</label>
    <textarea id="${pre}-request" readonly rows="10" data-quote-summary></textarea>
    <div class="qb-ready__row">
      <button type="button" class="btn btn--primary" data-copy>${icon('copy', { size: 18 })}${b.copy || 'Copy request'}</button>
      <a class="btn btn--secondary" href="mailto:${email}" data-mailto>${icon('mail', { size: 18 })}${b.reopen || 'Open my email app again'}</a>
    </div>
    <p class="qb-ready__status" role="status" data-copy-status></p>
    <div class="qb-ready__row qb-ready__address" data-address>
      <span>${m.sendTo || 'Send it to'} <strong>${email || siteJson.nap.email}</strong></span>
      <button type="button" class="btn btn--secondary btn--sm" data-copy-address>${icon('copy', { size: 16 })}${b.copyAddress || 'Copy address'}</button>
    </div>
    ${phone ? html`<div class="qb-ready__row" data-ready-talk>
      <a class="btn btn--secondary" href="${tel}" data-track="call_click" data-track-location="quote_ready">${icon('phone', { size: 18 })}${b.call || 'Call'}</a>
      <a class="btn btn--secondary" href="${sms}" data-sms data-phone="${e164(phone)}" data-track="sms_click" data-track-location="quote_ready">${icon('chat', { size: 18 })}${b.text || 'Text us'}</a>
    </div>` : html`<p class="qb-ready__talk" data-ready-talk>${m.talk || `Prefer to talk? Call or text ${siteJson.nap.phone}.`}</p>`}
    <div class="qb-ready__webmail">
      <p>${m.webmail || ''}</p>
      <div class="qb-ready__row">
        <a class="btn btn--plain" data-webmail="gmail" target="_blank" rel="noopener noreferrer">${b.gmail || 'Gmail'}${icon('arrow-up-right', { size: 16 })}</a>
        <a class="btn btn--plain" data-webmail="outlook" target="_blank" rel="noopener noreferrer">${b.outlook || 'Outlook.com'}${icon('arrow-up-right', { size: 16 })}</a>
      </div>
    </div>
    <button type="button" class="btn btn--plain qb-ready__restart" data-restart>${b.restart || 'Start again'}</button>
  </section>
</form>`;
}

/**
 * "Other ways to reach us": phone, text and email as links once known (CONTRACT §3: plain text plus the chip until then), and hours.
 * @param {any} page content/pages/quote.json (v3)
 * @param {{ email?: string, phone?: string, location?: string }} [o] token overrides (tests); `location` is the analytics placement (default quote_aside)
 */
export function quoteContacts(page, o = {}) {
  const c = page?.contacts || {};
  const loc = o.location || 'quote_aside';
  const { email, phone, tel, sms } = contactValues(o);
  const row = (/** @type {string} */ ic, /** @type {string} */ label, /** @type {any} */ value) => html`<div class="quote-contacts__row"><dt>${icon(ic, { size: 18 })}<span>${label}</span></dt><dd>${value}</dd></div>`;
  return html`<section class="quote-contacts" data-quote-contacts aria-labelledby="quote-contacts-h">
  <h2 id="quote-contacts-h">${c.heading || 'Other ways to reach us'}</h2>
  <dl class="quote-contacts__list">
    ${row('phone', c.phone || 'Phone', phone ? html`<a href="${tel}" data-track="call_click" data-track-location="${loc}">${phone}</a>` : siteJson.nap.phone)}
    ${row('chat', c.text || 'Text', phone ? html`<a href="${sms}" data-track="sms_click" data-track-location="${loc}">${phone}</a>` : siteJson.nap.phone)}
    ${row('mail', c.email || 'Email', email ? html`<a href="mailto:${email}" data-track="email_click" data-track-location="${loc}">${email}</a>` : siteJson.nap.email)}
    ${row('clock', c.hours || 'Hours', siteJson.hours?.display || '')}
  </dl>
</section>`;
}
