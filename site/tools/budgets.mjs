#!/usr/bin/env node
// @ts-check
/**
 * Size budgets, measured as compressed transfer size (what visitors download):
 * CSS < 20 KB gzip, JS < 12 KB gzip per page, HTML < 30 KB gzip per page (and < 150 KB raw).
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { DIST, files, read, report } from './lib.mjs';
const LIMIT = { cssGz: 20 * 1024, jsGz: 12 * 1024, htmlGz: 30 * 1024, htmlRaw: 150 * 1024 };
const errors = [];
let maxJs = 0, maxHtml = 0, maxHtmlGz = 0;
const gz = (/** @type {string} */ p) => gzipSync(readFileSync(join(DIST, p))).length;
for (const f of files()) {
  const h = read(f);
  const js = [...h.matchAll(/<script[^>]+src="(\/[^"]+)"/g)].reduce((n, m) => n + gz(m[1]), 0);
  const css = [...h.matchAll(/<link rel="stylesheet" href="(\/[^"]+)"/g)].reduce((n, m) => n + gz(m[1]), 0);
  const hg = gzipSync(h).length;
  maxJs = Math.max(maxJs, js); maxHtml = Math.max(maxHtml, h.length); maxHtmlGz = Math.max(maxHtmlGz, hg);
  if (js > LIMIT.jsGz) errors.push(`${f}: JS ${(js / 1024).toFixed(1)} KB gzip`);
  if (css > LIMIT.cssGz) errors.push(`${f}: CSS ${(css / 1024).toFixed(1)} KB gzip`);
  if (hg > LIMIT.htmlGz) errors.push(`${f}: HTML ${(hg / 1024).toFixed(1)} KB gzip`);
  if (h.length > LIMIT.htmlRaw) errors.push(`${f}: HTML ${(h.length / 1024).toFixed(1)} KB raw`);
}
const cssFiles = files('.css');
const cssRaw = cssFiles.reduce((n, f) => n + statSync(join(DIST, f)).size, 0);
const cssGz = cssFiles.reduce((n, f) => n + gz(f), 0);
console.log(`  CSS ${(cssRaw / 1024).toFixed(1)} KB (${(cssGz / 1024).toFixed(1)} KB gzip), largest page JS ${(maxJs / 1024).toFixed(1)} KB gzip, largest HTML ${(maxHtml / 1024).toFixed(1)} KB (${(maxHtmlGz / 1024).toFixed(1)} KB gzip)`);
const ok = report('size budgets', errors);
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
