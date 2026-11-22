#!/usr/bin/env node
// @ts-check
/**
 * Worst-pixel text-over-media contrast (a browser tool, so never named check-*; the P2 "tom.cjs" method adopted by J2
 * and motion-policy.md §6.8). Text that sits on art, photos or glass is measured against the real pixels behind it.
 *
 *   node tools/text-over-media.mjs [--pages=all|/a/,/b/] [--widths=320,390,1024,1440] [--themes=dark,light]
 *                                  [--min=4.5] [--jobs=3] [--json=FILE]
 *
 * Rule:
 *   worst-pixel  in every hero, page head and CTA band (and any [data-living] section), each text line keeps at least
 *                4.5:1 against the WORST single pixel behind it (display text included: the large-text 3:1 allowance
 *                is not used), at each width × theme, scrolled to 0 and to 50 % of the hero (where the parallax moves
 *                the art toward the copy). Method: record each text node's line boxes and colour, make the text
 *                transparent, screenshot, and compare the text colour (alpha-composited per pixel) with every pixel in
 *                those boxes. Motion is on and the page has settled for 1.5 s, so the living art is in a real frame.
 * Failures name the page (dist-relative), the text, the ratio and the state.
 */
import { argList, argOpt, contrastOf, fileOfUrl, launchChromium, luminance, report, selectPages, serveDist, stateContext, writeJson } from './lib.mjs';

export const RULES = ['worst-pixel'];

const widths = argList('widths', ['320', '390', '1024', '1440']).map(Number);
const themes = /** @type {('dark'|'light')[]} */ (argList('themes', ['dark', 'light']));
const MIN = Number(argOpt('min') || 4.5);
const jobs = Math.max(1, Number(argOpt('jobs') || 3));
const pages = selectPages();
if (!pages.length) { console.log('text-over-media: no built pages (SITE_DIST); nothing to measure'); process.exit(0); }
const ZONES = '.hero, .page-head, .cta-band, section:has([data-living]), header:has([data-living])';

/** In page: text line boxes and colours inside the media zones, then hide the text. */
const collect = (/** @type {string} */ zones) => {
  const out = [];
  const vh = innerHeight, vw = innerWidth;
  for (const zone of document.querySelectorAll(zones)) {
    const walker = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = /** @type {Element} */ (n.parentElement);
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0 || el.closest('[aria-hidden="true"], .vh, .sr-only, .visually-hidden')) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const boxes = [...r.getClientRects()].filter((b) => b.width > 1 && b.height > 1 && b.bottom > 0 && b.top < vh && b.right > 0 && b.left < vw)
        .map((b) => ({ x: Math.max(0, Math.floor(b.left)), y: Math.max(0, Math.floor(b.top)), w: Math.ceil(Math.min(b.right, vw) - Math.max(0, b.left)), h: Math.ceil(Math.min(b.bottom, vh) - Math.max(0, b.top)) }));
      if (!boxes.length) continue;
      let opacity = 1;
      for (let e = /** @type {Element|null} */ (el); e; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity);
      out.push({ text: n.textContent.trim().replace(/\s+/g, ' ').slice(0, 50), tag: el.tagName.toLowerCase(), color: s.color, opacity, boxes });
    }
  }
  const st = document.createElement('style');
  st.textContent = `${zones.split(',').map((z) => `${z.trim()} *, ${z.trim()}`).join(', ')} { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; -webkit-text-stroke: 0 !important; text-decoration-color: transparent !important; caret-color: transparent !important; }`;
  document.head.append(st);
  return out;
};

const site = await serveDist(0);
const browser = await launchChromium();
/** @type {import('./lib.mjs').Failure[]} */
const failures = [];
/** @type {any[]} */ const results = [];
let measured = 0;
/** "rgb(1, 2, 3)" / "rgba(1, 2, 3, .5)" / "color(srgb …)" → [r, g, b, a] 0–255 / 0–1 */
const parseColor = (/** @type {string} */ c) => {
  const srgb = c.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number(srgb[4])];
  const n = (c.match(/[\d.]+/g) || ['0', '0', '0']).map(Number);
  return [n[0], n[1], n[2], n[3] === undefined ? 1 : n[3]];
};

async function run(/** @type {{ theme: 'dark'|'light', width: number }} */ c) {
  const ctx = await stateContext(browser, { width: c.width, theme: c.theme, motion: 'on' });
  const page = await ctx.newPage();
  for (const p of pages) {
    for (const at of [0, 0.5]) {
      const state = `${c.theme} ${c.width}px scroll ${at ? '50 % of the hero' : '0'}`;
      try {
        await page.goto(`${site.origin}${p}`, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const hasZone = await page.evaluate((z) => !!document.querySelector(z), ZONES);
        if (!hasZone) break;
        if (at) await page.evaluate((z) => { const h = /** @type {HTMLElement} */ (document.querySelector(z)); scrollTo(0, (h.getBoundingClientRect().top + scrollY) + h.offsetHeight * 0.5); }, ZONES.split(',')[0] + ', .page-head');
        await page.waitForTimeout(1500);
        const texts = await page.evaluate(collect, ZONES);
        if (!texts.length) continue;
        await page.waitForTimeout(80);
        const png = await page.screenshot({ caret: 'hide' });
        // Decode in the page (no image libraries), return only the per-box worst ratios.
        const worst = await page.evaluate(async ({ b64, texts: list }) => {
          const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
          const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
          const g = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d')); g.drawImage(img, 0, 0);
          const scale = img.width / innerWidth;
          return list.map((t) => t.boxes.map((b) => { const d = g.getImageData(Math.floor(b.x * scale), Math.floor(b.y * scale), Math.max(1, Math.floor(b.w * scale)), Math.max(1, Math.floor(b.h * scale))).data; return Array.from(d); }));
        }, { b64: png.toString('base64'), texts });
        for (let i = 0; i < texts.length; i++) {
          const t = texts[i];
          const [r, g, b, a0] = parseColor(t.color);
          const a = a0 * t.opacity;
          let min = Infinity;
          for (const data of worst[i]) for (let k = 0; k < data.length; k += 4) {
            const bg = [data[k], data[k + 1], data[k + 2]];
            const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
            const ratio = contrastOf(luminance(fg), luminance(bg));
            if (ratio < min) min = ratio;
          }
          measured++;
          results.push({ page: p, state, text: t.text, tag: t.tag, worst: Number(min.toFixed(2)) });
          if (min < MIN) failures.push({ rule: 'worst-pixel', path: fileOfUrl(p), message: `<${t.tag}> "${t.text}" ${min.toFixed(2)}:1 against its worst pixel (needs ${MIN}) [${state}]` });
        }
      } catch (e) {
        failures.push({ rule: 'worst-pixel', path: fileOfUrl(p), message: `could not measure: ${e instanceof Error ? e.message.split('\n')[0] : e} [${state}]` });
      }
    }
  }
  await ctx.close();
}
const queue = themes.flatMap((theme) => widths.map((width) => ({ theme, width })));
const n = queue.length;
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) await run(/** @type {any} */ (queue.shift())); }));
await browser.close();
site.close();

// One failure per page and text: the worst state wins, the others are listed.
/** @type {Map<string, import('./lib.mjs').Failure & { n: number }>} */ const merged = new Map();
for (const f of failures) {
  const k = `${f.path}\u0000${f.message.replace(/ \d+\.\d+:1.*$/, '')}`;
  const cur = merged.get(k);
  const ratio = (/** @type {string} */ m) => Number(m.match(/ (\d+\.\d+):1/)?.[1] ?? 0);
  if (!cur) merged.set(k, { ...f, n: 1 });
  else { cur.n++; if (ratio(f.message) < ratio(cur.message)) cur.message = f.message; }
}
console.log(`  text-over-media: ${measured} text node measurement(s) over ${pages.length} page(s) × ${n} state(s) × 2 scroll positions (min ${MIN}:1, worst pixel)`);
const json = argOpt('json');
if (json) writeJson(json, { tool: 'text-over-media', min: MIN, results });
const ok = report('text-over-media', [...merged.values()].map((f) => ({ rule: f.rule, path: f.path, message: f.n > 1 ? `${f.message} (and ${f.n - 1} more state(s))` : f.message })));
process.exitCode = ok ? 0 : 1;
