// @ts-check
/**
 * Shared helpers for the quality tools (CONTRACT §14, §17).
 *
 * Conventions every site/tools/check-*.mjs follows:
 *   - a literal top-level `export const RULES = ['rule-id', …]` (tools/trace.mjs reads it statically, never imports);
 *   - failures are reported as { rule, path, message } through report(tool, failures), which applies the baseline;
 *   - `export default <boolean>` for check-all, and process.exit only when run directly.
 *
 * Baselines (CONTRACT §17): .orchestra/baselines/<tool>.json = { tool, writtenAt, entries: [{ rule, path }] }, resolved
 * from the repository root, applied automatically when it exists. A listed failure is reported as baselined and does
 * not fail; any other failure fails; a listed entry that no longer fails is reported as stale.
 *   --no-baseline       ignore baselines (W4 evidence, W5 release gate)
 *   --write-baseline    integrator only: write the current failures as the baseline (with --baseline-at=<wave>/<merge>)
 *   --prune-baseline    integrator only: drop stale entries, never add
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** site/ */
export const SITE = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
/** Repository root (baselines and netlify.toml live here). */
export const REPO = resolve(SITE, '..');
/** Built site directory: SITE_DIST when set (CONTRACT §14), else site/dist. */
export const DIST = process.env.SITE_DIST ? resolve(process.env.SITE_DIST) : join(SITE, 'dist');

/** @param {string} [ext] */
export function files(ext = '.html') {
  return readdirSync(DIST, { recursive: true }).map(String).filter((f) => f.endsWith(ext) && statSync(join(DIST, f)).isFile() && !f.startsWith('admin/'));
}
/** @param {string} f */
export const read = (f) => readFileSync(join(DIST, f), 'utf8');

/** @typedef {{ rule: string, path: string, message: string }} Failure */
/** @typedef {{ tool: string, writtenAt: string, entries: { rule: string, path: string }[] }} Baseline */

const flag = (/** @type {string} */ k) => process.argv.includes(`--${k}`);
const opt = (/** @type {string} */ k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);

/** File name of a tool's baseline. @param {string} tool */
export const baselinePath = (tool) => join(REPO, '.orchestra', 'baselines', `${tool.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')}.json`);

/** @param {string} tool @returns {Baseline|null} */
export function loadBaseline(tool) {
  const f = baselinePath(tool);
  if (!existsSync(f)) return null;
  const b = JSON.parse(readFileSync(f, 'utf8'));
  if (!Array.isArray(b.entries)) throw new Error(`${f}: "entries" must be an array`);
  return b;
}

/**
 * Normalise a failure. Older tools pass plain strings ("path: message"); they keep working, with rule "unspecified".
 * @param {Failure|string} f
 * @returns {Failure}
 */
export function toFailure(f) {
  if (typeof f !== 'string') return { rule: String(f.rule || 'unspecified'), path: String(f.path || ''), message: String(f.message || '') };
  const m = f.match(/^([\w./@-]+\.(?:html|xml|txt|css|js|mjs|json|svg)|_redirects|_headers): (.*)$/s);
  return m ? { rule: 'unspecified', path: m[1], message: m[2] } : { rule: 'unspecified', path: '', message: f };
}

const key = (/** @type {{ rule: string, path: string }} */ e) => `${e.rule}\u0000${e.path}`;

/**
 * Split failures against a baseline (pure; used by report() and the unit tests).
 * @param {Failure[]} failures @param {Baseline|null} baseline
 */
export function applyBaseline(failures, baseline) {
  const listed = new Set((baseline?.entries || []).map(key));
  const failing = new Set(failures.map(key));
  return {
    fresh: failures.filter((f) => !listed.has(key(f))),
    baselined: failures.filter((f) => listed.has(key(f))),
    stale: (baseline?.entries || []).filter((e) => !failing.has(key(e))),
  };
}

/**
 * Print a tool's result and return whether it passed.
 * @param {string} tool tool id, e.g. "budgets" (also the baseline file name)
 * @param {(Failure|string)[]} list
 * @returns {boolean}
 */
export function report(tool, list) {
  const failures = list.map(toFailure);
  if (flag('write-baseline') || flag('prune-baseline')) {
    const f = baselinePath(tool);
    const old = loadBaseline(tool);
    const entries = flag('write-baseline')
      ? failures.map((x) => ({ rule: x.rule, path: x.path }))
      : applyBaseline(failures, old).baselined.map((x) => ({ rule: x.rule, path: x.path }));
    const uniq = [...new Map(entries.map((e) => [key(e), e])).values()].sort((a, b) => key(a).localeCompare(key(b)));
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, `${JSON.stringify({ tool, writtenAt: opt('baseline-at') || old?.writtenAt || 'manual', entries: uniq }, null, 2)}\n`);
    console.log(`• ${tool}: baseline ${flag('write-baseline') ? 'written' : 'pruned'} (${uniq.length} entr${uniq.length === 1 ? 'y' : 'ies'}) → ${f}`);
    return true;
  }
  const baseline = flag('no-baseline') ? null : loadBaseline(tool);
  const { fresh, baselined, stale } = applyBaseline(failures, baseline);
  const line = (/** @type {Failure} */ f) => `  - ${f.rule !== 'unspecified' ? `[${f.rule}] ` : ''}${f.path ? `${f.path}: ` : ''}${f.message}`;
  const extra = baselined.length ? ` (${baselined.length} baselined)` : '';
  if (fresh.length) console.error(`✗ ${tool}: ${fresh.length} problem(s)${extra}\n${fresh.slice(0, 50).map(line).join('\n')}${fresh.length > 50 ? `\n  … and ${fresh.length - 50} more` : ''}`);
  else console.log(`✓ ${tool}${extra}`);
  if (stale.length) console.warn(`  ${tool}: ${stale.length} stale baseline entr${stale.length === 1 ? 'y' : 'ies'} (no longer failing; the integrator prunes them): ${stale.slice(0, 5).map((e) => `${e.rule} ${e.path}`).join(', ')}${stale.length > 5 ? ', …' : ''}`);
  return fresh.length === 0;
}
