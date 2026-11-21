// @ts-check
/**
 * Business facts and site settings, read from the single source of truth
 * content/site.json (NAP, hours, credentials, service list, municipality list).
 * Edit content/site.json, not this file.
 *
 * Every token whose value is still `null` renders as its bracket token
 * (for example "[PHONE]"). Showcase builds (the default) display unresolved
 * tokens as small placeholder chips. A launch build (SITE_MODE=launch) fails
 * while any non-optional token is still unresolved.
 */
import { readFileSync } from 'node:fs';

/** @typedef {'PHONE'|'EMAIL'|'HOURS'|'ADDRESS'|'LEGAL NAME'|'YEAR'|'CREW SIZE'|'OWNER NAME'|'OWNER BIO'|'LIABILITY LIMIT'|'WORKSAFEBC STATUS'|'LICENCES'|'CERTIFICATIONS'|'MEMBERSHIPS'|'WARRANTY'|'REPLY TIME'|'GOOGLE PROFILE'|'FOUNDED'|'DOMAIN'|'PLAUSIBLE DOMAIN'} TokenName */

const SOURCE = new URL('../content/site.json', import.meta.url);
const FIXTURE = new URL('./fixtures/content/site.json', import.meta.url);
/** @type {any} */
let raw;
try { raw = JSON.parse(readFileSync(SOURCE, 'utf8')); }
catch { raw = JSON.parse(readFileSync(FIXTURE, 'utf8')); }

/** @type {Record<TokenName, string|null>} */
export const tokens = raw.tokens;

/** Tokens a launch build may leave empty (features that simply stay off). */
export const optionalTokens = /** @type {TokenName[]} */ (raw.optionalTokens || ['PLAUSIBLE DOMAIN']);

export const site = {
  name: /** @type {string} */ (raw.business?.name || 'RNC Landscaping'),
  shortName: /** @type {string} */ (raw.business?.shortName || 'RNC'),
  locale: /** @type {string} */ (raw.business?.locale || 'en-CA'),
  region: /** @type {string} */ (raw.business?.region || 'Greater Victoria, BC'),
  /** Ordered service slugs (contract). @type {string[]} */
  services: raw.services,
  /** Ordered municipality slugs (contract). @type {string[]} */
  areas: raw.areas,
  /** Structured opening hours for JSON-LD, or null until confirmed. @type {{days:string[], opens:string, closes:string}[]|null} */
  openingHours: raw.openingHours || null,
  /** Profiles RNC controls (JSON-LD sameAs). @type {string[]} */
  sameAs: raw.sameAs || [],
  /** Public path of the capability statement PDF. Put the file at site/static/downloads/. */
  capabilityStatement: /** @type {string} */ (raw.capabilityStatement || ''),
  /** Responsive widths: srcset candidates for photos (blueprint C4: 480/768/1024/1600). */
  imageWidths: [480, 768, 1024, 1600],
};

export default { tokens, site, optionalTokens };
