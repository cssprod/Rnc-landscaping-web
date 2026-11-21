// @ts-check
/**
 * Shared presentational components (editorial system). Markup, options and CSS hooks for every
 * export are documented in site/COMPONENTS.md. Content surfaces are solid; Liquid Glass is
 * reserved for chrome (header, sticky bar, menus) and CTA panels over photos.
 */
import { html, md, paras, raw, fmtDate } from '../lib/html.mjs';
import { picture, hasPhoto } from '../lib/images.mjs';
import { site } from '../../site.config.mjs';
import { has, tok } from '../lib/tokens.mjs';
import { icon, SERVICE_ICON, SEASON_ICON } from './sprite.mjs';

export { picture, hasPhoto };

/** Visible "Sample" chip. The class name is what the launch build looks for. */
export const sampleLabel = () => html`<span class="sample-label">Sample</span>`;

/** @param {string} slug */
export const serviceIcon = (slug) => SERVICE_ICON[/** @type {keyof typeof SERVICE_ICON} */ (slug)] || 'leaf';

/** Two-digit section index ("01"). @param {number} n */
export const pad2 = (n) => String(n).padStart(2, '0');

/* ---------------- contact actions (NAP from content/site.json; analytics via data attributes) ---------------- */

const digits = () => String(tok('PHONE')).replace(/[^\d+]/g, '');
/** tel: target, or null while PHONE is unknown. */
export const callHref = () => (has('PHONE') ? `tel:${digits()}` : null);
/** sms: target, or null while PHONE is unknown. @param {string} [body] */
export const smsHref = (body) => (has('PHONE') ? `sms:${digits()}${body ? `?body=${encodeURIComponent(body)}` : ''}` : null);
/** mailto: target, or null while EMAIL is unknown. */
export const mailHref = () => (has('EMAIL') ? `mailto:${tok('EMAIL')}` : null);

/**
 * Call action: "Call" (tel:, call_click) once PHONE is known, otherwise "Contact" → /contact/.
 * @param {string} location analytics location @param {{ className?: string, label?: 'short'|'number' }} [o]
 */
export function callAction(location, o = {}) {
  const cls = o.className || 'btn btn--secondary';
  const href = callHref();
  if (!href) return html`<a class="${cls}" href="/contact/">Contact</a>`;
  return html`<a class="${cls}" href="${href}" data-track="call_click" data-track-location="${location}">${icon('phone', { size: 18 })}${o.label === 'number' ? 'Call [PHONE]' : 'Call'}</a>`;
}

/**
 * Inline NAP link: tel / sms / email, or the placeholder token as text while unknown.
 * @param {'tel'|'sms'|'email'} kind @param {string} location @param {{ className?: string, label?: any }} [o]
 */
export function contactLink(kind, location, o = {}) {
  const href = kind === 'tel' ? callHref() : kind === 'sms' ? smsHref() : mailHref();
  const text = o.label ?? (kind === 'email' ? '[EMAIL]' : '[PHONE]');
  if (!href) return html`<span class="${o.className || ''}">${kind === 'email' ? '[EMAIL]' : '[PHONE]'}</span>`;
  const ev = kind === 'tel' ? 'call_click' : kind === 'sms' ? 'sms_click' : 'email_click';
  return html`<a class="${o.className || ''}" href="${href}" data-track="${ev}" data-track-location="${location}">${text}</a>`;
}

/* ---------------- buttons and links ---------------- */

/** Primary call to action. @param {{ tone?: 'primary'|'light', size?: string, href?: string, label?: string }} [o] */
export const quoteBtn = (o = {}) => html`<a class="btn btn--${o.tone || 'primary'}${o.size ? ` btn--${o.size}` : ''}" href="${o.href || '/free-quote/'}">${o.label || 'Get a free quote'}</a>`;

/**
 * Secondary action: call once the number is known, otherwise the portfolio.
 * @param {string} location @param {{ tone?: 'glass'|'secondary'|'on-deep'|'light', size?: string }} [o]
 */
export function secondaryBtn(location, o = {}) {
  const cls = `btn btn--${o.tone || 'secondary'}${o.size ? ` btn--${o.size}` : ''}`;
  if (has('PHONE')) return callAction(location, { className: cls, label: 'number' });
  return html`<a class="${cls}" href="/projects/">See our work</a>`;
}

/** Arrow link ("See all …"). @param {string} href @param {any} label */
export const linkMore = (href, label) => html`<a class="link-more" href="${href}">${label}${icon('arrow', { size: 18 })}</a>`;

/** Pill links. @param {[string, string][]} links */
export const chips = (links) => html`<ul class="chip-list">${links.map(([href, label]) => html`<li><a class="chip" href="${href}">${label}</a></li>`)}</ul>`;

/* ---------------- breadcrumb ---------------- */

/** @typedef {{ name: string, path: string }} Crumb */
/** Breadcrumb trail (rendered by layout() for depth 2+). @param {Crumb[]} crumbs */
export function breadcrumb(crumbs) {
  if (crumbs.length < 2) return '';
  return html`<nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map((c, i) =>
    i === crumbs.length - 1 ? html`<li><a href="${c.path}" aria-current="page">${c.name}</a></li>` : html`<li><a href="${c.path}">${c.name}</a>${icon('chevron-right', { size: 14, className: 'crumbs__sep' })}</li>`)}</ol></nav>`;
}

/* ---------------- heads and heroes ---------------- */

/** Eyebrow line: index number + sentence-case label + hairline. @param {{ index?: number, label?: any }} p */
export const eyebrow = (p) => (p.index == null && !p.label ? '' : html`<p class="eyebrow">${p.index != null ? html`<span class="eyebrow__index">${pad2(p.index)}</span>` : ''}${p.label ? html`<span>${p.label}</span>` : ''}</p>`);

/**
 * Hero. `variant: 'home'` is a full-bleed photo with a scrim; `'page'` (default) is an editorial split.
 * @param {{ h1: string, lede?: string, image: string, ctas?: boolean, variant?: 'home'|'page', dock?: any, extra?: any, quoteHref?: string, eyebrow?: any }} p
 */
export function hero(p) {
  const home = p.variant === 'home';
  return html`<section class="hero hero--${p.variant || 'page'}${home ? ' on-deep on-media' : ''}" aria-labelledby="page-title">
  <div class="hero__media">${picture(p.image, { eager: true, sizes: home ? '100vw' : '(min-width: 64em) 640px, 100vw', credit: true })}</div>
  <div class="hero__scrim" aria-hidden="true"></div>
  <div class="hero__content wrap">
    <!--crumbs-->
    ${p.eyebrow ? eyebrow({ label: p.eyebrow }) : ''}
    <h1 id="page-title" class="hero__title">${p.h1}</h1>
    ${p.lede ? html`<p class="hero__lede">${md(p.lede)}</p>` : ''}
    ${p.ctas !== false ? html`<div class="hero__ctas">${quoteBtn({ tone: home ? 'light' : 'primary', size: 'lg', href: p.quoteHref })}${secondaryBtn('hero', { tone: home ? 'glass' : 'secondary', size: 'lg' })}</div>` : ''}
    ${p.extra || ''}
  </div>
  ${p.dock || ''}
</section>`;
}

/** Page header without a photo. @param {{ h1: string, lede?: string, extra?: any, className?: string, eyebrow?: any, contour?: boolean }} p */
export const pageHead = (p) => html`<header class="page-head${p.contour === false ? '' : ' contour'} ${p.className || ''}">
  <div class="wrap page-head__inner">
    <!--crumbs-->
    ${p.eyebrow ? eyebrow({ label: p.eyebrow }) : ''}
    <h1 id="page-title">${p.h1}</h1>
    ${p.lede ? html`<p class="page-head__lede">${md(p.lede)}</p>` : ''}
    ${p.extra || ''}
  </div>
</header>`;

/**
 * Section heading row with optional index number and eyebrow label.
 * @param {{ id: string, title: any, lede?: any, link?: any, level?: number, index?: number, eyebrow?: any }} p
 */
export const sectionHead = (p) => html`<div class="section-head">
  <div class="section-head__text">${eyebrow({ index: p.index, label: p.eyebrow })}${raw(`<h${p.level || 2} id="${p.id}">`)}${p.title}${raw(`</h${p.level || 2}>`)}${p.lede ? html`<p class="section-head__lede">${typeof p.lede === 'string' ? md(p.lede) : p.lede}</p>` : ''}</div>
  ${p.link || ''}
</div>`;

/**
 * Generic content sections from page JSON: heading column + body, items as solid cards.
 * @param {any[]} list @param {{ level?: number, tone?: string, numbered?: boolean, start?: number }} [o]
 */
export function sections(list = [], o = {}) {
  const H = `h${o.level || 2}`;
  return list.map((s, n) => html`<section class="section prose-section ${o.tone || ''}"${s.id ? raw(` id="${s.id}"`) : ''}>
  <div class="wrap prose-section__grid">
    <div class="prose-section__head">${o.numbered ? eyebrow({ index: (o.start || 1) + n }) : ''}${s.heading ? raw(`<${H}>`) : ''}${s.heading || ''}${s.heading ? raw(`</${H}>`) : ''}</div>
    <div class="prose-section__body">
      ${paras(s.body)}
      ${s.items?.length ? html`<ul class="item-cards">${s.items.map((/** @type {any} */ i) => html`<li class="glass-card item-card"><h3>${i.title}</h3>${i.body ? html`<p>${md(i.body)}</p>` : ''}</li>`)}</ul>` : ''}
    </div>
  </div>
</section>`);
}

/**
 * Numbered feature cards (solid).
 * @param {{ id: string, heading: string, lede?: string, items: {title:string, body?:string}[], icons?: string[], link?: any, index?: number, eyebrow?: any }} p
 */
export function featureBento(p) {
  return html`<section class="section bento-band" aria-labelledby="${p.id}">
  <div class="wrap">
    ${sectionHead({ id: p.id, title: p.heading, lede: p.lede, link: p.link, index: p.index, eyebrow: p.eyebrow })}
    <ul class="bento bento--${p.items.length}">${p.items.map((i) => html`<li class="glass-card bento__card">
      <h3>${i.title}</h3>${i.body ? html`<p>${md(i.body)}</p>` : ''}
    </li>`)}</ul>
  </div>
</section>`;
}

/* ---------------- spec strip ---------------- */

/**
 * Field-survey spec strip: hairline rules, tabular figures, sentence-case labels.
 * Items with an empty value are dropped. Never pass prices or budgets.
 * @param {{ label: string, value: any, href?: string }[]} items @param {{ compact?: boolean, className?: string, ariaLabel?: string }} [o]
 */
export function specStrip(items, o = {}) {
  const list = items.filter((i) => i.value != null && i.value !== '' && !(Array.isArray(i.value) && !i.value.length));
  if (!list.length) return '';
  return html`<dl class="spec${o.compact ? ' spec--compact' : ''} ${o.className || ''}"${o.ariaLabel ? raw(` aria-label="${o.ariaLabel}"`) : ''}>${list.map((i) => html`<div class="spec__item"><dt>${i.label}</dt><dd>${i.href ? html`<a href="${i.href}">${i.value}</a>` : Array.isArray(i.value) ? i.value.join(', ') : i.value}</dd></div>`)}</dl>`;
}

/**
 * Project spec strip (A12 #1): municipality, service, season, duration, client, scope tags, plant palette. No budgets.
 * Reads optional project keys `season` and `plants` (or `plantPalette`) when the content provides them.
 * @param {any} data @param {any} p project @param {{ compact?: boolean, scope?: boolean }} [o]
 */
export function projectSpec(data, p, o = {}) {
  return specStrip([
    { label: 'Municipality', value: data.areas[p.area]?.name || p.area, href: o.compact ? undefined : `/areas/${p.area}/` },
    { label: 'Service', value: data.services[p.service]?.navLabel || data.services[p.service]?.name || p.service, href: o.compact ? undefined : `/services/${p.service}/` },
    { label: 'Season', value: p.season },
    { label: 'Duration', value: p.duration },
    { label: 'Client', value: o.compact ? '' : p.clientType },
    { label: 'Scope', value: o.scope === false || o.compact ? '' : p.scopeTags || p.scope },
    { label: 'Plant palette', value: o.compact ? '' : p.plants || p.plantPalette },
  ], { compact: o.compact, ariaLabel: 'Project details' });
}

/* ---------------- cards ---------------- */

/** @param {any} data @param {{ heading?: string, lede?: string, id?: string, link?: boolean, index?: number, eyebrow?: any }} [o] */
export function serviceTiles(data, o = {}) {
  const id = o.id || 'svc-h';
  return html`<section class="section services-band" aria-labelledby="${id}">
  <div class="wrap">
    ${sectionHead({ id, title: o.heading || 'What we look after', lede: o.lede, index: o.index, eyebrow: o.eyebrow, link: o.link === false ? '' : linkMore('/services/', 'All services') })}
    <ul class="tiles">${site.services.map((slug) => {
      const s = data.services[slug];
      if (!s) return '';
      const summary = (s.includes || []).slice(0, 3).map((/** @type {any} */ i) => i.title).join(' · ');
      return html`<li class="tile"><a href="/services/${slug}/" class="tile__link">
        ${picture(s.hero?.image || `svc-${slug}-hero`, { sizes: '(min-width: 80em) 290px, (min-width: 40em) 50vw, 100vw', credit: false, chip: false, aspect: '4:5' })}
        <span class="tile__body"><span class="tile__title">${s.name}</span><span class="tile__text">${summary}</span></span>
      </a></li>`;
    })}</ul>
  </div>
</section>`;
}

/** @param {any} data @param {any} p project @param {{ headingLevel?: number }} [o] */
export function projectCard(data, p, o = {}) {
  const img = p.images?.after || p.images?.gallery?.[0] || `proj-${p.service}-1`;
  const H = `h${o.headingLevel || 3}`;
  const meta = [data.areas[p.area]?.name || p.area, data.services[p.service]?.navLabel || p.service, p.season, p.duration].filter(Boolean);
  return html`<li class="card project-card" data-service="${p.service}" data-area="${p.area}">
  <a href="/projects/${p.slug}/" class="card__link">
    <div class="card__media">${picture(img, { sizes: '(min-width: 80em) 380px, (min-width: 40em) 50vw, 100vw', sample: !p.sample && hasPhoto(img), credit: false, aspect: '4:3' })}${p.sample ? sampleLabel() : ''}</div>
    <div class="card__body">
      <p class="card__meta">${meta.map((m, i) => html`${i ? html`<span aria-hidden="true">·</span>` : ''}<span>${m}</span>`)}</p>
      ${raw(`<${H} class="card__title">`)}${p.title}${raw(`</${H}>`)}
      <p class="card__text">${p.summary}</p>
    </div>
  </a>
</li>`;
}

/** @param {any} data @param {any[]} projects @param {{ filters?: boolean, headingLevel?: number }} [o] */
export function projectGrid(data, projects, o = {}) {
  const usedAreas = site.areas.filter((a) => projects.some((p) => p.area === a));
  const filters = o.filters ? html`<form class="filters" action="" method="get" data-filters aria-label="Filter projects">
    <fieldset class="segmented"><legend class="vh">Service</legend>
      <label class="segmented__opt"><input type="radio" name="service" value="" checked><span>All work</span></label>
      ${site.services.map((s) => html`<label class="segmented__opt"><input type="radio" name="service" value="${s}"><span>${data.services[s]?.navLabel || s}</span></label>`)}
    </fieldset>
    <div class="filters__area"><label for="f-area">Municipality</label><div class="select"><select id="f-area" name="area"><option value="">All municipalities</option>${usedAreas.map((a) => html`<option value="${a}">${data.areas[a]?.name || a}</option>`)}</select>${icon('chevron', { size: 16 })}</div></div>
    <button class="btn btn--secondary btn--sm" type="submit" data-filters-submit>Apply</button>
    <p class="filters__count" role="status" aria-live="polite" data-filters-count>${projects.length} projects shown</p>
  </form>` : '';
  return html`${filters}<ul class="card-grid" data-project-grid>${projects.map((p) => projectCard(data, p, o))}</ul>
  ${o.filters ? html`<p class="filters__empty" data-filters-empty hidden>No projects match those filters yet. <a href="/projects/">Show all projects</a>.</p>` : ''}`;
}

/** Seasonal guide cards. @param {any[]} list @param {{ headingLevel?: number }} [o] */
export const resourceCards = (list, o = {}) => html`<ul class="card-grid">${list.map((r) => html`<li class="card res-card"><a class="card__link" href="/resources/${r.slug}/">
    <div class="card__media">${picture(r.image, { sizes: '(min-width: 80em) 380px, (min-width: 40em) 50vw, 100vw', credit: false, aspect: '3:2' })}</div>
    <div class="card__body"><p class="card__meta"><time datetime="${r.date}">${fmtDate(r.date)}</time></p>${raw(`<h${o.headingLevel || 3} class="card__title">`)}${r.title}${raw(`</h${o.headingLevel || 3}>`)}<p class="card__text">${r.summary}</p></div>
  </a></li>`)}</ul>`;

/** Keyboard-operable before/after comparison (only rendered when both photos exist). @param {string} before @param {string} after @param {string} label */
export function beforeAfter(before, after, label) {
  return html`<figure class="ba" data-ba>
  <div class="ba__stage">
    <div class="ba__img ba__img--before"><span class="ba__tag">Before</span>${picture(before, { sizes: '(min-width: 80em) 1200px, 100vw', credit: false, sample: hasPhoto(before) })}</div>
    <div class="ba__img ba__img--after"><span class="ba__tag">After</span>${picture(after, { sizes: '(min-width: 80em) 1200px, 100vw', credit: false, sample: hasPhoto(after) })}</div>
    <span class="ba__handle" aria-hidden="true"><span class="ba__knob">${icon('chevron-right', { size: 16, className: 'ba__l' })}${icon('chevron-right', { size: 16 })}</span></span>
  </div>
  <div class="ba__control"><label for="ba-${before}">Compare before and after</label><input id="ba-${before}" type="range" min="0" max="100" value="50" step="1" data-ba-range aria-valuetext="50% after image shown"></div>
  <figcaption>${label}</figcaption>
</figure>`;
}

/* ---------------- reviews ---------------- */

/**
 * One review quote (Newsreader italic). Samples carry the Sample label; attribution is role + municipality.
 * @param {any} data @param {any} t testimonial @param {{ tag?: 'li'|'div' }} [o]
 */
export function reviewQuote(data, t, o = {}) {
  const tag = o.tag || 'li';
  return html`${raw(`<${tag} class="quote">`)}<figure class="review">
    <blockquote><p>${t.quote}</p></blockquote>
    <figcaption><span>${t.attribution}</span>${t.service ? html`<span class="quote__svc">${icon(serviceIcon(t.service), { size: 14 })}${data.services[t.service]?.navLabel || ''}</span>` : ''}${t.sample ? sampleLabel() : ''}</figcaption>
  </figure>${raw(`</${tag}>`)}`;
}

/** "Read all reviews on Google" → [GOOGLE PROFILE] (placeholder text until set). */
export function googleReviewsLink() {
  if (has('GOOGLE PROFILE')) return html`<a class="link-more" href="${tok('GOOGLE PROFILE')}" rel="noopener">Read all reviews on Google${icon('arrow-up-right', { size: 18 })}</a>`;
  return html`<p class="note">Read all reviews on Google: [GOOGLE PROFILE]</p>`;
}

/**
 * Reviews band: up to three quotes in a static grid (never a carousel) + Google link. No review schema.
 * @param {any} data @param {any[]} list @param {{ heading?: string, lede?: string, id?: string, link?: any, index?: number, eyebrow?: any, google?: boolean, max?: number }} [o]
 */
export function testimonials(data, list, o = {}) {
  if (!list.length) return '';
  const id = o.id || 'quotes-h';
  return html`<section class="section quotes-band" aria-labelledby="${id}">
  <div class="wrap">
    ${sectionHead({ id, title: o.heading || 'What clients say', lede: o.lede, link: o.link, index: o.index, eyebrow: o.eyebrow })}
    <ul class="quotes">${(o.max ? list.slice(0, o.max) : list).map((t) => reviewQuote(data, t))}</ul>
    ${o.google === false ? '' : html`<div class="reviews__more">${googleReviewsLink()}</div>`}
  </div>
</section>`;
}
export const reviewsBand = testimonials;

/* ---------------- trust ---------------- */

export const CREDENTIALS = /** @type {[string, string, string][]} */ ([
  ['shield', 'Liability insurance', '[LIABILITY LIMIT]'], ['shield', 'WorkSafeBC', '[WORKSAFEBC STATUS]'], ['doc', 'Business licences', '[LICENCES]'],
  ['badge', 'Certifications', '[CERTIFICATIONS]'], ['users', 'Memberships', '[MEMBERSHIPS]'], ['check', 'Workmanship guarantee', '[WARRANTY]'],
]);

/** Credential row: tokens only until RNC confirms each value. @param {{ items?: [string, string, any][] }} [o] */
export const credentialRow = (o = {}) => html`<dl class="creds">${(o.items || CREDENTIALS).map(([ic, k, v]) => html`<div class="creds__item"><dt>${icon(ic, { size: 18 })}${k}</dt><dd>${v}</dd></div>`)}</dl>`;

/** Credentials band (Fir night). @param {{ heading?: string, lede?: string, index?: number, id?: string }} [o] */
export function trustBand(o = {}) {
  const id = o.id || 'trust-h';
  return html`<section class="section deep-band on-deep contour trust" aria-labelledby="${id}">
  <div class="wrap">
    ${sectionHead({ id, title: o.heading || 'Credentials', index: o.index, lede: o.lede || 'Insurance, safety and licensing details for owners, councils and facility teams.' })}
    ${credentialRow()}
  </div>
</section>`;
}

/**
 * Call to action band. Fir night with the contour motif, or a glass panel over a photo when `image` is set.
 * @param {{ heading?: string, body?: string, secondary?: any, image?: string, quoteHref?: string, id?: string, reply?: boolean }} [p]
 */
export function ctaBand(p = {}) {
  const id = p.id || 'cta-h';
  return html`<section class="cta-band on-deep${p.image ? ' cta-band--photo on-media' : ' contour'}" aria-labelledby="${id}">
  ${p.image ? html`<div class="cta-band__bg">${picture(p.image, { sizes: '100vw', credit: false, chip: false })}</div>` : ''}
  <div class="wrap">
    <div class="cta-band__panel">
      <div><h2 id="${id}">${p.heading || 'Tell us about your property'}</h2>
      <p>${p.body || 'Free quotes, no obligation. Share a few details and photos and we will follow up to arrange a site visit.'}</p>
      ${p.reply === false ? '' : html`<p class="cta-band__reply">We reply within [REPLY TIME].</p>`}</div>
      <div class="cta-band__actions">${quoteBtn({ tone: 'light', size: 'lg', href: p.quoteHref })}${p.secondary || secondaryBtn('cta_band', { tone: 'glass', size: 'lg' })}</div>
    </div>
  </div>
</section>`;
}

/* ---------------- FAQ ---------------- */

/** One FAQ row (native <details>). @param {{ q: string, a: string|string[] }} f */
export const faqItem = (f) => html`<details class="faq__item"><summary>${f.q}${icon('chevron', { size: 18, className: 'faq__chev' })}</summary><div class="faq__a">${paras(f.a)}</div></details>`;

/** FAQ section. @param {{q:string,a:string}[]} faqs @param {{ heading?: string, id?: string, lede?: string, index?: number }} [o] */
export function faqList(faqs = [], o = {}) {
  if (!faqs.length) return '';
  const id = o.id || 'faq-h';
  return html`<section class="section faq" aria-labelledby="${id}">
  <div class="wrap faq__grid">
    <div class="faq__head">${eyebrow({ index: o.index })}<h2 id="${id}">${o.heading || 'Questions we hear often'}</h2>${o.lede ? html`<p>${o.lede}</p>` : ''}</div>
    <div class="faq__list">${faqs.map(faqItem)}</div>
  </div>
</section>`;
}

/* ---------------- local rules ---------------- */

/**
 * "Local rules that affect your yard": summaries with a source link each and a last-reviewed date.
 * Rules without a sourceUrl are dropped (CONTRACT: local rules only with a source and verify:true).
 * @param {{ rules: { title?: string, text: string, sourceUrl?: string, sourceLabel?: string, verify?: boolean, lastReviewed?: string }[], reviewed?: string, heading?: string, id?: string, intro?: string, level?: number }} p
 */
export function localRules(p) {
  const rules = (p.rules || []).filter((r) => r.sourceUrl && r.verify);
  if (!rules.length) return '';
  const id = p.id || 'rules-h';
  const H = `h${p.level || 2}`;
  const reviewed = p.reviewed || rules.map((r) => r.lastReviewed).filter(Boolean).sort()[0];
  const host = (/** @type {string} */ u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'source'; } };
  return html`<aside class="rules" aria-labelledby="${id}">
  ${raw(`<${H} id="${id}">`)}${icon('doc', { size: 22 })}${p.heading || 'Local rules that affect your yard'}${raw(`</${H}>`)}
  ${p.intro ? html`<p>${md(p.intro)}</p>` : ''}
  <ul class="rules__list">${rules.map((r) => html`<li>
    ${r.title ? html`<p><strong>${r.title}</strong></p>` : ''}<p>${md(r.text)}</p>
    <a class="rules__src" href="${r.sourceUrl}" rel="noopener">${r.sourceLabel || `Source: ${host(r.sourceUrl)}`}${icon('arrow-up-right', { size: 14 })}</a>
  </li>`)}</ul>
  <p class="rules__meta">${reviewed ? html`Last reviewed <time datetime="${reviewed}">${fmtDate(reviewed)}</time>. ` : ''}Summaries only: rules change, so check the source or ask the municipality before work starts.</p>
</aside>`;
}

/* ---------------- misc (kept for current templates) ---------------- */

/** Seasonal planner cards. @param {{ season: string, items: string[] }[]} list */
export const seasons = (list) => html`<div class="seasons">${list.map((x) => html`<div class="glass-card season season--${String(x.season).toLowerCase()}">
  <h3>${icon(SEASON_ICON[/** @type {keyof typeof SEASON_ICON} */ (x.season)] || 'leaf', { size: 20 })}${x.season}</h3>
  <ul>${x.items.map((i) => html`<li>${i}</li>`)}</ul>
</div>`)}</div>`;

/** Contact method cards (tel / sms / email / hours / address). */
export function contactCards() {
  return html`<ul class="contact-cards">
    <li class="glass-card contact-card"><span class="icon-tile">${icon('phone', { size: 22 })}</span><h3>Call or text</h3><p>${contactLink('tel', 'contact_page', { className: 'contact-card__value' })}</p>${has('PHONE') ? html`<p>${contactLink('sms', 'contact_page', { label: 'Send a text' })}</p>` : ''}</li>
    <li class="glass-card contact-card"><span class="icon-tile">${icon('mail', { size: 22 })}</span><h3>Email</h3><p>${contactLink('email', 'contact_page', { className: 'contact-card__value' })}</p></li>
    <li class="glass-card contact-card"><span class="icon-tile">${icon('clock', { size: 22 })}</span><h3>Hours</h3><p><span class="contact-card__value">[HOURS]</span></p></li>
    <li class="glass-card contact-card"><span class="icon-tile">${icon('pin', { size: 22 })}</span><h3>Address</h3><p><span class="contact-card__value">[ADDRESS]</span></p></li>
  </ul>`;
}
