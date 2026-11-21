// @ts-check
/**
 * Inline SVG sprite: the logo (squircle tile + outlined wordmark) and a small
 * line-icon set drawn on a 24px grid with 1.75px strokes. Every page includes
 * it once at the top of <body>; components reference symbols with <use>.
 */
import { html, raw } from '../lib/html.mjs';
import { WORD_VIEWBOX, WORD_RNC, WORD_LANDSCAPING, FIR, GROUND } from './brand-paths.mjs';

/** Superellipse squircle (n = 5) in a 64-unit box. */
function squircle(n = 5, steps = 64) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    pts.push(`${(32 + 32 * Math.sign(c) * Math.abs(c) ** (2 / n)).toFixed(1)} ${(32 + 32 * Math.sign(s) * Math.abs(s) ** (2 / n)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}
const TILE = squircle();

/** @type {Record<string, string>} stroke icons (24 × 24) */
const STROKE = {
  phone: '<path d="M6.6 3.5h2.3l1.4 4-1.9 1.3a12 12 0 0 0 6.8 6.8l1.3-1.9 4 1.4v2.3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M9 7h8v8"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  menu: '<path d="M4 8.5h16M4 15.5h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  leaf: '<path d="M5 19c0-8 5.5-13.5 14-14 .5 8.5-5 14-13 14z"/><path d="M5 19l8-8"/>',
  spade: '<path d="M9.5 3.5h5M12 3.5V11"/><path d="M7.5 11h9v3.8a4.5 4.5 0 0 1-9 0z"/>',
  drop: '<path d="M12 3.5s6 6.3 6 10.5a6 6 0 0 1-12 0c0-4.2 6-10.5 6-10.5z"/><path d="M9.3 14.3a2.8 2.8 0 0 0 2.7 2.6"/>',
  tree: '<path d="M12 3 7.5 9.4H10L6 14.8h3.4L5.5 20h13l-3.9-5.2H18l-4-5.4h2.5z"/>',
  shield: '<path d="M12 3.5 19 6v5.5c0 4.3-3 7.7-7 9-4-1.3-7-4.7-7-9V6z"/><path d="m9 12 2.2 2.2 4.3-4.2"/>',
  doc: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4M9 12.5h6M9 16h6"/>',
  badge: '<circle cx="12" cy="9.5" r="5.5"/><path d="m9 14.5-1.5 6 4.5-2.5 4.5 2.5-1.5-6"/>',
  users: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M15.5 6.2a3 3 0 0 1 0 5.6M17 14.2a5.5 5.5 0 0 1 3.5 4.8"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  map: '<path d="m9 4.5-5 2v13l5-2 6 2 5-2v-13l-5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2H6.5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  sprout: '<path d="M12 20v-8"/><path d="M12 12C12 8.5 9.5 6 5.5 6c0 3.5 2.5 6 6.5 6zM12 14c0-3 2.2-5.5 6-5.5 0 3-2.2 5.5-6 5.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m9.5 4.6 2.5 2 2.5-2M9.5 19.4l2.5-2 2.5 2"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  chat: '<path d="M4.5 6.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H11l-4.5 4v-4h0a2 2 0 0 1-2-2z"/>',
  ruler: '<path d="m3.5 15.5 12-12 5 5-12 12z"/><path d="m7 12 2 2M10 9l2 2M13 6l2 2"/>',
};

/** Which icon represents each service and season. */
export const SERVICE_ICON = { 'grounds-maintenance': 'leaf', 'landscape-installation': 'spade', irrigation: 'drop', 'tree-vegetation': 'tree' };
export const SEASON_ICON = { Spring: 'sprout', Summer: 'sun', Fall: 'leaf', Autumn: 'leaf', Winter: 'snow' };

/**
 * @param {string} name @param {{ size?: number, className?: string }} [o]
 */
export const icon = (name, o = {}) => html`<svg class="i ${o.className || ''}" width="${o.size || 20}" height="${o.size || 20}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

/** Logo lockup (tile + wordmark). The wordmark uses currentColor. */
const [, , WORD_W, WORD_H] = WORD_VIEWBOX.split(' ').map(Number);
export const logo = () => html`<svg class="brand__tile" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="#logo-tile"/></svg><svg class="brand__word" viewBox="0 0 ${WORD_W} ${WORD_H}" aria-hidden="true" focusable="false"><use href="#logo-word" width="${WORD_W}" height="${WORD_H}"/></svg>`;

export function sprite() {
  const icons = Object.entries(STROKE).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join('');
  const quote = '<symbol id="i-quote" viewBox="0 0 24 24" fill="currentColor"><path d="M7 17.5c-1.8 0-3.2-1.4-3.2-3.3 0-3.9 2.8-7 6.4-8.4l.7 1.3c-2 1.2-3.3 2.7-3.6 4.1h.2c1.7 0 3 1.3 3 3.1S9.1 17.5 7 17.5zm10 0c-1.8 0-3.2-1.4-3.2-3.3 0-3.9 2.8-7 6.4-8.4l.7 1.3c-2 1.2-3.3 2.7-3.6 4.1h.2c1.7 0 3 1.3 3 3.1s-1.4 3.2-3.5 3.2z"/></symbol>';
  const tile = `<symbol id="logo-tile" viewBox="0 0 64 64"><g clip-path="url(#lt-c)"><path d="${TILE}" fill="url(#lt-g)"/><rect width="64" height="64" fill="url(#lt-s)"/><path d="${GROUND}" fill="url(#lt-h)"/><path d="${FIR}" fill="#fff"/></g><path d="${TILE}" fill="none" stroke="#fff" stroke-opacity=".22"/></symbol>`;
  const word = `<symbol id="logo-word" viewBox="${WORD_VIEWBOX}"><path d="${WORD_RNC}" fill="currentColor"/><path d="${WORD_LANDSCAPING}" fill="currentColor"/></symbol>`;
  const defs = `<defs><linearGradient id="lt-g" x1="12" y1="0" x2="52" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3A7D55"/><stop offset=".55" stop-color="#1D4A33"/><stop offset="1" stop-color="#0B1F15"/></linearGradient><radialGradient id="lt-s" cx="18" cy="6" r="44" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".6" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><linearGradient id="lt-h" x1="32" y1="43" x2="32" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7CC596"/><stop offset=".45" stop-color="#3F8A5A"/><stop offset="1" stop-color="#2A6A43"/></linearGradient><clipPath id="lt-c"><path d="${TILE}"/></clipPath></defs>`;
  return raw(`<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false">${defs}${tile}${word}${icons}${quote}</svg>`);
}
