#!/usr/bin/env node
// @ts-check
/** Full-page screenshots of key pages at 390px and 1280px into screenshots/. Build with --offline-images first. */
import { chromium } from 'playwright';
import { server } from './serve.mjs';
import { mkdirSync } from 'node:fs';
const OUT = new URL('../screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/services/irrigation/', '/portfolio/', '/areas/oak-bay/', '/quote/', '/commercial/', '/resources/fixture-guide-1/'];
await new Promise((r) => server.listen(4399, () => r(null)));
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
for (const w of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 800 } });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(`http://localhost:4399${p}`, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(900);
    const name = (p.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home') + `-${w}.png`;
    await page.screenshot({ path: OUT + name, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
server.close();
console.log(`Screenshots written to screenshots/`);
