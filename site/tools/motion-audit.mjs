#!/usr/bin/env node
// @ts-check
/**
 * Runtime motion audit (a browser tool, so never named check-*; CONTRACT §2 Motion, §8, §9, §16;
 * .orchestra/direction/motion-policy.md §0, §6). Pages are served like Netlify (tools/serve.mjs, real CSP).
 *
 *   node tools/motion-audit.mjs [--pages=all|/a/,/b/] [--widths=390,1440] [--themes=dark] [--jobs=3] [--json=FILE]
 *
 * Motion states: "reduce" (OS reduced motion, no stored choice), "off" (stored rnc-motion=off) and "on" (stored on,
 * OS no-preference). Rules:
 *   policy-tiers     with reduce and with off, 0 infinite animations run 3 s after load; with on, at most 7 run in the
 *                    first viewport of a page with a living hero and at most 8 in any viewport (checked at 0, 50 % and
 *                    100 % of the page); every infinite animation sits on (or inside) a [data-t2] element and animates
 *                    only transform and opacity (never translate/rotate/scale on an <svg>), and no two animations write
 *                    the same property of one element; nothing animates the H1 (the LCP element) and no [data-reveal]
 *                    is armed in the first viewport; at most 3 backdrop-filter elements per mobile viewport, none over a
 *                    running infinite animation.
 *   vt-and-loader    no loader or splash screen (nothing named loader/preloader/splash, no fixed layer covering half the
 *                    viewport at DOMContentLoaded that is gone by load); internal links navigate natively (no AJAX
 *                    page transitions: no history.pushState on a link click); view transitions honour motion: none
 *                    animates under reduce or off, none lasts over 2 s with motion on, and @view-transition sits only
 *                    inside a (prefers-reduced-motion: no-preference) block.
 *   no-auto-advance  nothing moves on its own: with motion on, between 1 s and 6.5 s after load no scroll position
 *                    changes and no aria-hidden, aria-selected, aria-current, hidden or inert attribute flips without
 *                    input (no auto-advancing carousels or rails).
 * Failures name the page (dist-relative) and the state.
 */
import { argList, argOpt, fileOfUrl, launchChromium, report, selectPages, serveDist, stateContext, writeJson } from './lib.mjs';

export const RULES = ['policy-tiers', 'vt-and-loader', 'no-auto-advance'];

const widths = argList('widths', ['390', '1440']).map(Number);
const themes = /** @type {('dark'|'light')[]} */ (argList('themes', ['dark']));
const jobs = Math.max(1, Number(argOpt('jobs') || 3));
const pages = selectPages();
if (!pages.length) { console.log('motion-audit: no built pages (SITE_DIST); nothing to audit'); process.exit(0); }

/** In-page probe: running infinite animations and their problems, at the current scroll position. */
const probe = () => {
  const vh = innerHeight, vw = innerWidth;
  const inView = (/** @type {Element} */ el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && r.width > 0 && r.height > 0; };
  const label = (/** @type {Element} */ el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : el.getAttribute?.('class') ? `.${String(el.getAttribute('class')).trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
  const OK_PROPS = new Set(['transform', 'opacity', 'offset', 'easing', 'composite', 'computedOffset']);
  const all = document.getAnimations();
  const infinite = all.filter((a) => { const t = a.effect?.getTiming(); return t && t.iterations === Infinity && a.playState === 'running'; });
  const problems = [];
  /** @type {Map<Element, Map<string, number>>} */ const writers = new Map();
  for (const a of all) {
    const eff = /** @type {KeyframeEffect} */ (a.effect);
    const el = eff?.target;
    if (!el || eff.pseudoElement || a.playState !== 'running') continue;
    const props = new Set(eff.getKeyframes().flatMap((k) => Object.keys(k)).filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p)));
    const w = writers.get(el) || writers.set(el, new Map()).get(el);
    for (const p of props) w?.set(p, (w.get(p) || 0) + 1);
    if (eff.getTiming().iterations !== Infinity) continue;
    if (!el.closest('[data-t2]')) problems.push(`infinite animation "${/** @type {any} */ (a).animationName || a.id || 'unnamed'}" on ${label(el)} is not inside a [data-t2] element`);
    for (const p of props) {
      if (!OK_PROPS.has(p) && !(p === 'translate' || p === 'rotate' || p === 'scale')) problems.push(`infinite animation on ${label(el)} animates ${p} (only transform and opacity)`);
      if ((p === 'translate' || p === 'rotate' || p === 'scale') && el instanceof SVGSVGElement) problems.push(`infinite animation on ${label(el)} uses the independent ${p} property on an <svg>`);
    }
  }
  for (const [el, w] of writers) for (const [p, n] of w) if (n > 1) problems.push(`${n} animations write ${p} on ${label(el)}`);
  const running = infinite.filter((a) => { const el = /** @type {KeyframeEffect} */ (a.effect).target; return el && inView(el) && getComputedStyle(el).display !== 'none'; });
  const blur = [...document.querySelectorAll('body *')].filter((el) => { const s = getComputedStyle(el); const v = s.backdropFilter || /** @type {any} */ (s).webkitBackdropFilter; return v && v !== 'none' && inView(el) && s.visibility !== 'hidden'; });
  const rects = running.map((a) => /** @type {Element} */ (/** @type {KeyframeEffect} */ (a.effect).target).getBoundingClientRect());
  const over = blur.filter((el) => { const r = el.getBoundingClientRect(); return rects.some((x) => x.left < r.right && x.right > r.left && x.top < r.bottom && x.bottom > r.top); });
  return { infinite: infinite.length, inView: running.length, names: running.slice(0, 10).map((a) => `${/** @type {any} */ (a).animationName || 'anim'}@${label(/** @type {Element} */ (/** @type {KeyframeEffect} */ (a.effect).target))}`), problems, blur: blur.length, blurOver: over.map(label) };
};

const site = await serveDist(0);
const browser = await launchChromium();
/** @type {Map<string, { rule: string, path: string, message: string, states: Set<string> }>} */
const found = new Map();
const note = (/** @type {string} */ rule, /** @type {string} */ page, /** @type {string} */ message, /** @type {string} */ state) => {
  const k = `${rule}\u0000${page}\u0000${message}`;
  (found.get(k) || found.set(k, { rule, path: fileOfUrl(page), message, states: new Set() }).get(k))?.states.add(state);
};
/** @type {any[]} */ const log = [];

const STATES = /** @type {const} */ ([
  { id: 'reduce', motion: 'auto', reducedMotion: 'reduce' },
  { id: 'off', motion: 'off', reducedMotion: 'no-preference' },
  { id: 'on', motion: 'on', reducedMotion: 'no-preference' },
]);

async function audit(/** @type {{ width: number, theme: 'dark'|'light', state: typeof STATES[number] }} */ c) {
  const ctx = await stateContext(browser, { width: c.width, theme: c.theme, motion: c.state.motion, reducedMotion: c.state.reducedMotion });
  await ctx.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__pushState = 0; const ps = history.pushState.bind(history); history.pushState = (...a) => { w.__pushState++; return ps(...a); };
    w.__flips = []; w.__scrolls = null;
    document.addEventListener('DOMContentLoaded', () => {
      const vw = innerWidth, vh = innerHeight;
      w.__cover = [...document.querySelectorAll('body *')].filter((el) => { const s = getComputedStyle(el); if (!/fixed|absolute/.test(s.position) || s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false; const r = el.getBoundingClientRect(); return r.width * r.height > 0.5 * vw * vh && el.closest('header, nav, dialog, [data-action-bar]') === null; }).map((el) => ({ tag: el.tagName.toLowerCase(), cls: String(el.getAttribute('class') || ''), id: el.id }));
    });
  });
  const page = await ctx.newPage();
  const state = `${c.theme} ${c.width}px motion ${c.state.id}`;
  for (const p of pages) {
    try {
      await page.goto(`${site.origin}${p}`, { waitUntil: 'load' });
      /* vt-and-loader: loader / splash */
      const loader = await page.evaluate(() => {
        const named = [...document.querySelectorAll('[class*=loader i], [id*=loader i], [class*=preloader i], [class*=splash i], [id*=splash i], [class*=spinner i]')].map((el) => `${el.tagName.toLowerCase()}.${el.getAttribute('class') || el.id}`);
        const w = /** @type {any} */ (window);
        const gone = (w.__cover || []).filter((/** @type {any} */ x) => { const el = x.id ? document.getElementById(x.id) : [...document.getElementsByTagName(x.tag)].find((e) => String(e.getAttribute('class') || '') === x.cls); if (!el) return true; const s = getComputedStyle(el); return s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0; });
        return { named, gone: gone.map((/** @type {any} */ x) => `${x.tag}${x.id ? `#${x.id}` : ''}${x.cls ? `.${x.cls.split(/\s+/).join('.')}` : ''}`) };
      });
      for (const n of loader.named) note('vt-and-loader', p, `loader/splash element ${n} (no loaders)`, state);
      for (const n of loader.gone) note('vt-and-loader', p, `a layer covering half the viewport at DOMContentLoaded (${n}) is gone by load: a loading screen`, state);
      /* policy-tiers: LCP element and first-viewport reveals */
      const lcp = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const anims = h1 ? h1.getAnimations({ subtree: true }).filter((a) => a.playState !== 'finished' || (a.effect?.getTiming().duration || 0) > 0) : [];
        const armed = [...document.querySelectorAll('[data-reveal]')].filter((el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && el.getAttribute('data-reveal') !== 'in'; }).map((el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''));
        const tr = h1 ? getComputedStyle(h1) : null;
        return { h1: anims.length, transition: tr ? tr.transitionDuration.split(',').some((d) => parseFloat(d) > 0) && tr.transitionProperty !== 'none' && /all|opacity|transform|translate|scale/.test(tr.transitionProperty) : false, armed };
      });
      if (lcp.h1) note('policy-tiers', p, `the H1 (the LCP element) is animated (${lcp.h1} animation(s)); no entrance on the LCP element`, state);
      for (const a of lcp.armed) note('policy-tiers', p, `[data-reveal] ${a} is in the first viewport and not shown; first-viewport content never waits for a reveal`, state);

      /* no-auto-advance: observe from 1 s after load */
      if (c.state.id === 'on') {
        await page.waitForTimeout(1000);
        await page.evaluate(() => {
          const w = /** @type {any} */ (window);
          const scrollers = [...document.querySelectorAll('body *')].filter((el) => (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) || (el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY) && el !== document.body));
          w.__scrollers = scrollers; w.__scrolls = scrollers.map((el) => [el.scrollLeft, el.scrollTop]); w.__winScroll = [scrollX, scrollY];
          new MutationObserver((ms) => { for (const m of ms) if (m.target !== document.documentElement) w.__flips.push(`${m.attributeName} on ${/** @type {Element} */ (m.target).tagName.toLowerCase()}${/** @type {Element} */ (m.target).id ? `#${/** @type {Element} */ (m.target).id}` : ''}`); })
            .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-hidden', 'aria-selected', 'aria-current', 'hidden', 'inert'] });
        });
        await page.waitForTimeout(2000);
      } else await page.waitForTimeout(3000);

      /* policy-tiers: infinite animations */
      const top = await page.evaluate(probe);
      log.push({ page: p, state, at: 0, ...top });
      const hasHero = await page.evaluate(() => !!document.querySelector('.hero [data-living], [data-living].hero, header [data-living], .hero, .page-head'));
      if (c.state.id !== 'on') { if (top.infinite > 0) note('policy-tiers', p, `${top.infinite} infinite animation(s) run with motion ${c.state.id === 'reduce' ? 'reduced by the OS (no stored choice)' : 'off'} (budget 0): ${top.names.join(', ')}`, state); }
      else if (top.inView > (hasHero ? 7 : 8)) note('policy-tiers', p, `${top.inView} infinite animations in the first viewport (budget ${hasHero ? '7 with a living hero' : 8}): ${top.names.join(', ')}`, state);
      for (const x of top.problems) note('policy-tiers', p, x, state);
      if (c.width < 600 && top.blur > 3) note('policy-tiers', p, `${top.blur} backdrop-filter elements in the first mobile viewport (budget 3)`, state);
      for (const x of top.blurOver) note('policy-tiers', p, `backdrop-filter element ${x} sits over a running infinite animation`, state);
      if (c.state.id === 'on') {
        for (const frac of [0.5, 1]) {
          await page.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), frac);
          await page.waitForTimeout(400);
          const r = await page.evaluate(probe);
          log.push({ page: p, state, at: frac, ...r });
          if (r.inView > 8) note('policy-tiers', p, `${r.inView} infinite animations in the viewport at ${frac * 100} % scroll (budget 8): ${r.names.join(', ')}`, state);
          if (c.width < 600 && r.blur > 3) note('policy-tiers', p, `${r.blur} backdrop-filter elements in a mobile viewport at ${frac * 100} % scroll (budget 3)`, state);
          for (const x of r.blurOver) note('policy-tiers', p, `backdrop-filter element ${x} sits over a running infinite animation (${frac * 100} % scroll)`, state);
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(Math.max(0, 6500 - 1000 - 2000 - 800 - 200));
        const moved = await page.evaluate(() => {
          const w = /** @type {any} */ (window);
          const changed = (w.__scrollers || []).map((/** @type {Element} */ el, /** @type {number} */ i) => (el.scrollLeft !== w.__scrolls[i][0] || el.scrollTop !== w.__scrolls[i][1] ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${String(el.getAttribute('class') || '').split(/\s+/)[0]}` : null)).filter(Boolean);
          return { changed, flips: [...new Set(w.__flips)] };
        });
        for (const x of moved.changed) note('no-auto-advance', p, `the scroll position of ${x} changed with no input (auto-advance)`, state);
        for (const x of moved.flips.slice(0, 5)) note('no-auto-advance', p, `${x} changed with no input (auto-advancing slides or tabs)`, state);
      }

      /* vt-and-loader: view transitions honour motion */
      const vt = await page.evaluate(async () => {
        const out = { supported: 'startViewTransition' in document, durations: /** @type {number[]} */ ([]), atRule: /** @type {string[]} */ ([]) };
        const walk = (/** @type {CSSRuleList} */ rules, /** @type {string[]} */ conds) => { for (const r of rules) { const t = r.cssText || ''; if (/^@view-transition\b/.test(t) && !conds.some((c) => /prefers-reduced-motion:\s*no-preference/.test(c))) out.atRule.push(t.slice(0, 60)); const sub = /** @type {any} */ (r).cssRules; if (sub) walk(sub, /** @type {any} */ (r).conditionText ? [...conds, /** @type {any} */ (r).conditionText] : conds); } };
        for (const s of document.styleSheets) { try { walk(s.cssRules, []); } catch { /* cross-origin sheet */ } }
        if (out.supported) {
          try {
            const t = /** @type {any} */ (document).startViewTransition(() => {});
            await t.ready;
            out.durations = document.getAnimations().filter((a) => /** @type {any} */ (a.effect)?.pseudoElement?.startsWith('::view-transition')).map((a) => Number(a.effect?.getComputedTiming().activeDuration || 0));
            await t.finished.catch(() => {});
          } catch { /* a transition can be skipped (hidden tab); nothing to measure */ }
        }
        return out;
      });
      for (const r of vt.atRule) note('vt-and-loader', p, `${r}… is not inside @media (prefers-reduced-motion: no-preference)`, state);
      const longest = Math.max(0, ...vt.durations);
      if (c.state.id !== 'on' && longest > 0) note('vt-and-loader', p, `a view transition animates for ${Math.round(longest)} ms with motion ${c.state.id} (must be instant)`, state);
      if (c.state.id === 'on' && longest > 2000) note('vt-and-loader', p, `a view transition lasts ${Math.round(longest)} ms (T1 ≤ 2 s)`, state);
    } catch (e) {
      note('policy-tiers', p, `audit could not run: ${e instanceof Error ? e.message.split('\n')[0] : e}`, state);
    }
  }
  /* vt-and-loader: internal links navigate natively (one click per context) */
  try {
    await page.goto(`${site.origin}/`, { waitUntil: 'load' });
    await page.evaluate(() => { /** @type {any} */ (window).__marker = 1; });
    const link = page.locator('main a[href^="/"]:visible').first();
    if (await link.count()) {
      await Promise.all([page.waitForLoadState('load'), link.click()]);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({ marker: /** @type {any} */ (window).__marker === 1, push: /** @type {any} */ (window).__pushState }));
      if (r.marker || r.push) note('vt-and-loader', '/', `a link click did not load a new document (${r.push ? 'history.pushState' : 'same document'}): no AJAX page transitions`, state);
    }
  } catch { /* the link check is best effort; the per-page checks above already ran */ }
  await ctx.close();
}

const combos = themes.flatMap((theme) => widths.flatMap((width) => STATES.map((state) => ({ theme, width, state }))));
const queue = [...combos];
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) await audit(/** @type {any} */ (queue.shift())); }));
await browser.close();
site.close();

/** @type {import('./lib.mjs').Failure[]} */
const failures = [...found.values()].map((f) => ({ rule: f.rule, path: f.path, message: `${f.message} [${f.states.size === combos.length ? 'every state' : [...f.states].join('; ')}]` }));
console.log(`  motion-audit: ${pages.length} page(s) × ${combos.length} state(s) (${themes.join('/')} × ${widths.join('/')} px × reduce/off/on)`);
const json = argOpt('json');
if (json) writeJson(json, { tool: 'motion-audit', pages, states: combos.map((c) => `${c.theme} ${c.width} ${c.state.id}`), samples: log });
const ok = report('motion-audit', failures);
process.exitCode = ok ? 0 : 1;
