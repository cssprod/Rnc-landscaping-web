// @ts-check
/**
 * Callouts: local rules, the shared regional block, source chips, conditions, the guarantee, the reassurance strip and
 * review dates (site/COMPONENTS.md "New primitives"). Paired CSS: 49-ui-callouts.css.
 *
 * Local rules are summaries of a source (CONTRACT §2): every rule shows its source chip, the verbatim excerpt, the review
 * date ("Review date to confirm" while reviewedOn is null) and, when `verify` is set, a visible note to check the source.
 * Nothing here ever claims that no rule exists.
 */
import { html, md, paras, raw } from '../../lib/html.mjs';
import { formatDate, isIsoDate } from '../../lib/dates.mjs';
import { siteJson } from '../../../site.config.mjs';
import { icon } from '../sprite.mjs';

/** Clamp a heading level to h2–h6. @param {number|undefined} n @param {number} d */
const hLevel = (n, d) => Math.min(6, Math.max(2, Math.round(Number(n) || d)));
/** Host of a URL without "www.", or the input. @param {string} u */
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return String(u || ''); } };

/** Sentence-case labels for rule topics and condition kinds (CONTRACT §6). @type {Record<string, string>} */
const TOPIC = {
  trees: 'Trees', watering: 'Watering', wells: 'Wells', burning: 'Burning', invasives: 'Invasive plants', other: 'Local rule',
  soils: 'Soils', exposure: 'Exposure', deer: 'Deer', 'salt-spray': 'Salt spray', 'water-supply': 'Water supply', 'lot-types': 'Lots',
};

/** The visible verify note. */
const verifyNote = () => html`<p class="verify-note">${icon('compass', { size: 16 })}Rules change: check the source before you plan work.</p>`;

/**
 * Link to the source of a rule or fact: "Source: {label}" (`a.source-chip`, rel="noopener").
 * @param {string} url @param {string} [label] defaults to the host name
 */
export function sourceChip(url, label) {
  if (!url) return '';
  return html`<a class="source-chip" href="${url}" rel="noopener">${icon('doc', { size: 14 })}<span>Source: ${label || hostOf(url)}</span></a>`;
}

/**
 * Review date: "Last reviewed 19 November 2026" (`p.reviewed` with `<time datetime>`), or "Review date to confirm" when
 * the date is null (nobody fetched the source yet).
 * @param {string|null|undefined} iso
 */
export function reviewedOn(iso) {
  if (iso && isIsoDate(iso)) return html`<p class="reviewed">${icon('calendar', { size: 14 })}<span>Last reviewed <time datetime="${iso}">${formatDate(iso)}</time></span></p>`;
  return html`<p class="reviewed reviewed--pending">${icon('calendar', { size: 14 })}<span>Review date to confirm</span></p>`;
}

/**
 * One sourced item (rule, condition or regional block): label, text, the verbatim excerpt, source chip, review date and
 * the verify note. The excerpt is an inline `<q cite>` in a `<p>`, never a `<blockquote>`: blockquotes are reserved for
 * testimonials (check-honesty reads every blockquote as a review).
 * @param {any} r @param {string} label @param {any} [title] heading markup (regional blocks)
 */
function sourced(r, label, title) {
  return html`${label ? html`<p class="sourced__label">${label}</p>` : ''}${title || ''}
    ${r.text ? html`<p class="sourced__text">${md(r.text)}</p>` : ''}
    ${r.excerpt && r.sourceUrl ? html`<p class="sourced__excerpt"><q cite="${r.sourceUrl}">${r.excerpt}</q></p>` : ''}
    <div class="sourced__meta">${sourceChip(r.sourceUrl, r.sourceTitle)}${reviewedOn(r.reviewedOn)}</div>
    ${r.verify ? verifyNote() : ''}`;
}

/**
 * Local rules that affect a yard in one municipality (area `localRules`, CONTRACT §6).
 * @param {any[]} rules @param {{ id: string, heading?: any, area?: string, level?: number }} o
 */
export function localRulesCallout(rules = [], o = /** @type {any} */ ({})) {
  if (!rules.length) return '';
  const id = o.id || 'rules-h';
  const H = `h${hLevel(o.level, 2)}`;
  return html`<section class="local-rules" aria-labelledby="${id}">
  <div class="local-rules__head"><span class="local-rules__icon" aria-hidden="true">${icon('doc', { size: 22 })}</span><div>${raw(`<${H} id="${id}" class="local-rules__title">`)}${o.heading || 'Local rules that affect your yard'}${raw(`</${H}>`)}${o.area ? html`<p class="local-rules__area">Summaries for ${o.area}, each linked to its source.</p>` : ''}</div></div>
  <ul class="local-rules__list l-cq">${rules.map((r) => html`<li class="sourced rule"${r.id ? raw(` data-rule="${r.id}"`) : ''}>${sourced(r, TOPIC[r.topic] || '')}</li>`)}</ul>
</section>`;
}

/**
 * The shared regional block (CRD-wide rules from content/regional.json), rendered once inside
 * `aside[data-shared="regional"]` so the duplicate checks exempt it.
 * @param {any[]} blocks @param {{ id: string, heading?: any, level?: number }} o
 */
export function sharedRegional(blocks = [], o = /** @type {any} */ ({})) {
  if (!blocks.length) return '';
  const id = o.id || 'regional-h';
  const lvl = hLevel(o.level, 2);
  return html`<aside class="regional" data-shared="regional" aria-labelledby="${id}">
  ${raw(`<h${lvl} id="${id}" class="regional__title">`)}${o.heading || 'Rules across the Capital Regional District'}${raw(`</h${lvl}>`)}
  <ul class="regional__list">${blocks.map((b) => html`<li class="sourced regional__block"${b.id ? raw(` data-rule="${b.id}"`) : ''}>${sourced(b, '', html`${raw(`<h${Math.min(6, lvl + 1)} class="sourced__title">`)}${b.heading}${raw(`</h${Math.min(6, lvl + 1)}>`)}`)}</li>`)}</ul>
</aside>`;
}

/**
 * Local conditions (soils, exposure, deer, salt spray…), each citing its source.
 * @param {any[]} list @param {{ id: string, heading?: any, level?: number }} o
 */
export function conditionsList(list = [], o = /** @type {any} */ ({})) {
  if (!list.length) return '';
  const id = o.id || 'conditions-h';
  const H = `h${hLevel(o.level, 2)}`;
  return html`<section class="conditions" aria-labelledby="${id}">
  ${raw(`<${H} id="${id}" class="conditions__title">`)}${o.heading || 'Local conditions'}${raw(`</${H}>`)}
  <ul class="conditions__list l-cq">${list.map((c) => html`<li class="sourced condition"${c.id ? raw(` data-condition="${c.id}"`) : ''}>${sourced(c, TOPIC[c.kind] || '')}</li>`)}</ul>
</section>`;
}

/**
 * The workmanship guarantee: plain-language text built around [WARRANTY]. Pass `heading` and `body` from
 * content/pages/process.json `guarantee`; without them it states the warranty token alone (never invented terms).
 * @param {{ id?: string, heading?: any, body?: string[]|string, level?: number }} [o]
 */
export function guarantee(o = {}) {
  const id = o.id || 'guarantee-h';
  const H = `h${hLevel(o.level, 2)}`;
  const body = o.body && (!Array.isArray(o.body) || o.body.length) ? o.body : [`Our workmanship guarantee is: ${siteJson.warranty}.`];
  return html`<section class="guarantee" aria-labelledby="${id}">
  <span class="guarantee__icon" aria-hidden="true">${icon('shield', { size: 26 })}</span>
  <div class="guarantee__body">${raw(`<${H} id="${id}" class="guarantee__title">`)}${o.heading || 'Our workmanship guarantee'}${raw(`</${H}>`)}${paras(body)}</div>
</section>`;
}

/** Reassurance strip: a plain list of short promises (from content/pages/quote.json `reassurance`). @param {string[]} items */
export function reassuranceStrip(items = []) {
  if (!items.length) return '';
  return html`<ul class="reassurance">${items.map((i) => html`<li class="reassurance__item">${icon('check', { size: 16 })}<span>${md(i)}</span></li>`)}</ul>`;
}
