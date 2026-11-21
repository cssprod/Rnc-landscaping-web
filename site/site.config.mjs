// @ts-check
/**
 * Site settings, read from the single source of truth: content/site.json
 * (CONTRACT §6; frozen after W1). Business facts live ONLY there: never type a
 * phone number, address, founding year or municipality list into a template.
 *
 * Every value in site.json `tokens` that is still `null` renders as its bracket
 * token. Showcase builds (the default) display unresolved tokens as small
 * placeholder chips. A launch build (SITE_MODE=launch) fails while any required
 * token is still unresolved, so fill these in (in content/site.json) before going live.
 *
 * Only the token names listed in CONTRACT.md §3 are allowed.
 * When content/ holds no site.json (fixture builds), site/fixtures/content/site.json is used.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** @typedef {'PHONE'|'EMAIL'|'HOURS'|'ADDRESS'|'LEGAL NAME'|'YEAR'|'CREW SIZE'|'OWNER NAME'|'OWNER BIO'|'LIABILITY LIMIT'|'WORKSAFEBC STATUS'|'LICENCES'|'CERTIFICATIONS'|'MEMBERSHIPS'|'WARRANTY'|'DOMAIN'|'REPLY TIME'|'GOOGLE PROFILE'|'FOUNDED'|'PLAUSIBLE DOMAIN'} TokenName */

/**
 * The CONTRACT §3 token names, in order. Notes on each:
 * PHONE e.g. "250-555-0100" (tel: and sms: are derived from it); EMAIL the public address the quote builder composes to;
 * HOURS display string; ADDRESS or "Serving Greater Victoria"; YEAR copyright year; LIABILITY LIMIT e.g. "$5 million CGL";
 * DOMAIN bare host (required for SITE_MODE=launch); REPLY TIME e.g. "2 business days" (/free-quote/, CTA band, contact);
 * GOOGLE PROFILE optional, unset in launch omits every link built on it; FOUNDED optional four-digit year, JSON-LD
 * foundingDate only (never visible copy); PLAUSIBLE DOMAIN optional, turns on cookieless analytics in launch builds.
 * @type {TokenName[]}
 */
export const TOKEN_ORDER = ['PHONE', 'EMAIL', 'HOURS', 'ADDRESS', 'LEGAL NAME', 'YEAR', 'CREW SIZE', 'OWNER NAME', 'OWNER BIO',
  'LIABILITY LIMIT', 'WORKSAFEBC STATUS', 'LICENCES', 'CERTIFICATIONS', 'MEMBERSHIPS', 'WARRANTY', 'DOMAIN', 'REPLY TIME',
  'GOOGLE PROFILE', 'FOUNDED', 'PLAUSIBLE DOMAIN'];

/** Tokens a launch build may leave empty (features that simply stay off). */
export const optionalTokens = /** @type {TokenName[]} */ (['PLAUSIBLE DOMAIN', 'GOOGLE PROFILE', 'FOUNDED']);

const REAL = fileURLToPath(new URL('../content/site.json', import.meta.url));
const FIXTURE = fileURLToPath(new URL('./fixtures/content/site.json', import.meta.url));
/** Path of the site.json in use (the real one, else the fixture). */
export const siteJsonPath = existsSync(REAL) ? REAL : FIXTURE;

/**
 * @typedef {{ slug: string, name: string, navLabel?: string }} SiteService
 * @typedef {{ slug: string, name: string }} SiteMunicipality
 * @typedef {{ id: string, label: string, value: string, issuerUrl: string|null }} SiteCredential
 * @typedef {{ tokens: Record<string, string|null>, name: string, shortName: string, locale: string, region: string,
 *   nap: { name: string, legalName: string, address: string, phone: string, email: string },
 *   hours: { display: string, openingHours: object[] }, replyTime: string, googleProfile: string, founded: string,
 *   owner: { name: string, bio: string, photo: string }, crewSize: string, warranty: string,
 *   services: SiteService[], municipalities: SiteMunicipality[], credentials: SiteCredential[], sameAs: string[],
 *   capabilityStatement: string }} SiteJson
 */

/** content/site.json as loaded (single source; consumers read it through this object). @type {SiteJson} */
export const siteJson = JSON.parse(readFileSync(siteJsonPath, 'utf8'));

/** @type {Record<TokenName, string|null>} */
export const tokens = /** @type {any} */ (Object.fromEntries(TOKEN_ORDER.map((k) => [k, siteJson.tokens?.[k] ?? null])));

export const site = {
  name: siteJson.name,
  shortName: siteJson.shortName,
  locale: siteJson.locale,
  region: siteJson.region,
  /** Ordered service slugs (contract), from site.json services. */
  services: siteJson.services.map((s) => s.slug),
  /** Ordered area slugs (contract), from site.json municipalities. */
  areas: siteJson.municipalities.map((m) => m.slug),
  /** Profiles RNC controls (used for sameAs in JSON-LD). */
  sameAs: /** @type {string[]} */ (siteJson.sameAs || []),
  /** Public path of the capability statement PDF (copy links to it). Put the file at static/downloads/. */
  capabilityStatement: siteJson.capabilityStatement,
  /** Responsive widths requested from the photo CDN. */
  imageWidths: [480, 800, 1200, 1600, 2000, 2400],
};

export default { tokens, site, optionalTokens, siteJson };
