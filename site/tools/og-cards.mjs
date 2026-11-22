#!/usr/bin/env node
// @ts-check
/**
 * Open Graph cards: one 1200×630 card per page (blueprint C6 "social cards", A13 #18; REDESIGN-PLAN C6 "OG").
 * Built by seo in W2; og-render runs --render and commits the cards in W5. Not a check-* tool (it needs Playwright for
 * --render), so check-all and Netlify never run it.
 *
 *   node tools/og-cards.mjs [--list]               print the card specs for the built site (SITE_DIST) as JSON
 *   node tools/og-cards.mjs --render [--only=k,…]  render site/static/og/<key>.jpg (≤ 45 KB each) plus default.jpg
 *   node tools/og-cards.mjs --check                rule `coverage`: every page has its own committed card ≤ 45 KB,
 *                                                  no two cards are byte-identical, and (when the dist was built after
 *                                                  the cards) each page's og:image points at its own card
 * Options: --format=jpg|png (default jpg), --dir=DIR (render/check a preview folder instead of site/static/og), --keep (do not delete cards for pages that no longer exist), --no-baseline.
 *
 * Card text is the page's own H1, a section eyebrow and "RNC Landscaping · Greater Victoria, BC"; sample projects carry a
 * visible "Sample" label (CONTRACT §2). No prices, claims or numbers are added. The page key is lib/seo.mjs ogKey():
 * "/" → home, "/services/irrigation/" → services-irrigation. lib/seo.mjs picks the card up on the next build.
 * Rendering is offline: fonts and the logo are inlined, and every network request is refused.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DIST, REPO, SITE, files, read, report } from './lib.mjs';

export const RULES = ['coverage'];

const argv = process.argv.slice(2);
const flag = (/** @type {string} */ k) => argv.includes(`--${k}`);
const opt = (/** @type {string} */ k) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);

/** Where cards live: site/static/og (copied to /og/ by the build); --dir=DIR renders or checks elsewhere (previews). */
export const OG_DIR = opt('dir') ? resolve(/** @type {string} */ (opt('dir'))) : join(SITE, 'static', 'og');
export const WIDTH = 1200;
export const HEIGHT = 630;
export const MAX_BYTES = 45 * 1024;
const EXTS = ['jpg', 'png'];

/** Same key as lib/seo.mjs ogKey(). @param {string} path */
export const ogKey = (path) => (path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/\.html$/, '').replace(/\//g, '-'));

/** @param {string} s */
const decode = (s) => s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return /** @type {Record<string, string>} */ ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[e.toLowerCase()] ?? m;
});
/** Text of an HTML fragment. @param {string} s */
const text = (s) => decode(s.replace(/<mark class="ph"[^>]*>([^<]*)<\/mark>/g, '$1').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
/** @param {string} s */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SECTION = /** @type {Record<string, string>} */ ({
  services: 'Services', commercial: 'Commercial and strata', areas: 'Service areas', projects: 'Projects', resources: 'Guides',
  process: 'How we work', about: 'About', faq: 'FAQ', reviews: 'Reviews', contact: 'Contact', 'free-quote': 'Free quote',
  privacy: 'Privacy', terms: 'Terms', accessibility: 'Accessibility',
});

/** Is the project a sample? (content/projects/<slug>.json sample flag; the page's "Sample" title otherwise.) @param {string} slug @param {string} title */
function isSample(slug, title) {
  const f = join(REPO, 'content', 'projects', `${slug}.json`);
  if (existsSync(f)) { try { return JSON.parse(readFileSync(f, 'utf8')).sample !== false; } catch { /* fall through */ } }
  return /\bSample\b/.test(title);
}

/**
 * @typedef {{ key: string, path: string, eyebrow: string, title: string, sample: boolean, file: string }} Card
 */

/** Card specs for every built page that gets one (not /404.html or the showcase-only styleguide), plus the default card. @returns {Card[]} */
export function cards() {
  if (!existsSync(DIST)) return [];
  /** @type {Card[]} */ const out = [];
  for (const f of files('.html').map((x) => x.replace(/\\/g, '/')).sort()) {
    const path = `/${f.replace(/(^|\/)index\.html$/, '$1')}`;
    if (path === '/404.html' || path.startsWith('/styleguide/')) continue;
    const h = read(f);
    const h1 = h.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    const title = text(h1 || h.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.split(' | ')[0] || 'RNC Landscaping');
    const [top, slug] = path.split('/').filter(Boolean);
    const sample = top === 'projects' && !!slug && isSample(slug, text(h.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''));
    const eyebrow = path === '/' ? 'Landscaping in Greater Victoria, BC' : (SECTION[top] || 'RNC Landscaping');
    out.push({ key: ogKey(path), path, eyebrow, title, sample, file: '' });
  }
  out.push({ key: 'default', path: '', eyebrow: 'Grounds, installation, irrigation and trees', title: 'Landscaping in Greater Victoria, BC', sample: false, file: '' });
  return out;
}

/** Inline a font as a data: URL (rendering stays offline). @param {string} name */
const font = (name) => `data:font/woff2;base64,${readFileSync(join(REPO, 'brand', 'fonts', name)).toString('base64')}`;

/** The card's HTML: "Fir night" ground, survey contours, moss accent, the squircle mark (DESIGN-DIRECTION "Living Coast"). @param {Card} c */
export function cardHtml(c) {
  const mark = existsSync(join(REPO, 'brand', 'logo-mark.svg')) ? readFileSync(join(REPO, 'brand', 'logo-mark.svg'), 'utf8').replace(/<\?xml[^>]*>/, '') : '';
  const size = c.title.length > 70 ? 54 : c.title.length > 44 ? 64 : 76;
  const contours = Array.from({ length: 9 }, (_, i) => {
    const y = 360 + i * 34;
    return `<path d="M-20 ${y} C 220 ${y - 60 - i * 6}, 420 ${y + 40}, 640 ${y - 20} S 1000 ${y - 90 + i * 4}, 1240 ${y - 30}" />`;
  }).join('');
  return `<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url(${font('inter-latin-var.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:Newsreader;font-style:italic;src:url(${font('newsreader-latin-italic-var.woff2')}) format('woff2');font-weight:200 800}
*{box-sizing:border-box;margin:0}
html,body{width:${WIDTH}px;height:${HEIGHT}px}
body{position:relative;overflow:hidden;font-family:Inter,system-ui,sans-serif;color:#E8F4EC;
  background:radial-gradient(ellipse 70% 80% at 88% 0%,rgba(111,224,210,.16),transparent 60%),
  radial-gradient(ellipse 60% 70% at 0% 100%,rgba(127,235,176,.14),transparent 62%),linear-gradient(160deg,#0D1D16,#06110C 55%,#030907)}
svg.contours{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke:#5ED8C6;stroke-opacity:.22;stroke-width:1.5}
.card{position:absolute;inset:64px 72px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:18px;font-weight:650;font-size:30px;letter-spacing:-.01em}
.brand svg{width:64px;height:64px}
.eyebrow{margin-top:auto;font-size:26px;font-weight:560;color:#7FEBB0;letter-spacing:.01em}
h1{margin-top:14px;font-size:${size}px;line-height:1.04;font-weight:700;letter-spacing:-.03em;max-width:21ch;text-wrap:balance}
.foot{margin-top:34px;display:flex;align-items:center;gap:16px;font-size:24px;color:#B2C8BB}
.foot em{font-family:Newsreader,Georgia,serif;font-style:italic;color:#9FF2C4;font-size:28px}
.sample{display:inline-block;margin-left:12px;padding:4px 14px;border-radius:999px;font-size:22px;font-weight:650;color:#03140B;background:#F2C462;vertical-align:middle}
</style></head><body>
<svg class="contours" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${contours}</svg>
<div class="card">
  <div class="brand">${mark}<span>RNC Landscaping</span></div>
  <p class="eyebrow">${esc(c.eyebrow)}${c.sample ? '<span class="sample">Sample</span>' : ''}</p>
  <h1>${esc(c.title)}</h1>
  <p class="foot"><em>Greater Victoria, BC</em><span>· Free quotes</span></p>
</div></body></html>`;
}

/** Committed card file for a key, or null. @param {string} key */
const cardFile = (key) => EXTS.map((e) => `${key}.${e}`).find((f) => existsSync(join(OG_DIR, f))) ?? null;

/** Render every card (or --only) with Playwright Chromium. @param {Card[]} list */
async function render(list) {
  const { chromium } = await import('playwright');
  const format = opt('format') === 'png' ? 'png' : 'jpg';
  mkdirSync(OG_DIR, { recursive: true });
  const browser = await chromium.launch(process.env.CHROME_PATH || process.env.CHROME ? { executablePath: process.env.CHROME_PATH || process.env.CHROME } : {});
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    await page.route('**/*', (r) => (r.request().url().startsWith('data:') ? r.continue() : r.abort()));
    for (const c of list) {
      await page.setContent(cardHtml(c), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      let buf;
      if (format === 'png') buf = await page.screenshot({ type: 'png' });
      else for (let q = 86; q >= 50; q -= 6) { buf = await page.screenshot({ type: 'jpeg', quality: q }); if (buf.length <= MAX_BYTES) break; }
      for (const e of EXTS) if (existsSync(join(OG_DIR, `${c.key}.${e}`))) rmSync(join(OG_DIR, `${c.key}.${e}`));
      writeFileSync(join(OG_DIR, `${c.key}.${format}`), /** @type {Buffer} */ (buf));
      console.log(`og-cards: ${c.key}.${format} ${(/** @type {Buffer} */ (buf).length / 1024).toFixed(1)} KB`);
    }
  } finally { await browser.close(); }
  if (!flag('keep') && !opt('only')) {
    const keys = new Set(list.map((c) => c.key));
    for (const f of readdirSync(OG_DIR)) { const k = f.replace(/\.(jpg|png)$/, ''); if (k !== f && !keys.has(k)) { rmSync(join(OG_DIR, f)); console.log(`og-cards: removed stale ${f}`); } }
  }
}

/** Rule coverage. @param {Card[]} list */
export function coverage(list) {
  /** @type {{ rule: string, path: string, message: string }[]} */ const out = [];
  /** @type {Map<string, string>} */ const hashes = new Map();
  for (const c of list) {
    const f = cardFile(c.key);
    const where = c.path ? (c.path.endsWith('/') ? `${c.path.slice(1)}index.html` : c.path.slice(1)) : 'site/static/og/default';
    if (!f) { out.push({ rule: 'coverage', path: where, message: `no OG card site/static/og/${c.key}.(jpg|png) (run og-cards --render)` }); continue; }
    const buf = readFileSync(join(OG_DIR, f));
    if (buf.length > MAX_BYTES) out.push({ rule: 'coverage', path: where, message: `${f} is ${(buf.length / 1024).toFixed(1)} KB (≤ 45 KB)` });
    const h = createHash('sha256').update(buf).digest('hex');
    if (hashes.has(h)) out.push({ rule: 'coverage', path: where, message: `${f} is identical to ${hashes.get(h)} (one card per page)` });
    hashes.set(h, f);
    if (c.path && existsSync(DIST) && statSync(join(OG_DIR, f)).mtimeMs <= statSync(DIST).mtimeMs) {
      const og = read(where).match(/<meta property="og:image" content="([^"]*)"/)?.[1] || '';
      if (!og.endsWith(`/og/${f}`)) out.push({ rule: 'coverage', path: where, message: `og:image is ${og || '(none)'}, not /og/${f} (rebuild after rendering the cards)` });
    }
  }
  return out;
}

const list = cards();
const only = opt('only')?.split(',').filter(Boolean);
const run = async () => {
  if (flag('render')) { await render(only ? list.filter((c) => only.includes(c.key)) : list); return true; }
  if (flag('check')) return report('og-cards', coverage(list));
  console.log(JSON.stringify(list.map((c) => ({ ...c, file: cardFile(c.key) })), null, 1));
  return true;
};
const ok = await run();
if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = ok ? 0 : 1;
export default ok;
