#!/usr/bin/env node
// @ts-check
/**
 * Zero-dependency static site generator for the RNC Landscaping site.
 *   node build.mjs                      showcase build (default): placeholders shown as chips, noindex
 *   SITE_MODE=launch node build.mjs     launch build: fails on [TOKENS], samples or fixtures; indexable
 *   node build.mjs --offline-images     generated illustrations instead of CDN photos (tests, screenshots)
 *   node build.mjs --out=DIR            build into DIR (default: $SITE_DIST, else site/dist). The build empties DIR first,
 *                                       but only when it is empty or carries the .rnc-dist marker (CONTRACT §14).
 *   node build.mjs --no-minify          readable CSS (debugging)
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { loadAll, sharedFile, paths, fallbacks } from './src/lib/data.mjs';
import { initImages, renderArt } from './src/lib/images.mjs';
import { finalizeTokens, tok, has } from './src/lib/tokens.mjs';
import { typographer } from './src/lib/html.mjs';
import { routes } from './src/pages/routes.mjs';
import { INLINE_SCRIPTS } from './src/lib/head-scripts.mjs';
import { site } from './site.config.mjs';
import { generate as tokensCss, readTokens } from '../brand/build-tokens.mjs';
import { prepareDist, DistGuardError } from './src/lib/build/dist-guard.mjs';
import { bundleCss } from './src/lib/build/css.mjs';
import { buildModules, addModulePreloads } from './src/lib/build/modules.mjs';
import { shakeSprite } from './src/lib/build/sprite-shake.mjs';
import { gitLastmod } from './src/lib/build/lastmod.mjs';
import { cspScriptHashes, inlineScriptProblems, sha256 } from './src/lib/build/inline-scripts.mjs';

const t0 = Date.now();
const argv = process.argv.slice(2);
const args = new Set(argv);
const context = process.env.CONTEXT || 'dev';
const launch = process.env.SITE_MODE === 'launch';
const offline = args.has('--offline-images');
const minify = !args.has('--no-minify');
const outArg = argv.find((a) => a.startsWith('--out='))?.slice(6);
if (argv.includes('--out')) { console.error('build: use --out=DIR'); process.exit(2); }
const DIST = resolve(outArg || process.env.SITE_DIST || join(paths.site, 'dist'));
/** @type {string[]} */
const issues = [];
/** @type {string[]} */
const warnings = [];
/** Problems that fail every build, showcase included. @type {string[]} */
const fatal = [];

try {
  const { legacy } = prepareDist(DIST);
  if (legacy) warnings.push(`${DIST} was a build from before the .rnc-dist marker; it was replaced and is marked now`);
} catch (e) {
  if (!(e instanceof DistGuardError)) throw e;
  console.error(`build: ${e.message}`);
  process.exit(1);
}
mkdirSync(join(DIST, 'assets', 'brand'), { recursive: true });
mkdirSync(join(DIST, 'assets', 'build'), { recursive: true });
mkdirSync(join(DIST, 'assets', 'fonts'), { recursive: true });
mkdirSync(join(DIST, 'assets', 'art'), { recursive: true });

const data = loadAll();
initImages(data.images, { offline });

/* ---- CSS: tokens (compiled from brand/tokens.json, unlayered) + site/src/styles/*.css in name order, one hashed file ---- */
const tokens = tokensCss(readTokens());
const tokensFile = sharedFile('brand', 'tokens.css');
if (tokensFile && readFileSync(tokensFile, 'utf8') !== tokens) warnings.push('brand/tokens.css is stale: run node brand/build-tokens.mjs (the build uses tokens.json directly)');
const h = (/** @type {string} */ s) => createHash('sha256').update(s).digest('hex').slice(0, 10);
const { css } = bundleCss({ tokens, stylesDir: join(paths.site, 'src/styles'), minify });

/* ---- JS: every site/src/scripts module, hashed leaves first with import specifiers rewritten (CONTRACT §12) ---- */
const { modules, files: moduleFiles } = buildModules(join(paths.site, 'src/scripts'));
for (const f of moduleFiles) writeFileSync(join(DIST, f.url), f.code);
if (!modules.main) issues.push('missing src/scripts/main.js');
/** env.assets.js (main) and env.assets.css keep their seed meaning; env.assets.modules[name] = { src, deps[] }. */
const assets = { css: `/assets/build/site.${h(css)}.css`, js: modules.main?.src || '', modules };
writeFileSync(join(DIST, assets.css), css);

/* ---- CSP: one policy for every path; it must carry the sha256 of every frozen inline script (CONTRACT §11) ---- */
const tomlPath = join(paths.root, 'netlify.toml');
const toml = existsSync(tomlPath) ? readFileSync(tomlPath, 'utf8') : '';
const cspHashes = cspScriptHashes(toml);
if (!toml) fatal.push('netlify.toml not found at the repository root');
else {
  if (!/for = "\/\*"[\s\S]*?Content-Security-Policy/.test(toml)) fatal.push('netlify.toml has no Content-Security-Policy header for "/*"');
  for (const s of INLINE_SCRIPTS) if (!cspHashes.includes(sha256(s))) fatal.push(`netlify.toml CSP script-src is missing '${sha256(s)}' for an inline head script (src/lib/head-scripts.mjs)`);
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
/**
 * CONTRACT §14 route shape (the optional fields are read defensively).
 * @typedef {{ path: string, file: string, render: () => any, sources?: string[], scripts?: string[], sitemap?: boolean, noindex?: boolean, showcaseOnly?: boolean }} BuildRoute
 */
// showcaseOnly routes (/styleguide/) are never built in launch mode.
const list = /** @type {BuildRoute[]} */ (routes(env)).filter((r) => !(launch && r.showcaseOnly));
let pageCount = 0, spriteBefore = 0, spriteAfter = 0;
for (const r of list) {
  // A route whose file is not .html (e.g. _redirects) is written raw: tokens resolved as plain text, no chips, no typographer.
  const isHtml = r.file.endsWith('.html');
  let out = isHtml
    ? typographer(finalizeTokens(String(r.render()), { launch, file: r.file, issues, html: true }))
    : finalizeTokens(String(r.render()), { launch, file: r.file, issues, html: false });
  if (isHtml) {
    if (launch && /class="sample-label"/.test(out)) issues.push(`${r.file}: renders sample content (sample: true)`);
    // Keep only the sprite symbols this page references, preload the module graph, and police inline scripts.
    const before = out.length;
    out = shakeSprite(out).html;
    spriteBefore += before; spriteAfter += out.length;
    out = addModulePreloads(out, modules);
    for (const p of inlineScriptProblems(out, { allowed: INLINE_SCRIPTS, cspHashes })) fatal.push(`${r.file}: ${p}`);
  }
  const file = join(DIST, r.file);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, out);
  if (isHtml) pageCount++;
}

/* ---- illustrations for slots without a photo ---- */
const art = renderArt();
for (const a of art) writeFileSync(join(DIST, 'assets', 'art', `${a.id}.svg`), a.svg);

/* ---- sitemap, robots, manifest, headers ---- */
const indexable = list.filter((r) => r.path !== '/404.html' && r.file.endsWith('.html') && r.sitemap !== false && !r.noindex && !r.showcaseOnly);
const today = new Date().toISOString().slice(0, 10);
const smOrigin = origin || 'https://[DOMAIN]';
// <lastmod>: the latest git commit date of the route's sources; the build date when that is unknown (one warning per reason).
const lastmod = gitLastmod(paths.root);
if (lastmod.reason) warnings.push(`sitemap lastmod uses the build date: ${lastmod.reason === 'shallow' ? 'this is a shallow git clone (fetch the full history for real dates)' : 'git history is not available'}`);
let undated = 0;
const lastmodOf = (/** @type {BuildRoute} */ r) => { const d = lastmod.dateFor(r.sources); if (!d) undated++; return d || today; };
const smRows = indexable.map((r) => `  <url><loc>${smOrigin}${r.path}</loc><lastmod>${lastmodOf(r)}</lastmod></url>`);
if (undated && !lastmod.reason) warnings.push(`sitemap lastmod uses the build date for ${undated} of ${indexable.length} route(s) without committed sources[]`);
writeFileSync(join(DIST, 'sitemap.xml'), finalizeTokens(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${smRows.join('\n')}
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
if (fatal.length) {
  console.error(`\nBuild FAILED: ${fatal.length} problem(s) that would break the site in production:\n${fatal.slice(0, 40).map((i) => `  - ${i}`).join('\n')}${fatal.length > 40 ? `\n  … and ${fatal.length - 40} more` : ''}\n`);
  process.exit(1);
}
if (issues.length) {
  console.error(`\nBuild ${launch ? 'FAILED' : 'has problems'} (${launch ? 'launch' : 'showcase'}, ${context}). Fix before publishing:\n${issues.map((i) => `  - ${i}`).join('\n')}\n`);
  if (launch || issues.some((i) => i.startsWith('missing'))) process.exit(1);
}
const shown = DIST.startsWith(`${paths.site}/`) ? DIST.slice(paths.site.length + 1) : DIST;
console.log(`Built ${pageCount} pages and ${art.length} illustrations (${launch ? 'launch' : 'showcase'}, ${context}${offline ? ', offline images' : ''}${minify ? '' : ', unminified CSS'}) into ${shown}/ (${kb(DIST)} KB; sprite tree-shaking saved ${((spriteBefore - spriteAfter) / 1024 / Math.max(1, pageCount)).toFixed(1)} KB per page) in ${Date.now() - t0} ms`);
