#!/usr/bin/env node
// @ts-check
/**
 * Zero-dependency static site generator for the RNC Landscaping site.
 *   node build.mjs                      showcase build (default): placeholders shown as chips, noindex
 *   SITE_MODE=launch node build.mjs     launch build: fails on [TOKENS], samples or fixtures; indexable
 *   node build.mjs --offline-images     generated illustrations instead of CDN photos (tests, screenshots)
 *   node build.mjs --out=/tmp/x         write somewhere other than site/dist (parallel work, CI)
 */
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadAll, sharedFile, paths, fallbacks } from './src/lib/data.mjs';
import { initImages, renderArt } from './src/lib/images.mjs';
import { finalizeTokens, tok, has } from './src/lib/tokens.mjs';
import { typographer } from './src/lib/html.mjs';
import { routes } from './src/pages/routes.mjs';
import { redirects } from './src/pages/redirects.mjs';
import { JS_FLAG } from './src/components/layout.mjs';
import { site } from './site.config.mjs';
import { generate as tokensCss, readTokens } from '../brand/build-tokens.mjs';

const t0 = Date.now();
const argv = process.argv.slice(2);
const args = new Set(argv);
const context = process.env.CONTEXT || 'dev';
const launch = process.env.SITE_MODE === 'launch';
const offline = args.has('--offline-images');
const outArg = argv.find((a) => a.startsWith('--out='))?.slice(6);
const DIST = outArg ? resolve(outArg) : join(paths.site, 'dist');
/** @type {string[]} */
const issues = [];
/** @type {string[]} */
const warnings = [];

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets', 'brand'), { recursive: true });
mkdirSync(join(DIST, 'assets', 'build'), { recursive: true });
mkdirSync(join(DIST, 'assets', 'fonts'), { recursive: true });
mkdirSync(join(DIST, 'assets', 'art'), { recursive: true });

const data = loadAll();
initImages(data.images, { offline });

/* ---- CSS: tokens (compiled from brand/tokens.json) + components, one content-hashed file ---- */
const tokens = tokensCss(readTokens());
const tokensFile = sharedFile('brand', 'tokens.css');
if (tokensFile && readFileSync(tokensFile, 'utf8') !== tokens) warnings.push('brand/tokens.css is stale: run node brand/build-tokens.mjs (the build uses tokens.json directly)');
/** Conservative CSS minifier: comments and whitespace only (never touches values inside strings or url()). @param {string} src */
const minifyCss = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{};>])\s*/g, '$1')
  .replace(/([,:])\s+(?![^(]*\)\s*(?:and|or)\b)/g, '$1')
  .replace(/;}/g, '}')
  .trim();
// Every src/styles/*.css file, in file-name order (numeric prefixes set the cascade order).
const styleDir = join(paths.site, 'src/styles');
const styleFiles = readdirSync(styleDir).filter((f) => f.endsWith('.css')).sort();
const css = minifyCss(`${tokens}\n${styleFiles.map((f) => readFileSync(join(styleDir, f), 'utf8')).join('\n')}`);
const h = (/** @type {string} */ s) => createHash('sha256').update(s).digest('hex').slice(0, 10);
// Every src/scripts/*.js file becomes its own content-hashed module: main.js loads on every page,
// the others only where a page asks for them (layout option `scripts: ['quote']`).
const scriptDir = join(paths.site, 'src/scripts');
/** @type {Record<string, string>} */
const scripts = {};
for (const f of readdirSync(scriptDir).filter((x) => x.endsWith('.js')).sort()) {
  const src = readFileSync(join(scriptDir, f), 'utf8');
  const name = f.replace(/\.js$/, '');
  scripts[name] = `/assets/build/${name}.${h(src)}.js`;
  writeFileSync(join(DIST, scripts[name]), src);
}
const assets = { css: `/assets/build/site.${h(css)}.css`, js: scripts.main, scripts };
writeFileSync(join(DIST, assets.css), css);

/* ---- CSP: one policy for every path; its hash must match the inline JS flag ---- */
const flagHash = `sha256-${createHash('sha256').update(JS_FLAG).digest('base64')}`;
const tomlPath = join(paths.root, 'netlify.toml');
const toml = existsSync(tomlPath) ? readFileSync(tomlPath, 'utf8') : '';
if (!toml) issues.push('netlify.toml not found at the repository root');
else {
  if (!/for = "\/\*"[\s\S]*?Content-Security-Policy/.test(toml)) issues.push('netlify.toml has no Content-Security-Policy header for "/*"');
  if (!toml.includes(flagHash)) issues.push(`netlify.toml CSP is missing '${flagHash}' for the inline JS flag script`);
}

/* ---- static files, fonts, brand assets ---- */
if (existsSync(join(paths.site, 'static'))) cpSync(join(paths.site, 'static'), DIST, { recursive: true });
for (const f of ['logo.svg', 'logo-mark.svg', 'logo-reversed.svg', 'favicon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png']) {
  const src = sharedFile('brand', f);
  if (src) cpSync(src, join(DIST, 'assets', 'brand', f.replace(/^icons\//, '')));
  else warnings.push(`brand/${f} missing`);
}
for (const f of ['inter-latin-var.woff2', 'newsreader-latin-italic-var.woff2', 'OFL-Inter.txt', 'OFL-Newsreader.txt']) {
  const src = sharedFile('brand', `fonts/${f}`);
  if (src) cpSync(src, join(DIST, 'assets', 'fonts', f));
  else issues.push(`missing font file brand/fonts/${f}`);
}
if (existsSync(join(DIST, 'assets/brand/favicon.svg'))) cpSync(join(DIST, 'assets/brand/favicon.svg'), join(DIST, 'favicon.svg'));
if (existsSync(join(DIST, 'assets/brand/apple-touch-icon.png'))) cpSync(join(DIST, 'assets/brand/apple-touch-icon.png'), join(DIST, 'apple-touch-icon.png'));

/* ---- origin ---- */
if (launch && !has('DOMAIN')) issues.push('SITE_MODE=launch needs DOMAIN in site.config.mjs');
const origin = launch ? `https://${tok('DOMAIN')}` : '';
const hasCapability = !!site.capabilityStatement && existsSync(join(DIST, site.capabilityStatement));
if (!hasCapability) (launch ? issues : warnings).push(`capability statement PDF missing: add static${site.capabilityStatement}`);
const analyticsDomain = launch && has('PLAUSIBLE DOMAIN') ? tok('PLAUSIBLE DOMAIN') : null;
const env = { launch, context, origin, data, assets, hasCapability, analyticsDomain };

/* ---- pages ---- */
const list = routes(env);
let pageCount = 0;
for (const r of list) {
  const out = typographer(finalizeTokens(String(r.render()), { launch, file: r.file, issues, html: true }));
  if (launch && /class="sample-label"/.test(out)) issues.push(`${r.file}: renders sample content (sample: true)`);
  const file = join(DIST, r.file);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, out);
  pageCount++;
}

/* ---- illustrations for slots without a photo ---- */
const art = renderArt();
for (const a of art) writeFileSync(join(DIST, 'assets', 'art', `${a.id}.svg`), a.svg);

/* ---- sitemap (lastmod from the git commit date of each route's sources), robots, manifest, headers, redirects ---- */
const indexable = list.filter((r) => r.path !== '/404.html' && !r.noindex);
const today = new Date().toISOString().slice(0, 10);
/** Most recent commit date per repo-relative file, from one git call; empty when git or history is unavailable. */
const gitDates = (() => {
  /** @type {Map<string, string>} */ const m = new Map();
  try {
    const log = execFileSync('git', ['log', '--format=@%cs', '--name-only', '--', 'content', 'site/src', 'media'], { cwd: paths.root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    let date = '';
    for (const line of log.split('\n')) { if (line.startsWith('@')) date = line.slice(1); else if (line && !m.has(line)) m.set(line, date); }
  } catch { /* no git: fall back to today */ }
  return m;
})();
/** @param {string[]|undefined} sources repo-relative files or folders */
const lastmod = (sources) => {
  let best = '';
  for (const src of sources || []) for (const [f, dt] of gitDates) if ((f === src || f.startsWith(`${src.replace(/\/$/, '')}/`)) && dt > best) best = dt;
  return best || [...gitDates.values()].sort().pop() || today;
};
const smOrigin = origin || 'https://[DOMAIN]';
writeFileSync(join(DIST, 'sitemap.xml'), finalizeTokens(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((r) => `  <url><loc>${smOrigin}${r.path}</loc><lastmod>${lastmod(r.sources)}</lastmod></url>`).join('\n')}
</urlset>
`, { launch, file: 'sitemap.xml', issues, html: false }));
writeFileSync(join(DIST, 'robots.txt'), launch
  ? finalizeTokens(`User-agent: *\nAllow: /\n\nSitemap: https://[DOMAIN]/sitemap.xml\n`, { launch, file: 'robots.txt', issues, html: false })
  : `# Showcase build (${context}): not for indexing\nUser-agent: *\nDisallow: /\n`);
writeFileSync(join(DIST, 'site.webmanifest'), JSON.stringify({
  name: site.name, short_name: site.shortName, start_url: '/', display: 'browser', lang: 'en-CA',
  background_color: '#F4F6F2', theme_color: '#1D4A33',
  icons: [
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/assets/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/assets/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/assets/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));
// Headers in netlify.toml are global; the showcase noindex header is written here.
if (!launch) writeFileSync(join(DIST, '_headers'), `/*\n  X-Robots-Tag: noindex, nofollow\n`);
const redirectList = redirects(env);
writeFileSync(join(DIST, '_redirects'), `# Retired URLs (generated by build.mjs from src/pages/redirects.mjs)\n${redirectList.map(([from, to, st]) => `${from}  ${to}  ${st}`).join('\n')}\n`);
for (const [from] of redirectList) if (list.some((r) => r.path === from)) issues.push(`redirect source ${from} is also a live page`);

/* ---- fixture / data checks ---- */
const fb = [...new Set(fallbacks)];
if (fb.length) (launch ? issues : warnings).push(`using ${fb.length} fixture file(s) instead of real shared files: ${fb.slice(0, 8).join(', ')}${fb.length > 8 ? ', …' : ''}`);
for (const s of site.services) if (!data.services[s]) issues.push(`missing service content: ${s}`);
for (const a of site.areas) if (!data.areas[a]) issues.push(`missing area content: ${a}`);

/* ---- group repeated issues: one line per token / problem type ---- */
{
  /** @type {Map<string, string[]>} */ const groups = new Map();
  const rest = [];
  for (const i of issues) {
    const m = i.match(/^unresolved token (\[[^\]]+\]) in (.+)$/) || i.match(/^(.+?): (renders sample content.*)$/);
    if (!m) { rest.push(i); continue; }
    const [key, file] = i.startsWith('unresolved') ? [`unresolved ${m[1]} (set it in site.config.mjs)`, m[2]] : [m[2], m[1]];
    groups.set(key, [...(groups.get(key) || []), file]);
  }
  issues.length = 0;
  issues.push(...rest, ...[...groups].map(([k, f]) => `${k}: ${f.length} file(s), e.g. ${f.slice(0, 3).join(', ')}`));
}

/* ---- report ---- */
const kb = (/** @type {string} */ dir) => {
  let n = 0;
  for (const f of readdirSync(dir, { recursive: true })) { const p = join(dir, String(f)); if (statSync(p).isFile()) n += statSync(p).size; }
  return (n / 1024).toFixed(0);
};
for (const w of warnings) console.warn(`warn: ${w}`);
if (issues.length) {
  console.error(`\nBuild ${launch ? 'FAILED' : 'has problems'} (${launch ? 'launch' : 'showcase'}, ${context}). Fix before publishing:\n${issues.map((i) => `  - ${i}`).join('\n')}\n`);
  if (launch || issues.some((i) => i.startsWith('netlify.toml') || i.startsWith('missing'))) process.exit(1);
}
console.log(`Built ${pageCount} pages and ${art.length} illustrations (${launch ? 'launch' : 'showcase'}, ${context}${offline ? ', offline images' : ''}) into ${relative(paths.site, DIST) || '.'}/ (${kb(DIST)} KB) in ${Date.now() - t0} ms`);
