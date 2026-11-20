// @ts-check
/**
 * Netlify Forms: 4-step quote form and short contact form.
 * Field names are fixed: Netlify registers them at deploy time and the
 * Google Sheet script maps them to columns. Labels, help text and error
 * messages can be overridden from content/pages/quote.json "steps"
 * ([{ title, intro, fields: [{ name, label, help, error }] }]).
 * Without JS the form renders as one long form with native validation.
 */
import { html, raw, md } from '../lib/html.mjs';
import { site } from '../../site.config.mjs';

/**
 * @typedef {{ name: string, type: string, label: string, help?: string, error?: string, required?: boolean, options?: [string,string][], autocomplete?: string, min?: number }} Field
 * @typedef {{ title: string, intro?: string, fields: Field[] }} Step
 */

/** @param {any} data @returns {Step[]} */
function defaultSteps(data) {
  const svc = site.services.map((s) => /** @type {[string,string]} */ ([s, data.services[s]?.name || s]));
  const areas = site.areas.map((a) => /** @type {[string,string]} */ ([a, data.areas[a]?.name || a]));
  return [
    { title: 'Service and property', intro: 'Pick the closest match. You can add detail later.', fields: [
      { name: 'service', type: 'radio', label: 'What do you need help with?', required: true, error: 'Choose a service, or "Not sure yet".', options: [...svc, ['not-sure', 'Not sure yet']] },
      { name: 'property_type', type: 'radio', label: 'Property type', required: true, error: 'Choose the type of property.', options: [['house', 'House or townhouse'], ['strata', 'Strata complex'], ['commercial', 'Commercial property'], ['institutional', 'Institutional or public site'], ['other', 'Other']] },
    ] },
    { title: 'Location and timing', fields: [
      { name: 'area', type: 'select', label: 'Municipality', required: true, error: 'Choose the municipality where the work is.', options: [...areas, ['other', 'Somewhere else nearby']] },
      { name: 'location', type: 'text', label: 'Street or neighbourhood', help: 'Optional. Helps us plan a site visit.', autocomplete: 'street-address' },
      { name: 'timing', type: 'radio', label: 'When would you like work to start?', required: true, error: 'Choose a timeframe.', options: [['asap', 'As soon as possible'], ['1-3-months', 'In the next 1 to 3 months'], ['this-season', 'Later this season'], ['flexible', 'Flexible or planning ahead']] },
    ] },
    { title: 'Project details', fields: [
      { name: 'details', type: 'textarea', label: 'Describe the work', required: true, min: 20, help: 'Size of the area, what is there now, what you would like, and anything we should know about access.', error: 'Add a short description (at least 20 characters).' },
      { name: 'photos', type: 'files', label: 'Photos (optional)', help: `Up to ${site.upload.maxFiles} photos, JPG, PNG, HEIC or WebP, ${site.upload.maxFileMB} MB each and ${site.upload.maxTotalMB} MB in total.`, error: 'Check the photo limits.' },
    ] },
    { title: 'Your contact details', fields: [
      { name: 'name', type: 'text', label: 'Your name', required: true, autocomplete: 'name', error: 'Enter your name.' },
      { name: 'email', type: 'email', label: 'Email', required: true, autocomplete: 'email', error: 'Enter an email address like name@example.ca.' },
      { name: 'phone', type: 'tel', label: 'Phone', help: 'Optional, if you prefer a call.', autocomplete: 'tel' },
      { name: 'organization', type: 'text', label: 'Strata, company or organization', help: 'Optional.', autocomplete: 'organization' },
      { name: 'consent', type: 'checkbox', label: 'I agree that RNC Landscaping may contact me about this request and store these details as described in the privacy policy.', required: true, error: 'Please agree so we can reply to you.' },
    ] },
  ];
}

/** Convert one field from content/pages/quote.json into the internal Field shape. @param {any} f @returns {Field & {showWhen?: string}} */
function fromContent(f) {
  const u = site.upload;
  const type = f.type === 'checkbox-group' ? 'checks' : f.type === 'file' ? 'files' : f.type;
  const err = f.errors?.required || f.errors?.format || '';
  return {
    name: f.name, type, label: f.label, help: f.type === 'file' ? `Up to ${u.maxFiles} photos, JPG, PNG, HEIC or WebP, ${u.maxFileMB} MB each and ${u.maxTotalMB} MB in total.` : f.help,
    error: err, required: !!f.required, min: f.minLength, autocomplete: f.autocomplete,
    options: (f.options || []).map((/** @type {any} */ o) => /** @type {[string,string]} */ ([o.value, o.label])),
    showWhen: f.requiredWhen ? Object.entries(f.requiredWhen).map(([k, v]) => `${k}=${v}`)[0] : undefined,
    ...(f.errors?.phoneNeeded ? { phoneError: f.errors.phoneNeeded } : {}),
  };
}

/** Steps from content/pages/quote.json when present, else built-in defaults. @param {any} data @param {any} page */
export function quoteSteps(data, page) {
  if (Array.isArray(page?.steps) && page.steps.length && page.steps[0]?.fields?.[0]?.name) {
    const out = page.steps.map((/** @type {any} */ st) => ({ title: st.title, intro: st.intro, fields: st.fields.map(fromContent) }));
    const all = out.flatMap((/** @type {any} */ x) => x.fields);
    const pn = all.find((/** @type {any} */ f) => f.phoneError)?.phoneError;
    const ph = all.find((/** @type {any} */ f) => f.name === 'phone');
    if (ph && pn) ph.phoneError = pn;
    return out;
  }
  const steps = defaultSteps(data);
  const custom = Array.isArray(page?.steps) ? page.steps : [];
  steps.forEach((st, i) => {
    const c = custom[i];
    if (!c) return;
    if (c.title) st.title = c.title;
    if (c.intro) st.intro = c.intro;
    for (const f of st.fields) {
      const cf = (c.fields || []).find((/** @type {any} */ x) => x.name === f.name);
      if (cf) for (const k of /** @type {const} */ (['label', 'help', 'error'])) if (cf[k]) f[k] = cf[k];
    }
  });
  return steps;
}

/** @param {Field & {showWhen?: string, phoneError?: string}} f @param {string} pre */
function field(f, pre) {
  const inner = field0(f, pre);
  if (!f.showWhen) return inner;
  return html`<div data-show-when="${f.showWhen}">${inner}</div>`;
}

/** @param {Field & {phoneError?: string}} f @param {string} pre */
function field0(f, pre) {
  const id = `${pre}-${f.name}`;
  const req = f.required ? raw(' required') : '';
  const desc = [f.help ? `${id}-help` : '', `${id}-error`].filter(Boolean).join(' ');
  const help = f.help ? html`<p class="field__help" id="${id}-help">${f.help}</p>` : '';
  const err = html`<p class="field__error" id="${id}-error" data-error-for="${f.name}" hidden>${f.error || 'Check this field.'}</p>`;
  const reqMark = f.required ? html`<span class="field__req"> (required)</span>` : '';
  if (f.type === 'radio') {
    return html`<fieldset class="field field--choices" data-field="${f.name}" data-msg="${f.error || ''}" aria-describedby="${desc}">
      <legend>${f.label}${reqMark}</legend>${help}
      <div class="choices">${(f.options || []).map(([v, l], i) => html`<label class="choice"><input type="radio" name="${f.name}" value="${v}" id="${id}-${i}"${i === 0 ? req : ''}><span>${l}</span></label>`)}</div>${err}</fieldset>`;
  }
  if (f.type === 'checks') {
    return html`<fieldset class="field field--choices" data-field="${f.name}" data-any data-msg="${f.error || ''}" aria-describedby="${desc}">
      <legend>${f.label}${reqMark}</legend>${help}
      <div class="choices">${(f.options || []).map(([v, l], i) => html`<label class="choice"><input type="checkbox" name="${f.name}" value="${v}" id="${id}-${i}"><span>${l}</span></label>`)}</div>${err}</fieldset>`;
  }
  if (f.type === 'select') {
    return html`<div class="field" data-field="${f.name}" data-msg="${f.error || ''}"><label for="${id}">${f.label}${reqMark}</label>${help}
      <select id="${id}" name="${f.name}"${req} aria-describedby="${desc}"><option value="">Choose…</option>${(f.options || []).map(([v, l]) => html`<option value="${v}">${l}</option>`)}</select>${err}</div>`;
  }
  if (f.type === 'textarea') {
    return html`<div class="field" data-field="${f.name}" data-msg="${f.error || ''}"><label for="${id}">${f.label}${reqMark}</label>${help}
      <textarea id="${id}" name="${f.name}" rows="6"${req}${f.min ? raw(` minlength="${f.min}"`) : ''} aria-describedby="${desc}"></textarea>${err}</div>`;
  }
  if (f.type === 'files') {
    const u = site.upload;
    return html`<fieldset class="field field--files" data-field="photos" data-files data-max-files="${u.maxFiles}" data-max-mb="${u.maxFileMB}" data-max-total-mb="${u.maxTotalMB}" aria-describedby="${desc}">
      <legend>${f.label}</legend>${help}
      ${Array.from({ length: u.maxFiles }, (_, i) => html`<div class="file-row"><label for="${pre}-photo${i + 1}">Photo ${i + 1}</label><input type="file" id="${pre}-photo${i + 1}" name="photo${i + 1}" accept="${u.accept}"></div>`)}
      ${err}</fieldset>`;
  }
  if (f.type === 'checkbox') {
    return html`<div class="field field--check" data-field="${f.name}" data-msg="${f.error || ''}"><label class="choice choice--check"><input type="checkbox" id="${id}" name="${f.name}" value="yes"${req} aria-describedby="${desc}"><span>${md(f.label.includes('](') ? f.label : f.label.replace('privacy policy', '[privacy policy](/privacy/)'))}</span></label>${err}</div>`;
  }
  return html`<div class="field" data-field="${f.name}" data-msg="${f.error || ''}"><label for="${id}">${f.label}${reqMark}</label>${help}
    <input id="${id}" name="${f.name}" type="${f.type}"${req}${f.name === 'phone' && f.phoneError ? raw(` data-phone-error="${f.phoneError.replace(/"/g, '&quot;')}"`) : ''}${f.autocomplete ? raw(` autocomplete="${f.autocomplete}"`) : ''} aria-describedby="${desc}">${err}</div>`;
}

/** @param {any} data @param {any} page */
export function quoteForm(data, page) {
  const steps = quoteSteps(data, page);
  return html`<form class="quote-form" name="quote" method="POST" action="/quote/thanks/" enctype="multipart/form-data" data-netlify="true" netlify-honeypot="bot-field" data-stepper data-label-next="${page?.buttons?.next || 'Continue'}" data-label-back="${page?.buttons?.back || 'Back'}">
  <input type="hidden" name="form-name" value="quote">
  <p class="hp" aria-hidden="true"><label>Leave this field empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
  <ol class="stepper__progress" data-stepper-progress hidden>${steps.map((s, i) => html`<li data-step-label="${i}"><span class="stepper__n">${i + 1}</span> <span class="stepper__t">${s.title}</span></li>`)}</ol>
  <p class="vh" role="status" aria-live="polite" data-stepper-status></p>
  ${steps.map((s, i) => html`<fieldset class="step" data-step="${i}" id="step-${i + 1}">
    <legend class="step__legend"><span class="step__count">Step ${i + 1} of ${steps.length}</span> ${s.title}</legend>
    ${s.intro ? html`<p class="step__intro">${s.intro}</p>` : ''}
    ${s.fields.map((f) => field(f, 'q'))}
    <div class="step__nav" data-step-nav></div>
  </fieldset>`)}
  <div class="quote-form__submit" data-submit-row><button class="btn btn--accent btn--lg" type="submit">${page?.buttons?.submit || 'Send quote request'}</button><p class="field__help">Free and no obligation. We reply to arrange next steps.</p></div>
</form>`;
}

export function contactForm() {
  /** @type {Field[]} */
  const fields = [
    { name: 'name', type: 'text', label: 'Your name', required: true, autocomplete: 'name', error: 'Enter your name.' },
    { name: 'email', type: 'email', label: 'Email', required: true, autocomplete: 'email', error: 'Enter an email address like name@example.ca.' },
    { name: 'phone', type: 'tel', label: 'Phone', help: 'Optional.', autocomplete: 'tel' },
    { name: 'message', type: 'textarea', label: 'Message', required: true, min: 10, error: 'Add a short message (at least 10 characters).' },
  ];
  return html`<form class="contact-form" name="contact" method="POST" action="/quote/thanks/" data-netlify="true" netlify-honeypot="bot-field" data-validate>
  <input type="hidden" name="form-name" value="contact">
  <p class="hp" aria-hidden="true"><label>Leave this field empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
  ${fields.map((f) => field(f, 'c'))}
  <button class="btn btn--accent" type="submit">Send message</button>
</form>`;
}
