// @ts-check
/**
 * Free-quote builder markup (blueprint C5): one page, six inputs, from content/pages/quote.json "fields".
 * There is no backend. Without JavaScript the form posts text/plain to its mailto: action with native
 * validation. With src/scripts/quote.js the same form builds a tidy mailto: (subject
 * "Free quote request — Irrigation — Saanich"), shows inline errors and an error summary, and reveals
 * the after-submit panel (copy request, address, webmail, call/text).
 *
 * API
 *   quoteForm(data, page)  → the <form data-quote-form> followed by the after-submit panel (#quote-panel).
 *   quoteBuilder           alias of quoteForm.
 * Hooks read by quote.js: form[data-quote-form] (data-email, data-phone, data-panel), [data-quote-field],
 * [data-error-for=<name>] (data-msg-required / -min-length / -max-length / -format), [data-quote-errors],
 * [data-quote-phone] (data-label-js), #quote-panel [data-quote-text|status|truncated|reopen|copy|webmail|sms|edit].
 * All styling hooks are .quote-* classes (site/src/styles/70-quote.css) plus the generic .btn and .vh.
 */
import { html, raw, md } from '../lib/html.mjs';
import { tok, has } from '../lib/tokens.mjs';
import { icon } from './sprite.mjs';

const SERVICE_ICON = /** @type {Record<string, string>} */ ({ 'grounds-maintenance': 'leaf', 'landscape-installation': 'spade', irrigation: 'drop', 'tree-vegetation': 'tree' });
const attr = (/** @type {string} */ s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const camelToKebab = (/** @type {string} */ s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Error element with every message as data-msg-*; the visible text starts as the "required" one. @param {string} name @param {string} id @param {Record<string,string>} [errors] */
function errorEl(name, id, errors = {}) {
  const msgs = Object.entries(errors).map(([k, v]) => ` data-msg-${camelToKebab(k)}="${attr(v)}"`).join('');
  return html`<p class="quote-error" id="${id}-error" data-error-for="${name}"${raw(msgs)} hidden>${icon('close', { size: 14 })}<span data-error-text>${errors.required || errors.format || 'Check this answer.'}</span></p>`;
}

/** @param {any} f */
const describedBy = (f, id) => [f.help ? `${id}-help` : '', `${id}-error`].filter(Boolean).join(' ');
/** @param {any} f @param {string} id */
const helpEl = (f, id) => (f.help ? html`<p class="quote-help" id="${id}-help">${md(f.help)}</p>` : '');

/** @param {any} f */
function cards(f) {
  const id = `q-${f.name}`;
  return html`<fieldset class="quote-field quote-field--cards" data-quote-field="${f.name}" aria-describedby="${describedBy(f, id)}">
    <legend class="quote-label">${f.label}</legend>${helpEl(f, id)}
    <div class="quote-cards">${(f.options || []).map((/** @type {any} */ o, /** @type {number} */ i) => html`<label class="quote-card" for="${id}-${i}">
      <input type="checkbox" name="${f.name}" value="${o.value}" id="${id}-${i}" data-label="${o.subject || o.label}">
      <span class="quote-card__icon" aria-hidden="true">${icon(SERVICE_ICON[o.value] || 'leaf', { size: 24 })}</span>
      <span class="quote-card__text"><span class="quote-card__title">${o.label}</span>${o.hint ? html`<span class="quote-card__hint">${o.hint}</span>` : ''}</span>
      <span class="quote-card__check" aria-hidden="true">${icon('check', { size: 16 })}</span>
    </label>`)}</div>${errorEl(f.name, id, f.errors)}</fieldset>`;
}

/** @param {any} f @param {any} [extra] */
function radios(f, extra = '') {
  const id = `q-${f.name}`;
  return html`<fieldset class="quote-field" data-quote-field="${f.name}" aria-describedby="${describedBy(f, id)}">
    <legend class="quote-label">${f.label}</legend>${helpEl(f, id)}
    <div class="quote-choices">${(f.options || []).map((/** @type {any} */ o, /** @type {number} */ i) => html`<label class="quote-choice" for="${id}-${i}"><input type="radio" name="${f.name}" value="${o.value}" id="${id}-${i}"${f.required && i === 0 ? raw(' required') : ''}${f.default === o.value ? raw(' checked') : ''}><span>${o.label}</span></label>`)}</div>
    ${errorEl(f.name, id, f.errors)}${extra}</fieldset>`;
}

/** @param {any} f */
function select(f) {
  const id = `q-${f.name}`;
  return html`<div class="quote-field" data-quote-field="${f.name}"><label class="quote-label" for="${id}">${f.label}</label>${helpEl(f, id)}
    <div class="quote-select"><select id="${id}" name="${f.name}"${f.required ? raw(' required') : ''} aria-describedby="${describedBy(f, id)}"><option value="">${f.placeholder || 'Choose…'}</option>${(f.options || []).map((/** @type {any} */ o) => html`<option value="${o.value}">${o.label}</option>`)}</select>${icon('chevron', { size: 18 })}</div>
    ${errorEl(f.name, id, f.errors)}</div>`;
}

/** @param {any} f */
function textarea(f) {
  const id = `q-${f.name}`;
  const ex = Array.isArray(f.examples) && f.examples.length ? f.examples : [];
  return html`<div class="quote-field" data-quote-field="${f.name}"><label class="quote-label" for="${id}">${f.label}</label>${helpEl(f, id)}
    ${ex.length ? html`<div class="quote-examples"><p class="quote-examples__h">For example</p><ul>${ex.map((/** @type {string} */ x) => html`<li>${x}</li>`)}</ul></div>` : ''}
    <textarea class="quote-input" id="${id}" name="${f.name}" rows="6"${f.required ? raw(' required') : ''}${f.minLength ? raw(` minlength="${f.minLength}"`) : ''}${f.maxLength ? raw(` maxlength="${f.maxLength}"`) : ''} aria-describedby="${describedBy(f, id)}"></textarea>
    ${errorEl(f.name, id, f.errors)}</div>`;
}

/** @param {any} f */
function text(f) {
  const id = `q-${f.name}`;
  return html`<div class="quote-field" data-quote-field="${f.name}"><label class="quote-label" for="${id}">${f.label}</label>${helpEl(f, id)}
    <input class="quote-input" id="${id}" name="${f.name}" type="${f.type === 'tel' ? 'tel' : 'text'}"${f.required ? raw(' required') : ''}${f.maxLength ? raw(` maxlength="${f.maxLength}"`) : ''}${f.autocomplete ? raw(` autocomplete="${f.autocomplete}"`) : ''} aria-describedby="${describedBy(f, id)}">
    ${errorEl(f.name, id, f.errors)}</div>`;
}

/** Conditional phone input: visible and optional without JS; quote.js shows it (required) only for Call me / Text me. @param {any} p */
function phone(p) {
  const id = 'q-phone';
  return html`<div class="quote-field quote-phone" data-quote-field="phone" data-quote-phone data-label-js="${p.label || 'Phone number'}">
    <label class="quote-label" for="${id}">${p.labelNoJs || p.label || 'Phone number'}</label>${helpEl(p, id)}
    <input class="quote-input" id="${id}" name="phone" type="tel" inputmode="tel" autocomplete="${p.autocomplete || 'tel'}" maxlength="25" aria-describedby="${describedBy(p, id)}">
    ${errorEl('phone', id, p.errors)}</div>`;
}

/** @param {any} f */
function field(f) {
  if (f.type === 'cards') return cards(f);
  if (f.type === 'radio') return radios(f, f.phone ? phone(f.phone) : '');
  if (f.type === 'select') return select(f);
  if (f.type === 'textarea') return textarea(f);
  return text(f);
}

/** After-submit panel (hidden until quote.js shows it). @param {any} page */
function panel(page) {
  const b = page?.buttons || {};
  const m = page?.messages || {};
  const r = m.ready || {};
  const phoneKnown = has('PHONE');
  const digits = String(tok('PHONE')).replace(/[^\d+]/g, '');
  const emailKnown = has('EMAIL');
  return html`<section class="quote-panel" id="quote-panel" data-quote-panel hidden tabindex="-1" aria-labelledby="quote-panel-h" data-copied="${b.copied || 'Request copied'}" data-copied-address="${b.copiedAddress || 'Address copied'}" data-copy-failed="${m.copyFailed || ''}" data-sms-body="${m.smsBody || ''}">
  <div class="quote-panel__head"><span class="quote-panel__tick" aria-hidden="true">${icon('check', { size: 22 })}</span><h2 id="quote-panel-h">${r.heading || 'Your email should now be open'}</h2></div>
  <p>${md(r.body || 'Check it, attach any photos, then press send.')}</p>
  <p class="quote-panel__notice" data-quote-truncated hidden>${md(m.truncated || 'Your request was shortened to fit an email link. Copy the full request below and paste it into the email.')}</p>
  <p class="quote-status" role="status" data-quote-status></p>
  <div class="quote-panel__actions">
    <button type="button" class="btn btn--primary" data-quote-copy="request">${icon('copy', { size: 18 })}${b.copy || 'Copy request'}</button>
    <a class="btn btn--secondary" href="mailto:${emailKnown ? tok('EMAIL') : ''}" data-quote-reopen>${icon('mail', { size: 18 })}${b.reopen || 'Open my email app again'}</a>
  </div>
  <label class="quote-label" for="quote-request">Your request</label>
  <textarea class="quote-input quote-panel__text" id="quote-request" readonly rows="10" data-quote-text></textarea>
  <div class="quote-panel__ways">
    <div class="quote-way"><h3>Email it yourself</h3>
      ${emailKnown
        ? html`<p class="quote-address"><span data-quote-address>[EMAIL]</span> <button type="button" class="btn btn--secondary btn--sm" data-quote-copy="address">${icon('copy', { size: 16 })}${b.copyAddress || 'Copy address'}</button></p>`
        : html`<p class="quote-address"><span data-quote-address>[EMAIL]</span></p><p class="quote-help">${md(r.noEmail || '')}</p>`}
    </div>
    <div class="quote-way"><h3>Use webmail</h3>
      <p class="quote-help" id="quote-webmail-help">${m.webmailHelp || 'Convenience links that open a new message in your webmail.'}</p>
      <p class="quote-way__links"><a class="btn btn--secondary btn--sm" href="https://mail.google.com/mail/?view=cm&amp;fs=1" target="_blank" rel="noopener" data-quote-webmail="gmail" aria-describedby="quote-webmail-help">${b.gmail || 'Gmail'}<span class="vh"> (opens in a new tab)</span></a>
      <a class="btn btn--secondary btn--sm" href="https://outlook.live.com/mail/0/deeplink/compose" target="_blank" rel="noopener" data-quote-webmail="outlook" aria-describedby="quote-webmail-help">${b.outlook || 'Outlook.com'}<span class="vh"> (opens in a new tab)</span></a></p>
    </div>
    ${phoneKnown ? html`<div class="quote-way"><h3>Call or text</h3><p class="quote-way__links">
      <a class="btn btn--secondary btn--sm" href="tel:${digits}" data-track="call_click" data-track-location="quote_panel">${icon('phone', { size: 16 })}${b.call || 'Call us'}</a>
      <a class="btn btn--secondary btn--sm" href="sms:${digits}" data-quote-sms data-track="sms_click" data-track-location="quote_panel">${icon('chat', { size: 16 })}${b.text || 'Text us'}</a></p></div>` : ''}
  </div>
  <p><button type="button" class="btn btn--plain" data-quote-edit>${b.edit || 'Edit my answers'}</button></p>
</section>`;
}

/** The quote form plus its after-submit panel. @param {any} data @param {any} page */
export function quoteForm(data, page) {
  const fields = Array.isArray(page?.fields) ? page.fields : [];
  const b = page?.buttons || {};
  const m = page?.messages || {};
  const es = page?.errorSummary || {};
  const email = tok('EMAIL');
  return html`<form class="quote-form" id="quote-form" name="quote" method="post" enctype="text/plain" action="mailto:${email}?subject=Free%20quote%20request" data-quote-form data-email="${email}" data-phone="${tok('PHONE')}" data-panel="quote-panel">
  <div class="quote-errors" data-quote-errors tabindex="-1" hidden aria-labelledby="quote-errors-h" role="group" data-intro="${es.intro || '{count} answer(s) need a fix:'}">
    <h2 id="quote-errors-h">${es.heading || 'Check your request'}</h2><p data-quote-errors-intro></p><ul></ul>
  </div>
  ${fields.map(field)}
  <div class="quote-submit">
    <button class="btn btn--primary btn--lg" type="submit">${icon('mail', { size: 18 })}${b.submit || 'Write my email'}</button>
    <p class="quote-help">${m.submitHelp || 'Opens your email app. Nothing is sent until you press send.'}</p>
    <noscript><p class="quote-help">${m.noJs || ''}</p></noscript>
    ${m.privacy ? html`<p class="quote-privacy">${md(m.privacy)}</p>` : ''}
  </div>
</form>
${panel(page)}`;
}

export const quoteBuilder = quoteForm;
