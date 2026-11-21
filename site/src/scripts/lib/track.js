// @ts-check
/* Analytics (typed by event-schema.yaml; no-op unless a launch build turned Plausible on). Leaf library (CONTRACT §12). */

/** @typedef {import('../../../event-schema').AnalyticsEvents} AnalyticsEvents */
const hasPlausible = !!document.querySelector('script[data-domain][src*="plausible"]');
if (hasPlausible) {
  // @ts-ignore queue stub documented by Plausible
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
}
/**
 * @template {keyof AnalyticsEvents} K
 * @param {K} name @param {AnalyticsEvents[K]} [props]
 */
export function track(name, props) {
  // @ts-ignore
  const p = window.plausible;
  if (!hasPlausible || typeof p !== 'function') return;
  p(name, props && Object.keys(props).length ? { props } : {});
}
