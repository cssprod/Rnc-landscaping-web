// @ts-check
/**
 * ds-comp (W2): markup and CSS rules for the ui/* primitives (site/COMPONENTS.md, CONTRACT §10, §12, §13).
 *   #container-queries  C4.1: one DOM per component; every card/tile root is an inline-size container (or sits in one),
 *                       grids reflow with @container at the 40em / 64em / 80em content breakpoints, never viewport media
 *                       queries, and every grid primitive renders its grid inside a container wrapper.
 *   #heading-levels     no primitive emits an <h1> except hero()/pageHead() (exactly one h1#page-title, never data-reveal);
 *                       levels follow the caller and are clamped to h2–h6.
 *   #track-names        call/sms/email links use the CONTRACT §13 v3 names; a link never carries an unresolved token.
 *   #call-button        callBtn(): tel: link once [PHONE] is known; a non-link placeholder in showcase; nothing in launch.
 *   #no-tilt            data-tilt is gone (tilt is banned); bento cards carry data-spotlight.
 *   #honesty            reviews never emit Review / AggregateRating markup; the Google link has no href while unset;
 *                       samples carry the Sample label; review dates fall back to "Review date to confirm".
 *   #legacy-slices      the ds-comp legacy slices are deleted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadAll } from '../../src/lib/data.mjs';
import { initImages } from '../../src/lib/images.mjs';
import { has } from '../../src/lib/tokens.mjs';
import * as ui from '../../src/components/ui/index.mjs';

const SITE = fileURLToPath(new URL('../../', import.meta.url));
const STYLES = join(SITE, 'src/styles');
const UI = join(SITE, 'src/components/ui');
const data = loadAll();
initImages(data.images, { offline: true });
const S = (/** @type {any} */ v) => String(v ?? '');
const css = (/** @type {string} */ f) => readFileSync(join(STYLES, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const UI_CSS = readdirSync(STYLES).filter((f) => /^4\d-ui-.*\.css$/.test(f));
const projects = Object.values(data.projects);
const testimonials = Object.values(data.testimonials);
const area = data.areas['oak-bay'] || Object.values(data.areas)[0];
const gm = data.services['grounds-maintenance'] || Object.values(data.services)[0];

/** Every primitive rendered once with representative content. */
function specimens() {
  return {
    quoteBtn: ui.quoteBtn(), secondaryBtn: ui.secondaryBtn('hero'), callBtn: ui.callBtn('hero'), contactLinks: ui.contactLinks('footer'),
    linkMore: ui.linkMore('/projects/', 'See our work'), chips: ui.chips([['/areas/', 'Areas']]), sampleLabel: ui.sampleLabel('review'),
    sectionHead: ui.sectionHead({ id: 'a-h', title: 'A', index: '01', eyebrow: 'Label' }), sections: ui.sections([{ id: 's', heading: 'S', body: ['p'], items: [{ title: 't', body: 'b' }] }]),
    inPageToc: ui.inPageToc([{ id: 'x', label: 'X' }]),
    featureBento: ui.featureBento({ id: 'fb-h', heading: 'F', items: [{ title: 'a' }, { title: 'b' }, { title: 'c' }] }),
    serviceTiles: ui.serviceTiles(data), bento: ui.bento([{ title: 'One', href: '/services/', scene: 'svc-irrigation' }, { title: 'Two', icon: 'leaf' }], { id: 'b-h', heading: 'B', layout: 'feature' }),
    bentoCard: ui.bentoCard({ title: 'Card', body: 'x', href: '/x/' }),
    projectCard: html1(ui.projectCard(data, projects[0])), projectGrid: ui.projectGrid(data, projects.slice(0, 3)),
    specStrip: ui.specStrip([{ label: 'Service', value: 'Irrigation' }, { label: 'Empty', value: '' }]),
    plantPalette: ui.plantPalette([{ common: 'Sword fern', botanical: 'Polystichum munitum' }], { sample: true }),
    beforeAfter: ui.beforeAfter('a', 'b', 'Label', { id: 'ba-1' }),
    testimonials: ui.testimonials(data, testimonials.slice(0, 2)), trustBand: ui.trustBand(), reviewCard: ui.reviewCard(testimonials[0]),
    reviewsBand: ui.reviewsBand(data, testimonials, { id: 'r-h' }), credentialsRow: ui.credentialsRow(),
    faqList: ui.faqList([{ q: 'Q?', a: 'A.' }]), ctaBand: ui.ctaBand({ living: true, reply: true }), contactCards: ui.contactCards(),
    contactFallback: ui.contactFallback(), seasons: ui.seasons(gm.seasonal || [{ season: 'Spring', items: ['x'] }]),
    timeline: ui.timeline([{ title: 'One', body: 'b', deliverable: 'd' }, { title: 'Two' }], { id: 't-h', heading: 'Steps' }),
    perVisitTable: ui.perVisitTable(gm.perVisit || { caption: 'c', rows: [{ task: 't', detail: 'd' }] }),
    localRulesCallout: ui.localRulesCallout(area.localRules || [], { id: 'lr-h', area: area.name }),
    sharedRegional: ui.sharedRegional(data.regional.blocks.slice(0, 2), { id: 'rg-h' }), conditionsList: ui.conditionsList(area.conditions || [], { id: 'c-h' }),
    sourceChip: ui.sourceChip('https://www.crd.ca/'), reviewedOn: ui.reviewedOn(null), guarantee: ui.guarantee(), reassuranceStrip: ui.reassuranceStrip(['Free, no obligation']),
  };
}
/** Wrap a lone <li> so it parses like the page would. @param {any} s */
function html1(s) { return `<ul>${S(s)}</ul>`; }

/* ---------------------------------------------------------------- #container-queries */
test('every card and tile reflows with container queries at the content breakpoints, one DOM per width #container-queries', () => {
  const all = UI_CSS.map((f) => [f, css(f)]);
  for (const [f, text] of all) {
    // Reflow is container-based: no viewport width media queries in component CSS.
    assert.doesNotMatch(text, /@media[^{]*\b(min|max)-width/, `${f}: viewport width @media in component CSS (use @container)`);
    for (const m of text.matchAll(/@container\s*([a-z-]+\s*)?\(([^)]*)\)/g)) {
      assert.match(m[2], /^(min-width:\s*(40|64|80)em|max-width:\s*(39\.99|63\.99|79\.99)em)$/, `${f}: @container (${m[2]}) is not a 40/64/80em content breakpoint`);
    }
  }
  const joined = all.map(([, t]) => t).join('\n');
  // Every card / tile root (and every grid wrapper) is an inline-size container.
  for (const sel of ['.bento__card', '.tile', '.card', '.quote', '.review', '.plant-palette', '.contact-fallback', '.guarantee', '.ba', '.spec-strip',
    '.hero', '.page-head', '.prose-section', '.item-cards', '.faq', '.cta-band', '.credentials', '.local-rules, .conditions, .regional']) {
    const rule = new RegExp(`(^|[}\\s])${sel.replace(/[.]/g, '\\.').replace(/, /g, ',\\s*')}\\s*\\{[^}]*container-type:\\s*inline-size`, 'm');
    assert.match(joined, rule, `${sel} must set container-type: inline-size`);
  }
  assert.match(css('05-layout.css'), /\.l-cq\s*\{\s*container-type:\s*inline-size/);
  // Grid primitives render their grid inside a container wrapper (.l-cq) so @container has something to measure.
  const sp = specimens();
  for (const [name, grid] of /** @type {[string, RegExp][]} */ ([['bento', /<ul class="bento /], ['featureBento', /<ul class="bento /], ['serviceTiles', /<ul class="tiles"/],
    ['testimonials', /<ul class="quotes"/], ['reviewsBand', /<ul class="reviews"/], ['trustBand', /<dl class="trust__grid"/], ['seasons', /<div class="seasons"/],
    ['timeline', /<ol class="timeline /], ['projectGrid', /<ul class="card-grid"/], ['perVisitTable', /<table class="visit-table"/]])) {
    const s = S(/** @type {any} */ (sp)[name]);
    const at = s.search(grid);
    assert.ok(at > 0, `${name} renders its grid`);
    assert.match(s.slice(Math.max(0, at - 80), at), /class="[^"]*\bl-cq\b[^"]*">\s*$/, `${name}: grid is not inside an .l-cq container`);
  }
  // One DOM for every width: no mobile/desktop copies.
  for (const [name, s] of Object.entries(sp)) assert.doesNotMatch(S(s), /class="[^"]*(--mobile|--desktop|only-mobile|only-desktop|hide-(sm|md|lg))/, `${name} ships width-specific copies`);
});

/* ---------------------------------------------------------------- #heading-levels */
test('only hero()/pageHead() emit an H1, and heading levels follow the caller #heading-levels', () => {
  for (const [name, s] of Object.entries(specimens())) assert.doesNotMatch(S(s), /<h1[\s>]/, `${name} emits an <h1>`);
  for (const h of [ui.hero({ h1: 'Title', image: 'home-hero' }), ui.hero({ h1: 'Title', scene: 'home', layout: 'split', proof: 'p' }), ui.pageHead({ h1: 'Title' })]) {
    const h1s = S(h).match(/<h1[^>]*>/g) || [];
    assert.equal(h1s.length, 1, 'exactly one h1');
    assert.match(h1s[0], /id="page-title"/);
    assert.doesNotMatch(h1s[0], /data-reveal/, 'the H1 (LCP) never gets data-reveal');
  }
  assert.match(S(ui.sectionHead({ id: 'x', title: 'X', level: 3 })), /<h3 id="x">/);
  assert.match(S(ui.sectionHead({ id: 'x', title: 'X', level: 1 })), /<h2 id="x">/, 'a level below 2 is clamped to h2');
  assert.match(S(ui.faqList([{ q: 'q', a: 'a' }], { level: 3 })), /<h3 id="faq-h">/);
  assert.match(S(ui.plantPalette([{ common: 'a' }], { headingLevel: 4 })), /<h4 /);
  assert.match(S(ui.bento([{ title: 'a' }], { id: 'b', heading: 'B', level: 3 })), /<h4 class="bento__title">/, 'cards sit one level below the band');
  assert.doesNotMatch(S(ui.reviewCard(testimonials[0])), /<h\d/, 'reviewCard emits no heading unless asked');
  assert.match(S(ui.reviewCard(testimonials[0], { headingLevel: 3 })), /<h3 class="vh">/);
  assert.match(S(ui.timeline([{ title: 'a' }], { id: 't' })), /<h3 class="timeline__title">/);
  assert.match(S(ui.localRulesCallout(area.localRules || [{ text: 'x' }], { id: 'r', level: 3 })), /<h3 id="r"/);
});

/* ---------------------------------------------------------------- #track-names */
test('contact links use the CONTRACT §13 event names and never put an unresolved token in an href #track-names', () => {
  const src = readdirSync(UI).map((f) => readFileSync(join(UI, f), 'utf8')).join('\n');
  assert.doesNotMatch(src, /call_clicked|email_clicked|quote_submitted|quote_step_completed/, 'v2 event names are retired in W2');
  for (const [name, s] of Object.entries(specimens())) {
    assert.doesNotMatch(S(s), /href="[^"]*\[[A-Z ]+\][^"]*"/, `${name}: a token-dependent URL in an href`);
    for (const m of S(s).matchAll(/data-track="([^"]+)"/g)) assert.ok(['call_click', 'sms_click', 'email_click', 'capability_statement_downloaded'].includes(m[1]), `${name}: data-track="${m[1]}"`);
  }
  if (!has('PHONE')) assert.doesNotMatch(S(ui.contactLinks('footer')), /<a /, 'no contact link while the tokens are unresolved');
});

/* ---------------------------------------------------------------- #call-button */
test('callBtn(): tel: link once PHONE is known, a non-link placeholder in showcase, nothing in launch #call-button', () => {
  const prev = process.env.SITE_MODE;
  try {
    delete process.env.SITE_MODE;
    const show = S(ui.callBtn('sticky_bar'));
    if (has('PHONE')) {
      assert.match(show, /^<a class="btn btn--call[^"]*" href="tel:\+?\d[^"]*" data-track="call_click" data-track-location="sticky_bar">/);
    } else {
      assert.match(show, /^<span class="btn btn--call [^"]*btn--pending">/);
      assert.match(show, /Call \[PHONE\]/);
      assert.doesNotMatch(show, /<a[\s>]|href="tel:/);
      process.env.SITE_MODE = 'launch';
      assert.equal(S(ui.callBtn('sticky_bar')), '', 'launch builds render nothing until PHONE is known');
      assert.equal(S(ui.contactLinks('footer')), '', 'launch builds omit unresolved contact links');
      assert.doesNotMatch(S(ui.reviewsBand(data, testimonials, { id: 'r' })), /Read all reviews on Google/, 'launch omits the Google link while unset');
    }
  } finally {
    if (prev === undefined) delete process.env.SITE_MODE; else process.env.SITE_MODE = prev;
  }
});

/* ---------------------------------------------------------------- #no-tilt */
test('tilt is gone: bento cards carry data-spotlight inside a data-spot-grid #no-tilt', () => {
  const src = readdirSync(UI).map((f) => readFileSync(join(UI, f), 'utf8')).join('\n') + UI_CSS.map(css).join('\n');
  assert.doesNotMatch(src, /data-tilt|\btilt\(/);
  const fb = S(ui.featureBento({ id: 'f', heading: 'F', items: [{ title: 'a' }] }));
  assert.match(fb, /data-spot-grid/);
  assert.match(fb, /<li class="bento__card[^"]*" data-spotlight>/);
  assert.match(S(ui.bentoCard({ title: 'a' })), /data-spotlight/);
});

/* ---------------------------------------------------------------- #honesty */
test('reviews, credentials, samples and review dates stay honest #honesty', () => {
  const all = Object.values(specimens()).map(S).join('\n');
  assert.doesNotMatch(all, /itemprop|itemtype|"@type"\s*:\s*"(Review|AggregateRating)"|★|rating/i, 'no review schema, stars or ratings');
  const band = S(ui.reviewsBand(data, testimonials, { id: 'r' }));
  assert.ok((band.match(/<figure class="review">/g) || []).length <= 3, 'at most three reviews in the band');
  if (!has('GOOGLE PROFILE')) assert.match(band, /<p class="reviews-band__google[^"]*">Read all reviews on Google \[GOOGLE PROFILE\]<\/p>/);
  for (const t of testimonials.filter((x) => x.sample)) assert.match(S(ui.reviewCard(t)), /<span class="sample-label">Sample review<\/span>/);
  assert.match(S(ui.plantPalette([{ common: 'a' }], { sample: true })), /<span class="sample-label">Sample<\/span> plant palette/);
  assert.match(S(ui.reviewedOn(null)), /Review date to confirm/);
  assert.match(S(ui.reviewedOn('2026-11-21')), /Last reviewed <time datetime="2026-11-21">21 November 2026<\/time>/);
  const rules = S(ui.localRulesCallout(area.localRules || [], { id: 'r' }));
  for (const r of area.localRules || []) {
    assert.ok(rules.includes(`href="${r.sourceUrl}"`), `rule ${r.id} links its source`);
    if (r.verify) assert.match(rules, /Rules change: check the source/);
  }
  assert.doesNotMatch(all, /no bylaw exists/i);
  assert.match(S(ui.sharedRegional(data.regional.blocks.slice(0, 1), { id: 'g' })), /<aside class="regional" data-shared="regional" aria-labelledby="g">/);
  assert.doesNotMatch(S(ui.specStrip([{ label: 'Budget', value: '' }])), /Budget/, 'empty values are dropped');
  for (const c of S(ui.credentialsRow()).matchAll(/<dd>([^<]*)/g)) assert.match(c[1], /^\[[A-Z ]+\]|\S/, 'credential values are token values');
});

/* ---------------------------------------------------------------- #legacy-slices */
test('the ds-comp legacy slices are deleted and the component CSS is layered #legacy-slices', () => {
  for (const n of ['02', '05', '08', '10', '12', '14', '23']) assert.ok(!existsSync(join(STYLES, `50-legacy-${n}-ds-comp.css`)), `50-legacy-${n}-ds-comp.css still exists`);
  for (const f of UI_CSS) assert.match(readFileSync(join(STYLES, f), 'utf8'), /\n@layer components \{\n[\s\S]*\n\}\n$/, `${f} wraps its rules in @layer components`);
  assert.match(readFileSync(join(STYLES, '80-styleguide.css'), 'utf8'), /\n@layer pages \{\n[\s\S]*\n\}\n$/);
  assert.doesNotMatch(UI_CSS.map(css).join('\n'), /prefers-reduced-motion/, 'only tokens.css and 95-motion.css read the OS motion setting');
});
