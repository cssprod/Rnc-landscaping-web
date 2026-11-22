#!/usr/bin/env node
// @ts-check
/**
 * Traceability enforcement (CONTRACT §14 "Rules export", §16 "Enforcement"). A repository tool, not a check-*: it reads
 * .orchestra/traceability.json, so Netlify never runs it.
 *
 *   node tools/trace.mjs [--upto=<wave>] [--stream=<id>] [--file=traceability.json] [--list]
 *
 * Rules:
 *   rule-exported  a "tool" item's check "<tool>#<rule>" is listed in the literal `export const RULES = [...]` of its
 *                  checkFile. RULES is read statically from the source text: a tool is never imported, because tools
 *                  run on import.
 *   test-exists    an "e2e" or "unit" item's check ("e2e/<spec>.spec#<rule>", "unit/<test>.test#<rule>") has a test
 *                  (test/it/describe call) in its checkFile whose title contains "#<rule>".
 * --upto limits the items to those due by that wave (w0 < w1 < w2 < w3 < w3b < w4 < w5). --stream keeps the items the
 * stream implements or verifies. Items of kind manual or gate are listed as not machine-checked. Failures name the
 * check file. --repo=DIR resolves the traceability file and check files in another checkout (a scratch copy).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO as REPO_ROOT, argOpt, report } from './lib.mjs';

export const RULES = ['rule-exported', 'test-exists'];
export const WAVES = ['w0', 'w1', 'w2', 'w3', 'w3b', 'w4', 'w5'];

/**
 * The string entries of a source file's literal `export const RULES = [...]`, or null when there is none.
 * @param {string} src
 */
export function literalRules(src) {
  const start = src.search(/^export\s+const\s+RULES\s*(?::[^=]+)?=\s*\[/m);
  if (start < 0) return null;
  let i = src.indexOf('[', start) + 1;
  /** @type {string[]} */ const out = [];
  while (i < src.length) {
    const ch = src[i];
    if (ch === ']') return out;
    if (ch === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (ch === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 2; if (i < 2) break; continue; }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== ch) { if (src[j] === '\\') { s += src[j + 1]; j += 2; continue; } s += src[j++]; }
      if (ch === '`' && s.includes('${')) return null; // not a literal
      out.push(s); i = j + 1; continue;
    }
    if (/[\s,]/.test(ch)) { i++; continue; }
    return null; // an identifier, spread or call: not a literal list
  }
  return null;
}

/**
 * Test titles in a node:test or Playwright file: the first string argument of test(), it(), describe() and their
 * .only/.skip/.describe variants. Template literals keep their ${…} text, so "#rule" in the static part is found.
 * @param {string} src
 */
export function testTitles(src) {
  /** @type {string[]} */ const out = [];
  for (const m of src.matchAll(/\b(?:test|it|describe)(?:\.(?:only|skip|fixme|fail|describe|serial|parallel|todo))*\s*\(\s*(['"`])/g)) {
    const q = m[1];
    let j = /** @type {number} */ (m.index) + m[0].length, s = '';
    while (j < src.length && src[j] !== q) { if (src[j] === '\\') { s += src[j + 1]; j += 2; continue; } s += src[j++]; }
    out.push(s);
  }
  return out;
}

/** Check the traceability items; returns whether they pass. Runs only when executed (tests import the parsers). */
function main() {
const REPO = argOpt('repo') || REPO_ROOT;
const file = argOpt('file') || join(REPO, '.orchestra', 'traceability.json');
if (!existsSync(file)) { console.log(`trace: ${file} not found; nothing to check`); return true; }
const upto = argOpt('upto');
const stream = argOpt('stream');
if (upto && !WAVES.includes(upto)) { console.error(`trace: --upto must be one of ${WAVES.join(', ')}`); process.exitCode = 2; return false; }
const T = JSON.parse(readFileSync(file, 'utf8'));

/** @type {{ id: string, stream: string, verifier: string, check: string, kind: string, checkFile: string|null, due: string }[]} */
const items = [];
for (const [id, v] of Object.entries(T.items || {})) {
  const parts = v.parts ? Object.entries(v.parts).map(([k, p]) => ({ id: `${id}${k}`, ...v, ...p })) : [{ id, ...v }];
  for (const p of parts) items.push({ id: p.id, stream: p.stream, verifier: p.verifier, check: p.check, kind: p.kind, checkFile: p.checkFile || null, due: p.due || 'w5' });
}
const selected = items.filter((it) => (!upto || WAVES.indexOf(it.due) <= WAVES.indexOf(upto)) && (!stream || it.stream === stream || it.verifier === stream));

/** @type {import('./lib.mjs').Failure[]} */
const failures = [];
/** @type {Map<string, string|null>} */ const srcCache = new Map();
const source = (/** @type {string} */ f) => { if (!srcCache.has(f)) srcCache.set(f, existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), 'utf8') : null); return srcCache.get(f); };
let machine = 0;
/** @type {string[]} */ const manual = [];
for (const it of selected) {
  const rule = it.check?.split('#').slice(1).join('#');
  if (it.kind === 'manual' || it.kind === 'gate' || !it.checkFile) { manual.push(`${it.id} ${it.check}`); continue; }
  machine++;
  const src = source(it.checkFile);
  const who = `${it.id} (${it.check}; implementer ${it.stream}, verifier ${it.verifier}, due ${it.due})`;
  if (src === null) { failures.push({ rule: it.kind === 'tool' ? 'rule-exported' : 'test-exists', path: it.checkFile, message: `${who}: the check file does not exist` }); continue; }
  if (it.kind === 'tool') {
    const rules = literalRules(src);
    if (!rules) failures.push({ rule: 'rule-exported', path: it.checkFile, message: `${who}: no literal top-level \`export const RULES = [...]\`` });
    else if (!rules.includes(rule)) failures.push({ rule: 'rule-exported', path: it.checkFile, message: `${who}: "${rule}" is not in RULES (${rules.join(', ') || 'empty'})` });
  } else if (it.kind === 'e2e' || it.kind === 'unit') {
    if (!testTitles(src).some((t) => new RegExp(`#${rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(t))) failures.push({ rule: 'test-exists', path: it.checkFile, message: `${who}: no test whose title contains "#${rule}"` });
  } else failures.push({ rule: 'rule-exported', path: it.checkFile, message: `${who}: unknown kind "${it.kind}"` });
}
if (process.argv.includes('--list')) for (const it of selected) console.log(`  ${it.id.padEnd(8)} ${String(it.due).padEnd(4)} ${String(it.kind).padEnd(6)} ${it.check}  (${it.stream} / ${it.verifier})`);
console.log(`  trace: ${selected.length} item(s)${upto ? ` due by ${upto}` : ''}${stream ? ` for ${stream}` : ''}: ${machine} machine-checked, ${manual.length} manual or gate (${manual.join('; ') || 'none'})`);
return report('trace', failures);
}
if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = process.exitCode || (main() ? 0 : 1);
