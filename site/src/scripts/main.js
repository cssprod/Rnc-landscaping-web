// @ts-check
/* RNC Landscaping: progressive-enhancement islands. Every page works without this file. */

/* ---------- analytics (event names in event-schema.yaml; no-op unless a launch build turned Plausible on) ---------- */
const hasPlausible = !!document.querySelector('script[data-domain][src*="plausible"]');
if (hasPlausible) {
  // @ts-ignore queue stub documented by Plausible
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
}
/** Send an event. Props never carry personal data (only locations, services, areas, providers, steps). @param {string} name @param {Record<string, string|number>} [props] */
export function track(name, props) {
  // @ts-ignore
  const p = window.plausible;
  if (!hasPlausible || typeof p !== 'function') return;
  p(name, props && Object.keys(props).length ? { props } : {});
}
/** Older data-track names still emitted by some templates → current event names. */
const ALIAS = /** @type {Record<string, string>} */ ({ call_clicked: 'call_click', email_clicked: 'email_click', sms_clicked: 'sms_click' });
const WITH_LOCATION = new Set(['call_click', 'sms_click', 'email_click']);
document.addEventListener('click', (e) => {
  const a = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest?.('[data-track]'));
  if (!a) return;
  const raw = a.dataset.track || '';
  const ev = ALIAS[raw] || raw;
  if (WITH_LOCATION.has(ev)) track(ev, { location: a.dataset.trackLocation || 'unknown' });
  else if (ev === 'capability_statement_downloaded') track(ev);
});

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const DESKTOP = matchMedia('(min-width: 64em)');
const root = document.documentElement;

/* ---------- disclosure menus (Services, Service areas): buttons with aria-expanded, Esc closes ---------- */
/** @type {{ btn: HTMLButtonElement, panel: HTMLElement, item: HTMLElement }[]} */
const menus = [...document.querySelectorAll('[data-menu]')].map((item) => ({
  item: /** @type {HTMLElement} */ (item),
  btn: /** @type {HTMLButtonElement} */ (item.querySelector('[data-menu-toggle]')),
  panel: /** @type {HTMLElement} */ (item.querySelector('[data-menu-panel]')),
}));
/** @param {typeof menus[number]} m @param {boolean} open */
const setMenu = (m, open) => { m.btn.setAttribute('aria-expanded', String(open)); m.panel.classList.toggle('is-open', open); };
for (const m of menus) {
  m.btn.addEventListener('click', () => {
    const open = m.btn.getAttribute('aria-expanded') !== 'true';
    if (DESKTOP.matches) for (const o of menus) if (o !== m) setMenu(o, false);
    setMenu(m, open);
  });
  m.item.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && m.btn.getAttribute('aria-expanded') === 'true') { e.stopPropagation(); setMenu(m, false); m.btn.focus(); }
  });
  m.item.addEventListener('focusout', (e) => { const to = /** @type {Node|null} */ (e.relatedTarget); if (DESKTOP.matches && (!to || !m.item.contains(to))) setMenu(m, false); });
}
document.addEventListener('click', (e) => { if (DESKTOP.matches) for (const m of menus) if (!m.item.contains(/** @type {Node} */ (e.target))) setMenu(m, false); });

/* ---------- mobile sheet nav: inert background, Esc closes, focus returns to the toggle ---------- */
const header = /** @type {HTMLElement|null} */ (document.querySelector('[data-header]'));
const toggle = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-nav-toggle]'));
const nav = document.getElementById('site-nav');
if (header && toggle && nav) {
  const label = /** @type {HTMLElement|null} */ (toggle.querySelector('.nav-toggle__label'));
  const outside = () => /** @type {HTMLElement[]} */ ([...document.body.children]).filter((el) => el !== header && el.tagName !== 'SCRIPT' && !el.classList.contains('sprite'));
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  const set = (/** @type {boolean} */ open, returnFocus = false) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    if (label) label.textContent = open ? 'Close' : 'Menu';
    nav.classList.toggle('is-open', open);
    root.classList.toggle('nav-open', open);
    for (const el of outside()) el.inert = open;
    if (!open) for (const m of menus) setMenu(m, false);
    if (!open && returnFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => set(!isOpen(), true));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) set(false, true); });
  // A link inside the sheet (same-page anchors included) closes it.
  nav.addEventListener('click', (e) => { if (/** @type {HTMLElement} */ (e.target).closest('a') && isOpen()) set(false); });
  DESKTOP.addEventListener('change', () => { if (isOpen()) set(false); });
}

/* ---------- sticky action bar: hidden while the quote form is in view or the on-screen keyboard is open ---------- */
const bar = /** @type {HTMLElement|null} */ (document.querySelector('[data-action-bar]'));
if (bar) {
  let formInView = false, typing = false;
  const sync = () => {
    const hide = formInView || typing;
    bar.classList.toggle('is-hidden', hide);
    bar.inert = hide;
  };
  const form = document.querySelector('[data-quote-form], form[data-stepper], .quote-form');
  if (form && 'IntersectionObserver' in window) new IntersectionObserver(([en]) => { formInView = en.isIntersecting; sync(); }).observe(form);
  const field = (/** @type {EventTarget|null} */ t) => t instanceof HTMLElement && t.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select, [contenteditable]');
  document.addEventListener('focusin', (e) => { if (field(e.target)) { typing = true; sync(); } });
  document.addEventListener('focusout', (e) => { if (field(e.target)) { typing = false; sync(); } });
  const vv = window.visualViewport;
  if (vv) vv.addEventListener('resize', () => { typing = innerHeight - vv.height > 150 || field(document.activeElement); sync(); });
}

/* ---------- portfolio filters (no-JS: the form submits; with JS: in place, with a View Transition where supported) ---------- */
const filters = /** @type {HTMLFormElement|null} */ (document.querySelector('[data-filters]'));
if (filters) {
  const grid = document.querySelector('[data-project-grid]');
  const cards = /** @type {HTMLElement[]} */ ([...(grid?.children || [])]);
  const count = /** @type {HTMLElement} */ (filters.querySelector('[data-filters-count]'));
  const empty = /** @type {HTMLElement|null} */ (document.querySelector('[data-filters-empty]'));
  const area = /** @type {HTMLSelectElement} */ (filters.elements.namedItem('area'));
  const service = () => /** @type {HTMLInputElement|null} */ (filters.querySelector('input[name=service]:checked'))?.value || '';
  const q = new URLSearchParams(location.search);
  const qs = q.get('service');
  if (qs) { const r = /** @type {HTMLInputElement|null} */ (filters.querySelector(`input[name=service][value="${CSS.escape(qs)}"]`)); if (r) r.checked = true; }
  if (q.get('area')) area.value = q.get('area') || '';
  const apply = () => {
    const s = service(), a = area.value;
    let n = 0;
    for (const c of cards) { const show = (!s || c.dataset.service === s) && (!a || c.dataset.area === a); c.hidden = !show; if (show) n++; }
    count.textContent = `${n} project${n === 1 ? '' : 's'} shown`;
    if (empty) empty.hidden = n > 0;
    const u = new URL(location.href); s ? u.searchParams.set('service', s) : u.searchParams.delete('service'); a ? u.searchParams.set('area', a) : u.searchParams.delete('area');
    history.replaceState(null, '', u);
  };
  const run = () => {
    // @ts-ignore startViewTransition is not in every lib.dom yet
    if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(apply); else apply();
  };
  filters.addEventListener('change', run);
  filters.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  apply();
}

/* ---------- before / after ---------- */
for (const ba of document.querySelectorAll('[data-ba]')) {
  const range = /** @type {HTMLInputElement} */ (ba.querySelector('[data-ba-range]'));
  const set = () => { /** @type {HTMLElement} */ (ba).style.setProperty('--pos', `${range.value}%`); range.setAttribute('aria-valuetext', `${100 - Number(range.value)}% after image shown`); };
  ba.classList.add('is-enhanced');
  range.addEventListener('input', set);
  set();
}

/* ---------- legacy quote stepper (current /free-quote/ markup). The quote builder stream replaces this with
   src/scripts/quote.js; delete from here down once the page no longer renders form[data-stepper]. ---------- */
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
const quote = /** @type {HTMLFormElement|null} */ (document.querySelector('form[data-stepper]'));
if (quote) {
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
