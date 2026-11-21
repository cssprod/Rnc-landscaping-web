#!/usr/bin/env node
// @ts-check
/**
 * Screenshots of key pages (a browser tool, so never named check-*).
 *   node tools/screenshots.mjs [--pages=/a/,/b/] [--w=390,1440] [--themes=dark,light] [--full] [--out-dir=DIR]
 *   node tools/screenshots.mjs --compare=BASE_DIST [same options]
 *       screenshots SITE_DIST and BASE_DIST with identical settings and compares them pixel by pixel; exits 1 on any
 *       difference (the pre/post refactor gate: 0 px at 390 and 1440, dark and light). A differing pair is re-shot
 *       once, so a one-off rendering-timing flake is reported but does not fail; a repeatable difference fails.
 * Serves SITE_DIST on PORT (default 4399; the base build on a free port). Build first with --offline-images so
 * everything is local; external requests are blocked. Uses Playwright's Chromium (or $CHROME).
 * --dark is kept as a shorthand for --themes=dark.
 */
import { chromium } from 'playwright';
import { createSiteServer } from './serve.mjs';
import { DIST } from './lib.mjs';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (/** @type {string} */ k) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const full = argv.includes('--full');
const widths = (opt('w') || '390,1440').split(',').map(Number);
const themes = (opt('themes') || (argv.includes('--dark') ? 'dark' : 'dark,light')).split(',').filter(Boolean);
const OUT = resolve(opt('out-dir') || new URL('../screenshots/', import.meta.url).pathname);
const baseDist = opt('compare') ? resolve(/** @type {string} */ (opt('compare'))) : null;
// Default pages use the C1 URLs; pass --pages=… for builds that still serve the old ones.
const DEFAULT_PAGES = ['/', '/services/irrigation/', '/projects/', '/areas/oak-bay/', '/free-quote/', '/commercial/'];
const pages = (opt('pages')?.split(',') || argv.filter((a) => !a.startsWith('--'))).filter(Boolean);
const list = pages.length ? pages : DEFAULT_PAGES;
if (baseDist && !existsSync(join(baseDist, 'index.html'))) { console.error(`screenshots: --compare=${baseDist} has no index.html`); process.exit(2); }
mkdirSync(OUT, { recursive: true });

/** @param {import('node:http').Server} s @param {number} port */
const listen = (s, port) => new Promise((r) => s.listen(port, () => r(/** @type {import('node:net').AddressInfo} */ (s.address()).port)));
const mainServer = createSiteServer({ dist: DIST });
const mainPort = await listen(mainServer, Number(process.env.PORT || 4399));
const baseServer = baseDist ? createSiteServer({ dist: baseDist }) : null;
const basePort = baseServer ? await listen(baseServer, 0) : 0;

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

/** @param {number} port @param {string} p @param {number} w @param {string} theme */
async function shoot(port, p, w, theme) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: 1, colorScheme: /** @type {'dark'|'light'} */ (theme), reducedMotion: 'reduce' });
  // A stored choice as well as the OS preference, so both the seed (light-first) and dark-first CSS pick the theme.
  await ctx.addInitScript((t) => { try { localStorage.setItem('rnc-theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(`http://localhost:${port}${p}`, { waitUntil: 'load' }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  if (full) {
    // Scroll through the page so lazy images load, then return to the top.
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(300);
  const png = await page.screenshot({ fullPage: full, animations: 'disabled', caret: 'hide' });
  await ctx.close();
  return png;
}

/** Pixel comparison in the browser (no image libraries). @param {Buffer} a @param {Buffer} b */
async function diffPixels(a, b) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const r = await page.evaluate(async ([x, y]) => {
    const load = (/** @type {string} */ s) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `data:image/png;base64,${s}`; });
    const [ia, ib] = /** @type {HTMLImageElement[]} */ (await Promise.all([load(x), load(y)]));
    if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}×${ia.height} vs ${ib.width}×${ib.height}`, px: -1 };
    const data = (/** @type {HTMLImageElement} */ im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
    const da = data(ia), db = data(ib);
    let px = 0;
    for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) px++;
    return { size: `${ia.width}×${ia.height}`, px };
  }, [a.toString('base64'), b.toString('base64')]);
  await ctx.close();
  return r;
}

const name = (/** @type {string} */ p, /** @type {number} */ w, /** @type {string} */ theme) => `${(p.replace(/[/?=&]/g, '_').replace(/^_+|_+$/g, '') || 'home')}-${w}-${theme}${full ? '-full' : ''}`;
let diffs = 0, shots = 0;
for (const w of widths) for (const theme of themes) for (const p of list) {
  let png = await shoot(mainPort, p, w, theme);
  shots++;
  if (!baseServer) { writeFileSync(join(OUT, `${name(p, w, theme)}.png`), png); continue; }
  let base = await shoot(basePort, p, w, theme);
  let r = await diffPixels(base, png);
  let note = '';
  if (r.px !== 0) {
    // A rendering-timing flake (lazy decode, font swap) does not repeat: re-shoot both once; only a repeatable diff counts.
    const first = r;
    png = await shoot(mainPort, p, w, theme);
    base = await shoot(basePort, p, w, theme);
    r = await diffPixels(base, png);
    note = r.px === 0 ? ` (first attempt: ${first.px < 0 ? first.size : `${first.px} px`}; 0 px on retry)` : ' (repeated on retry)';
  }
  const same = r.px === 0;
  if (!same) {
    diffs++;
    writeFileSync(join(OUT, `${name(p, w, theme)}.base.png`), base);
    writeFileSync(join(OUT, `${name(p, w, theme)}.png`), png);
  }
  console.log(`${same ? '✓' : '✗'} ${p} ${w}px ${theme}: ${r.px < 0 ? `size differs (${r.size})` : `${r.px} px differ (${r.size})`}${note}`);
}
await browser.close();
mainServer.close();
baseServer?.close();
if (baseServer) {
  console.log(diffs ? `✗ screenshots: ${diffs} of ${shots} screenshot(s) differ (written to ${OUT})` : `✓ screenshots: ${shots} screenshot(s), 0 px difference against ${baseDist}`);
  process.exit(diffs ? 1 : 0);
}
console.log(`Screenshots written to ${OUT}`);
