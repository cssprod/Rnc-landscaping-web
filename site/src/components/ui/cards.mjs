// @ts-check
/**
 * Cards: the feature bento, the service tiles, and the generic bento grid and card (lit-solid surfaces, edge glow,
 * 3px lift, cursor spotlight hook). API frozen in site/COMPONENTS.md (signatures only grow). Paired CSS: 42-ui-cards.css.
 * Every grid sits in a `container-type: inline-size` wrapper and reflows with @container (40em / 64em); one DOM per width.
 * Tilt is banned (CONTRACT §2): cards carry `data-spotlight` for the T3 spotlight that living.js drives on `[data-spot-grid]`.
 */
import { html, md, raw } from '../../lib/html.mjs';
import { picture } from '../../lib/images.mjs';
import { site } from '../../../site.config.mjs';
import { icon } from '../sprite.mjs';
import { livingScene, illustrationChip } from '../living.mjs';
import { serviceIcon, linkMore } from './actions.mjs';
import { sectionHead } from './heads.mjs';

/** Clamp a heading level to h2–h6. @param {number|undefined} n @param {number} d */
const hLevel = (n, d) => Math.min(6, Math.max(2, Math.round(Number(n) || d)));

/**
 * Bento of lit-solid feature cards with icons, over the static stage.
 * @param {{ id: string, heading: string, lede?: string, items: {title:string, body?:string}[], icons?: string[], link?: any }} p
 */
export function featureBento(p) {
  return html`<section class="section bento-band" aria-labelledby="${p.id}">
  <div class="wrap">
    ${sectionHead({ id: p.id, title: p.heading, lede: p.lede, link: p.link })}
    <div class="bento-stage l-cq"><ul class="bento bento--${p.items.length}" data-spot-grid>${p.items.map((i, n) => html`<li class="bento__card bento__card--solid" data-spotlight>
      <span class="icon-tile">${icon(p.icons?.[n] || 'check', { size: 22 })}</span>
      <h3>${i.title}</h3>${i.body ? html`<p>${md(i.body)}</p>` : ''}
    </li>`)}</ul></div>
  </div>
</section>`;
}

/** @param {any} data @param {{ heading?: string, lede?: string, id?: string, link?: boolean }} [o] */
export function serviceTiles(data, o = {}) {
  const id = o.id || 'svc-h';
  return html`<section class="section services-band" aria-labelledby="${id}">
  <div class="wrap">
    ${sectionHead({ id, title: o.heading || 'What we look after', lede: o.lede, link: o.link === false ? '' : linkMore('/services/', 'All services') })}
    <div class="tiles-wrap l-cq"><ul class="tiles">${site.services.map((slug) => {
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
    })}</ul></div>
  </div>
</section>`;
}

/**
 * @typedef {{ title: any, body?: string, href?: string, icon?: string, scene?: string, tone?: 'glass'|'solid'|'deep',
 *   span?: 'feature'|'tall'|'wide'|'full', extra?: any }} BentoItem
 * `span` places the card in the `feature` layout (feature 2×2, tall 1×2, wide 2–3 columns, full row); `extra` is extra
 * markup under the body (e.g. chip links: a card with links inside must not also take `href`).
 */

/**
 * One bento card: an art well (living vignette) or an icon, the title in `h{headingLevel}`, one sentence, and a "go"
 * chip. With `href` the whole card is one link: the title link's ::after covers the card and its text is the name.
 * `reveal` adds the `data-reveal` hook on the card (prefer it on the band: living.js arms section wrappers).
 * @param {BentoItem} item @param {{ headingLevel?: number, reveal?: boolean }} [o]
 */
export function bentoCard(item, o = {}) {
  const H = `h${hLevel(o.headingLevel, 3)}`;
  const tone = item.tone === 'glass' || item.tone === 'deep' ? item.tone : 'solid';
  const art = item.scene ? livingScene(item.scene, { variant: 'card' }) : '';
  const artS = String(art || '');
  const well = item.scene
    ? html`<div class="bento__art" aria-hidden="true">${art}${artS && !artS.includes('media__chip--art') ? illustrationChip() : ''}</div>`
    : item.icon ? html`<span class="bento__icon icon-tile">${icon(item.icon, { size: 22 })}</span>` : '';
  const cls = `bento__card bento__card--${tone}${item.span ? ` bento__card--${item.span}` : ''}${item.href ? ' bento__card--link' : ''}${tone === 'deep' ? ' on-deep' : ''}`;
  return html`<li class="${cls}" data-spotlight${o.reveal ? raw(' data-reveal') : ''}>
  ${well}
  <div class="bento__body">
    ${raw(`<${H} class="bento__title">`)}${item.href ? html`<a class="bento__link" href="${item.href}">${item.title}</a>` : item.title}${raw(`</${H}>`)}
    ${item.body ? html`<p class="bento__text">${md(item.body)}</p>` : ''}
    ${item.extra || ''}
  </div>
  ${item.href ? html`<span class="bento__go" aria-hidden="true">${icon('arrow-up-right', { size: 18 })}</span>` : ''}
</li>`;
}

/**
 * A bento band: numbered section head plus a grid of bentoCard()s on the static stage.
 * layout `2x2` (2 columns from 40em), `3` (2 → 3 columns), `feature` (DESIGN-DIRECTION §6: 1 → 2 → 4 columns, with
 * `span` on the items). Cards default to one heading level below the band's.
 * @param {BentoItem[]} items @param {{ id: string, heading?: any, lede?: any, index?: string, eyebrow?: string, link?: any, level?: number, layout?: '2x2'|'3'|'feature', reveal?: boolean }} o
 */
export function bento(items = [], o = /** @type {any} */ ({})) {
  const layout = ['2x2', '3', 'feature'].includes(String(o.layout)) ? o.layout : '3';
  const level = hLevel(o.level, 2);
  return html`<section class="section bento-band"${o.heading ? raw(` aria-labelledby="${o.id}"`) : ''}${o.reveal ? raw(' data-reveal') : ''}>
  <div class="wrap">
    ${o.heading ? sectionHead({ id: o.id, title: o.heading, lede: o.lede, link: o.link, level, index: o.index, eyebrow: o.eyebrow }) : ''}
    <div class="bento-stage l-cq"><ul class="bento bento--${layout}" data-spot-grid>${items.map((i) => bentoCard(i, { headingLevel: o.heading ? level + 1 : 3 }))}</ul></div>
  </div>
</section>`;
}
