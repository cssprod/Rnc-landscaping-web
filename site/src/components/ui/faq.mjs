// @ts-check
/**
 * FAQ: the question list as native <details> disclosures (works without JS; the chevron turns with T0).
 * API frozen in site/COMPONENTS.md (signatures only grow). Paired CSS: 46-ui-faq.css.
 */
import { html, paras, raw } from '../../lib/html.mjs';
import { icon } from '../sprite.mjs';

/**
 * Inset grouped list of questions on a lit-solid surface. `level` sets the heading level (default h2).
 * @param {{q:string,a:string}[]} faqs @param {{ heading?: string, id?: string, lede?: string, level?: number }} [o]
 */
export function faqList(faqs = [], o = {}) {
  if (!faqs.length) return '';
  const id = o.id || 'faq-h';
  const H = `h${Math.min(6, Math.max(2, Math.round(Number(o.level) || 2)))}`;
  return html`<section class="section faq" aria-labelledby="${id}">
  <div class="wrap faq__grid">
    <div class="faq__head">${raw(`<${H} id="${id}">`)}${o.heading || 'Questions we hear often'}${raw(`</${H}>`)}${o.lede ? html`<p>${o.lede}</p>` : ''}</div>
    <div class="inset-list">${faqs.map((f) => html`<details class="inset-list__row faq__item"><summary>${f.q}${icon('chevron', { size: 18, className: 'faq__chev' })}</summary><div class="faq__a">${paras(f.a)}</div></details>`)}</div>
  </div>
</section>`;
}
