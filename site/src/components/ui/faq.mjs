// @ts-check
/**
 * FAQ: the question list.
 * Split mechanically from components/ui.mjs in W1 (byte-identical output); API frozen in site/COMPONENTS.md.
 */
import { html, paras } from '../../lib/html.mjs';
import { icon } from '../sprite.mjs';

/** iOS-style inset grouped list of questions. @param {{q:string,a:string}[]} faqs @param {{ heading?: string, id?: string, lede?: string }} [o] */
export function faqList(faqs = [], o = {}) {
  if (!faqs.length) return '';
  const id = o.id || 'faq-h';
  return html`<section class="section faq" aria-labelledby="${id}">
  <div class="wrap faq__grid">
    <div class="faq__head"><h2 id="${id}">${o.heading || 'Questions we hear often'}</h2>${o.lede ? html`<p>${o.lede}</p>` : ''}</div>
    <div class="inset-list">${faqs.map((f) => html`<details class="inset-list__row faq__item"><summary>${f.q}${icon('chevron', { size: 18, className: 'faq__chev' })}</summary><div class="faq__a">${paras(f.a)}</div></details>`)}</div>
  </div>
</section>`;
}
