#!/usr/bin/env node
// @ts-check
/**
 * Accessibility matrix (a browser tool, so never named check-*; CONTRACT §14, §16 "axe violations > 0").
 *
 *   node tools/a11y.mjs [--themes=dark,light] [--widths=320,1440] [--motion=off,on] [--pages=all|/a/,/b/]
 *                       [--jobs=2] [--json=FILE] [--no-baseline]
 *
 * Rules:
 *   axe-matrix   axe-core (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa) reports no violation on any page in any
 *                theme × width × motion state. axe is injected through a bypassCSP context only: every other tool and
 *                the e2e suite run under the real CSP. Each page is scrolled through first, so one-shot reveals have
 *                settled before colours are measured.
 *   target-size  WCAG 2.5.8 (axe "target-size", 24 × 24) plus the CONTRACT §8 / C4 primary targets: the theme and
 *                motion toggles ([data-pref]) and the Menu button are at least 44 × 44; the sticky bar's actions
 *                ([data-action-bar] a, button) at least 44 wide and 48 tall.
 * States: theme = the stored rnc-theme; motion "on" = stored on + OS no-preference, "off" = stored off + OS reduce.
 * Pages default to one per template (tools/lib.mjs TEMPLATE_PAGES). Failures name the page (dist-relative, the
 * baseline key) and list the states and the first offending targets.
 * axe-core comes from `node tools/dev-setup.mjs --devtools` (or $AXE_CORE_PATH, or site/node_modules/axe-core in CI).
 */
import { readFileSync } from 'node:fs';
import { argList, argOpt, devtool, fileOfUrl, launchChromium, primaryTargets, report, selectPages, serveDist, stateContext, writeJson } from './lib.mjs';

export const RULES = ['axe-matrix', 'target-size'];

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const themes = /** @type {('dark'|'light')[]} */ (argList('themes', ['dark', 'light']));
const widths = argList('widths', ['320', '1440']).map(Number);
const motions = /** @type {('on'|'off')[]} */ (argList('motion', ['off', 'on']));
const jobs = Math.max(1, Number(argOpt('jobs') || 2));

const axePath = devtool('axe-core', 'axe.min.js');
if (!axePath) { console.error('a11y: axe-core not found. Run: node tools/dev-setup.mjs --devtools'); process.exit(2); }
const AXE = readFileSync(axePath, 'utf8');
const pages = selectPages();
if (!pages.length) { console.log('a11y: no built pages (SITE_DIST); nothing to check'); process.exit(0); }


const site = await serveDist(0);
const browser = await launchChromium();
/** page → rule → { message, states[] } */
/** @type {Map<string, Map<string, { rule: string, message: string, states: Set<string> }>>} */
const found = new Map();
/** @type {any[]} */
const raw = [];
const note = (/** @type {string} */ page, /** @type {string} */ rule, /** @type {string} */ id, /** @type {string} */ message, /** @type {string} */ state) => {
  const byPage = found.get(page) || found.set(page, new Map()).get(page);
  const k = `${rule}\u0000${id}`;
  const cur = byPage.get(k) || byPage.set(k, { rule, message, states: new Set() }).get(k);
  cur.states.add(state);
};

const combos = themes.flatMap((theme) => widths.flatMap((width) => motions.map((motion) => ({ theme, width, motion }))));
let runs = 0;
async function runCombo(/** @type {{ theme: 'dark'|'light', width: number, motion: 'on'|'off' }} */ c) {
  const ctx = await stateContext(browser, { width: c.width, theme: c.theme, motion: c.motion, bypassCSP: true });
  const page = await ctx.newPage();
  const state = `${c.theme} ${c.width}px motion ${c.motion}`;
  for (const p of pages) {
    try {
      await page.goto(`${site.origin}${p}`, { waitUntil: 'load' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(200, innerHeight * 0.6)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
        scrollTo(0, 0);
      });
      await page.waitForTimeout(c.motion === 'on' ? 900 : 150);
      await page.addScriptTag({ content: AXE });
      const res = await page.evaluate(async (tags) => {
        // @ts-ignore injected
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
        return r.violations.map((/** @type {any} */ v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map((/** @type {any} */ n) => n.target.join(' ')) }));
      }, TAGS);
      runs++;
      for (const v of res) {
        raw.push({ page: p, state, ...v });
        note(p, v.id === 'target-size' ? 'target-size' : 'axe-matrix', v.id, `${v.id} (${v.impact}, ${v.nodes} node${v.nodes === 1 ? '' : 's'}): ${v.help}; e.g. ${v.targets.join(' | ')}`, state);
      }
      for (const t of await page.evaluate(primaryTargets)) { raw.push({ page: p, state, id: 'primary-target', target: t }); note(p, 'target-size', `primary ${t.split(' is ')[0]}`, `primary target ${t}`, state); }
    } catch (e) {
      note(p, 'axe-matrix', 'run-error', `axe could not run: ${e instanceof Error ? e.message.split('\n')[0] : e}`, state);
    }
  }
  await ctx.close();
}
const queue = [...combos];
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) await runCombo(/** @type {any} */ (queue.shift())); }));
await browser.close();
site.close();

/** @type {import('./lib.mjs').Failure[]} */
const failures = [];
for (const [p, m] of found) for (const v of m.values()) {
  const states = [...v.states];
  failures.push({ rule: v.rule, path: fileOfUrl(p), message: `${v.message} [${states.length === combos.length ? 'every state' : states.join('; ')}]` });
}
console.log(`  a11y: ${runs} axe run(s) over ${pages.length} page(s) × ${combos.length} state(s) (${TAGS.join(', ')}; axe-core ${AXE.match(/axe v([\d.]+)/)?.[1] || ''})`);
const json = argOpt('json');
if (json) writeJson(json, { tool: 'a11y', tags: TAGS, states: combos, pages, runs, violations: raw });
const ok = report('a11y', failures);
process.exitCode = ok ? 0 : 1;
