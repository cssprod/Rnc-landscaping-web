// @ts-check
/**
 * Cards: the feature bento and the service tiles.
 * Split mechanically from components/ui.mjs in W1 (byte-identical output); API frozen in site/COMPONENTS.md.
 */
import { html, md } from '../../lib/html.mjs';
import { picture } from '../../lib/images.mjs';
import { site } from '../../../site.config.mjs';
import { icon } from '../sprite.mjs';
import { serviceIcon, linkMore } from './actions.mjs';
import { sectionHead } from './heads.mjs';

/**
 * Bento of glass feature cards with icons, over an aurora wash.
 * @param {{ id: string, heading: string, lede?: string, items: {title:string, body?:string}[], icons?: string[], link?: any }} p
 */
export function featureBento(p) {
  return html`<section class="section bento-band" aria-labelledby="${p.id}">
  <div class="aurora aurora--soft" aria-hidden="true"></div>
  <div class="wrap">
    ${sectionHead({ id: p.id, title: p.heading, lede: p.lede, link: p.link })}
    <ul class="bento bento--${p.items.length}">${p.items.map((i, n) => html`<li class="glass-card bento__card" data-tilt>
      <span class="icon-tile">${icon(p.icons?.[n] || 'check', { size: 22 })}</span>
      <h3>${i.title}</h3>${i.body ? html`<p>${md(i.body)}</p>` : ''}
    </li>`)}</ul>
  </div>
</section>`;
}

/** @param {any} data @param {{ heading?: string, lede?: string, id?: string, link?: boolean }} [o] */
export function serviceTiles(data, o = {}) {
  const id = o.id || 'svc-h';
  return html`<section class="section services-band" aria-labelledby="${id}">
  <div class="wrap">
    ${sectionHead({ id, title: o.heading || 'What we look after', lede: o.lede, link: o.link === false ? '' : linkMore('/services/', 'All services') })}
    <ul class="tiles">${site.services.map((slug) => {
      const s = data.services[slug];
      if (!s) return '';
      const summary = (s.includes || []).slice(0, 3).map((/** @type {any} */ i) => i.title).join(' · ');
      return html`<li class="tile">
      <a href="/services/${slug}/" class="tile__link">
        ${picture(s.hero?.image || `svc-${slug}-hero`, { sizes: '(min-width: 1100px) 290px, (min-width: 640px) 50vw, 100vw', credit: false, chip: false, aspect: '4:5' })}
        <span class="tile__glass">
          <span class="tile__icon">${icon(serviceIcon(slug), { size: 20 })}</span>
          <span class="tile__title">${s.name}</span>
          <span class="tile__text">${summary}</span>
        </span>
        <span class="tile__go" aria-hidden="true">${icon('arrow-up-right', { size: 18 })}</span>
      </a></li>`;
    })}</ul>
  </div>
</section>`;
}
