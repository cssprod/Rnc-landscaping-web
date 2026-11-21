// @ts-check
/**
 * Free-quote page (blueprint C2 "Free quote", C5 quote builder and trust):
 * H1 → reassurance strip → quote builder → "What happens next" → credentials → other ways to reach us.
 */
import { html, md, paras } from '../lib/html.mjs';
import { picture } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui.mjs';
import { quoteForm } from '../components/forms.mjs';
import { icon } from '../components/sprite.mjs';
import { has } from '../lib/tokens.mjs';
import { route, HOME } from './_shared.mjs';

/** @param {import('./_shared.mjs').Env} env @param {import('./_shared.mjs').Ctx} ctx */
export default function quotePages(env, ctx) {
  const { d, pg } = ctx;
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];
  R.push(route('/free-quote/', () => {
    const p = pg('quote');
    const next = p.nextSteps || { heading: 'What happens next', items: [] };
    const creds = p.credentials || { heading: 'Insurance and credentials' };
    const other = (p.sections || []).find((/** @type {any} */ s) => s.id === 'other-ways');
    return layout(env, {
      path: '/free-quote/', title: p.seo.title, description: p.seo.description,
      crumbs: [HOME, { name: 'Free quote', path: '/free-quote/' }], bodyClass: 'is-quote', scripts: ['quote'],
      body: html`<div class="quote-page">
  <header class="quote-head">
    <div class="wrap quote-head__inner">
      <!--crumbs-->
      <h1 id="page-title">${p.h1}</h1>
      <p class="quote-head__lede">${md(p.lede)}</p>
      ${Array.isArray(p.reassurance) && p.reassurance.length ? html`<ul class="quote-reassure">${p.reassurance.map((/** @type {string} */ x) => html`<li>${icon('check', { size: 16 })}<span>${md(x)}</span></li>`)}</ul>` : ''}
    </div>
  </header>
  <div class="wrap quote-layout">
    <div class="quote-main">${quoteForm(d, p)}</div>
    <aside class="quote-aside" aria-label="About your quote">
      ${p.aside?.image ? html`<div class="quote-aside__media">${picture(p.aside.image, { sizes: '(min-width: 64em) 380px, 100vw', aspect: '3:2', credit: false })}</div>` : ''}
      <section class="quote-next" aria-labelledby="quote-next-h">
        <h2 id="quote-next-h">${next.heading}</h2>
        <ol class="quote-steps">${(next.items || []).map((/** @type {any} */ s, /** @type {number} */ i) => html`<li><span class="quote-steps__n" aria-hidden="true">${ui.pad2(i + 1)}</span><div><h3>${s.title}</h3><p>${md(s.body)}</p></div></li>`)}</ol>
      </section>
      <section class="quote-creds" aria-labelledby="quote-creds-h">
        <h2 id="quote-creds-h">${creds.heading}</h2>${creds.lede ? html`<p class="quote-help">${md(creds.lede)}</p>` : ''}
        ${ui.credentialRow()}
      </section>
      ${other ? html`<section class="quote-other" aria-labelledby="quote-other-h">
        <h2 id="quote-other-h">${other.heading}</h2>
        <ul class="quote-contacts">
          <li>${icon('phone', { size: 18 })}${ui.contactLink('tel', 'quote_aside')}</li>
          ${has('PHONE') ? html`<li>${icon('chat', { size: 18 })}${ui.contactLink('sms', 'quote_aside', { label: 'Text [PHONE]' })}</li>` : ''}
          <li>${icon('mail', { size: 18 })}${ui.contactLink('email', 'quote_aside')}</li>
        </ul>
        ${paras(other.body)}
      </section>` : ''}
    </aside>
  </div>
</div>`,
    });
  }, { sources: ['content/pages/quote.json', 'site/src/pages/quote.mjs', 'site/src/components/forms.mjs', 'site/src/scripts/quote.js'] }));
  return R;
}
