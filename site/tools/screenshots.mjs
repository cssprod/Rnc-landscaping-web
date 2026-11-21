#!/usr/bin/env node
// @ts-check
/**
 * Screenshots of key pages into screenshots/.
 *   node tools/screenshots.mjs [--dark] [--full] [--w=390,1440] [paths...]
 * Build first (node build.mjs --offline-images keeps everything local).
 */
import { chromium } from 'playwright';
import { server } from './serve.mjs';
import { mkdirSync } from 'node:fs';
const OUT = new URL('../screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const argv = process.argv.slice(2);
const dark = argv.includes('--dark');
const full = argv.includes('--full');
const widths = (argv.find((a) => a.startsWith('--w='))?.slice(4) || '390,1440').split(',').map(Number);
const pages = argv.filter((a) => !a.startsWith('--'));
const list = pages.length ? pages : ['/', '/services/irrigation/', '/portfolio/', '/areas/oak-bay/', '/quote/', '/commercial/'];
await new Promise((r) => server.listen(4399, () => r(null)));
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: 1, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  for (const p of list) {
    await page.goto(`http://localhost:4399${p}`, { waitUntil: 'load' }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    if (full) {
      // Scroll through the page so lazy images load, then return to the top.
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(300);
    const name = `${(p.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home')}-${w}${dark ? '-dark' : ''}${full ? '-full' : ''}.png`;
    await page.screenshot({ path: OUT + name, fullPage: full });
  }
  await ctx.close();
}
await browser.close();
server.close();
console.log(`Screenshots written to screenshots/`);
