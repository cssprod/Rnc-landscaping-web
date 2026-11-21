// @ts-check
/**
 * Page shell: <head> (metadata from lib/seo.mjs), the C1 header (glass navigation
 * capsule with the Services and Service areas disclosures), breadcrumbs, the C1
 * footer. Business facts come from content/site.json (siteJson), never from literals.
 */
import { html, raw } from '../lib/html.mjs';
import { site, siteJson, optionalTokens } from '../../site.config.mjs';
import { has, val, telHref, telLink, mailLink } from '../lib/tokens.mjs';
import { headMeta, jsonLd } from '../lib/seo.mjs';
import { sprite, icon, logo, SERVICE_ICON } from './sprite.mjs';
import { HEAD_SCRIPT, SPECULATION_RULES } from '../lib/head-scripts.mjs';

/** Alias of HEAD_SCRIPT (CONTRACT §11 JS_FLAG transition), kept so W1 branches that still import it build; W2 ds-chrome deletes it. */
export const JS_FLAG = HEAD_SCRIPT;

/**
 * @typedef {{ name: string, path: string }} Crumb
 * @typedef {{ src: string, deps: string[] }} ModuleAsset
 * @typedef {{ css: string, js: string, modules?: Record<string, ModuleAsset> }} Assets
 * @typedef {{ launch: boolean, context: string, origin: string, data: any, assets: Assets, hasCapability?: boolean, analyticsDomain?: string|null }} Env
 */

/** Modules every page loads (CONTRACT §12); routes add more through `scripts`. */
const BASE_MODULES = ['main', 'living'];

/** @param {Env} env @param {string} slug */
const serviceName = (env, slug) => {
  const s = siteJson.services.find((x) => x.slug === slug);
  return s?.navLabel || s?.name || env.data.services[slug]?.navLabel || slug;
};

/** Plain-text digits for tel:/sms: targets (only called once PHONE is known). */
const smsHref = () => telHref().replace(/^tel:/, 'sms:');

/** Header call action: a tel: link once PHONE is known; "Call [PHONE]" as plain text in showcase builds; nothing in launch (CONTRACT §3). @param {Env} env */
function headerCall(env) {
  if (has('PHONE')) return html`<a class="icon-btn phone-link" href="${telHref()}" data-track="call_clicked" data-track-location="header">${icon('phone', { size: 18 })}<span class="phone-link__label">Call ${siteJson.nap.phone}</span></a>`;
  return env.launch ? '' : html`<span class="site-nav__call">${icon('phone', { size: 16 })}Call ${siteJson.nap.phone}</span>`;
}

/** @param {Env} env @param {string} path */
function header(env, path) {
  const cur = (/** @type {string} */ p) => (path === p || (p !== '/' && path.startsWith(p)) ? raw(' aria-current="page"') : '');
  const svc = site.services.map((s) => {
    const d = env.data.services[s];
    const blurb = (d?.includes || []).slice(0, 3).map((/** @type {any} */ i) => i.title).join(', ');
    return html`<li><a href="/services/${s}/" class="mega__link"${cur(`/services/${s}/`)}><span class="mega__icon">${icon(SERVICE_ICON[/** @type {keyof typeof SERVICE_ICON} */ (s)] || 'leaf', { size: 22 })}</span><span class="mega__name">${serviceName(env, s)}</span><span class="mega__desc">${blurb}</span></a></li>`;
  });
  const areas = siteJson.municipalities.map((m) => html`<li><a class="chip" href="/areas/${m.slug}/"${cur(`/areas/${m.slug}/`)}>${m.name}</a></li>`);
  return html`<header class="site-header" data-header>
  <div class="nav-capsule">
    <a class="brand" href="/" aria-label="RNC Landscaping home">${logo()}</a>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul class="site-nav__list">
        <li class="site-nav__item has-mega" data-mega>
          <button type="button" class="site-nav__disclosure" aria-expanded="false" aria-controls="menu-services" data-mega-toggle>Services${icon('chevron', { size: 16 })}</button>
          <div class="mega" id="menu-services" data-mega-panel>
            <ul class="mega__list">${svc}
              <li><a href="/commercial/" class="mega__link"${cur('/commercial/')}><span class="mega__icon">${icon('doc', { size: 22 })}</span><span class="mega__name">Commercial and public sector</span><span class="mega__desc">Strata, commercial, institutional and public sites</span></a></li>
              <li><a href="/services/" class="mega__link"${path === '/services/' ? raw(' aria-current="page"') : ''}><span class="mega__icon">${icon('arrow', { size: 22 })}</span><span class="mega__name">All services</span><span class="mega__desc">Compare the four service lines</span></a></li>
            </ul>
            <div class="mega__aside">
              <p>Working across all ${siteJson.municipalities.length} Greater Victoria municipalities, from Sidney to Sooke.</p>
              <a href="/process/">${icon('compass', { size: 18 })} How we work</a>
              <a href="/free-quote/">${icon('mail', { size: 18 })} Get a free quote</a>
            </div>
          </div>
        </li>
        <li class="site-nav__item"><a href="/projects/"${cur('/projects/')}>Projects</a></li>
        <li class="site-nav__item has-mega" data-mega>
          <button type="button" class="site-nav__disclosure" aria-expanded="false" aria-controls="menu-areas" data-mega-toggle>Service areas${icon('chevron', { size: 16 })}</button>
          <div class="mega mega--areas" id="menu-areas" data-mega-panel>
            <div class="mega__areas">
              <ul class="chip-list">${areas}</ul>
              <a class="link-more" href="/areas/"${path === '/areas/' ? raw(' aria-current="page"') : ''}>All service areas${icon('arrow', { size: 18 })}</a>
            </div>
            <div class="mega__aside">
              <p>One page per municipality, with local rules, conditions and nearby projects.</p>
            </div>
          </div>
        </li>
        <li class="site-nav__item"><a href="/process/"${cur('/process/')}>Process</a></li>
        <li class="site-nav__item"><a href="/about/"${cur('/about/')}>About</a></li>
      </ul>
      <div class="site-nav__actions">
        ${headerCall(env)}
        <a class="btn btn--primary btn--sm" href="/free-quote/">Get a free quote</a>
      </div>
    </nav>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle><span class="nav-toggle__bars" aria-hidden="true"></span><span class="nav-toggle__label">Menu</span></button>
  </div>
</header>`;
}

/** @param {Crumb[]} crumbs */
export function breadcrumbNav(crumbs) {
  if (crumbs.length < 2) return '';
  return html`<nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map((c, i) =>
    i === crumbs.length - 1 ? html`<li><a href="${c.path}" aria-current="page">${c.name}</a></li>` : html`<li><a href="${c.path}">${c.name}</a></li>${icon('chevron-right', { size: 14, className: 'crumbs__sep' })}`)}</ol></nav>`;
}

/** Footer contact rows: tel:/sms:/mailto: once known; the token as plain text (a chip) in showcase builds. */
function footerContact() {
  const sms = has('PHONE')
    ? html`<a href="${smsHref()}" data-track="sms_click" data-track-location="footer">Text ${siteJson.nap.phone}</a>`
    : html`<span>Text ${siteJson.nap.phone}</span>`;
  return html`<address>
        <p>${icon('phone', { size: 16 })} ${telLink('footer')}</p>
        <p>${icon('chat', { size: 16 })} ${sms}</p>
        <p>${icon('mail', { size: 16 })} ${mailLink('footer')}</p>
        <p>${icon('clock', { size: 16 })} <span>${siteJson.hours.display}</span></p>
        <p>${icon('pin', { size: 16 })} <span>${siteJson.nap.address}</span></p>
      </address>`;
}

/** Google Business Profile link: a link once set; text + chip in showcase; omitted in launch (CONTRACT §3, optional token). @param {Env} env */
function googleProfile(env) {
  const url = val('GOOGLE PROFILE');
  if (url) return html`<li><a href="${url}" rel="noopener">Google profile</a></li>`;
  return env.launch && optionalTokens.includes('GOOGLE PROFILE') ? '' : html`<li><span>Google profile ${siteJson.googleProfile}</span></li>`;
}

/** @param {Env} env */
function footer(env) {
  return html`<footer class="site-footer">
  <div class="site-footer__glow" aria-hidden="true"></div>
  <div class="wrap site-footer__top">
    <div class="site-footer__brand">
      <a class="brand brand--footer" href="/" aria-label="RNC Landscaping home">${logo()}</a>
      <p>Grounds care, landscape installation, irrigation and tree work for homes, stratas and managed sites across ${siteJson.region}.</p>
      <a class="btn btn--light" href="/free-quote/">Get a free quote</a>
    </div>
    <nav aria-label="Services" class="site-footer__col"><h2>Services</h2><ul>${site.services.map((s) => html`<li><a href="/services/${s}/">${serviceName(env, s)}</a></li>`)}<li><a href="/commercial/">Commercial and public sector</a></li></ul></nav>
    <nav aria-label="Service areas" class="site-footer__col site-footer__areas"><h2>Areas we serve</h2><ul>${siteJson.municipalities.map((m) => html`<li><a href="/areas/${m.slug}/">${m.name}</a></li>`)}</ul></nav>
    <nav aria-label="Company" class="site-footer__col"><h2>Company</h2><ul>
      <li><a href="/about/">About</a></li><li><a href="/projects/">Projects</a></li><li><a href="/process/">Process</a></li><li><a href="/reviews/">Reviews</a></li>
      <li><a href="/resources/">Resources</a></li><li><a href="/faq/">FAQ</a></li><li><a href="/contact/">Contact</a></li></ul></nav>
    <div class="site-footer__col site-footer__contact"><h2>Contact</h2>
      ${footerContact()}
    </div>
  </div>
  <div class="wrap site-footer__legal">
    <p>© [YEAR] ${siteJson.nap.legalName}. Serving ${siteJson.region}.</p>
    <ul><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li><li><a href="/accessibility/">Accessibility</a></li>${googleProfile(env)}</ul>
  </div>
  ${env.launch ? '' : html`<p class="wrap site-footer__note">Showcase edition: highlighted details are placeholders still to be confirmed, and work labelled Sample is illustrative.</p>`}
</footer>`;
}

/**
 * Script tags. With the module graph (env.assets.modules, from w1/build) every page loads main + living plus the
 * route's scripts, each as <script type=module> with a <link rel=modulepreload> per dependency. Without it (the seed
 * build) the single env.assets.js bundle is emitted exactly as before and `scripts` is ignored.
 * @param {Env} env @param {string[]} [scripts]
 */
export function scriptTags(env, scripts = []) {
  const mods = env.assets.modules;
  if (!mods) return html`<script type="module" src="${env.assets.js}"></script>`;
  const names = [...new Set([...BASE_MODULES, ...scripts])].filter((n) => mods[n]);
  const srcs = names.map((n) => mods[n].src);
  /** @type {string[]} */ const preload = [];
  for (const n of names) for (const d of mods[n].deps || []) {
    const href = mods[d]?.src || d;
    if (!srcs.includes(href) && !preload.includes(href)) preload.push(href);
  }
  return html`${preload.map((h) => html`<link rel="modulepreload" href="${h}">`)}${srcs.map((s) => html`<script type="module" src="${s}"></script>`)}`;
}

/**
 * @param {Env} env
 * @param {{ path: string, title: string, description: string, crumbs?: Crumb[], body: any, jsonld?: object[], ogImage?: string, ogType?: string, bodyClass?: string, noindex?: boolean, hero?: boolean, scripts?: string[] }} p
 */
export function layout(env, p) {
  const crumbs = p.crumbs || [{ name: 'Home', path: '/' }];
  // Breadcrumbs sit inside the page head or hero (marker), else at the top of <main>.
  let body = String(p.body);
  const nav = String(breadcrumbNav(crumbs));
  body = body.includes('<!--crumbs-->') ? body.replace('<!--crumbs-->', nav) : (nav ? `<div class="wrap crumbs-row">${nav}</div>${body}` : body);
  return html`<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${headMeta(env, { ...p, crumbs })}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#F4F6F2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0A0E0C" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/brand/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://images.unsplash.com">
<script>${raw(HEAD_SCRIPT)}</script>
<link rel="stylesheet" href="${env.assets.css}">
<script type="speculationrules">${raw(SPECULATION_RULES)}</script>
${scriptTags(env, p.scripts)}
${env.analyticsDomain ? html`<script defer data-domain="${env.analyticsDomain}" src="https://plausible.io/js/script.js"></script>` : ''}
${jsonLd(env, { ...p, crumbs })}
</head>
<body class="${p.bodyClass || ''}${p.hero ? ' has-hero' : ''}">
${sprite()}
<a class="skip-link" href="#main">Skip to content</a>
${header(env, p.path)}
<main id="main" tabindex="-1">
${raw(body)}
</main>
${footer(env)}
</body>
</html>
`;
}
