// @ts-check
/**
 * Sitemap <lastmod> from git (CONTRACT §14): the latest commit date of a route's `sources` (repo-relative files or
 * directories). One `git log` pass builds a path → date index, so the cost does not grow with the number of routes.
 *
 * Fallback: the build date, when git is missing, the checkout is shallow (history is cut, so dates would be wrong),
 * a source has no commit yet, or the route declares no sources. The caller prints one warning per reason, not per route.
 *
 *   const lm = gitLastmod(repoRoot);
 *   lm.dateFor(['content/areas/oak-bay.json', 'site/src/pages/areas.mjs']) → '2026-11-19' | null
 *   lm.reason → null | 'no-git' | 'shallow'
 */
import { execFileSync } from 'node:child_process';

/** @param {string} root @param {string[]} args */
const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'ignore'] });

/**
 * @param {string} root repository root
 * @returns {{ reason: null|'no-git'|'shallow', dateFor: (sources: string[]|undefined) => string|null }}
 */
export function gitLastmod(root) {
  /** @type {null|'no-git'|'shallow'} */
  let reason = null;
  /** @type {Map<string, string>} path → ISO date (YYYY-MM-DD) of its latest commit */
  const latest = new Map();
  try {
    if (git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true') reason = 'shallow';
    else {
      // Newest first: the first time a path appears is its latest commit. %cs = committer date, short (YYYY-MM-DD).
      const out = git(root, ['log', '--format=%x00%cs', '--name-only', '--no-renames', '--', '.']);
      for (const chunk of out.split('\0')) {
        if (!chunk.trim()) continue;
        const [date, ...names] = chunk.split('\n');
        for (const n of names) if (n && !latest.has(n)) latest.set(n, date.trim());
      }
    }
  } catch { reason = 'no-git'; }

  /** Directory sources: the newest date of any file under them (computed once per directory). @type {Map<string, string|null>} */
  const dirCache = new Map();
  /** @param {string} p */
  const dateOf = (p) => {
    const clean = p.replace(/^\.\//, '').replace(/\/+$/, '');
    const exact = latest.get(clean);
    if (exact) return exact;
    if (dirCache.has(clean)) return dirCache.get(clean) ?? null;
    let best = null;
    const prefix = `${clean}/`;
    for (const [f, d] of latest) if (f.startsWith(prefix) && (!best || d > best)) best = d;
    dirCache.set(clean, best);
    return best;
  };
  return {
    reason,
    dateFor(sources) {
      if (reason || !sources || !sources.length) return null;
      let best = null;
      for (const s of sources) { const d = dateOf(s); if (d && (!best || d > best)) best = d; }
      return best;
    },
  };
}
