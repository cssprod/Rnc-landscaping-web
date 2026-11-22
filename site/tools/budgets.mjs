#!/usr/bin/env node
// @ts-check
/**
 * Budgets v2 (CONTRACT §16), measured statically over the build (SITE_DIST) as what a visitor downloads, per page.
 * Lighthouse scores and CWV are lighthouse.mjs; animation counts and backdrop-filter are motion-audit.mjs.
 *
 * Rules:
 *   v2                   the per-page table (fail / warn), one rule id per row so that a baselined row never hides a new
 *                        failure of another row on the same page (baselines key on { rule, path }, CONTRACT §17):
 *                        v2-css, v2-js, v2-html-gz, v2-html-raw, v2-inline-svg, v2-hero-scene, v2-sprite,
 *                        v2-sprite-logo, v2-art, v2-fonts, v2-font-files, v2-weight, v2-hero-raster. "v2" is the
 *                        umbrella id the traceability items name:
 *                          CSS (gzip) > 36 KB / > 28 KB;  JS (gzip, every module script, its modulepreloads and the
 *                          static import graph) > 22 KB / > 14 KB;  HTML > 30 KB gzip or 150 KB raw / > 22 KB or 90 KB;
 *                          inline SVG > 45 KB raw;  hero scene ([data-living] in the page hero) > 16 KB raw;  used
 *                          sprite (the inline <symbol> sheet) > 8 KB raw for the icons, with the logo's symbols and
 *                          paint servers (ids logo-*) budgeted on their own, > 6 KB raw (v2-sprite-logo: the logo is
 *                          in every page's sprite, ds-chrome request §11);  art file (assets/art/*.svg) > 14 KB raw;
 *                          fonts > 110 KB or > 2 files (the @font-face files of the page's CSS);  page weight (HTML +
 *                          CSS + JS gzip, fonts, every local image the page references) home > 500 KB, inner > 350 KB;
 *                          hero raster (the fetchpriority=high photo, largest AVIF candidate) > 120 KB.
 *                        /styleguide/ is showcase-only (never built for launch; it renders every primitive and scene
 *                        at once), so it is exempt from v2-inline-svg, v2-sprite, v2-sprite-logo and the HTML-size
 *                        warnings; its sizes are still printed (ds-comp request §10).
 *   image-widths         no image candidate wider than 1600 px: srcset "w" descriptors, CDN ?w= parameters and the
 *                        pixel width of local raster files (PNG, JPEG, WebP, AVIF headers) (A13 #27).
 *   picture-pipeline     a local raster photo is a <picture> with AVIF then WebP sources and a srcset; every <img> has
 *                        width and height; at most one fetchpriority="high" image, which is never lazy; every other
 *                        image is loading="lazy" decoding="async" (CONTRACT §7, C4.5).
 *   third-party-origins  pages load nothing from another origin except images.unsplash.com in an online showcase
 *                        build and plausible.io in a launch build. Covers src, srcset, stylesheet/preload/modulepreload/
 *                        prefetch/icon/manifest links, inline url() and the CSS files' url() (A13 #28; "Third-party
 *                        origins (offline build) > 0").
 *   third-party-hints    the same allow-list for connection hints (preconnect, dns-prefetch), which fetch nothing, kept
 *                        apart so that a baselined hint never hides a real third-party load on the same page.
 * Offline or online is never inferred from the thing being checked (a leaked CDN image must not turn an offline build
 * "online"). The build is offline when --offline or --offline-images is in argv (check-all runs the tools in-process,
 * so its flags count), SITE_IMAGES=offline is set, or any slot that has a stock photo in media/images.json is rendered
 * as its local illustration (/assets/art/<slot>.svg), which only --offline-images does. --online forces online.
 * --root=DIR reads media/images.json from another checkout.
 * Reports through tools/lib.mjs report() (baselines, CONTRACT §17). Exits 0 when there is no build.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { DIST, REPO, files, read, report } from './lib.mjs';

export const RULES = ['v2', 'v2-css', 'v2-js', 'v2-html-gz', 'v2-html-raw', 'v2-inline-svg', 'v2-hero-scene', 'v2-sprite',
  'v2-sprite-logo', 'v2-art', 'v2-fonts', 'v2-font-files', 'v2-weight', 'v2-hero-raster', 'image-widths', 'picture-pipeline',
  'third-party-origins', 'third-party-hints'];

const KB = 1024;
export const BUDGET = {
  cssGz: [36 * KB, 28 * KB], jsGz: [22 * KB, 14 * KB], htmlGz: [30 * KB, 22 * KB], htmlRaw: [150 * KB, 90 * KB],
  inlineSvg: 45 * KB, heroScene: 16 * KB, sprite: 8 * KB, spriteLogo: 6 * KB, artFile: 14 * KB, fonts: 110 * KB, fontFiles: 2,
  pageHome: 500 * KB, pageInner: 350 * KB, heroRaster: 120 * KB, maxImageWidth: 1600,
};
/** Showcase-only pages (never in a launch build): exempt from the inline-SVG, sprite and HTML-size warning rows. */
const SHOWCASE_ONLY = new Set(['styleguide/index.html']);

/**
 * Bytes of the logo inside a sprite sheet: its <symbol id="logo-…"> and the <defs> children with a logo-* id
 * (gradients, clip paths, the shared squircle path). The rest of the sheet is the icons.
 * @param {string} sheet one inline <svg> that holds <symbol>s
 */
export function logoBytes(sheet) {
  let n = 0;
  for (const m of sheet.matchAll(/<symbol\b[^>]*\sid="logo-[^"]*"[\s\S]*?<\/symbol>/g)) n += Buffer.byteLength(m[0]);
  for (const d of sheet.matchAll(/<defs\b[^>]*>([\s\S]*?)<\/defs>/g)) {
    for (const m of d[1].matchAll(/<(\w+)\b[^>]*\sid="logo-[^"]*"[^>]*?(?:\/>|>[\s\S]*?<\/\1>)/g)) n += Buffer.byteLength(m[0]);
  }
  return n;
}
/** Entities in an attribute value, decoded for messages ("?w=2000&amp;q=72" → "?w=2000&q=72"). @param {string} s */
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** @type {import('./lib.mjs').Failure[]} */
const failures = [];
/** @type {string[]} */
const warnings = [];
/** @type {string[]} */
const notes = [];
const fail = (/** @type {string} */ rule, /** @type {string} */ path, /** @type {string} */ message) => failures.push({ rule, path, message });
const kb = (/** @type {number} */ n) => `${(n / KB).toFixed(1)} KB`;
/** Fail above the first limit, warn above the second. @param {string} rule @param {string} f @param {string} what @param {number} n @param {number[]} lim */
const table = (rule, f, what, n, [failAt, warnAt]) => {
  if (n > failAt) fail(rule, f, `${what} ${kb(n)} (budget ${kb(failAt)})`);
  else if (warnAt && n > warnAt) warnings.push(`${f}: ${what} ${kb(n)} (warn above ${kb(warnAt)})`);
};

/** dist path of a local URL, or null. @param {string} u */
const local = (u) => { if (!u || /^(?:[a-z]+:)?\/\//i.test(u) || /^(?:data|mailto|tel|sms|#)/i.test(u)) return null; const p = decodeURI(u.split(/[?#]/)[0]); return p.startsWith('/') ? p.slice(1) : null; };
/** @type {Map<string, { raw: number, gz: number }>} */
const sizeCache = new Map();
const size = (/** @type {string|null} */ p) => {
  if (!p) return { raw: 0, gz: 0 };
  if (!sizeCache.has(p)) {
    let raw = 0, gz = 0;
    try { const b = readFileSync(join(DIST, p)); raw = b.length; gz = /\.(woff2?|avif|webp|jpe?g|png|gif|ico)$/i.test(p) ? raw : gzipSync(b).length; } catch { /* missing: check-links' job */ }
    sizeCache.set(p, { raw, gz });
  }
  return /** @type {{ raw: number, gz: number }} */ (sizeCache.get(p));
};

/** A module and its static imports, transitively (the build rewrites specifiers to hashed /assets/build URLs). */
/** @type {Map<string, string[]>} */
const importsCache = new Map();
function jsGraph(/** @type {string[]} */ entries) {
  const seen = new Set();
  const stack = entries.map(local).filter(Boolean);
  while (stack.length) {
    const p = /** @type {string} */ (stack.pop());
    if (seen.has(p)) continue;
    seen.add(p);
    if (!importsCache.has(p)) {
      let src = '';
      try { src = readFileSync(join(DIST, p), 'utf8'); } catch {}
      importsCache.set(p, [...src.matchAll(/(?:\bimport\s*(?:[\w*{}\s,$]+\s*from\s*)?|\bexport\s*[\w*{}\s,$]+\s*from\s*)["']([^"']+)["']/g)].map((m) => (m[1].startsWith('/') ? m[1].slice(1) : join(p, '..', m[1]).replace(/\\/g, '/'))));
    }
    stack.push(.../** @type {string[]} */ (importsCache.get(p)));
  }
  return [...seen];
}

/** Pixel width of a local raster file from its header (PNG, JPEG, GIF, WebP, AVIF). @param {string} p */
export function imageWidth(p) {
  let b;
  try { b = readFileSync(join(DIST, p)); } catch { return 0; }
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return b.readUInt32BE(16);
  if (b.length > 10 && b.toString('ascii', 0, 3) === 'GIF') return b.readUInt16LE(6);
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8 ') return b.readUInt16LE(26) & 0x3fff;
    if (kind === 'VP8L') return 1 + (((b[22] & 0x3f) << 8) | b[21]);
    if (kind === 'VP8X') return 1 + b.readUIntLE(24, 3);
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return b.readUInt16BE(i + 7);
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  const ispe = b.indexOf('ispe');
  if (ispe > 0 && b.toString('ascii', 4, 8) === 'ftyp') return b.readUInt32BE(ispe + 8);
  return 0;
}

const pages = existsSync(DIST) ? files() : [];
const allHtml = pages.map((f) => [f, read(f)]);
const ROOT = process.argv.find((a) => a.startsWith('--root='))?.slice(7) || REPO;
/** Slot ids that have a stock photo in media/images.json. @type {Set<string>} */
const stockSlots = (() => {
  try {
    const list = JSON.parse(readFileSync(join(ROOT, 'media', 'images.json'), 'utf8'));
    return new Set((Array.isArray(list) ? list : []).filter((/** @type {any} */ x) => x?.stock?.imageUrl).map((/** @type {any} */ x) => String(x.id)));
  } catch { return new Set(); }
})();
/** A stock slot rendered as its local illustration: only an --offline-images build does that. @param {string} h */
const rendersStockAsArt = (h) => [...h.matchAll(/<figure\b[^>]*\sdata-slot="([^"]+)"[^>]*>\s*<img\b[^>]*\ssrc="\/assets\/art\/([^"/]+)\.svg"/g)].some((m) => m[1] === m[2] && stockSlots.has(m[1]));
export const offline = !process.argv.includes('--online') && (process.argv.includes('--offline') || process.argv.includes('--offline-images')
  || process.env.SITE_IMAGES === 'offline' || allHtml.some(([, h]) => rendersStockAsArt(h)));
const launch = !!allHtml.find(([f]) => f === 'index.html') && !/<meta name="robots" content="[^"]*noindex/.test(allHtml.find(([f]) => f === 'index.html')?.[1] || '');
const ALLOWED = new Set([...(offline ? [] : ['images.unsplash.com']), ...(launch ? ['plausible.io'] : [])]);
/** @type {Map<string, string[]>} */
const cssUrlCache = new Map();
const cssUrls = (/** @type {string} */ p) => {
  if (!cssUrlCache.has(p)) { let s = ''; try { s = readFileSync(join(DIST, p), 'utf8'); } catch {} cssUrlCache.set(p, [...s.matchAll(/url\(\s*['"]?([^'")]+)/g)].map((m) => m[1])); }
  return /** @type {string[]} */ (cssUrlCache.get(p));
};
/** @type {Map<string, string[]>} */
const fontCache = new Map();
const fontsOf = (/** @type {string} */ p) => {
  if (!fontCache.has(p)) { let s = ''; try { s = readFileSync(join(DIST, p), 'utf8'); } catch {} fontCache.set(p, [...new Set([...s.matchAll(/@font-face\s*{[^}]*}/g)].flatMap((m) => [...m[0].matchAll(/url\(\s*['"]?([^'")]+\.woff2?)/g)].map((x) => x[1])))]); }
  return /** @type {string[]} */ (fontCache.get(p));
};
let maxCss = 0, maxJs = 0, maxHtml = 0, maxWeight = 0;

for (const [f, h] of allHtml) {
  const body = h.replace(/<script\b(?![^>]*\bsrc=)[\s\S]*?<\/script>/g, '');
  /* ---- CSS, JS, HTML ---- */
  const cssHrefs = [...h.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g), ...h.matchAll(/<link\b[^>]*href="([^"]+)"[^>]*rel="stylesheet"/g)].map((m) => m[1]);
  const css = [...new Set(cssHrefs)].reduce((n, u) => n + size(local(u)).gz, 0);
  const entries = [...h.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g), ...h.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const js = jsGraph(entries).reduce((n, p) => n + size(p).gz, 0);
  const hg = gzipSync(h).length;
  maxCss = Math.max(maxCss, css); maxJs = Math.max(maxJs, js); maxHtml = Math.max(maxHtml, hg);
  table('v2-css', f, 'CSS (gzip)', css, BUDGET.cssGz);
  table('v2-js', f, 'JS incl. import graph (gzip)', js, BUDGET.jsGz);
  const showcase = SHOWCASE_ONLY.has(f);
  // Showcase-only pages keep the fail rows, not the warnings (the page shows everything at once by design).
  table('v2-html-gz', f, 'HTML (gzip)', hg, showcase ? [BUDGET.htmlGz[0], 0] : BUDGET.htmlGz);
  table('v2-html-raw', f, 'HTML (raw)', h.length, showcase ? [BUDGET.htmlRaw[0], 0] : BUDGET.htmlRaw);
  /* ---- SVG ---- */
  const svgs = [...body.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map((m) => m[0]);
  const inlineSvg = svgs.reduce((n, s) => n + Buffer.byteLength(s), 0);
  const sheets = svgs.filter((s) => /<symbol\b/.test(s));
  const sprite = sheets.reduce((n, s) => n + Buffer.byteLength(s), 0);
  const logo = sheets.reduce((n, s) => n + logoBytes(s), 0);
  if (showcase) notes.push(`${f}: showcase-only, not budgeted: inline SVG ${kb(inlineSvg)}, sprite icons ${kb(sprite - logo)} + logo ${kb(logo)}, HTML ${kb(hg)} gzip / ${kb(h.length)} raw`);
  else {
    if (inlineSvg > BUDGET.inlineSvg) fail('v2-inline-svg', f, `inline SVG ${kb(inlineSvg)} raw (budget ${kb(BUDGET.inlineSvg)})`);
    if (sprite - logo > BUDGET.sprite) fail('v2-sprite', f, `used sprite icons ${kb(sprite - logo)} raw (budget ${kb(BUDGET.sprite)}; the logo-* symbols and defs, ${kb(logo)}, are v2-sprite-logo)`);
    if (logo > BUDGET.spriteLogo) fail('v2-sprite-logo', f, `sprite logo (logo-* symbols and defs) ${kb(logo)} raw (budget ${kb(BUDGET.spriteLogo)})`);
  }
  const hero = body.match(/<(section|header)\b[^>]*class="[^"]*\b(?:hero|page-head)\b[\s\S]*?<\/\1>/)?.[0] || '';
  const scene = hero.match(/<(\w+)\b[^>]*\sdata-living\b[^>]*>/);
  if (scene) {
    const start = hero.indexOf(scene[0]);
    let depth = 0, end = start;
    const re = new RegExp(`<(/?)${scene[1]}\\b[^>]*>`, 'g');
    re.lastIndex = start;
    for (let m; (m = re.exec(hero));) { depth += m[1] ? -1 : /\/>$/.test(m[0]) ? 0 : 1; if (depth <= 0) { end = re.lastIndex; break; } }
    const n = Buffer.byteLength(hero.slice(start, end > start ? end : hero.length));
    if (n > BUDGET.heroScene) fail('v2-hero-scene', f, `hero scene ${kb(n)} raw (budget ${kb(BUDGET.heroScene)})`);
  }
  /* ---- fonts ---- */
  const fonts = [...new Set(cssHrefs.flatMap((u) => { const p = local(u); return p ? fontsOf(p).map((x) => local(x.startsWith('/') ? x : `/${join(p, '..', x)}`)) : []; }).filter(Boolean))];
  const fontBytes = fonts.reduce((n, p) => n + size(p).raw, 0);
  if (fontBytes > BUDGET.fonts) fail('v2-fonts', f, `fonts ${kb(fontBytes)} (budget ${kb(BUDGET.fonts)})`);
  if (fonts.length > BUDGET.fontFiles) fail('v2-font-files', f, `${fonts.length} font files (budget ${BUDGET.fontFiles})`);
  /* ---- images ---- */
  const imgs = [...body.matchAll(/<img\b[^>]*>/g)].map((m) => ({ tag: m[0], index: /** @type {number} */ (m.index) }));
  const attr = (/** @type {string} */ tag, /** @type {string} */ a) => tag.match(new RegExp(`\\s${a}="([^"]*)"`))?.[1];
  const imgFiles = new Set();
  for (const { tag } of imgs) { const p = local(attr(tag, 'src') || ''); if (p) imgFiles.add(p); }
  const weight = hg + css + js + fontBytes + [...imgFiles].reduce((n, p) => n + size(p).gz, 0);
  maxWeight = Math.max(maxWeight, weight);
  const limit = f === 'index.html' ? BUDGET.pageHome : BUDGET.pageInner;
  if (weight > limit) fail('v2-weight', f, `page weight ${kb(weight)} (HTML, CSS, JS, fonts and local images; budget ${kb(limit)})`);

  /* ---- image-widths ---- */
  const cands = [...body.matchAll(/<(?:img|source)\b[^>]*>/g)].flatMap((m) => [attr(m[0], 'src'), ...(attr(m[0], 'srcset') || '').split(',').map((c) => c.trim())].filter(Boolean));
  for (const c of new Set(cands)) {
    const [u, d] = /** @type {string} */ (c).split(/\s+/);
    const wDesc = d && /^\d+w$/.test(d) ? Number(d.slice(0, -1)) : 0;
    const wParam = Number(u.match(/[?&](?:w|width)=(\d+)/)?.[1] || 0);
    const p = local(u);
    const wFile = p && /\.(png|jpe?g|webp|avif|gif)$/i.test(p) ? imageWidth(p) : 0;
    const w = Math.max(wDesc, wParam, wFile);
    if (w > BUDGET.maxImageWidth) fail('image-widths', f, `image candidate ${unescape(u).slice(0, 80)} is ${w} px wide (max ${BUDGET.maxImageWidth})`);
  }

  /* ---- picture-pipeline ---- */
  let high = 0;
  for (const { tag, index } of imgs) {
    const src = attr(tag, 'src') || '';
    if (!/\swidth="\d/.test(tag) || !/\sheight="\d/.test(tag)) fail('picture-pipeline', f, `<img> without width and height: ${tag.slice(0, 90)}`);
    const isHigh = /\sfetchpriority="high"/.test(tag);
    if (isHigh) { high++; if (/\sloading="lazy"/.test(tag)) fail('picture-pipeline', f, `the hero image is lazy-loaded: ${tag.slice(0, 90)}`); }
    else if (!/\sloading="lazy"/.test(tag) || !/\sdecoding="async"/.test(tag)) fail('picture-pipeline', f, `<img> below the hero without loading="lazy" decoding="async": ${tag.slice(0, 90)}`);
    const p = local(src);
    if (p && /\.(png|jpe?g|webp|avif)$/i.test(p) && !/^assets\/brand\//.test(p)) {
      const before = body.slice(0, index);
      const open = before.lastIndexOf('<picture');
      const inPicture = open > before.lastIndexOf('</picture>');
      const pic = inPicture ? before.slice(open) : '';
      const avif = pic.search(/<source\b[^>]*type="image\/avif"/), webp = pic.search(/<source\b[^>]*type="image\/webp"/);
      if (!inPicture || avif < 0 || webp < 0 || webp < avif) fail('picture-pipeline', f, `local photo ${src} is not a <picture> with AVIF then WebP sources`);
      if (!/\ssrcset="/.test(tag) && !/<source\b[^>]*srcset="/.test(pic)) fail('picture-pipeline', f, `local photo ${src} has no srcset (480/768/1024/1600)`);
      if (isHigh && avif >= 0) {
        const set = pic.match(/<source\b[^>]*type="image\/avif"[^>]*srcset="([^"]+)"|<source\b[^>]*srcset="([^"]+)"[^>]*type="image\/avif"/);
        const biggest = Math.max(0, ...String(set?.[1] || set?.[2] || '').split(',').map((c) => size(local(c.trim().split(/\s+/)[0])).raw));
        if (biggest > BUDGET.heroRaster) fail('v2-hero-raster', f, `hero raster ${kb(biggest)} AVIF (budget ${kb(BUDGET.heroRaster)})`);
      }
    }
  }
  if (high > 1) fail('picture-pipeline', f, `${high} images with fetchpriority="high" (only the hero)`);

  /* ---- third-party-origins ---- */
  const links = [...h.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]);
  const loads = [
    ...[...body.matchAll(/<(?:img|source|script|iframe|video|audio|embed)\b[^>]*>/g)].flatMap((m) => [attr(m[0], 'src'), ...(attr(m[0], 'srcset') || '').split(',').map((c) => c.trim().split(/\s+/)[0])]),
    ...links.filter((l) => /\srel="(?:stylesheet|preload|modulepreload|prefetch|icon|apple-touch-icon|manifest)"/.test(l)).map((l) => attr(l, 'href')),
    ...[...body.matchAll(/url\(\s*['"]?([^'")]+)/g)].map((m) => m[1]),
    ...cssHrefs.flatMap((u) => { const p = local(u); return p ? cssUrls(p) : [u]; }),
  ];
  const hints = links.filter((l) => /\srel="(?:preconnect|dns-prefetch)"/.test(l)).map((l) => attr(l, 'href'));
  /** Third-party origins of a list of URLs. @param {(string|undefined)[]} refs */
  const originsOf = (refs) => {
    const out = new Set();
    for (const r of refs) { const m = String(r || '').match(/^(?:https?:)?\/\/([^/?#:]+)/i); if (m && !/^(?:localhost|127\.0\.0\.1)$/.test(m[1])) out.add(m[1].toLowerCase()); }
    return out;
  };
  const why = offline ? 'an offline build loads no third party' : `allowed: ${[...ALLOWED].join(', ') || 'none'}`;
  for (const o of originsOf(loads)) if (!ALLOWED.has(o)) fail('third-party-origins', f, `loads from ${o} (${why})`);
  for (const o of originsOf(hints)) if (!ALLOWED.has(o)) fail('third-party-hints', f, `preconnect/dns-prefetch to ${o} (${why})`);
}

/* ---- art files ---- */
for (const p of existsSync(DIST) ? files('.svg').filter((x) => x.startsWith('assets/art/')) : []) {
  const n = statSync(join(DIST, p)).size;
  if (n > BUDGET.artFile) fail('v2-art', p, `art file ${kb(n)} raw (budget ${kb(BUDGET.artFile)})`);
}

if (pages.length) console.log(`  budgets v2: ${pages.length} pages (${offline ? 'offline' : 'online'}${launch ? ', launch' : ''} build); largest CSS ${kb(maxCss)}, JS ${kb(maxJs)}, HTML ${kb(maxHtml)} gzip; heaviest page ${kb(maxWeight)}`);
for (const n of notes) console.log(`  note: ${n}`);
for (const w of warnings.slice(0, 8)) console.warn(`  warn: ${w}`);
if (warnings.length > 8) console.warn(`  warn: … and ${warnings.length - 8} more`);
const ok = report('budgets', failures);
if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = ok ? 0 : 1;
export default ok;
