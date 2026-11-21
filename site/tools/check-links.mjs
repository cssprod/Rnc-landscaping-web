#!/usr/bin/env node
// @ts-check
/** Every internal href/src in dist resolves to a file. */
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, files, read, report } from './lib.mjs';
import { site } from '../site.config.mjs';
// Files RNC still has to supply: warnings in showcase builds, errors in launch builds.
const pending = new Set([site.capabilityStatement].filter(Boolean));
const strict = process.env.SITE_MODE === 'launch';
const warned = new Set();
const errors = [];
for (const f of files()) {
  const html = read(f);
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const u = m[1].replace(/&amp;/g, '&');
    if (!u.startsWith('/') || u.startsWith('//')) continue;
    const path = decodeURIComponent(u.split(/[?#]/)[0]);
    const t = join(DIST, path);
    const ok = existsSync(t) && (statSync(t).isFile() || existsSync(join(t, 'index.html')));
    if (!ok && pending.has(path) && !strict) { if (!warned.has(path)) console.warn(`  warn: ${path} not supplied yet (linked from ${f} and others)`); warned.add(path); continue; }
    if (!ok) errors.push(`${f}: broken link ${u}`);
    if (ok && statSync(t).isDirectory() && !path.endsWith('/')) errors.push(`${f}: missing trailing slash ${u}`);
  }
}
const ok = report('internal links', errors);
if (import.meta.url === `file://${process.argv[1]}`) process.exit(ok ? 0 : 1);
export default ok;
