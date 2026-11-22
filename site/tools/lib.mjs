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
 *   --all               print every failure (default: the first 50)
 * Hard rules: a tool passes report(tool, failures, { hard: [...] }) for the rule ids that enforce a CONTRACT §2 hard rule
 * (a "Blocker", §16). They are never baselined: --write-baseline and --prune-baseline leave them out and fail while one
 * fails (fix it first), and an entry for one in a baseline file is ignored, so a breach always fails the gate.
 * Tools whose failures depend on the build flavour (budgets: image-widths online, third-party-origins offline) are
 * baselined over both builds:
 *   write:  run offline with --write-baseline, then online with --write-baseline --baseline-merge (union of both).
 *   prune:  run each build with --prune-baseline and BASELINE_LEDGER=<dir> (nothing is rewritten; each run records the
 *           listed entries that still fail), then `node tools/lib.mjs --apply-ledger=<dir>` keeps every entry that
 *           still failed in at least one run and drops the rest.
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
 * Split failures against a baseline (pure; used by report() and the unit tests). Entries for a hard rule id are
 * ignored (returned as `ignored`): a hard-rule failure is always fresh.
 * @param {Failure[]} failures @param {Baseline|null} baseline @param {Iterable<string>} [hard] rule ids never baselined
 */
export function applyBaseline(failures, baseline, hard = []) {
  const never = new Set(hard);
  const entries = (baseline?.entries || []).filter((e) => !never.has(e.rule));
  const listed = new Set(entries.map(key));
  const failing = new Set(failures.map(key));
  return {
    fresh: failures.filter((f) => !listed.has(key(f))),
    baselined: failures.filter((f) => listed.has(key(f))),
    stale: entries.filter((e) => !failing.has(key(e))),
    ignored: (baseline?.entries || []).filter((e) => never.has(e.rule)),
  };
}

/**
 * Print a tool's result and return whether it passed.
 * @param {string} tool tool id, e.g. "budgets" (also the baseline file name)
 * @param {(Failure|string)[]} list
 * @param {{ hard?: string[] }} [o] hard: rule ids that are never baselined (see the header)
 * @returns {boolean}
 */
export function report(tool, list, o = {}) {
  const hard = new Set(o.hard || []);
  const all = list.map(toFailure);
  const line = (/** @type {Failure} */ f) => `  - ${f.rule !== 'unspecified' ? `[${f.rule}] ` : ''}${f.path ? `${f.path}: ` : ''}${f.message}`;
  const cap = flag('all') ? Infinity : 50;
  if (flag('write-baseline') || flag('prune-baseline')) {
    // A hard-rule failure is never written: the baseline gets the other failures and the run fails, naming the breach.
    const breaches = all.filter((x) => hard.has(x.rule));
    const failures = all.filter((x) => !hard.has(x.rule));
    const refuse = () => {
      if (!breaches.length) return true;
      console.error(`✗ ${tool}: ${breaches.length} hard-rule failure(s) not baselined (CONTRACT §2, §16 Blocker: fix them, then write the baseline again)\n${breaches.slice(0, cap).map(line).join('\n')}`);
      return false;
    };
    const f = baselinePath(tool);
    const old = loadBaseline(tool);
    const ledger = process.env.BASELINE_LEDGER;
    if (flag('prune-baseline') && ledger) {
      // Record, do not rewrite: --apply-ledger prunes once every build has been seen.
      const lf = join(resolve(ledger), `${tool.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')}.json`);
      const seen = existsSync(lf) ? JSON.parse(readFileSync(lf, 'utf8')) : { tool, file: f, keys: [] };
      seen.keys = [...new Set([...seen.keys, ...applyBaseline(failures, old).baselined.map(key)])];
      mkdirSync(dirname(lf), { recursive: true });
      writeFileSync(lf, `${JSON.stringify(seen)}\n`);
      console.log(`• ${tool}: ${seen.keys.length} still-failing baseline entr${seen.keys.length === 1 ? 'y' : 'ies'} recorded in ${lf}`);
      return refuse();
    }
    const entries = (flag('write-baseline')
      ? [...failures.map((x) => ({ rule: x.rule, path: x.path })), ...(flag('baseline-merge') ? old?.entries || [] : [])]
      : applyBaseline(failures, old, hard).baselined.map((x) => ({ rule: x.rule, path: x.path }))).filter((e) => !hard.has(e.rule));
    const uniq = [...new Map(entries.map((e) => [key(e), e])).values()].sort((a, b) => key(a).localeCompare(key(b)));
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, `${JSON.stringify({ tool, writtenAt: opt('baseline-at') || old?.writtenAt || 'manual', entries: uniq }, null, 2)}\n`);
    console.log(`• ${tool}: baseline ${flag('write-baseline') ? 'written' : 'pruned'} (${uniq.length} entr${uniq.length === 1 ? 'y' : 'ies'}) → ${f}`);
    return refuse();
  }
  const failures = all;
  const baseline = flag('no-baseline') ? null : loadBaseline(tool);
  const { fresh, baselined, stale, ignored } = applyBaseline(failures, baseline, hard);
  const extra = baselined.length ? ` (${baselined.length} baselined)` : '';
  if (ignored.length) console.warn(`  ${tool}: ${ignored.length} baseline entr${ignored.length === 1 ? 'y is' : 'ies are'} for a hard rule and ignored (hard rules are never baselined): ${ignored.slice(0, 5).map((e) => `${e.rule} ${e.path}`).join(', ')}${ignored.length > 5 ? ', …' : ''}`);
  if (fresh.length) console.error(`✗ ${tool}: ${fresh.length} problem(s)${extra}\n${fresh.slice(0, cap).map(line).join('\n')}${fresh.length > cap ? `\n  … and ${fresh.length - cap} more (--all prints every one)` : ''}`);
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

/**
 * Primary targets (CONTRACT §8, C4), run in the page through page.evaluate (self-contained: no closure over this
 * module): the theme and motion toggles ([data-pref]) and the Menu button ([data-nav-toggle]) at least 44 × 44, the
 * sticky bar's actions ([data-action-bar] a, button) at least 44 wide and 48 tall. Returns one line per undersized
 * visible target. Used by a11y.mjs#target-size; here so a unit test can run it on a fixture.
 * @returns {string[]}
 */
export const primaryTargets = () => {
  const out = [];
  const visible = (/** @type {Element} */ el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const name = (/** @type {Element} */ el) => `${el.tagName.toLowerCase()}${el.getAttribute('data-pref') ? `[data-pref=${el.getAttribute('data-pref')}]` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : ''} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`;
  const check = (/** @type {string} */ sel, /** @type {number} */ minW, /** @type {number} */ minH) => {
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width + 0.5 < minW || r.height + 0.5 < minH) out.push(`${name(el)} is ${Math.round(r.width)}×${Math.round(r.height)} (needs ${minW}×${minH})`);
    }
  };
  check('[data-pref]', 44, 44);
  check('[data-nav-toggle]', 44, 44);
  check('[data-action-bar] a, [data-action-bar] button', 44, 48);
  return out;
};

/**
 * Text contrast where the background is a known colour, run in the page through page.evaluate (self-contained, like
 * primaryTargets; used by measure.mjs#audit-report). For each visible element with its own text, the background is the
 * first ancestor colour with alpha >= 0.99, with every translucent ancestor colour between them composited over it
 * (a tint or a glass panel on a solid section). The text is skipped (counted in `skipped`, left to text-over-media's
 * pixel method) when something else may paint under it: an ancestor background image, an ancestor ::before/::after
 * that paints most of its box, or an img, picture, svg, canvas, video or iframe (or a painted element that is not an
 * ancestor) over part of the text box. Media are found geometrically, so `pointer-events: none` art counts too, and
 * other painted layers in the hit-test stack at the text's centre.
 * @returns {{ textElements: number, minRatio: number|null, minAt: string, under45: number, skipped: number }}
 */
export const textContrast = () => {
  const lin = (/** @type {number} */ v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = (/** @type {number[]} */ c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const rgba = (/** @type {string} */ s) => { const n = (s.match(/[\d.]+/g) || []).map(Number); return [n[0] || 0, n[1] || 0, n[2] || 0, n[3] === undefined ? 1 : n[3]]; };
  const over = (/** @type {number[]} */ top, /** @type {number[]} */ under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3]));
  const paints = (/** @type {CSSStyleDeclaration} */ s) => s.backgroundImage !== 'none' || rgba(s.backgroundColor)[3] > 0;
  /** A ::before/::after that paints at least half of its element's box (an overlay, not an accent line). */
  const pseudoCovers = (/** @type {Element} */ e) => {
    const r = e.getBoundingClientRect();
    return ['::before', '::after'].some((p) => {
      const s = getComputedStyle(e, p);
      if (s.content === 'none' || s.content === 'normal' || s.display === 'none' || !paints(s)) return false;
      const w = parseFloat(s.width), h = parseFloat(s.height);
      return !(w >= 0 && h >= 0) || w * h >= 0.5 * r.width * r.height;
    });
  };
  const MEDIA = 'img, picture, svg, canvas, video, iframe, object, embed';
  const shown = (/** @type {Element} */ e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0 && r.width > 0 && r.height > 0; };
  const media = [...document.querySelectorAll(MEDIA)].filter(shown);
  const overlap = (/** @type {DOMRect} */ a, /** @type {DOMRect} */ b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const range = document.createRange();
  let minRatio = Infinity, low = 0, textEls = 0, skipped = 0, minAt = '';
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg, [aria-hidden="true"]')) continue;
    const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent?.trim());
    if (!texts.length) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    // The box of the element's own text (not its children), so an icon beside the text is not "under" it.
    const boxes = texts.map((n) => { range.selectNodeContents(n); return range.getBoundingClientRect(); }).filter((r) => r.width && r.height);
    if (!boxes.length) continue;
    const left = Math.min(...boxes.map((r) => r.left)), top = Math.min(...boxes.map((r) => r.top));
    const tr = new DOMRect(left, top, Math.max(...boxes.map((r) => r.right)) - left, Math.max(...boxes.map((r) => r.bottom)) - top);
    /** @type {number[]|null} */ let bg = null;
    /** @type {Element|null} */ let opaque = null;
    /** @type {number[][]} */ const layers = [];
    let unknown = false;
    for (let e = /** @type {Element|null} */ (el); e; e = e.parentElement) {
      const es = getComputedStyle(e);
      if (es.backgroundImage !== 'none' || (e !== el && pseudoCovers(e))) { unknown = true; break; }
      const c = rgba(es.backgroundColor);
      if (c[3] >= 0.99) { bg = c; opaque = e; break; }
      if (c[3] > 0) layers.push(c);
    }
    const ancestors = new Set();
    for (let e = /** @type {Element|null} */ (el); e && e !== opaque; e = e.parentElement) ancestors.add(e);
    const foreign = (/** @type {Element} */ e) => !ancestors.has(e) && e !== opaque && !el.contains(e) && !e.contains(el);
    if (!unknown && bg) unknown = media.some((m) => foreign(m) && overlap(m.getBoundingClientRect(), tr) > 0.1 * tr.width * tr.height);
    if (!unknown && bg) {
      const cx = tr.left + tr.width / 2, cy = tr.top + tr.height / 2;
      if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) {
        for (const e of document.elementsFromPoint(cx, cy)) {
          if (e === opaque) break;
          if (foreign(e) && (e.matches(MEDIA) || paints(getComputedStyle(e)) || pseudoCovers(e))) { unknown = true; break; }
        }
      }
    }
    if (!bg || unknown) { skipped++; continue; }
    for (const c of layers.reverse()) bg = [...over(c, bg), 1];
    const fg = rgba(s.color);
    const mix = over(fg, bg);
    const ratio = (Math.max(L(mix), L(bg)) + 0.05) / (Math.min(L(mix), L(bg)) + 0.05);
    textEls++;
    if (ratio < 4.5) low++;
    if (ratio < minRatio) { minRatio = ratio; minAt = `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/)[0]}` : ''}`; }
  }
  return { textElements: textEls, minRatio: Number.isFinite(minRatio) ? Number(minRatio.toFixed(2)) : null, minAt, under45: low, skipped };
};

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

/**
 * `node tools/lib.mjs --apply-ledger=<dir>`: prune each baseline recorded in the ledger to the entries that still failed
 * in at least one --prune-baseline run (see the header).
 */
if (import.meta.url === `file://${process.argv[1]}` && opt('apply-ledger')) {
  const dir = resolve(/** @type {string} */ (opt('apply-ledger')));
  for (const lf of existsSync(dir) ? readdirSync(dir).filter((x) => x.endsWith('.json')) : []) {
    const { tool, file, keys } = JSON.parse(readFileSync(join(dir, lf), 'utf8'));
    if (!existsSync(file)) continue;
    const b = JSON.parse(readFileSync(file, 'utf8'));
    const keep = new Set(keys);
    const before = b.entries.length;
    b.entries = b.entries.filter((/** @type {{ rule: string, path: string }} */ e) => keep.has(key(e)));
    writeFileSync(file, `${JSON.stringify(b, null, 2)}\n`);
    console.log(`• ${tool}: baseline pruned ${before} → ${b.entries.length} entr${b.entries.length === 1 ? 'y' : 'ies'} (${file})`);
  }
}
