#!/usr/bin/env node
// @ts-check
/**
 * Local tool links (seed version; W1 build completes it with --devtools).
 *   node tools/dev-setup.mjs   symlink site/node_modules/{playwright,playwright-core,@types/node} from /opt/node-tools (untracked; node_modules/ is git-ignored)
 */
import { existsSync, lstatSync, mkdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('..', import.meta.url));
const SRC = process.env.NODE_TOOLS || '/opt/node-tools/node_modules';
const NM = join(SITE, 'node_modules');
// site/node_modules must be a real directory (holding the links), never itself a symlink into /opt/node-tools.
try { if (lstatSync(NM).isSymbolicLink()) { unlinkSync(NM); console.warn('dev-setup: replaced the site/node_modules symlink with a real directory'); } } catch {}
mkdirSync(NM, { recursive: true });
try { execFileSync('git', ['check-ignore', '-q', NM], { cwd: SITE }); } catch { console.error('dev-setup: site/node_modules is not git-ignored (add node_modules/ to .gitignore)'); process.exit(1); }
let made = 0;
for (const p of ['playwright', 'playwright-core', '@types/node']) {
  const to = join(SITE, 'node_modules', p); const from = join(SRC, p);
  if (!existsSync(from)) { console.error(`dev-setup: ${from} not found`); process.exit(1); }
  let present = false; try { lstatSync(to); present = true; } catch {}
  if (present) continue;
  mkdirSync(dirname(to), { recursive: true });
  symlinkSync(from, to, 'dir'); made++;
}
if (process.argv.includes('--devtools')) console.warn('dev-setup: --devtools (lighthouse, axe-core) arrives with w1/build');
console.log(`dev-setup: ${made} link(s) created in site/node_modules`);
