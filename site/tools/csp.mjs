#!/usr/bin/env node
// @ts-check
/**
 * CSP hash check (seed version; W1 build completes it).
 *   node tools/csp.mjs --check   every INLINE_SCRIPTS sha256 is in the netlify.toml script-src, and no unknown sha256 is.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { INLINE_SCRIPTS } from '../src/lib/head-scripts.mjs';

export const RULES = ['inline-hashes-present', 'no-stale-hashes'];
const toml = readFileSync(fileURLToPath(new URL('../../netlify.toml', import.meta.url)), 'utf8');
const csp = (toml.match(/Content-Security-Policy\s*=\s*"([^"]*)"/) || [])[1] || '';
const scriptSrc = (csp.match(/script-src([^;]*)/) || [])[1] || '';
const listed = [...scriptSrc.matchAll(/'sha256-([A-Za-z0-9+/=]+)'/g)].map((m) => m[1]);
const want = INLINE_SCRIPTS.map((s) => createHash('sha256').update(s).digest('base64'));
const fails = [
  ...(csp ? [] : [{ rule: 'inline-hashes-present', message: 'netlify.toml has no Content-Security-Policy' }]),
  ...want.filter((h) => !listed.includes(h)).map((h) => ({ rule: 'inline-hashes-present', message: `script-src is missing 'sha256-${h}'` })),
  ...listed.filter((h) => !want.includes(h)).map((h) => ({ rule: 'no-stale-hashes', message: `script-src lists 'sha256-${h}', which matches no INLINE_SCRIPTS entry` })),
];
for (const f of fails) console.error(`csp ${f.rule}: ${f.message}`);
console.log(fails.length ? `csp: ${fails.length} problem(s)` : `csp: OK (${want.length} inline script hashes in netlify.toml)`);
export default fails.length === 0;
if (process.argv.includes('--check') && fails.length) process.exit(1);
