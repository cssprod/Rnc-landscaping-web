// @ts-check
/**
 * JSON-LD node builders (blueprint C6). seo.mjs assembles them into ONE
 * `@graph` per page, linked by `@id`s:
 *   /#business  HomeAndConstructionBusiness (schema.org has no "LandscapingBusiness")
 *   /#website   WebSite
 *   {path}#webpage, {path}#breadcrumb, {path}#service, {path}#faq, {path}#article
 *   /areas/{slug}/#place  one Place per municipality (areaServed, area-page `about`)
 * Rules: no Review / AggregateRating (testimonials are samples, and self-serving
 * review markup is not eligible anyway); business facts that are still bracket
 * tokens are omitted, never published as "[TOKEN]".
 *
 * Page templates pass extra nodes through layout's `jsonld` option:
 *   jsonld: [schema.service(env, svc, path), schema.faqPage(faqs)]   service page
 *   jsonld: [schema.article(env, guide, path, imageUrl)]             guide
 *   jsonld: [schema.faqPage(faqs)]                                   FAQ page
 * Nodes without an `@id` get `{path}#{type}`; any `@context` is stripped.
 */
import { site } from '../../site.config.mjs';
import { val, has } from './tokens.mjs';

/** @typedef {{ origin: string, data: any }} Env */

/** @param {Env} env @param {string} p */
export const abs = (env, p) => `${env.origin}${p}`;

/** @param {Env} env @param {string} path @param {string} frag */
export const nodeId = (env, path, frag) => abs(env, `${path}#${frag}`);

/** Drop undefined / null / empty-array values. @param {Record<string, any>} o */
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && !v.length)));

/** Markdown links → plain text. @param {string} s */
const plain = (s) => String(s || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');

/** Municipalities that are cities or towns (schema.org City = "a city or town"); the rest are district municipalities. */
const CITY_OR_TOWN = new Set(['victoria', 'langford', 'colwood', 'view-royal', 'sidney']);

/** @param {Env} env @param {string} slug */
export const placeId = (env, slug) => abs(env, `/areas/${slug}/#place`);

/** The 13 municipalities as Place nodes. @param {Env} env */
export function places(env) {
  return site.areas.map((a) => ({
    '@type': CITY_OR_TOWN.has(a) ? 'City' : 'AdministrativeArea',
    '@id': placeId(env, a),
    name: `${env.data.areas[a]?.name || a}, BC`,
    containedInPlace: { '@type': 'AdministrativeArea', name: 'Capital Regional District, British Columbia, Canada' },
  }));
}

/** @param {Env} env @param {string} slug */
export const serviceId = (env, slug) => nodeId(env, `/services/${slug}/`, 'service');

/** @param {Env} env */
export function business(env) {
  const hours = (site.openingHours || []).filter((h) => h && h.days?.length && h.opens && h.closes);
  const sameAs = [...site.sameAs, ...(has('GOOGLE PROFILE') ? [val('GOOGLE PROFILE')] : [])];
  return clean({
    '@type': 'HomeAndConstructionBusiness',
    '@id': abs(env, '/#business'),
    name: site.name,
    legalName: val('LEGAL NAME'),
    url: abs(env, '/'),
    logo: abs(env, '/assets/brand/icon-512.png'),
    image: abs(env, '/og/default.jpg'),
    telephone: val('PHONE'),
    email: val('EMAIL'),
    foundingDate: val('FOUNDED'),
    address: clean({ '@type': 'PostalAddress', streetAddress: val('ADDRESS'), addressRegion: 'BC', addressCountry: 'CA' }),
    openingHoursSpecification: hours.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days.map((d) => `https://schema.org/${d}`), opens: h.opens, closes: h.closes })),
    areaServed: site.areas.map((a) => ({ '@id': placeId(env, a) })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${site.name} services`,
      itemListElement: site.services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', '@id': serviceId(env, s), name: env.data.services[s]?.name || s, url: abs(env, `/services/${s}/`) },
      })),
    },
    knowsAbout: site.services.map((s) => env.data.services[s]?.name || s),
    sameAs,
  });
}

/** @param {Env} env */
export const website = (env) => ({
  '@type': 'WebSite',
  '@id': abs(env, '/#website'),
  url: abs(env, '/'),
  name: site.name,
  inLanguage: 'en-CA',
  publisher: { '@id': abs(env, '/#business') },
});

/** WebPage subtype from the path. @param {string} path */
export function pageType(path) {
  if (path === '/about/') return 'AboutPage';
  if (path === '/contact/') return 'ContactPage';
  if (['/services/', '/projects/', '/areas/', '/resources/', '/reviews/'].includes(path)) return 'CollectionPage';
  return 'WebPage';
}

/**
 * @param {Env} env @param {{ path: string, title: string, description: string }} p
 * @param {{ breadcrumb?: boolean, image?: string|null, about?: any, dates?: { published?: string, modified?: string } }} [o]
 */
export const webpage = (env, p, o = {}) => clean({
  '@type': pageType(p.path),
  '@id': nodeId(env, p.path, 'webpage'),
  url: abs(env, p.path),
  name: p.title,
  description: p.description,
  inLanguage: 'en-CA',
  isPartOf: { '@id': abs(env, '/#website') },
  about: o.about,
  breadcrumb: o.breadcrumb ? { '@id': nodeId(env, p.path, 'breadcrumb') } : undefined,
  primaryImageOfPage: o.image ? { '@type': 'ImageObject', url: o.image } : undefined,
  datePublished: o.dates?.published,
  dateModified: o.dates?.modified,
});

/** @param {Env} env @param {{name:string, path:string}[]} crumbs @param {string} [path] page path (for the @id) */
export const breadcrumbs = (env, crumbs, path = crumbs[crumbs.length - 1]?.path || '/') => ({
  '@type': 'BreadcrumbList',
  '@id': nodeId(env, path, 'breadcrumb'),
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: plain(c.name), item: abs(env, c.path) })),
});

/** FAQPage (semantic only; Google stopped showing FAQ rich results in May 2026). @param {{q:string,a:string}[]} faqs */
export const faqPage = (faqs) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: plain(f.q), acceptedAnswer: { '@type': 'Answer', text: plain(f.a) } })),
});

/** @param {Env} env @param {any} svc @param {string} path */
export const service = (env, svc, path) => clean({
  '@type': 'Service',
  '@id': nodeId(env, path, 'service'),
  name: svc.name,
  serviceType: svc.name,
  description: svc.seo?.description,
  url: abs(env, path),
  provider: { '@id': abs(env, '/#business') },
  areaServed: site.areas.map((a) => ({ '@id': placeId(env, a) })),
  mainEntityOfPage: { '@id': nodeId(env, path, 'webpage') },
});

/**
 * Guide article. Author is the named owner once [OWNER NAME] is known (byline
 * "[OWNER NAME], RNC Landscaping" links to /about/); until then the business.
 * `updated` (optional key on resources JSON) becomes dateModified.
 * @param {Env} env @param {any} r @param {string} path @param {string|null} image
 */
export const article = (env, r, path, image) => clean({
  '@type': 'Article',
  '@id': nodeId(env, path, 'article'),
  headline: r.title,
  description: r.seo?.description || r.summary,
  datePublished: r.date,
  dateModified: r.updated || r.dateModified || r.date,
  inLanguage: 'en-CA',
  image: image || undefined,
  mainEntityOfPage: { '@id': nodeId(env, path, 'webpage') },
  author: has('OWNER NAME')
    ? { '@type': 'Person', '@id': abs(env, '/about/#owner'), name: val('OWNER NAME'), url: abs(env, '/about/'), worksFor: { '@id': abs(env, '/#business') } }
    : { '@id': abs(env, '/#business') },
  publisher: { '@id': abs(env, '/#business') },
  citation: (r.sources || []).filter((/** @type {any} */ s) => s?.url).map((/** @type {any} */ s) => clean({ '@type': 'CreativeWork', name: s.label, url: s.url })),
});
