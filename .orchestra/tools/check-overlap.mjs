#!/usr/bin/env node
// Machine check of .orchestra/ownership.json (and its traceability cross-references).
//   1. no path is owned by two streams within one wave;
//   2. no overlap inside a "concurrent" group (streams that run at the same time across a wave boundary);
//   3. no stream owns a path its own forbidden list names;
//   4. owns ∩ frozen is reported as an override (allowed: a wave's owns overrides frozen for that wave);
//   5. an independent engine (node:path matchesGlob) agrees with this file's regex engine on every match;
//   6. every planned file has an owner in some wave (seedOnly and integratorFiles excepted); every appendOnly file has one;
//   7. every traceability stream and verifier exists, and every verifier's brief lists the rule in providesRules.
// Universe = git ls-files ∪ plannedFiles ∪ every legacy slice (incl. the fallback example) ∪ synthetic probes of every glob.
// Usage: node .orchestra/tools/check-overlap.mjs <repo>
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path, { join } from 'node:path';
import { compile, matches } from './ownership.mjs';

const REPO = process.argv[2] || '.';
const J = (f) => JSON.parse(readFileSync(join(REPO, f), 'utf8'));
const own = J('.orchestra/ownership.json');
const lmap = existsSync(join(REPO, '.orchestra/legacy-css-map.json')) ? J('.orchestra/legacy-css-map.json') : { segments: [] };
const trace = existsSync(join(REPO, '.orchestra/traceability.json')) ? J('.orchestra/traceability.json') : { items: {} };

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
// probe paths: concrete instances of each glob (replace ** with a/b, * with x, ? with 9)
const probes = (g) => braces(g).flatMap((e) => [e.replace(/\*\*/g, 'probe/deep').replace(/\*/g, 'x').replace(/\?/g, '9'), e.replace(/\*\*\//g, '').replace(/\*\*/g, 'f.mjs').replace(/\*/g, 'y').replace(/\?/g, '0')]);

const tracked = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8' }).trim().split('\n');
const sliceFiles = [...new Set([...lmap.segments.map((s) => s.file), lmap.fallbackSlice?.example].filter(Boolean))];
const allStreams = Object.values(own.waves).flatMap((ss) => Object.values(ss));
const universe = new Set([...tracked, ...own.plannedFiles, ...sliceFiles, ...allStreams.flatMap((x) => [...x.owns, ...(x.forbidden || [])].flatMap(probes))]);
let failures = 0; const report = [];
const compiled = {}; const res = (wave, id) => (compiled[`${wave}:${id}`] ??= compile(own.waves[wave][id].owns));

// 1, 3, 4 per wave
const frozenFor = (w) => [...(own.frozen?.always || []), ...(['w0', 'w1'].includes(w) ? [] : own.frozen?.afterW1 || []), ...(['w3'].includes(w) ? own.frozen?.w3 || [] : [])];
let overrides = 0;
for (const [wave, streams] of Object.entries(own.waves)) {
  const ids = Object.keys(streams);
  const clashes = []; const selfx = [];
  for (const f of universe) {
    const hit = ids.filter((id) => matches(res(wave, id), f));
    if (hit.length > 1) clashes.push(`${f} ← ${hit.join(' + ')}`);
  }
  for (const id of ids) {
    const fb = compile(streams[id].forbidden || []);
    for (const f of universe) if (matches(res(wave, id), f) && matches(fb, f)) selfx.push(`${id}: ${f}`);
  }
  const fz = compile(wave === 'w0' ? [] : frozenFor(wave)); let ov = 0;
  for (const id of ids) for (const f of universe) if (matches(res(wave, id), f) && matches(fz, f)) ov++;
  overrides += ov;
  const ownedPlanned = own.plannedFiles.filter((f) => ids.some((id) => matches(res(wave, id), f))).length;
  failures += clashes.length + selfx.length;
  report.push(`${wave}: ${ids.length} streams, ${universe.size} paths checked, ${clashes.length} overlaps, ${selfx.length} owns∩forbidden, ${ov} owns∩frozen overrides (allowed), ${ownedPlanned}/${own.plannedFiles.length} planned files owned this wave`);
  for (const c of clashes.slice(0, 20)) report.push(`  OVERLAP ${c}`);
  for (const c of selfx.slice(0, 20)) report.push(`  SELF ${c}`);
}
// 2. concurrent groups
for (const g of own.concurrent || []) {
  const members = g.members.flatMap((m) => Object.keys(own.waves[m.wave]).filter((id) => (m.streams === '*' || m.streams.includes(id)) && !(m.except || []).includes(id)).map((id) => ({ wave: m.wave, id })));
  const clashes = [];
  for (const f of universe) {
    const hit = members.filter((m) => matches(res(m.wave, m.id), f));
    const distinct = new Set(hit.map((m) => m.id));
    if (distinct.size > 1) clashes.push(`${f} ← ${hit.map((m) => `${m.wave}:${m.id}`).join(' + ')}`);
  }
  failures += clashes.length;
  report.push(`concurrent "${g.label}": ${members.length} stream-waves, ${clashes.length} overlaps`);
  for (const c of clashes.slice(0, 20)) report.push(`  OVERLAP ${c}`);
}
// 5. independent engine
if (typeof path.matchesGlob === 'function') {
  let n = 0; const dis = [];
  for (const [wave, streams] of Object.entries(own.waves)) for (const [id, s] of Object.entries(streams)) for (const g of s.owns) {
    const re = compile([g]);
    for (const f of universe) { n++; const a = matches(re, f); const b = braces(g).some((e) => path.matchesGlob(f, e)); if (a !== b) dis.push(`${wave}:${id} ${g} ~ ${f}: regex=${a} matchesGlob=${b}`); }
  }
  failures += dis.length;
  report.push(`engine cross-check (node:path matchesGlob): ${n} glob×path pairs, ${dis.length} disagreements`);
  for (const d of dis.slice(0, 20)) report.push(`  ENGINE ${d}`);
} else report.push('engine cross-check skipped (node:path matchesGlob unavailable)');
// 6. orphans and appendOnly owners
const allRes = Object.entries(own.waves).flatMap(([w, s]) => Object.keys(s).map((id) => res(w, id)));
const exempt = compile([...(own.seedOnly || []), ...(own.integratorFiles || [])]);
const orphan = own.plannedFiles.filter((f) => !matches(exempt, f) && !allRes.some((r) => matches(r, f)));
report.push(`planned files never owned by any stream: ${orphan.length}${orphan.length ? ' → ' + orphan.join(', ') : ''}`);
const unownedAppend = (own.appendOnly || []).filter((f) => !allRes.some((r) => matches(r, f)));
report.push(`appendOnly files without an owner: ${unownedAppend.length}${unownedAppend.length ? ' → ' + unownedAppend.join(', ') : ''}`);
failures += orphan.length + unownedAppend.length;
// 7. traceability cross-references
const known = new Set(Object.values(own.waves).flatMap((s) => Object.keys(s)));
const tErr = [];
for (const [id, v] of Object.entries(trace.items || {})) {
  if (!known.has(v.stream)) tErr.push(`${id}: unknown stream ${v.stream}`);
  if (v.verifier && !known.has(v.verifier)) tErr.push(`${id}: unknown verifier ${v.verifier}`);
  const bf = join(REPO, '.orchestra/briefs', `${v.verifier}.json`);
  if (v.verifier && existsSync(bf)) { const b = JSON.parse(readFileSync(bf, 'utf8')); if (!(b.providesRules || []).some((p) => p.check === v.check)) tErr.push(`${id}: ${v.check} missing from briefs/${v.verifier}.json providesRules`); }
  const sb = join(REPO, '.orchestra/briefs', `${v.stream}.json`);
  if (existsSync(sb)) { const b = JSON.parse(readFileSync(sb, 'utf8')); if (!(b.acceptance || []).some((a) => a.startsWith(`${id}:`))) tErr.push(`${id}: missing from briefs/${v.stream}.json acceptance`); }
}
failures += tErr.length;
report.push(`traceability: ${Object.keys(trace.items || {}).length} items, ${tErr.length} cross-reference errors`);
for (const e of tErr.slice(0, 20)) report.push(`  TRACE ${e}`);
console.log(report.join('\n'));
console.log(failures ? `FAIL (${failures})` : `PASS: no overlaps within any wave or concurrent group; ${overrides} frozen overrides are explicit owns`);
process.exit(failures ? 1 : 0);
