#!/usr/bin/env node
// @ts-check
/**
 * Audit report (a browser tool, so never named check-*; blueprint A13 #36: "performance, contrast, focus and mobile tap
 * targets unmeasured: audit before quoting numbers"). It measures; other tools judge. W4 evidence reads the JSON.
 *
 *   node tools/measure.mjs [--pages=all|/a/,/b/] [--widths=390,1440] [--themes=dark,light] [--out=FILE] [--jobs=3]
 *
 * For each page × width × theme (motion on, served like Netlify with the real CSP) the report records:
 *   performance  transferred bytes by type and in total, request count, third-party requests, DOM size, lab FCP, LCP
 *                (and its element), CLS, long-task total;
 *   contrast     the lowest text/background ratio among visible text whose background is known colour (solid, or
 *                translucent tints composited over a solid ancestor), and how many text elements are under 4.5:1;
 *                text over an image, a gradient, an svg or other art is counted as skipped and left to
 *                text-over-media's pixel method (lib.mjs textContrast; axe and text-over-media judge);
 *   focus        the first 20 Tab stops: how many show no visible focus indicator, and how many are covered by a sticky
 *                element (WCAG 2.4.7, 2.4.11);
 *   targets      interactive elements under 24×24 (2.5.8) and the primary targets a11y#target-size checks
 *                (lib.mjs primaryTargets, C4: toggles and Menu 44×44, the sticky bar 44×48) that are undersized.
 * Rule:
 *   audit-report  every page in every state was measured and has every metric; the report was written. (Values are
 *                 data, not pass/fail: budgets, a11y, lighthouse and text-over-media hold the limits.)
 * Default --out: $SCRATCH/measure/audit-report.json (else <tmp>/rnc-measure/audit-report.json).
 */
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { argList, argOpt, fileOfUrl, launchChromium, primaryTargets, report, selectPages, serveDist, stateContext, textContrast, writeJson } from './lib.mjs';

export const RULES = ['audit-report'];

const widths = argList('widths', ['390', '1440']).map(Number);
const themes = /** @type {('dark'|'light')[]} */ (argList('themes', ['dark', 'light']));
const jobs = Math.max(1, Number(argOpt('jobs') || 3));
const out = argOpt('out') || join(process.env.SCRATCH || join(tmpdir(), 'rnc-measure'), ...(process.env.SCRATCH ? ['measure'] : []), 'audit-report.json');
const pages = selectPages();
if (!pages.length) { console.log('measure: no built pages (SITE_DIST); nothing to measure'); process.exit(0); }
const METRICS = ['performance', 'contrast', 'focus', 'targets'];

const site = await serveDist(0);
const browser = await launchChromium();
/** @type {any[]} */ const rows = [];
/** @type {import('./lib.mjs').Failure[]} */ const failures = [];

async function run(/** @type {{ theme: 'dark'|'light', width: number }} */ c) {
  const ctx = await stateContext(browser, { width: c.width, theme: c.theme, motion: 'on', blockExternal: true });
  await ctx.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__lcp = null; w.__cls = 0; w.__long = 0;
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { const x = /** @type {any} */ (e); w.__lcp = { t: x.startTime, el: x.element ? `${x.element.tagName.toLowerCase()}${x.element.id ? `#${x.element.id}` : ''}${x.element.className && typeof x.element.className === 'string' ? `.${x.element.className.trim().split(/\s+/)[0]}` : ''}` : null }; } }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { const x = /** @type {any} */ (e); if (!x.hadRecentInput) w.__cls += x.value; } }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__long += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
    } catch { /* an observer type is unsupported: that metric stays null */ }
  });
  const page = await ctx.newPage();
  for (const p of pages) {
    const state = `${c.theme} ${c.width}px`;
    try {
      await page.goto(`${site.origin}${p}`, { waitUntil: 'load' });
      await page.waitForTimeout(1200);
      const m = await page.evaluate(() => {
        const w = /** @type {any} */ (window);
        const res = /** @type {PerformanceResourceTiming[]} */ (performance.getEntriesByType('resource'));
        const nav = /** @type {PerformanceNavigationTiming} */ (performance.getEntriesByType('navigation')[0]);
        /** @type {Record<string, number>} */ const bytes = { document: nav?.transferSize || 0 };
        // By what the file is (initiatorType "css" means "requested by a stylesheet", e.g. a font).
        const kind = (/** @type {string} */ u) => { const p = new URL(u).pathname; return /\.css$/.test(p) ? 'css' : /\.woff2?$/.test(p) ? 'font' : /\.m?js$/.test(p) ? 'script' : /\.(svg|png|jpe?g|webp|avif|gif|ico)$/.test(p) ? 'img' : 'other'; };
        for (const r of res) { const t = kind(r.name); bytes[t] = (bytes[t] || 0) + (r.transferSize || r.encodedBodySize || 0); }
        const third = res.filter((r) => new URL(r.name).origin !== location.origin).map((r) => new URL(r.name).host);
        const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
        /* targets */
        const visible = (/** @type {Element} */ el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0; };
        const inter = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [tabindex]:not([tabindex="-1"])')].filter(visible);
        const inline = (/** @type {Element} */ el) => el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li > p, dd, td');
        const small = inter.filter((el) => { const r = el.getBoundingClientRect(); return !inline(el) && (r.width < 24 || r.height < 24); });
        return {
          performance: { bytes, totalBytes: Object.values(bytes).reduce((a, b) => a + b, 0), requests: res.length + 1, thirdParty: [...new Set(third)], domNodes: document.getElementsByTagName('*').length, fcp, lcp: w.__lcp?.t ?? null, lcpElement: w.__lcp?.el ?? null, cls: Number(w.__cls.toFixed(4)), longTaskMs: Math.round(w.__long) },
          targets: { interactive: inter.length, under24: small.length, under24Examples: small.slice(0, 5).map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}"`), primaryUnder44: 0, primaryExamples: /** @type {string[]} */ ([]) },
        };
      });
      // The same page functions a11y#target-size and the unit tests run, so the numbers agree with the gates.
      const contrast = await page.evaluate(textContrast);
      const primary = await page.evaluate(primaryTargets);
      Object.assign(m.targets, { primaryUnder44: primary.length, primaryExamples: primary.slice(0, 3) });
      /* focus: the first 20 Tab stops */
      await page.evaluate(() => { scrollTo(0, 0); /** @type {HTMLElement|null} */ (document.activeElement)?.blur?.(); });
      let noIndicator = 0, obscured = 0, stops = 0;
      /** @type {string[]} */ const examples = [];
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        const f = await page.evaluate(() => {
          const el = /** @type {HTMLElement|null} */ (document.activeElement);
          if (!el || el === document.body) return null;
          const s = getComputedStyle(el);
          const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
          const r = el.getBoundingClientRect();
          const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
          const hit = document.elementFromPoint(cx, cy);
          const covered = !!hit && hit !== el && !el.contains(hit) && !hit.contains(el) && r.bottom > 0 && r.top < innerHeight;
          return { ring, covered, name: `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}"` };
        });
        if (!f) break;
        stops++;
        if (!f.ring) { noIndicator++; if (examples.length < 3) examples.push(f.name); }
        if (f.covered) obscured++;
      }
      const row = { page: p, theme: c.theme, width: c.width, ...m, contrast, focus: { stops, noIndicator, obscured, noIndicatorExamples: examples } };
      rows.push(row);
      const missing = METRICS.filter((k) => !row[k]);
      if (missing.length) failures.push({ rule: 'audit-report', path: fileOfUrl(p), message: `missing ${missing.join(', ')} [${state}]` });
    } catch (e) {
      failures.push({ rule: 'audit-report', path: fileOfUrl(p), message: `could not measure: ${e instanceof Error ? e.message.split('\n')[0] : e} [${state}]` });
    }
  }
  await ctx.close();
}
const queue = themes.flatMap((theme) => widths.map((width) => ({ theme, width })));
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) await run(/** @type {any} */ (queue.shift())); }));
await browser.close();
site.close();

rows.sort((a, b) => a.page.localeCompare(b.page) || a.width - b.width || a.theme.localeCompare(b.theme));
const worst = (/** @type {(r: any) => number|null} */ f) => Math.max(...rows.map(f).filter((x) => x !== null && Number.isFinite(x)), 0);
const summary = {
  pages: pages.length, states: themes.length * widths.length,
  heaviestPageBytes: worst((r) => r.performance.totalBytes), maxLcpMs: Math.round(worst((r) => r.performance.lcp)), maxCls: worst((r) => r.performance.cls),
  minTextContrast: Math.min(...rows.map((r) => r.contrast.minRatio ?? Infinity)), textUnder45: rows.reduce((n, r) => n + r.contrast.under45, 0),
  textSkippedOverMedia: rows.reduce((n, r) => n + r.contrast.skipped, 0),
  focusWithoutIndicator: rows.reduce((n, r) => n + r.focus.noIndicator, 0), focusObscured: rows.reduce((n, r) => n + r.focus.obscured, 0),
  targetsUnder24: rows.reduce((n, r) => n + r.targets.under24, 0), primaryUnder44: rows.reduce((n, r) => n + r.targets.primaryUnder44, 0),
  thirdPartyHosts: [...new Set(rows.flatMap((r) => r.performance.thirdParty))],
};
try { writeJson(out, { tool: 'measure', generatedAt: new Date().toISOString(), note: 'Lab measurements on this machine, motion on, external requests blocked. Values are data; budgets, a11y, lighthouse and text-over-media judge them.', summary, rows }); }
catch (e) { failures.push({ rule: 'audit-report', path: out, message: `could not write the report: ${e instanceof Error ? e.message : e}` }); }
console.log(`  measure: ${rows.length} page state(s) → ${out}`);
console.log(`  summary: ${JSON.stringify(summary)}`);
const ok = report('measure', failures);
process.exitCode = ok ? 0 : 1;
