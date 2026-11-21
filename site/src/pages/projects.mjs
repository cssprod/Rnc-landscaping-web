// @ts-check
/**
 * Projects family (C1): the filterable hub /projects/ (?service= / ?area= preselect) and one flat case study per
 * project at /projects/{slug}/ (W3 owner: t-projects). The retired /portfolio/… URLs are 301s (redirects.mjs).
 */
import { html, paras } from '../lib/html.mjs';
import { picture, hasPhoto } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui/index.mjs';
import { icon } from '../components/sprite.mjs';
import { site } from '../../site.config.mjs';
import { ctx, route, tpl, src, clip, HOME, SHARED_SOURCES } from './_shared.mjs';

/** Feature modules for every project route (CONTRACT §12). */
const SCRIPTS = ['projects'];

/** @param {import('./_shared.mjs').Env} env @returns {import('./_shared.mjs').Route[]} */
export function routes(env) {
  const { d, pgAny, projects, svcLabel, areaName } = ctx(env);
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];
  const T = tpl('projects');
  const HUB = { name: 'Projects', path: '/projects/' };

  // pg("projects") ?? pg("portfolio") during the transition (content renames the file in W1).
  R.push(route('/projects/', { sources: [T, src('pages/projects.json'), src('pages/portfolio.json'), 'content/projects', ...SHARED_SOURCES], scripts: SCRIPTS }, () => {
    const p = pgAny('projects', 'portfolio');
    return layout(env, {
      path: '/projects/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, HUB], scripts: SCRIPTS,
      body: html`${ui.pageHead({ ...p, extra: ui.chips(site.services.map((s) => [`/projects/?service=${s}`, `${svcLabel(s)} work`])) })}
      <section class="section section--flush" aria-labelledby="all-h"><div class="wrap"><h2 id="all-h" class="vh">All projects</h2>${ui.projectGrid(d, projects, { filters: true })}</div></section>
      ${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  }));

  for (const p of projects) {
    const s = d.services[p.service];
    if (!s) continue;
    const label = String(s.navLabel || s.name);
    const ppath = `/projects/${p.slug}/`;
    const list = projects.filter((x) => x.service === p.service);
    const t = p.testimonial ? d.testimonials[p.testimonial] : null;
    const both = p.images?.before && p.images?.after && hasPhoto(p.images.before) && hasPhoto(p.images.after);
    const gallery = (p.images?.gallery || []).filter((/** @type {string} */ g) => g !== p.images?.after);
    R.push(route(ppath, { sources: [T, src(`projects/${p.slug}.json`), ...SHARED_SOURCES], scripts: SCRIPTS }, () => layout(env, {
      path: ppath, title: p.seo?.title || clip(`${p.title} | ${site.name}`, 60), description: p.seo?.description || clip(p.summary + ` ${s.name} in ${areaName(p.area)}.`, 160), ogImage: p.images?.after, scripts: SCRIPTS,
      crumbs: [HOME, HUB, { name: p.title, path: ppath }],
      body: html`<article class="case">
          ${ui.pageHead({ h1: p.title, lede: p.summary, className: 'case__head', extra: html`${p.sample ? html`<p class="case__sample">${ui.sampleLabel()} Illustrative project used while RNC’s own case studies are prepared.</p>` : ''}
            <dl class="spec-bar glass-bar"><div><dt>Service</dt><dd><a href="/services/${p.service}/">${s.name}</a></dd></div><div><dt>Area</dt><dd><a href="/areas/${p.area}/">${areaName(p.area)}</a></dd></div><div><dt>Client</dt><dd>${p.clientType}</dd></div><div><dt>Duration</dt><dd>${p.duration}</dd></div></dl>` })}
          <div class="wrap case__visual">${both ? ui.beforeAfter(p.images.before, p.images.after, 'Drag the handle or use the arrow keys to compare before and after.') : picture(p.images?.after, { sample: !p.sample && hasPhoto(p.images?.after), sizes: '(min-width: 1200px) 1200px, 100vw', eager: true })}</div>
          <div class="section"><div class="wrap case__body"><div class="case__story prose"><h2>The project</h2>${paras(p.story || [p.challenge, ...(p.approach || [])].filter(Boolean))}${p.result ? html`<p class="case__result">${icon('check', { size: 18 })}<span><strong>Result:</strong> ${p.result}</span></p>` : ''}</div>
            <aside class="case__scope glass-card" aria-labelledby="scope-h"><h2 id="scope-h">Scope</h2><ul class="check-list">${(p.scope || []).map((/** @type {string} */ x) => html`<li>${icon('check', { size: 16 })}${x}</li>`)}</ul></aside></div></div>
          ${t ? html`<div class="wrap"><figure class="case__quote glass-card">${icon('quote', { size: 32, className: 'quote__mark' })}<blockquote><p>${t.quote}</p></blockquote><figcaption>${t.attribution} ${t.sample ? ui.sampleLabel() : ''}</figcaption></figure></div>` : ''}
          ${gallery.length ? html`<section class="section" aria-labelledby="gal-h"><div class="wrap"><h2 id="gal-h">Gallery</h2><div class="gallery">${gallery.map((/** @type {string} */ g) => picture(g, { sizes: '(min-width: 1100px) 580px, 100vw', sample: !p.sample && hasPhoto(g) }))}</div></div></section>` : ''}
        </article>
        <section class="section" aria-labelledby="more-h"><div class="wrap">${ui.sectionHead({ id: 'more-h', title: `More ${label.toLowerCase()} work`, link: ui.linkMore(`/projects/?service=${p.service}`, 'See all') })}<ul class="card-grid">${list.filter((x) => x !== p).slice(0, 3).map((x) => ui.projectCard(d, x))}</ul></div></section>
        ${ui.ctaBand({ heading: 'Planning something similar?' })}`,
    })));
  }
  return R;
}
