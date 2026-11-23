#!/usr/bin/env node
// @ts-check
/**
 * Lists unresolved bracket tokens and Sample content in dist. --strict (or SITE_MODE=launch) fails if any remain.
 *   no-placeholders  (strict / launch only) no required [TOKEN] and no "Sample" label is left in a built page.
 */
import { existsSync } from 'node:fs';
import { DIST, files, read, report } from './lib.mjs';
import { TOKEN_RE } from '../src/lib/tokens.mjs';
import { optionalTokens } from '../site.config.mjs';

export const RULES = ['no-placeholders'];
const strict = process.argv.includes('--strict') || process.env.SITE_MODE === 'launch';
/** @type {Record<string, number>} */ const tokens = {};
let samples = 0;
/** @type {Map<string, Set<string>>} */ const where = new Map();
for (const f of existsSync(DIST) ? [...files('.html'), ...files('.xml'), ...files('.txt')] : []) {
  const s = read(f);
  for (const m of s.matchAll(TOKEN_RE)) if (!optionalTokens.includes(/** @type {any} */ (m[1]))) { tokens[m[0]] = (tokens[m[0]] || 0) + 1; (where.get(f) || where.set(f, new Set()).get(f))?.add(m[0]); }
  const n = (s.match(/class="sample-label"/g) || []).length;
  samples += n;
  if (n) (where.get(f) || where.set(f, new Set()).get(f))?.add(`${n} Sample label${n === 1 ? '' : 's'}`);
}
const summary = Object.entries(tokens).map(([k, v]) => `${k} ×${v}`);
console.log(`Placeholders: ${summary.length ? summary.join(', ') : 'none'}; Sample labels: ${samples}`);
const ok = strict ? report('check-placeholders', [...where].map(([f, set]) => ({ rule: 'no-placeholders', path: f, message: [...set].join(', ') }))) : true;
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
