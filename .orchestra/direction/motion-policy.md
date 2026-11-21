# Motion policy T0–T4 as CSS rules and hooks (S1, binding for W2–W4)

This file turns CONTRACT §8–§9 and the J2 vetoes into code. ds-core writes it into `site/src/styles/95-motion.css` (`@layer motion`) and the reduced-motion part of `brand/tokens.css`. living, ds-chrome, ds-comp and the W3 families only **use** the hooks below; they never write their own gate.

## 0. Rules
1. **One gate.** `prefers-reduced-motion` appears only in `brand/tokens.css` and `95-motion.css`. Scripts never call `matchMedia('(prefers-reduced-motion…)')`. They ask `prefs.motionOn()` and listen to `onMotionChange()`.
2. **Effective motion** means **JS is running** and **either** `data-motion=on` **or** (`data-motion` is absent **and** the OS reports `no-preference`). `prefs.motionOn()` is the only place that computes it.
3. **Only `transform` and `opacity` animate** in loops and transitions. There are two exceptions:
   - `stroke-dashoffset` in T1 one-shot draws (≤ 1.6 s, IO-triggered, ≤ 12 paths in view);
   - fill/stroke colour transitions in T0 hover states.
4. **Banned in all tiers** (lint, J2 vetoes):
   - `@keyframes` that animate a custom property (`--*`, which includes `@property` angles);
   - `filter`, `backdrop-filter`, `font-*`, `width`/`height`/`top`/`left` or `stroke-dashoffset` inside an infinite animation or on a scroll/view timeline;
   - SMIL;
   - rAF loops that write styles;
   - `filter: blur()` on any animated element;
   - the independent `translate`/`rotate`/`scale` properties on an `<svg>` element;
   - two animations writing the same property on one element.
5. **Layer anatomy for living art:** `div.sc-layer[data-parallax]` (translate: T4; scale: T1 entrance) > `svg.sc-*` (transform: T2 drift; opacity: T2 twinkle/pulse). Each property has one writer.
6. **No backdrop-filter over animated layers.** Glass blur is allowed only under `html[data-scrolled]:not([data-header-over-living])` on the header.
7. **Never on the LCP element.** The H1 and anything in the first viewport has no entrance, no reveal and no view-timeline.
8. **Budgets:**
   - 0 infinite animations running with motion off, or with reduce and no stored choice;
   - ≤ 8 infinite animations per viewport with motion on (hero ≤ 7);
   - ≤ 2 rotated conic rings per page;
   - idle main thread ≤ 10 ms/s at 4× CPU after `data-alive` + 2.5 s;
   - scroll ≤ +60 ms/s over a static page;
   - 0 long animation frames while idle;
   - 0 `compositeFailed` on infinite animations.

## 1. Tokens (brand/tokens.css, emitted by build-tokens.mjs)
```css
:root{
  --dur-t0: var(--motion-duration-base);   /* 220ms; hover, press, focus, bar in/out */
  --dur-t0-fast: var(--motion-duration-fast); /* 140ms */
  --dur-t1: var(--motion-duration-reveal);  /* 600ms; reveals */
  --dur-draw: var(--motion-duration-draw);  /* 1600ms ceiling; contour draws */
  --dur-vt: var(--motion-duration-vt);      /* 250ms; cross-document VT */
  --alive-play: running;
}
@media (prefers-reduced-motion: reduce){
  :root:not([data-motion=on]){ --dur-t0:0ms; --dur-t0-fast:0ms; --dur-t1:0ms; --dur-draw:0ms; --dur-vt:0ms; }
}
:root[data-motion=off]{ --dur-t0:0ms; --dur-t0-fast:0ms; --dur-t1:0ms; --dur-draw:0ms; --dur-vt:0ms; }
```
The legacy `*{animation-duration:0ms!important}` kill switch is deleted (CONTRACT §8). Otherwise `data-motion=on` could never win.

## 2. Hooks (attributes; who sets them)
| Hook | On | Set by | Meaning |
|---|---|---|---|
| `class="js"` | html | HEAD_SCRIPT (frozen) | JS runs |
| `data-theme`, `data-motion` | html | HEAD_SCRIPT (stored choice), prefs.js (toggles) | CONTRACT §8 |
| `data-alive` | html | living.js, after `load` + `requestIdleCallback` (timeout 2 s), only while `motionOn()`; removed on motion off or `visibilitychange` hidden | T2 **and T4** may run |
| `data-offscreen` | each `[data-living]` root | living.js IntersectionObserver | sets `--alive-play: paused` locally |
| `data-entered` | hero `[data-living]` | living.js, first rAF after `load` (at once, unanimated, when `motionOn()` is false) | T1 dolly-in |
| `data-drawn` | `[data-draw]` groups | living.js, after idle (hero ridges) or on IO entry (plates, process spine); at once, unanimated, when `motionOn()` is false | T1 draw |
| `data-reveal="armed"` / `"in"` | section wrappers with `[data-reveal]` below the first viewport | living.js IO, only if `motionOn()`; flips once, then unobserve | T1 reveal |
| `data-scrolled` | html | main.js (ds-chrome), IO sentinel at the hero bottom | header may blur |
| `data-header-over-living` | html | main.js, IO on `[data-living]` with rootMargin covering only the header strip | header blur off |
| `data-t2` | any element with an infinite animation | authors (static markup/CSS class) | lint and reduce backstop target |

## 3. 95-motion.css (normative skeleton)
```css
@layer motion {
  /* T0: feedback. Durations come from tokens, so reduce/off makes them instant. */
  :where(a, button, .tile, .chip, .pref-toggle, .btn){
    transition-duration: var(--dur-t0);
    transition-timing-function: var(--ease-out);
  }

  /* T1: one-shot. JS sets the state only when motionOn(); duration var is the backstop. */
  [data-reveal=armed]{ opacity:.4; translate:0 24px; }
  [data-reveal=in]{ opacity:1; translate:none; transition: opacity var(--dur-t1) var(--ease-out), translate var(--dur-t1) var(--ease-out); }
  [data-living] .sc-land{ scale:1; }
  html.js:not([data-motion=off]) [data-living]:not([data-entered]) .sc-land{ scale:1.04; }  /* see note */
  [data-living][data-entered] .sc-land{ transition: scale 1.4s var(--ease-out); }
  /* Paths carry pathLength="1". No dasharray at rest (P2 build note 1: Chromium drops resting dashed strokes in some captures). */
  html.js:not([data-motion=off]) [data-draw]:not([data-drawn]) path{ stroke-dasharray:1; stroke-dashoffset:1; }
  [data-draw][data-drawn] path{ animation: sc-draw var(--dur-draw) var(--ease-out) backwards; }
  @keyframes sc-draw{ from{ stroke-dasharray:1; stroke-dashoffset:1 } to{ stroke-dasharray:1; stroke-dashoffset:0 } }

  /* T2: ambient loops. Only under data-alive; play-state follows visibility and off-screen. */
  [data-t2]{ animation-play-state: var(--alive-play); }
  [data-offscreen]{ --alive-play: paused; }
  html:not([data-alive]) [data-t2]{ animation: none; }
  @media (prefers-reduced-motion: reduce){
    html:not([data-motion=on]) [data-t2]{ animation: none !important; } /* backstop for J2 V1 */
  }
  html[data-motion=off] [data-t2]{ animation: none !important; }

  /* T3: pointer effects. living.js attaches listeners only when motionOn(); CSS also needs a fine pointer. */
  @media not ((hover: hover) and (pointer: fine)){ .spot-glow{ display:none; } }
  html:not([data-alive]) .spot-glow{ display:none; }

  /* T4: scroll-linked. Supported engines only, and only while alive. */
  @supports (animation-timeline: scroll()){
    html[data-alive] [data-parallax]{
      animation: sc-par linear both;
      animation-timeline: scroll(root);
      animation-range: 0 100vh;
    }
    @keyframes sc-par{ to{ translate: 0 calc(var(--depth, .06) * -100%); } }
    html[data-alive] .read-progress{ animation: sc-progress linear both; animation-timeline: scroll(root); transform-origin: 0 50%; }
    @keyframes sc-progress{ from{ transform: scaleX(0) } to{ transform: scaleX(1) } }
  }

  /* View transitions. */
  @media (prefers-reduced-motion: no-preference){
    @view-transition{ navigation: auto; }
  }
  ::view-transition-group(*){ animation-duration: var(--dur-vt); }
  html[data-motion=off]::view-transition-group(*),
  html[data-motion=off]::view-transition-old(*),
  html[data-motion=off]::view-transition-new(*){ animation: none; }
  .site-header{ view-transition-name: site-header; }
  h1{ view-transition-name: page-title; }
}
```
**Note on the armed states (dolly-in and draws).** The `scale:1.04` and hidden-stroke from-states apply only to `html.js` with motion not `off`. If living.js finds `motionOn()` false (reduce with no stored choice), it sets `data-entered` / `data-drawn` at once and `--dur-*` is 0, so nothing stays armed. With no JS nothing is ever armed. `scale` changes never count as CLS.

## 4. Where each tier is allowed
| Tier | Allowed effects (effects-approved.json ids) | Never |
|---|---|---|
| T0 ≤ 250 ms | focus-ring, edge-glow, lift, pref-toggles, sticky-bar, where-we-work, toc-firefly, area-map hover | durations written as raw ms in component CSS |
| T1 ≤ 2 s | hero-dolly, ridge-contours, reveal-io, plate-draw, process-path, theme-reveal (520 ms), xdoc-vt (250 ms), projects-filter-vt, before-after, quote ready panel | the H1/LCP; first-viewport content; scroll-scrubbing |
| T2 > 5 s | living-hero (≤ 7 loops), area-scenes (≤ 5), service-nocturne (≤ 4), cta-band (3), conic-ring (1, max 2), area-map pulse (1) | `@property` loops; filter or blur animation; anything without `[data-t2]` |
| T3 | spotlight, edge-glow pointer part | coarse pointers; motion off; vars on `:root` |
| T4 | scene-parallax (hero only, ≤ 5 wrappers), reading-progress | `view()` reveals (J2 V10); scroll-scrubbed dashoffset (V8); font-weight on scroll (V4) |

## 5. Script contract (living.js, ≤ 2.5 KB gz)
```js
import { motionOn, onMotionChange } from './lib/prefs.js';
const html = document.documentElement;
const live = () => { if (motionOn() && !document.hidden) html.setAttribute('data-alive', ''); };
const kill = () => html.removeAttribute('data-alive');
addEventListener('load', () => (window.requestIdleCallback || setTimeout)(live, { timeout: 2000 }));
document.addEventListener('visibilitychange', () => (document.hidden ? kill() : live()));
onMotionChange(({ on }) => (on ? live() : kill()));
// IO: [data-living] -> data-offscreen; [data-reveal] arm/flip once; [data-draw] -> data-drawn once.
// Spotlight: one passive pointermove on [data-spot-grid], rAF-throttled, moves .spot-glow with translate3d.
```
No per-frame style writes except the spotlight glow transform, and only while the pointer moves.

## 6. QA gates (qa owns the tools; each one would have caught a J2 finding)
1. With reduce and no stored choice, and again with `data-motion=off`, `document.getAnimations().filter(a => a.effect.getTiming().iterations === Infinity && a.playState === 'running').length === 0` after load + 3 s. With motion on, the count per viewport is ≤ 8 (hero ≤ 7). (V1, P3 hard-coded attribute)
2. **Static lint (check-motion-policy):**
   - no `@keyframes` touching `--*`, `filter`, `backdrop-filter`, `font-*` or layout properties;
   - `stroke-dashoffset` keyframes only under `[data-drawn]`;
   - every `infinite` sits on a selector that also matches `[data-t2]`;
   - `prefers-reduced-motion` appears only in tokens.css and 95-motion.css;
   - no `animation-timeline: view(`. (V1, V4, V8, V10)
3. No element with a computed `backdrop-filter` other than `none` intersects the rect of a running infinite-animation target, at 320/390/1440 × both themes, scrolled to 0 and to the CTA band. (V2)
4. CLS ≤ 0.05 at 390 with 4× CPU throttle and fonts delayed 500 ms, in both themes. (V3)
5. `scrollWidth === clientWidth` at 320 in both themes, with motion on and off, with the menu closed and open. (V6)
6. check-contrast covers every material × {ink, ink-2, ink-3, brand} over the scene anchors in both themes (S1 table: 558 checks). (V7)
7. Toggle pressed state passes a greyscale diff: the pressed and unpressed crops differ by ≥ 10 % of their pixels in greyscale. (V5)
8. Worst-pixel text-over-media (P2 `tom.cjs` method) on hero copy at 320/390/1024/1440 × both themes × scroll 0 and 50 % of the hero. Every text box ≥ 4.5, display text included (we do not use the large-text 3:1 allowance).
9. Trace: `Animation.compositeFailed` = 0 for infinite animations; idle main thread ≤ 10 ms/s at 4× after `data-alive` + 2.5 s; scroll ≤ +60 ms/s over the static page.
