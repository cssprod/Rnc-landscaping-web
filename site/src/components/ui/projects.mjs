// @ts-check
/**
 * Projects: cards, the filterable grid and the before/after comparison.
 * Split mechanically from components/ui.mjs in W1 (byte-identical output); API frozen in site/COMPONENTS.md.
 */
import { html, raw } from '../../lib/html.mjs';
import { picture, hasPhoto } from '../../lib/images.mjs';
import { site } from '../../../site.config.mjs';
import { icon } from '../sprite.mjs';
import { sampleLabel, serviceIcon } from './actions.mjs';

/** @param {any} data @param {any} p project @param {{ headingLevel?: number }} [o] */
export function projectCard(data, p, o = {}) {
  const img = p.images?.after || p.images?.gallery?.[0] || `proj-${p.service}-1`;
  const H = `h${o.headingLevel || 3}`;
  return html`<li class="card project-card" data-service="${p.service}" data-area="${p.area}">
  <a href="/projects/${p.slug}/" class="card__link">
    <div class="card__media">${picture(img, { sizes: '(min-width: 1100px) 380px, (min-width: 640px) 50vw, 100vw', sample: !p.sample && hasPhoto(img), credit: false, aspect: '4:3' })}${p.sample ? sampleLabel() : ''}</div>
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
  return html`${filters}<ul class="card-grid" data-project-grid>${projects.map((p) => projectCard(data, p, o))}</ul>
  ${o.filters ? html`<p class="filters__empty" data-filters-empty hidden>No projects match those filters yet. <a href="/projects/">Show all projects</a>.</p>` : ''}`;
}

/** Keyboard-operable before/after comparison (only rendered when both photos exist). @param {string} before @param {string} after @param {string} label */
export function beforeAfter(before, after, label) {
  return html`<figure class="ba" data-ba>
  <div class="ba__stage">
    <div class="ba__img ba__img--before"><span class="ba__tag">Before</span>${picture(before, { sizes: '(min-width: 1200px) 1200px, 100vw', credit: false, sample: hasPhoto(before) })}</div>
    <div class="ba__img ba__img--after"><span class="ba__tag">After</span>${picture(after, { sizes: '(min-width: 1200px) 1200px, 100vw', credit: false, sample: hasPhoto(after) })}</div>
    <span class="ba__handle" aria-hidden="true"><span class="ba__knob">${icon('chevron-right', { size: 16, className: 'ba__l' })}${icon('chevron-right', { size: 16 })}</span></span>
  </div>
  <div class="ba__control"><label for="ba-${before}">Compare before and after</label><input id="ba-${before}" type="range" min="0" max="100" value="50" step="1" data-ba-range aria-valuetext="50% after image shown"></div>
  <figcaption>${label}</figcaption>
</figure>`;
}
