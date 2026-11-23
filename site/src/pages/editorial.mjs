// @ts-check
/** Editorial family: /resources/ and the guides, the legal pages, the accessibility statement and /404.html (W3 owner: t-editorial). */
import { html, md } from '../lib/html.mjs';
import { picture, getSlot } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui/index.mjs';
import { icon } from '../components/sprite.mjs';
import * as schema from '../lib/schema.mjs';
import { site } from '../../site.config.mjs';
import { ctx, route, tpl, src, clip, fmtDate, pubDate, HOME, SHARED_SOURCES } from './_shared.mjs';

/** @param {import('./_shared.mjs').Env} env @returns {import('./_shared.mjs').Route[]} */
export function routes(env) {
  const { pg, sec, resources, resourceCards } = ctx(env);
  const T = tpl('editorial');
  /** @type {import('./_shared.mjs').Route[]} */
  const R = [];

  R.push(route('/resources/', { sources: [T, src('pages/resources.json'), 'content/resources', ...SHARED_SOURCES] }, () => {
    const p = pg('resources');
    return layout(env, {
      path: '/resources/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Resources', path: '/resources/' }],
      body: html`${ui.pageHead(p)}<section class="section section--flush" aria-labelledby="rl-h"><div class="wrap"><h2 id="rl-h" class="vh">Articles</h2>${resourceCards(resources)}</div></section>${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  }));

  for (const r of resources) {
    const path = `/resources/${r.slug}/`;
    const img = getSlot(r.image)?.stock?.imageUrl || null;
    const date = pubDate(r);
    R.push(route(path, { sources: [T, src(`resources/${r.slug}.json`), ...SHARED_SOURCES] }, () => layout(env, {
      path, title: r.seo?.title || clip(`${r.title} | ${site.name}`, 60), description: r.seo?.description || r.summary, ogImage: r.image,
      crumbs: [HOME, { name: 'Resources', path: '/resources/' }, { name: r.title, path }],
      jsonld: [schema.article(env, { ...r, date }, path, img)],
      body: html`<article class="article">
        ${ui.pageHead({ h1: r.title, lede: r.summary, className: 'article__head', extra: html`<p class="article__date">${icon('calendar', { size: 16 })}Published <time datetime="${date}">${fmtDate(date)}</time></p>` })}
        <div class="wrap article__media">${picture(r.image, { eager: true, sizes: '(min-width: 1200px) 1200px, 100vw', aspect: '21:9' })}</div>
        <div class="article__body prose">${(r.body || []).map((/** @type {any} */ b) => b.h2 ? html`<h2>${b.h2}</h2>` : b.list ? html`<ul>${b.list.map((/** @type {string} */ i) => html`<li>${md(i)}</li>`)}</ul>` : b.p ? html`<p>${md(b.p)}</p>` : '')}
        ${r.sources?.length ? html`<h2>Sources</h2><ul class="sources">${r.sources.map((/** @type {any} */ s) => html`<li><a href="${s.url}" rel="noopener">${s.label}</a></li>`)}</ul>` : ''}</div>
      </article>${ui.ctaBand()}`,
    })));
  }

  for (const k of ['privacy', 'terms', 'accessibility']) {
    R.push(route(`/${k}/`, { sources: [T, src(`pages/${k}.json`), ...SHARED_SOURCES] }, () => {
      const p = pg(k);
      return layout(env, {
        path: `/${k}/`, title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: p.h1, path: `/${k}/` }],
        body: html`${ui.pageHead({ ...p, extra: p.updated ? html`<p class="article__date">${icon('calendar', { size: 16 })}Updated <time datetime="${p.updated}">${fmtDate(p.updated)}</time></p>` : '' })}<div class="legal">${ui.sections(p.sections, { tone: 'prose-section--legal' })}</div>`,
      });
    }));
  }

  R.push(route('/404.html', { sources: [T, src('pages/404.json'), ...SHARED_SOURCES], sitemap: false, noindex: true }, () => {
    const p = pg('404');
    const tryIt = sec(p, 'try');
    const links = [['/services/', 'Services', 'leaf'], ['/areas/', 'Areas', 'map'], ['/resources/', 'Guides', 'calendar'], ['/free-quote/', 'Free quote', 'mail']];
    return layout(env, {
      path: '/404.html', title: p.seo.title, description: p.seo.description, noindex: true,
      body: html`${ui.pageHead({ ...p, className: 'page-head--center', extra: html`<div class="page-head__ctas"><a class="btn btn--primary btn--lg" href="/">Go to the home page</a></div>` })}
      <section class="section section--flush" aria-labelledby="try-h"><div class="wrap"><h2 id="try-h" class="vh">${tryIt?.heading || 'Try one of these'}</h2><ul class="service-list service-list--compact">${links.map(([href, label, ic], n) => html`<li class="glass-card service-item"><span class="icon-tile">${icon(ic, { size: 22 })}</span><h3><a href="${href}">${tryIt?.items?.[n]?.title || label}</a></h3>${tryIt?.items?.[n]?.body ? html`<p>${md(tryIt.items[n].body)}</p>` : ''}</li>`)}</ul></div></section>`,
    });
  }));
  return R;
}
