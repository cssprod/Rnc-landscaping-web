// @ts-check
/**
 * /styleguide/: the component showcase. Showcase builds only (showcaseOnly, noindex, never in the sitemap, never built
 * with SITE_MODE=launch). Renders every primitive in site/COMPONENTS.md from real content (samples stay labelled), so
 * W2 primitive acceptance (C4.1 reflow, C4.4a targets, P1 #8 reviews / credentials / guarantee) is checked here.
 * Copy on this page describes the components; business facts come from content and site.json only.
 */
import { html, raw } from '../lib/html.mjs';
import { layout } from '../components/layout.mjs';
import * as ui from '../components/ui/index.mjs';
import { siteJson } from '../../site.config.mjs';
import { route, tpl, HOME, SHARED_SOURCES } from './_shared.mjs';

export const STYLEGUIDE_PATH = '/styleguide/';

/** Strip inline Markdown links (a card that is one link must not hold another). @param {string} s */
const unlink = (s = '') => s.replace(/\s*\[[^\]]+\]\([^)]+\)\.?/g, '').trim();
/** The function name a specimen shows. @param {string} name */
const label = (name) => html`<p class="sg-label"><code>${name}</code></p>`;

/** @param {import('./_shared.mjs').Env} env @returns {import('./_shared.mjs').Route[]} */
export function routes(env) {
  return [route(STYLEGUIDE_PATH, { sources: [tpl('styleguide'), 'site/COMPONENTS.md', ...SHARED_SOURCES], sitemap: false, noindex: true, showcaseOnly: true }, () => layout(env, {
    path: STYLEGUIDE_PATH, title: 'Component showcase | RNC Landscaping', description: 'The RNC Landscaping component showcase: every interface primitive in one place, for design review only.', noindex: true,
    crumbs: [HOME, { name: 'Styleguide', path: STYLEGUIDE_PATH }],
    bodyClass: 'styleguide',
    body: body(env.data),
  }))];
}

/** @param {any} d build data (content collections) */
function body(d) {
  const home = d.pages?.home || {};
  const process = d.pages?.process || {};
  const quote = d.pages?.quote || {};
  const sec = (/** @type {string} */ id) => (home.sections || []).find((/** @type {any} */ s) => s.id === id);
  const svcSlugs = siteJson.services.map((s) => s.slug);
  const gm = d.services?.['grounds-maintenance'] || {};
  const area = d.areas?.['oak-bay'] || {};
  const projects = Object.values(d.projects || {});
  const proj = d.projects?.['oak-bay-front-garden-renewal'] || projects[0] || {};
  const testimonials = Object.values(d.testimonials || {});
  const regional = (d.regional?.blocks || []).filter((/** @type {any} */ b) => (area.sharedRegional || []).includes(b.id));
  const svcItems = sec('services')?.items || [];
  /* Specimen fallback (labelled on the page) until quote.json carries `reassurance`; each line repeats existing site copy. */
  const reassurance = quote.reassurance?.length ? quote.reassurance
    : ['Free, no obligation', `We reply within ${siteJson.replyTime}`, 'No prices shown here: every quote is site-specific'];

  /** @type {import('../components/ui/cards.mjs').BentoItem[]} */
  const bentoItems = [
    ...svcSlugs.map((slug, n) => ({
      title: d.services?.[slug]?.navLabel || siteJson.services[n].navLabel || slug,
      body: unlink(svcItems[n]?.body || ''),
      // Art wells on the feature and tall cards only; the others show the icon well (both variants once, and the page
      // stays nearer the v2 inline-SVG budget: every scene is inline SVG).
      href: `/services/${slug}/`, ...(n < 2 ? { scene: `svc-${slug}` } : { icon: ui.serviceIcon(slug) }),
      span: /** @type {any} */ (n === 0 ? 'feature' : n === 1 ? 'tall' : undefined),
    })),
    { title: 'Not sure which?', body: 'Tell us about the property in a free quote request and we will work out what it needs.', href: '/free-quote/', icon: 'chat' },
    { title: sec('areas')?.heading || 'Where we work', body: unlink(sec('areas')?.body?.[0] || ''), span: 'wide', tone: 'glass',
      extra: ui.chips(siteJson.municipalities.map((m) => /** @type {[string, string]} */ ([`/areas/${m.slug}/`, m.name]))) },
    { title: sec('why')?.heading || 'What to expect from us', span: 'full', tone: 'solid',
      extra: html`<ul class="sg-points">${(sec('why')?.items || []).map((/** @type {any} */ i) => html`<li><strong>${i.title}</strong> ${i.body}</li>`)}</ul>` },
  ];

  const toc = [
    { id: 'sg-actions-h', label: 'Actions' }, { id: 'sg-heads-h', label: 'Heads and contents' }, { id: 'sg-bento-h', label: 'Bento' },
    { id: 'sg-tiles-h', label: 'Service tiles' }, { id: 'sg-projects-h', label: 'Projects' }, { id: 'sg-reviews-h', label: 'Reviews' },
    { id: 'sg-trust-h', label: 'Credentials and guarantee' }, { id: 'sg-steps-h', label: 'Steps and seasons' },
    { id: 'sg-rules-h', label: 'Local rules' }, { id: 'sg-faq-h', label: 'FAQ' }, { id: 'sg-contact-h', label: 'Contact' }, { id: 'sg-cta-h', label: 'Call to action' },
  ];

  return html`${ui.hero({
    h1: raw('Component <em class="accent">showcase</em>'),
    lede: 'Every primitive in site/COMPONENTS.md, rendered from real content. Samples stay labelled and unconfirmed details stay as placeholders.',
    proof: 'Design review only: this page is never indexed and never built for launch.',
    scene: 'home', layout: 'split', variant: 'page',
  })}

<div class="wrap sg-intro">
  ${ui.inPageToc(toc)}
  <p class="sg-note">Use the header's Dark theme and Animations toggles to see each specimen in the dawn theme and with motion off. Every card and tile reflows with container queries down to 320 px.</p>
</div>

<section class="section sg-section" aria-labelledby="sg-actions-h"><div class="wrap">
  ${ui.sectionHead({ id: 'sg-actions-h', title: 'Actions', index: '01', eyebrow: 'Buttons and links', lede: 'Calls to action, tracked contact links, pill links and the labels that mark samples and placeholders.' })}
  <div class="sg-grid">
    <div class="sg-specimen">${label('quoteBtn() · callBtn() · secondaryBtn()')}<div class="l-cluster">${ui.quoteBtn()}${ui.callBtn('hero')}${ui.secondaryBtn('hero')}</div></div>
    <div class="sg-specimen">${label('btn sizes')}<div class="l-cluster">${ui.quoteBtn({ size: 'lg' })}${ui.quoteBtn({ size: 'sm' })}${ui.callBtn('hero', { tone: 'primary', size: 'sm' })}</div></div>
    <div class="sg-specimen">${label('contactLinks()')}${ui.contactLinks('contact_page')}</div>
    <div class="sg-specimen">${label('linkMore() · chips()')}${ui.linkMore('/projects/', 'See our work')}${ui.chips(svcSlugs.map((s, n) => /** @type {[string, string]} */ ([`/services/${s}/`, siteJson.services[n].navLabel || s])))}</div>
    <div class="sg-specimen">${label('sampleLabel()')}<div class="l-cluster">${ui.sampleLabel()}${ui.sampleLabel('project')}${ui.sampleLabel('review')}</div></div>
    <div class="sg-specimen">${label('reassuranceStrip()')}${quote.reassurance?.length ? '' : html`<p class="sg-label">Specimen text (content/pages/quote.json has no <code>reassurance</code> yet)</p>`}${ui.reassuranceStrip(reassurance)}</div>
  </div>
</div></section>

<section class="section sg-section" aria-labelledby="sg-heads-h"><div class="wrap">
  ${ui.sectionHead({ id: 'sg-heads-h', title: 'Heads and contents', index: '02', eyebrow: 'Structure', lede: 'Numbered section heads, the in-page table of contents and the spec strip. hero() opens this page; pageHead() opens every inner page.' })}
  <div class="sg-grid">
    <div class="sg-specimen">${label('sectionHead({ eyebrow })')}${ui.sectionHead({ id: 'sg-sh-demo', title: 'A section without a number', eyebrow: 'Eyebrow only', level: 3 })}</div>
    <div class="sg-specimen">${label('inPageToc()')}${ui.inPageToc([{ id: 'sg-actions-h', label: 'Actions' }, { id: 'sg-bento-h', label: 'Bento' }, { id: 'sg-faq-h', label: 'FAQ' }], { label: 'Jump to' })}</div>
    <div class="sg-specimen sg-specimen--wide">${label('specStrip()')}${ui.specStrip([
      { label: 'Service', value: d.services?.[proj.service]?.navLabel || proj.service, href: `/services/${proj.service}/` },
      { label: 'Municipality', value: d.areas?.[proj.area]?.name || proj.area, href: `/areas/${proj.area}/` },
      { label: 'Client', value: proj.clientType }, { label: 'Season', value: proj.season }, { label: 'Duration', value: proj.duration },
    ], { id: 'sg-spec' })}</div>
  </div>
</div></section>

${ui.bento(bentoItems, { id: 'sg-bento-h', heading: 'Bento', index: '03', eyebrow: 'bento() · bentoCard()', lede: 'The feature layout: lit-solid cards with art wells, a whole-card link, the edge glow and the cursor spotlight hook.', layout: 'feature' })}
${ui.featureBento({ id: 'sg-fb-h', heading: sec('why')?.heading || 'What to expect from us', lede: 'featureBento(): the existing icon bento, now with data-spotlight instead of tilt.', items: sec('why')?.items || [], icons: ['compass', 'doc', 'chat'] })}

${ui.serviceTiles(d, { id: 'sg-tiles-h', heading: 'Service tiles', lede: 'serviceTiles(): one link per tile; 1, 2 or 4 columns by container width.' })}

<section class="section sg-section" aria-labelledby="sg-projects-h"><div class="wrap">
  ${ui.sectionHead({ id: 'sg-projects-h', title: 'Projects', index: '04', eyebrow: 'projectGrid() · plantPalette() · beforeAfter()', lede: 'Sample projects carry the Sample project chip next to what they label. No budgets, ever.' })}
  ${ui.projectGrid(d, projects.slice(0, 2), { headingLevel: 3 })}
  <div class="sg-grid sg-grid--top">
    <div class="sg-specimen sg-specimen--flush">${ui.plantPalette(proj.plantPalette || [], { sample: !!proj.sample, headingLevel: 3, id: 'sg-plants-h' })}</div>
    <div class="sg-specimen sg-specimen--flush">${label('beforeAfter()')}${proj.images?.before && proj.images?.after ? ui.beforeAfter(proj.images.before, proj.images.after, 'Sample: before and after placeholders', { id: 'sg-ba' }) : ''}</div>
  </div>
</div></section>

${ui.reviewsBand(d, testimonials, { id: 'sg-reviews-h', heading: 'Reviews', index: '05', eyebrow: 'reviewsBand() · reviewCard()', lede: 'Quotations in Newsreader italic, attributed by role and municipality. No stars, ratings or review markup.' })}

<section class="section sg-section" aria-labelledby="sg-trust-h"><div class="wrap">
  ${ui.sectionHead({ id: 'sg-trust-h', title: 'Credentials and guarantee', index: '06', eyebrow: 'credentialsRow() · guarantee()', lede: 'Verifiable items only: each value stays a placeholder until RNC supplies it.' })}
  ${ui.credentialsRow({ id: 'sg-credentials' })}
  <div class="sg-stack">${ui.guarantee({ id: 'sg-guarantee-h', heading: process.guarantee?.heading, body: process.guarantee?.body, level: 3 })}</div>
</div></section>
${ui.trustBand()}

<section class="section sg-section" aria-labelledby="sg-steps-h"><div class="wrap">
  ${ui.sectionHead({ id: 'sg-steps-h', title: 'Steps and seasons', index: '07', eyebrow: 'timeline() · perVisitTable() · seasons()', lede: 'The four-step overview runs horizontally from 64em; a track runs vertically with what you receive at each step.' })}
  ${ui.timeline(process.overview || [], { id: 'sg-overview' })}
  <div class="sg-grid sg-grid--top">
    <div class="sg-specimen sg-specimen--flush">${label('timeline({ orientation: "vertical" })')}${ui.timeline(process.tracks?.[0]?.steps || [], { id: 'sg-track', orientation: 'vertical' })}</div>
    <div class="sg-specimen sg-specimen--flush">${label('perVisitTable()')}${ui.perVisitTable(gm.perVisit, { id: 'sg-visit' })}</div>
  </div>
  ${label('seasons()')}${ui.seasons(gm.seasonal || [])}
</div></section>

<section class="section sg-section" aria-labelledby="sg-rules-h"><div class="wrap">
  ${ui.sectionHead({ id: 'sg-rules-h', title: 'Local rules', index: '08', eyebrow: 'localRulesCallout() · conditionsList() · sharedRegional()', lede: `Sourced summaries from the ${area.name || 'area'} page: source chip, verbatim excerpt, review date and a visible note to check the source.` })}
  <div class="sg-stack">
    ${ui.localRulesCallout((area.localRules || []).slice(0, 2), { id: 'sg-local-h', area: area.name, level: 3 })}
    ${ui.conditionsList(area.conditions || [], { id: 'sg-conditions-h', level: 3 })}
    ${ui.sharedRegional(regional.slice(0, 2), { id: 'sg-regional-h', level: 3 })}
    <div class="sg-specimen">${label('sourceChip() · reviewedOn()')}<div class="l-cluster">${ui.sourceChip('https://www.crd.ca/environment/water-conservation/watering-schedule')}${ui.reviewedOn(area.localRules?.[0]?.reviewedOn || null)}${ui.reviewedOn(null)}</div></div>
  </div>
</div></section>

${ui.faqList((gm.faqs || []).slice(0, 4), { id: 'sg-faq-h', heading: 'FAQ', lede: 'faqList(): native details elements; the chevron turns instantly when motion is off.' })}

<section class="section sg-section" aria-labelledby="sg-contact-h"><div class="wrap">
  ${ui.sectionHead({ id: 'sg-contact-h', title: 'Contact', index: '09', eyebrow: 'contactFallback() · contactCards()', lede: 'Contact links never put an unresolved token in an href: until RNC supplies them they read as text with a placeholder.' })}
  <div class="sg-stack">
    ${ui.contactFallback({ id: 'sg-fallback-h', level: 3 })}
    <div class="sg-specimen sg-specimen--flush">${label('contactCards()')}${ui.contactCards()}</div>
  </div>
</div></section>

${ui.ctaBand({ id: 'sg-cta-h', heading: sec('cta')?.heading, body: 'ctaBand({ living, reply }): a window into the night in both themes, with three drifting glows and one comet ring that run only while animations are on.', living: true, reply: true })}`;
}
