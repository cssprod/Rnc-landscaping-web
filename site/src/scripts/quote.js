// @ts-check
/*
 * Free-quote builder (blueprint C5). Progressive enhancement over a real <form>:
 * without JavaScript the form posts text/plain to its mailto: action. With it,
 * Send validates, writes a tidy email (subject "Free quote request — Irrigation — Saanich"),
 * opens the visitor's own email app and shows a fallback panel (copy, address,
 * webmail, call/text). Nothing is sent or stored by this website; the draft lives
 * in sessionStorage only so a back-navigation from the mail app keeps the answers.
 *
 * The pure builders below are exported for unit tests (node --test site/tests/unit/).
 */

/* ======================= pure builders (no DOM) ======================= */

/** Mail clients truncate long mailto: URLs; keep the whole URL under this. */
export const MAILTO_MAX = 1800;
/** Webmail compose links tolerate longer URLs. */
export const WEBMAIL_MAX = 6000;
export const SUBJECT_PREFIX = 'Free quote request';
export const TRUNCATION_NOTICE = '…\n\n(This email was shortened to fit. Please paste the full request you copied from the website here.)';
/** Field order for validation and the error summary. */
export const FIELD_ORDER = ['services', 'area', 'description', 'timing', 'name', 'contact', 'phone'];
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 2000;

/**
 * @typedef {{ services: string[], area: string, description: string, timing: string, name: string, contact: string, phone: string }} QuoteValues
 * @typedef {{ services?: Record<string,string>, area?: Record<string,string>, timing?: Record<string,string>, contact?: Record<string,string> }} QuoteLabels
 */

/** Normalise line endings to CRLF (RFC 6068 for mailto bodies). @param {string} s */
export const crlf = (s) => String(s).replace(/\r\n?|\n/g, '\n').replace(/\n/g, '\r\n');

/** Percent-encode a mailto/webmail query value; newlines become %0D%0A. @param {string} s */
export const enc = (s) => encodeURIComponent(crlf(s));

/** Phone needed only when the visitor asked to be called or texted. @param {string} contact */
export const phoneRequired = (contact) => contact === 'call' || contact === 'text';

/** North American numbers with area code (10 digits, optional leading 1), or international with + (8 to 15 digits). @param {string} s */
export function validPhone(s) {
  const t = String(s || '').trim();
  if (!t || /[^\d\s()+.\-]/.test(t)) return false;
  const d = t.replace(/\D/g, '');
  if (t.startsWith('+')) return d.length >= 8 && d.length <= 15;
  return d.length === 10 || (d.length === 11 && d.startsWith('1'));
}

/** @param {Partial<QuoteValues>} v @returns {QuoteValues} */
export const normalise = (v) => ({
  services: Array.isArray(v.services) ? v.services.filter(Boolean) : v.services ? [String(v.services)] : [],
  area: String(v.area || ''), description: String(v.description || ''), timing: String(v.timing || ''),
  name: String(v.name || ''), contact: String(v.contact || ''), phone: String(v.phone || ''),
});

/**
 * Validation rules shared by the page and the tests. Returns { field: errorCode } in FIELD_ORDER.
 * Codes: required | minLength | maxLength | format.
 * @param {Partial<QuoteValues>} input @returns {Record<string, string>}
 */
export function validate(input) {
  const v = normalise(input);
  /** @type {Record<string, string>} */ const e = {};
  if (!v.services.length) e.services = 'required';
  if (!v.area) e.area = 'required';
  const d = v.description.trim();
  if (!d) e.description = 'required';
  else if (d.length < DESCRIPTION_MIN) e.description = 'minLength';
  else if (d.length > DESCRIPTION_MAX) e.description = 'maxLength';
  if (!v.timing) e.timing = 'required';
  if (!v.name.trim()) e.name = 'required';
  if (!v.contact) e.contact = 'required';
  if (phoneRequired(v.contact)) {
    if (!v.phone.trim()) e.phone = 'required';
    else if (!validPhone(v.phone)) e.phone = 'format';
  }
  return e;
}

/** @param {Record<string,string>|undefined} map @param {string} k */
const lab = (map, k) => (map && map[k]) || k;

/**
 * "Free quote request — Irrigation — Saanich" (services joined with ", "; empty parts dropped).
 * @param {Partial<QuoteValues>} input @param {QuoteLabels} [labels]
 */
export function buildSubject(input, labels = {}) {
  const v = normalise(input);
  const parts = [SUBJECT_PREFIX];
  if (v.services.length) parts.push(v.services.map((s) => lab(labels.services, s)).join(', '));
  if (v.area) parts.push(lab(labels.area, v.area));
  return parts.join(' — ');
}

/**
 * Plain-text email body. Contact line includes the phone only when it is needed.
 * @param {Partial<QuoteValues>} input @param {QuoteLabels} [labels]
 */
export function buildBody(input, labels = {}) {
  const v = normalise(input);
  const reach = v.contact ? `${lab(labels.contact, v.contact)}${phoneRequired(v.contact) && v.phone.trim() ? ` at ${v.phone.trim()}` : ''}` : '';
  const rows = [
    ['Services', v.services.map((s) => lab(labels.services, s)).join(', ')],
    ['Municipality', v.area ? lab(labels.area, v.area) : ''],
    ['Timing', v.timing ? lab(labels.timing, v.timing) : ''],
    ['Name', v.name.trim()],
    ['Best way to reach me', reach],
  ].filter(([, x]) => x);
  return [
    'Hello RNC Landscaping,', '', 'I would like a free quote.', '',
    ...rows.map(([k, x]) => `${k}: ${x}`), '',
    'About the property and the job:', v.description.trim() || '(not given)', '',
    'Sent from the free-quote page on the RNC Landscaping website.',
  ].join('\n');
}

/** A usable email address (unknown values such as "[EMAIL]" become ""). @param {string} to */
export const cleanAddress = (to) => (/^[^\s@[\]<>"]+@[^\s@[\]<>"]+\.[^\s@[\]<>"]+$/.test(String(to || '').trim()) ? String(to).trim() : '');

/**
 * Fit `body` into a URL of at most `max` characters, given the URL text before the body.
 * Cuts on code points (never splits a surrogate pair), prefers a word boundary, appends the notice.
 * @param {string} head URL up to and including "body=" @param {string} body @param {number} max @param {string} [notice]
 * @returns {{ url: string, truncated: boolean, bodyText: string }}
 */
export function fitBody(head, body, max, notice = TRUNCATION_NOTICE) {
  const full = head + enc(body);
  if (full.length <= max) return { url: full, truncated: false, bodyText: body };
  const room = max - head.length;
  const chars = Array.from(body);
  let lo = 0, hi = chars.length;
  const fits = (/** @type {number} */ n) => enc(chars.slice(0, n).join('').trimEnd() + notice).length <= room;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (fits(mid)) lo = mid; else hi = mid - 1; }
  let cut = chars.slice(0, lo).join('');
  const ws = cut.search(/\s\S*$/);
  if (ws > 0 && cut.length - ws < 40) cut = cut.slice(0, ws);
  const bodyText = cut.trimEnd() + notice;
  const url = head + enc(bodyText);
  // Notice alone does not fit: send the head with an empty body rather than an over-long URL.
  return url.length <= max ? { url, truncated: true, bodyText } : { url: head, truncated: true, bodyText: '' };
}

/**
 * mailto: URL, capped at `max` characters.
 * @param {{ to?: string, subject: string, body: string, max?: number }} p
 * @returns {{ url: string, truncated: boolean, bodyText: string }}
 */
export function buildMailto(p) {
  const to = cleanAddress(p.to || '');
  const head = `mailto:${to.replace(/[^\w.@+-]/g, encodeURIComponent)}?subject=${enc(p.subject)}&body=`;
  return fitBody(head, p.body, p.max ?? MAILTO_MAX);
}

/**
 * Gmail / Outlook.com web compose links (convenience links with the same subject and text).
 * @param {'gmail'|'outlook'} provider @param {{ to?: string, subject: string, body: string, max?: number }} p
 */
export function buildWebmail(provider, p) {
  const to = encodeURIComponent(cleanAddress(p.to || ''));
  const head = provider === 'gmail'
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${enc(p.subject)}&body=`
    : `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${enc(p.subject)}&body=`;
  return fitBody(head, p.body, p.max ?? WEBMAIL_MAX);
}

/** sms: link with a short prefilled body. @param {string} phone @param {string} body */
export function buildSms(phone, body) {
  const d = String(phone || '').replace(/[^\d+]/g, '');
  return d ? `sms:${d}${body ? `?body=${encodeURIComponent(body)}` : ''}` : '';
}

/** Analytics props without personal data. @param {Partial<QuoteValues>} input */
export function mailtoEventProps(input) {
  const v = normalise(input);
  return { service: v.services.length === 1 ? v.services[0] : v.services.length ? 'multiple' : 'none', area: v.area || 'none' };
}

/* ======================= page behaviour ======================= */

const DRAFT_KEY = 'rnc-quote-draft-v1';

/** Plausible custom event (no-op unless a launch build loaded Plausible). Props never carry personal data. @param {string} name @param {Record<string,string>} [props] */
function track(name, props) {
  // @ts-ignore
  const p = window.plausible;
  if (typeof p !== 'function' || !document.querySelector('script[data-domain][src*="plausible"]')) return;
  p(name, props && Object.keys(props).length ? { props } : {});
}

/** @param {HTMLFormElement} form */
function init(form) {
  form.noValidate = true;
  form.classList.add('is-enhanced');
  const $ = (/** @type {string} */ s, /** @type {ParentNode} */ r = form) => /** @type {HTMLElement|null} */ (r.querySelector(s));
  const panel = /** @type {HTMLElement|null} */ (document.getElementById(form.dataset.panel || 'quote-panel'));
  const errorBox = $('[data-quote-errors]');
  const phoneWrap = $('[data-quote-phone]');
  const phoneInput = /** @type {HTMLInputElement|null} */ (form.elements.namedItem('phone'));
  const to = cleanAddress(form.dataset.email || '');
  const knownPhone = /^\[/.test(form.dataset.phone || '') ? '' : (form.dataset.phone || '');

  /** @type {QuoteLabels} */
  const labels = { services: {}, area: {}, timing: {}, contact: {} };
  for (const el of /** @type {NodeListOf<HTMLInputElement|HTMLOptionElement>} */ (form.querySelectorAll('[name=services], [name=timing], [name=contact], select[name=area] option'))) {
    const key = /** @type {keyof QuoteLabels} */ (el instanceof HTMLOptionElement ? 'area' : el.name);
    if (el.value) /** @type {Record<string,string>} */ (labels[key])[el.value] = el.dataset.label || el.textContent?.trim() || el.value;
  }

  /** @returns {QuoteValues} */
  const read = () => {
    const fd = new FormData(form);
    return normalise({
      services: /** @type {string[]} */ (fd.getAll('services')), area: String(fd.get('area') || ''), description: String(fd.get('description') || ''),
      timing: String(fd.get('timing') || ''), name: String(fd.get('name') || ''), contact: String(fd.get('contact') || ''), phone: String(fd.get('phone') || ''),
    });
  };
  /** @param {Partial<QuoteValues>} v */
  const write = (v) => {
    for (const el of /** @type {HTMLInputElement[]} */ ([...form.querySelectorAll('input, select, textarea')])) {
      const val = /** @type {any} */ (v)[el.name];
      if (val == null) continue;
      if (el.type === 'checkbox') el.checked = [].concat(val).includes(/** @type {never} */ (el.value));
      else if (el.type === 'radio') { if (val) el.checked = el.value === val; }
      else el.value = String(val);
    }
  };

  /* phone appears (and becomes required) only for Call me / Text me */
  const syncPhone = () => {
    if (!phoneWrap || !phoneInput) return;
    const need = phoneRequired(read().contact);
    phoneWrap.hidden = !need;
    phoneInput.required = need;
  };
  const phoneLabel = phoneWrap?.querySelector('label');
  if (phoneLabel && phoneWrap?.dataset.labelJs) phoneLabel.textContent = phoneWrap.dataset.labelJs;

  /* draft (sessionStorage) first; ?area= and ?service= prefill only a fresh form */
  let draft = null;
  try { draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch { /* storage blocked */ }
  if (draft && typeof draft === 'object') write(draft);
  else {
    const q = new URLSearchParams(location.search);
    const area = q.get('area'), svc = q.getAll('service').flatMap((s) => s.split(','));
    if (area && labels.area?.[area]) write({ area });
    if (svc.length) write({ services: svc.filter((s) => labels.services?.[s]) });
  }
  syncPhone();
  const save = () => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(read())); } catch { /* storage blocked */ } };

  /* inline errors */
  /** @param {string} name */
  const errEl = (name) => $(`[data-error-for="${name}"]`);
  /** @param {string} name */
  const controls = (name) => /** @type {HTMLInputElement[]} */ ([...form.querySelectorAll(`[name="${name}"]`)]);
  /** @param {Record<string,string>} errors @param {string[]} [only] */
  const showErrors = (errors, only) => {
    for (const name of FIELD_ORDER) {
      if (only && !only.includes(name)) continue;
      const el = errEl(name);
      const code = errors[name];
      if (el) {
        el.hidden = !code;
        const span = el.querySelector('[data-error-text]');
        if (span && code) span.textContent = el.dataset[`msg${code[0].toUpperCase()}${code.slice(1)}`] || el.dataset.msgRequired || '';
      }
      for (const c of controls(name)) { if (code) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid'); }
      el?.closest('[data-quote-field]')?.classList.toggle('has-error', !!code);
    }
  };
  /** @type {Set<string>} */ const touched = new Set();

  let started = false;
  const start = () => { if (!started) { started = true; track('quote_started'); } };
  form.addEventListener('focusin', start);
  form.addEventListener('input', (e) => {
    start();
    const t = /** @type {HTMLInputElement} */ (e.target);
    if (t.name === 'contact') syncPhone();
    save();
    const errs = validate(read());
    const live = [...touched].filter((n) => n === t.name || (t.name === 'contact' && n === 'phone'));
    if (live.length) showErrors(errs, live);
    if (errorBox && !errorBox.hidden && !Object.keys(errs).length) errorBox.hidden = true;
  });
  form.addEventListener('change', () => { syncPhone(); save(); });

  /* error summary links move focus to the field */
  errorBox?.addEventListener('click', (e) => {
    const a = /** @type {HTMLAnchorElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('a[href^="#"]'));
    if (!a) return;
    const target = document.getElementById(a.hash.slice(1));
    if (target) { e.preventDefault(); target.focus(); target.scrollIntoView({ block: 'center' }); }
  });

  let last = { text: '', mailto: '' };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = read();
    const errors = validate(v);
    const names = Object.keys(errors);
    names.forEach((n) => touched.add(n));
    showErrors(errors);
    if (names.length && errorBox) {
      const list = /** @type {HTMLElement} */ (errorBox.querySelector('ul'));
      const intro = errorBox.querySelector('[data-quote-errors-intro]');
      if (intro) intro.textContent = (errorBox.dataset.intro || '{count} answer(s) need a fix:').replace('{count}', String(names.length));
      list.replaceChildren(...names.map((n) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        const first = controls(n)[0];
        a.href = `#${first?.id || ''}`;
        a.textContent = errEl(n)?.querySelector('[data-error-text]')?.textContent || n;
        li.append(a);
        return li;
      }));
      errorBox.hidden = false;
      errorBox.focus();
      return;
    }
    if (errorBox) errorBox.hidden = true;
    const subject = buildSubject(v, labels);
    const body = buildBody(v, labels);
    const m = buildMailto({ to, subject, body });
    last = { text: `Subject: ${subject}\n\n${body}`, mailto: m.url };
    save();
    track('quote_mailto_opened', mailtoEventProps(v));
    if (panel) fillPanel(panel, { subject, body, truncated: m.truncated, mailto: m.url, v });
    window.location.href = m.url;
  });

  /** @param {HTMLElement} p @param {{ subject: string, body: string, truncated: boolean, mailto: string, v: QuoteValues }} r */
  function fillPanel(p, r) {
    const text = /** @type {HTMLTextAreaElement|null} */ (p.querySelector('[data-quote-text]'));
    if (text) text.value = last.text;
    const notice = /** @type {HTMLElement|null} */ (p.querySelector('[data-quote-truncated]'));
    if (notice) notice.hidden = !r.truncated;
    const reopen = /** @type {HTMLAnchorElement|null} */ (p.querySelector('[data-quote-reopen]'));
    if (reopen) reopen.href = r.mailto;
    for (const a of /** @type {NodeListOf<HTMLAnchorElement>} */ (p.querySelectorAll('[data-quote-webmail]'))) {
      a.href = buildWebmail(/** @type {'gmail'|'outlook'} */ (a.dataset.quoteWebmail), { to, subject: r.subject, body: r.body }).url;
    }
    const sms = /** @type {HTMLAnchorElement|null} */ (p.querySelector('[data-quote-sms]'));
    if (sms && knownPhone) {
      const svc = r.v.services.map((s) => labels.services?.[s] || s).join(', ');
      const area = labels.area?.[r.v.area] || '';
      sms.href = buildSms(knownPhone, `${p.dataset.smsBody || 'Hi, I just sent a free quote request from your website.'}${svc ? ` (${svc}${area ? `, ${area}` : ''})` : ''}`);
    }
    const status = p.querySelector('[data-quote-status]');
    if (status) status.textContent = '';
    p.hidden = false;
    p.focus();
    // The submit click is a user gesture: copy the full text now when the email had to be shortened.
    if (r.truncated) copy(last.text, p.dataset.copied || 'Request copied');
  }

  /** @param {string} value @param {string} okMsg */
  async function copy(value, okMsg) {
    if (!panel) return false;
    const status = panel.querySelector('[data-quote-status]');
    let ok = false;
    try { await navigator.clipboard.writeText(value); ok = true; } catch {
      const ta = /** @type {HTMLTextAreaElement|null} */ (panel.querySelector('[data-quote-text]'));
      if (ta && value === ta.value) { ta.focus(); ta.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } }
    }
    if (status) {
      status.textContent = '';
      // Re-announce on repeated presses.
      setTimeout(() => { status.textContent = ok ? okMsg : (panel.dataset.copyFailed || 'Could not copy. Select the text and copy it.'); }, 30);
    }
    return ok;
  }

  panel?.addEventListener('click', async (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    const c = /** @type {HTMLElement|null} */ (t.closest('[data-quote-copy]'));
    if (c) {
      const what = c.dataset.quoteCopy === 'address' ? 'address' : 'request';
      const ok = await copy(what === 'address' ? to : last.text, what === 'address' ? (panel.dataset.copiedAddress || 'Address copied') : (panel.dataset.copied || 'Request copied'));
      if (ok) track('quote_copied', { item: what });
      return;
    }
    const w = /** @type {HTMLElement|null} */ (t.closest('[data-quote-webmail]'));
    if (w) { track('quote_webmail_opened', { provider: w.dataset.quoteWebmail || 'unknown' }); return; }
    if (t.closest('[data-quote-reopen]')) { track('quote_mailto_opened', mailtoEventProps(read())); return; }
    if (t.closest('[data-quote-edit]')) {
      const first = /** @type {HTMLElement|null} */ (form.querySelector('input, select, textarea'));
      first?.focus();
      first?.scrollIntoView({ block: 'center' });
    }
  });
}

if (typeof document !== 'undefined') {
  const form = /** @type {HTMLFormElement|null} */ (document.querySelector('form[data-quote-form]'));
  if (form) init(form);
}
