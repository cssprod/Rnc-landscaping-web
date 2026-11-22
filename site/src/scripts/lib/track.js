// @ts-check
/* Analytics (CONTRACT §1, §13). Leaf library. Plausible is cookieless and loads only in launch builds with
   [PLAUSIBLE DOMAIN] set (layout.mjs); everywhere else track() is a no-op. Event names and props are typed by
   event-schema.yaml (event-schema.d.ts). Props never carry personal data: only slugs and placement labels. */

/** @typedef {import('../../../event-schema').AnalyticsEvents} AnalyticsEvents */
const hasPlausible = !!document.querySelector('script[data-domain][src^="https://plausible.io/"]');
if (hasPlausible) {
  // Queue stub documented by Plausible: calls made before its script runs are replayed by it.
  // @ts-ignore
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
}

/**
 * @template {keyof AnalyticsEvents} K
 * @param {K} name @param {AnalyticsEvents[K]} [props]
 */
export function track(name, props) {
  if (!hasPlausible) return;
  // @ts-ignore
  const p = window.plausible;
  if (typeof p !== 'function') return;
  try { p(name, props && Object.keys(props).length ? { props } : {}); } catch { /* analytics never breaks the page */ }
}
