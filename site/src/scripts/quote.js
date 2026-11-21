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

/* ======================= page behaviour (DOM) ======================= */

const DRAFT_KEY = 'rnc-quote-draft-v1';

/** Plausible event; a no-op unless a launch build loaded Plausible. Props never carry personal data. */
function track(name, props) {
  const p = window.plausible;
  if (typeof p !== 'function' || !document.querySelector('script[data-domain][src*="plausible"]')) return;
  p(name, props && Object.keys(props).length ? { props } : {});
}

function init(form) {
  form.noValidate = true;
  form.classList.add('is-enhanced');
  const q = (s, r = form) => r.querySelector(s);
  const qa = (s, r = form) => [...r.querySelectorAll(s)];
  const panel = document.getElementById(form.dataset.panel || 'quote-panel');
  const errorBox = q('[data-quote-errors]');
  const phoneWrap = q('[data-quote-phone]');
  const phoneInput = form.elements.namedItem('phone');
  const to = cleanAddress(form.dataset.email);
  const knownPhone = /^\[/.test(form.dataset.phone || '') ? '' : form.dataset.phone || '';
  const ds = (el, k, d) => (el && el.dataset[k]) || d;

  const labels = { services: {}, area: {}, timing: {}, contact: {} };
  for (const el of qa('[name=services],[name=timing],[name=contact],select[name=area] option')) {
    if (el.value) labels[el.tagName === 'OPTION' ? 'area' : el.name][el.value] = el.dataset.label || (el.labels?.[0] || el).textContent.trim();
  }
  const read = () => {
    const fd = new FormData(form);
    const g = (k) => String(fd.get(k) || '');
    return normalise({ services: fd.getAll('services'), area: g('area'), description: g('description'), timing: g('timing'), name: g('name'), contact: g('contact'), phone: g('phone') });
  };
  const write = (v) => {
    for (const el of qa('input,select,textarea')) {
      const val = v[el.name];
      if (val == null) continue;
      if (el.type === 'checkbox') el.checked = [].concat(val).includes(el.value);
      else if (el.type === 'radio') { if (val) el.checked = el.value === val; }
      else el.value = String(val);
    }
  };

  // The phone input appears, and becomes required, only for Call me / Text me.
  const syncPhone = () => {
    if (!phoneWrap || !phoneInput) return;
    const need = phoneRequired(read().contact);
    phoneWrap.hidden = !need;
    phoneInput.required = need;
  };
  const phoneLabel = phoneWrap && q('label', phoneWrap);
  if (phoneLabel && phoneWrap.dataset.labelJs) phoneLabel.textContent = phoneWrap.dataset.labelJs;

  // Draft first; ?area= and ?service= prefill only a fresh form.
  let draft = null;
  try { draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch { /* storage blocked */ }
  if (draft && typeof draft === 'object') write(draft);
  else {
    const u = new URLSearchParams(location.search);
    const area = u.get('area');
    const svc = u.getAll('service').flatMap((s) => s.split(',')).filter((s) => labels.services[s]);
    if (area && labels.area[area]) write({ area });
    if (svc.length) write({ services: svc });
  }
  syncPhone();
  const save = () => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(read())); } catch { /* storage blocked */ } };

  const errEl = (n) => q(`[data-error-for="${n}"]`);
  const controls = (n) => qa(`[name="${n}"]`);
  const showErrors = (errors, only) => {
    for (const n of FIELD_ORDER) {
      if (only && !only.includes(n)) continue;
      const el = errEl(n), code = errors[n];
      if (el) {
        el.hidden = !code;
        if (code) q('[data-error-text]', el).textContent = el.dataset['msg' + code[0].toUpperCase() + code.slice(1)] || el.dataset.msgRequired || '';
        el.closest('[data-quote-field]').classList.toggle('has-error', !!code);
      }
      for (const c of controls(n)) code ? c.setAttribute('aria-invalid', 'true') : c.removeAttribute('aria-invalid');
    }
  };
  const touched = new Set();
  let started = false;
  const start = () => { if (!started) { started = true; track('quote_started'); } };
  form.addEventListener('focusin', start);
  form.addEventListener('input', (e) => {
    start();
    const n = e.target.name;
    if (n === 'contact') syncPhone();
    save();
    const errs = validate(read());
    const live = [...touched].filter((t) => t === n || (n === 'contact' && t === 'phone'));
    if (live.length) showErrors(errs, live);
    if (!errorBox.hidden && !Object.keys(errs).length) errorBox.hidden = true;
  });
  form.addEventListener('change', () => { syncPhone(); save(); });

  // Error summary links move focus to the field, not just the scroll position.
  errorBox.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    const t = a && document.getElementById(a.hash.slice(1));
    if (t) { e.preventDefault(); t.focus(); t.scrollIntoView({ block: 'center' }); }
  });

  let last = { text: '', subject: '', body: '' };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = read(), errors = validate(v), names = Object.keys(errors);
    names.forEach((n) => touched.add(n));
    showErrors(errors);
    if (names.length) {
      q('[data-quote-errors-intro]').textContent = ds(errorBox, 'intro', '{count} answer(s) need a fix:').replace('{count}', names.length);
      q('ul', errorBox).replaceChildren(...names.map((n) => {
        const li = document.createElement('li'), a = document.createElement('a');
        a.href = '#' + controls(n)[0].id;
        a.textContent = q('[data-error-text]', errEl(n)).textContent;
        li.append(a);
        return li;
      }));
      errorBox.hidden = false;
      errorBox.focus();
      return;
    }
    errorBox.hidden = true;
    const subject = buildSubject(v, labels), body = buildBody(v, labels);
    const m = buildMailto({ to, subject, body });
    last = { text: `Subject: ${subject}\n\n${body}`, subject, body };
    save();
    track('quote_mailto_opened', mailtoEventProps(v));
    if (panel) fillPanel(m, v);
    window.location.href = m.url;
  });

  function fillPanel(m, v) {
    q('[data-quote-text]', panel).value = last.text;
    q('[data-quote-truncated]', panel).hidden = !m.truncated;
    q('[data-quote-reopen]', panel).href = m.url;
    for (const a of qa('[data-quote-webmail]', panel)) a.href = buildWebmail(a.dataset.quoteWebmail, { to, subject: last.subject, body: last.body }).url;
    const sms = q('[data-quote-sms]', panel);
    if (sms && knownPhone) {
      const svc = v.services.map((s) => labels.services[s]).join(', ');
      sms.href = buildSms(knownPhone, ds(panel, 'smsBody', 'Hi, I just sent a free quote request from your website.') + (svc ? ` (${svc}, ${labels.area[v.area] || ''})` : ''));
    }
    q('[data-quote-status]', panel).textContent = '';
    panel.hidden = false;
    panel.focus();
    // Submit is a user gesture: when the email had to be shortened, copy the full text now.
    if (m.truncated) copy(last.text, ds(panel, 'copied', 'Request copied'));
  }

  async function copy(value, okMsg) {
    const status = q('[data-quote-status]', panel);
    let ok = false;
    try { await navigator.clipboard.writeText(value); ok = true; } catch {
      const ta = q('[data-quote-text]', panel);
      if (value === ta.value) { ta.focus(); ta.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } }
    }
    status.textContent = '';
    setTimeout(() => { status.textContent = ok ? okMsg : ds(panel, 'copyFailed', 'Could not copy. Select the text and copy it.'); }, 30);
    return ok;
  }

  panel?.addEventListener('click', async (e) => {
    const t = e.target;
    const c = t.closest('[data-quote-copy]');
    if (c) {
      const addr = c.dataset.quoteCopy === 'address';
      if (await copy(addr ? to : last.text, ds(panel, addr ? 'copiedAddress' : 'copied', 'Copied'))) track('quote_copied', { item: addr ? 'address' : 'request' });
      return;
    }
    const w = t.closest('[data-quote-webmail]');
    if (w) track('quote_webmail_opened', { provider: w.dataset.quoteWebmail });
    else if (t.closest('[data-quote-reopen]')) track('quote_mailto_opened', mailtoEventProps(read()));
    else if (t.closest('[data-quote-edit]')) { const f = q('input,select,textarea'); f.focus(); f.scrollIntoView({ block: 'center' }); }
  });
}

if (typeof document !== 'undefined') {
  const form = document.querySelector('form[data-quote-form]');
  if (form) init(form);
}
