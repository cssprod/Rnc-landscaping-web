// @ts-check
/**
 * /free-quote/ (C1; the retired /quote/ is a 301). W1 renders the existing stepper (components/forms.mjs);
 * W2 `quote` replaces it with the six-input builder and owns this file from then on.
 */
import { html, md } from '../lib/html.mjs';
import { picture } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import { quoteForm } from '../components/forms.mjs';
import { icon } from '../components/sprite.mjs';
import { telLink, mailLink } from '../lib/tokens.mjs';
import { ctx, route, tpl, src, HOME, SHARED_SOURCES } from './_shared.mjs';

export const QUOTE_PATH = '/free-quote/';
/** Feature modules for the quote page (CONTRACT §12). */
const SCRIPTS = ['quote'];

/** @param {import('./_shared.mjs').Env} env @returns {import('./_shared.mjs').Route[]} */
export function routes(env) {
  const { d, pg } = ctx(env);
  return [route(QUOTE_PATH, { sources: [tpl('quote'), src('pages/quote.json'), 'site/src/components/forms.mjs', ...SHARED_SOURCES], scripts: SCRIPTS }, () => {
    const p = pg('quote');
    return layout(env, {
      path: QUOTE_PATH, title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Free quote', path: QUOTE_PATH }], bodyClass: 'is-quote', scripts: SCRIPTS,
      body: html`<div class="quote-page">
        <div class="aurora" aria-hidden="true"></div>
        <div class="wrap quote-page__grid">
          <div class="quote-page__main"><div class="page-head__inner quote-page__head"><!--crumbs--><h1 id="page-title">${p.h1}</h1><p class="page-head__lede">${md(p.lede)}</p></div>${quoteForm(d, p)}</div>
          <aside class="quote-aside glass-card" aria-labelledby="qa-h">${picture(p.aside?.image || 'quote-aside', { sizes: '(min-width: 1100px) 380px, 100vw', aspect: '3:2', credit: false })}
            <div class="quote-aside__body"><h2 id="qa-h">${p.aside?.heading || 'What happens next'}</h2>
            <ol class="next-steps">${(p.aside?.items || ['We read your request.', 'We get back to you to ask questions and arrange a site visit if needed.', 'You get a written quote with the scope and schedule.']).map((/** @type {string} */ i, n) => html`<li><span class="next-steps__n">${n + 1}</span><span>${i}</span></li>`)}</ol>
            <div class="quote-aside__contact"><h3>Prefer to talk?</h3><p>${icon('phone', { size: 16 })}${telLink('quote_aside')}</p><p>${icon('mail', { size: 16 })}${mailLink('quote_aside')}</p></div></div></aside>
        </div>
      </div>`,
    });
  })];
}
