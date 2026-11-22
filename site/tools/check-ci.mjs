#!/usr/bin/env node
// @ts-check
/**
 * CI gate coverage (blueprint P0 #2: "Lighthouse CI budgets, axe/Playwright at 5 widths and a link checker in the build;
 * the build fails on any regression"). Offline: reads .github/workflows/ci.yml (and .orchestra/url-map.json when
 * present). Exits 0 when there is no ci.yml.
 *
 * Rule:
 *   required-gates  ci.yml has a step for each gate (typecheck, unit tests, build, check-all with its link checker, the
 *                   CSP check, Playwright, the a11y matrix at 320/390/768/1024/1440, Lighthouse); none of them, and no
 *                   job that holds them, is continue-on-error (only the launch-gate step, the one that builds with
 *                   SITE_MODE=launch, may be); and every page path a step names is a live C1 URL, never a retired one
 *                   (/quote/, /portfolio/…).
 *   node tools/check-ci.mjs [--file=PATH]
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, report } from './lib.mjs';

export const RULES = ['required-gates'];

/** The gates and how a step's `run` is recognised. */
export const GATES = /** @type {const} */ ([
  ['typecheck', /\btsc\b[^\n]*-p\s+jsconfig\.json/],
  ['unit tests', /\bnode\s+--test\b/],
  ['build', /\bnode\s+build\.mjs\b/],
  ['check-all (static checks and the link checker)', /\btools\/check-all\.mjs\b/],
  ['CSP hash check', /\btools\/csp\.mjs\s+--check\b/],
  ['Playwright', /\bplaywright(?:\/cli\.js)?\s+test\b/],
  ['a11y matrix (axe)', /\btools\/a11y\.mjs\b/],
  ['Lighthouse', /\btools\/lighthouse\.mjs\b|@lhci\/cli|\blhci\s+autorun\b/],
]);
export const A11Y_WIDTHS = [320, 390, 768, 1024, 1440];

/**
 * The jobs and steps of a GitHub Actions workflow: enough YAML for this repo's ci.yml (block mappings, "- " step items,
 * inline flow maps on one line, `|` / `>` block scalars).
 * @param {string} yaml
 * @returns {{ id: string, continueOnError: boolean, steps: { name: string, run: string, continueOnError: boolean, line: number }[] }[]}
 */
export function parseWorkflow(yaml) {
  const lines = yaml.split('\n');
  /** @type {ReturnType<typeof parseWorkflow>} */ const jobs = [];
  let jobsIndent = -1, jobIndent = -1, stepsIndent = -1;
  /** @type {ReturnType<typeof parseWorkflow>[number] | null} */ let job = null;
  /** @type {ReturnType<typeof parseWorkflow>[number]['steps'][number] | null} */ let step = null;
  let stepIndent = -1;
  const ind = (/** @type {string} */ l) => l.length - l.trimStart().length;
  const scalar = (/** @type {string} */ v) => v.trim().replace(/\s+#.*$/, '').replace(/^(['"])(.*)\1$/, '$2');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const n = ind(raw);
    const t = raw.trim();
    if (/^jobs:\s*$/.test(t) && n === 0) { jobsIndent = 0; continue; }
    if (jobsIndent < 0) continue;
    if (n === 0) { jobsIndent = -1; continue; }
    if (jobIndent < 0 || n <= jobIndent) {
      const m = t.match(/^([\w-]+):\s*$/);
      if (m) { job = { id: m[1], continueOnError: false, steps: [] }; jobs.push(job); jobIndent = n; stepsIndent = -1; step = null; continue; }
    }
    if (!job) continue;
    if (stepsIndent < 0 || n <= stepsIndent) {
      if (/^steps:\s*$/.test(t)) { stepsIndent = n; step = null; continue; }
      const coe = t.match(/^continue-on-error:\s*(.+)$/);
      if (coe && n === jobIndent + 2) job.continueOnError = /^true$/i.test(scalar(coe[1]));
      if (n <= stepsIndent) stepsIndent = -1;
      if (stepsIndent < 0) continue;
    }
    let body = t;
    if (t.startsWith('- ')) { step = { name: '', run: '', continueOnError: false, line: i + 1 }; job.steps.push(step); stepIndent = n + 2; body = t.slice(2).trim(); }
    if (!step) continue;
    const kv = body.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (k === 'name') step.name = scalar(v);
    else if (k === 'continue-on-error') step.continueOnError = /^true$/i.test(scalar(v));
    else if (k === 'run') {
      if (/^[|>][+-]?\s*$/.test(v.trim())) {
        const block = [];
        for (let j = i + 1; j < lines.length; j++) { if (lines[j].trim() && ind(lines[j]) <= stepIndent) break; block.push(lines[j].trim()); i = j; }
        step.run = block.join('\n');
      } else step.run = scalar(v);
    }
  }
  return jobs;
}

/** URL paths named in a run command (--pages=, --collect.url=, localhost URLs, quoted paths in for-loops). @param {string} run */
export function pathsIn(run) {
  const out = new Set();
  for (const m of run.matchAll(/--(?:pages|collect\.url|url)=([^\s"']+)/g)) for (const p of m[1].split(',')) if (p.startsWith('/')) out.add(p);
  for (const m of run.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+|:\$\w+|:\$\{\w+\})?(\/[^\s"']*)/g)) out.add(m[1]);
  for (const m of run.matchAll(/\bfor\s+\w+\s+in\s+([^;]+);/g)) for (const p of m[1].trim().split(/\s+/)) if (p.startsWith('/')) out.add(p);
  return [...out].map((p) => p.split(/[?#]/)[0]).filter((p) => p && !/\$/.test(p));
}

const file = process.argv.find((a) => a.startsWith('--file='))?.slice(7) || join(REPO, '.github', 'workflows', 'ci.yml');
/** @type {import('./lib.mjs').Failure[]} */
const failures = [];
const PATH = '.github/workflows/ci.yml';
const fail = (/** @type {string} */ message) => failures.push({ rule: 'required-gates', path: PATH, message });

if (!existsSync(file)) console.log('  check-ci: no .github/workflows/ci.yml; nothing to check');
else {
  const jobs = parseWorkflow(readFileSync(file, 'utf8'));
  const steps = jobs.flatMap((j) => j.steps.map((s) => ({ ...s, job: j })));
  const launchStep = (/** @type {{ run: string }} */ s) => /\bSITE_MODE=launch\b/.test(s.run);
  for (const [gate, re] of GATES) {
    const hits = steps.filter((s) => re.test(s.run) && !launchStep(s));
    if (!hits.length) { fail(`no step runs the ${gate} gate (expected a run matching ${re})`); continue; }
    const hard = hits.filter((s) => !s.continueOnError && !s.job.continueOnError);
    if (!hard.length) fail(`the ${gate} gate runs only with continue-on-error (line ${hits[0].line}${hits[0].job.continueOnError ? `, job ${hits[0].job.id}` : ''}): a regression must fail CI`);
  }
  for (const s of steps) if ((s.continueOnError || s.job.continueOnError) && !launchStep(s)) fail(`step "${s.name || s.run.split('\n')[0].slice(0, 50)}" (line ${s.line}) is continue-on-error; only the launch gate (SITE_MODE=launch) may be`);
  for (const s of steps.filter((x) => /@lhci\/cli|\blhci\b/.test(x.run))) for (const m of s.run.matchAll(/categories:([\w-]+)=(warn|off)\b/g)) fail(`step "${s.name}" (line ${s.line}) turns the Lighthouse ${m[1]} budget into a ${m[2]}: budgets must fail CI`);
  const a11y = steps.filter((s) => /\btools\/a11y\.mjs\b/.test(s.run));
  if (a11y.length) {
    const widths = new Set(a11y.flatMap((s) => [...s.run.matchAll(/--widths=([\d,]+)/g)].flatMap((m) => m[1].split(',').map(Number))));
    const missing = A11Y_WIDTHS.filter((w) => !widths.has(w));
    if (missing.length) fail(`the a11y matrix does not cover ${missing.join(', ')} px (P0 #2: axe at 5 widths, --widths=${A11Y_WIDTHS.join(',')})`);
  }
  // Page paths must be live C1 URLs.
  const mapFile = join(REPO, '.orchestra', 'url-map.json');
  const map = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : null;
  const retired = new Set(map ? [...map.entries, ...(map.aliases || [])].filter((/** @type {any} */ e) => e.status === 301 && e.old).map((/** @type {any} */ e) => e.old) : ['/quote/', '/portfolio/']);
  const live = map ? new Set([...map.entries.filter((/** @type {any} */ e) => e.status === 200 || e.status === 301).map((/** @type {any} */ e) => String(e.new).split('?')[0]), ...(map.added || []).map((/** @type {any} */ e) => e.new)]) : null;
  for (const s of steps) for (const p of pathsIn(s.run)) {
    if (retired.has(p) || /^\/(?:quote|portfolio)(?:\/|$)/.test(p)) fail(`step "${s.name}" (line ${s.line}) names the retired URL ${p}; use its C1 URL`);
    else if (live && /\/$|\.html$/.test(p) && !live.has(p)) fail(`step "${s.name}" (line ${s.line}) names ${p}, which is not a C1 page in .orchestra/url-map.json`);
  }
  console.log(`  check-ci: ${jobs.length} job(s), ${steps.length} step(s) in ${PATH}`);
}
const ok = report('check-ci', failures);
if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = ok ? 0 : 1;
export default ok;
