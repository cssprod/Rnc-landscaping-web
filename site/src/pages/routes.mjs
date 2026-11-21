// @ts-check
/**
 * Route table: every URL in CONTRACT.md "Generator output".
 */
import { html, md, paras, raw } from '../lib/html.mjs';
import { picture, hasPhoto, getSlot } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui.mjs';
import { areaMap } from '../components/map.mjs';
import { quoteForm } from '../components/forms.mjs';
import { icon } from '../components/sprite.mjs';
import * as schema from '../lib/schema.mjs';
import { site } from '../../site.config.mjs';
import { telLink, mailLink } from '../lib/tokens.mjs';

/** @typedef {import('../components/layout.mjs').Env} Env */
/** @typedef {{ path: string, file: string, render: () => any }} Route */

const HOME = { name: 'Home', path: '/' };
/** @param {string} s @param {number} n */
const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s || '');

/** @param {Env} env @returns {Route[]} */
export function routes(env) {
  const d = env.data;
  const pg = (/** @type {string} */ k) => d.pages[k] || { seo: { title: site.name, description: '' }, h1: k, sections: [] };
  const projects = Object.values(d.projects).sort((a, b) => site.services.indexOf(a.service) - site.services.indexOf(b.service) || a.slug.localeCompare(b.slug));
  const testimonials = Object.values(d.testimonials);
  const resources = Object.values(d.resources).sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.slug.localeCompare(b.slug));
  const svcName = (/** @type {string} */ s) => d.services[s]?.name || s;
  const svcLabel = (/** @type {string} */ s) => d.services[s]?.navLabel || svcName(s);
  const areaName = (/** @type {string} */ a) => d.areas[a]?.name || a;
  /** @type {Route[]} */
  const R = [];
  /** @param {string} path @param {() => any} render */
  const add = (path, render) => R.push({ path, file: path.endsWith('.html') ? path.slice(1) : `${path.slice(1)}index.html`, render });
  /** @param {any} page @param {string} id */
  const sec = (page, id) => (page.sections || []).find((/** @type {any} */ s) => s.id === id);
  /** @param {any} page @param {string[]} ids */
  const without = (page, ids) => (page.sections || []).filter((/** @type {any} */ s) => !ids.includes(s.id));

  /** @param {any[]} list @param {{ headingLevel?: number }} [o] */
  const resourceCards = (list, o = {}) => html`<ul class="card-grid">${list.map((r) => html`<li class="card res-card"><a class="card__link" href="/resources/${r.slug}/">
    <div class="card__media">${picture(r.image, { sizes: '(min-width: 1100px) 380px, (min-width: 640px) 50vw, 100vw', credit: false, aspect: '3:2' })}</div>
    <div class="card__body"><span class="card__meta">${icon('calendar', { size: 16 })}<time datetime="${r.date}">${fmtDate(r.date)}</time></span>${raw(`<h${o.headingLevel || 3} class="card__title">`)}${r.title}${raw(`</h${o.headingLevel || 3}>`)}<p class="card__text">${r.summary}</p></div>
  </a></li>`)}</ul>`;

  /* ---------- Home ---------- */
  add('/', () => {
    const p = pg('home');
    const what = sec(p, 'services');
    const how = sec(p, 'why');
    const who = sec(p, 'audiences');
    const cta = sec(p, 'cta');
    const featured = (p.featuredProjects || []).map((/** @type {string} */ s) => d.projects[s]).filter(Boolean);
    const quotes = (p.featuredTestimonials || []).map((/** @type {string} */ s) => d.testimonials[s]).filter(Boolean);
    const dock = html`<div class="hero__dock wrap"><nav class="dock glass-bar glass-bar--media" aria-label="Service shortcuts">${site.services.map((s) => html`<a class="dock__item" href="/services/${s}/">${icon(ui.serviceIcon(s), { size: 18 })}<span>${svcLabel(s)}</span></a>`)}<span class="dock__note">${icon('pin', { size: 16 })}13 municipalities, Sidney to Sooke</span></nav></div>`;
    return layout(env, {
      path: '/', title: p.seo.title, description: p.seo.description, bodyClass: 'is-home', ogImage: 'home-hero', hero: true,
      body: html`${ui.hero({ h1: p.h1, lede: p.lede, image: 'home-hero', variant: 'home', dock })}
      ${ui.serviceTiles(d, { heading: what?.heading || 'What we do', lede: what?.body?.[0] })}
      ${how ? ui.featureBento({ id: 'how-h', heading: how.heading, items: how.items, icons: ['compass', 'doc', 'chat'] }) : ''}
      <section class="section" aria-labelledby="feat-h"><div class="wrap">
        ${ui.sectionHead({ id: 'feat-h', title: 'Recent work', lede: sec(p, 'projects')?.body?.[0]?.replace(/\s*\[Browse the portfolio\]\(\/portfolio\/\)\.?/, ''), link: ui.linkMore('/portfolio/', 'Full portfolio') })}
        <ul class="card-grid card-grid--4">${featured.map((/** @type {any} */ x) => ui.projectCard(d, x))}</ul>
      </div></section>
      ${areaMap(d, { lede: sec(p, 'areas')?.body?.[0]?.replace(/\s*\[See all service areas\]\(\/areas\/\)\.?/, '') || undefined })}
      ${ui.testimonials(d, quotes, { link: ui.linkMore('/reviews/', 'All reviews') })}
      ${who ? html`<section class="section" aria-labelledby="who-h"><div class="wrap">
        ${ui.sectionHead({ id: 'who-h', title: who.heading })}
        <div class="feature-split">
          <a class="feature-split__media" href="/commercial/">${picture('home-commercial', { sizes: '(min-width: 1100px) 700px, 100vw', credit: false })}
            <span class="feature-split__glass glass-card glass-card--media"><span class="feature-split__title">For strata, commercial and public sites</span><span>Scheduled grounds maintenance, documented site visits and clear scopes for councils, property managers and facility teams.</span><span class="link-more link-more--light">Commercial and public sector${icon('arrow', { size: 18 })}</span></span></a>
          <ul class="stack-cards">${who.items.map((/** @type {any} */ i, n) => html`<li class="glass-card item-card item-card--row"><span class="icon-tile">${icon(['leaf', 'users', 'doc'][n] || 'check', { size: 20 })}</span><div><h3>${i.title}</h3><p>${md(i.body)}</p></div></li>`)}</ul>
        </div>
      </div></section>` : ''}
      ${ui.trustBand()}
      <section class="section" aria-labelledby="res-h"><div class="wrap">${ui.sectionHead({ id: 'res-h', title: 'Seasonal guides', lede: 'Practical, local notes on lawns, gardens, irrigation and trees through the year.', link: ui.linkMore('/resources/', 'All guides') })}${resourceCards(resources.slice(0, 3))}</div></section>
      ${ui.ctaBand({ heading: cta?.heading, body: cta?.body?.[0] })}`,
    });
  });

  /* ---------- Services ---------- */
  add('/services/', () => {
    const p = pg('services');
    return layout(env, {
      path: '/services/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Services', path: '/services/' }],
      body: html`${ui.pageHead(p)}${ui.serviceTiles(d, { heading: 'Four service lines', link: false, id: 'lines-h' })}${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  });
  for (const slug of site.services) {
    const s = d.services[slug];
    if (!s) continue;
    const path = `/services/${slug}/`;
    const label = String(s.navLabel || s.name);
    const ba = hasPhoto(`svc-${slug}-before`) && hasPhoto(`svc-${slug}-after`);
    add(path, () => layout(env, {
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
      <section class="section" aria-labelledby="rel-h"><div class="wrap">${ui.sectionHead({ id: 'rel-h', title: `${label} projects`, link: ui.linkMore(`/portfolio/${slug}/`, `All ${label.toLowerCase()} work`) })}<ul class="card-grid">${projects.filter((p) => p.service === slug).slice(0, 3).map((p) => ui.projectCard(d, p))}</ul></div></section>
      ${ui.faqList(s.faqs)}
      <section class="section section--tight" aria-labelledby="al-h"><div class="wrap">${ui.sectionHead({ id: 'al-h', title: `${label} across Greater Victoria` })}${ui.chips(site.areas.map((a) => [`/areas/${a}/`, areaName(a)]))}</div></section>
      ${ui.ctaBand({ heading: `Get a free ${label.toLowerCase()} quote` })}`,
    }));
  }

  /* ---------- Portfolio ---------- */
  add('/portfolio/', () => {
    const p = pg('portfolio');
    return layout(env, {
      path: '/portfolio/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Portfolio', path: '/portfolio/' }],
      body: html`${ui.pageHead({ ...p, extra: ui.chips(site.services.map((s) => [`/portfolio/${s}/`, `${svcLabel(s)} work`])) })}
      <section class="section section--flush" aria-labelledby="all-h"><div class="wrap"><h2 id="all-h" class="vh">All projects</h2>${ui.projectGrid(d, projects, { filters: true })}</div></section>
      ${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  });
  for (const slug of site.services) {
    const s = d.services[slug];
    if (!s) continue;
    const path = `/portfolio/${slug}/`;
    const label = String(s.navLabel || s.name);
    const list = projects.filter((p) => p.service === slug);
    add(path, () => layout(env, {
      path, title: clip(`${label} projects | ${site.name}`, 60),
      description: clip(`${s.name} projects across Greater Victoria by ${site.name}: scope, approach and photos for homeowners, strata and commercial sites.`, 160),
      crumbs: [HOME, { name: 'Portfolio', path: '/portfolio/' }, { name: label, path }],
      body: html`${ui.pageHead({ h1: `${s.name} projects`, lede: s.hero?.lede, extra: html`<p class="page-head__more">${ui.linkMore(`/services/${slug}/`, `About our ${label.toLowerCase()} service`)}</p>` })}
      <section class="section section--flush" aria-labelledby="list-h"><div class="wrap"><h2 id="list-h" class="vh">Projects</h2>${ui.projectGrid(d, list)}</div></section>
      ${ui.ctaBand()}`,
    }));
    for (const p of list) {
      const ppath = `${path}${p.slug}/`;
      const t = p.testimonial ? d.testimonials[p.testimonial] : null;
      const both = p.images?.before && p.images?.after && hasPhoto(p.images.before) && hasPhoto(p.images.after);
      const gallery = (p.images?.gallery || []).filter((/** @type {string} */ g) => g !== p.images?.after);
      add(ppath, () => layout(env, {
        path: ppath, title: p.seo?.title || clip(`${p.title} | ${site.name}`, 60), description: p.seo?.description || clip(p.summary + ` ${s.name} in ${areaName(p.area)}.`, 160), ogImage: p.images?.after,
        crumbs: [HOME, { name: 'Portfolio', path: '/portfolio/' }, { name: label, path }, { name: p.title, path: ppath }],
        body: html`<article class="case">
          ${ui.pageHead({ h1: p.title, lede: p.summary, className: 'case__head', extra: html`${p.sample ? html`<p class="case__sample">${ui.sampleLabel()} Illustrative project used while RNC’s own case studies are prepared.</p>` : ''}
            <dl class="spec-bar glass-bar"><div><dt>Service</dt><dd><a href="/services/${p.service}/">${s.name}</a></dd></div><div><dt>Area</dt><dd><a href="/areas/${p.area}/">${areaName(p.area)}</a></dd></div><div><dt>Client</dt><dd>${p.clientType}</dd></div><div><dt>Duration</dt><dd>${p.duration}</dd></div></dl>` })}
          <div class="wrap case__visual">${both ? ui.beforeAfter(p.images.before, p.images.after, 'Drag the handle or use the arrow keys to compare before and after.') : picture(p.images?.after, { sample: !p.sample && hasPhoto(p.images?.after), sizes: '(min-width: 1200px) 1200px, 100vw', eager: true })}</div>
          <div class="section"><div class="wrap case__body"><div class="case__story prose"><h2>The project</h2>${paras(p.story)}${p.result ? html`<p class="case__result">${icon('check', { size: 18 })}<span><strong>Result:</strong> ${p.result}</span></p>` : ''}</div>
            <aside class="case__scope glass-card" aria-labelledby="scope-h"><h2 id="scope-h">Scope</h2><ul class="check-list">${(p.scope || []).map((/** @type {string} */ x) => html`<li>${icon('check', { size: 16 })}${x}</li>`)}</ul></aside></div></div>
          ${t ? html`<div class="wrap"><figure class="case__quote glass-card">${icon('quote', { size: 32, className: 'quote__mark' })}<blockquote><p>${t.quote}</p></blockquote><figcaption>${t.attribution} ${t.sample ? ui.sampleLabel() : ''}</figcaption></figure></div>` : ''}
          ${gallery.length ? html`<section class="section" aria-labelledby="gal-h"><div class="wrap"><h2 id="gal-h">Gallery</h2><div class="gallery">${gallery.map((/** @type {string} */ g) => picture(g, { sizes: '(min-width: 1100px) 580px, 100vw', sample: !p.sample && hasPhoto(g) }))}</div></div></section>` : ''}
        </article>
        <section class="section" aria-labelledby="more-h"><div class="wrap">${ui.sectionHead({ id: 'more-h', title: `More ${label.toLowerCase()} work`, link: ui.linkMore(path, 'See all') })}<ul class="card-grid">${list.filter((x) => x !== p).slice(0, 3).map((x) => ui.projectCard(d, x))}</ul></div></section>
        ${ui.ctaBand({ heading: 'Planning something similar?' })}`,
      }));
    }
  }

  /* ---------- Areas ---------- */
  add('/areas/', () => {
    const p = pg('areas');
    return layout(env, {
      path: '/areas/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Areas', path: '/areas/' }],
      body: html`${ui.pageHead(p)}${areaMap(d, { heading: 'Thirteen municipalities' })}
      <section class="section" aria-labelledby="ac-h"><div class="wrap">${ui.sectionHead({ id: 'ac-h', title: 'Area guides' })}<ul class="card-grid area-cards">${site.areas.map((a) => d.areas[a] ? html`<li class="card area-card"><a class="card__link" href="/areas/${a}/">
        <div class="card__media">${picture(d.areas[a].image || `area-${a}`, { sizes: '(min-width: 1100px) 380px, (min-width: 640px) 50vw, 100vw', credit: false, aspect: '16:9' })}</div>
        <div class="card__body"><h3 class="card__title">${areaName(a)}</h3><p class="card__text">${clip(d.areas[a].intro?.[0] || '', 130)}</p></div></a></li>` : '')}</ul></div></section>
      ${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  });
  for (const slug of site.areas) {
    const a = d.areas[slug];
    if (!a) continue;
    const path = `/areas/${slug}/`;
    const fp = a.featuredProject ? d.projects[a.featuredProject] : projects.find((p) => p.area === slug);
    const more = projects.filter((p) => p.area === slug && p !== fp);
    add(path, () => layout(env, {
      path, title: a.seo.title, description: a.seo.description, ogImage: a.image, hero: true,
      crumbs: [HOME, { name: 'Areas', path: '/areas/' }, { name: a.name, path }],
      body: html`${ui.hero({ h1: a.h1, lede: a.intro?.[0], image: a.image || `area-${slug}` })}
      <section class="section" aria-label="About ${a.name}"><div class="wrap area-intro"><div class="area-intro__body prose">${paras((a.intro || []).slice(1))}</div>
        <dl class="area-facts glass-card">${a.neighbourhoods?.length ? html`<div><dt>${icon('pin', { size: 16 })}Neighbourhoods</dt><dd><ul class="chip-list">${a.neighbourhoods.map((/** @type {string} */ n) => html`<li><span class="chip chip--static">${n}</span></li>`)}</ul></dd></div>` : ''}${a.propertyTypes?.length ? html`<div><dt>${icon('leaf', { size: 16 })}Typical properties</dt><dd><ul class="check-list">${a.propertyTypes.map((/** @type {string} */ t) => html`<li>${icon('check', { size: 16 })}${t.charAt(0).toUpperCase() + t.slice(1)}</li>`)}</ul></dd></div>` : ''}</dl></div></section>
      <section class="section section--elevated" aria-labelledby="as-h"><div class="wrap">${ui.sectionHead({ id: 'as-h', title: `Services in ${a.name}` })}<ul class="service-list">${site.services.map((s) => html`<li class="glass-card service-item"><span class="icon-tile">${icon(ui.serviceIcon(s), { size: 22 })}</span><h3><a href="/services/${s}/">${svcName(s)}</a></h3><p>${md(a.servicesBlurb?.[s] || d.services[s]?.hero?.lede || '')}</p></li>`)}</ul></div></section>
      ${a.localNotes?.length ? html`<section class="section" aria-labelledby="ln-h"><div class="wrap">${ui.sectionHead({ id: 'ln-h', title: 'Local notes', lede: 'Rules change, so each note links to the official source.' })}<ul class="notes">${a.localNotes.map((/** @type {any} */ n) => html`<li class="glass-card note-card"><p>${md(n.text)}</p>${n.sourceUrl ? html`<a class="source-chip" href="${n.sourceUrl}" rel="noopener">${icon('arrow-up-right', { size: 14 })}Source: ${hostOf(n.sourceUrl)}</a>` : ''}</li>`)}</ul></div></section>` : ''}
      ${fp ? html`<section class="section" aria-labelledby="fp-h"><div class="wrap">${ui.sectionHead({ id: 'fp-h', title: `Work in ${a.name}` })}<ul class="card-grid">${[fp, ...more].slice(0, 3).map((x) => ui.projectCard(d, x))}</ul></div></section>` : ''}
      ${areaMap(d, { current: slug, heading: 'Nearby areas', id: 'near-h' })}
      ${ui.ctaBand({ heading: `Free quotes in ${a.name}` })}`,
    }));
  }

  /* ---------- Resources ---------- */
  add('/resources/', () => {
    const p = pg('resources');
    return layout(env, {
      path: '/resources/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Resources', path: '/resources/' }],
      body: html`${ui.pageHead(p)}<section class="section section--flush" aria-labelledby="rl-h"><div class="wrap"><h2 id="rl-h" class="vh">Articles</h2>${resourceCards(resources)}</div></section>${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  });
  for (const r of resources) {
    const path = `/resources/${r.slug}/`;
    const img = getSlot(r.image)?.stock?.imageUrl || null;
    add(path, () => layout(env, {
      path, title: r.seo?.title || clip(`${r.title} | ${site.name}`, 60), description: r.seo?.description || r.summary, ogImage: r.image,
      crumbs: [HOME, { name: 'Resources', path: '/resources/' }, { name: r.title, path }],
      jsonld: [schema.article(env, r, path, img)],
      body: html`<article class="article">
        ${ui.pageHead({ h1: r.title, lede: r.summary, className: 'article__head', extra: html`<p class="article__date">${icon('calendar', { size: 16 })}Published <time datetime="${r.date}">${fmtDate(r.date)}</time></p>` })}
        <div class="wrap article__media">${picture(r.image, { eager: true, sizes: '(min-width: 1200px) 1200px, 100vw', aspect: '21:9' })}</div>
        <div class="article__body prose">${(r.body || []).map((/** @type {any} */ b) => b.h2 ? html`<h2>${b.h2}</h2>` : b.list ? html`<ul>${b.list.map((/** @type {string} */ i) => html`<li>${md(i)}</li>`)}</ul>` : b.p ? html`<p>${md(b.p)}</p>` : '')}
        ${r.sources?.length ? html`<h2>Sources</h2><ul class="sources">${r.sources.map((/** @type {any} */ s) => html`<li><a href="${s.url}" rel="noopener">${s.label}</a></li>`)}</ul>` : ''}</div>
      </article>${ui.ctaBand()}`,
    }));
  }

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
  add('/quote/', () => {
    const p = pg('quote');
    return layout(env, {
      path: '/quote/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Free quote', path: '/quote/' }], bodyClass: 'is-quote',
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
  add('/contact/', () => {
    const p = pg('contact');
    return layout(env, {
      path: '/contact/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Contact', path: '/contact/' }],
      body: html`${ui.pageHead({ ...p, extra: html`<div class="page-head__ctas">${ui.quoteBtn({ size: 'lg' })}</div>` })}
      <section class="section section--flush" aria-labelledby="cd-h"><div class="wrap"><h2 id="cd-h" class="vh">Contact details</h2>${ui.contactCards()}</div></section>
      ${ui.sections(without(p, ['details']))}${areaMap(d, { id: 'cmap-h' })}`,
    });
  });
  for (const k of ['privacy', 'terms', 'accessibility']) {
    add(`/${k}/`, () => {
      const p = pg(k);
      return layout(env, {
        path: `/${k}/`, title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: p.h1, path: `/${k}/` }],
        body: html`${ui.pageHead({ ...p, extra: p.updated ? html`<p class="article__date">${icon('calendar', { size: 16 })}Updated <time datetime="${p.updated}">${fmtDate(p.updated)}</time></p>` : '' })}<div class="legal">${ui.sections(p.sections, { tone: 'prose-section--legal' })}</div>`,
      });
    });
  }
  add('/404.html', () => {
    const p = pg('404');
    const tryIt = sec(p, 'try');
    const links = [['/services/', 'Services', 'leaf'], ['/areas/', 'Areas', 'map'], ['/resources/', 'Guides', 'calendar'], ['/quote/', 'Free quote', 'mail']];
    return layout(env, {
      path: '/404.html', title: p.seo.title, description: p.seo.description, noindex: true,
      body: html`${ui.pageHead({ ...p, className: 'page-head--center', extra: html`<div class="page-head__ctas"><a class="btn btn--primary btn--lg" href="/">Go to the home page</a></div>` })}
      <section class="section section--flush" aria-labelledby="try-h"><div class="wrap"><h2 id="try-h" class="vh">${tryIt?.heading || 'Try one of these'}</h2><ul class="service-list service-list--compact">${links.map(([href, label, ic], n) => html`<li class="glass-card service-item"><span class="icon-tile">${icon(ic, { size: 22 })}</span><h3><a href="${href}">${tryIt?.items?.[n]?.title || label}</a></h3>${tryIt?.items?.[n]?.body ? html`<p>${md(tryIt.items[n].body)}</p>` : ''}</li>`)}</ul></div></section>`,
    });
  });
  return R;
}

/** @param {string} iso */
function fmtDate(iso) {
  const dt = new Date(`${iso}T12:00:00Z`);
  return isNaN(+dt) ? iso : dt.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
/** @param {string} u */
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }
