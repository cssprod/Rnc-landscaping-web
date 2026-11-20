// @ts-check
/**
 * Route table: every URL in CONTRACT.md "Generator output".
 * (Astro port: each block maps to src/pages/<route>.astro with getStaticPaths.)
 */
import { html, md, paras } from '../lib/html.mjs';
import { picture, isStock, getSlot } from '../lib/images.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui.mjs';
import { areaMap } from '../components/map.mjs';
import { quoteForm, contactForm } from '../components/forms.mjs';
import * as schema from '../lib/schema.mjs';
import { site } from '../../site.config.mjs';
import { telHref, tok } from '../lib/tokens.mjs';

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
  const areaName = (/** @type {string} */ a) => d.areas[a]?.name || a;
  /** @type {Route[]} */
  const R = [];
  /** @param {string} path @param {() => any} render */
  const add = (path, render) => R.push({ path, file: path.endsWith('.html') ? path.slice(1) : `${path.slice(1)}index.html`, render });

  /* ---------- Home ---------- */
  add('/', () => {
    const p = pg('home');
    const [first, ...rest] = p.sections || [];
    return layout(env, {
      path: '/', title: p.seo.title, description: p.seo.description, bodyClass: 'is-home', ogImage: 'home-hero',
      body: html`${ui.hero({ h1: p.h1, lede: p.lede, image: 'home-hero', variant: 'home' })}
      ${ui.serviceCards(d)}
      ${first ? ui.sections([first]) : ''}
      <section class="featured wrap" aria-labelledby="feat-h"><div class="band-head"><h2 id="feat-h">Recent work</h2><a href="/portfolio/" class="link-more">See the full portfolio</a></div>
        ${ui.projectGrid(d, site.services.map((s) => projects.find((x) => x.service === s)).filter(Boolean))}</section>
      ${areaMap(d)}
      ${ui.testimonials(d, testimonials.slice(0, 3))}
      ${ui.trustStrip()}
      <section class="split wrap" aria-labelledby="com-h"><div class="split__media">${picture('home-commercial', { sizes: '(min-width: 960px) 50vw, 100vw' })}</div>
        <div class="split__text"><h2 id="com-h">For strata, commercial and public sites</h2><p>Scheduled grounds maintenance, documented site visits and clear scopes for property managers, councils, facility teams and general contractors.</p><a class="btn btn--ghost" href="/commercial/">Commercial and public sector</a></div></section>
      ${ui.sections(rest)}
      <section class="res-band wrap" aria-labelledby="res-h"><div class="band-head"><h2 id="res-h">Seasonal guides</h2><a class="link-more" href="/resources/">All resources</a></div>${resourceList(resources.slice(0, 3))}</section>
      ${ui.ctaBand()}`,
    });
  });

  /** @param {any[]} list */
  function resourceList(list) {
    return html`<ul class="res-list">${list.map((r) => html`<li class="res-card"><a href="/resources/${r.slug}/">${picture(r.image, { sizes: '(min-width: 960px) 33vw, 100vw', credit: false })}<h3>${r.title}</h3><p>${r.summary}</p><time datetime="${r.date}">${fmtDate(r.date)}</time></a></li>`)}</ul>`;
  }

  /* ---------- Services ---------- */
  add('/services/', () => {
    const p = pg('services');
    return layout(env, {
      path: '/services/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Services', path: '/services/' }],
      body: html`${ui.pageHead(p)}${ui.serviceCards(d, { heading: 'Four service lines' })}${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  });
  for (const slug of site.services) {
    const s = d.services[slug];
    if (!s) continue;
    const path = `/services/${slug}/`;
    add(path, () => layout(env, {
      path, title: s.seo.title, description: s.seo.description, ogImage: s.hero?.image,
      crumbs: [HOME, { name: 'Services', path: '/services/' }, { name: s.name, path }],
      jsonld: [schema.service(env, s, path), ...(s.faqs?.length ? [schema.faqPage(s.faqs)] : [])],
      body: html`${ui.hero({ h1: s.hero.h1, lede: s.hero.lede, image: s.hero.image || `svc-${slug}-hero` })}
      ${s.audiences?.length ? html`<section class="audiences wrap" aria-labelledby="aud-h"><div class="band-head"><h2 id="aud-h">Who it is for</h2></div><ul class="audience-list">${s.audiences.map((/** @type {any} */ a) => html`<li><h3>${a.title}</h3><p>${md(a.body)}</p></li>`)}</ul></section>` : ''}
      <section class="includes wrap" aria-labelledby="inc-h"><div class="includes__text"><h2 id="inc-h">What is included</h2>
        <dl class="def-list">${(s.includes || []).map((/** @type {any} */ i) => html`<div><dt>${i.title}</dt><dd>${md(i.body)}</dd></div>`)}</dl></div>
        <div class="includes__media">${(s.detailImages || []).map((/** @type {string} */ id) => picture(id, { sizes: '(min-width: 960px) 40vw, 100vw' }))}</div></section>
      ${s.process?.length ? html`<section class="process wrap" aria-labelledby="proc-h"><div class="band-head"><h2 id="proc-h">How it works</h2></div><ol class="process__list">${s.process.map((/** @type {any} */ st) => html`<li><h3>${st.title}</h3><p>${md(st.body)}</p></li>`)}</ol></section>` : ''}
      ${s.seasonal?.length ? html`<section class="seasons wrap" aria-labelledby="sea-h"><div class="band-head"><h2 id="sea-h">Through the year</h2></div><div class="seasons__grid">${s.seasonal.map((/** @type {any} */ x) => html`<div class="season"><h3>${x.season}</h3><ul>${x.items.map((/** @type {string} */ i) => html`<li>${i}</li>`)}</ul></div>`)}</div></section>` : ''}
      <section class="wrap ba-band" aria-labelledby="ba-h"><div class="band-head"><h2 id="ba-h">Before and after</h2></div>${ui.beforeAfter(`svc-${slug}-before`, `svc-${slug}-after`, `${s.name}: drag or use the arrow keys to compare.`)}</section>
      <section class="featured wrap" aria-labelledby="rel-h"><div class="band-head"><h2 id="rel-h">${s.navLabel || s.name} projects</h2><a class="link-more" href="/portfolio/${slug}/">All ${s.navLabel || s.name} projects</a></div>${ui.projectGrid(d, projects.filter((p) => p.service === slug).slice(0, 3))}</section>
      ${ui.faqList(s.faqs)}
      <section class="wrap area-links" aria-labelledby="al-h"><h2 id="al-h">${s.navLabel || s.name} across Greater Victoria</h2><ul class="chip-list">${site.areas.map((a) => html`<li><a href="/areas/${a}/">${areaName(a)}</a></li>`)}</ul></section>
      ${ui.ctaBand({ heading: `Get a free ${String(s.navLabel || s.name).toLowerCase()} quote` })}`,
    }));
  }

  /* ---------- Portfolio ---------- */
  add('/portfolio/', () => {
    const p = pg('portfolio');
    return layout(env, {
      path: '/portfolio/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Portfolio', path: '/portfolio/' }],
      body: html`${ui.pageHead({ ...p, extra: html`<ul class="chip-list">${site.services.map((s) => html`<li><a href="/portfolio/${s}/">${d.services[s]?.navLabel || s}</a></li>`)}</ul>` })}
      <section class="wrap portfolio" aria-labelledby="all-h"><h2 id="all-h" class="vh">All projects</h2>${ui.projectGrid(d, projects, { filters: true })}</section>
      ${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  });
  for (const slug of site.services) {
    const s = d.services[slug];
    if (!s) continue;
    const path = `/portfolio/${slug}/`;
    const list = projects.filter((p) => p.service === slug);
    add(path, () => layout(env, {
      path, title: clip(`${s.navLabel || s.name} projects | ${site.name}`, 60),
      description: clip(`${s.name} projects across Greater Victoria by ${site.name}: scope, approach and before-and-after photos for homeowners, strata and commercial sites.`, 160),
      crumbs: [HOME, { name: 'Portfolio', path: '/portfolio/' }, { name: s.navLabel || s.name, path }],
      body: html`${ui.pageHead({ h1: `${s.name} projects`, lede: s.hero?.lede })}
      <section class="wrap" aria-labelledby="list-h"><h2 id="list-h" class="vh">Projects</h2>${ui.projectGrid(d, list)}</section>
      <p class="wrap"><a class="link-more" href="/services/${slug}/">About our ${String(s.navLabel || s.name).toLowerCase()} service</a></p>${ui.ctaBand()}`,
    }));
    for (const p of list) {
      const ppath = `${path}${p.slug}/`;
      const t = p.testimonial ? d.testimonials[p.testimonial] : null;
      add(ppath, () => layout(env, {
        path: ppath, title: p.seo?.title || clip(`${p.title} | ${site.name}`, 60), description: p.seo?.description || clip(p.summary + ` ${s.name} in ${areaName(p.area)}.`, 160), ogImage: p.images?.after,
        crumbs: [HOME, { name: 'Portfolio', path: '/portfolio/' }, { name: s.navLabel || s.name, path }, { name: p.title, path: ppath }],
        body: html`<article class="case">
          <header class="case__head wrap"><h1 id="page-title">${p.title}</h1>${p.sample ? html`<p class="case__sample">${ui.sampleLabel()} Illustrative project used while RNC's own case studies are prepared.</p>` : ''}<p class="case__lede">${p.summary}</p>
          <dl class="case__meta"><div><dt>Service</dt><dd><a href="/services/${p.service}/">${s.name}</a></dd></div><div><dt>Area</dt><dd><a href="/areas/${p.area}/">${areaName(p.area)}</a></dd></div><div><dt>Client</dt><dd>${p.clientType}</dd></div><div><dt>Duration</dt><dd>${p.duration}</dd></div></dl></header>
          <div class="wrap">${p.images?.before && p.images?.after ? ui.beforeAfter(p.images.before, p.images.after, 'Drag or use the arrow keys to compare before and after.') : picture(p.images?.after, { sample: isStock(p.images?.after) })}</div>
          <div class="case__body wrap"><div class="case__story"><h2>The project</h2>${paras(p.story)}${p.result ? html`<p class="case__result"><strong>Result:</strong> ${p.result}</p>` : ''}</div>
            <aside class="case__scope" aria-labelledby="scope-h"><h2 id="scope-h">Scope</h2><ul>${(p.scope || []).map((/** @type {string} */ x) => html`<li>${x}</li>`)}</ul></aside></div>
          ${t ? html`<figure class="case__quote wrap"><blockquote><p>${t.quote}</p></blockquote><figcaption>${t.attribution} ${t.sample ? ui.sampleLabel() : ''}</figcaption></figure>` : ''}
          ${p.images?.gallery?.length ? html`<section class="gallery wrap" aria-labelledby="gal-h"><h2 id="gal-h">Gallery</h2><div class="gallery__grid">${p.images.gallery.map((/** @type {string} */ g) => picture(g, { sizes: '(min-width: 960px) 33vw, 100vw', sample: isStock(g) }))}</div></section>` : ''}
        </article>
        <section class="featured wrap" aria-labelledby="more-h"><div class="band-head"><h2 id="more-h">More ${String(s.navLabel || s.name).toLowerCase()} work</h2></div>${ui.projectGrid(d, list.filter((x) => x !== p).slice(0, 3))}</section>
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
      <section class="wrap" aria-labelledby="ac-h"><h2 id="ac-h">Area guides</h2><ul class="area-cards">${site.areas.map((a) => d.areas[a] ? html`<li><a href="/areas/${a}/"><h3>${areaName(a)}</h3><p>${clip(d.areas[a].intro?.[0] || '', 140)}</p></a></li>` : '')}</ul></section>
      ${ui.sections(p.sections)}${ui.ctaBand()}`,
    });
  });
  for (const slug of site.areas) {
    const a = d.areas[slug];
    if (!a) continue;
    const path = `/areas/${slug}/`;
    const fp = a.featuredProject ? d.projects[a.featuredProject] : projects.find((p) => p.area === slug);
    add(path, () => layout(env, {
      path, title: a.seo.title, description: a.seo.description, ogImage: a.image,
      crumbs: [HOME, { name: 'Areas', path: '/areas/' }, { name: a.name, path }],
      body: html`${ui.hero({ h1: a.h1, lede: a.intro?.[0], image: a.image || `area-${slug}` })}
      <section class="wrap area-intro"><div class="area-intro__body">${paras((a.intro || []).slice(1))}</div>
        <dl class="area-facts">${a.neighbourhoods?.length ? html`<div><dt>Neighbourhoods</dt><dd>${a.neighbourhoods.join(', ')}</dd></div>` : ''}${a.propertyTypes?.length ? html`<div><dt>Typical properties</dt><dd>${a.propertyTypes.join(', ')}</dd></div>` : ''}</dl></section>
      <section class="wrap area-services" aria-labelledby="as-h"><h2 id="as-h">Services in ${a.name}</h2><ul class="def-cards">${site.services.map((s) => html`<li><h3><a href="/services/${s}/">${svcName(s)}</a></h3><p>${md(a.servicesBlurb?.[s] || d.services[s]?.hero?.lede || '')}</p></li>`)}</ul></section>
      ${a.localNotes?.length ? html`<section class="wrap local-notes" aria-labelledby="ln-h"><h2 id="ln-h">Local notes</h2><ul>${a.localNotes.map((/** @type {any} */ n) => html`<li><p>${md(n.text)}</p><p class="local-notes__src">${n.sourceUrl ? html`Source: <a href="${n.sourceUrl}" rel="noopener">${hostOf(n.sourceUrl)}</a>` : ''}${n.verify ? ' Rules change, so check the source for the current version.' : ''}</p></li>`)}</ul></section>` : ''}
      ${fp ? html`<section class="featured wrap" aria-labelledby="fp-h"><div class="band-head"><h2 id="fp-h">Featured project</h2></div>${ui.projectGrid(d, [fp])}</section>` : ''}
      ${areaMap(d, { current: slug, heading: 'Nearby areas' })}
      ${ui.ctaBand({ heading: `Free quotes in ${a.name}` })}`,
    }));
  }

  /* ---------- Resources ---------- */
  add('/resources/', () => {
    const p = pg('resources');
    return layout(env, {
      path: '/resources/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Resources', path: '/resources/' }],
      body: html`${ui.pageHead(p)}<section class="wrap" aria-labelledby="rl-h"><h2 id="rl-h" class="vh">Articles</h2>${resourceList(resources)}</section>${ui.sections(p.sections)}${ui.ctaBand()}`,
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
        <header class="article__head wrap"><h1 id="page-title">${r.title}</h1><p class="article__lede">${r.summary}</p><p class="article__date">Published <time datetime="${r.date}">${fmtDate(r.date)}</time></p></header>
        <div class="wrap article__media">${picture(r.image, { eager: true, sizes: '(min-width: 1240px) 1240px, 100vw' })}</div>
        <div class="article__body prose">${(r.body || []).map((/** @type {any} */ b) => b.h2 ? html`<h2>${b.h2}</h2>` : b.list ? html`<ul>${b.list.map((/** @type {string} */ i) => html`<li>${md(i)}</li>`)}</ul>` : b.p ? html`<p>${md(b.p)}</p>` : '')}
        ${r.sources?.length ? html`<h2>Sources</h2><ul class="sources">${r.sources.map((/** @type {any} */ s) => html`<li><a href="${s.url}" rel="noopener">${s.label}</a></li>`)}</ul>` : ''}</div>
      </article>${ui.ctaBand()}`,
    }));
  }

  /* ---------- Static pages ---------- */
  add('/commercial/', () => {
    const p = pg('commercial');
    const cap = env.hasCapability
      ? html`<a class="btn btn--ghost" href="${site.capabilityStatement}" download data-track="capability_statement_downloaded">Download capability statement (PDF)</a>`
      : (env.production ? '' : html`<p class="note">Capability statement PDF: to be supplied by RNC before launch.</p>`);
    return layout(env, {
      path: '/commercial/', title: p.seo.title, description: p.seo.description, ogImage: 'commercial-hero', crumbs: [HOME, { name: 'Commercial', path: '/commercial/' }],
      body: html`${ui.hero({ h1: p.h1, lede: p.lede, image: 'commercial-hero', kicker: '' })}
      <div class="wrap cap-row">${cap}</div>
      ${ui.sections(p.sections)}${ui.trustStrip()}${ui.serviceCards(d, { heading: 'Service lines for managed sites' })}
      ${ui.ctaBand({ heading: 'Request a site walk or a quote', body: 'Send the scope, site list or tender documents and we will follow up with questions and next steps.' })}`,
    });
  });
  add('/about/', () => {
    const p = pg('about');
    return layout(env, {
      path: '/about/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'About', path: '/about/' }],
      body: html`${ui.hero({ h1: p.h1, lede: p.lede, image: 'about-crew', ctas: false })}
      <section class="owner wrap" aria-labelledby="own-h"><div class="owner__media">${picture('about-owner', { sizes: '(min-width: 960px) 30vw, 100vw' })}</div>
        <div class="owner__text"><h2 id="own-h">[OWNER NAME]</h2><p>[OWNER BIO]</p><dl class="area-facts"><div><dt>Crew</dt><dd>[CREW SIZE]</dd></div><div><dt>Certifications</dt><dd>[CERTIFICATIONS]</dd></div></dl></div></section>
      ${ui.sections(p.sections)}${ui.trustStrip()}${ui.ctaBand()}`,
    });
  });
  add('/reviews/', () => {
    const p = pg('reviews');
    return layout(env, {
      path: '/reviews/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Reviews', path: '/reviews/' }],
      body: html`${ui.pageHead(p)}${testimonials.some((t) => t.sample) ? html`<p class="wrap note">Quotes labelled Sample are illustrative and will be replaced with reviews from RNC clients, shared with their permission.</p>` : ''}
      ${ui.testimonials(d, testimonials, { heading: 'Client feedback' })}${ui.sections(p.sections)}${ui.ctaBand()}`,
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
      body: html`<div class="quote-page wrap"><div class="quote__main">${ui.pageHead(p)}${quoteForm(d, p)}</div>
        <aside class="quote__aside" aria-labelledby="qa-h">${picture('quote-aside', { sizes: '(min-width: 960px) 30vw, 100vw' })}<h2 id="qa-h">${p.aside?.heading || 'What happens next'}</h2>
          <ol class="next-steps">${(p.aside?.items || ['We review your request and photos.', 'We contact you to ask questions and book a site visit if needed.', 'You receive a written quote. No obligation.']).map((/** @type {string} */ i) => html`<li>${i}</li>`)}</ol>
          ${p.sections?.length ? ui.sections(p.sections, { level: 3 }) : html`<p>Prefer to talk? <a href="${telHref()}" data-track="call_clicked" data-track-location="quote_aside">Call [PHONE]</a></p>`}</aside></div>`,
    });
  });
  add('/quote/thanks/', () => layout(env, {
    path: '/quote/thanks/', title: `Thank you | ${site.name}`, description: 'Your request has been received. We will be in touch to arrange next steps.', noindex: true,
    crumbs: [HOME, { name: 'Free quote', path: '/quote/' }, { name: 'Thank you', path: '/quote/thanks/' }],
    body: html`${ui.pageHead({ h1: 'Thanks, your request is in', lede: 'We have received your details and will be in touch to talk through next steps. If it is urgent, call [PHONE].' })}
    <div class="wrap thanks"><a class="btn btn--ghost" href="/portfolio/">Browse the portfolio</a> <a class="btn btn--ghost" href="/resources/">Read seasonal guides</a></div>`,
  }));
  add('/contact/', () => {
    const p = pg('contact');
    return layout(env, {
      path: '/contact/', title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: 'Contact', path: '/contact/' }],
      body: html`${ui.pageHead(p)}<div class="wrap contact"><div class="contact__info"><h2>Reach us</h2><dl class="def-list">
        <div><dt>Phone</dt><dd><a href="${telHref()}" data-track="call_clicked" data-track-location="contact_page">[PHONE]</a></dd></div>
        <div><dt>Email</dt><dd><a href="mailto:${tok('EMAIL')}" data-track="email_clicked" data-track-location="contact_page">[EMAIL]</a></dd></div>
        <div><dt>Hours</dt><dd>[HOURS]</dd></div><div><dt>Address</dt><dd>[ADDRESS]</dd></div></dl>
        <p>For pricing, the <a href="/quote/">free quote form</a> is quickest.</p></div>
        <div class="contact__form"><h2>Send a message</h2>${contactForm()}</div></div>${ui.sections(p.sections)}`,
    });
  });
  for (const k of ['privacy', 'terms', 'accessibility']) {
    add(`/${k}/`, () => {
      const p = pg(k);
      return layout(env, { path: `/${k}/`, title: p.seo.title, description: p.seo.description, crumbs: [HOME, { name: p.h1, path: `/${k}/` }],
        body: html`${ui.pageHead(p)}<div class="legal">${ui.sections(p.sections)}</div>` });
    });
  }
  add('/404.html', () => {
    const p = pg('404');
    return layout(env, { path: '/404.html', title: p.seo.title, description: p.seo.description, noindex: true,
      body: html`${ui.pageHead(p)}${ui.sections(p.sections)}<div class="wrap thanks"><a class="btn btn--accent" href="/">Go to the home page</a> <a class="btn btn--ghost" href="/services/">Services</a> <a class="btn btn--ghost" href="/contact/">Contact</a></div>` });
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
