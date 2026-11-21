#!/usr/bin/env node
// @ts-check
/**
 * Link and URL-map checks over the built site (SITE_DIST). Rules (CONTRACT §5, §14):
 *   internal-200            every internal href/src resolves to a built file (with a trailing slash for pages).
 *                           A link to a retired URL that dist/_redirects sends one hop to a live page is a
 *                           warning until the integrator's link codemod has run; with --strict (or SITE_MODE=launch)
 *                           it is an error.
 *   strict-redirects        dist/_redirects holds exactly one 301 per url-map retired URL, no chains, no splats,
 *                           no live page shadowed, every destination built. With --strict-redirects, each row is
 *                           also requested through tools/serve.mjs: 301 → Location = the C1 URL → 200 (one hop,
 *                           with and without the trailing slash).
 *   orphans                 every page in the sitemap has an inbound link from another page; the header Services
 *                           menu links every service page and /commercial/, the Service areas menu every area page.
 *   footer-duplicates       no href appears twice in a page's footer.
 *   sitemap-matches-url-map the built pages are exactly the url-map C1 pages, and sitemap.xml lists exactly those
 *                           minus newSitemapExcludes (/404.html, /styleguide/) and noindex pages.
 * Flags: --url-map[=FILE]  W1 transition: url-map new/added URLs count as existing link targets (seed behaviour).
 *        --strict           links through a redirect are errors.   --strict-redirects   the HTTP one-hop check.
 * Exits 0 when there is nothing to check (no dist). Failures are { rule, path, message }.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { DIST, files, read, report } from './lib.mjs';
import { site } from '../site.config.mjs';

export const RULES = ['internal-200', 'strict-redirects', 'orphans', 'footer-duplicates', 'sitemap-matches-url-map'];

const argv = process.argv.slice(2);
const strictLinks = argv.includes('--strict') || process.env.SITE_MODE === 'launch';
const strictRedirects = argv.includes('--strict-redirects');
const mapArg = argv.find((a) => a === '--url-map' || a.startsWith('--url-map='));
const MAP_FILE = mapArg?.includes('=') ? mapArg.slice(mapArg.indexOf('=') + 1) : fileURLToPath(new URL('../../.orchestra/url-map.json', import.meta.url));

/** @typedef {{ rule: string, path: string, message: string, toString(): string }} Failure */
/** @type {Failure[]} */
const failures = [];
/** @param {string} rule @param {string} path @param {string} message */
const fail = (rule, path, message) => failures.push({ rule, path, message, toString() { return `${path}: [${rule}] ${message}`; } });
/** @type {string[]} */
const warnings = [];

/** dist-relative file → URL path. @param {string} f */
const urlOf = (f) => (f === 'index.html' ? '/' : f.endsWith('/index.html') ? `/${f.slice(0, -'index.html'.length)}` : `/${f}`);
/** URL path → dist file (or null). @param {string} p */
function fileOf(p) {
  const t = join(DIST, p);
  if (!existsSync(t)) return null;
  if (statSync(t).isFile()) return t;
  return existsSync(join(t, 'index.html')) ? join(t, 'index.html') : null;
}

/** @returns {any|null} */
function loadMap() {
  if (!existsSync(MAP_FILE)) {
    if (mapArg?.includes('=')) fail('sitemap-matches-url-map', MAP_FILE, '--url-map names a file that does not exist');
    return null;
  }
  return JSON.parse(readFileSync(MAP_FILE, 'utf8'));
}
const map = loadMap();
/** C1 pages from the url-map: kept (200), moved (301 to a page) and added. */
const mapPages = new Set(map ? [
  ...map.entries.filter((/** @type {any} */ e) => e.status === 200 || (e.status === 301 && !e.new.includes('?'))).map((/** @type {any} */ e) => e.new),
  ...(map.added || []).map((/** @type {any} */ e) => e.new),
] : []);
/** url-map retired → C1 target (entries and aliases with status 301). @type {Map<string, string>} */
const mapRedirects = new Map(map ? [...map.entries, ...(map.aliases || [])].filter((/** @type {any} */ e) => e.status === 301 && e.old).map((/** @type {any} */ e) => [e.old, e.new]) : []);

/** dist/_redirects rows. @type {Map<string, { to: string, status: string, line: number }>} */
const redirects = new Map();
const redirectsFile = join(DIST, '_redirects');
if (existsSync(DIST) && existsSync(redirectsFile)) {
  readFileSync(redirectsFile, 'utf8').split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const [from, to, status = '301'] = line.split(/\s+/);
    if (redirects.has(from)) fail('strict-redirects', '_redirects', `line ${i + 1}: duplicate source ${from}`);
    redirects.set(from, { to, status, line: i + 1 });
  });
}

/** @param {string} p path without query */
const isRedirectSource = (p) => redirects.has(p) || redirects.has(p.replace(/\/$/, '')) || redirects.has(`${p}/`);

if (!existsSync(DIST)) {
  console.log('  check-links: no dist to check (build first)');
} else {
  const pages = files();
  const pending = new Set([site.capabilityStatement].filter(Boolean));
  /** Accepted under --url-map: url-map new/added targets (seed behaviour). @type {Set<string>} */
  const mapped = new Set();
  if (mapArg && map) for (const e of [...(map.entries || []), ...(map.added || []), ...(map.aliases || [])]) if (typeof e.new === 'string' && e.new.startsWith('/')) mapped.add(decodeURIComponent(e.new.split(/[?#]/)[0]));
  /** inbound links per target path, from other pages. @type {Map<string, Set<string>>} */
  const inbound = new Map();
  const viaRedirect = new Set();
  const warned = new Set();

  for (const f of pages) {
    const html = read(f);
    const self = urlOf(f);
    /* ---- internal-200 ---- */
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const u = m[1].replace(/&amp;/g, '&');
      if (!u.startsWith('/') || u.startsWith('//')) continue;
      const path = decodeURIComponent(u.split(/[?#]/)[0]);
      const t = fileOf(path);
      if (t && statSync(join(DIST, path)).isDirectory() && !path.endsWith('/')) fail('internal-200', f, `missing trailing slash ${u}`);
      if (t) { if (path !== self) (inbound.get(path) || inbound.set(path, new Set()).get(path))?.add(f); continue; }
      if (isRedirectSource(path)) {
        if (strictLinks) fail('internal-200', f, `links to ${u}, which is a 301; link to the C1 URL instead`);
        else viaRedirect.add(path);
        continue;
      }
      if (mapped.has(path)) continue;
      if (pending.has(path) && !strictLinks) { if (!warned.has(path)) warnings.push(`${path} not supplied yet (linked from ${f} and others)`); warned.add(path); continue; }
      fail('internal-200', f, `broken link ${u}`);
    }
    /* ---- footer-duplicates ---- */
    const foot = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0];
    if (foot) {
      /** @type {Map<string, number>} */ const seen = new Map();
      for (const m of foot.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
      for (const [href, n] of seen) if (n > 1) fail('footer-duplicates', f, `footer links ${href} ${n} times`);
    }
  }
  if (viaRedirect.size) warnings.push(`${viaRedirect.size} internal link target(s) go through a 301 (the link codemod rewrites them; --strict fails): ${[...viaRedirect].slice(0, 6).join(', ')}${viaRedirect.size > 6 ? ', …' : ''}`);

  /* ---- sitemap-matches-url-map ---- */
  const sitemapFile = join(DIST, 'sitemap.xml');
  const sitemap = existsSync(sitemapFile) ? [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>[^<]*?:\/\/[^/<]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]) : null;
  const built = new Set(pages.map(urlOf));
  if (map && map.entries) {
    const excludes = new Set(map.newSitemapExcludes || []);
    const optional = new Set((map.added || []).filter((/** @type {any} */ e) => /showcase builds only/.test(e.note || '')).map((/** @type {any} */ e) => e.new));
    for (const p of mapPages) if (!built.has(p) && !optional.has(p)) fail('sitemap-matches-url-map', p, 'url-map page is not built');
    for (const p of built) if (!mapPages.has(p)) fail('sitemap-matches-url-map', p, 'built page is not in the url-map');
    if (sitemap) {
      const listed = new Set(sitemap);
      for (const p of mapPages) if (!excludes.has(p) && built.has(p) && !listed.has(p)) fail('sitemap-matches-url-map', 'sitemap.xml', `missing ${p}`);
      for (const p of listed) {
        if (!mapPages.has(p)) fail('sitemap-matches-url-map', 'sitemap.xml', `lists ${p}, which is not a url-map page`);
        else if (excludes.has(p)) fail('sitemap-matches-url-map', 'sitemap.xml', `lists ${p}, which must stay out of the sitemap`);
        if (!built.has(p)) fail('sitemap-matches-url-map', 'sitemap.xml', `lists ${p}, which is not built`);
      }
      if (sitemap.length !== listed.size) fail('sitemap-matches-url-map', 'sitemap.xml', 'lists a URL twice');
    }
  }

  /* ---- orphans ---- */
  const indexable = sitemap ? sitemap.filter((p) => built.has(p)) : [...built].filter((p) => p !== '/404.html');
  for (const p of indexable) if (p !== '/' && !inbound.get(p)?.size) fail('orphans', p, 'no other page links here');
  const home = pages.includes('index.html') ? read('index.html') : '';
  /** A header disclosure panel: from its id to the next disclosure or the end of the nav. @param {string} id */
  const menu = (id) => {
    const at = home.search(new RegExp(`\\sid="${id}"`));
    if (at < 0) return '';
    const rest = home.slice(at + 1);
    const end = rest.search(/aria-controls="menu-|<\/nav>/);
    return end < 0 ? rest : rest.slice(0, end);
  };
  if (home) {
    const svcMenu = menu('menu-services');
    const areaMenu = menu('menu-areas');
    const svcPages = [...built].filter((p) => /^\/services\/[^/]+\/$/.test(p)).concat(built.has('/commercial/') ? ['/commercial/'] : []);
    const areaPages = [...built].filter((p) => /^\/areas\/[^/]+\/$/.test(p));
    if (!svcMenu) fail('orphans', 'index.html', 'header has no Services menu (#menu-services)');
    else for (const p of svcPages) if (!svcMenu.includes(`href="${p}"`)) fail('orphans', p, 'not listed in the header Services menu');
    if (!areaMenu) fail('orphans', 'index.html', 'header has no Service areas menu (#menu-areas)');
    else for (const p of areaPages) if (!areaMenu.includes(`href="${p}"`)) fail('orphans', p, 'not listed in the header Service areas menu');
  }

  /* ---- strict-redirects (static) ---- */
  if (map && (redirects.size || existsSync(redirectsFile))) {
    for (const [from, to] of mapRedirects) {
      const r = redirects.get(from);
      if (!r) fail('strict-redirects', '_redirects', `missing ${from} → ${to}`);
      else {
        if (r.to !== to) fail('strict-redirects', '_redirects', `line ${r.line}: ${from} → ${r.to}, url-map says ${to}`);
        if (r.status !== '301') fail('strict-redirects', '_redirects', `line ${r.line}: ${from} has status ${r.status}, not 301`);
      }
    }
    for (const [from, r] of redirects) {
      if (!mapRedirects.has(from)) fail('strict-redirects', '_redirects', `line ${r.line}: ${from} is not a url-map retired URL`);
      if (/[*:]/.test(from)) fail('strict-redirects', '_redirects', `line ${r.line}: splat or placeholder in ${from}`);
      const dest = r.to.split(/[?#]/)[0];
      if (redirects.has(dest)) fail('strict-redirects', '_redirects', `line ${r.line}: chain ${from} → ${r.to} → ${redirects.get(dest)?.to}`);
      if (!fileOf(dest)) fail('strict-redirects', '_redirects', `line ${r.line}: destination ${r.to} is not built`);
      if (fileOf(from)) fail('strict-redirects', '_redirects', `line ${r.line}: ${from} shadows a built page`);
    }
  } else if (map && strictRedirects) fail('strict-redirects', '_redirects', 'dist/_redirects is missing');

  /* ---- strict-redirects (HTTP, one hop through serve.mjs) ---- */
  if (strictRedirects && redirects.size) await httpCheck();
}

/** Free TCP port. @returns {Promise<number>} */
function freePort() {
  return new Promise((res, rej) => { const s = createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const a = s.address(); s.close(() => res(typeof a === 'object' && a ? a.port : 0)); }); });
}

async function httpCheck() {
  const port = await freePort();
  const child = spawn(process.execPath, [fileURLToPath(new URL('./serve.mjs', import.meta.url))], { env: { ...process.env, PORT: String(port), SITE_DIST: DIST }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  try {
    let up = false;
    for (let i = 0; i < 50 && !up; i++) { try { await fetch(`${base}/`); up = true; } catch { await new Promise((r) => setTimeout(r, 100)); } }
    if (!up) { fail('strict-redirects', 'tools/serve.mjs', 'the local server did not start'); return; }
    for (const [from, r] of redirects) {
      for (const req of new Set([from, from.endsWith('/') ? from.slice(0, -1) : `${from}/`])) {
        const res = await fetch(base + req, { redirect: 'manual' });
        const loc = res.headers.get('location');
        if (res.status !== 301) { fail('strict-redirects', req, `expected 301, got ${res.status}`); continue; }
        const u = new URL(loc || '', base);
        if (`${u.pathname}${u.search}` !== r.to) { fail('strict-redirects', req, `301 to ${loc}, expected ${r.to}`); continue; }
        const next = await fetch(u, { redirect: 'manual' });
        if (next.status !== 200) fail('strict-redirects', req, `${r.to} answered ${next.status} (one hop must land on a 200)`);
      }
    }
  } finally { child.kill(); }
}

for (const w of warnings) console.warn(`  warn: ${w}`);
const ok = report('check-links', /** @type {any} */ (failures));
// exitCode, not process.exit(): a long report written to a pipe is flushed before the process ends.
if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = ok ? 0 : 1;
export default ok;
