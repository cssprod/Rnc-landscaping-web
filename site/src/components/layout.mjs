// @ts-check
/**
 * Page shell: <head>, glass header with disclosure menus (C1), mobile sheet nav, breadcrumbs,
 * footer, and the sticky action bar shown below 64em (C4). NAP comes from content/site.json.
 */
import { html, raw } from '../lib/html.mjs';
import { site } from '../../site.config.mjs';
import { headMeta, jsonLd } from '../lib/seo.mjs';
import { sprite, icon, logo, SERVICE_ICON } from './sprite.mjs';
import { breadcrumb, callAction, contactLink, googleReviewsLink, quoteBtn } from './ui.mjs';

/** Inline script that flags JS support before first paint (hash pinned in netlify.toml CSP). */
export const JS_FLAG = "document.documentElement.classList.add('js')";

/**
 * @typedef {{ name: string, path: string }} Crumb
 * @typedef {{ launch: boolean, context: string, origin: string, data: any, assets: { css: string, js: string, scripts?: Record<string, string> }, hasCapability?: boolean, analyticsDomain?: string|null }} Env
 */

/** Kept for older imports; the implementation lives in ui.mjs. */
export const breadcrumbNav = breadcrumb;

/** @param {Env} env @param {string} s */
const serviceName = (env, s) => env.data.services[s]?.navLabel || env.data.services[s]?.name || s;
/** @param {Env} env @param {string} a */
const areaName = (env, a) => env.data.areas[a]?.name || a;

/** @param {Env} env @param {string} path */
function header(env, path) {
  const cur = (/** @type {string} */ p) => (path === p || (p !== '/' && path.startsWith(p)) ? raw(' aria-current="page"') : '');
  const here = (/** @type {string} */ p) => (path === p ? raw(' aria-current="page"') : '');
  const svc = site.services.map((s) => {
    const d = env.data.services[s];
    const blurb = (d?.includes || []).slice(0, 3).map((/** @type {any} */ i) => i.title).join(', ');
    return html`<li><a class="menu__link" href="/services/${s}/"${here(`/services/${s}/`)}><span class="menu__icon">${icon(SERVICE_ICON[/** @type {keyof typeof SERVICE_ICON} */ (s)] || 'leaf', { size: 20 })}</span><span class="menu__name">${serviceName(env, s)}</span><span class="menu__desc">${blurb}</span></a></li>`;
  });
  const areas = site.areas.map((a) => html`<li><a href="/areas/${a}/"${here(`/areas/${a}/`)}>${areaName(env, a)}</a></li>`);
  const inSvc = path.startsWith('/services/') || path === '/commercial/';
  const inAreas = path.startsWith('/areas/');
  return html`<header class="site-header" data-header>
  <div class="site-header__bar">
    <a class="brand" href="/" aria-label="RNC Landscaping home">${logo()}</a>
    <nav id="site-nav" class="site-nav" aria-label="Main" data-nav>
      <ul class="site-nav__list">
        <li class="site-nav__item" data-menu>
          <button type="button" class="site-nav__link site-nav__btn" aria-expanded="false" aria-controls="menu-services" data-menu-toggle${inSvc ? raw(' data-current') : ''}>Services${icon('chevron', { size: 16 })}</button>
          <div class="menu menu--services" id="menu-services" data-menu-panel>
            <ul>${svc}</ul>
            <ul class="menu__more"><li><a href="/services/"${here('/services/')}>All services</a></li><li><a href="/commercial/"${here('/commercial/')}>Commercial and public sector</a></li></ul>
          </div>
        </li>
        <li class="site-nav__item"><a class="site-nav__link" href="/projects/"${cur('/projects/')}>Projects</a></li>
        <li class="site-nav__item" data-menu>
          <button type="button" class="site-nav__link site-nav__btn" aria-expanded="false" aria-controls="menu-areas" data-menu-toggle${inAreas ? raw(' data-current') : ''}>Service areas${icon('chevron', { size: 16 })}</button>
          <div class="menu menu--areas" id="menu-areas" data-menu-panel>
            <ul class="menu__grid">${areas}</ul>
            <ul class="menu__more"><li><a href="/areas/"${here('/areas/')}>All 13 service areas</a></li></ul>
          </div>
        </li>
        <li class="site-nav__item"><a class="site-nav__link" href="/process/"${cur('/process/')}>Process</a></li>
        <li class="site-nav__item"><a class="site-nav__link" href="/about/"${cur('/about/')}>About</a></li>
      </ul>
      <div class="site-nav__actions">
        ${callAction('header', { className: 'btn btn--quiet btn--sm' })}
        <a class="btn btn--primary btn--sm" href="/free-quote/"${here('/free-quote/')}>Free quote</a>
      </div>
    </nav>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu" data-nav-toggle><span class="nav-toggle__bars" aria-hidden="true"></span><span class="nav-toggle__label" aria-hidden="true">Menu</span></button>
  </div>
</header>`;
}

/** @param {Env} env */
function footer(env) {
  const li = (/** @type {string} */ href, /** @type {any} */ label) => html`<li><a href="${href}">${label}</a></li>`;
  return html`<footer class="site-footer on-deep contour">
  <div class="wrap site-footer__top">
    <div class="site-footer__brand">
      <a class="brand brand--footer" href="/" aria-label="RNC Landscaping home">${logo()}</a>
      <p>Grounds care, landscape installation, irrigation and tree work for homes, stratas and managed sites across ${site.region}.</p>
      ${quoteBtn({ tone: 'light' })}
    </div>
    <nav aria-label="Services" class="site-footer__col"><h2>Services</h2><ul>${site.services.map((s) => li(`/services/${s}/`, serviceName(env, s)))}${li('/commercial/', 'Commercial and public sector')}${li('/services/', 'All services')}</ul></nav>
    <nav aria-label="Service areas" class="site-footer__col site-footer__areas"><h2>Service areas</h2><ul>${site.areas.map((a) => li(`/areas/${a}/`, areaName(env, a)))}${li('/areas/', 'All service areas')}</ul></nav>
    <nav aria-label="Company" class="site-footer__col"><h2>Company</h2><ul>${li('/projects/', 'Projects')}${li('/process/', 'Process')}${li('/about/', 'About')}</ul></nav>
    <nav aria-label="Resources" class="site-footer__col"><h2>Resources</h2><ul>${li('/resources/', 'Seasonal guides')}${li('/reviews/', 'Reviews')}${li('/faq/', 'FAQ')}${li('/contact/', 'Contact')}</ul></nav>
    <div class="site-footer__col site-footer__contact"><h2>Contact</h2>
      <address>
        <p>${icon('phone', { size: 16 })}${contactLink('tel', 'footer')}</p>
        ${contactLinkRow('sms')}
        <p>${icon('mail', { size: 16 })}${contactLink('email', 'footer')}</p>
        <p>${icon('clock', { size: 16 })}<span>[HOURS]</span></p>
        <p>${icon('pin', { size: 16 })}<span>[ADDRESS]</span></p>
      </address>
      ${googleReviewsLink()}
    </div>
  </div>
  <div class="wrap site-footer__legal">
    <p>© [YEAR] [LEGAL NAME]. Serving ${site.region}.</p>
    <ul>${li('/privacy/', 'Privacy')}${li('/terms/', 'Terms')}${li('/accessibility/', 'Accessibility')}</ul>
  </div>
  ${env.launch ? '' : html`<p class="wrap site-footer__note">Showcase edition: highlighted details are placeholders still to be confirmed, and work labelled Sample is illustrative.</p>`}
</footer>`;
}

/** Text-message row, only once PHONE is known. @param {'sms'} kind */
function contactLinkRow(kind) {
  const link = contactLink(kind, 'footer', { label: 'Send a text' });
  return String(link).startsWith('<a') ? html`<p>${icon('chat', { size: 16 })}${link}</p>` : '';
}

/** Sticky action bar (below 64em): Call (Contact until PHONE is known) + Free quote. */
const actionBar = () => html`<nav class="action-bar" aria-label="Quick actions" data-action-bar>
  ${callAction('sticky_bar', { className: 'btn btn--secondary' })}
  <a class="btn btn--primary" href="/free-quote/">Free quote</a>
</nav>`;

/**
 * @param {Env} env
 * @param {{ path: string, title: string, description: string, crumbs?: Crumb[], body: any, jsonld?: object[], ogImage?: string, bodyClass?: string, noindex?: boolean, hero?: boolean, scripts?: string[], actionBar?: boolean }} p
 */
export function layout(env, p) {
  const crumbs = p.crumbs || [{ name: 'Home', path: '/' }];
  // Breadcrumbs sit inside the page head or hero (marker), else at the top of <main>.
  let body = String(p.body);
  const nav = String(breadcrumb(crumbs));
  body = body.includes('<!--crumbs-->') ? body.replace('<!--crumbs-->', nav) : (nav ? `<div class="wrap crumbs-row">${nav}</div>${body}` : body);
  return html`<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${headMeta(env, p, crumbs)}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/brand/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://images.unsplash.com">
<link rel="stylesheet" href="${env.assets.css}">
<script>${raw(JS_FLAG)}</script>
<script type="module" src="${env.assets.js}"></script>
${(p.scripts || []).map((n) => env.assets.scripts?.[n] ? html`<script type="module" src="${env.assets.scripts[n]}"></script>` : '')}
${env.analyticsDomain ? html`<script defer data-domain="${env.analyticsDomain}" src="https://plausible.io/js/script.js"></script>` : ''}
${jsonLd(env, p, crumbs)}
</head>
<body class="${p.bodyClass || ''}${p.hero ? ' has-hero' : ''}">
${sprite()}
<a class="skip-link" href="#main">Skip to content</a>
${header(env, p.path)}
<main id="main" tabindex="-1">
${raw(body)}
</main>
${footer(env)}
${p.actionBar === false ? '' : actionBar()}
</body>
</html>
`;
}
