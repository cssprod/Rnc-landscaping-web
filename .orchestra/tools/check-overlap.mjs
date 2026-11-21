#!/usr/bin/env node
// Machine check: no path is owned by two streams within one wave.
// Universe = git ls-files ∪ ownership.plannedFiles ∪ synthetic probes derived from every glob.
// Usage: node check-overlap.mjs <repo>
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const REPO = process.argv[2];
const own = JSON.parse(readFileSync(join(REPO, '.orchestra/ownership.json'), 'utf8'));

/** expand {a,b} (nested ok) */
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
const compile = (globs) => globs.flatMap(braces).map(toRe);
// probe paths: concrete instances of each glob (replace ** with a/b, * with x, ? with 9)
const probes = (g) => braces(g).flatMap((e) => [e.replace(/\*\*/g, 'probe/deep').replace(/\*/g, 'x').replace(/\?/g, '9'), e.replace(/\*\*\//g, '').replace(/\*\*/g, 'f.mjs').replace(/\*/g, 'y').replace(/\?/g, '0')]);

const tracked = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8' }).trim().split('\n');
let failures = 0; const report = [];
for (const [wave, streams] of Object.entries(own.waves)) {
  const ids = Object.keys(streams);
  const res = Object.fromEntries(ids.map((id) => [id, compile(streams[id].owns)]));
  const universe = new Set([...tracked, ...own.plannedFiles, ...ids.flatMap((id) => streams[id].owns.flatMap(probes))]);
  const clashes = [];
  for (const f of universe) {
    const hit = ids.filter((id) => res[id].some((r) => r.test(f)));
    if (hit.length > 1) clashes.push(`${f} ← ${hit.join(' + ')}`);
  }
  // owns vs own forbidden (self-contradiction)
  const selfx = [];
  for (const id of ids) {
    const fb = compile(streams[id].forbidden || []);
    for (const f of universe) if (res[id].some((r) => r.test(f)) && fb.some((r) => r.test(f))) selfx.push(`${id}: ${f}`);
  }
  const ownedPlanned = own.plannedFiles.filter((f) => ids.some((id) => res[id].some((r) => r.test(f)))).length;
  failures += clashes.length + selfx.length;
  report.push(`${wave}: ${ids.length} streams, ${universe.size} paths checked, ${clashes.length} overlaps, ${selfx.length} owns∩forbidden, ${ownedPlanned}/${own.plannedFiles.length} planned files owned this wave`);
  for (const c of clashes.slice(0, 20)) report.push(`  OVERLAP ${c}`);
  for (const c of selfx.slice(0, 20)) report.push(`  SELF ${c}`);
}
// planned files with no owner in any wave (excluding integrator/readonly)
const allRes = Object.values(own.waves).flatMap((s) => Object.values(s).flatMap((x) => compile(x.owns)));
const orphan = own.plannedFiles.filter((f) => !(own.seedOnly || []).includes(f) && !allRes.some((r) => r.test(f)));
report.push(`planned files never owned by any stream: ${orphan.length}${orphan.length ? ' → ' + orphan.join(', ') : ''}`);
console.log(report.join('\n'));
console.log(failures ? `FAIL (${failures})` : 'PASS: no overlaps within any wave');
process.exit(failures || orphan.length ? 1 : 0);
