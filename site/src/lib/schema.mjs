// @ts-check
/**
 * JSON-LD builders. No Review/AggregateRating is emitted: testimonials are
 * samples until RNC supplies real, consented reviews.
 */
import { site } from '../../site.config.mjs';
import { tok } from './tokens.mjs';

/** @typedef {{ origin: string, data: any }} Env */

/** @param {Env} env @param {string} p */
export const abs = (env, p) => `${env.origin}${p}`;

/** @param {Env} env */
export function business(env) {
  const areas = site.areas.map((a) => env.data.areas[a]?.name || a);
  return {
    '@context': 'https://schema.org',
    '@type': 'LandscapingBusiness',
    '@id': abs(env, '/#business'),
    name: site.name,
    legalName: tok('LEGAL NAME'),
    url: abs(env, '/'),
    logo: abs(env, '/assets/brand/logo.svg'),
    image: abs(env, '/assets/brand/logo.svg'),
    telephone: tok('PHONE'),
    email: tok('EMAIL'),
    address: { '@type': 'PostalAddress', streetAddress: tok('ADDRESS'), addressRegion: 'BC', addressCountry: 'CA' },
    openingHours: tok('HOURS'),
    areaServed: areas.map((name) => ({ '@type': 'City', name: `${name}, BC` })),
    knowsAbout: site.services.map((s) => env.data.services[s]?.name || s),
    ...(site.sameAs.length ? { sameAs: site.sameAs } : {}),
  };
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
  areaServed: site.areas.map((a) => ({ '@type': 'City', name: `${env.data.areas[a]?.name || a}, BC` })),
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
  author: { '@type': 'Organization', name: site.name },
  publisher: { '@id': abs(env, '/#business') },
});
