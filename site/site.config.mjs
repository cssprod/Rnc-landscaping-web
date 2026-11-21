// @ts-check
/**
 * Single source of truth for business facts and site settings.
 *
 * Every value in `tokens` that is still `null` renders as its bracket token
 * (for example "[PHONE]"). Showcase builds (the default) display unresolved
 * tokens as small placeholder chips. A launch build (SITE_MODE=launch) fails
 * while any token is still unresolved, so fill these in before going live.
 *
 * Only the token names listed in CONTRACT.md are allowed here.
 */

/** @typedef {'PHONE'|'EMAIL'|'HOURS'|'ADDRESS'|'LEGAL NAME'|'YEAR'|'CREW SIZE'|'OWNER NAME'|'OWNER BIO'|'LIABILITY LIMIT'|'WORKSAFEBC STATUS'|'LICENCES'|'CERTIFICATIONS'|'MEMBERSHIPS'|'WARRANTY'|'DOMAIN'|'PLAUSIBLE DOMAIN'} TokenName */

/** @type {Record<TokenName, string|null>} */
export const tokens = {
  PHONE: null, // e.g. "250-555-0100"
  EMAIL: null, // public contact address; the quote form composes an email to it
  HOURS: null, // e.g. "Mon–Fri 7:30 am – 5 pm"
  ADDRESS: null, // mailing or service address (or "Serving Greater Victoria")
  'LEGAL NAME': null,
  YEAR: null, // copyright year owner prefers; leave null to be prompted
  'CREW SIZE': null,
  'OWNER NAME': null,
  'OWNER BIO': null,
  'LIABILITY LIMIT': null, // e.g. "$5 million CGL"
  'WORKSAFEBC STATUS': null,
  LICENCES: null, // business licences held
  CERTIFICATIONS: null,
  MEMBERSHIPS: null,
  WARRANTY: null,
  DOMAIN: null, // bare host, e.g. "rnclandscaping.ca" (required for SITE_MODE=launch)
  'PLAUSIBLE DOMAIN': null, // optional: set to turn on cookieless analytics in launch builds
};

/** Tokens a launch build may leave empty (features that simply stay off). */
export const optionalTokens = /** @type {TokenName[]} */ (['PLAUSIBLE DOMAIN']);

export const site = {
  name: 'RNC Landscaping',
  shortName: 'RNC',
  locale: 'en-CA',
  region: 'Greater Victoria, BC',
  /** Ordered service slugs (contract). */
  services: ['grounds-maintenance', 'landscape-installation', 'irrigation', 'tree-vegetation'],
  /** Ordered area slugs (contract). */
  areas: [
    'victoria', 'saanich', 'oak-bay', 'esquimalt', 'langford', 'colwood', 'view-royal',
    'sooke', 'central-saanich', 'north-saanich', 'sidney', 'highlands', 'metchosin',
  ],
  /** Social profiles once they exist (used for sameAs in JSON-LD). */
  sameAs: /** @type {string[]} */ ([]),
  /** Public path of the capability statement PDF (copy links to it). Put the file at static/downloads/. */
  capabilityStatement: '/downloads/rnc-capability-statement.pdf',
  /** Responsive widths requested from the photo CDN. */
  imageWidths: [480, 800, 1200, 1600, 2000, 2400],
};

export default { tokens, site, optionalTokens };
