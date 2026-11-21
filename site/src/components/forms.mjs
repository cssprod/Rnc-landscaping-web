// @ts-check
/**
 * Quote request form. There is no backend: the last step opens the visitor's
 * own email app with the request written out (mailto:), and shows the same
 * text with a Copy button in case no email app opens. Without JavaScript the
 * form submits as text/plain to mailto: with native validation.
 * Steps, labels, help and error text come from content/pages/quote.json
 * ([{ title, intro, fields: [{ name, type, label, help, required, options, errors }] }]).
 */
import { html, raw, md } from '../lib/html.mjs';
import { tok } from '../lib/tokens.mjs';
import { icon } from './sprite.mjs';

/**
 * @typedef {{ name: string, type: string, label: string, help?: string, error?: string, required?: boolean, options?: [string,string][], autocomplete?: string, min?: number, max?: number, showWhen?: string, phoneError?: string }} Field
 * @typedef {{ title: string, intro?: string, fields: Field[] }} Step
 */

/** Short labels used in the email summary. */
const SUMMARY_LABEL = {
  services: 'Services', service: 'Service', propertyType: 'Property', property_type: 'Property', area: 'Area', areaOther: 'Community',
  address: 'Address', location: 'Location', timing: 'Timing', details: 'About the work', name: 'Name', email: 'Email', phone: 'Phone',
  contactPreference: 'Contact by', organization: 'Organization',
};

/** @param {any} f @returns {Field} */
function fromContent(f) {
  const type = f.type === 'checkbox-group' ? 'checks' : f.type;
  return {
    name: f.name, type, label: f.label, help: f.help,
    error: f.errors?.required || f.errors?.format || f.errors?.minLength || '',
    required: !!f.required, min: f.minLength, max: f.maxLength, autocomplete: f.autocomplete,
    options: (f.options || []).map((/** @type {any} */ o) => /** @type {[string,string]} */ ([o.value, o.label])),
    showWhen: f.requiredWhen ? Object.entries(f.requiredWhen).map(([k, v]) => `${k}=${v}`)[0] : undefined,
    phoneError: f.errors?.phoneNeeded,
  };
}

/** @param {any} data @param {any} page @returns {Step[]} */
export function quoteSteps(data, page) {
  const steps = Array.isArray(page?.steps) ? page.steps : [];
  const out = steps.map((/** @type {any} */ st) => ({ title: st.title, intro: st.intro, fields: (st.fields || []).filter((/** @type {any} */ f) => f.type !== 'file').map(fromContent) }));
  // The "phone needed" message belongs on the phone field.
  const all = out.flatMap((/** @type {Step} */ x) => x.fields);
  const pn = all.find((/** @type {Field} */ f) => f.phoneError)?.phoneError;
  const ph = all.find((/** @type {Field} */ f) => f.name === 'phone');
  if (ph && pn) ph.phoneError = pn;
  return out;
}

/** @param {Field} f @param {string} pre */
function field(f, pre) {
  const inner = field0(f, pre);
  return f.showWhen ? html`<div data-show-when="${f.showWhen}">${inner}</div>` : inner;
}

/** @param {Field} f @param {string} pre */
function field0(f, pre) {
  const id = `${pre}-${f.name}`;
  const req = f.required ? raw(' required') : '';
  const desc = [f.help ? `${id}-help` : '', `${id}-error`].filter(Boolean).join(' ');
  const help = f.help ? html`<p class="field__help" id="${id}-help">${md(f.help)}</p>` : '';
  const err = html`<p class="field__error" id="${id}-error" data-error-for="${f.name}" hidden>${icon('close', { size: 14 })}<span>${f.error || 'Check this field.'}</span></p>`;
  const sum = raw(` data-summary="${(/** @type {any} */ (SUMMARY_LABEL))[f.name] || f.label.replace(/\s*\(optional\)\s*$/i, '')}"`);
  if (f.type === 'radio' || f.type === 'checks') {
    const t = f.type === 'radio' ? 'radio' : 'checkbox';
    return html`<fieldset class="field field--choices" data-field="${f.name}"${f.type === 'checks' && f.required ? raw(' data-any') : ''} data-msg="${f.error || ''}" aria-describedby="${desc}"${sum}>
      <legend>${f.label}</legend>${help}
      <div class="choices">${(f.options || []).map(([v, l], i) => html`<label class="choice"><input type="${t}" name="${f.name}" value="${v}" id="${id}-${i}"${t === 'radio' && i === 0 ? req : ''}><span class="choice__label">${l}</span></label>`)}</div>${err}</fieldset>`;
  }
  if (f.type === 'select') {
    return html`<div class="field" data-field="${f.name}" data-msg="${f.error || ''}"${sum}><label for="${id}">${f.label}</label>${help}
      <div class="select"><select id="${id}" name="${f.name}"${req} aria-describedby="${desc}"><option value="">Choose…</option>${(f.options || []).map(([v, l]) => html`<option value="${v}">${l}</option>`)}</select>${icon('chevron', { size: 18 })}</div>${err}</div>`;
  }
  if (f.type === 'textarea') {
    return html`<div class="field" data-field="${f.name}" data-msg="${f.error || ''}"${sum}><label for="${id}">${f.label}</label>${help}
      <textarea id="${id}" name="${f.name}" rows="6"${req}${f.min ? raw(` minlength="${f.min}"`) : ''}${f.max ? raw(` maxlength="${f.max}"`) : ''} aria-describedby="${desc}"></textarea>${err}</div>`;
  }
  if (f.type === 'checkbox') {
    return html`<div class="field field--check" data-field="${f.name}" data-msg="${f.error || ''}"><label class="choice choice--check"><input type="checkbox" id="${id}" name="${f.name}" value="yes"${req} aria-describedby="${desc}"><span class="choice__label">${md(f.label)}</span></label>${err}</div>`;
  }
  return html`<div class="field" data-field="${f.name}" data-msg="${f.error || ''}"${sum}><label for="${id}">${f.label}</label>${help}
    <input id="${id}" name="${f.name}" type="${f.type}"${req}${f.max ? raw(` maxlength="${f.max}"`) : ''}${f.name === 'phone' && f.phoneError ? raw(` data-phone-error="${f.phoneError.replace(/"/g, '&quot;')}"`) : ''}${f.autocomplete ? raw(` autocomplete="${f.autocomplete}"`) : ''} aria-describedby="${desc}">${err}</div>`;
}

/** @param {any} data @param {any} page */
export function quoteForm(data, page) {
  const steps = quoteSteps(data, page);
  const b = page?.buttons || {};
  const ready = page?.messages?.ready || {};
  const email = tok('EMAIL');
  return html`<form class="quote-form glass-card" name="quote" method="post" action="mailto:${email}?subject=Free%20quote%20request" enctype="text/plain" data-stepper data-email="${email}" data-label-next="${b.next || 'Next'}" data-label-back="${b.back || 'Back'}" data-label-copied="${b.copied || 'Copied'}">
  <ol class="stepper" data-stepper-progress>${steps.map((s, i) => html`<li data-step-label="${i}"${i === 0 ? raw(' class="is-current"') : ''}><span class="stepper__n">${i + 1}</span><span class="stepper__t">${s.title}</span></li>`)}</ol>
  <p class="vh" role="status" aria-live="polite" data-stepper-status></p>
  ${steps.map((s, i) => html`<fieldset class="step" data-step="${i}" id="step-${i + 1}">
    <legend class="step__legend"><span class="step__count">Step ${i + 1} of ${steps.length}</span> ${s.title}</legend>
    ${s.intro ? html`<p class="step__intro">${md(s.intro)}</p>` : ''}
    ${s.fields.map((f) => field(f, 'q'))}
    <div class="step__nav" data-step-nav></div>
  </fieldset>`)}
  <div class="quote-form__submit" data-submit-row><button class="btn btn--primary btn--lg" type="submit">${icon('mail', { size: 18 })}${b.submit || 'Create my email'}</button><p class="field__help">Opens your email app. Nothing is sent until you press send.</p></div>
  <div class="quote-ready" data-quote-ready hidden tabindex="-1">
    <span class="icon-tile icon-tile--success">${icon('check', { size: 24 })}</span>
    <h2>${ready.heading || 'Your email is ready to send'}</h2>
    <p>${md(ready.body || 'Your email app should now show your request. If nothing opened, copy the request below and email it to us.')}</p>
    <label for="q-summary" class="quote-ready__label">Your request</label>
    <textarea id="q-summary" readonly rows="11" data-quote-summary></textarea>
    <div class="quote-ready__actions">
      <button type="button" class="btn btn--primary" data-copy>${icon('copy', { size: 18 })}<span data-copy-label>${b.copy || 'Copy request'}</span></button>
      <a class="btn btn--secondary" href="mailto:${email}" data-mailto>${icon('mail', { size: 18 })}${b.reopen || 'Open email again'}</a>
      <button type="button" class="btn btn--plain" data-restart>${b.restart || 'Start over'}</button>
    </div>
  </div>
</form>`;
}
