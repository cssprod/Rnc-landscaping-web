// @ts-check
/** Shared helpers for the quality tools. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
/** Built site directory: SITE_DIST when set (CONTRACT §14), else site/dist. */
export const DIST = process.env.SITE_DIST ? resolve(process.env.SITE_DIST) : resolve(new URL('../dist', import.meta.url).pathname);
/** @param {string} [ext] */
export function files(ext = '.html') {
  return readdirSync(DIST, { recursive: true }).map(String).filter((f) => f.endsWith(ext) && statSync(join(DIST, f)).isFile() && !f.startsWith('admin/'));
}
/** @param {string} f */
export const read = (f) => readFileSync(join(DIST, f), 'utf8');
/** @param {string} title @param {string[]} errors */
export function report(title, errors) {
  if (errors.length) { console.error(`✗ ${title}: ${errors.length} problem(s)\n${errors.slice(0, 50).map((e) => `  - ${e}`).join('\n')}`); return false; }
  console.log(`✓ ${title}`); return true;
}
