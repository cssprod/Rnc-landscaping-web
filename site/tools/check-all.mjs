#!/usr/bin/env node
// @ts-check
/** Build (unless --no-build) then run every static check. Exit 1 on any failure. */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const site = fileURLToPath(new URL('..', import.meta.url));
if (!process.argv.includes('--no-build')) execFileSync(process.execPath, ['build.mjs', ...process.argv.filter((a) => a === '--offline-images')], { cwd: site, stdio: 'inherit' });
const results = [];
for (const t of ['check-links', 'check-html', 'check-placeholders', 'budgets']) results.push((await import(`./${t}.mjs`)).default);
process.exit(results.every(Boolean) ? 0 : 1);
