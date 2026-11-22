// @ts-check
/**
 * Projects: cards, the filterable grid, the before/after comparison, the spec strip and the plant palette.
 * API frozen in site/COMPONENTS.md (signatures only grow). Paired CSS: 43-ui-projects.css.
 * Never budgets, prices or invented numbers (CONTRACT §2): the spec strip shows only content fields.
 */
import { html, raw } from '../../lib/html.mjs';
import { picture, hasPhoto } from '../../lib/images.mjs';
import { site } from '../../../site.config.mjs';
import { icon } from '../sprite.mjs';
import { sampleLabel, serviceIcon } from './actions.mjs';

/** Clamp a heading level to h2–h6. @param {number|undefined} n @param {number} d */
const hLevel = (n, d) => Math.min(6, Math.max(2, Math.round(Number(n) || d)));

/** @param {any} data @param {any} p project @param {{ headingLevel?: number }} [o] */
export function projectCard(data, p, o = {}) {
  const img = p.images?.after || p.images?.gallery?.[0] || `proj-${p.service}-1`;
  const H = `h${hLevel(o.headingLevel, 3)}`;
  return html`<li class="card project-card" data-service="${p.service}" data-area="${p.area}">
  <a href="/projects/${p.slug}/" class="card__link">
    <div class="card__media">${picture(img, { sizes: '(min-width: 1100px) 380px, (min-width: 640px) 50vw, 100vw', sample: !p.sample && hasPhoto(img), credit: false, aspect: '4:3' })}${p.sample ? sampleLabel('project') : ''}</div>
    <div class="card__body">
      <span class="card__meta">${icon(serviceIcon(p.service), { size: 16 })}${data.services[p.service]?.navLabel || p.service} · ${data.areas[p.area]?.name || p.area}</span>
      ${raw(`<${H} class="card__title">`)}${p.title}${raw(`</${H}>`)}
      <p class="card__text">${p.summary}</p>
    </div>
  </a>
</li>`;
}

/** @param {any} data @param {any[]} projects @param {{ filters?: boolean, headingLevel?: number }} [o] */
export function projectGrid(data, projects, o = {}) {
  const usedAreas = site.areas.filter((a) => projects.some((p) => p.area === a));
  const filters = o.filters ? html`<form class="filters glass-bar" action="" method="get" data-filters aria-label="Filter projects">
    <fieldset class="segmented"><legend class="vh">Service</legend>
      <label class="segmented__opt"><input type="radio" name="service" value="" checked><span>All work</span></label>
      ${site.services.map((s) => html`<label class="segmented__opt"><input type="radio" name="service" value="${s}"><span>${data.services[s]?.navLabel || s}</span></label>`)}
    </fieldset>
    <div class="filters__area"><label for="f-area">Area</label><div class="select"><select id="f-area" name="area"><option value="">All areas</option>${usedAreas.map((a) => html`<option value="${a}">${data.areas[a]?.name || a}</option>`)}</select>${icon('chevron', { size: 16 })}</div></div>
    <button class="btn btn--secondary btn--sm" type="submit" data-filters-submit>Apply</button>
    <p class="filters__count" role="status" aria-live="polite" data-filters-count>${projects.length} projects shown</p>
  </form>` : '';
  return html`${filters}<div class="card-grid-wrap l-cq"><ul class="card-grid" data-project-grid>${projects.map((p) => projectCard(data, p, o))}</ul></div>
  ${o.filters ? html`<p class="filters__empty" data-filters-empty hidden>No projects match those filters yet. <a href="/projects/">Show all projects</a>.</p>` : ''}`;
}

/**
 * Keyboard-operable before/after comparison (only rendered when both photos exist). Without JS the two images sit side by
 * side. The "Side by side" toggle (`button[data-ba-toggle][aria-pressed]`) ships `hidden`: the script that wires it
 * (projects.js, t-projects) un-hides it, so no control ever appears that does nothing.
 * @param {string} before @param {string} after @param {string} label @param {{ toggle?: boolean, id?: string }} [o]
 */
export function beforeAfter(before, after, label, o = {}) {
  const id = o.id || `ba-${before}`;
  return html`<figure class="ba" data-ba>
  <div class="ba__stage">
    <div class="ba__img ba__img--before"><span class="ba__tag">Before</span>${picture(before, { sizes: '(min-width: 1200px) 1200px, 100vw', credit: false, sample: hasPhoto(before) })}</div>
    <div class="ba__img ba__img--after"><span class="ba__tag">After</span>${picture(after, { sizes: '(min-width: 1200px) 1200px, 100vw', credit: false, sample: hasPhoto(after) })}</div>
    <span class="ba__handle" aria-hidden="true"><span class="ba__knob">${icon('chevron-right', { size: 16, className: 'ba__l' })}${icon('chevron-right', { size: 16 })}</span></span>
  </div>
  <div class="ba__control"><label for="${id}">Compare before and after</label><input id="${id}" type="range" min="0" max="100" value="50" step="1" data-ba-range aria-valuetext="50% after image shown">${o.toggle === false ? '' : html`<button type="button" class="btn btn--secondary btn--sm ba__toggle" aria-pressed="false" data-ba-toggle hidden>Side by side</button>`}</div>
  <figcaption>${label}</figcaption>
</figure>`;
}

/**
 * Spec strip: label/value pairs from content only (municipality, service, client type, season, duration, scope tags;
 * never budgets or invented counts). Values may link (`href`). Tabular figures; 2 columns, 4 when there is room.
 * @param {{ label: any, value: any, href?: string }[]} items @param {{ id?: string, compact?: boolean }} [o]
 */
export function specStrip(items = [], o = {}) {
  const list = items.filter((i) => i && i.value != null && i.value !== '' && !(Array.isArray(i.value) && !i.value.length));
  if (!list.length) return '';
  return html`<dl class="spec-strip${o.compact ? ' spec-strip--compact' : ''}"${o.id ? raw(` id="${o.id}"`) : ''}>${list.map((i) => html`<div class="spec-strip__item"><dt>${i.label}</dt><dd>${i.href ? html`<a href="${i.href}">${Array.isArray(i.value) ? i.value.join(', ') : i.value}</a>` : Array.isArray(i.value) ? i.value.join(', ') : i.value}</dd></div>`)}</dl>`;
}

/**
 * Plant palette: common name, botanical name (italic, lang="la") and an optional note. With `sample` the heading reads
 * "Sample plant palette" with the Sample chip (CONTRACT §6).
 * @param {{ common: string, botanical?: string, note?: string }[]} list @param {{ sample?: boolean, headingLevel?: number, id?: string }} [o]
 */
export function plantPalette(list = [], o = {}) {
  if (!list.length) return '';
  const id = o.id || 'plants-h';
  const H = `h${hLevel(o.headingLevel, 2)}`;
  return html`<section class="plant-palette" aria-labelledby="${id}">
  ${raw(`<${H} id="${id}" class="plant-palette__title">`)}${o.sample ? html`${sampleLabel()} plant palette` : 'Plant palette'}${raw(`</${H}>`)}
  <ul class="plant-palette__list">${list.map((pl) => html`<li class="plant">${icon('sprout', { size: 18, className: 'plant__icon' })}<span class="plant__names"><span class="plant__common">${pl.common}</span>${pl.botanical ? html` <i class="plant__botanical" lang="la">${pl.botanical}</i>` : ''}</span>${pl.note ? html`<span class="plant__note">${pl.note}</span>` : ''}</li>`)}</ul>
</section>`;
}
