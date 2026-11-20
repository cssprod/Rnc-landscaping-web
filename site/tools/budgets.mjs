#!/usr/bin/env node
// @ts-check
/** Size budgets: JS < 30 KB per page (unminified), CSS < 60 KB, HTML < 120 KB per page. */
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, files, read, report } from './lib.mjs';
const LIMIT = { js: 30 * 1024, css: 60 * 1024, html: 120 * 1024 };
const errors = [];
let maxJs = 0, maxHtml = 0;
const size = (/** @type {string} */ p) => statSync(join(DIST, p)).size;
for (const f of files()) {
  const h = read(f);
  const js = [...h.matchAll(/<script[^>]+src="(\/[^"]+)"/g)].reduce((n, m) => n + size(m[1]), 0);
  const css = [...h.matchAll(/<link rel="stylesheet" href="(\/[^"]+)"/g)].reduce((n, m) => n + size(m[1]), 0);
  maxJs = Math.max(maxJs, js); maxHtml = Math.max(maxHtml, h.length);
  if (js > LIMIT.js) errors.push(`${f}: JS ${(js / 1024).toFixed(1)} KB`);
  if (css > LIMIT.css) errors.push(`${f}: CSS ${(css / 1024).toFixed(1)} KB`);
  if (h.length > LIMIT.html) errors.push(`${f}: HTML ${(h.length / 1024).toFixed(1)} KB`);
}
const css = files('.css').reduce((n, f) => n + size(f), 0);
console.log(`  largest page JS ${(maxJs / 1024).toFixed(1)} KB, CSS ${(css / 1024).toFixed(1)} KB, largest HTML ${(maxHtml / 1024).toFixed(1)} KB`);
const ok = report('size budgets', errors);
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
