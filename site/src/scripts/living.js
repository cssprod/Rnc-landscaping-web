// @ts-check
/*
 * Living art runtime (CONTRACT §8, §9, §12; motion-policy §2, §5). Loaded on every page.
 *   data-alive     on <html> after load + idle, only while prefs.motionOn() and the tab is visible; removed when
 *                  motion turns off or the tab hides. T2 loops (45-living.css) and T4 run only under it.
 *   data-hidden    on <html> while the tab is hidden (--alive-play: paused).
 *   data-offscreen on each [data-living] scene outside the viewport (IntersectionObserver; --alive-play: paused).
 *   data-entered   on [data-living] scenes on the first frame after load (T1 dolly; "still" when motion is off).
 *   data-drawn     on [data-draw] groups after idle (hero ridges) or on entry (T1 draw; "still" when motion is off).
 *   data-reveal    "armed" → "in": one-shot reveals of sections below the first viewport, only while motion is on.
 *   spotlight      T3: one passive pointermove, rAF-throttled, fine pointer and motion on only; moves one
 *                  aria-hidden glow per hovered [data-spotlight] card with translate3d. Never writes vars on :root.
 * It never reads prefers-reduced-motion itself: it asks motionOn() and listens to onMotionChange().
 */
import { motionOn, onMotionChange } from './lib/prefs.js';

const root = document.documentElement;
const idle = (/** @type {() => void} */ fn) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200));
let loaded = false;

function live() {
  if (loaded && motionOn() && !document.hidden) root.setAttribute('data-alive', '');
  else root.removeAttribute('data-alive');
}

/* ---- T1 one-shots: dolly-in and contour draws ---- */
/** @param {Element} el @param {string} attr */
const mark = (el, attr) => { if (!el.hasAttribute(attr)) el.setAttribute(attr, motionOn() ? 'go' : 'still'); };

/* ---- Off-screen pausing and on-entry draws ---- */
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    const el = /** @type {HTMLElement} */ (e.target);
    if (el.hasAttribute('data-living')) el.toggleAttribute('data-offscreen', !e.isIntersecting);
    else if (e.isIntersecting && el.hasAttribute('data-draw')) { mark(el, 'data-drawn'); io?.unobserve(el); }
  }
}, { rootMargin: '64px 0px' }) : null;

/* ---- One-shot reveals (never in the first viewport, never from opacity 0: 95-motion.css styles the states) ---- */
const reveal = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.setAttribute('data-reveal', 'in');
    reveal?.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -10% 0px' }) : null;

function armReveals() {
  if (!reveal || !motionOn()) return;
  const fold = window.innerHeight;
  for (const el of document.querySelectorAll('[data-reveal]:not([data-reveal="in"]):not([data-reveal="armed"])')) {
    if (el.getBoundingClientRect().top < fold) continue;
    el.setAttribute('data-reveal', 'armed');
    reveal.observe(el);
  }
}
function settleReveals() {
  for (const el of document.querySelectorAll('[data-reveal="armed"]')) { el.setAttribute('data-reveal', 'in'); reveal?.unobserve(el); }
}

/* ---- T3 spotlight ---- */
const fine = matchMedia('(hover: hover) and (pointer: fine)');
/** @type {HTMLElement | null} */ let spotCard = null;
let px = 0, py = 0, queued = false;
/** @param {HTMLElement} card */
function glowFor(card) {
  let spot = /** @type {HTMLElement | null} */ (card.querySelector(':scope > .spot'));
  if (!spot) {
    spot = document.createElement('span');
    spot.className = 'spot';
    spot.setAttribute('aria-hidden', 'true');
    spot.innerHTML = '<span class="spot-glow"></span>';
    card.append(spot);
  }
  return /** @type {HTMLElement} */ (spot.firstElementChild);
}
function paint() {
  queued = false;
  if (!spotCard) return;
  const r = spotCard.getBoundingClientRect();
  glowFor(spotCard).style.transform = `translate3d(${Math.round(px - r.left)}px,${Math.round(py - r.top)}px,0)`;
}
/** @param {PointerEvent} e */
function onPointer(e) {
  if (e.pointerType !== 'mouse' || !fine.matches || !root.hasAttribute('data-alive')) return;
  const t = /** @type {Element | null} */ (e.target instanceof Element ? e.target : null);
  spotCard = /** @type {HTMLElement | null} */ (t?.closest('[data-spotlight]') || null);
  if (!spotCard) return;
  px = e.clientX; py = e.clientY;
  if (!queued) { queued = true; requestAnimationFrame(paint); }
}
let spotOn = false;
function spotlight() {
  const want = motionOn() && fine.matches && !!document.querySelector('[data-spotlight]');
  if (want === spotOn) return;
  spotOn = want;
  if (want) document.addEventListener('pointermove', onPointer, { passive: true });
  else document.removeEventListener('pointermove', onPointer);
}

/* ---- Wiring ---- */
function start() {
  for (const s of document.querySelectorAll('[data-living]')) { io?.observe(s); }
  // The hero settles on the first frame after load; its ridges draw after idle. Other draws wait for entry.
  requestAnimationFrame(() => { for (const s of document.querySelectorAll('[data-living]')) mark(s, 'data-entered'); });
  idle(() => {
    loaded = true;
    live();
    for (const g of document.querySelectorAll('[data-draw]')) {
      if (g.closest('.scene--hero') && g.getBoundingClientRect().top < window.innerHeight) mark(g, 'data-drawn');
      else if (io) io.observe(g); else mark(g, 'data-drawn');
    }
    armReveals();
    spotlight();
  });
}

if (document.readyState === 'complete') start();
else addEventListener('load', start, { once: true });

document.addEventListener('visibilitychange', () => {
  root.toggleAttribute('data-hidden', document.hidden);
  live();
});
onMotionChange(({ on }) => {
  live();
  spotlight();
  if (!on) {
    settleReveals();
    for (const g of document.querySelectorAll('[data-draw]:not([data-drawn])')) { g.setAttribute('data-drawn', 'still'); io?.unobserve(g); }
  }
});
fine.addEventListener('change', spotlight);
