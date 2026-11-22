// @ts-check
/**
 * /free-quote/ (C1; the retired /quote/ is a 301). Owner: quote (W2).
 * Page order (blueprint C2 "Free quote"): H1 → reassurance strip ([REPLY TIME]) → quote builder (C5) →
 * What happens next (3 steps) → other ways to reach us → privacy note.
 * Calm by design (DESIGN-DIRECTION §9 quote-calm): a still backdrop behind the page head only, nothing moves near the
 * inputs; the ready panel enters once (T1).
 */
import { html, md } from '../lib/html.mjs';
import { layout } from '../components/layout.mjs';
import { quoteForm, quoteContacts } from '../components/forms.mjs';
import { icon } from '../components/sprite.mjs';
import { ctx, route, tpl, src, HOME, SHARED_SOURCES } from './_shared.mjs';

export const QUOTE_PATH = '/free-quote/';
/** Feature modules for the quote page (CONTRACT §12). */
const SCRIPTS = ['quote'];

/** @param {import('./_shared.mjs').Env} env @returns {import('./_shared.mjs').Route[]} */
export function routes(env) {
  const { d, pg } = ctx(env);
  return [route(QUOTE_PATH, { sources: [tpl('quote'), src('pages/quote.json'), 'site/src/components/forms.mjs', ...SHARED_SOURCES], scripts: SCRIPTS }, () => {
    const p = pg('quote');
    const reassurance = /** @type {string[]} */ (p.reassurance || []);
    const steps = /** @type {{ title: string, body: string }[]} */ (p.nextSteps || []);
    return layout(env, {
      path: QUOTE_PATH, title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Free quote', path: QUOTE_PATH }], bodyClass: 'is-quote', scripts: SCRIPTS,
      body: html`<div class="quote-page">
  <div class="quote-page__backdrop" aria-hidden="true" data-still></div>
  <div class="wrap quote-page__wrap">
    <div class="quote-head"><!--crumbs-->
      <h1 id="page-title">${p.h1}</h1>
      ${p.lede ? html`<p class="quote-head__lede">${md(p.lede)}</p>` : ''}
      ${reassurance.length ? html`<ul class="quote-reassure" data-quote-reassurance>${reassurance.map((r) => html`<li>${icon('check', { size: 16 })}<span>${md(r)}</span></li>`)}</ul>` : ''}
    </div>
    <div class="quote-page__grid">
      <div class="quote-page__main">${quoteForm(d, p)}</div>
      <div class="quote-page__side">
        <section class="quote-next" data-quote-next aria-labelledby="quote-next-h">
          <h2 id="quote-next-h">What happens next</h2>
          <ol class="quote-next__list">${steps.map((s) => html`<li><h3>${s.title}</h3><p>${md(s.body)}</p></li>`)}</ol>
        </section>
        ${quoteContacts(p)}
      </div>
    </div>
    ${p.privacy ? html`<p class="quote-privacy" data-quote-privacy>${icon('shield', { size: 18 })}<span>${md(p.privacy)}</span></p>` : ''}
  </div>
</div>`,
    });
  })];
}
