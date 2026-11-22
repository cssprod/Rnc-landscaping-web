#!/usr/bin/env node
// @ts-check
/**
 * CI gate coverage (blueprint P0 #2: "Lighthouse CI budgets, axe/Playwright at 5 widths and a link checker in the build;
 * the build fails on any regression"). Offline: reads .github/workflows/ci.yml (and .orchestra/url-map.json when
 * present). Exits 0 when there is no ci.yml.
 *
 * Rule:
 *   required-gates  ci.yml has a step for each gate (typecheck, unit tests, build, check-all with its link checker, the
 *                   CSP check, Playwright, the a11y matrix at 320/390/768/1024/1440, the motion and text-over-media
 *                   audits, Lighthouse); none of them, and no
 *                   job that holds them, is continue-on-error (only the launch-gate step, the one that builds with
 *                   SITE_MODE=launch, may be); and every page path a step names is a live C1 URL, never a retired one
 *                   (/quote/, /portfolio/…). A gate must also really run and really fail: its command is in command
 *                   position (not after echo, in a comment or inside quotes); the step and its job carry no `if:` other
 *                   than success()/always()/!cancelled(); the step does not swallow the exit status (`|| true`, `|| :`,
 *                   `|| exit 0`, `|| echo`, `exit 0`, `set +e`, a pipe without pipefail, a trailing `&`) and no `shell:`
 *                   drops -e; the gate keeps its full strength: unit tests over "tests/unit/**\/*.test.mjs" and
 *                   Playwright with no test filter (no --grep/--shard…, no spec-file arguments), Lighthouse at
 *                   --runs >= 3 without --allow-slow, the a11y matrix, the audits and Lighthouse on every template
 *                   page (no --pages, or --pages=all), a11y in both themes and both motion states, text-over-media at
 *                   --min >= 4.5.
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
  ['motion audit', /\btools\/motion-audit\.mjs\b/],
  ['text-over-media audit', /\btools\/text-over-media\.mjs\b/],
  ['Lighthouse', /\btools\/lighthouse\.mjs\b|@lhci\/cli|\blhci\s+autorun\b/],
]);
/** Browser gates that run on every template page unless --pages narrows them. */
const PAGE_GATES = new Set(['a11y matrix (axe)', 'motion audit', 'text-over-media audit', 'Lighthouse']);
/** Playwright options that take a separate value (`--trace off`), so the value is not a test filter. */
const PW_VALUE = /^(?:--(?:trace|project|config|reporter|workers|retries|timeout|output|repeat-each|max-failures|global-timeout|tsconfig|update-snapshots)|-[cjx])$/;
export const A11Y_WIDTHS = [320, 390, 768, 1024, 1440];

/**
 * The jobs and steps of a GitHub Actions workflow: enough YAML for this repo's ci.yml (block mappings, "- " step items,
 * inline flow maps on one line, `|` / `>` block scalars).
 * @param {string} yaml
 * @returns {{ id: string, continueOnError: boolean, if: string, steps: { name: string, run: string, continueOnError: boolean, if: string, shell: string, line: number }[] }[]}
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
      if (m) { job = { id: m[1], continueOnError: false, if: '', steps: [] }; jobs.push(job); jobIndent = n; stepsIndent = -1; step = null; continue; }
    }
    if (!job) continue;
    if (stepsIndent < 0 || n <= stepsIndent) {
      if (/^steps:\s*$/.test(t)) { stepsIndent = n; step = null; continue; }
      const coe = t.match(/^continue-on-error:\s*(.+)$/);
      if (coe && n === jobIndent + 2) job.continueOnError = !/^false$/i.test(scalar(coe[1]));
      const jif = t.match(/^if:\s*(.+)$/);
      if (jif && n === jobIndent + 2) job.if = scalar(jif[1]) || 'true';
      if (n <= stepsIndent) stepsIndent = -1;
      if (stepsIndent < 0) continue;
    }
    let body = t;
    if (t.startsWith('- ')) { step = { name: '', run: '', continueOnError: false, if: '', shell: '', line: i + 1 }; job.steps.push(step); stepIndent = n + 2; body = t.slice(2).trim(); }
    if (!step) continue;
    const kv = body.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (k === 'name') step.name = scalar(v);
    // Anything but a literal false counts: an expression such as ${{ true }} or ${{ github.event_name == 'push' }} can be on.
    else if (k === 'continue-on-error') step.continueOnError = !/^false$/i.test(scalar(v));
    else if (k === 'if') step.if = scalar(v) || 'true';
    else if (k === 'shell') step.shell = scalar(v);
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

/** `if:` conditions that never skip a step that would otherwise run. */
const HARMLESS_IF = /^(?:\$\{\{\s*)?(?:success\(\)|always\(\)|!\s*cancelled\(\))(?:\s*\}\})?$/;

/**
 * A run script with quoted strings and $(…) substitutions blanked, and comments dropped: what the shell executes as
 * commands. An `echo "node tools/a11y.mjs"` keeps no gate text; `X="$(a || b)" node …` keeps no `||`.
 * @param {string} run
 */
export function shellCode(run) {
  let s = run.replace(/\$\((?:[^()]|\([^()]*\))*\)/g, 'SUB').replace(/'[^'\n]*'/g, 'Q').replace(/"(?:[^"\\\n]|\\.)*"/g, 'Q');
  s = s.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '$1')).join('\n');
  return s;
}

/**
 * The simple commands of a run script (split on newlines, ;, &&, ||, |), each with leading env assignments and a
 * leading `npx [--flags]` removed, and the operator that follows it.
 * @param {string} run
 * @returns {{ cmd: string, next: string }[]}
 */
export function simpleCommands(run) {
  const code = shellCode(run);
  /** @type {{ cmd: string, next: string }[]} */ const out = [];
  const re = /(\|\||&&|;|\n|\||(?<![>&])&(?![&>]))/g;
  let last = 0;
  for (let m; (m = re.exec(code));) { out.push({ cmd: code.slice(last, m.index), next: m[1] }); last = re.lastIndex; }
  out.push({ cmd: code.slice(last), next: '' });
  return out.map(({ cmd, next }) => ({
    cmd: cmd.trim().replace(/^(?:(?:then|do|else|\{)\s+|\(\s*)+/, '').replace(/\s*\)$/, '').replace(/^(?:[A-Za-z_]\w*=\S*\s+)+/, '').replace(/^npx(?:\s+--?[\w-]+)*\s+/, '').trim(),
    next,
  })).filter((c) => c.cmd);
}

/** Does a simple command run the gate (the gate regex matches and the command word is node, tsc or npx)? @param {string} cmd @param {RegExp} re */
const runsGate = (cmd, re) => re.test(cmd) && /^(?:\S*\/)?(?:node|tsc|npx|playwright)\b/.test(cmd);

/**
 * Why a step that runs a gate does not really gate (empty when it does).
 * @param {{ run: string, if: string, shell: string }} step @param {{ if: string }} job @param {string} gate @param {RegExp} re
 */
export function neutralised(step, job, gate, re) {
  /** @type {string[]} */ const why = [];
  if (step.if && !HARMLESS_IF.test(step.if)) why.push(`the step has \`if: ${step.if}\``);
  if (job.if && !HARMLESS_IF.test(job.if)) why.push(`its job has \`if: ${job.if}\``);
  if (step.shell && !/(?:^|\s)-\w*e/.test(step.shell) && !/^(?:pwsh|powershell|cmd|python)\b/.test(step.shell)) why.push(`\`shell: ${step.shell}\` drops -e`);
  const code = shellCode(step.run);
  const cmds = simpleCommands(step.run);
  for (const m of code.matchAll(/\|\|\s*([^\n;&|]*)/g)) if (!/^exit\s+[1-9]\d*\s*$/.test(m[1].trim())) why.push(`\`|| ${m[1].trim()}\` swallows the exit status`);
  if (/\bexit\s+0\b|\bexit\s*(?:$|[;\n])/m.test(code)) why.push('`exit 0` ends the step green');
  if (/\bset\s+\+\w*e\b|\bset\s+\+o\s+errexit\b/.test(code)) why.push('`set +e` ignores failures');
  const i = cmds.findIndex((c) => runsGate(c.cmd, re));
  if (i >= 0 && cmds[i].next === '|' && !/\bset\s+-\w*o\s+pipefail\b|\bset\s+-o\s+pipefail\b/.test(code)) why.push('its output is piped without `set -o pipefail`, so the pipe\'s last command decides');
  if (cmds.some((c) => runsGate(c.cmd, re) && c.next === '&')) why.push('it runs in the background (`&`), so its exit status is lost');
  const gateCmds = cmds.filter((c) => runsGate(c.cmd, re)).map((c) => c.cmd);
  const opt = (/** @type {string} */ name) => gateCmds.map((c) => c.match(new RegExp(`(?:^|\\s)--${name}(?:=(\\S*)|\\s|$)`))).find(Boolean);
  if (gate === 'unit tests' || gate === 'Playwright') {
    const filter = gateCmds.map((c) => c.match(/(?:^|\s)(--test-name-pattern|--test-skip-pattern|--test-only|--grep|--grep-invert|-g|--last-failed|--only-changed|--pass-with-no-tests|--list|--shard)\b/)).find(Boolean);
    if (filter) why.push(`${filter[1]} runs only part of the suite`);
  }
  // Positional arguments, read from the raw command (shellCode blanks quoted globs): a file or filter narrows the suite.
  /** Arguments after the gate's command words, unquoted. @param {RegExp} head */
  const args = (head) => [...step.run.matchAll(new RegExp(`${head.source}([^\\n;&|]*)`, 'g'))].map((m) => (m[1].match(/"[^"]*"|'[^']*'|\S+/g) || []).map((x) => x.replace(/^(['"])(.*)\1$/, '$2')));
  if (gate === 'unit tests') {
    for (const a of args(/\bnode\s+--test\b/)) {
      const files = a.filter((x, k) => !x.startsWith('-') && !/^--test-(?:reporter|reporter-destination|concurrency|timeout)$/.test(a[k - 1] || ''));
      if (files.length && !files.some((x) => x === 'tests/unit/**/*.test.mjs' || x === 'tests/**/*.test.mjs')) why.push(`\`node --test ${files.join(' ')}\` runs only those files (use "tests/unit/**/*.test.mjs")`);
    }
  }
  if (gate === 'Playwright') {
    for (const a of args(/\bplaywright(?:\/cli\.js)?\s+test\b/)) {
      const filters = a.filter((x, k) => !x.startsWith('-') && !(k > 0 && PW_VALUE.test(a[k - 1])));
      if (filters.length) why.push(`the test filter \`${filters.join(' ')}\` runs only part of the suite`);
    }
  }
  if (PAGE_GATES.has(gate) && !(gate === 'Lighthouse' && !gateCmds.some((c) => /\btools\/lighthouse\.mjs\b/.test(c)))) {
    const pages = opt('pages');
    if (pages && pages[1] !== 'all') why.push(`--pages=${pages[1] ?? ''} drops template pages (use --pages=all or no --pages)`);
  }
  if (gate === 'text-over-media audit') {
    const min = opt('min');
    if (min && !(Number(min[1]) >= 4.5)) why.push(`--min=${min[1] ?? ''} is below the 4.5:1 text contrast`);
  }
  if (gate === 'Lighthouse' && gateCmds.some((c) => /\btools\/lighthouse\.mjs\b/.test(c))) {
    const runs = opt('runs');
    if (runs && !(Number(runs[1]) >= 3)) why.push(`--runs=${runs[1] ?? ''} is not a median of 3`);
    if (opt('allow-slow')) why.push('--allow-slow judges scores on a machine too slow to trust');
  }
  if (gate === 'a11y matrix (axe)') {
    const themes = opt('themes'), motion = opt('motion');
    if (themes && !['dark', 'light'].every((x) => String(themes[1]).split(',').includes(x))) why.push(`--themes=${themes[1]} does not cover dark and light`);
    if (motion && !['off', 'on'].every((x) => String(motion[1]).split(',').includes(x))) why.push(`--motion=${motion[1]} does not cover off and on`);
  }
  return why;
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
    // A gate counts only where the shell would run it as a command (not echoed, commented out or quoted).
    const hits = steps.filter((s) => simpleCommands(s.run).some((c) => runsGate(c.cmd, re)) && !launchStep(s));
    if (!hits.length) { fail(`no step runs the ${gate} gate (expected a command matching ${re})`); continue; }
    const hard = hits.filter((s) => !s.continueOnError && !s.job.continueOnError);
    if (!hard.length) { fail(`the ${gate} gate runs only with continue-on-error (line ${hits[0].line}${hits[0].job.continueOnError ? `, job ${hits[0].job.id}` : ''}): a regression must fail CI`); continue; }
    const real = hard.filter((s) => !neutralised(s, s.job, gate, re).length);
    if (!real.length) fail(`the ${gate} gate (line ${hard[0].line}) cannot fail CI: ${neutralised(hard[0], hard[0].job, gate, re).join('; ')}`);
  }
  for (const m of readFileSync(file, 'utf8').matchAll(/^\s*shell:\s*(.+)$/gm)) { const v = m[1].trim().replace(/^(['"])(.*)\1$/, '$2'); if (!/(?:^|\s)-\w*e/.test(v) && !/^(?:pwsh|powershell|cmd|python)\b/.test(v)) fail(`\`shell: ${v}\` runs steps without -e: a failing command mid-script no longer fails the step`); }
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
