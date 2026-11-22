// @ts-check
/* Free quote builder (C5; CONTRACT §6, §12, §13). Nothing is sent from this site: the form writes an email in the
   visitor's own email app (mailto:) and shows the same request with Copy, the address, Call / Text and webmail links.
   Without JS the form submits itself to its mailto: action (method=post, enctype=text/plain).
   The top half of this module is pure string builders (unit-tested in node); the bottom half wires them to
   form[data-quote-form] and does nothing on a page without one. */
import { track } from './lib/track.js';

/** sessionStorage key of the draft (CONTRACT §8). */
export const DRAFT_KEY = 'rnc-quote-draft';
/** Longest mailto: URL we hand to an email app: some clients cut longer links (C5). */
export const MAX_URL = 1800;
/** Service value for "Not sure yet". */
export const NOT_SURE = 'not-sure';
/** Area value for "Somewhere else in Greater Victoria". */
export const OTHER_AREA = 'other';
/** Retired service slugs that still arrive in ?service= links (CONTRACT §1, §5). */
const SERVICE_ALIAS = /** @type {Record<string, string>} */ ({ 'tree-vegetation-management': 'tree-vegetation' });

/**
 * @typedef {{ services?: string[], area?: string, timing?: string, name?: string, contact?: string, phone?: string, details?: string }} QuoteRequest
 *   Display strings (labels, not slugs) of one request.
 * @typedef {{ title?: string, services?: string, area?: string, timing?: string, name?: string, contact?: string, phone?: string, details?: string, footer?: string }} SummaryLabels
 */

/* ---------- pure builders ---------- */

/** RFC 6068 percent-encoding: UTF-8, %20 for spaces, CRLF line breaks. @param {string} s */
export const encodeMail = (s) => encodeURIComponent(String(s ?? '').replace(/\r\n|\r|\n/g, '\r\n'));

/**
 * Subject from the content template ("Free quote request — {services} — {area}"). A part with no value is dropped
 * together with its separator, so the subject never ends in a dash.
 * @param {string} template @param {{ services?: string[], area?: string }} [v]
 */
export function buildSubject(template, v = {}) {
  const services = (v.services || []).filter(Boolean).join(', ');
  const parts = String(template || 'Free quote request — {services} — {area}').split(/\s+[—–]\s+/);
  return parts.map((p) => p.replace('{services}', services).replace('{area}', v.area || '').trim()).filter(Boolean).join(' — ');
}

/**
 * Plain-text body: one "Label: value" line per short answer, the description as its own paragraph.
 * @param {QuoteRequest} req @param {SummaryLabels} [labels]
 */
export function buildBody(req, labels = {}) {
  const L = { title: 'Free quote request', services: 'Services', area: 'Municipality', timing: 'Timing', name: 'Name',
    contact: 'Best way to reach me', phone: 'Phone', details: 'About the property or job', footer: '', ...labels };
  /** @type {string[]} */ const lines = [L.title, ''];
  const add = (/** @type {string} */ label, /** @type {string|undefined} */ value) => { const v = String(value ?? '').trim(); if (v) lines.push(`${label}: ${v}`); };
  add(L.services, (req.services || []).join(', '));
  add(L.area, req.area);
  add(L.timing, req.timing);
  add(L.name, req.name);
  add(L.contact, req.contact);
  add(L.phone, req.phone);
  const details = String(req.details ?? '').replace(/\r\n?/g, '\n').trim();
  if (details) lines.push('', `${L.details}:`, details);
  if (L.footer) lines.push('', L.footer);
  return lines.join('\n');
}

/**
 * Shortens `text` so its encoded form is at most `max` characters, cutting at a line or word break where one is near,
 * never inside a character, and ending with `note` when it had to cut.
 * @param {string} text @param {number} max encoded length budget @param {{ note?: string, encode?: (s: string) => string }} [o]
 * @returns {{ text: string, truncated: boolean }}
 */
export function capLength(text, max, o = {}) {
  const enc = o.encode || encodeMail;
  const s = String(text ?? '');
  if (enc(s).length <= max) return { text: s, truncated: false };
  const tail = `\n\n${o.note || '[…] Shortened to fit an email link. Paste the full request you copied.'}`;
  const chars = Array.from(s);
  // Longest prefix (in whole code points) that fits with the tail.
  let lo = 0, hi = chars.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (enc(chars.slice(0, mid).join('').trimEnd() + tail).length <= max) lo = mid; else hi = mid - 1;
  }
  let cut = chars.slice(0, lo).join('');
  const brk = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf(' '));
  if (brk > cut.length - 80 && brk > 0) cut = cut.slice(0, brk);
  const out = cut.trimEnd() + tail;
  return enc(out).length <= max ? { text: out, truncated: true } : { text: '', truncated: true };
}

/**
 * The mailto: URL, at most `max` characters long (the body is shortened to fit).
 * @param {string} to recipient ('' while [EMAIL] is unknown: the visitor adds it) @param {string} subject @param {string} body
 * @param {{ max?: number, note?: string }} [o]
 * @returns {{ href: string, body: string, truncated: boolean }}
 */
export function buildMailto(to, subject, body, o = {}) {
  const max = o.max ?? MAX_URL;
  const addr = /^\[|^$/.test(to || '') ? '' : encodeURIComponent(to).replace(/%40/g, '@');
  const head = `mailto:${addr}?subject=${encodeMail(subject)}&body=`;
  const fit = capLength(body, Math.max(0, max - head.length), { note: o.note });
  return { href: head + encodeMail(fit.text), body: fit.text, truncated: fit.truncated };
}

/**
 * Webmail compose link ("convenience links", C5). Gmail and Outlook.com take the same subject and body.
 * @param {'gmail'|'outlook'} provider @param {string} to @param {string} subject @param {string} body
 */
export function buildWebmail(provider, to, subject, body) {
  const addr = /^\[|^$/.test(to || '') ? '' : to;
  const q = (/** @type {[string, string][]} */ pairs) => pairs.filter(([, v]) => v).map(([k, v]) => `${k}=${encodeMail(v)}`).join('&');
  if (provider === 'gmail') return `https://mail.google.com/mail/?view=cm&fs=1&${q([['to', addr], ['su', subject], ['body', body]])}`;
  return `https://outlook.live.com/mail/0/deeplink/compose?${q([['to', addr], ['subject', subject], ['body', body]])}`;
}

/**
 * sms: link with a short prefilled message, or '' while the number is unknown (CONTRACT §3: no URL on a token).
 * @param {string} phone the number (any format; E.164 preferred) @param {string} [text]
 */
export function buildSms(phone, text = '') {
  const p = String(phone || '');
  if (!p || /\[/.test(p)) return '';
  const digits = p.replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length < 7) return '';
  return `sms:${digits}${text ? `?body=${encodeMail(text)}` : ''}`;
}

/** The services a ?service= value names (comma list or repeated; retired aliases mapped). @param {URLSearchParams} params @param {string[]} known */
export function prefillServices(params, known) {
  return [...new Set(params.getAll('service').flatMap((v) => v.split(',')).map((v) => v.trim().toLowerCase()).map((v) => SERVICE_ALIAS[v] || v))]
    .filter((v) => known.includes(v));
}

/** The area a ?area= value names, if it is a known option. @param {URLSearchParams} params @param {string[]} known */
export function prefillArea(params, known) {
  const v = (params.get('area') || '').trim().toLowerCase();
  return known.includes(v) ? v : '';
}

/**
 * Props of quote_mailto_opened (CONTRACT §13). Only fixed slugs: never a name, phone number, description or free text.
 * @param {{ services?: string[], area?: string }} pick chosen option values @param {{ services: string[], areas: string[] }} known
 * @returns {import('../../event-schema').AnalyticsEvents['quote_mailto_opened']}
 */
export function mailtoEventProps(pick, known) {
  const real = (pick.services || []).filter((s) => s !== NOT_SURE && known.services.includes(s));
  const service = /** @type {any} */ (real.length === 0 ? NOT_SURE : real.length === 1 ? real[0] : 'multiple');
  const area = known.areas.includes(pick.area || '') ? /** @type {string} */ (pick.area) : OTHER_AREA;
  return { service, area };
}

/** Props of quote_webmail_opened. @param {string} provider @returns {{ provider: 'gmail'|'outlook' }} */
export const webmailEventProps = (provider) => ({ provider: provider === 'gmail' ? 'gmail' : 'outlook' });

/** Ten to fifteen digits: a North American number with area code, or an international one. @param {string} s */
export const phoneLooksValid = (s) => { const n = String(s || '').replace(/\D/g, '').length; return n >= 10 && n <= 15; };

/* ---------- the page ---------- */

/** @param {() => any} fn */
const safely = (fn) => { try { return fn(); } catch { return undefined; } };

/** @param {HTMLFormElement} form */
function init(form) {
  const ds = form.dataset;
  const $ = (/** @type {string} */ sel) => /** @type {HTMLElement|null} */ (form.querySelector(sel));
  const $$ = (/** @type {string} */ sel) => /** @type {HTMLElement[]} */ ([...form.querySelectorAll(sel)]);
  const fields = $$('[data-field]');
  const summaryBox = $('[data-error-summary]');
  const summaryList = $('[data-error-summary] ul');
  const ready = $('[data-quote-ready]');
  const requestBox = /** @type {HTMLTextAreaElement|null} */ ($('[data-quote-summary]'));
  const copyStatus = $('[data-copy-status]');
  const truncNote = $('[data-truncated]');
  const phoneGate = $('[data-show-when]');
  const labels = /** @type {SummaryLabels} */ (safely(() => JSON.parse(ds.summaryLabels || '{}')) || {});
  const known = {
    services: $$('input[name=services]').map((i) => /** @type {HTMLInputElement} */ (i).value).filter((v) => v !== NOT_SURE),
    areas: [...(/** @type {HTMLSelectElement|null} */ (form.elements.namedItem('area'))?.options || [])].map((o) => o.value).filter((v) => v && v !== OTHER_AREA),
  };
  const to = /^\[/.test(ds.email || '') ? '' : (ds.email || '');
  let attempted = false, started = false;

  form.noValidate = true; // JS takes over: native constraint checks, our inline messages
  form.classList.add('is-enhanced');

  /* ----- reading and writing values ----- */
  const ctl = (/** @type {string} */ n) => /** @type {any} */ (form.elements.namedItem(n));
  const checked = (/** @type {string} */ n) => /** @type {HTMLInputElement[]} */ ($$(`input[name="${n}"]`)).filter((i) => i.checked);
  const labelOf = (/** @type {HTMLInputElement} */ i) => i.closest('label')?.querySelector('[data-label]')?.textContent?.trim() || i.value;
  const values = () => ({
    services: checked('services').map((i) => i.value),
    area: /** @type {HTMLSelectElement} */ (ctl('area'))?.value || '',
    details: /** @type {HTMLTextAreaElement} */ (ctl('details'))?.value || '',
    timing: checked('timing')[0]?.value || '',
    name: /** @type {HTMLInputElement} */ (ctl('name'))?.value || '',
    contact: checked('contact')[0]?.value || '',
    phone: /** @type {HTMLInputElement} */ (ctl('phone'))?.value || '',
  });
  /** @param {Partial<ReturnType<typeof values>>} v */
  const apply = (v) => {
    if (Array.isArray(v.services)) for (const i of /** @type {HTMLInputElement[]} */ ($$('input[name=services]'))) i.checked = v.services.includes(i.value);
    const area = /** @type {HTMLSelectElement} */ (ctl('area'));
    if (typeof v.area === 'string' && area && [...area.options].some((o) => o.value === v.area)) area.value = v.area;
    for (const k of /** @type {const} */ (['details', 'name', 'phone'])) if (typeof v[k] === 'string' && ctl(k)) ctl(k).value = v[k];
    for (const k of /** @type {const} */ (['timing', 'contact'])) if (typeof v[k] === 'string') for (const i of /** @type {HTMLInputElement[]} */ ($$(`input[name="${k}"]`))) i.checked = i.value === v[k];
  };
  /** The request as display strings (labels, not slugs). */
  const request = () => {
    const v = values();
    const area = /** @type {HTMLSelectElement} */ (ctl('area'));
    const phoneOn = v.contact === 'call' || v.contact === 'text';
    return {
      services: checked('services').map(labelOf),
      area: v.area ? area.selectedOptions[0]?.textContent?.trim() || v.area : '',
      timing: checked('timing').map(labelOf)[0] || '',
      name: v.name.trim(),
      contact: checked('contact').map(labelOf)[0] || '',
      phone: phoneOn ? v.phone.trim() : '',
      details: v.details,
    };
  };

  /* ----- draft (sessionStorage only; CONTRACT §8) ----- */
  const saveDraft = () => safely(() => sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, ...values() })));
  const draft = safely(() => JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'));
  if (draft && draft.v === 1) apply(draft);
  // ?service= / ?area= fill only what the draft left empty.
  const params = new URLSearchParams(location.search);
  if (!checked('services').length) apply({ services: prefillServices(params, known.services) });
  if (!values().area) { const a = prefillArea(params, known.areas); if (a) apply({ area: a }); }

  /* ----- the phone field: shown and required for call or text ----- */
  const syncPhone = () => {
    if (!phoneGate) return;
    const on = ['call', 'text'].includes(values().contact);
    phoneGate.hidden = !on;
    const p = /** @type {HTMLInputElement|null} */ (ctl('phone'));
    if (p) p.required = on;
    if (!on) showError(/** @type {HTMLElement} */ (phoneGate.querySelector('[data-field]') || phoneGate), '');
  };

  /* ----- validation: native constraint checks, inline messages, error summary ----- */
  /** @param {HTMLElement} f */
  const controls = (f) => /** @type {(HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement)[]} */ ([...f.querySelectorAll('input, select, textarea')]);
  /** @param {HTMLElement} f @param {string} msg */
  function showError(f, msg) {
    const err = /** @type {HTMLElement|null} */ (f.querySelector('[data-error-for]'));
    if (!err) return;
    const text = /** @type {HTMLElement} */ (err.querySelector('[data-error-text]') || err);
    err.hidden = !msg;
    if (msg) text.textContent = msg;
    f.classList.toggle('has-error', !!msg);
    const target = f.matches('fieldset') ? [f] : controls(f);
    for (const el of target) {
      const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter((x) => x && x !== err.id);
      if (msg) ids.push(err.id);
      if (ids.length) el.setAttribute('aria-describedby', ids.join(' ')); else el.removeAttribute('aria-describedby');
    }
    for (const el of controls(f)) { if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); }
  }
  /** The error message for a field, or '' when it is fine. @param {HTMLElement} f */
  function check(f) {
    if (f.closest('[hidden]')) return '';
    const msg = f.dataset.msg || 'Check this answer.';
    const name = f.dataset.field;
    if (name === 'services') return checked('services').length ? '' : msg;
    const els = controls(f);
    for (const el of els) {
      if (el instanceof HTMLInputElement && el.type === 'tel') el.setCustomValidity(el.value.trim() && !phoneLooksValid(el.value) ? msg : '');
      if (el instanceof HTMLInputElement && el.type === 'text') el.setCustomValidity(el.required && !el.value.trim() ? msg : '');
      if (el instanceof HTMLTextAreaElement) {
        const min = Number(el.getAttribute('minlength') || 0);
        el.setCustomValidity(el.required && el.value.trim().length < Math.max(1, min) ? msg : '');
      }
    }
    return els.every((el) => el.checkValidity()) ? '' : msg;
  }
  /** @param {HTMLElement} f */
  const validate = (f) => { const m = check(f); showError(f, m); return m; };
  const firstControl = (/** @type {HTMLElement} */ f) => /** @type {HTMLElement|null} */ (f.querySelector('input:not([type=hidden]), select, textarea'));
  /** @param {{ f: HTMLElement, msg: string }[]} bad */
  function renderSummary(bad) {
    if (!summaryBox || !summaryList) return;
    summaryList.replaceChildren(...bad.map(({ f, msg }) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      const c = firstControl(f);
      a.href = `#${c?.id || f.id}`;
      a.textContent = msg;
      a.addEventListener('click', (e) => { e.preventDefault(); c?.focus(); });
      li.append(a);
      return li;
    }));
    summaryBox.hidden = bad.length === 0;
  }
  const validateAll = () => fields.map((f) => ({ f, msg: validate(f) })).filter((x) => x.msg);

  /* ----- events ----- */
  const onEdit = (/** @type {Event} */ e) => {
    if (!started) { started = true; track('quote_started'); }
    if (/** @type {HTMLElement} */ (e.target).matches?.('input[name=contact]')) syncPhone();
    const f = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-field]'));
    if (f && (attempted || f.classList.contains('has-error'))) validate(f);
    if (attempted) renderSummary(fields.map((x) => ({ f: x, msg: x.classList.contains('has-error') ? check(x) : '' })).filter((x) => x.msg));
    saveDraft();
  };
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
  // Leaving a field that was answered checks it once (not while typing for the first time).
  form.addEventListener('focusout', (e) => {
    const t = /** @type {HTMLInputElement} */ (e.target);
    const f = /** @type {HTMLElement|null} */ (t.closest?.('[data-field]'));
    if (f && !f.contains(/** @type {Node|null} */ (e.relatedTarget)) && t.value && !(t.type === 'radio' || t.type === 'checkbox')) validate(f);
  });

  const reveal = (/** @type {HTMLElement} */ el, /** @type {HTMLElement|null} */ focusEl) => {
    el.hidden = false;
    el.removeAttribute('data-entered');
    requestAnimationFrame(() => el.setAttribute('data-entered', ''));
    (focusEl || el).focus({ preventScroll: false });
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    attempted = true;
    syncPhone();
    const bad = validateAll();
    renderSummary(bad);
    if (bad.length) {
      if (ready) ready.hidden = true;
      if (summaryBox) reveal(summaryBox, summaryBox);
      return;
    }
    const req = request();
    const subject = buildSubject(ds.subject || '', { services: req.services, area: req.area });
    const body = buildBody(req, labels);
    const mail = buildMailto(to, subject, body, { max: Number(ds.maxUrl) || MAX_URL, note: ds.truncatedNote });
    if (requestBox) requestBox.value = `Subject: ${subject}\n\n${body}`;
    const reopen = /** @type {HTMLAnchorElement|null} */ ($('[data-mailto]'));
    if (reopen) reopen.href = mail.href;
    for (const a of /** @type {HTMLAnchorElement[]} */ ($$('[data-webmail]'))) a.href = buildWebmail(/** @type {any} */ (a.dataset.webmail), to, subject, mail.body);
    const sms = /** @type {HTMLAnchorElement|null} */ ($('[data-sms]'));
    if (sms && sms.dataset.phone) {
      const href = buildSms(sms.dataset.phone, [ds.smsIntro || 'Hi RNC, I just emailed a free quote request', [req.services.join(', '), req.area].filter(Boolean).join(', ')].filter(Boolean).join(': ') + '.');
      if (href) sms.href = href;
    }
    if (truncNote) truncNote.hidden = !mail.truncated;
    if (copyStatus) copyStatus.textContent = '';
    saveDraft();
    track('quote_mailto_opened', mailtoEventProps(values(), known));
    if (ready) reveal(ready, /** @type {HTMLElement|null} */ (ready.querySelector('[data-ready-heading]')));
    location.href = mail.href;
  });

  /* ----- ready panel ----- */
  /** @param {string} text @param {HTMLTextAreaElement|null} fallbackSelect */
  async function copy(text, fallbackSelect) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
    if (fallbackSelect) {
      fallbackSelect.focus(); fallbackSelect.select();
      try { if (document.execCommand('copy')) return true; } catch { /* not supported */ }
    }
    return false;
  }
  const say = (/** @type {string} */ msg) => { if (copyStatus) { copyStatus.textContent = ''; requestAnimationFrame(() => { copyStatus.textContent = msg; }); } };
  $('[data-copy]')?.addEventListener('click', async () => {
    const ok = await copy(requestBox?.value || '', requestBox);
    if (ok) { say(ds.labelCopied || 'Copied'); track('quote_copied'); }
    else { requestBox?.select(); say(ds.copyFailed || 'Copying did not work. The request is selected: copy it with your keyboard.'); }
  });
  $('[data-copy-address]')?.addEventListener('click', async () => {
    const ok = await copy(ds.email || '', null);
    say(ok ? (ds.labelAddressCopied || 'Address copied') : (ds.copyFailed || 'Copying did not work.'));
  });
  for (const a of $$('[data-webmail]')) a.addEventListener('click', () => track('quote_webmail_opened', webmailEventProps(a.dataset.webmail || '')));
  $('[data-restart]')?.addEventListener('click', () => {
    form.reset();
    safely(() => sessionStorage.removeItem(DRAFT_KEY));
    attempted = false;
    for (const f of fields) showError(f, '');
    renderSummary([]);
    if (ready) ready.hidden = true;
    syncPhone();
    const first = fields[0] && firstControl(fields[0]);
    first?.focus();
  });

  syncPhone();
}

const form = typeof document === 'undefined' ? null : /** @type {HTMLFormElement|null} */ (document.querySelector('form[data-quote-form]'));
if (form && form.querySelector('[data-field]') && !form.hasAttribute('data-enhanced')) {
  form.setAttribute('data-enhanced', '');
  init(form);
}
