// @ts-check
/**
 * Seasons and steps: the seasonal planner cards, the step timeline and the per-visit table.
 * API frozen in site/COMPONENTS.md (signatures only grow). Paired CSS: 48-ui-seasons.css.
 */
import { html, md, raw } from '../../lib/html.mjs';
import { icon, SEASON_ICON } from '../sprite.mjs';
import { sectionHead } from './heads.mjs';

/** Clamp a heading level to h2–h6. @param {number|undefined} n @param {number} d */
const hLevel = (n, d) => Math.min(6, Math.max(2, Math.round(Number(n) || d)));

/** Seasonal planner cards (lit solid; 1 → 2 → 4 columns by container width). @param {{ season: string, items: string[] }[]} list */
export const seasons = (list) => html`<div class="seasons-wrap l-cq"><div class="seasons">${list.map((x) => html`<div class="season season--${String(x.season).toLowerCase()}">
  <h3>${icon(SEASON_ICON[/** @type {keyof typeof SEASON_ICON} */ (x.season)] || 'leaf', { size: 20 })}${x.season}</h3>
  <ul>${x.items.map((i) => html`<li>${i}</li>`)}</ul>
</div>`)}</div></div>`;

/**
 * Step timeline: an ordered list, vertical in narrow containers and horizontal from 64em (container query) unless
 * `orientation: 'vertical'`. Step numbers are in the markup (decorative, aria-hidden: the list already conveys order);
 * `deliverable` renders as "You receive: …". With `heading` the list sits in a section with a section head (`index`
 * numbers it); step titles default to one level below. `reveal` adds the `data-reveal` hook on the section.
 * @param {{ title: any, body?: any, deliverable?: any }[]} steps
 * @param {{ id: string, heading?: any, lede?: any, orientation?: 'auto'|'vertical', index?: string, eyebrow?: string, level?: number, headingLevel?: number, reveal?: boolean }} o
 */
export function timeline(steps = [], o = /** @type {any} */ ({})) {
  if (!steps.length) return '';
  const level = hLevel(o.level, 2);
  const H = `h${hLevel(o.headingLevel, o.heading ? level + 1 : 3)}`;
  const list = html`<div class="timeline-wrap l-cq"><ol class="timeline timeline--${o.orientation === 'vertical' ? 'vertical' : 'auto'}"${!o.heading && o.id ? raw(` id="${o.id}"`) : ''}>${steps.map((s, n) => html`<li class="timeline__step">
    <span class="timeline__node" aria-hidden="true"><span class="timeline__num t-num">${String(n + 1).padStart(2, '0')}</span></span>
    <div class="timeline__body">
      ${raw(`<${H} class="timeline__title">`)}${s.title}${raw(`</${H}>`)}
      ${s.body ? html`<p class="timeline__text">${typeof s.body === 'string' ? md(s.body) : s.body}</p>` : ''}
      ${s.deliverable ? html`<p class="timeline__deliverable"><span class="timeline__deliverable-label">You receive:</span> ${typeof s.deliverable === 'string' ? md(s.deliverable) : s.deliverable}</p>` : ''}
    </div>
  </li>`)}</ol></div>`;
  if (!o.heading) return list;
  return html`<section class="section timeline-band" aria-labelledby="${o.id}"${o.reveal ? raw(' data-reveal') : ''}>
  <div class="wrap">
    ${sectionHead({ id: o.id, title: o.heading, lede: o.lede, level, index: o.index, eyebrow: o.eyebrow })}
    ${list}
  </div>
</section>`;
}

/**
 * Per-visit table (CONTRACT §6 services perVisit): a caption and Task / What happens columns. Never prices.
 * @param {{ caption: any, rows: { task: any, detail: any }[] }} t @param {{ id?: string }} [o]
 */
export function perVisitTable(t, o = {}) {
  if (!t?.rows?.length) return '';
  return html`<div class="visit-table-wrap l-cq"><table class="visit-table"${o.id ? raw(` id="${o.id}"`) : ''}>
  <caption>${t.caption}</caption>
  <thead><tr><th scope="col">Task</th><th scope="col">What happens</th></tr></thead>
  <tbody>${t.rows.map((r) => html`<tr><th scope="row">${r.task}</th><td>${typeof r.detail === 'string' ? md(r.detail) : r.detail}</td></tr>`)}</tbody>
</table></div>`;
}
