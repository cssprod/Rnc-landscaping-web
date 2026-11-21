// @ts-check
/** Projects portfolio (filter: service × municipality) and case studies (blueprint C2 "Project case study"). */
import { html, paras } from '../lib/html.mjs';
import { picture, hasPhoto } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui.mjs';
import { icon } from '../components/sprite.mjs';
import { site } from '../../site.config.mjs';
import { route, HOME, clip } from './_shared.mjs';

/** @param {import('./_shared.mjs').Env} env @param {import('./_shared.mjs').Ctx} ctx */
export default function projectsPages(env, ctx) {
  const { d, pg, projects, svcLabel, areaName } = ctx;
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];
  R.push(route('/projects/', () => {
    const p = pg('projects');
    return layout(env, {
      path: '/projects/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Projects', path: '/projects/' }],
      body: html`${ui.pageHead(p)}
      <section class="section section--flush" aria-labelledby="all-h"><div class="wrap"><h2 id="all-h" class="vh">All projects</h2>${ui.projectGrid(d, projects, { filters: true })}</div></section>
      ${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  }, { sources: ['content/pages/projects.json', 'content/projects'] }));
  for (const p of projects) {
    const s = d.services[p.service];
    const ppath = `/projects/${p.slug}/`;
    const label = String(s?.navLabel || s?.name || p.service);
    const t = p.testimonial ? d.testimonials[p.testimonial] : null;
    const both = p.images?.before && p.images?.after && hasPhoto(p.images.before) && hasPhoto(p.images.after);
    const gallery = (p.images?.gallery || []).filter((/** @type {string} */ g) => g !== p.images?.after);
    const related = projects.filter((x) => x !== p && (x.service === p.service || x.area === p.area)).slice(0, 3);
    R.push(route(ppath, () => layout(env, {
      path: ppath, title: p.seo?.title || clip(`${p.title} | ${site.name}`, 60), description: p.seo?.description || clip(p.summary + ` ${s?.name} in ${areaName(p.area)}.`, 160), ogImage: p.images?.after,
      crumbs: [HOME, { name: 'Projects', path: '/projects/' }, { name: p.title, path: ppath }],
      body: html`<article class="case">
        ${ui.pageHead({ h1: p.title, lede: p.summary, className: 'case__head', extra: html`${p.sample ? html`<p class="case__sample">${ui.sampleLabel()} Illustrative project used while RNC’s own case studies are prepared.</p>` : ''}
          <dl class="spec-bar glass-bar"><div><dt>Service</dt><dd><a href="/services/${p.service}/">${s?.name}</a></dd></div><div><dt>Area</dt><dd><a href="/areas/${p.area}/">${areaName(p.area)}</a></dd></div><div><dt>Client</dt><dd>${p.clientType}</dd></div><div><dt>Duration</dt><dd>${p.duration}</dd></div></dl>` })}
        <div class="wrap case__visual">${both ? ui.beforeAfter(p.images.before, p.images.after, 'Drag the handle or use the arrow keys to compare before and after.') : picture(p.images?.after, { sample: !p.sample && hasPhoto(p.images?.after), sizes: '(min-width: 1200px) 1200px, 100vw', eager: true })}</div>
        <div class="section"><div class="wrap case__body"><div class="case__story prose"><h2>The project</h2>${paras(p.story)}${p.result ? html`<p class="case__result">${icon('check', { size: 18 })}<span><strong>Result:</strong> ${p.result}</span></p>` : ''}</div>
          <aside class="case__scope glass-card" aria-labelledby="scope-h"><h2 id="scope-h">Scope</h2><ul class="check-list">${(p.scope || []).map((/** @type {string} */ x) => html`<li>${icon('check', { size: 16 })}${x}</li>`)}</ul></aside></div></div>
        ${t ? html`<div class="wrap"><figure class="case__quote glass-card">${icon('quote', { size: 32, className: 'quote__mark' })}<blockquote><p>${t.quote}</p></blockquote><figcaption>${t.attribution} ${t.sample ? ui.sampleLabel() : ''}</figcaption></figure></div>` : ''}
        ${gallery.length ? html`<section class="section" aria-labelledby="gal-h"><div class="wrap"><h2 id="gal-h">Gallery</h2><div class="gallery">${gallery.map((/** @type {string} */ g) => picture(g, { sizes: '(min-width: 1100px) 580px, 100vw', sample: !p.sample && hasPhoto(g) }))}</div></div></section>` : ''}
      </article>
      <section class="section" aria-labelledby="more-h"><div class="wrap">${ui.sectionHead({ id: 'more-h', title: 'Related projects', link: ui.linkMore(`/projects/?service=${p.service}`, `All ${label.toLowerCase()} work`) })}<ul class="card-grid">${related.map((x) => ui.projectCard(d, x))}</ul></div></section>
      ${ui.ctaBand({ heading: 'Planning something similar?' })}`,
    }), { sources: [`content/projects/${p.slug}.json`] }));
  }
  return R;
}
