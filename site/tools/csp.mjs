#!/usr/bin/env node
// @ts-check
/**
 * CSP hash check (CONTRACT §11). Runs in every gate; not a check-* tool (it reads netlify.toml, not a build).
 *   node tools/csp.mjs --check   exit 1 unless:
 *     inline-hashes-present  every INLINE_SCRIPTS sha256 is in the netlify.toml "/*" CSP script-src;
 *     no-stale-hashes        script-src lists no sha256 that matches no INLINE_SCRIPTS entry;
 *     dist-inline-scripts    when a build exists (SITE_DIST or site/dist), every inline <script> in it (other than
 *                            application/ld+json) is an INLINE_SCRIPTS entry whose hash is in the CSP.
 *   node tools/csp.mjs --print   print the script-src hash list for INLINE_SCRIPTS (for editing netlify.toml)
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INLINE_SCRIPTS } from '../src/lib/head-scripts.mjs';
import { cspFromToml, cspScriptHashes, inlineScriptProblems, sha256 } from '../src/lib/build/inline-scripts.mjs';
import { DIST, REPO, files, read, report } from './lib.mjs';

export const RULES = ['inline-hashes-present', 'no-stale-hashes', 'dist-inline-scripts'];

const want = INLINE_SCRIPTS.map(sha256);
if (process.argv.includes('--print')) { console.log(want.map((h) => `'${h}'`).join(' ')); process.exit(0); }

const tomlFile = join(REPO, 'netlify.toml');
const toml = existsSync(tomlFile) ? readFileSync(tomlFile, 'utf8') : '';
const listed = cspScriptHashes(toml);
/** @type {import('./lib.mjs').Failure[]} */
const fails = [];
if (!cspFromToml(toml)) fails.push({ rule: 'inline-hashes-present', path: 'netlify.toml', message: 'no Content-Security-Policy header' });
for (const h of want) if (!listed.includes(h)) fails.push({ rule: 'inline-hashes-present', path: 'netlify.toml', message: `script-src is missing '${h}' (src/lib/head-scripts.mjs INLINE_SCRIPTS)` });
for (const h of listed) if (!want.includes(h)) fails.push({ rule: 'no-stale-hashes', path: 'netlify.toml', message: `script-src lists '${h}', which matches no INLINE_SCRIPTS entry` });
let pages = 0;
if (existsSync(join(DIST, 'index.html'))) {
  for (const f of files()) { pages++; for (const m of inlineScriptProblems(read(f), { allowed: INLINE_SCRIPTS, cspHashes: listed })) fails.push({ rule: 'dist-inline-scripts', path: f, message: m }); }
}
const ok = report('csp', fails);
if (ok) console.log(`  csp: ${want.length} inline script hash(es) in netlify.toml${pages ? `; ${pages} built page(s) carry only those inline scripts` : ''}`);
export default ok;
if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes('--check') && !ok) process.exit(1);
