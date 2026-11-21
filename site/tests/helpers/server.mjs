// @ts-check
/**
 * Shared e2e fixtures. The built site is SITE_DIST (tools/lib.mjs DIST, CONTRACT §14); Playwright serves it on PORT.
 */
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST } from '../../tools/lib.mjs';

export { DIST };

/** Every built page URL ("/", "/about/", …), from the dist folder. */
export function allPages() {
  if (!existsSync(DIST)) return [];
  return readdirSync(DIST, { recursive: true }).map(String)
    .filter((f) => f.endsWith('index.html') && statSync(join(DIST, f)).isFile())
    .map((f) => `/${f.replace(/index\.html$/, '')}`.replace(/\\/g, '/'))
    .sort();
}

/** The dist/_redirects rows: { from, to }. */
export function redirectRows() {
  const f = join(DIST, '_redirects');
  if (!existsSync(f)) return [];
  return readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => { const [from, to] = l.split(/\s+/); return { from, to }; });
}

/** The 13 municipalities and 4 services as content/site.json lists them. */
export function siteFacts() {
  const s = JSON.parse(readFileSync(new URL('../../../content/site.json', import.meta.url), 'utf8'));
  return { municipalities: /** @type {{slug: string, name: string}[]} */ (s.municipalities), services: /** @type {{slug: string, name: string, navLabel: string}[]} */ (s.services) };
}

/** Block every request that leaves localhost (CDN photos), so tests run offline. @param {import('playwright/test').Page} page */
export async function offline(page) {
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
}

/** Console errors and page errors collected while a page is used. @param {import('playwright/test').Page} page */
export function collectErrors(page) {
  /** @type {string[]} */ const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  return errors;
}
