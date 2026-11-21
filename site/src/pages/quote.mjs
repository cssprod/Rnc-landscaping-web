// @ts-check
/** Free-quote page (blueprint C2 "Free quote", C5 quote builder). */
import { html, md, paras, raw, fmtDate } from '../lib/html.mjs';
import { picture, hasPhoto, getSlot } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui.mjs';
import { areaMap } from '../components/map.mjs';
import { quoteForm } from '../components/forms.mjs';
import { icon } from '../components/sprite.mjs';
import * as schema from '../lib/schema.mjs';
import { site } from '../../site.config.mjs';
import { telLink, mailLink } from '../lib/tokens.mjs';
import { route, HOME, clip, hostOf } from './_shared.mjs';

/** @param {import('./_shared.mjs').Env} env @param {import('./_shared.mjs').Ctx} ctx */
export default function quotePages(env, ctx) {
  const { d, pg, sec, without, projects, testimonials, resources, svcName, svcLabel, areaName } = ctx;
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];
  /** @param {string} path @param {() => any} render @param {{ sources?: string[], noindex?: boolean }} [o] */
  const add = (path, render, o) => R.push(route(path, render, o));
  add('/free-quote/', () => {
    const p = pg('quote');
    return layout(env, {
      path: '/free-quote/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Free quote', path: '/free-quote/' }], bodyClass: 'is-quote',
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
  });
  return R;
}
