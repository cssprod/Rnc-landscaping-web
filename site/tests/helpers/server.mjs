// @ts-check
/**
 * Shared e2e fixtures. The built site is SITE_DIST (tools/lib.mjs DIST, CONTRACT §14); Playwright serves it on PORT.
 */
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST } from '../../tools/lib.mjs';

export { DIST };

/** Every built page URL ("/", "/about/", …), from the dist folder. */
export function allPages() {
  if (!existsSync(DIST)) return [];
  return readdirSync(DIST, { recursive: true }).map(String)
    .filter((f) => f.endsWith('index.html') && statSync(join(DIST, f)).isFile())
    .map((f) => `/${f.replace(/index\.html$/, '')}`.replace(/\\/g, '/'))
    .sort();
}

/** The dist/_redirects rows: { from, to }. */
export function redirectRows() {
  const f = join(DIST, '_redirects');
  if (!existsSync(f)) return [];
  return readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => { const [from, to] = l.split(/\s+/); return { from, to }; });
}

/** The 13 municipalities and 4 services as content/site.json lists them. */
export function siteFacts() {
  const s = JSON.parse(readFileSync(new URL('../../../content/site.json', import.meta.url), 'utf8'));
  return { municipalities: /** @type {{slug: string, name: string}[]} */ (s.municipalities), services: /** @type {{slug: string, name: string, navLabel: string}[]} */ (s.services) };
}

/** Block every request that leaves localhost (CDN photos), so tests run offline. @param {import('playwright/test').Page} page */
export async function offline(page) {
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
}

/** Console errors and page errors collected while a page is used. @param {import('playwright/test').Page} page */
export function collectErrors(page) {
  /** @type {string[]} */ const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  return errors;
}

/**
 * A browser context in a CONTRACT §8 preference state: a stored theme ("dark" is also the no-choice default) and
 * motion ("on"/"off" stored; "auto" stores nothing and follows the OS setting). External requests are aborted.
 * @param {import('playwright/test').Browser} browser
 * @param {{ theme?: 'dark'|'light', motion?: 'on'|'off'|'auto', width?: number, height?: number, deviceScaleFactor?: number }} [o]
 */
export async function prefContext(browser, o = {}) {
  const theme = o.theme || 'dark';
  const motion = o.motion || 'auto';
  const ctx = await browser.newContext({
    viewport: { width: o.width || 1280, height: o.height || 800 }, deviceScaleFactor: o.deviceScaleFactor || 1,
    colorScheme: theme, reducedMotion: motion === 'off' ? 'reduce' : 'no-preference',
  });
  await ctx.addInitScript(([t, m]) => {
    try {
      localStorage.setItem('rnc-theme', t);
      if (m === 'on' || m === 'off') localStorage.setItem('rnc-motion', m); else localStorage.removeItem('rnc-motion');
    } catch { /* storage blocked: the defaults apply */ }
  }, [theme, motion]);
  await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  return ctx;
}

/**
 * CSP violations, console errors and page errors, each prefixed with the page path. Violations are caught twice: the
 * `securitypolicyviolation` event (recorded by an init script, which CSP does not govern) and Chromium's "Refused to …"
 * console error. Aborted external requests of offline runs ("net::ERR_FAILED") are not errors.
 * @param {import('playwright/test').Page} page
 */
export async function collectProblems(page) {
  /** @type {string[]} */ const problems = [];
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const w = /** @type {any} */ (window);
      (w.__cspViolations ||= []).push(`${e.violatedDirective} blocked ${e.blockedURI || 'inline'}${e.sourceFile ? ` (${e.sourceFile}:${e.lineNumber})` : ''}`);
    });
  });
  const where = () => { try { return new URL(page.url()).pathname; } catch { return page.url(); } };
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource: net::/.test(m.text())) problems.push(`${where()}: console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${where()}: page error: ${e.message}`));
  return {
    problems,
    /** Move the violations recorded on the current document into `problems`. */
    async flush() {
      const v = await page.evaluate(() => /** @type {any} */ (window).__cspViolations || []).catch(() => []);
      for (const x of v) problems.push(`${where()}: CSP violation: ${x}`);
    },
  };
}

/**
 * Horizontal overflow of the current page (WCAG 1.4.10): null when the document is no wider than the viewport,
 * otherwise the scroll width and the widest offending elements that no ancestor clips.
 * @param {import('playwright/test').Page} page
 */
export function overflowOf(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const vw = root.clientWidth;
    if (root.scrollWidth <= vw && document.body.scrollWidth <= vw) return null;
    const culprits = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width || r.right <= vw + 1) continue;
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (/(hidden|auto|scroll|clip)/.test(getComputedStyle(p).overflowX) && p.getBoundingClientRect().right <= vw + 1) { clipped = true; break; }
      }
      if (!clipped) culprits.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList.length ? `.${[...el.classList].join('.')}` : ''} (right edge ${Math.round(r.right)} px)`);
    }
    return { scrollWidth: Math.max(root.scrollWidth, document.body.scrollWidth), viewport: vw, culprits: culprits.slice(0, 3) };
  });
}
