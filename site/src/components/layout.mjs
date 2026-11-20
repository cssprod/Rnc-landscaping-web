// @ts-check
/**
 * Page shell: <head>, header with mega-menu, breadcrumbs, footer.
 * (Astro port: layouts/Base.astro + components/Header.astro, Footer.astro.)
 */
import { html, raw } from '../lib/html.mjs';
import { site } from '../../site.config.mjs';
import { tok, telHref } from '../lib/tokens.mjs';
import { ogUrl } from '../lib/images.mjs';
import * as schema from '../lib/schema.mjs';

/** Inline script that flags JS support before first paint (hash pinned in netlify.toml CSP). */
export const JS_FLAG = "document.documentElement.classList.add('js')";

/**
 * @typedef {{ name: string, path: string }} Crumb
 * @typedef {{ production: boolean, context: string, origin: string, data: any, assets: { css: string, js: string }, fontsUrl: string|null, hasCapability?: boolean }} Env
 */

/** @param {Env} env @param {string} name */
const serviceName = (env, name) => env.data.services[name]?.navLabel || env.data.services[name]?.name || name;

/** @param {Env} env @param {string} path */
function header(env, path) {
  const is = (/** @type {string} */ p) => (path === p || path.startsWith(p) ? raw(' aria-current="page"') : '');
  const svcLinks = site.services.map((s) => {
    const svc = env.data.services[s];
    return html`<li><a href="/services/${s}/" class="mega__link"><span class="mega__name">${serviceName(env, s)}</span><span class="mega__desc">${(svc?.includes || []).slice(0, 3).map((/** @type {any} */ i) => i.title).join(', ')}</span></a></li>`;
  });
  return html`<header class="site-header" data-header>
  <div class="site-header__inner wrap">
    <a class="brand" href="/"><img src="/assets/brand/logo.svg" width="225" height="40" alt="RNC Landscaping home"></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle><span class="nav-toggle__bars" aria-hidden="true"></span>Menu</button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul class="site-nav__list">
        <li class="site-nav__item has-mega" data-mega>
          <a href="/services/"${is('/services/')}>Services</a><button type="button" class="mega-toggle" aria-expanded="false" aria-controls="mega-services" data-mega-toggle><span class="vh">Show service pages</span><svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
          <div class="mega" id="mega-services" data-mega-panel>
            <ul class="mega__list">${svcLinks}</ul>
            <div class="mega__aside"><p>Working across all 13 Greater Victoria municipalities, from Sidney to Sooke.</p><a href="/areas/">See service areas</a><a href="/commercial/">Commercial and public sector</a></div>
          </div>
        </li>
        <li class="site-nav__item"><a href="/portfolio/"${is('/portfolio/')}>Portfolio</a></li>
        <li class="site-nav__item"><a href="/areas/"${is('/areas/')}>Areas</a></li>
        <li class="site-nav__item"><a href="/commercial/"${is('/commercial/')}>Commercial</a></li>
        <li class="site-nav__item"><a href="/about/"${is('/about/')}>About</a></li>
        <li class="site-nav__item"><a href="/resources/"${is('/resources/')}>Resources</a></li>
        <li class="site-nav__item"><a href="/contact/"${is('/contact/')}>Contact</a></li>
      </ul>
      <div class="site-nav__actions">
        <a class="phone-link" href="${telHref()}" data-track="call_clicked" data-track-location="header"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.6a1 1 0 01-.25 1z" fill="currentColor"/></svg><span>Call [PHONE]</span></a>
        <a class="btn btn--accent" href="/quote/">Get a Free Quote</a>
      </div>
    </nav>
  </div>
</header>`;
}

/** @param {Crumb[]} crumbs */
export function breadcrumbNav(crumbs) {
  if (crumbs.length < 2) return '';
  return html`<nav class="crumbs wrap" aria-label="Breadcrumb"><ol>${crumbs.map((c, i) =>
    i === crumbs.length - 1 ? html`<li><a href="${c.path}" aria-current="page">${c.name}</a></li>` : html`<li><a href="${c.path}">${c.name}</a></li>`)}</ol></nav>`;
}

/** @param {Env} env */
function footer(env) {
  return html`<footer class="site-footer">
  <div class="wrap site-footer__grid">
    <div class="site-footer__nap">
      <img src="/assets/brand/logo-reversed.svg" width="225" height="40" alt="RNC Landscaping" loading="lazy">
      <address>
        <p>${site.name}<br>[ADDRESS]</p>
        <p><a href="${telHref()}" data-track="call_clicked" data-track-location="footer">[PHONE]</a><br><a href="mailto:${tok('EMAIL')}" data-track="email_clicked" data-track-location="footer">[EMAIL]</a></p>
        <p>Hours: [HOURS]</p>
      </address>
      <a class="btn btn--accent" href="/quote/">Get a Free Quote</a>
    </div>
    <nav aria-label="Services" class="site-footer__col"><h2>Services</h2><ul>${site.services.map((s) => html`<li><a href="/services/${s}/">${serviceName(env, s)}</a></li>`)}<li><a href="/commercial/">Commercial and public sector</a></li></ul></nav>
    <nav aria-label="Service areas" class="site-footer__col site-footer__areas"><h2>Areas we serve</h2><ul>${site.areas.map((a) => html`<li><a href="/areas/${a}/">${env.data.areas[a]?.name || a}</a></li>`)}</ul></nav>
    <nav aria-label="Company" class="site-footer__col"><h2>Company</h2><ul>
      <li><a href="/about/">About</a></li><li><a href="/portfolio/">Portfolio</a></li><li><a href="/reviews/">Reviews</a></li>
      <li><a href="/resources/">Resources</a></li><li><a href="/faq/">FAQ</a></li><li><a href="/contact/">Contact</a></li></ul></nav>
  </div>
  <div class="wrap site-footer__legal">
    <p>© [YEAR] [LEGAL NAME]. Serving ${site.region}.</p>
    <ul><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li><li><a href="/accessibility/">Accessibility</a></li></ul>
  </div>
</footer>`;
}

/**
 * @param {Env} env
 * @param {{ path: string, title: string, description: string, crumbs?: Crumb[], body: any, jsonld?: object[], ogImage?: string, bodyClass?: string, noindex?: boolean }} p
 */
export function layout(env, p) {
  const crumbs = p.crumbs || [{ name: 'Home', path: '/' }];
  const canonical = env.production ? `${env.origin}${p.path}` : p.path;
  const og = (p.ogImage && ogUrl(p.ogImage)) || ogUrl('og-default');
  const ld = [schema.business(env), ...(crumbs.length > 1 ? [schema.breadcrumbs(env, crumbs)] : []), ...(p.jsonld || [])];
  const noindex = !env.production || p.noindex;
  return html`<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
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
<meta name="twitter:title" content="${p.title}">
<meta name="twitter:description" content="${p.description}">
<meta name="theme-color" content="#2E4A3B">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
${env.fontsUrl ? html`<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${env.fontsUrl}">` : ''}
<link rel="stylesheet" href="${env.assets.css}">
<script>${raw(JS_FLAG)}</script>
<script type="module" src="${env.assets.js}"></script>
${env.production ? html`<script defer data-domain="[PLAUSIBLE DOMAIN]" src="https://plausible.io/js/script.js"></script>` : ''}
${ld.map((o) => html`<script type="application/ld+json">${raw(JSON.stringify(o).replace(/</g, '\\u003c'))}</script>`)}
</head>
<body class="${p.bodyClass || ''}">
<a class="skip-link" href="#main">Skip to content</a>
${env.production ? '' : html`<div class="staging-bar" role="note">Preview build (${env.context}). Highlighted <mark class="ph">[TOKENS]</mark> and items labelled Sample are placeholders.</div>`}
${header(env, p.path)}
${breadcrumbNav(crumbs)}
<main id="main" tabindex="-1">
${p.body}
</main>
${footer(env)}
</body>
</html>
`;
}
