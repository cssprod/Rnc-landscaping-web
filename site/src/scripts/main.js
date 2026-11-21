// @ts-check
/* RNC Landscaping: progressive-enhancement islands. Every page works without this file.
   main.js is the chrome (header state, disclosures, mobile sheet, delegated data-track clicks); the quote stepper and the
   portfolio filters live in quote.js and projects.js, which initialise themselves on their own hooks (CONTRACT §12).
   W1: imported statically here so they load on every page; routes declare scripts: ['quote'] / ['projects'] from ia on,
   which resolve to the same hashed URLs, so each module still evaluates once. ds-chrome drops these imports in W2. */
import { track } from './lib/track.js';
import './quote.js';
import './projects.js';

export { track };

/* ---------- analytics: delegated data-track clicks ---------- */
document.addEventListener('click', (e) => {
  const a = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-track]'));
  if (!a) return;
  const ev = a.dataset.track;
  const location = a.dataset.trackLocation || 'unknown';
  if (ev === 'call_clicked') track('call_clicked', { location });
  else if (ev === 'email_clicked') track('email_clicked', { location });
  else if (ev === 'capability_statement_downloaded') track('capability_statement_downloaded');
});

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const DESKTOP = matchMedia('(min-width: 1120px)');

/* ---------- header: scrolled state and glass tint over the hero ---------- */
const header = /** @type {HTMLElement|null} */ (document.querySelector('[data-header]'));
const heroEl = /** @type {HTMLElement|null} */ (document.querySelector('.hero'));
if (header) {
  let ticking = false;
  const update = () => {
    ticking = false;
    header.classList.toggle('is-scrolled', scrollY > 8);
    if (heroEl) header.classList.toggle('is-over-media', heroEl.getBoundingClientRect().bottom > 76);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* ---------- mobile navigation sheet ---------- */
const toggle = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-nav-toggle]'));
const nav = document.getElementById('site-nav');
if (toggle && nav) {
  const label = /** @type {HTMLElement|null} */ (toggle.querySelector('.nav-toggle__label'));
  const set = (/** @type {boolean} */ open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('nav-open', open);
    header?.classList.toggle('is-open', open);
    if (label) label.textContent = open ? 'Close' : 'Menu';
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  };
  toggle.setAttribute('aria-label', 'Menu');
  toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
  // A tap on the dimmed page behind the sheet closes it.
  header?.addEventListener('click', (e) => { if (e.target === header && toggle.getAttribute('aria-expanded') === 'true') set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { set(false); toggle.focus(); } });
  DESKTOP.addEventListener('change', () => set(false));
}

/* ---------- services panel (disclosure pattern) ---------- */
for (const item of document.querySelectorAll('[data-mega]')) {
  const btn = /** @type {HTMLButtonElement} */ (item.querySelector('[data-mega-toggle]'));
  const panel = /** @type {HTMLElement} */ (item.querySelector('[data-mega-panel]'));
  const set = (/** @type {boolean} */ open) => { btn.setAttribute('aria-expanded', String(open)); panel.classList.toggle('is-open', open); };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  item.addEventListener('keydown', (e) => {
    if (/** @type {KeyboardEvent} */ (e).key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { e.stopPropagation(); set(false); btn.focus(); }
  });
  item.addEventListener('focusout', (e) => { const to = /** @type {FocusEvent} */ (e).relatedTarget; if (DESKTOP.matches && (!to || !item.contains(/** @type {Node} */ (to)))) set(false); });
  document.addEventListener('click', (e) => { if (DESKTOP.matches && !item.contains(/** @type {Node} */ (e.target))) set(false); });
}

/* ---------- glass highlight that follows the pointer ---------- */
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.addEventListener('pointermove', (e) => {
    if (reduceMotion.matches) return;
    const el = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest?.('.glass-card, .tile__link, .btn--glass, .btn--light'));
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  }, { passive: true });
}
