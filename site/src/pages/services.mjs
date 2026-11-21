// @ts-check
/** Services hub and the four service pages (blueprint C2 "Service page"). */
import { html, md } from '../lib/html.mjs';
import { picture, hasPhoto } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui.mjs';
import { icon } from '../components/sprite.mjs';
import * as schema from '../lib/schema.mjs';
import { site } from '../../site.config.mjs';
import { route, HOME } from './_shared.mjs';

/** @param {import('./_shared.mjs').Env} env @param {import('./_shared.mjs').Ctx} ctx */
export default function services(env, ctx) {
  const { d, pg, projects, areaName } = ctx;
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];
  R.push(route('/services/', () => {
    const p = pg('services');
    return layout(env, {
      path: '/services/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Services', path: '/services/' }],
      body: html`${ui.pageHead(p)}${ui.serviceTiles(d, { heading: 'Four service lines', link: false, id: 'lines-h' })}${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  }, { sources: ['content/pages/services.json', 'content/services'] }));
  for (const slug of site.services) {
    const s = d.services[slug];
    if (!s) continue;
    const path = `/services/${slug}/`;
    const label = String(s.navLabel || s.name);
    const ba = hasPhoto(`svc-${slug}-before`) && hasPhoto(`svc-${slug}-after`);
    R.push(route(path, () => layout(env, {
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
    }), { sources: [`content/services/${slug}.json`, 'content/projects'] }));
  }
  return R;
}
