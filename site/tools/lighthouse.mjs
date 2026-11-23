#!/usr/bin/env node
// @ts-check
/**
 * Lighthouse, mobile, median of N runs (a browser tool, so never named check-*; CONTRACT §16, blueprint C7).
 * Run it in a quiet slot: it measures the machine as well as the page.
 *
 *   node tools/lighthouse.mjs [--runs=3] [--pages=/a/,/b/|all] [--config=lighthouserc.json] [--json=FILE]
 *                             [--allow-slow] [--no-baseline]
 *
 * Rules:
 *   median-of-3      every category (performance, accessibility, best-practices, seo) of each page's median run
 *                    (Lighthouse computeMedianRun over --runs, default 3) scores at least 95; below 98 is a warning.
 *   cwv              the median run's lab LCP ≤ 1.8 s, CLS ≤ 0.05 and TBT ≤ 150 ms (TBT stands in for INP in the lab).
 *   benchmark-index  the machine's median benchmarkIndex is at least lighthouserc.json rnc.minBenchmarkIndex. Below it
 *                    the scores say more about the machine than the page, so the tool reports it and exits 2 without
 *                    judging any page (--allow-slow judges anyway).
 * Budgets and the page list come from site/lighthouserc.json (the @lhci/cli assertion shape). Showcase builds carry
 * noindex and no [DOMAIN] (relative canonical, CONTRACT §3), so is-crawlable and canonical are skipped there. SITE_DIST is served like Netlify (tools/serve.mjs, real CSP) on PORT.
 * Needs lighthouse and chrome-launcher from `node tools/dev-setup.mjs --devtools` and Chrome at $CHROME_PATH.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DIST, SITE, argFlag, argOpt, devtool, fileOfUrl, median, pageUrls, read, report, serveDist, writeJson } from './lib.mjs';

export const RULES = ['median-of-3', 'cwv', 'benchmark-index'];

const cfgFile = argOpt('config') || join(SITE, 'lighthouserc.json');
const cfg = JSON.parse(readFileSync(cfgFile, 'utf8'));
const runs = Math.max(1, Number(argOpt('runs') || cfg.ci?.collect?.numberOfRuns || 3));
const A = cfg.ci?.assert?.assertions || {};
const minScore = (/** @type {string} */ cat) => A[`categories:${cat}`]?.[1]?.minScore ?? 0.95;
const maxValue = (/** @type {string} */ id, /** @type {number} */ d) => A[id]?.[1]?.maxNumericValue ?? d;
const LIMITS = { lcp: maxValue('largest-contentful-paint', 1800), cls: maxValue('cumulative-layout-shift', 0.05), tbt: maxValue('total-blocking-time', 150) };
const CATS = ['performance', 'accessibility', 'best-practices', 'seo'];
const warnScore = cfg.rnc?.warnScore ?? 0.98;
const minBench = cfg.rnc?.minBenchmarkIndex ?? 600;

const lhDir = devtool('lighthouse');
const clDir = devtool('chrome-launcher');
if (!lhDir || !clDir) { console.error('lighthouse: lighthouse / chrome-launcher not found. Run: node tools/dev-setup.mjs --devtools'); process.exit(2); }
const built = pageUrls();
if (!built.length) { console.log('lighthouse: no built pages (SITE_DIST); nothing to measure'); process.exit(0); }
const want = argOpt('pages');
const pages = want === 'all' ? built : (want ? want.split(',') : cfg.ci?.collect?.url || ['/']).filter((/** @type {string} */ p) => built.includes(p));
const showcase = existsSync(join(DIST, 'index.html')) && /<meta name="robots" content="[^"]*noindex/.test(read('index.html'));

const { default: lighthouse } = await import(pathToFileURL(join(lhDir, 'core', 'index.js')).href);
const { computeMedianRun } = await import(pathToFileURL(join(lhDir, 'core', 'lib', 'median-run.js')).href);
const chromeLauncher = await import(pathToFileURL(join(clDir, JSON.parse(readFileSync(join(clDir, 'package.json'), 'utf8')).main || 'dist/index.js')).href);

const site = await serveDist(0);
const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME_PATH || process.env.CHROME || undefined, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
const flags = { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: CATS, ...(showcase ? { skipAudits: cfg.rnc?.showcaseSkipAudits || ['is-crawlable', 'canonical'] } : {}) };

/** @type {import('./lib.mjs').Failure[]} */
const failures = [];
/** @type {string[]} */ const warnings = [];
/** @type {any[]} */ const summary = [];
/** @type {number[]} */ const bench = [];
try {
  for (const p of pages) {
    const lhrs = [];
    for (let i = 0; i < runs; i++) {
      const r = await lighthouse(`${site.origin}${p}`, flags);
      if (r?.lhr) { lhrs.push(r.lhr); bench.push(r.lhr.environment?.benchmarkIndex || 0); }
    }
    if (!lhrs.length) { failures.push({ rule: 'median-of-3', path: fileOfUrl(p), message: 'Lighthouse produced no result' }); continue; }
    const m = computeMedianRun(lhrs);
    const scores = Object.fromEntries(CATS.map((c) => [c, m.categories?.[c]?.score ?? null]));
    const lcp = m.audits['largest-contentful-paint']?.numericValue ?? NaN;
    const cls = m.audits['cumulative-layout-shift']?.numericValue ?? NaN;
    const tbt = m.audits['total-blocking-time']?.numericValue ?? NaN;
    summary.push({ page: p, runs: lhrs.length, scores, lcp, cls, tbt, benchmarkIndex: m.environment?.benchmarkIndex, runtimeError: m.runtimeError?.code });
    console.log(`  ${p}: ${CATS.map((c) => `${c} ${scores[c] === null ? '–' : Math.round(scores[c] * 100)}`).join(', ')}; LCP ${(lcp / 1000).toFixed(2)} s, CLS ${cls.toFixed(3)}, TBT ${Math.round(tbt)} ms (median of ${lhrs.length})`);
    const f = fileOfUrl(p);
    if (m.runtimeError) failures.push({ rule: 'median-of-3', path: f, message: `Lighthouse runtime error ${m.runtimeError.code}: ${m.runtimeError.message}` });
    for (const c of CATS) {
      const s = scores[c];
      // Name the audits that cost the points, so the failure says what to fix.
      const lost = (m.categories?.[c]?.auditRefs || []).filter((/** @type {any} */ a) => a.weight > 0 && m.audits[a.id] && m.audits[a.id].score !== null && m.audits[a.id].score < 1).map((/** @type {any} */ a) => a.id);
      if (s === null || s < minScore(c)) failures.push({ rule: 'median-of-3', path: f, message: `${c} ${s === null ? 'not scored' : Math.round(s * 100)} < ${Math.round(minScore(c) * 100)} (median of ${lhrs.length}${lost.length ? `; failing: ${lost.slice(0, 6).join(', ')}` : ''})` });
      else if (s < warnScore) warnings.push(`${p}: ${c} ${Math.round(s * 100)} (warn below ${Math.round(warnScore * 100)})`);
    }
    if (!(lcp <= LIMITS.lcp)) failures.push({ rule: 'cwv', path: f, message: `lab LCP ${(lcp / 1000).toFixed(2)} s > ${LIMITS.lcp / 1000} s` });
    if (!(cls <= LIMITS.cls)) failures.push({ rule: 'cwv', path: f, message: `CLS ${cls.toFixed(3)} > ${LIMITS.cls}` });
    if (!(tbt <= LIMITS.tbt)) failures.push({ rule: 'cwv', path: f, message: `TBT ${Math.round(tbt)} ms > ${LIMITS.tbt} ms (the lab stand-in for INP)` });
  }
} finally {
  await chrome.kill();
  site.close();
}

const bi = bench.length ? median(bench) : 0;
const json = argOpt('json');
if (json) writeJson(json, { tool: 'lighthouse', runs, showcase, benchmarkIndex: bi, limits: { ...LIMITS, minScore: CATS.map(minScore) }, pages: summary });
for (const w of warnings) console.warn(`  warn: ${w}`);
if (bi < minBench && !argFlag('allow-slow')) {
  report('lighthouse', [{ rule: 'benchmark-index', path: 'lighthouserc.json', message: `median benchmarkIndex ${Math.round(bi)} < ${minBench}: the machine is too busy or slow for a fair score. Rerun in a quiet slot (or --allow-slow); no page was judged` }]);
  process.exit(2);
}
console.log(`  lighthouse: ${pages.length} page(s) × ${runs} run(s), median benchmarkIndex ${Math.round(bi)}${showcase ? ' (showcase build: is-crawlable and canonical skipped)' : ''}`);
const ok = report('lighthouse', failures);
process.exitCode = ok ? 0 : 1;
