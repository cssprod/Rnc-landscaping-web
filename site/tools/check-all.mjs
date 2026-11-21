#!/usr/bin/env node
// @ts-check
/**
 * Build (unless --no-build), then run every static check: each site/tools/check-*.mjs (auto-discovered, name order)
 * and budgets.mjs. Exit 1 on any failure. Netlify runs this, so every check-* tool must run offline with only SITE_DIST,
 * need no Playwright, devtools or .orchestra git refs, and pass (export default true) when it does not apply
 * (CONTRACT §14). Browser tools are never named check-*.
 *   node tools/check-all.mjs [--no-build] [--offline-images] [--out=DIR] [tool flags such as --url-map, --no-baseline]
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RULES = [];

const site = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const out = argv.find((a) => a.startsWith('--out='))?.slice(6);
// Every tool reads SITE_DIST through tools/lib.mjs; set it before any tool is imported.
if (out) process.env.SITE_DIST = resolve(out);
if (!argv.includes('--no-build')) {
  execFileSync(process.execPath, ['build.mjs', ...argv.filter((a) => a === '--offline-images' || a === '--no-minify')], { cwd: site, stdio: 'inherit', env: process.env });
}
const self = fileURLToPath(import.meta.url).split('/').pop();
const tools = readdirSync(fileURLToPath(new URL('.', import.meta.url))).filter((f) => /^check-.*\.mjs$/.test(f) && f !== self).sort();
/** @type {{ tool: string, ok: boolean }[]} */
const results = [];
for (const t of [...tools, 'budgets.mjs']) {
  try {
    const ok = await (await import(`./${t}`)).default;
    results.push({ tool: t, ok: ok !== false });
  } catch (e) {
    console.error(`✗ ${t} crashed: ${e instanceof Error ? e.stack : e}`);
    results.push({ tool: t, ok: false });
  }
}
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `✗ check-all: ${bad.map((r) => r.tool).join(', ')} failed` : `✓ check-all: ${results.length} tools passed (${results.map((r) => r.tool.replace(/\.mjs$/, '')).join(', ')})`);
process.exit(bad.length ? 1 : 0);
