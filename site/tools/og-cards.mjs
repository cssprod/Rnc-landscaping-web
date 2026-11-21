#!/usr/bin/env node
// @ts-check
/**
 * Open Graph title cards (blueprint C6 "one OG image per page", A13 #18).
 * Dev tool, not part of the build: renders one 1200×630 JPEG per page into
 * site/static/og/<card>.jpg (committed) plus static/og/manifest.json, which
 * src/lib/seo.mjs uses to tell fresh cards from missing or stale ones.
 *
 *   node tools/og-cards.mjs            render missing and stale cards, prune orphans
 *   node tools/og-cards.mjs --force    re-render every card
 *   node tools/og-cards.mjs --check    exit 1 if any card is missing or stale (CI)
 *
 * Needs Playwright + Chromium (preinstalled in the dev container; never a repo
 * dependency). Cards use brand colours from brand/tokens.json, Inter from
 * brand/fonts and the reversed logo. Page list and card text come from a
 * throwaway build (OG_COLLECT), so titles match the rendered pages exactly.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OG_DEFAULT, OG_DIR, OG_H, OG_W, OG_TEMPLATE_VERSION } from '../src/lib/seo.mjs';
import { typographer } from '../src/lib/html.mjs';

const args = new Set(process.argv.slice(2));
const SITE = fileURLToPath(new URL('..', import.meta.url));
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OUT = fileURLToPath(OG_DIR);

/* ---- 1. collect cards from a throwaway build ---- */
const tmp = mkdtempSync(join(tmpdir(), 'rnc-og-'));
const collect = join(tmp, 'cards.json');
execFileSync(process.execPath, ['build.mjs', '--offline-images', `--out=${join(tmp, 'dist')}`], { cwd: SITE, env: { ...process.env, OG_COLLECT: collect }, stdio: ['ignore', 'ignore', 'inherit'] });
/** @type {{ file: string, path: string, title: string, eyebrow: string, hash: string }[]} */
const cards = [...JSON.parse(readFileSync(collect, 'utf8')), OG_DEFAULT];
rmSync(tmp, { recursive: true, force: true });

mkdirSync(OUT, { recursive: true });
const manifestFile = join(OUT, 'manifest.json');
/** @type {Record<string,string>} */
let old = {};
try { old = JSON.parse(readFileSync(manifestFile, 'utf8')).cards || {}; } catch { /* first run */ }
const todo = cards.filter((c) => args.has('--force') || old[c.file] !== c.hash || !existsSync(join(OUT, c.file)));
const orphans = readdirSync(OUT).filter((f) => f.endsWith('.jpg') && !cards.some((c) => c.file === f));

if (args.has('--check')) {
  if (todo.length || orphans.length) {
    console.error(`✗ OG cards: ${todo.length} missing or stale${todo.length ? ` (${todo.slice(0, 5).map((c) => c.file).join(', ')})` : ''}, ${orphans.length} orphaned. Run node tools/og-cards.mjs`);
    process.exit(1);
  }
  console.log(`✓ OG cards (${cards.length})`);
  process.exit(0);
}

/* ---- 2. card template ---- */
const tokens = JSON.parse(readFileSync(join(ROOT, 'brand/tokens.json'), 'utf8')).color;
const col = (/** @type {string} */ k, dark = false) => (dark && tokens[k]?.$extensions?.['ca.rnc.dark']) || tokens[k]?.$value;
const C = { deep: col('deep'), deep2: col('deep-2'), text: col('on-deep'), text2: col('on-deep-2'), accent: col('brand', true), contour: col('contour', true) };
const inter = readFileSync(join(ROOT, 'brand/fonts/inter-latin-var.woff2')).toString('base64');
const logo = readFileSync(join(ROOT, 'brand/logo-reversed.svg'), 'utf8').replace(/<\?xml[^>]*>/, '');

/** Deterministic contour lines (the topographic motif), varied per card. @param {string} seed */
function contours(seed) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const cx = 930 + rnd() * 120, cy = 260 + rnd() * 140, ph = rnd() * Math.PI * 2;
  const paths = [];
  for (let i = 0; i < 11; i++) {
    const r = 60 + i * 46, pts = [];
    for (let a = 0; a <= 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      const k = r * (1 + 0.14 * Math.sin(3 * t + ph + i * 0.35) + 0.07 * Math.cos(5 * t - ph));
      pts.push(`${(cx + k * Math.cos(t) * 1.25).toFixed(1)},${(cy + k * Math.sin(t)).toFixed(1)}`);
    }
    paths.push(`<path d="M${pts.join('L')}Z" opacity="${(0.62 - i * 0.04).toFixed(2)}"/>`);
  }
  return `<svg class="topo" viewBox="0 0 ${OG_W} ${OG_H}" width="${OG_W}" height="${OG_H}" aria-hidden="true"><g fill="none" stroke="${C.contour}" stroke-width="1.5">${paths.join('')}</g></svg>`;
}

const shell = `<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url(data:font/woff2;base64,${inter}) format('woff2');font-weight:100 900;font-display:block}
*{box-sizing:border-box;margin:0}
html,body{width:${OG_W}px;height:${OG_H}px;overflow:hidden}
body{font-family:Inter,system-ui,sans-serif;background:${C.deep};color:${C.text};position:relative;font-feature-settings:'tnum' 1}
.topo{position:absolute;inset:0}
.wash{position:absolute;inset:0;background:linear-gradient(90deg,${C.deep} 0%,${C.deep} 46%,rgba(11,31,21,.55) 72%,rgba(11,31,21,.15) 100%)}
.card{position:absolute;inset:0;padding:64px 72px 56px;display:flex;flex-direction:column}
.logo{height:46px}.logo svg{height:46px;width:auto}
.body{margin-top:auto;max-width:860px}
.eyebrow{font-size:28px;font-weight:600;color:${C.accent};margin-bottom:20px;display:flex;gap:14px;align-items:center}
.eyebrow:before{content:'';width:40px;height:2px;background:${C.accent}}
h1{font-weight:700;letter-spacing:-0.02em;line-height:1.06;font-size:76px;text-wrap:balance}
.foot{margin-top:44px;padding-top:20px;border-top:1px solid rgba(255,255,255,.22);display:flex;gap:0;font-size:22px;color:${C.text2}}
.foot span{padding:0 18px;border-left:1px solid rgba(255,255,255,.22)}.foot span:first-child{padding-left:0;border-left:0}
</style></head><body><div id="topo"></div><div class="wash"></div><div class="card">
<div class="logo">${logo}</div>
<div class="body"><p class="eyebrow" id="eyebrow"></p><h1 id="title"></h1>
<p class="foot"><span>Maintenance</span><span>Installation</span><span>Irrigation</span><span>Tree work</span><span>Greater Victoria, BC</span></p></div>
</div></body></html>`;

/* ---- 3. render ---- */
/** @returns {Promise<any>} */
async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* fall through */ }
  return createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
}
if (todo.length) {
  const { chromium } = await loadPlaywright();
  const exe = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
  const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: OG_W, height: OG_H }, deviceScaleFactor: 1 });
  await page.setContent(shell, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  for (const c of todo) {
    const title = typographer(c.title.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
    await page.evaluate(({ title, eyebrow, topo }) => {
      const h1 = /** @type {HTMLElement} */ (document.getElementById('title'));
      h1.innerHTML = title;
      /** @type {HTMLElement} */ (document.getElementById('eyebrow')).textContent = eyebrow;
      /** @type {HTMLElement} */ (document.getElementById('topo')).innerHTML = topo;
      // Shrink long titles to fit three lines.
      for (let s = 76; s >= 48; s -= 4) { h1.style.fontSize = `${s}px`; if (h1.scrollHeight <= s * 1.06 * 3 + 4) break; }
    }, { title, eyebrow: c.eyebrow, topo: contours(c.file) });
    await page.screenshot({ path: join(OUT, c.file), type: 'jpeg', quality: 82 });
  }
  await browser.close();
}
for (const f of orphans) unlinkSync(join(OUT, f));
writeFileSync(manifestFile, `${JSON.stringify({
  _notes: 'Generated by site/tools/og-cards.mjs: card file → hash of its inputs (template version, title, eyebrow). src/lib/seo.mjs only uses a card whose hash matches. Do not edit by hand.',
  template: OG_TEMPLATE_VERSION,
  cards: Object.fromEntries(cards.map((c) => [c.file, c.hash]).sort(([a], [b]) => a.localeCompare(b))),
}, null, 2)}\n`);
console.log(`OG cards: ${todo.length} rendered, ${cards.length - todo.length} up to date, ${orphans.length} pruned → site/static/og/`);
