// @ts-check
/* RNC Landscaping chrome (CONTRACT §5, §8, §12, §13; site/COMPONENTS.md §Chrome). Every page works without this file:
   the nav is a plain list, the disclosures open on hover and focus, the toggles are hidden and the sticky bar stays put.
   main.js adds the header state, the Services / Service areas disclosures, the mobile sheet (inert background, Escape,
   focus return, accordions), the Dark theme / Animations toggles, the sticky bar's visibility and delegated data-track
   clicks. Feature modules (quote.js, projects.js, areas.js) load per route through layout's scripts[]; living.js loads on
   every page and owns data-alive. Motion is asked of lib/prefs.js, never of matchMedia. */
import { track } from './lib/track.js';
import { theme, setTheme, onThemeChange, motionOn, setMotion, onMotionChange } from './lib/prefs.js';

export { track };

const root = document.documentElement;
/** The content breakpoint where the header row replaces the sheet and the sticky bar (CONTRACT §5). */
const DESKTOP = matchMedia('(min-width: 64em)');

/* ---------- analytics: delegated data-track clicks (CONTRACT §13 names only) ---------- */
document.addEventListener('click', (e) => {
  const a = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest?.('[data-track]'));
  if (!a) return;
  const ev = a.dataset.track || '';
  const location = a.dataset.trackLocation || 'unknown';
  if (ev === 'call_click') track('call_click', { location });
  else if (ev === 'sms_click') track('sms_click', { location });
  else if (ev === 'email_click') track('email_click', { location });
  else if (ev === 'capability_statement_downloaded') track('capability_statement_downloaded');
});

/* ---------- header: scrolled state, glass tint over the photo hero, blur off over living art ---------- */
const header = /** @type {HTMLElement|null} */ (document.querySelector('[data-header]'));
const capsule = /** @type {HTMLElement|null} */ (header?.querySelector('.nav-capsule') || null);
const heroEl = /** @type {HTMLElement|null} */ (document.querySelector('.hero'));
const living = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('[data-living]')]);
if (header) {
  let ticking = false;
  const update = () => {
    ticking = false;
    const bottom = capsule ? capsule.getBoundingClientRect().bottom : 76;
    const scrolled = scrollY > 8;
    header.classList.toggle('is-scrolled', scrolled);
    root.toggleAttribute('data-scrolled', scrolled);
    if (heroEl) header.classList.toggle('is-over-media', heroEl.getBoundingClientRect().bottom > bottom);
    // Blur over animated art costs 4x compositor work (DESIGN-DIRECTION §7): the capsule stays fill-only over it.
    root.toggleAttribute('data-header-over-living', living.some((el) => { const r = el.getBoundingClientRect(); return r.top < bottom && r.bottom > 0; }));
  };
  const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  update();
}

/* ---------- desktop header row: degrade instead of overlapping (WCAG 1.4.12 Text Spacing) ---------- */
// With wider text (a user text-spacing stylesheet, a larger default font) the row would overflow into the toggles.
// data-fit="compact" folds the toggle labels back into 44 px icon buttons and tightens the item padding;
// data-fit="tight" also drops the visible wordmark (the logo tile and the link's name "RNC Landscaping home" stay).
const siteNav = document.getElementById('site-nav');
if (header && capsule && siteNav) {
  const LEVELS = ['compact', 'tight'];
  const overflows = () => siteNav.scrollWidth > siteNav.clientWidth + 1 || capsule.scrollWidth > capsule.clientWidth + 1;
  const fit = () => {
    header.removeAttribute('data-fit');
    if (!DESKTOP.matches) return;
    for (const level of LEVELS) { if (!overflows()) break; header.dataset.fit = level; }
  };
  const ro = new ResizeObserver(fit);
  for (const el of [capsule, ...siteNav.querySelectorAll('.site-nav__list, .site-nav__actions')]) ro.observe(el);
  document.fonts?.ready.then(fit);
}

/* ---------- Services / Service areas disclosures (buttons, never href="#") ---------- */
/** @typedef {{ btn: HTMLButtonElement, panel: HTMLElement, item: HTMLElement, set: (open: boolean) => void }} Disclosure */
/** @type {Disclosure[]} */
const disclosures = [];
for (const btn of /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('button[data-disclosure][aria-controls]'))) {
  const panel = document.getElementById(btn.getAttribute('aria-controls') || '');
  const item = /** @type {HTMLElement} */ (btn.parentElement);
  if (!panel || !item) continue;
  const set = (/** @type {boolean} */ open) => { btn.setAttribute('aria-expanded', String(open)); panel.classList.toggle('is-open', open); };
  disclosures.push({ btn, panel, item, set });
}
for (const d of disclosures) {
  d.btn.addEventListener('click', () => {
    const open = d.btn.getAttribute('aria-expanded') !== 'true';
    // Desktop: one menu at a time. In the sheet they are independent accordions.
    if (open && DESKTOP.matches) for (const o of disclosures) if (o !== d) o.set(false);
    d.set(open);
  });
  d.item.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && d.btn.getAttribute('aria-expanded') === 'true') { e.stopPropagation(); d.set(false); d.btn.focus(); }
  });
  // Close when focus moves to a known element outside the item. A click on the panel's own text or padding blurs the
  // button with no relatedTarget (and macOS Safari does not focus links on mousedown): that must not close the panel
  // under the pointer. Clicks outside are handled by the document listener below.
  d.item.addEventListener('focusout', (e) => {
    const to = /** @type {Node|null} */ (e.relatedTarget);
    if (DESKTOP.matches && to && !d.item.contains(to)) d.set(false);
  });
}
document.addEventListener('click', (e) => {
  if (!DESKTOP.matches) return;
  for (const d of disclosures) if (!d.item.contains(/** @type {Node} */ (e.target))) d.set(false);
});

/* ---------- sticky Call / Free-quote bar (< 64em) ---------- */
const bar = /** @type {HTMLElement|null} */ (document.querySelector('[data-action-bar]'));
/** Reasons the bar is hidden right now: 'form', 'hero', 'keyboard', 'sheet'. */
const barHold = new Set();
/* Only the class flips: 30-chrome.css slides the bar out and then sets visibility: hidden, which takes it out of the
   tab order and the accessibility tree. No inert / aria-hidden toggle, so a scroll-driven hide is not mistaken for an
   auto-advancing widget (motion-audit #no-auto-advance). The sheet still makes the bar inert with the rest of the page. */
const syncBar = () => { bar?.classList.toggle('is-hidden', barHold.size > 0); };
/** @param {string} reason @param {boolean} on */
const holdBar = (reason, on) => { if (on) barHold.add(reason); else barHold.delete(reason); syncBar(); };
if (bar) {
  /** Hide while any of these is in view: the quote form (CONTRACT §8) and the hero's own actions (DESIGN-DIRECTION §14). */
  for (const [reason, sel] of [['form', '[data-quote-form]'], ['hero', '[data-hero-actions]']]) {
    const els = [...document.querySelectorAll(sel)];
    if (!els.length) continue;
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); }
      holdBar(reason, seen.size > 0);
    });
    for (const el of els) io.observe(el);
  }
  // On-screen keyboard: the visual viewport loses more than 150 px of the layout viewport (zoom-independent).
  const vv = window.visualViewport;
  if (vv) {
    const kb = () => holdBar('keyboard', innerHeight - vv.height * vv.scale > 150);
    vv.addEventListener('resize', kb);
    kb();
  }
}

/* ---------- mobile navigation sheet: one nav DOM, inert background, Escape, focus return ---------- */
const toggle = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-nav-toggle]'));
const nav = document.getElementById('site-nav');
if (toggle && nav && header) {
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  /** Everything outside the header is inert while the sheet is open (the sprite and scripts are harmless either way). */
  const background = () => /** @type {HTMLElement[]} */ ([...document.body.children]).filter((el) => el !== header && !/^(SCRIPT|TEMPLATE)$/.test(el.tagName));
  /** @param {boolean} open @param {{ returnFocus?: boolean }} [o] */
  const set = (open, o = {}) => {
    if (open === isOpen()) return;
    // The name stays "Menu" (COMPONENTS.md §Chrome; visible label = name, WCAG 2.5.3); aria-expanded carries the state
    // and the bars turn into a cross.
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    root.classList.toggle('nav-open', open);
    for (const el of background()) el.inert = open;
    holdBar('sheet', open);
    if (open) {
      const first = /** @type {HTMLElement|null} */ (nav.querySelector('a[href], button:not([disabled])'));
      first?.focus();
    } else {
      for (const d of disclosures) d.set(false);
      if (o.returnFocus) toggle.focus();
    }
  };
  toggle.addEventListener('click', () => set(!isOpen(), { returnFocus: true }));
  // A tap on the dimmed page behind the sheet closes it.
  header.addEventListener('click', (e) => { if (e.target === header && isOpen()) set(false, { returnFocus: true }); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) { e.preventDefault(); set(false, { returnFocus: true }); } });
  // Following a link inside the sheet closes it (same-page anchors, and the page left behind when bfcache restores it).
  nav.addEventListener('click', (e) => { if (!DESKTOP.matches && /** @type {HTMLElement} */ (e.target).closest('a[href]')) set(false); });
  addEventListener('pageshow', () => set(false));
  DESKTOP.addEventListener('change', () => { set(false); for (const d of disclosures) d.set(false); });
}

/* ---------- Dark theme / Animations toggles (aria-pressed, persisted by prefs.js) ---------- */
const themeBtn = /** @type {HTMLButtonElement|null} */ (document.querySelector('button[data-pref="theme"]'));
const motionBtn = /** @type {HTMLButtonElement|null} */ (document.querySelector('button[data-pref="motion"]'));
const metaTheme = /** @type {HTMLMetaElement|null} */ (document.querySelector('meta[name="theme-color"]'));
/** <meta name=theme-color> follows the effective theme (tokens.css --meta-theme is the page background). */
const syncMeta = () => {
  const c = getComputedStyle(root).getPropertyValue('--meta-theme').trim();
  if (metaTheme && c) metaTheme.content = c;
};
const syncPrefs = () => {
  themeBtn?.setAttribute('aria-pressed', String(theme() === 'dark'));
  motionBtn?.setAttribute('aria-pressed', String(motionOn()));
  syncMeta();
};
/** A CSS time token ("520ms", "0.5s") in milliseconds. @param {string} name */
const durMs = (name) => {
  const v = getComputedStyle(root).getPropertyValue(name).trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? (v.endsWith('ms') ? n : n * 1000) : 0;
};
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    const apply = () => { setTheme(next); syncPrefs(); };
    const doc = /** @type {Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }} */ (document);
    const dur = durMs('--dur-theme');
    // T1 "moonrise" reveal: a circle grows from the button. Only while motion is effective; focus stays on the button.
    if (!motionOn() || !doc.startViewTransition || !dur) { apply(); return; }
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = doc.startViewTransition(apply);
    vt.ready.then(() => {
      const opts = { duration: dur, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
      // Script animations sort above the UA cross-fade, so these replace it on the root snapshot pair.
      root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`], opacity: [1, 1], mixBlendMode: ['normal', 'normal'] }, { ...opts, pseudoElement: '::view-transition-new(root)' });
      root.animate({ opacity: [1, 1], mixBlendMode: ['normal', 'normal'] }, { ...opts, pseudoElement: '::view-transition-old(root)' });
    }).catch(() => { /* skipped transition: the theme is already applied */ });
  });
}
motionBtn?.addEventListener('click', () => { setMotion(!motionOn()); syncPrefs(); });
onThemeChange(syncPrefs);
onMotionChange(syncPrefs);
syncPrefs();
