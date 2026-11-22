#!/usr/bin/env node
// @ts-check
/**
 * Local tool links (untracked; site/node_modules/ is git-ignored).
 *   node tools/dev-setup.mjs              symlink site/node_modules/{playwright,playwright-core,@types/node} from
 *                                         $NODE_TOOLS (default /opt/node-tools/node_modules)
 *   node tools/dev-setup.mjs --devtools[=DIR]
 *                                         also install lighthouse@12, axe-core@4 and sharp@0.33 (the photo pipeline's
 *                                         converter, unit/living-images.test#pipeline) into DIR (default
 *                                         $SCRATCH/devtools, else <tmp>/rnc-devtools), outside the repository; prints
 *                                         the path to use. An existing install is reused only if every package imports
 *                                         (a half-written one is reinstalled), and installs into a shared DIR are
 *                                         serialised by a lock directory, so parallel worktrees cannot corrupt it.
 *   node tools/dev-setup.mjs --check      exit 1 unless the links resolve (no changes)
 */
import { existsSync, lstatSync, mkdirSync, readlinkSync, rmSync, statSync, symlinkSync, unlinkSync } from 'node:fs';
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
// The links must never be committable. Outside a git work tree (a git-archive copy, say) there is nothing to commit
// them into, so warn and go on; inside one, `git check-ignore` exits 1 for "not ignored" and 128 for a real error.
let inWorkTree = false;
try { inWorkTree = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: SITE, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim() === 'true'; } catch {}
if (!inWorkTree) console.warn('dev-setup: not inside a git work tree, so the git-ignore check is skipped; creating the links anyway');
else {
  try { execFileSync('git', ['check-ignore', '-q', NM], { cwd: SITE, stdio: 'ignore' }); } catch (e) {
    const status = /** @type {{ status?: number }} */ (e).status;
    console.error(status === 1 ? 'dev-setup: site/node_modules is not git-ignored (add node_modules/ to .gitignore)' : `dev-setup: git check-ignore failed (exit ${status ?? '?'}); cannot confirm site/node_modules is git-ignored`);
    process.exit(1);
  }
}
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
  const pkgs = ['lighthouse@12', 'axe-core@4', 'sharp@0.33'];
  const names = pkgs.map((p) => p.replace(/@[^@/]*$/, ''));
  // Every package must import from DIR (a package.json alone does not prove the files under it were written).
  const works = () => names.every((n) => existsSync(join(dir, 'node_modules', n, 'package.json'))) && (() => {
    try { execFileSync(process.execPath, ['--input-type=module', '-e', names.map((n) => `await import(${JSON.stringify(n)});`).join('')], { cwd: dir, stdio: 'ignore', timeout: 120000 }); return true; } catch { return false; }
  })();
  if (!works()) {
    const lock = join(dir, '.dev-setup.lock');
    const sleep = (/** @type {number} */ ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    for (let waited = 0; ; waited += 2000) {
      try { mkdirSync(lock); break; } catch {
        // Another worktree is installing: wait for it (a lock older than 10 minutes is a crashed install).
        try { if (Date.now() - statSync(lock).mtimeMs > 600000) { rmSync(lock, { recursive: true, force: true }); continue; } } catch { continue; }
        if (waited === 0) console.log(`dev-setup: waiting for another install into ${dir}`);
        sleep(2000);
      }
    }
    try {
      if (!works()) {
        // A half-written tree is not repaired by npm in place: start it again.
        if (existsSync(join(dir, 'node_modules'))) { console.warn(`dev-setup: ${dir}/node_modules is incomplete; reinstalling`); rmSync(join(dir, 'node_modules'), { recursive: true, force: true }); rmSync(join(dir, 'package-lock.json'), { force: true }); }
        execFileSync('npm', ['install', '--prefix', dir, '--no-save', '--no-audit', '--no-fund', '--loglevel=error', ...pkgs], { stdio: 'inherit' });
        if (!works()) { console.error(`dev-setup: ${pkgs.join(', ')} installed into ${dir} but do not import`); process.exit(1); }
      }
    } finally { rmSync(lock, { recursive: true, force: true }); }
  }
  console.log(`dev-setup: devtools in ${dir}/node_modules (lighthouse: ${join(dir, 'node_modules/.bin/lighthouse')}, axe-core: ${join(dir, 'node_modules/axe-core/axe.min.js')}, sharp: RNC_SHARP_DIR=${dir})`);
}
