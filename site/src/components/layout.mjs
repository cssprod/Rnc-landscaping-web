// @ts-check
/**
 * Page shell: <head>, floating glass navigation capsule with the services
 * panel, breadcrumbs, footer.
 */
import { html, raw } from '../lib/html.mjs';
import { site } from '../../site.config.mjs';
import { has, telHref, telLink, mailLink } from '../lib/tokens.mjs';
import { ogUrl } from '../lib/images.mjs';
import * as schema from '../lib/schema.mjs';
import { sprite, icon, logo, SERVICE_ICON } from './sprite.mjs';

/** Inline script that flags JS support before first paint (hash pinned in netlify.toml CSP). */
export const JS_FLAG = "document.documentElement.classList.add('js')";

/**
 * @typedef {{ name: string, path: string }} Crumb
 * @typedef {{ launch: boolean, context: string, origin: string, data: any, assets: { css: string, js: string }, hasCapability?: boolean, analyticsDomain?: string|null }} Env
 */

/** @param {Env} env @param {string} name */
const serviceName = (env, name) => env.data.services[name]?.navLabel || env.data.services[name]?.name || name;

const NAV = [
  ['Portfolio', '/portfolio/'], ['Areas', '/areas/'], ['Commercial', '/commercial/'],
  ['About', '/about/'], ['Resources', '/resources/'], ['Contact', '/contact/'],
];

/** @param {Env} env @param {string} path */
function header(env, path) {
  const cur = (/** @type {string} */ p) => (path === p || (p !== '/' && path.startsWith(p)) ? raw(' aria-current="page"') : '');
  const svc = site.services.map((s) => {
    const d = env.data.services[s];
    const blurb = (d?.includes || []).slice(0, 3).map((/** @type {any} */ i) => i.title).join(', ');
    return html`<li><a href="/services/${s}/" class="mega__link"${cur(`/services/${s}/`)}><span class="mega__icon">${icon(SERVICE_ICON[/** @type {keyof typeof SERVICE_ICON} */ (s)] || 'leaf', { size: 22 })}</span><span class="mega__name">${serviceName(env, s)}</span><span class="mega__desc">${blurb}</span></a></li>`;
  });
  return html`<header class="site-header" data-header>
  <div class="nav-capsule">
    <a class="brand" href="/" aria-label="RNC Landscaping home">${logo()}</a>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul class="site-nav__list">
        <li class="site-nav__item has-mega" data-mega>
          <a href="/services/"${cur('/services/')}>Services</a><button type="button" class="mega-toggle" aria-expanded="false" aria-controls="mega-services" data-mega-toggle><span class="vh">Show service pages</span>${icon('chevron', { size: 16 })}</button>
          <div class="mega" id="mega-services" data-mega-panel>
            <ul class="mega__list">${svc}</ul>
            <div class="mega__aside">
              <p>Working across all 13 Greater Victoria municipalities, from Sidney to Sooke.</p>
              <a href="/areas/">${icon('map', { size: 18 })} Service areas</a>
              <a href="/commercial/">${icon('doc', { size: 18 })} Commercial and public sector</a>
            </div>
          </div>
        </li>
        ${NAV.map(([label, href]) => html`<li class="site-nav__item"><a href="${href}"${cur(href)}>${label}</a></li>`)}
      </ul>
      <div class="site-nav__actions">
        ${has('PHONE') ? html`<a class="icon-btn phone-link" href="${telHref()}" data-track="call_clicked" data-track-location="header">${icon('phone', { size: 18 })}<span class="phone-link__label">Call [PHONE]</span></a>` : ''}
        <a class="btn btn--primary btn--sm" href="/quote/">Get a free quote</a>
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

/** @param {Env} env */
function footer(env) {
  return html`<footer class="site-footer">
  <div class="site-footer__glow" aria-hidden="true"></div>
  <div class="wrap site-footer__top">
    <div class="site-footer__brand">
      <a class="brand brand--footer" href="/" aria-label="RNC Landscaping home">${logo()}</a>
      <p>Grounds care, landscape installation, irrigation and tree work for homes, stratas and managed sites across ${site.region}.</p>
      <a class="btn btn--light" href="/quote/">Get a free quote</a>
    </div>
    <nav aria-label="Services" class="site-footer__col"><h2>Services</h2><ul>${site.services.map((s) => html`<li><a href="/services/${s}/">${serviceName(env, s)}</a></li>`)}<li><a href="/commercial/">Commercial and public sector</a></li></ul></nav>
    <nav aria-label="Service areas" class="site-footer__col site-footer__areas"><h2>Areas we serve</h2><ul>${site.areas.map((a) => html`<li><a href="/areas/${a}/">${env.data.areas[a]?.name || a}</a></li>`)}</ul></nav>
    <nav aria-label="Company" class="site-footer__col"><h2>Company</h2><ul>
      <li><a href="/about/">About</a></li><li><a href="/portfolio/">Portfolio</a></li><li><a href="/reviews/">Reviews</a></li>
      <li><a href="/resources/">Resources</a></li><li><a href="/faq/">FAQ</a></li><li><a href="/contact/">Contact</a></li></ul></nav>
    <div class="site-footer__col site-footer__contact"><h2>Contact</h2>
      <address>
        <p>${icon('phone', { size: 16 })} ${telLink('footer')}</p>
        <p>${icon('mail', { size: 16 })} ${mailLink('footer')}</p>
        <p>${icon('clock', { size: 16 })} <span>[HOURS]</span></p>
        <p>${icon('pin', { size: 16 })} <span>[ADDRESS]</span></p>
      </address>
    </div>
  </div>
  <div class="wrap site-footer__legal">
    <p>© [YEAR] [LEGAL NAME]. Serving ${site.region}.</p>
    <ul><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li><li><a href="/accessibility/">Accessibility</a></li></ul>
  </div>
  ${env.launch ? '' : html`<p class="wrap site-footer__note">Showcase edition: highlighted details are placeholders still to be confirmed, and work labelled Sample is illustrative.</p>`}
</footer>`;
}

/**
 * @param {Env} env
 * @param {{ path: string, title: string, description: string, crumbs?: Crumb[], body: any, jsonld?: object[], ogImage?: string, bodyClass?: string, noindex?: boolean, hero?: boolean }} p
 */
export function layout(env, p) {
  const crumbs = p.crumbs || [{ name: 'Home', path: '/' }];
  const canonical = env.launch ? `${env.origin}${p.path}` : p.path;
  const og = (p.ogImage && ogUrl(p.ogImage)) || ogUrl('og-default');
  const ld = [schema.business(env), ...(crumbs.length > 1 ? [schema.breadcrumbs(env, crumbs)] : []), ...(p.jsonld || [])];
  const noindex = !env.launch || p.noindex;
  // Breadcrumbs sit inside the page head or hero (marker), else at the top of <main>.
  let body = String(p.body);
  const nav = String(breadcrumbNav(crumbs));
  body = body.includes('<!--crumbs-->') ? body.replace('<!--crumbs-->', nav) : (nav ? `<div class="wrap crumbs-row">${nav}</div>${body}` : body);
  return html`<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${p.title}</title>
<meta name="description" content="${p.description}">
<link rel="canonical" href="${canonical}">
${noindex ? raw('<meta name="robots" content="noindex, nofollow">') : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="en_CA">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.description}">
<meta property="og:url" content="${canonical}">
${og ? html`<meta property="og:image" content="${og}">` : ''}
<meta name="twitter:card" content="${og ? 'summary_large_image' : 'summary'}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#F4F6F2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0A0E0C" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/brand/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://images.unsplash.com">
<link rel="stylesheet" href="${env.assets.css}">
<script>${raw(JS_FLAG)}</script>
<script type="module" src="${env.assets.js}"></script>
${env.analyticsDomain ? html`<script defer data-domain="${env.analyticsDomain}" src="https://plausible.io/js/script.js"></script>` : ''}
${ld.map((o) => html`<script type="application/ld+json">${raw(JSON.stringify(o).replace(/</g, '\\u003c'))}</script>`)}
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
