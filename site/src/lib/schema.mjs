// @ts-check
/**
 * JSON-LD node builders for the one-graph-per-page markup (blueprint C6; CONTRACT §2, §6).
 *
 * lib/seo.mjs assembles one `{"@context":"https://schema.org","@graph":[…]}` per page from these nodes. Every node carries
 * an `@id` (`<url>#<fragment>`), and nodes point at each other by `{"@id"}` reference:
 *   /#business   HomeAndConstructionBusiness (schema.org has no LandscapingBusiness type), areaServed = the 13
 *                municipalities (/areas/<slug>/#place), hasOfferCatalog (/#services) = the 4 service lines
 *   /#website    WebSite, publisher → business
 *   <path>#webpage, #breadcrumb, #service, #article   per page (seo.mjs adds the WebPage itself)
 * Rules:
 *   - No Review or AggregateRating anywhere: testimonials are samples until RNC supplies real, consented reviews.
 *   - No prices, price ranges or offers with amounts.
 *   - Business facts come from content/site.json only. A fact that is still a placeholder token is left out, never
 *     published as "[TOKEN]": resolved tokens are substituted here (raw, not HTML-escaped) and any string that still
 *     holds an unresolved token is dropped (see scrub()).
 *   - [FOUNDED] appears only here, as foundingDate.
 * The page families call service(), faqPage(), article() and breadcrumbs() with the signatures they had in W1;
 * the extra arguments are optional.
 */
import { siteJson, tokens } from '../../site.config.mjs';
import { val, TOKEN_RE } from './tokens.mjs';

/** @typedef {{ origin: string, data?: any, launch?: boolean }} Env */
/** @typedef {Record<string, any>} Node */

export const CONTEXT = 'https://schema.org';
/** The business subtype (the most specific accurate schema.org type for a landscaping contractor). */
export const BUSINESS_TYPE = 'HomeAndConstructionBusiness';
/** Types never emitted (CONTRACT §2). */
export const FORBIDDEN_TYPES = ['Review', 'AggregateRating'];

/** Absolute URL in launch builds (origin "https://<domain>"); a root-relative path in showcase builds. @param {Env} env @param {string} p */
export const abs = (env, p) => `${env.origin || ''}${p}`;

/** The `@id` of a node. @param {Env} env @param {string} path @param {string} frag */
export const nodeId = (env, path, frag) => abs(env, `${path}#${frag}`);

/** Stable ids used across pages. */
export const ids = {
  business: (/** @type {Env} */ env) => nodeId(env, '/', 'business'),
  website: (/** @type {Env} */ env) => nodeId(env, '/', 'website'),
  catalog: (/** @type {Env} */ env) => nodeId(env, '/', 'services'),
  place: (/** @type {Env} */ env, /** @type {string} */ slug) => nodeId(env, `/areas/${slug}/`, 'place'),
  service: (/** @type {Env} */ env, /** @type {string} */ slug) => nodeId(env, `/services/${slug}/`, 'service'),
  webpage: (/** @type {Env} */ env, /** @type {string} */ path) => nodeId(env, path, 'webpage'),
  breadcrumb: (/** @type {Env} */ env, /** @type {string} */ path) => nodeId(env, path, 'breadcrumb'),
  article: (/** @type {Env} */ env, /** @type {string} */ path) => nodeId(env, path, 'article'),
  author: (/** @type {Env} */ env) => nodeId(env, '/about/', 'owner'),
};

/** `{"@id"}` reference. @param {string} id */
export const ref = (id) => ({ '@id': id });

/**
 * Substitute resolved tokens; return undefined when an unresolved token remains (placeholders are omitted).
 * @param {string} s
 */
export function resolveText(s) {
  let left = false;
  const out = s.replace(TOKEN_RE, (m, name) => {
    const v = tokens[/** @type {keyof typeof tokens} */ (name)];
    if (v == null || v === '') { left = true; return m; }
    return String(v);
  });
  return left ? undefined : out;
}

/** Markdown links to their text ("[guide](/resources/x/)" → "guide"); bracket tokens are not links. @param {string} s */
export const plain = (s) => s.replace(/\[([^\]]+)\]\((?:[^)\s]+)\)/g, '$1').replace(/\s+/g, ' ').trim();

/**
 * Deep clean: drop undefined/null/empty values, resolve tokens, drop strings that still hold a placeholder.
 * @template T @param {T} v @returns {T|undefined}
 */
export function scrub(v) {
  if (v == null) return undefined;
  if (typeof v === 'string') { const r = resolveText(v); return /** @type {any} */ (r === undefined || r === '' ? undefined : r); }
  if (Array.isArray(v)) { const a = v.map(scrub).filter((x) => x !== undefined); return /** @type {any} */ (a.length ? a : undefined); }
  if (typeof v === 'object') {
    const o = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)]).filter(([, x]) => x !== undefined));
    return /** @type {any} */ (Object.keys(o).length ? o : undefined);
  }
  return v;
}

/** The 13 municipalities as places, each with its own @id (CONTRACT §1). @param {Env} env */
export const places = (env) => siteJson.municipalities.map((m) => ({
  '@type': 'AdministrativeArea', '@id': ids.place(env, m.slug), name: `${m.name}, BC`,
}));

/** Short stub of one service line: enough to stand on its own on pages without the full Service node. @param {Env} env @param {{slug: string, name: string}} s */
const serviceStub = (env, s) => ({ '@type': 'Service', '@id': ids.service(env, s.slug), name: s.name, url: abs(env, `/services/${s.slug}/`) });

/** Opening hours: only structured OpeningHoursSpecification objects from site.json (the [HOURS] display string is not schema syntax). */
const openingHours = () => {
  const h = /** @type {any[]} */ (siteJson.hours?.openingHours || []);
  return h.length ? h.map((x) => ({ '@type': 'OpeningHoursSpecification', ...x })) : undefined;
};

/** Profiles RNC controls (site.json sameAs) plus the Google Business Profile once it is known. */
const sameAs = () => {
  const list = [...(siteJson.sameAs || []), val('GOOGLE PROFILE')].filter((u) => typeof u === 'string' && /^https:\/\//.test(u));
  return list.length ? [...new Set(list)] : undefined;
};

/** The business node. @param {Env} env @returns {Node} */
export function business(env) {
  const address = val('ADDRESS');
  return /** @type {Node} */ (scrub({
    '@type': BUSINESS_TYPE,
    '@id': ids.business(env),
    name: siteJson.nap?.name || siteJson.name,
    legalName: val('LEGAL NAME'),
    foundingDate: val('FOUNDED'),
    url: abs(env, '/'),
    logo: { '@type': 'ImageObject', url: abs(env, '/assets/brand/icon-512.png'), width: 512, height: 512 },
    image: abs(env, '/assets/brand/icon-512.png'),
    telephone: val('PHONE'),
    email: val('EMAIL'),
    // A service-area business that hides its street address keeps region and country only (CONTRACT §3 [ADDRESS]).
    address: { '@type': 'PostalAddress', streetAddress: address && !/^serving\b/i.test(address) ? address : undefined, addressRegion: 'BC', addressCountry: 'CA' },
    openingHoursSpecification: openingHours(),
    areaServed: places(env),
    knowsAbout: siteJson.services.map((s) => s.name),
    hasOfferCatalog: {
      '@type': 'OfferCatalog', '@id': ids.catalog(env), name: 'Landscaping services',
      itemListElement: siteJson.services.map((s) => serviceStub(env, s)),
    },
    sameAs: sameAs(),
  }));
}

/** @param {Env} env @returns {Node} */
export const website = (env) => /** @type {Node} */ (scrub({
  '@type': 'WebSite', '@id': ids.website(env), url: abs(env, '/'), name: siteJson.name, inLanguage: 'en-CA', publisher: ref(ids.business(env)),
}));

/**
 * BreadcrumbList for depth-2+ pages. The @id is taken from the last crumb's path unless `path` is given.
 * @param {Env} env @param {{name:string, path:string}[]} crumbs @param {string} [path]
 */
export const breadcrumbs = (env, crumbs, path = crumbs[crumbs.length - 1]?.path || '/') => /** @type {Node} */ (scrub({
  '@type': 'BreadcrumbList',
  '@id': ids.breadcrumb(env, path),
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(env, c.path) })),
}));

/**
 * FAQPage content (semantic only; FAQ rich results stopped on 7 May 2026). seo.mjs folds it into the page's own WebPage
 * node, so one URL never carries two page nodes. A question whose answer still holds a placeholder is left out.
 * @param {{q:string,a:string}[]} faqs
 */
export const faqPage = (faqs) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => {
    const name = resolveText(plain(f.q));
    const text = resolveText(plain(f.a));
    return name && text ? { '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } } : null;
  }).filter(Boolean),
});

/**
 * One service line on its own page. provider → business; areaServed = the 13 places (same @ids as the business's).
 * @param {Env} env @param {any} svc @param {string} path
 */
export const service = (env, svc, path) => /** @type {Node} */ (scrub({
  '@type': 'Service',
  '@id': svc.slug ? ids.service(env, svc.slug) : nodeId(env, path, 'service'),
  name: svc.name,
  serviceType: svc.name,
  description: svc.seo?.description,
  url: abs(env, path),
  provider: ref(ids.business(env)),
  areaServed: places(env),
  mainEntityOfPage: ref(ids.webpage(env, path)),
}));

/**
 * A guide. author is the named owner once [OWNER NAME] is known ("[OWNER NAME], RNC Landscaping" → /about/), else the
 * business itself; dates are the guide's real `published` and `updated` (never invented).
 * @param {Env} env @param {any} r @param {string} path @param {string|null} [image]
 */
export function article(env, r, path, image) {
  const published = r.published || r.date;
  const ownerName = r.author?.name ? resolveText(r.author.name) : undefined;
  const author = ownerName
    ? { '@type': 'Person', '@id': ids.author(env), name: ownerName, url: abs(env, r.author?.url || '/about/'), worksFor: ref(ids.business(env)) }
    : ref(ids.business(env));
  return /** @type {Node} */ (scrub({
    '@type': 'Article',
    '@id': ids.article(env, path),
    headline: r.title,
    description: r.seo?.description || r.summary,
    datePublished: published,
    dateModified: r.updated || published,
    inLanguage: 'en-CA',
    image: image || undefined,
    mainEntityOfPage: ref(ids.webpage(env, path)),
    author,
    publisher: ref(ids.business(env)),
  }));
}
