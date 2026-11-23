#!/usr/bin/env node
// Merge gate: does a branch touch only what its stream owns in that wave?
// Frozen orchestration tool (architect lane). It is not a site/tools/check-* tool, so check-all and Netlify never run it.
//   node .orchestra/tools/ownership.mjs --stream=<id> --wave=<w0|w1|w2|w3|w3b|w4|w5> --base=<sha> [--head=<ref>] [--json]
//   node .orchestra/tools/ownership.mjs --stream=<id> --wave=<w> --list      # print the stream's owns/forbidden
// Rules (ownership.json): every changed path must match the stream's owns for that wave and none of its forbidden globs;
// readOnly streams may change nothing; appendOnly files may only gain lines. ownership.json is read from --base, so a
// branch cannot widen its own write set.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

export const RULES = ['every-merge', 'append-only', 'read-only'];

const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : undefined; };
const flag = (k) => process.argv.includes(`--${k}`);
const REPO = resolve(arg('repo') || join(fileURLToPath(new URL('.', import.meta.url)), '..', '..'));
const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] });

function braces(g) {
  const i = g.indexOf('{');
  if (i < 0) return [g];
  let depth = 0, j = i;
  for (; j < g.length; j++) { if (g[j] === '{') depth++; else if (g[j] === '}' && --depth === 0) break; }
  const inner = g.slice(i + 1, j); const parts = []; let d = 0, s = 0;
  for (let k = 0; k < inner.length; k++) { if (inner[k] === '{') d++; else if (inner[k] === '}') d--; else if (inner[k] === ',' && d === 0) { parts.push(inner.slice(s, k)); s = k + 1; } }
  parts.push(inner.slice(s));
  return parts.flatMap((p) => braces(g.slice(0, i) + p + g.slice(j + 1)));
}
const toRe = (g) => new RegExp('^' + g.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '\u0000').replace(/\*\*/g, '\u0001').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '(?:.*/)?').replace(/\u0001/g, '.*') + '$');
export const compile = (globs) => (globs || []).flatMap(braces).map(toRe);
export const matches = (res, f) => res.some((r) => r.test(f));

function main() {
  const stream = arg('stream'); const wave = arg('wave'); const base = arg('base'); const head = arg('head') || 'HEAD';
  if (!stream || !wave) { console.error('usage: ownership.mjs --stream=<id> --wave=<w> --base=<sha> [--head=<ref>] [--json] | --list'); process.exit(2); }
  let ownJson;
  try { ownJson = base ? git('show', `${base}:.orchestra/ownership.json`) : null; } catch { ownJson = null; }
  if (!ownJson) {
    const f = join(REPO, '.orchestra/ownership.json');
    if (!existsSync(f)) { console.error('ownership.json not found at --base or in the working tree'); process.exit(2); }
    ownJson = readFileSync(f, 'utf8');
    if (base) console.warn('warn: --base has no .orchestra/ownership.json; using the working-tree copy');
  }
  const own = JSON.parse(ownJson);
  const entry = own.waves?.[wave]?.[stream];
  if (!entry) { console.error(`stream "${stream}" has no entry in wave "${wave}"`); process.exit(2); }
  if (flag('list')) { console.log(JSON.stringify(entry, null, 2)); return 0; }
  if (!base) { console.error('--base=<sha> is required'); process.exit(2); }
  const owns = compile(entry.owns); const forb = compile(entry.forbidden); const appendOnly = own.appendOnly || [];
  const changed = git('diff', '--name-only', '--no-renames', `${base}...${head}`).split('\n').filter(Boolean);
  const violations = [];
  for (const f of changed) {
    if (entry.readOnly) { violations.push({ rule: 'read-only', path: f, message: 'read-only stream changed a file' }); continue; }
    if (!matches(owns, f)) violations.push({ rule: 'every-merge', path: f, message: 'not in owns' });
    else if (matches(forb, f)) violations.push({ rule: 'every-merge', path: f, message: 'matches forbidden' });
  }
  for (const f of changed.filter((x) => appendOnly.includes(x))) {
    const diff = git('diff', '--unified=0', '--no-renames', `${base}...${head}`, '--', f);
    const removed = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
    if (removed.length) violations.push({ rule: 'append-only', path: f, message: `${removed.length} line(s) removed or changed in an append-only file` });
  }
  const result = { stream, wave, base, head, changed: changed.length, violations };
  if (flag('json')) console.log(JSON.stringify(result, null, 2));
  else {
    for (const v of violations) console.log(`FAIL ${v.rule}: ${v.path} (${v.message})`);
    console.log(violations.length ? `ownership: ${violations.length} violation(s) in ${changed.length} changed file(s) for ${stream}@${wave}` : `ownership: OK, ${changed.length} changed file(s) all owned by ${stream}@${wave}`);
  }
  return violations.length ? 1 : 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
