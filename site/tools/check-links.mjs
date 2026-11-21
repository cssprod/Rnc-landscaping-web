#!/usr/bin/env node
// @ts-check
/**
 * Every internal href/src in dist resolves to a file.
 *   --url-map[=FILE]  also accept every C1 target in .orchestra/url-map.json (entries[].new, added[].new, aliases[].new)
 *                     as existing, so content already written on the new URLs passes on the seed base (read from
 *                     process.argv, so it works through check-all too).
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIST, files, read, report } from './lib.mjs';
import { site } from '../site.config.mjs';
// Files RNC still has to supply: warnings in showcase builds, errors in launch builds.
const pending = new Set([site.capabilityStatement].filter(Boolean));
const strict = process.env.SITE_MODE === 'launch';
const warned = new Set();
const errors = [];
/** C1 targets accepted as existing under --url-map (paths only; queries and fragments dropped). @type {Set<string>} */
const mapped = new Set();
const mapArg = process.argv.find((a) => a === '--url-map' || a.startsWith('--url-map='));
if (mapArg) {
  const mapFile = mapArg.includes('=') ? mapArg.slice(mapArg.indexOf('=') + 1) : fileURLToPath(new URL('../../.orchestra/url-map.json', import.meta.url));
  if (!existsSync(mapFile)) console.warn(`  warn: --url-map: ${mapFile} not found; no extra targets accepted`);
  else {
    const map = JSON.parse(readFileSync(mapFile, 'utf8'));
    for (const e of [...(map.entries || []), ...(map.added || []), ...(map.aliases || [])]) {
      if (typeof e.new === 'string' && e.new.startsWith('/')) mapped.add(decodeURIComponent(e.new.split(/[?#]/)[0]));
    }
  }
}
for (const f of files()) {
  const html = read(f);
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const u = m[1].replace(/&amp;/g, '&');
    if (!u.startsWith('/') || u.startsWith('//')) continue;
    const path = decodeURIComponent(u.split(/[?#]/)[0]);
    const t = join(DIST, path);
    const ok = existsSync(t) && (statSync(t).isFile() || existsSync(join(t, 'index.html')));
    if (!ok && mapped.has(path)) continue;
    if (!ok && pending.has(path) && !strict) { if (!warned.has(path)) console.warn(`  warn: ${path} not supplied yet (linked from ${f} and others)`); warned.add(path); continue; }
    if (!ok) errors.push(`${f}: broken link ${u}`);
    if (ok && statSync(t).isDirectory() && !path.endsWith('/')) errors.push(`${f}: missing trailing slash ${u}`);
  }
}
const ok = report('internal links', errors);
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
