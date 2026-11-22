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
 * from the repository root (or from $BASELINE_DIR, for a reviewer's scratch ratchet), applied automatically when it exists. A listed failure is reported as baselined and does
 * not fail; any other failure fails; a listed entry that no longer fails is reported as stale.
 *   --no-baseline       ignore baselines (W4 evidence, W5 release gate)
 *   --write-baseline    integrator only: write the current failures as the baseline (with --baseline-at=<wave>/<merge>)
 *   --prune-baseline    integrator only: drop stale entries, never add
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

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
export const baselinePath = (tool) => join(process.env.BASELINE_DIR ? resolve(process.env.BASELINE_DIR) : join(REPO, '.orchestra', 'baselines'), `${tool.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')}.json`);

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

/* ------------------------------------------------------------------ shared by the browser and repository tools */

/** `--k=v` from argv. @param {string} k @param {string[]} [argv] */
export const argOpt = (k, argv = process.argv) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
/** `--k` present. @param {string} k @param {string[]} [argv] */
export const argFlag = (k, argv = process.argv) => argv.includes(`--${k}`);
/** `--k=a,b` as a list, else the default. @param {string} k @param {string[]} def */
export const argList = (k, def) => (argOpt(k)?.split(',').map((x) => x.trim()).filter(Boolean)) || def;

/** dist-relative page file → URL path ("areas/oak-bay/index.html" → "/areas/oak-bay/"). @param {string} f */
export const urlOf = (f) => (f === 'index.html' ? '/' : f.endsWith('/index.html') ? `/${f.slice(0, -'index.html'.length)}` : `/${f}`);
/** URL path → dist-relative page file ("/areas/oak-bay/" → "areas/oak-bay/index.html"). Baselines key on this. @param {string} u */
export const fileOfUrl = (u) => { const p = u.split(/[?#]/)[0].replace(/^\/+/, ''); return !p ? 'index.html' : p.endsWith('/') ? `${p}index.html` : p; };

/** Every built page URL, sorted (the index.html pages plus 404.html). */
export function pageUrls() {
  if (!existsSync(DIST)) return [];
  return files().filter((f) => f.endsWith('index.html') || f === '404.html').map(urlOf).sort();
}

/**
 * One page per template (CONTRACT §5 URL map), for the browser matrix tools. Pages missing from the build are skipped,
 * so a tool run on an older build still works. --pages=all (every built page) or --pages=/a/,/b/ overrides it.
 */
export const TEMPLATE_PAGES = ['/', '/services/', '/services/irrigation/', '/commercial/', '/areas/', '/areas/oak-bay/', '/projects/',
  '/projects/oak-bay-front-garden-renewal/', '/process/', '/about/', '/faq/', '/reviews/', '/contact/', '/resources/',
  '/resources/irrigation-start-up-and-winterization/', '/privacy/', '/accessibility/', '/free-quote/', '/404.html', '/styleguide/'];

/** The page list a browser tool runs on: --pages=all | --pages=/a/,/b/ | the built TEMPLATE_PAGES. */
export function selectPages() {
  const built = pageUrls();
  const want = argOpt('pages');
  if (want === 'all') return built;
  if (want) return want.split(',').map((x) => x.trim()).filter(Boolean);
  const resources = built.filter((u) => /^\/resources\/[^/]+\/$/.test(u));
  return TEMPLATE_PAGES.map((u) => (u.startsWith('/resources/') && u !== '/resources/' && !built.includes(u) ? resources[0] : u))
    .filter((u, i, a) => u && built.includes(u) && a.indexOf(u) === i);
}

/**
 * A dev tool installed by `node tools/dev-setup.mjs --devtools` (lighthouse, axe-core), found in order: $<NAME>_PATH,
 * --devtools=DIR, $SCRATCH/devtools, <tmp>/rnc-devtools, site/node_modules (CI installs there with npm --no-save).
 * @param {string} pkg package name, e.g. "axe-core" @param {string} [file] a file inside it, e.g. "axe.min.js"
 * @returns {string|null} absolute path of the package directory (or of file inside it)
 */
export function devtool(pkg, file = '') {
  const env = process.env[`${pkg.replace(/[^a-z0-9]/gi, '_').toUpperCase()}_PATH`];
  const dirs = [argOpt('devtools'), process.env.SCRATCH && join(process.env.SCRATCH, 'devtools'), join(tmpdir(), 'rnc-devtools')].filter(Boolean).map((d) => join(/** @type {string} */ (d), 'node_modules'));
  const cands = [...(env ? [env] : []), ...dirs.map((d) => join(d, pkg)), join(SITE, 'node_modules', pkg)];
  for (const c of cands) { const f = file ? join(c, file) : join(c, 'package.json'); if (existsSync(f)) return file ? f : c; }
  return null;
}

/**
 * Serve DIST like Netlify (tools/serve.mjs: _redirects, _headers, the netlify.toml CSP) on PORT (default `fallback`; 0 = any).
 * @param {number} [fallback] @returns {Promise<{ origin: string, port: number, close: () => void }>}
 */
export async function serveDist(fallback = 0) {
  const { createSiteServer } = await import('./serve.mjs');
  const server = createSiteServer({ dist: DIST });
  const want = Number(process.env.PORT || fallback);
  const port = await new Promise((res, rej) => { server.once('error', rej); server.listen(want, () => res(/** @type {import('node:net').AddressInfo} */ (server.address()).port)); });
  return { origin: `http://localhost:${port}`, port, close: () => server.close() };
}

/** Playwright Chromium ($CHROME overrides). Imported lazily so the check-* tools never need Playwright. */
export async function launchChromium() {
  const { chromium } = await import('playwright');
  return chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
}

/**
 * A browser context in a given state: theme (stored "rnc-theme"; dark is also the no-choice default), motion
 * ("on"/"off" stored, "auto" = no stored choice) and the OS reduced-motion setting. External requests are aborted, so
 * offline builds measure only themselves.
 * @param {import('playwright').Browser} browser
 * @param {{ width: number, height?: number, theme?: 'dark'|'light'|'none', motion?: 'on'|'off'|'auto', reducedMotion?: 'reduce'|'no-preference', bypassCSP?: boolean, deviceScaleFactor?: number, blockExternal?: boolean }} o
 */
export async function stateContext(browser, o) {
  const ctx = await browser.newContext({
    viewport: { width: o.width, height: o.height || (o.width < 600 ? 844 : 900) }, deviceScaleFactor: o.deviceScaleFactor || 1,
    reducedMotion: o.reducedMotion || (o.motion === 'off' ? 'reduce' : 'no-preference'), bypassCSP: !!o.bypassCSP,
  });
  const theme = o.theme || 'dark';
  const motion = o.motion || 'auto';
  await ctx.addInitScript(([t, m]) => {
    try {
      if (t === 'dark' || t === 'light') localStorage.setItem('rnc-theme', t); else localStorage.removeItem('rnc-theme');
      if (m === 'on' || m === 'off') localStorage.setItem('rnc-motion', m); else localStorage.removeItem('rnc-motion');
    } catch { /* storage blocked: the defaults apply */ }
  }, [theme, motion]);
  if (o.blockExternal !== false) await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  return ctx;
}

/** WCAG relative luminance and contrast. @param {number[]} rgb 0–255 */
export function luminance([r, g, b]) {
  const lin = (/** @type {number} */ v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
/** @param {number} la @param {number} lb */
export const contrastOf = (la, lb) => (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);

/** Median of numbers (the lower middle for an even count, so it is always a measured value). @param {number[]} xs */
export const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };

/** Write a JSON report (creating its folder). @param {string} file @param {unknown} data */
export function writeJson(file, data) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`); }
