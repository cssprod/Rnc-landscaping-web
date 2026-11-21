#!/usr/bin/env node
// @ts-check
/**
 * Local tool links (untracked; site/node_modules/ is git-ignored).
 *   node tools/dev-setup.mjs              symlink site/node_modules/{playwright,playwright-core,@types/node} from
 *                                         $NODE_TOOLS (default /opt/node-tools/node_modules)
 *   node tools/dev-setup.mjs --devtools[=DIR]
 *                                         also install lighthouse@12 and axe-core@4 into DIR (default $SCRATCH/devtools,
 *                                         else <tmp>/rnc-devtools), outside the repository; prints the path to use
 *   node tools/dev-setup.mjs --check      exit 1 unless the links resolve (no changes)
 */
import { existsSync, lstatSync, mkdirSync, readlinkSync, symlinkSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('..', import.meta.url));
const SRC = process.env.NODE_TOOLS || '/opt/node-tools/node_modules';
const NM = join(SITE, 'node_modules');
const LINKS = ['playwright', 'playwright-core', '@types/node'];
const argv = process.argv.slice(2);
const checkOnly = argv.includes('--check');

if (checkOnly) {
  const bad = LINKS.filter((p) => !existsSync(join(NM, p, 'package.json')));
  console.log(bad.length ? `dev-setup: missing ${bad.join(', ')} (run node tools/dev-setup.mjs)` : 'dev-setup: links OK');
  process.exit(bad.length ? 1 : 0);
}

// site/node_modules must be a real directory (holding the links), never itself a symlink into /opt/node-tools.
try { if (lstatSync(NM).isSymbolicLink()) { unlinkSync(NM); console.warn('dev-setup: replaced the site/node_modules symlink with a real directory'); } } catch {}
mkdirSync(NM, { recursive: true });
try { execFileSync('git', ['check-ignore', '-q', NM], { cwd: SITE }); } catch { console.error('dev-setup: site/node_modules is not git-ignored (add node_modules/ to .gitignore)'); process.exit(1); }
let made = 0;
for (const p of LINKS) {
  const to = join(NM, p); const from = join(SRC, p);
  if (!existsSync(from)) { console.error(`dev-setup: ${from} not found (set NODE_TOOLS to a node_modules that has it)`); process.exit(1); }
  let present = false;
  try {
    const st = lstatSync(to);
    present = true;
    // Re-point a dangling or foreign link; leave a real directory (someone's own install) alone.
    if (st.isSymbolicLink() && (!existsSync(to) || resolve(dirname(to), readlinkSync(to)) !== resolve(from))) { unlinkSync(to); present = false; }
  } catch {}
  if (present) continue;
  mkdirSync(dirname(to), { recursive: true });
  symlinkSync(from, to, 'dir'); made++;
}
console.log(`dev-setup: ${made} link(s) created in site/node_modules (${LINKS.join(', ')})`);

const dt = argv.find((a) => a === '--devtools' || a.startsWith('--devtools='));
if (dt) {
  const dir = resolve(dt.includes('=') ? dt.slice(11) : process.env.SCRATCH ? join(process.env.SCRATCH, 'devtools') : join(tmpdir(), 'rnc-devtools'));
  if (dir.startsWith(resolve(SITE, '..') + '/')) { console.error(`dev-setup: --devtools must install outside the repository (got ${dir})`); process.exit(1); }
  mkdirSync(dir, { recursive: true });
  const pkgs = ['lighthouse@12', 'axe-core@4'];
  const have = pkgs.every((p) => existsSync(join(dir, 'node_modules', p.split('@')[0], 'package.json')));
  if (!have) execFileSync('npm', ['install', '--prefix', dir, '--no-save', '--no-audit', '--no-fund', '--loglevel=error', ...pkgs], { stdio: 'inherit' });
  console.log(`dev-setup: devtools in ${dir}/node_modules (lighthouse: ${join(dir, 'node_modules/.bin/lighthouse')}, axe-core: ${join(dir, 'node_modules/axe-core/axe.min.js')})`);
}
