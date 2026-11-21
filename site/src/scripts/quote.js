// @ts-check
/* Quote stepper: builds an email, nothing is sent from this site. Self-initialising: does nothing on a page without
   form[data-stepper] / form[data-quote-form] steps. Loaded by main.js in W1 and by /free-quote/'s scripts: ['quote']
   (CONTRACT §12); the quote stream replaces it with the six-input builder in W2. */
import { track } from './lib/track.js';

/* ---------- form validation helpers ---------- */
/** @param {Element} f */
function fieldValid(f) {
  const wrap = /** @type {HTMLElement} */ (f);
  const err = /** @type {HTMLElement|null} */ (wrap.querySelector('.field__error'));
  const errText = /** @type {HTMLElement|null} */ (err?.querySelector('span') || err);
  /** @type {string|null} */ let msg = null;
  const gate = /** @type {HTMLElement|null} */ (wrap.closest('[data-show-when]'));
  if (gate?.hidden) { if (err) err.hidden = true; return true; }
  if (wrap.hasAttribute('data-any')) {
    const boxes = /** @type {HTMLInputElement[]} */ ([...wrap.querySelectorAll('input')]);
    if (!boxes.some((b) => b.checked)) msg = wrap.dataset.msg || 'Choose at least one option.';
  } else {
    const inputs = /** @type {(HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement)[]} */ ([...wrap.querySelectorAll('input, select, textarea')]);
    const bad = inputs.find((i) => !i.checkValidity());
    if (bad) msg = (bad.validity.valueMissing && wrap.dataset.msg) || (bad.validity.tooShort && wrap.dataset.msg) || (bad.validity.typeMismatch ? (bad.type === 'email' ? 'Enter an email address like name@example.ca.' : bad.validationMessage) : wrap.dataset.msg) || bad.validationMessage;
    inputs.forEach((i) => i.setAttribute('aria-invalid', String(!!bad)));
  }
  if (err && errText) { err.hidden = !msg; if (msg) errText.textContent = msg; }
  wrap.classList.toggle('has-error', !!msg);
  return !msg;
}
/** Conditional fields (data-show-when="name=value") and the phone-needed rule. @param {HTMLFormElement} form */
function conditionals(form) {
  const gates = /** @type {HTMLElement[]} */ ([...form.querySelectorAll('[data-show-when]')]);
  const sync = () => {
    for (const g of gates) {
      const [k, v] = (g.dataset.showWhen || '=').split('=');
      const ctl = /** @type {HTMLInputElement|null} */ (form.elements.namedItem(k));
      const on = ctl?.value === v;
      g.hidden = !on;
      for (const i of /** @type {HTMLInputElement[]} */ ([...g.querySelectorAll('input')])) i.required = on;
    }
  };
  form.addEventListener('change', sync); sync();
  const phone = /** @type {HTMLInputElement|null} */ (form.querySelector('[data-phone-error]'));
  if (phone) {
    const pref = () => /** @type {HTMLInputElement|null} */ (form.querySelector('input[name=contactPreference]:checked'))?.value;
    const rule = () => { phone.required = pref() === 'phone'; };
    form.addEventListener('change', rule); rule();
    const f = /** @type {HTMLElement} */ (phone.closest('[data-field]'));
    if (f) f.dataset.msg = phone.dataset.phoneError || '';
  }
}
/** @param {Element} root */
const validateAll = (root) => {
  const fields = [...root.querySelectorAll('[data-field]')];
  const bad = fields.filter((f) => !fieldValid(f));
  if (bad[0]) /** @type {HTMLElement|null} */ (bad[0].querySelector('input, select, textarea'))?.focus();
  return bad.length === 0;
};
/** Re-validate a field once it has shown an error. @param {HTMLFormElement} form */
function liveFix(form) {
  form.addEventListener('input', (e) => { const f = /** @type {HTMLElement} */ (e.target).closest('[data-field]'); if (f?.classList.contains('has-error')) fieldValid(f); });
  form.addEventListener('change', (e) => { const f = /** @type {HTMLElement} */ (e.target).closest('[data-field]'); if (f?.classList.contains('has-error')) fieldValid(f); });
}

/* ---------- quote stepper: builds an email, nothing is sent from this site ---------- */
const quote = /** @type {HTMLFormElement|null} */ (document.querySelector('form[data-stepper], form[data-quote-form]'));
if (quote && quote.querySelector('[data-step]')) {
  quote.noValidate = true; liveFix(quote); conditionals(quote);
  const steps = /** @type {HTMLFieldSetElement[]} */ ([...quote.querySelectorAll('[data-step]')]);
  const progress = /** @type {HTMLElement} */ (quote.querySelector('[data-stepper-progress]'));
  const status = /** @type {HTMLElement} */ (quote.querySelector('[data-stepper-status]'));
  const submitRow = /** @type {HTMLElement} */ (quote.querySelector('[data-submit-row]'));
  const ready = /** @type {HTMLElement} */ (quote.querySelector('[data-quote-ready]'));
  const summary = /** @type {HTMLTextAreaElement} */ (quote.querySelector('[data-quote-summary]'));
  const mailto = /** @type {HTMLAnchorElement} */ (quote.querySelector('[data-mailto]'));
  const to = /^\[/.test(quote.dataset.email || '') ? '' : (quote.dataset.email || '');
  let current = 0, started = false;
  const pre = new URLSearchParams(location.search).get('service');
  if (pre) { const r = /** @type {HTMLInputElement|null} */ (quote.querySelector(`input[name=services][value="${CSS.escape(pre)}"], input[name=service][value="${CSS.escape(pre)}"]`)); if (r) r.checked = true; }
  quote.classList.add('is-stepped');
  const show = (/** @type {number} */ i, /** @type {boolean} */ focus) => {
    current = i;
    steps.forEach((s, n) => { s.hidden = n !== i; });
    [...progress.children].forEach((li, n) => { li.classList.toggle('is-current', n === i); li.classList.toggle('is-done', n < i); n === i ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current'); });
    submitRow.hidden = i !== steps.length - 1;
    status.textContent = `Step ${i + 1} of ${steps.length}: ${steps[i].querySelector('legend')?.textContent?.replace(/^\s*Step \d+ of \d+\s*/, '')}`;
    if (focus) { const l = /** @type {HTMLElement} */ (steps[i].querySelector('legend')); l.tabIndex = -1; l.focus(); }
  };
  steps.forEach((s, i) => {
    const navRow = /** @type {HTMLElement} */ (s.querySelector('[data-step-nav]'));
    if (i < steps.length - 1) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn--primary'; b.textContent = quote.dataset.labelNext || 'Next'; b.dataset.next = '';
      b.addEventListener('click', () => { if (validateAll(s)) { track('quote_step_completed', { step: i + 1 }); show(i + 1, true); } });
      navRow.append(b);
    }
    if (i > 0) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn--secondary'; b.textContent = quote.dataset.labelBack || 'Back'; b.addEventListener('click', () => show(i - 1, true)); navRow.append(b); }
  });
  quote.addEventListener('focusin', () => { if (!started) { started = true; track('quote_started'); } }, { once: true });
  quote.addEventListener('keydown', (e) => { // Enter in a text input moves forward instead of submitting early
    const t = /** @type {HTMLElement} */ (e.target);
    if (e.key === 'Enter' && t.tagName === 'INPUT' && current < steps.length - 1) { e.preventDefault(); /** @type {HTMLButtonElement} */ (steps[current].querySelector('[data-next]')).click(); }
  });

  /** Plain-text request built from the visible labels of every answered field. */
  const compose = () => {
    const lines = ['Free quote request', ''];
    let subjectSvc = '', subjectArea = '';
    for (const f of /** @type {HTMLElement[]} */ ([...quote.querySelectorAll('[data-field]')])) {
      if (f.closest('[data-show-when]')?.hasAttribute('hidden')) continue;
      const label = f.dataset.summary || '';
      const picked = /** @type {HTMLInputElement[]} */ ([...f.querySelectorAll('input:checked')]).map((i) => i.closest('label')?.querySelector('.choice__label')?.textContent?.trim() || i.value);
      const sel = /** @type {HTMLSelectElement|null} */ (f.querySelector('select'));
      const txt = /** @type {HTMLInputElement|HTMLTextAreaElement|null} */ (f.querySelector('input:not([type=radio]):not([type=checkbox]), textarea'));
      const value = picked.length ? picked.join(', ') : sel ? (sel.value ? sel.selectedOptions[0].textContent?.trim() || '' : '') : (txt?.value.trim() || '');
      if (!value) continue;
      if (/^(services|service)$/.test(f.dataset.field || '')) subjectSvc = value;
      if (f.dataset.field === 'area') subjectArea = value;
      if (f.dataset.field === 'areaOther') subjectArea = value;
      if (txt?.tagName === 'TEXTAREA') lines.push('', `${label}:`, value, '');
      else lines.push(`${label}: ${value}`);
    }
    lines.push('', 'Sent from the quote form on the RNC Landscaping website.');
    const subject = `Free quote request${subjectSvc ? `: ${subjectSvc}` : ''}${subjectArea ? ` in ${subjectArea}` : ''}`;
    return { subject, body: lines.join('\n').replace(/\n{3,}/g, '\n\n') };
  };

  let sent = false;
  quote.addEventListener('submit', (e) => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) if (!validateAll(steps[i])) { show(i, false); validateAll(steps[i]); return; }
    const { subject, body } = compose();
    const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    summary.value = `Subject: ${subject}\n\n${body}`;
    mailto.href = href;
    if (!sent) track('quote_step_completed', { step: steps.length });
    sent = true;
    track('quote_submitted', { service: /** @type {any} */ ((/** @type {HTMLInputElement[]} */ ([...quote.querySelectorAll('input[name=services]:checked, input[name=service]:checked')])).length === 1 ? /** @type {HTMLInputElement} */ (quote.querySelector('input[name=services]:checked, input[name=service]:checked')).value : 'not-sure') });
    steps.forEach((s) => { s.hidden = true; });
    progress.hidden = true; submitRow.hidden = true; ready.hidden = false;
    ready.focus();
    location.href = href;
  });
  quote.querySelector('[data-copy]')?.addEventListener('click', async (e) => {
    const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
    const lab = /** @type {HTMLElement} */ (btn.querySelector('[data-copy-label]'));
    const was = lab.textContent;
    try { await navigator.clipboard.writeText(summary.value); lab.textContent = quote.dataset.labelCopied || 'Copied'; }
    catch { summary.select(); }
    setTimeout(() => { lab.textContent = was; }, 2000);
  });
  quote.querySelector('[data-restart]')?.addEventListener('click', () => {
    quote.reset(); sent = false; ready.hidden = true; progress.hidden = false;
    quote.querySelectorAll('[data-show-when]').forEach((g) => { /** @type {HTMLElement} */ (g).hidden = true; });
    show(0, true);
  });
  show(0, false);
}
