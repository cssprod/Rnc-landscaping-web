// @ts-check
/**
 * Inline-script policy (CONTRACT §11). Every inline <script> in the output, other than application/ld+json data
 * blocks, must be byte-equal to an entry of INLINE_SCRIPTS (site/src/lib/head-scripts.mjs), and its sha256 must be in
 * the netlify.toml Content-Security-Policy script-src. Anything else would be blocked by the CSP in production.
 *
 *   cspScriptHashes(tomlText) → ['sha256-…', …]   hashes listed in the "/*" CSP script-src
 *   sha256(text)              → 'sha256-…'
 *   inlineScriptProblems(html, { allowed, cspHashes }) → string[]
 */
import { createHash } from 'node:crypto';

/** @param {string} s */
export const sha256 = (s) => `sha256-${createHash('sha256').update(s).digest('base64')}`;

/**
 * The Content-Security-Policy value from netlify.toml (the first [[headers]] block that sets one).
 * @param {string} toml
 */
export function cspFromToml(toml) {
  return (toml.match(/Content-Security-Policy\s*=\s*"([^"]*)"/) || [])[1] || '';
}

/** @param {string} toml */
export function cspScriptHashes(toml) {
  const scriptSrc = (cspFromToml(toml).match(/(?:^|;)\s*script-src([^;]*)/) || [])[1] || '';
  return [...scriptSrc.matchAll(/'(sha256-[A-Za-z0-9+/=]+)'/g)].map((m) => m[1]);
}

/**
 * @param {string} html
 * @param {{ allowed: readonly string[], cspHashes: readonly string[] }} o
 * @returns {string[]} one message per offending script
 */
export function inlineScriptProblems(html, o) {
  /** @type {string[]} */
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = ((attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || '').toLowerCase();
    if (type === 'application/ld+json') continue;
    const body = m[2];
    const h = sha256(body);
    const shown = body.length > 60 ? `${body.slice(0, 57)}…` : body;
    if (!o.allowed.includes(body)) out.push(`inline <script${type ? ` type="${type}"` : ''}> is not an INLINE_SCRIPTS entry (src/lib/head-scripts.mjs): ${JSON.stringify(shown)} (${h})`);
    else if (!o.cspHashes.includes(h)) out.push(`inline <script${type ? ` type="${type}"` : ''}> hash '${h}' is missing from the netlify.toml CSP script-src`);
  }
  return out;
}
