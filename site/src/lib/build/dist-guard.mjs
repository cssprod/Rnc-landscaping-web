// @ts-check
/**
 * Output-directory guard (CONTRACT §14). The build deletes its output directory before writing, so it must never
 * delete anything that is not a build: it clears a directory only when it is empty or carries the `.rnc-dist` marker,
 * and it writes the marker on every build.
 *
 *   prepareDist(dir) → { dir, legacy }   throws DistGuardError for a directory it must not touch
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, parse } from 'node:path';

export const MARKER = '.rnc-dist';

export class DistGuardError extends Error {}

/**
 * A pre-marker build of this site (site/dist written before the marker existed): it has the build's own fingerprint,
 * sitemap.xml + robots.txt + assets/build/. Accepted once with a warning so old checkouts keep building; the marker is
 * written from then on.
 * @param {string} dir
 */
function looksLikeOldBuild(dir) {
  try {
    return ['sitemap.xml', 'robots.txt', 'index.html'].every((f) => statSync(join(dir, f)).isFile()) && statSync(join(dir, 'assets', 'build')).isDirectory();
  } catch { return false; }
}

/**
 * Empty (or create) `dir` for a fresh build and write the marker.
 * @param {string} target
 * @returns {{ dir: string, legacy: boolean }}
 */
export function prepareDist(target) {
  const dir = resolve(target);
  if (dir === parse(dir).root) throw new DistGuardError(`refusing to use the filesystem root as the output directory`);
  let legacy = false;
  if (existsSync(dir)) {
    const st = lstatSync(dir);
    if (st.isSymbolicLink()) throw new DistGuardError(`refusing to delete ${dir}: it is a symbolic link`);
    if (!st.isDirectory()) throw new DistGuardError(`refusing to delete ${dir}: it is not a directory`);
    const entries = readdirSync(dir);
    if (entries.length && !entries.includes(MARKER)) {
      if (!looksLikeOldBuild(dir)) throw new DistGuardError(`refusing to delete ${dir}: it is not empty and has no ${MARKER} marker, so it is not a build output directory. Choose another --out, or empty it yourself.`);
      legacy = true;
    }
    // Clear the contents, keep the directory itself (another process may hold it open as its cwd).
    for (const e of entries) rmSync(join(dir, e), { recursive: true, force: true });
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, MARKER), 'RNC Landscaping build output (site/build.mjs). The build empties and rewrites this directory.\n');
  return { dir, legacy };
}
