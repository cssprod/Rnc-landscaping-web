// @ts-check
/** Services family: the hub, the 4 service pages and /commercial/ (W3 owner: t-services). */
import { html, md } from '../lib/html.mjs';
import { picture, hasPhoto } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui/index.mjs';
import { icon } from '../components/sprite.mjs';
import * as schema from '../lib/schema.mjs';
import { site } from '../../site.config.mjs';
import { ctx, route, tpl, src, HOME, SHARED_SOURCES } from './_shared.mjs';

/** @param {import('./_shared.mjs').Env} env @returns {import('./_shared.mjs').Route[]} */
export function routes(env) {
  const { d, pg, without, projects, areaName } = ctx(env);
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];
  const T = tpl('services');

  R.push(route('/services/', { sources: [T, src('pages/services.json'), 'content/services', ...SHARED_SOURCES] }, () => {
    const p = pg('services');
    return layout(env, {
      path: '/services/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Services', path: '/services/' }],
      body: html`${ui.pageHead(p)}${ui.serviceTiles(d, { heading: 'Four service lines', link: false, id: 'lines-h' })}${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  }));

  for (const slug of site.services) {
    const s = d.services[slug];
    if (!s) continue;
    const path = `/services/${slug}/`;
    const label = String(s.navLabel || s.name);
    const ba = hasPhoto(`svc-${slug}-before`) && hasPhoto(`svc-${slug}-after`);
    R.push(route(path, { sources: [T, src(`services/${slug}.json`), 'content/projects', ...SHARED_SOURCES] }, () => layout(env, {
      path, title: s.seo.title, description: s.seo.description, ogImage: s.hero?.image, hero: true,
      crumbs: [HOME, { name: 'Services', path: '/services/' }, { name: s.name, path }],
      jsonld: [schema.service(env, s, path), ...(s.faqs?.length ? [schema.faqPage(s.faqs)] : [])],
      body: html`${ui.hero({ h1: s.hero.h1, lede: s.hero.lede, image: s.hero.image || `svc-${slug}-hero` })}
      ${s.audiences?.length ? ui.featureBento({ id: 'aud-h', heading: 'Who it is for', items: s.audiences, icons: ['leaf', 'users', 'doc', 'check'] }) : ''}
      <section class="section" aria-labelledby="inc-h"><div class="wrap includes">
        <div class="includes__text">${ui.sectionHead({ id: 'inc-h', title: 'What is included' })}
          <dl class="inset-list def-list">${(s.includes || []).map((/** @type {any} */ i) => html`<div class="inset-list__row"><dt>${icon('check', { size: 18 })}${i.title}</dt><dd>${md(i.body)}</dd></div>`)}</dl></div>
        <div class="includes__media">${(s.detailImages || []).map((/** @type {string} */ id) => picture(id, { sizes: '(min-width: 1100px) 460px, 100vw' }))}</div>
      </div></section>
      ${s.process?.length ? html`<section class="section section--elevated" aria-labelledby="proc-h"><div class="wrap">${ui.sectionHead({ id: 'proc-h', title: 'How it works' })}
        <ol class="steps">${s.process.map((/** @type {any} */ st) => html`<li class="glass-card step-card"><h3>${st.title}</h3><p>${md(st.body)}</p></li>`)}</ol></div></section>` : ''}
      ${s.seasonal?.length ? html`<section class="section" aria-labelledby="sea-h"><div class="wrap">${ui.sectionHead({ id: 'sea-h', title: 'Through the year' })}${ui.seasons(s.seasonal)}</div></section>` : ''}
      ${ba ? html`<section class="section" aria-labelledby="ba-h"><div class="wrap">${ui.sectionHead({ id: 'ba-h', title: 'Before and after' })}${ui.beforeAfter(`svc-${slug}-before`, `svc-${slug}-after`, `${s.name}: drag the handle or use the arrow keys to compare.`)}</div></section>` : ''}
      <section class="section" aria-labelledby="rel-h"><div class="wrap">${ui.sectionHead({ id: 'rel-h', title: `${label} projects`, link: ui.linkMore(`/projects/?service=${slug}`, `All ${label.toLowerCase()} work`) })}<ul class="card-grid">${projects.filter((p) => p.service === slug).slice(0, 3).map((p) => ui.projectCard(d, p))}</ul></div></section>
      ${ui.faqList(s.faqs)}
      <section class="section section--tight" aria-labelledby="al-h"><div class="wrap">${ui.sectionHead({ id: 'al-h', title: `${label} across Greater Victoria` })}${ui.chips(site.areas.map((a) => [`/areas/${a}/`, areaName(a)]))}</div></section>
      ${ui.ctaBand({ heading: `Get a free ${label.toLowerCase()} quote` })}`,
    })));
  }

  R.push(route('/commercial/', { sources: [T, src('pages/commercial.json'), ...SHARED_SOURCES] }, () => {
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
  }));
  return R;
}
