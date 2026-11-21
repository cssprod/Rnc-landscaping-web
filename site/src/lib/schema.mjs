// @ts-check
/**
 * JSON-LD builders. No Review/AggregateRating is emitted: testimonials are
 * samples until RNC supplies real, consented reviews. Business facts that are
 * still placeholders are left out rather than published as "[TOKEN]".
 * Every business fact comes from content/site.json (siteJson): name, NAP, hours,
 * founding year (foundingDate only), the 13 municipalities (areaServed) and the
 * 4 service lines (knowsAbout), so the markup matches the Google Business Profile.
 */
import { siteJson } from '../../site.config.mjs';
import { val } from './tokens.mjs';

/** @typedef {{ origin: string, data: any }} Env */

/** @param {Env} env @param {string} p */
export const abs = (env, p) => `${env.origin}${p}`;

/** Drop undefined values. @param {Record<string, any>} o */
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** @param {Env} env */
export function business(env) {
  const areas = siteJson.municipalities.map((m) => m.name);
  const hours = siteJson.hours?.openingHours || [];
  return clean({
    '@context': 'https://schema.org',
    '@type': 'LandscapingBusiness',
    '@id': abs(env, '/#business'),
    name: siteJson.nap?.name || siteJson.name,
    legalName: val('LEGAL NAME'),
    foundingDate: val('FOUNDED'),
    url: abs(env, '/'),
    logo: abs(env, '/assets/brand/logo-mark.svg'),
    image: abs(env, '/assets/brand/icon-512.png'),
    telephone: val('PHONE'),
    email: val('EMAIL'),
    address: val('ADDRESS') ? { '@type': 'PostalAddress', streetAddress: val('ADDRESS'), addressRegion: 'BC', addressCountry: 'CA' } : { '@type': 'PostalAddress', addressRegion: 'BC', addressCountry: 'CA' },
    openingHours: val('HOURS'),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    areaServed: areas.map((name) => ({ '@type': 'City', name: `${name}, BC` })),
    knowsAbout: siteJson.services.map((s) => s.name),
    ...(siteJson.sameAs?.length ? { sameAs: siteJson.sameAs } : {}),
  });
}

/** @param {Env} env @param {{name:string, path:string}[]} crumbs */
export const breadcrumbs = (env, crumbs) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(env, c.path) })),
});

/** @param {{q:string,a:string}[]} faqs */
export const faqPage = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') } })),
});

/** @param {Env} env @param {any} svc @param {string} path */
export const service = (env, svc, path) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: svc.name,
  serviceType: svc.name,
  description: svc.seo?.description,
  url: abs(env, path),
  provider: { '@id': abs(env, '/#business') },
  areaServed: siteJson.municipalities.map((m) => ({ '@type': 'City', name: `${m.name}, BC` })),
});

/** @param {Env} env @param {any} r @param {string} path @param {string|null} image */
export const article = (env, r, path, image) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: r.title,
  description: r.seo?.description || r.summary,
  datePublished: r.date,
  dateModified: r.date,
  ...(image ? { image } : {}),
  mainEntityOfPage: abs(env, path),
  author: { '@type': 'Organization', name: siteJson.name },
  publisher: { '@id': abs(env, '/#business') },
});
