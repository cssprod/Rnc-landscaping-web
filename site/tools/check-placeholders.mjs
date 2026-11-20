#!/usr/bin/env node
// @ts-check
/** Lists unresolved bracket tokens and Sample content in dist. --strict fails if any remain (production gate). */
import { files, read, report } from './lib.mjs';
import { TOKEN_RE } from '../src/lib/tokens.mjs';
const strict = process.argv.includes('--strict') || process.env.CONTEXT === 'production';
/** @type {Record<string, number>} */ const tokens = {};
let samples = 0;
for (const f of [...files('.html'), ...files('.xml'), ...files('.txt')]) {
  const s = read(f);
  for (const m of s.matchAll(TOKEN_RE)) tokens[m[0]] = (tokens[m[0]] || 0) + 1;
  samples += (s.match(/class="sample-label"/g) || []).length;
}
const summary = Object.entries(tokens).map(([k, v]) => `${k} ×${v}`);
console.log(`Placeholders: ${summary.length ? summary.join(', ') : 'none'}; Sample labels: ${samples}`);
const ok = strict ? report('no placeholders (strict)', [...summary, ...(samples ? [`${samples} sample labels`] : [])]) : true;
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
