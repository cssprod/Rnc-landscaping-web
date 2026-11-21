#!/usr/bin/env node
// @ts-check
/**
 * Size budgets, measured as compressed transfer size (what visitors download), per page:
 * CSS < 20 KB gzip, JS < 12 KB gzip (the module graph: every module script plus its modulepreloaded dependencies),
 * HTML < 30 KB gzip and < 150 KB raw. Budgets v2 (CONTRACT §16) arrive with qa in W2.
 * Reports through tools/lib.mjs report() (baselines, CONTRACT §17).
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { DIST, files, read, report } from './lib.mjs';

export const RULES = ['css-gz', 'js-gz', 'html-gz', 'html-raw'];

const LIMIT = { cssGz: 20 * 1024, jsGz: 12 * 1024, htmlGz: 30 * 1024, htmlRaw: 150 * 1024 };
/** @type {import('./lib.mjs').Failure[]} */
const failures = [];
let maxJs = 0, maxHtml = 0, maxHtmlGz = 0;
/** @type {Map<string, number>} */
const gzCache = new Map();
const gz = (/** @type {string} */ p) => {
  if (!gzCache.has(p)) { let n = 0; try { n = gzipSync(readFileSync(join(DIST, p))).length; } catch { /* a missing file is check-links' job */ } gzCache.set(p, n); }
  return /** @type {number} */ (gzCache.get(p));
};
const kb = (/** @type {number} */ n) => `${(n / 1024).toFixed(1)} KB`;
for (const f of files()) {
  const h = read(f);
  const js = new Set([...h.matchAll(/<script[^>]+src="(\/[^"]+)"/g), ...h.matchAll(/<link rel="modulepreload" href="(\/[^"]+)"/g)].map((m) => m[1]));
  const jsGz = [...js].reduce((n, p) => n + gz(p), 0);
  const css = [...h.matchAll(/<link rel="stylesheet" href="(\/[^"]+)"/g)].reduce((n, m) => n + gz(m[1]), 0);
  const hg = gzipSync(h).length;
  maxJs = Math.max(maxJs, jsGz); maxHtml = Math.max(maxHtml, h.length); maxHtmlGz = Math.max(maxHtmlGz, hg);
  if (jsGz > LIMIT.jsGz) failures.push({ rule: 'js-gz', path: f, message: `JS ${kb(jsGz)} gzip (limit ${kb(LIMIT.jsGz)})` });
  if (css > LIMIT.cssGz) failures.push({ rule: 'css-gz', path: f, message: `CSS ${kb(css)} gzip (limit ${kb(LIMIT.cssGz)})` });
  if (hg > LIMIT.htmlGz) failures.push({ rule: 'html-gz', path: f, message: `HTML ${kb(hg)} gzip (limit ${kb(LIMIT.htmlGz)})` });
  if (h.length > LIMIT.htmlRaw) failures.push({ rule: 'html-raw', path: f, message: `HTML ${kb(h.length)} raw (limit ${kb(LIMIT.htmlRaw)})` });
}
const cssFiles = files('.css');
const cssRaw = cssFiles.reduce((n, f) => n + statSync(join(DIST, f)).size, 0);
const cssGz = cssFiles.reduce((n, f) => n + gz(f), 0);
console.log(`  CSS ${kb(cssRaw)} (${kb(cssGz)} gzip), largest page JS ${kb(maxJs)} gzip, largest HTML ${kb(maxHtml)} (${kb(maxHtmlGz)} gzip)`);
const ok = report('budgets', failures);
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
