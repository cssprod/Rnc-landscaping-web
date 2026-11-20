// @ts-check
/**
 * Single source of truth for business facts and site settings.
 *
 * Every value in `tokens` that is still `null` renders as its bracket token
 * (for example "[PHONE]"). On staging/preview builds the token is highlighted
 * with <mark class="ph">. A production build (CONTEXT=production) fails while
 * any token is still unresolved, so fill these in before launch.
 *
 * Only the token names listed in CONTRACT.md are allowed here.
 */

/** @typedef {'PHONE'|'EMAIL'|'HOURS'|'ADDRESS'|'LEGAL NAME'|'YEAR'|'CREW SIZE'|'OWNER NAME'|'OWNER BIO'|'LIABILITY LIMIT'|'WORKSAFEBC STATUS'|'LICENCES'|'CERTIFICATIONS'|'MEMBERSHIPS'|'WARRANTY'|'DOMAIN'|'PLAUSIBLE DOMAIN'|'SHEET WEBHOOK URL'} TokenName */

/** @type {Record<TokenName, string|null>} */
export const tokens = {
  PHONE: null, // e.g. "250-555-0100"
  EMAIL: null, // public contact address shown on the site
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
  DOMAIN: null, // bare host, e.g. "rnclandscaping.ca"
  'PLAUSIBLE DOMAIN': null, // usually the same as DOMAIN
  'SHEET WEBHOOK URL': null, // used in docs only; never rendered on pages
};

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
  /** Public path of the capability statement PDF (copy agent links to it). Put the file at static/downloads/. */
  capabilityStatement: '/downloads/rnc-capability-statement.pdf',
  /** Quote photo limits (Netlify: one file per field, 8 MB per request, 30 s upload timeout). */
  upload: { maxFiles: 3, maxFileMB: 5, maxTotalMB: 7.5, accept: '.jpg,.jpeg,.png,.heic,.heif,.webp' },
  imageWidths: [480, 800, 1200, 1600, 2000],
};

export default { tokens, site };
