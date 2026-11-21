// @ts-check
/**
 * Bracket-token handling, applied to every generated file after rendering.
 * - Known values from site.config.mjs are substituted everywhere.
 * - Unresolved tokens: showcase builds wrap text occurrences in a placeholder
 *   chip (<mark class="ph">); launch builds record them so the build fails.
 */
import { html, raw, esc } from './html.mjs';
import { tokens, optionalTokens } from '../../site.config.mjs';

export const TOKEN_NAMES = Object.keys(tokens);
export const TOKEN_RE = new RegExp(`\\[(${TOKEN_NAMES.join('|')})\\]`, 'g');

/** @typedef {keyof typeof tokens} TokenName */

/** Value for attributes/plain text: real value or the literal token. @param {TokenName} name */
export const tok = (name) => tokens[name] ?? `[${name}]`;

/** Real value or undefined (for JSON-LD and optional features). @param {TokenName} name */
export const val = (name) => tokens[name] ?? undefined;

/** @param {TokenName} name */
export const has = (name) => tokens[name] != null && tokens[name] !== '';

/** E.164 digits for a North American number ("250-555-0100" → "+12505550100"); other forms keep their digits. @param {string} s */
export const e164 = (s) => {
  const d = s.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d;
  if (/^\d{10}$/.test(d)) return `+1${d}`;
  if (/^1\d{10}$/.test(d)) return `+${d}`;
  return d;
};

/** tel: target with the country code (tel:+1…). Call it only once PHONE is known. */
export const telHref = () => (tokens.PHONE ? `tel:${e164(tokens.PHONE)}` : 'tel:[PHONE]');

/**
 * Phone number as a link once it is known; until then the [PHONE] chip as plain text.
 * @param {string} location analytics location label @param {{ className?: string }} [o]
 */
export function telLink(location, o = {}) {
  if (!has('PHONE')) return html`<span class="${o.className || ''}">[PHONE]</span>`;
  return html`<a class="${o.className || ''}" href="${telHref()}" data-track="call_clicked" data-track-location="${location}">[PHONE]</a>`;
}

/** @param {string} location @param {{ className?: string }} [o] */
export function mailLink(location, o = {}) {
  if (!has('EMAIL')) return html`<span class="${o.className || ''}">[EMAIL]</span>`;
  return html`<a class="${o.className || ''}" href="mailto:${tok('EMAIL')}" data-track="email_clicked" data-track-location="${location}">[EMAIL]</a>`;
}

const SKIP = /(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<title>[\s\S]*?<\/title>|<textarea[\s\S]*?<\/textarea>|<option[\s\S]*?<\/option>|<!--[\s\S]*?-->|<[^>]+>)/;

/**
 * @param {string} text file content
 * @param {{ launch: boolean, file: string, issues: string[], html: boolean }} ctx
 */
export function finalizeTokens(text, ctx) {
  // 1. substitute resolved values (escaped for HTML)
  let s = text.replace(TOKEN_RE, (m, name) => {
    const v = tokens[/** @type {TokenName} */ (name)];
    return v == null ? m : ctx.html ? esc(v) : v;
  });
  // 2. report (launch) or turn into placeholder chips (showcase)
  const left = [...s.matchAll(TOKEN_RE)].map((m) => m[0]).filter((t) => !optionalTokens.includes(/** @type {TokenName} */ (t.slice(1, -1))));
  if (left.length && ctx.launch) for (const t of new Set(left)) ctx.issues.push(`unresolved token ${t} in ${ctx.file}`);
  if (left.length && ctx.html && !ctx.launch) {
    s = s.split(SKIP).map((part, i) => (i % 2 === 1 ? part : part.replace(TOKEN_RE, (m, name) => `<mark class="ph" title="Placeholder: RNC to supply">${m}</mark>`))).join('');
  }
  return s;
}

export { raw };
