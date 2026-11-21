// @ts-check
/**
 * Page and section heads: the photographic hero, the page head, section heading rows and generic content sections.
 * Split mechanically from components/ui.mjs in W1 (byte-identical output); API frozen in site/COMPONENTS.md.
 */
import { html, md, paras, raw } from '../../lib/html.mjs';
import { picture } from '../../lib/images.mjs';
import { quoteBtn, secondaryBtn } from './actions.mjs';

/**
 * Full-bleed photographic hero with the headline on a scrim and glass actions.
 * @param {{ h1: string, lede?: string, image: string, ctas?: boolean, variant?: 'home'|'page', dock?: any, extra?: any }} p
 */
export function hero(p) {
  return html`<section class="hero hero--${p.variant || 'page'}" aria-labelledby="page-title">
  <div class="hero__media">${picture(p.image, { eager: true, sizes: '100vw', credit: true })}</div>
  <div class="hero__scrim" aria-hidden="true"></div>
  <div class="hero__content wrap">
    <!--crumbs-->
    <h1 id="page-title" class="hero__title">${p.h1}</h1>
    ${p.lede ? html`<p class="hero__lede">${md(p.lede)}</p>` : ''}
    ${p.ctas !== false ? html`<div class="hero__ctas">${quoteBtn({ tone: 'light', size: 'lg' })}${secondaryBtn('hero', { tone: 'glass', size: 'lg' })}</div>` : ''}
    ${p.extra || ''}
  </div>
  ${p.dock || ''}
</section>`;
}

/** Page header without a photo: aurora wash, breadcrumbs, title, lede. @param {{ h1: string, lede?: string, extra?: any, className?: string }} p */
export const pageHead = (p) => html`<header class="page-head ${p.className || ''}">
  <div class="aurora" aria-hidden="true"></div>
  <div class="wrap page-head__inner">
    <!--crumbs-->
    <h1 id="page-title">${p.h1}</h1>
    ${p.lede ? html`<p class="page-head__lede">${md(p.lede)}</p>` : ''}
    ${p.extra || ''}
  </div>
</header>`;

/**
 * Section heading row. @param {{ id: string, title: any, lede?: any, link?: any, level?: number }} p
 */
export const sectionHead = (p) => html`<div class="section-head">
  <div class="section-head__text">${raw(`<h${p.level || 2} id="${p.id}">`)}${p.title}${raw(`</h${p.level || 2}>`)}${p.lede ? html`<p class="section-head__lede">${typeof p.lede === 'string' ? md(p.lede) : p.lede}</p>` : ''}</div>
  ${p.link || ''}
</div>`;

/**
 * Generic content sections from page JSON: sticky heading column + body, items as glass cards.
 * @param {any[]} list @param {{ level?: number, tone?: string }} [o]
 */
export function sections(list = [], o = {}) {
  const H = `h${o.level || 2}`;
  return list.map((s) => html`<section class="section prose-section ${o.tone || ''}"${s.id ? raw(` id="${s.id}"`) : ''}>
  <div class="wrap prose-section__grid">
    <div class="prose-section__head">${s.heading ? raw(`<${H}>`) : ''}${s.heading || ''}${s.heading ? raw(`</${H}>`) : ''}</div>
    <div class="prose-section__body">
      ${paras(s.body)}
      ${s.items?.length ? html`<ul class="item-cards">${s.items.map((/** @type {any} */ i) => html`<li class="glass-card item-card"><h3>${i.title}</h3>${i.body ? html`<p>${md(i.body)}</p>` : ''}</li>`)}</ul>` : ''}
    </div>
  </div>
</section>`);
}
