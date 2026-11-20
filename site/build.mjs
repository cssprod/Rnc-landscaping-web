#!/usr/bin/env node
// @ts-check
/**
 * Zero-dependency static site generator for the RNC Landscaping site.
 *   node build.mjs                    staging build (tokens highlighted, noindex)
 *   CONTEXT=production node build.mjs production build (fails on tokens/samples/fixtures)
 *   node build.mjs --offline-images   SVG placeholders instead of CDN photos
 */
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { loadAll, sharedFile, paths, fallbacks } from './src/lib/data.mjs';
import { initImages } from './src/lib/images.mjs';
import { finalizeTokens, tok } from './src/lib/tokens.mjs';
import { routes } from './src/pages/routes.mjs';
import { JS_FLAG } from './src/components/layout.mjs';
import { site } from './site.config.mjs';

const t0 = Date.now();
const args = new Set(process.argv.slice(2));
const context = process.env.CONTEXT || 'dev';
const production = context === 'production';
const offline = args.has('--offline-images');
const DIST = join(paths.site, 'dist');
/** @type {string[]} */
const issues = [];
/** @type {string[]} */
const warnings = [];

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets', 'brand'), { recursive: true });

const data = loadAll();
initImages(data.images, { offline });

/* ---- CSS: tokens + components, one file, content-hashed ---- */
const tokensFile = sharedFile('brand', 'tokens.css');
let tokensCss = tokensFile ? readFileSync(tokensFile, 'utf8') : '';
const importUrl = tokensCss.match(/@import\s+url\(["']?([^"')]+)["']?\)\s*;?/)?.[1] || null;
tokensCss = tokensCss.replace(/@import\s+url\([^)]*\)[^;]*;/g, '').replace(/@import\s+["'][^"']*["'][^;]*;/g, '');
const fontsUrl = data.tokensJson?.fonts?.googleCssUrl || importUrl;
const css = `${tokensCss}\n${readFileSync(join(paths.site, 'src/styles/site.css'), 'utf8')}`;
const js = readFileSync(join(paths.site, 'src/scripts/main.js'), 'utf8');
const h = (/** @type {string} */ s) => createHash('sha256').update(s).digest('hex').slice(0, 10);
const assets = { css: `/assets/site.${h(css)}.css`, js: `/assets/main.${h(js)}.js` };
writeFileSync(join(DIST, assets.css), css);
writeFileSync(join(DIST, assets.js), js);

/* ---- CSP hash for the one inline script must match netlify.toml ---- */
const flagHash = `sha256-${createHash('sha256').update(JS_FLAG).digest('base64')}`;
const toml = readFileSync(join(paths.site, 'netlify.toml'), 'utf8');
if (!toml.includes(flagHash)) issues.push(`netlify.toml CSP is missing '${flagHash}' for the inline JS flag script`);

/* ---- static files, brand assets ---- */
if (existsSync(join(paths.site, 'static'))) cpSync(join(paths.site, 'static'), DIST, { recursive: true });
for (const f of ['logo.svg', 'logo-mark.svg', 'logo-reversed.svg', 'favicon.svg']) {
  const src = sharedFile('brand', f);
  if (src) cpSync(src, join(DIST, 'assets', 'brand', f));
  else warnings.push(`brand/${f} missing`);
}
if (existsSync(join(DIST, 'assets/brand/favicon.svg'))) cpSync(join(DIST, 'assets/brand/favicon.svg'), join(DIST, 'favicon.svg'));

/* ---- origin ---- */
const origin = production ? `https://${tok('DOMAIN')}` : (process.env.DEPLOY_PRIME_URL || '');
const hasCapability = !!site.capabilityStatement && existsSync(join(DIST, site.capabilityStatement));
if (!hasCapability) (production ? issues : warnings).push(`capability statement PDF missing: add static${site.capabilityStatement}`);
const env = { production, context, origin, data, assets, fontsUrl, hasCapability };

/* ---- pages ---- */
const list = routes(env);
for (const sec of new Set(list.map((r) => (r.path === '/' || r.path.endsWith('.html') ? r.path : `/${r.path.split('/')[1]}/*`)))) {
  if (!toml.includes(`for = "${sec}"`)) issues.push(`netlify.toml has no Content-Security-Policy block for "${sec}"`);
}
let pageCount = 0;
for (const r of list) {
  const out = finalizeTokens(String(r.render()), { production, file: r.file, issues, html: true });
  if (production && /class="sample-label"/.test(out)) issues.push(`${r.file}: renders sample content (sample: true)`);
  const file = join(DIST, r.file);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, out);
  pageCount++;
}

/* ---- sitemap, robots, manifest, headers ---- */
const indexable = list.filter((r) => !['/404.html', '/quote/thanks/'].includes(r.path));
const today = new Date().toISOString().slice(0, 10);
const smOrigin = origin || 'https://[DOMAIN]';
writeFileSync(join(DIST, 'sitemap.xml'), finalizeTokens(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((r) => `  <url><loc>${smOrigin}${r.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`, { production, file: 'sitemap.xml', issues, html: false }));
writeFileSync(join(DIST, 'robots.txt'), production
  ? finalizeTokens(`User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: https://[DOMAIN]/sitemap.xml\n`, { production, file: 'robots.txt', issues, html: false })
  : `# Preview build (${context}): not for indexing\nUser-agent: *\nDisallow: /\n`);
writeFileSync(join(DIST, 'site.webmanifest'), JSON.stringify({
  name: site.name, short_name: site.shortName, start_url: '/', display: 'browser', lang: 'en-CA',
  background_color: '#F4F5F1', theme_color: '#2E4A3B',
  icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
}, null, 2));
// Headers in netlify.toml are global; per-context noindex is written here.
if (!production) writeFileSync(join(DIST, '_headers'), `/*\n  X-Robots-Tag: noindex, nofollow\n`);

/* ---- fixture / data checks ---- */
const fb = [...new Set(fallbacks)];
if (fb.length) (production ? issues : warnings).push(`using ${fb.length} fixture file(s) instead of real shared files: ${fb.slice(0, 8).join(', ')}${fb.length > 8 ? ', …' : ''}`);
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
  console.error(`\nBuild ${production ? 'FAILED' : 'has problems'} (${context}). Fix before publishing:\n${issues.map((i) => `  - ${i}`).join('\n')}\n`);
  if (production || issues.some((i) => i.startsWith('netlify.toml') || i.startsWith('missing'))) process.exit(1);
}
console.log(`Built ${pageCount} pages (${context}${offline ? ', offline images' : ''}) into dist/ (${kb(DIST)} KB) in ${Date.now() - t0} ms`);
