// @ts-check
/** Process, commercial, about, reviews, FAQ and contact pages. */
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
export default function companyPages(env, ctx) {
  const { d, pg, sec, without, projects, testimonials, resources, svcName, svcLabel, areaName } = ctx;
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];
  /** @param {string} path @param {() => any} render @param {{ sources?: string[], noindex?: boolean }} [o] */
  const add = (path, render, o) => R.push(route(path, render, o));
  add('/process/', () => {
    const p = pg('process');
    return layout(env, {
      path: '/process/', title: p.seo?.title || 'How we work | RNC Landscaping', description: p.seo?.description || 'How RNC Landscaping works, from your first request to scheduled work.', crumbs: [HOME, { name: 'Process', path: '/process/' }],
      body: html`${ui.pageHead({ h1: p.h1 || 'How we work', lede: p.lede })}${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  }, { sources: ['content/pages/process.json'] });
  /* ---------- Static pages ---------- */
  add('/commercial/', () => {
    const p = pg('commercial');
    const cap = env.hasCapability
      ? html`<a class="btn btn--secondary" href="${site.capabilityStatement}" download data-track="capability_statement_downloaded">${icon('download', { size: 18 })}Download capability statement (PDF)</a>`
      : (env.launch ? '' : html`<p class="note">${icon('doc', { size: 16 })}Capability statement (PDF): to be supplied by RNC before launch.</p>`);
    return layout(env, {
      path: '/commercial/', title: p.seo.title, description: p.seo.description, ogImage: 'commercial-hero', crumbs: [HOME, { name: 'Commercial', path: '/commercial/' }], hero: true,
      body: html`${ui.hero({ h1: p.h1, lede: p.lede, image: 'commercial-hero' })}
      ${cap ? html`<div class="wrap cap-row">${cap}</div>` : ''}
      ${ui.sections(without(p, env.hasCapability ? [] : ['cta']))}${ui.trustBand()}${ui.serviceTiles(d, { heading: 'Service lines for managed sites', id: 'msvc-h' })}
      ${ui.ctaBand({ heading: 'Request a site walk or a quote', body: 'Send the scope, site list or tender documents and we will follow up with questions and next steps.' })}`,
    });
  });
  add('/about/', () => {
    const p = pg('about');
    return layout(env, {
      path: '/about/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'About', path: '/about/' }], hero: true,
      body: html`${ui.hero({ h1: p.h1, lede: p.lede, image: p.images?.crew || 'about-crew', ctas: false })}
      <section class="section" aria-labelledby="own-h"><div class="wrap owner">
        <div class="owner__media">${picture(p.images?.owner || 'about-owner', { sizes: '(min-width: 1100px) 420px, 100vw', aspect: '4:5' })}</div>
        <div class="owner__text"><h2 id="own-h">[OWNER NAME]</h2><p class="owner__bio">[OWNER BIO]</p>
          <dl class="spec-bar glass-bar"><div><dt>Crew</dt><dd>[CREW SIZE]</dd></div><div><dt>Certifications</dt><dd>[CERTIFICATIONS]</dd></div></dl></div>
      </div></section>
      ${ui.sections(without(p, ['owner']))}${ui.trustBand()}${ui.ctaBand()}`,
    });
  });
  add('/reviews/', () => {
    const p = pg('reviews');
    return layout(env, {
      path: '/reviews/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Reviews', path: '/reviews/' }],
      body: html`${ui.pageHead(p)}${ui.testimonials(d, testimonials, { heading: 'Client feedback', lede: testimonials.some((t) => t.sample) ? 'Quotes labelled Sample are illustrative and will be replaced with reviews from RNC clients, shared with their permission.' : undefined })}${ui.sections(without(p, ['sample-note']))}${ui.ctaBand()}`,
    });
  });
  add('/faq/', () => {
    const p = pg('faq');
    const faqs = p.faqs || [];
    const cats = [...new Set(faqs.map((/** @type {any} */ f) => f.category || 'General'))];
    return layout(env, {
      path: '/faq/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'FAQ', path: '/faq/' }], jsonld: faqs.length ? [schema.faqPage(faqs)] : [],
      body: html`${ui.pageHead(p)}${cats.map((c, i) => ui.faqList(faqs.filter((/** @type {any} */ f) => (f.category || 'General') === c), { heading: String(c), id: `faq-${i}` }))}${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  });
  add('/contact/', () => {
    const p = pg('contact');
    return layout(env, {
      path: '/contact/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Contact', path: '/contact/' }],
      body: html`${ui.pageHead({ ...p, extra: html`<div class="page-head__ctas">${ui.quoteBtn({ size: 'lg' })}</div>` })}
      <section class="section section--flush" aria-labelledby="cd-h"><div class="wrap"><h2 id="cd-h" class="vh">Contact details</h2>${ui.contactCards()}</div></section>
      ${ui.sections(without(p, ['details']))}${areaMap(d, { id: 'cmap-h' })}`,
    });
  });
  return R;
}
