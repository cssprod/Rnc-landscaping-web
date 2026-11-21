// @ts-check
/**
 * Dates (CONTRACT §6): content stores ISO YYYY-MM-DD; pages display "19 November 2026"
 * (day month year, Canadian English, no weekday). Pure functions, UTC throughout so a
 * date never shifts with the build machine's time zone.
 */
import { html } from './html.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written YYYY-MM-DD. @param {unknown} iso */
export function isIsoDate(iso) {
  const m = typeof iso === 'string' ? iso.match(ISO) : null;
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** "2026-11-19" → "19 November 2026"; anything that is not an ISO date is returned unchanged. @param {string} iso */
export function formatDate(iso) {
  if (!isIsoDate(iso)) return String(iso ?? '');
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** `<time datetime="2026-11-19">19 November 2026</time>`; empty for a missing date. @param {string|null|undefined} iso @param {{ className?: string }} [o] */
export function timeEl(iso, o = {}) {
  if (!iso) return html``;
  return o.className ? html`<time class="${o.className}" datetime="${iso}">${formatDate(iso)}</time>` : html`<time datetime="${iso}">${formatDate(iso)}</time>`;
}
