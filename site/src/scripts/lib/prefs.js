// @ts-check
/*
 * Theme and motion state (CONTRACT §8). Leaf library: the only script that reads the OS motion setting; every other
 * script asks motionOn() and listens to onMotionChange().
 *
 * <html> attributes: data-theme absent | dark | light (absent means dark), data-motion absent | on | off (absent means
 * auto: motion is effective with .js and prefers-reduced-motion: no-preference). HEAD_SCRIPT applies a stored choice
 * before paint; this module changes and stores it.
 *
 * Events on document:
 *   rnc:theme  { detail: { theme } }
 *   rnc:motion { detail: { on, source: 'user' | 'system' } }   'system' when the OS setting changes and no choice is stored
 */

const root = document.documentElement;
const THEME_KEY = 'rnc-theme';
const MOTION_KEY = 'rnc-motion';
const osMotion = matchMedia('(prefers-reduced-motion: no-preference)');

/** @param {string} k @param {string} v */
const store = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage may be blocked */ } };

/** @returns {'dark'|'light'} */
export function theme() {
  return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/** @param {'dark'|'light'} t */
export function setTheme(t) {
  const next = t === 'light' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  store(THEME_KEY, next);
  document.dispatchEvent(new CustomEvent('rnc:theme', { detail: { theme: next } }));
}

/** @param {(theme: 'dark'|'light') => void} fn @returns {() => void} unsubscribe */
export function onThemeChange(fn) {
  const h = (/** @type {Event} */ e) => fn(/** @type {CustomEvent} */ (e).detail.theme);
  document.addEventListener('rnc:theme', h);
  return () => document.removeEventListener('rnc:theme', h);
}

/** Is motion effective right now? */
export function motionOn() {
  const m = root.getAttribute('data-motion');
  if (m === 'on') return true;
  if (m === 'off') return false;
  return root.classList.contains('js') && osMotion.matches;
}

/**
 * Store an explicit choice. Turning motion off also drops data-alive at once, so no T2 loop survives the click;
 * living.js sets data-alive again (after idle) when it hears rnc:motion with on: true.
 * @param {boolean} on
 */
export function setMotion(on) {
  const v = on ? 'on' : 'off';
  root.setAttribute('data-motion', v);
  if (!on) root.removeAttribute('data-alive');
  store(MOTION_KEY, v);
  document.dispatchEvent(new CustomEvent('rnc:motion', { detail: { on: !!on, source: 'user' } }));
}

/** @param {(detail: { on: boolean, source: 'user'|'system' }) => void} fn @returns {() => void} unsubscribe */
export function onMotionChange(fn) {
  const h = (/** @type {Event} */ e) => fn(/** @type {CustomEvent} */ (e).detail);
  document.addEventListener('rnc:motion', h);
  return () => document.removeEventListener('rnc:motion', h);
}

// The OS setting only matters while no explicit choice is stored on <html>.
osMotion.addEventListener('change', () => {
  if (root.hasAttribute('data-motion')) return;
  document.dispatchEvent(new CustomEvent('rnc:motion', { detail: { on: motionOn(), source: 'system' } }));
});
