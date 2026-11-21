// @ts-check
/** Company family: /process/ (C1, stub until W3), /about/, /reviews/, /faq/, /contact/ (W3 owner: t-company). */
import { html, md, paras } from '../lib/html.mjs';
import { picture } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui/index.mjs';
import { areaMap } from '../components/map.mjs';
import * as schema from '../lib/schema.mjs';
import { siteJson } from '../../site.config.mjs';
import { ctx, route, tpl, src, HOME, SHARED_SOURCES } from './_shared.mjs';

/** Used until content/pages/process.json exists: the CONTRACT §6 overview, nothing invented. */
export const PROCESS_STUB = {
  seo: { title: 'How we work | RNC Landscaping', description: 'How a request to RNC Landscaping moves from first contact to scheduled work: request, site visit, written quote and scheduled work.' },
  h1: 'How we work',
  lede: 'From your first request to scheduled work, in four steps.',
  overview: [{ title: 'Request' }, { title: 'Site visit' }, { title: 'Written quote' }, { title: 'Scheduled work' }],
  tracks: [],
  sections: [],
};

/** @param {import('./_shared.mjs').Env} env @returns {import('./_shared.mjs').Route[]} */
export function routes(env) {
  const { d, pg, without, testimonials } = ctx(env);
  const T = tpl('company');
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];

  R.push(route('/process/', { sources: [T, src('pages/process.json'), ...SHARED_SOURCES] }, () => {
    const p = d.pages.process || PROCESS_STUB;
    const g = p.guarantee;
    return layout(env, {
      path: '/process/', title: p.seo?.title || PROCESS_STUB.seo.title, description: p.seo?.description || PROCESS_STUB.seo.description, crumbs: [HOME, { name: 'Process', path: '/process/' }],
      body: html`${ui.pageHead({ h1: p.h1 || PROCESS_STUB.h1, lede: p.lede })}
      ${p.overview?.length ? html`<section class="section" aria-labelledby="ov-h"><div class="wrap">${ui.sectionHead({ id: 'ov-h', title: 'Step by step' })}
        <ol class="steps">${p.overview.map((/** @type {any} */ st) => html`<li class="glass-card step-card"><h3>${st.title}</h3>${st.body ? html`<p>${md(st.body)}</p>` : ''}</li>`)}</ol></div></section>` : ''}
      ${(p.tracks || []).map((/** @type {any} */ t) => html`<section class="section" aria-labelledby="track-${t.id}-h"><div class="wrap">${ui.sectionHead({ id: `track-${t.id}-h`, title: t.name, lede: t.summary })}
        <ol class="steps">${(t.steps || []).map((/** @type {any} */ st) => html`<li class="glass-card step-card"><h3>${st.title}</h3>${st.body ? html`<p>${md(st.body)}</p>` : ''}${st.deliverable ? html`<p><strong>You receive:</strong> ${md(st.deliverable)}</p>` : ''}</li>`)}</ol></div></section>`)}
      ${g ? html`<section class="section" aria-labelledby="guar-h"><div class="wrap prose"><h2 id="guar-h">${g.heading}</h2>${paras(g.body)}</div></section>` : ''}
      ${ui.sections(p.sections || [])}${ui.ctaBand()}`,
    });
  }));

  R.push(route('/about/', { sources: [T, src('pages/about.json'), ...SHARED_SOURCES] }, () => {
    const p = pg('about');
    const cert = siteJson.credentials.find((c) => c.id === 'certifications');
    return layout(env, {
      path: '/about/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'About', path: '/about/' }], hero: true,
      body: html`${ui.hero({ h1: p.h1, lede: p.lede, image: p.images?.crew || 'about-crew', ctas: false })}
      <section class="section" aria-labelledby="own-h"><div class="wrap owner">
        <div class="owner__media">${picture(p.images?.owner || siteJson.owner.photo || 'about-owner', { sizes: '(min-width: 1100px) 420px, 100vw', aspect: '4:5' })}</div>
        <div class="owner__text"><h2 id="own-h">${siteJson.owner.name}</h2><p class="owner__bio">${siteJson.owner.bio}</p>
          <dl class="spec-bar glass-bar"><div><dt>Crew</dt><dd>${siteJson.crewSize}</dd></div><div><dt>${cert?.label || 'Certifications'}</dt><dd>${cert?.value}</dd></div></dl></div>
      </div></section>
      ${ui.sections(without(p, ['owner']))}${ui.trustBand()}${ui.ctaBand()}`,
    });
  }));

  R.push(route('/reviews/', { sources: [T, src('pages/reviews.json'), 'content/testimonials', ...SHARED_SOURCES] }, () => {
    const p = pg('reviews');
    return layout(env, {
      path: '/reviews/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Reviews', path: '/reviews/' }],
      body: html`${ui.pageHead(p)}${ui.testimonials(d, testimonials, { heading: 'Client feedback', lede: testimonials.some((t) => t.sample) ? 'Quotes labelled Sample are illustrative and will be replaced with reviews from RNC clients, shared with their permission.' : undefined })}${ui.sections(without(p, ['sample-note']))}${ui.ctaBand()}`,
    });
  }));

  R.push(route('/faq/', { sources: [T, src('pages/faq.json'), ...SHARED_SOURCES] }, () => {
    const p = pg('faq');
    const faqs = p.faqs || [];
    const cats = [...new Set(faqs.map((/** @type {any} */ f) => f.category || 'General'))];
    return layout(env, {
      path: '/faq/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'FAQ', path: '/faq/' }], jsonld: faqs.length ? [schema.faqPage(faqs)] : [],
      body: html`${ui.pageHead(p)}${cats.map((c, i) => ui.faqList(faqs.filter((/** @type {any} */ f) => (f.category || 'General') === c), { heading: String(c), id: `faq-${i}` }))}${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  }));

  R.push(route('/contact/', { sources: [T, src('pages/contact.json'), ...SHARED_SOURCES] }, () => {
    const p = pg('contact');
    return layout(env, {
      path: '/contact/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Contact', path: '/contact/' }],
      body: html`${ui.pageHead({ ...p, extra: html`<div class="page-head__ctas">${ui.quoteBtn({ size: 'lg' })}</div>` })}
      <section class="section section--flush" aria-labelledby="cd-h"><div class="wrap"><h2 id="cd-h" class="vh">Contact details</h2>${ui.contactCards()}</div></section>
      ${ui.sections(without(p, ['details']))}${areaMap(d, { id: 'cmap-h' })}`,
    });
  }));
  return R;
}
