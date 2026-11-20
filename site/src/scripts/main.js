// @ts-check
/* RNC Landscaping: progressive-enhancement islands. Everything works without this file. */

/* ---------- analytics (typed by event-schema.yaml) ---------- */
/** @typedef {import('../../event-schema').AnalyticsEvents} AnalyticsEvents */
const hasPlausible = !!document.querySelector('script[data-domain][src*="plausible"]');
if (hasPlausible) {
  // @ts-ignore queue stub documented by Plausible
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
}
/**
 * Send a custom event. No-ops when Plausible is not loaded (all non-production builds).
 * @template {keyof AnalyticsEvents} K
 * @param {K} name @param {AnalyticsEvents[K]} [props] @param {() => void} [cb]
 */
export function track(name, props, cb) {
  // @ts-ignore
  const p = window.plausible;
  if (!hasPlausible || typeof p !== 'function') { cb?.(); return; }
  const opts = /** @type {any} */ (props && Object.keys(props).length ? { props } : {});
  if (cb) { let done = false; const fin = () => { if (!done) { done = true; cb(); } }; opts.callback = fin; setTimeout(fin, 600); }
  p(name, opts);
}
document.addEventListener('click', (e) => {
  const pdf = /** @type {HTMLAnchorElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('a[href$="capability-statement.pdf"]'));
  if (pdf && !pdf.dataset.track) track('capability_statement_downloaded');
  const a = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-track]'));
  if (!a) return;
  const ev = a.dataset.track;
  const location = a.dataset.trackLocation || 'unknown';
  if (ev === 'call_clicked') track('call_clicked', { location });
  else if (ev === 'email_clicked') track('email_clicked', { location });
  else if (ev === 'capability_statement_downloaded') track('capability_statement_downloaded');
});

/* ---------- mobile nav ---------- */
const toggle = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-nav-toggle]'));
const nav = document.getElementById('site-nav');
if (toggle && nav) {
  const set = (/** @type {boolean} */ open) => { toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); document.body.classList.toggle('nav-open', open); };
  toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { set(false); toggle.focus(); } });
  matchMedia('(min-width: 1240px)').addEventListener('change', () => set(false));
}

/* ---------- mega-menu (disclosure pattern) ---------- */
for (const item of document.querySelectorAll('[data-mega]')) {
  const btn = /** @type {HTMLButtonElement} */ (item.querySelector('[data-mega-toggle]'));
  const panel = /** @type {HTMLElement} */ (item.querySelector('[data-mega-panel]'));
  const set = (/** @type {boolean} */ open) => { btn.setAttribute('aria-expanded', String(open)); panel.classList.toggle('is-open', open); };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  item.addEventListener('keydown', (e) => {
    if (/** @type {KeyboardEvent} */ (e).key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { e.stopPropagation(); set(false); btn.focus(); }
  });
  item.addEventListener('focusout', (e) => { const to = /** @type {FocusEvent} */ (e).relatedTarget; if (!to || !item.contains(/** @type {Node} */ (to))) set(false); });
  document.addEventListener('click', (e) => { if (!item.contains(/** @type {Node} */ (e.target))) set(false); });
}

/* ---------- portfolio filters ---------- */
const filters = /** @type {HTMLFormElement|null} */ (document.querySelector('[data-filters]'));
if (filters) {
  const grid = document.querySelector('[data-project-grid]');
  const cards = /** @type {HTMLElement[]} */ ([...(grid?.children || [])]);
  const count = /** @type {HTMLElement} */ (filters.querySelector('[data-filters-count]'));
  const empty = /** @type {HTMLElement|null} */ (document.querySelector('[data-filters-empty]'));
  const sel = (/** @type {string} */ n) => /** @type {HTMLSelectElement} */ (filters.elements.namedItem(n));
  const q = new URLSearchParams(location.search);
  if (q.get('service')) sel('service').value = q.get('service') || '';
  if (q.get('area')) sel('area').value = q.get('area') || '';
  const apply = () => {
    const s = sel('service').value, a = sel('area').value;
    let n = 0;
    for (const c of cards) { const show = (!s || c.dataset.service === s) && (!a || c.dataset.area === a); c.hidden = !show; if (show) n++; }
    count.textContent = `${n} project${n === 1 ? '' : 's'} shown`;
    if (empty) empty.hidden = n > 0;
    const u = new URL(location.href); s ? u.searchParams.set('service', s) : u.searchParams.delete('service'); a ? u.searchParams.set('area', a) : u.searchParams.delete('area');
    history.replaceState(null, '', u);
  };
  filters.querySelector('[data-filters-submit]')?.setAttribute('hidden', '');
  filters.addEventListener('change', apply);
  filters.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  apply();
}

/* ---------- before / after slider ---------- */
for (const ba of document.querySelectorAll('[data-ba]')) {
  const range = /** @type {HTMLInputElement} */ (ba.querySelector('[data-ba-range]'));
  const set = () => { /** @type {HTMLElement} */ (ba).style.setProperty('--pos', `${range.value}%`); range.setAttribute('aria-valuetext', `${100 - Number(range.value)}% after image shown`); };
  ba.classList.add('is-enhanced');
  range.addEventListener('input', set);
  set();
}

/* ---------- form validation helpers ---------- */
/** @param {Element} f */
function fieldValid(f) {
  const wrap = /** @type {HTMLElement} */ (f);
  const err = /** @type {HTMLElement|null} */ (wrap.querySelector('.field__error'));
  /** @type {string|null} */ let msg = null;
  const gate = /** @type {HTMLElement|null} */ (wrap.closest('[data-show-when]'));
  if (gate?.hidden) { if (err) err.hidden = true; return true; }
  if (wrap.hasAttribute('data-files')) msg = checkFiles(wrap);
  else if (wrap.hasAttribute('data-any')) {
    const boxes = /** @type {HTMLInputElement[]} */ ([...wrap.querySelectorAll('input')]);
    if (!boxes.some((b) => b.checked)) msg = wrap.dataset.msg || 'Choose at least one option.';
  } else {
    const inputs = /** @type {(HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement)[]} */ ([...wrap.querySelectorAll('input, select, textarea')]);
    const bad = inputs.find((i) => !i.checkValidity());
    if (bad) msg = wrap.dataset.msg || bad.validationMessage;
    inputs.forEach((i) => i.setAttribute('aria-invalid', String(!!bad)));
  }
  if (err) { err.hidden = !msg; if (msg) err.textContent = msg; }
  wrap.classList.toggle('has-error', !!msg);
  return !msg;
}
/** @param {HTMLElement} wrap */
function checkFiles(wrap) {
  const maxMb = Number(wrap.dataset.maxMb), maxTotal = Number(wrap.dataset.maxTotalMb);
  const ok = /\.(jpe?g|png|heic|heif|webp)$/i;
  let total = 0;
  for (const i of /** @type {HTMLInputElement[]} */ ([...wrap.querySelectorAll('input[type=file]')])) {
    const file = i.files?.[0];
    i.setAttribute('aria-invalid', 'false');
    if (!file) continue;
    if (!ok.test(file.name)) { i.setAttribute('aria-invalid', 'true'); return `${file.name} is not a JPG, PNG, HEIC or WebP image.`; }
    if (file.size > maxMb * 1048576) { i.setAttribute('aria-invalid', 'true'); return `${file.name} is larger than ${maxMb} MB. Choose a smaller photo.`; }
    total += file.size;
  }
  if (total > maxTotal * 1048576) return `Photos add up to more than ${maxTotal} MB. Remove one or use smaller photos.`;
  return null;
}
/** Conditional fields (data-show-when="name=value") and phone-needed rule. @param {HTMLFormElement} form */
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
    const rule = () => phone.required = pref() === 'phone';
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
  form.addEventListener('change', (e) => { const f = /** @type {HTMLElement} */ (e.target).closest('[data-field]'); if (f && (f.classList.contains('has-error') || f.hasAttribute('data-files'))) fieldValid(f); });
}

for (const form of /** @type {NodeListOf<HTMLFormElement>} */ (document.querySelectorAll('form[data-validate]'))) {
  form.noValidate = true; liveFix(form);
  form.addEventListener('submit', (e) => { if (!validateAll(form)) e.preventDefault(); });
}

/* ---------- quote stepper ---------- */
const quote = /** @type {HTMLFormElement|null} */ (document.querySelector('form[data-stepper]'));
if (quote) {
  quote.noValidate = true; liveFix(quote); conditionals(quote);
  const steps = /** @type {HTMLFieldSetElement[]} */ ([...quote.querySelectorAll('[data-step]')]);
  const progress = /** @type {HTMLElement} */ (quote.querySelector('[data-stepper-progress]'));
  const status = /** @type {HTMLElement} */ (quote.querySelector('[data-stepper-status]'));
  const submitRow = /** @type {HTMLElement} */ (quote.querySelector('[data-submit-row]'));
  let current = 0, started = false;
  const pre = new URLSearchParams(location.search).get('service');
  if (pre) { const r = /** @type {HTMLInputElement|null} */ (quote.querySelector(`input[name=services][value="${CSS.escape(pre)}"], input[name=service][value="${CSS.escape(pre)}"]`)); if (r) r.checked = true; }
  progress.hidden = false;
  const show = (/** @type {number} */ i, /** @type {boolean} */ focus) => {
    current = i;
    steps.forEach((s, n) => { s.hidden = n !== i; });
    [...progress.children].forEach((li, n) => { li.classList.toggle('is-current', n === i); li.classList.toggle('is-done', n < i); n === i ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current'); });
    submitRow.hidden = i !== steps.length - 1;
    status.textContent = `Step ${i + 1} of ${steps.length}: ${steps[i].querySelector('legend')?.textContent?.replace(/^Step \d+ of \d+\s*/, '')}`;
    if (focus) { const l = /** @type {HTMLElement} */ (steps[i].querySelector('legend')); l.tabIndex = -1; l.focus(); }
  };
  steps.forEach((s, i) => {
    const navRow = /** @type {HTMLElement} */ (s.querySelector('[data-step-nav]'));
    if (i > 0) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn--ghost'; b.textContent = quote.dataset.labelBack || 'Back'; b.addEventListener('click', () => show(i - 1, true)); navRow.append(b); }
    if (i < steps.length - 1) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn--accent'; b.textContent = quote.dataset.labelNext || 'Continue'; b.dataset.next = '';
      b.addEventListener('click', () => { if (validateAll(s)) { track('quote_step_completed', { step: i + 1 }); show(i + 1, true); } });
      navRow.append(b);
    }
  });
  quote.addEventListener('focusin', () => { if (!started) { started = true; track('quote_started'); } }, { once: true });
  quote.addEventListener('keydown', (e) => { // Enter in a text input moves forward instead of submitting early
    const t = /** @type {HTMLElement} */ (e.target);
    if (e.key === 'Enter' && t.tagName === 'INPUT' && current < steps.length - 1) { e.preventDefault(); /** @type {HTMLButtonElement} */ (steps[current].querySelector('[data-next]')).click(); }
  });
  let sending = false;
  quote.addEventListener('submit', (e) => {
    if (sending) return;
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) if (!validateAll(steps[i])) { show(i, false); validateAll(steps[i]); return; }
    track('quote_step_completed', { step: steps.length });
    const picked = /** @type {HTMLInputElement[]} */ ([...quote.querySelectorAll('input[name=services]:checked, input[name=service]:checked')]).map((i) => i.value);
    const service = picked.length === 1 ? picked[0] : 'not-sure';
    sending = true;
    track('quote_submitted', { service: /** @type {any} */ (service) }, () => quote.submit());
  });
  show(0, false);
}
