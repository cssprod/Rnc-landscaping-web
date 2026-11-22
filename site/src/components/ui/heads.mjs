// @ts-check
/**
 * Page and section heads: the hero (photo or living scene), the page head, numbered section heading rows, generic content
 * sections and the in-page table of contents. API frozen in site/COMPONENTS.md (signatures only grow).
 * Paired CSS: 41-ui-heads.css.
 *
 * Headings: hero() and pageHead() emit the page's only H1 (`h1#page-title`, never `data-reveal`); every other primitive
 * here emits the level its caller chose (default h2).
 */
import { html, md, paras, raw } from '../../lib/html.mjs';
import { picture } from '../../lib/images.mjs';
import { livingScene, illustrationChip } from '../living.mjs';
import { quoteBtn, secondaryBtn } from './actions.mjs';

/** Clamp a heading level to h2–h6 (h1 belongs to hero()/pageHead()). @param {number|undefined} n @param {number} d */
const hLevel = (n, d = 2) => Math.min(6, Math.max(2, Math.round(Number(n) || d)));

/**
 * The art slot of a scene hero: the living scene plus its "Illustration" chip (added here only when livingScene() does
 * not already carry one). Without living art yet, the slot still paints a static sky from the scene tokens (CSS).
 * @param {string} scene
 */
function sceneSlot(scene) {
  const art = livingScene(scene, { variant: 'hero', priority: true });
  const s = String(art || '');
  return html`<div class="hero__scene" data-scene-slot="${scene}">${art}${s && !s.includes('media__chip--art') ? illustrationChip() : ''}</div>`;
}

/**
 * The page hero. With `scene` it holds a living scene (theme-reactive art; copy on sky, never on land); otherwise the
 * photographic `image` behind a scrim. `layout: 'split'` puts the copy and the scene side by side from 64em (container
 * query); `full` (default) runs the art full-bleed behind the copy.
 * @param {{ h1: any, lede?: string, image?: string, ctas?: boolean, variant?: 'home'|'page', dock?: any, extra?: any, layout?: 'split'|'full', scene?: string, proof?: any }} p
 */
export function hero(p) {
  const layout = p.layout === 'split' ? 'split' : 'full';
  const art = p.scene ? sceneSlot(p.scene) : '';
  const media = !p.scene && p.image ? html`<div class="hero__media">${picture(p.image, { eager: true, sizes: '100vw', credit: true })}</div>` : '';
  const tone = p.scene ? 'hero--scene' : 'hero--photo on-deep';
  return html`<section class="hero hero--${p.variant || 'page'} hero--${layout} ${tone}" aria-labelledby="page-title">
  ${media}${layout === 'full' ? art : ''}
  ${p.scene ? '' : html`<div class="hero__scrim" aria-hidden="true"></div>`}
  <div class="hero__content wrap">
    <div class="hero__copy">
    <!--crumbs-->
    <h1 id="page-title" class="hero__title">${p.h1}</h1>
    ${p.lede ? html`<p class="hero__lede">${md(p.lede)}</p>` : ''}
    ${p.proof ? html`<p class="hero__proof">${typeof p.proof === 'string' ? md(p.proof) : p.proof}</p>` : ''}
    ${p.ctas !== false ? html`<div class="hero__ctas">${quoteBtn({ tone: p.scene ? 'primary' : 'light', size: 'lg' })}${secondaryBtn('hero', { tone: 'glass', size: 'lg' })}</div>` : ''}
    ${p.extra || ''}
    </div>
    ${layout === 'split' ? art : ''}
  </div>
  ${p.dock || ''}
</section>`;
}

/** Page header without a photo: a quiet glow wash, breadcrumbs, title, lede. @param {{ h1: any, lede?: string, extra?: any, className?: string }} p */
export const pageHead = (p) => html`<header class="page-head ${p.className || ''}">
  <div class="wrap page-head__inner">
    <!--crumbs-->
    <h1 id="page-title">${p.h1}</h1>
    ${p.lede ? html`<p class="page-head__lede">${md(p.lede)}</p>` : ''}
    ${p.extra || ''}
  </div>
</header>`;

/**
 * Section heading row. `index` ("01"…) renders a decorative, aria-hidden number pill; `eyebrow` a sentence-case label;
 * either one adds the hairline. Numbers run 01–n per page in DOM order (DESIGN-DIRECTION §6). `reveal` adds the
 * `data-reveal` hook (living.js arms it below the first viewport only).
 * @param {{ id: string, title: any, lede?: any, link?: any, level?: number, index?: string, eyebrow?: string, reveal?: boolean }} p
 */
export const sectionHead = (p) => {
  const H = `h${hLevel(p.level)}`;
  const kicker = p.index || p.eyebrow
    ? html`<div class="section-head__kicker">${p.index ? html`<span class="section-head__index t-num" aria-hidden="true">${p.index}</span>` : ''}${p.eyebrow ? html`<span class="section-head__eyebrow">${p.eyebrow}</span>` : ''}<span class="section-head__rule" aria-hidden="true"></span></div>`
    : '';
  return html`<div class="section-head${kicker ? ' section-head--kicker' : ''}"${p.reveal ? raw(' data-reveal') : ''}>
  <div class="section-head__text">${kicker}${raw(`<${H} id="${p.id}">`)}${p.title}${raw(`</${H}>`)}${p.lede ? html`<p class="section-head__lede">${typeof p.lede === 'string' ? md(p.lede) : p.lede}</p>` : ''}</div>
  ${p.link || ''}
</div>`;
};

/**
 * Generic content sections from page JSON: sticky heading column + body, items as lit-solid cards.
 * @param {any[]} list @param {{ level?: number, tone?: string }} [o]
 */
export function sections(list = [], o = {}) {
  const lvl = hLevel(o.level);
  const H = `h${lvl}`;
  const HI = `h${Math.min(6, lvl + 1)}`;
  return list.map((s) => html`<section class="section prose-section ${o.tone || ''}"${s.id ? raw(` id="${s.id}"`) : ''}>
  <div class="wrap prose-section__grid">
    <div class="prose-section__head">${s.heading ? raw(`<${H}>`) : ''}${s.heading || ''}${s.heading ? raw(`</${H}>`) : ''}</div>
    <div class="prose-section__body">
      ${paras(s.body)}
      ${s.items?.length ? html`<ul class="item-cards">${s.items.map((/** @type {any} */ i) => html`<li class="item-card">${raw(`<${HI}>`)}${i.title}${raw(`</${HI}>`)}${i.body ? html`<p>${md(i.body)}</p>` : ''}</li>`)}</ul>` : ''}
    </div>
  </div>
</section>`);
}

/**
 * In-page table of contents (`nav.toc[data-toc]`). Plain links work without JS; a scroll-spy (T0) may set
 * `aria-current="location"` on the link of the section in view.
 * @param {{ id: string, label: any }[]} items @param {{ label?: string }} [o]
 */
export function inPageToc(items = [], o = {}) {
  if (!items.length) return '';
  const label = o.label || 'On this page';
  return html`<nav class="toc" aria-label="${label}" data-toc>
  <p class="toc__label" aria-hidden="true">${label}</p>
  <ol class="toc__list">${items.map((i) => html`<li class="toc__item"><a class="toc__link" href="#${i.id}">${i.label}</a></li>`)}</ol>
</nav>`;
}
