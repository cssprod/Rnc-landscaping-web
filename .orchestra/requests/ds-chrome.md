# Requests from ds-chrome (W2)

Branch `w2/ds-chrome`, base `bc475c6` (ds-core tip on wave-1-int). ds-chrome edits only its own files; everything below is for another owner, the integrator or the orchestrator.

## 1. Orchestrator / ds-comp: `tests/unit/ui-api.test.mjs` line 100 expects the deleted `JS_FLAG`
`api('layout.mjs', 'JS_FLAG', null);` fails (`layout.mjs no longer exports JS_FLAG`) because CONTRACT §11, COMPONENTS.md and the ds-chrome brief all say W2 ds-chrome deletes the seed-time alias, and this branch does. The file is append-only (ds-comp owns it in W2 but may not delete a line), so this needs an orchestrator decision at the barrier: either the integrator removes that one line (logged in `carry.json` as a sanctioned exception to append-only), or `api()` gains a way to mark an export as retired. Nothing in the repo imports `JS_FLAG` any more (`grep -rn JS_FLAG site/src site/build.mjs` is empty).

## 2. Integrator: `tests/unit/build-modules.test.mjs #module-graph` asserts the W1 static imports
`the real scripts directory builds; main statically imports quote and projects (W1)` checks `modules.main.deps.includes(modules.quote.src) && …projects…`. CONTRACT §12 hands the removal of those imports to ds-chrome in W2, and this branch removes them (routes already declare `scripts: ['quote']` / `['projects']`). Suggested replacement (no W2 stream owns the file):
```js
test('the real scripts directory builds; feature modules load per route, not from main (W2) #module-graph', () => {
  const { modules } = buildModules(join(SITE, 'src/scripts'));
  for (const n of ['main', 'quote', 'projects', 'living', 'areas', 'lib-track', 'lib-prefs']) assert.ok(modules[n], `missing ${n}`);
  assert.ok(modules.main.deps.includes(modules['lib-track'].src) && modules.main.deps.includes(modules['lib-prefs'].src));
  for (const n of ['quote', 'projects', 'areas', 'living']) assert.ok(!modules.main.deps.includes(modules[n].src), `main must not import ${n}`);
});
```

## 3. Integrator: `#legacy-slices` (same as requests/ds-core.md §1)
ds-chrome deletes `50-legacy-07-ds-chrome.css`, `50-legacy-21-ds-chrome.css` and `50-legacy-22-ds-chrome.css` (acceptance: with them the `!important` on `.mega` and `.brand--footer:hover`). The test still fails for the reason ds-core gave; the `present`-segments fix in ds-core.md §1 covers these three too.

With items 1–3 applied, `node --test "tests/unit/**/*.test.mjs"` is green on this branch (123 of 126 pass today; the three failures are exactly these).

## 4. ds-comp: `data-hero-actions` on the hero CTA row
DESIGN-DIRECTION §14 / J1 #6: the sticky bar hides while the hero's own actions are in view, so a phone's first viewport shows one primary CTA. `main.js` already observes `[data-hero-actions]`; please add the attribute to the hero CTA wrapper (`.hero__ctas` in `ui/heads.mjs hero()` today, and the new split hero). Until then the bar shows over the hero CTAs on the home and service heroes at < 64em.

Also for ds-comp: the chrome's buttons still lean on `.btn` / `.btn--primary` from `50-legacy-05-ds-comp.css` (height, radius, fill). Keep those class names (and their `--h` custom property) when you re-home the slice into `40-ui-actions.css`; 30-chrome.css only sets sizes on top.

## 5. living: `data-alive`, `[data-living]` and the header
- `lib/prefs.js setMotion(false)` now removes `data-alive` at once; living.js owns setting it again (after idle) when it hears `rnc:motion` with `on: true`, and on load (CONTRACT §8).
- `main.js` sets `html[data-header-over-living]` while any `[data-living]` root is under the header capsule; the capsule's backdrop blur is off then (DESIGN-DIRECTION §7). Put `data-living` on each scene root that animates (hero, CTA band blobs).
- The theme toggle's moonrise reveal runs as Web Animations on `::view-transition-new(root)` / `::view-transition-old(root)` (no CSS view-transition rules outside 95-motion.css were needed).

## 6. qa
- `check-html#data-track-names`: the chrome (layout.mjs header, footer and sticky bar, `lib/tokens.mjs telLink / smsLink / mailLink`, the delegated handler in main.js) now emits only `call_click`, `sms_click`, `email_click` and `capability_statement_downloaded`. The remaining v2 names are in `ui/actions.mjs secondaryBtn` (ds-comp) and `forms.mjs` / `quote.js` (quote).
- `a11y#target-size`: header nav items, disclosures, toggles, Menu, Call and Free quote are >= 44 x 44; sheet rows are 52 px; the bar's buttons are 48 px; footer links are 32 px tall; breadcrumb links 24 px.
- `budgets#third-party-origins`: `layout.mjs` now emits the `images.unsplash.com` preconnect only on pages whose body actually loads an Unsplash image, and the Plausible tag only when `env.launch && env.analyticsDomain`. The offline build has no third-party `src`/`href` in the head.

## 7. seo: `check-seo#single-nav-dom`
There is one `<nav id="site-nav" aria-label="Main">` (the same DOM is the desktop row and the mobile sheet). The sticky bar is a `div[data-action-bar]`, not a nav: it repeats the Call (or Contact) and Free quote actions on purpose below 64em, so please do not count `/free-quote/` or `/contact/` in the bar as duplicated nav links. Footer navs are `aria-label="Services" | "Service areas" | "Company"`.

## 8. content (carry item)
`accessibility.json` can now document the two header toggles ("Dark theme", "Animations": `aria-pressed`, remembered in `localStorage` as `rnc-theme` / `rnc-motion`, dark by default, Animations off by default under the OS reduce setting) and the sticky Call / Free-quote bar; `privacy.json` the two `localStorage` keys. Every footer now says "Illustrations are drawn art, not photos of RNC projects." (DESIGN-DIRECTION §15).

## 9. Orchestrator notes (W5 docs)
- **Header order.** One nav DOM means Call and Free quote sit inside the nav, so the desktop row reads logo · nav · Call · Free quote · toggles (DESIGN-DIRECTION §13 sketched toggles before Free quote), and in the sheet Call and Free quote are the last row, not the first. Both keep DOM order = visual order = focus order.
- **Header row under text spacing (WCAG 1.4.12, fix round 1).** main.js measures the row and sets `header[data-fit="compact"]` (toggle labels fold back into 44 px icon buttons, item padding 5 px) and, if that is still too wide, `data-fit="tight"` (the logo tile without the visible wordmark; the link keeps its name "RNC Landscaping home"). With normal text no data-fit is set at 1024–1440; with the standard text-spacing override the row never overlaps (`#header-call` now checks 1024/1100/1280/1366/1440 with the override injected).
- **Header Call at >= 64em** is compact: a 44 px phone button whose name stays "Call [PHONE]", or, while PHONE is unknown in showcase, the phone icon plus the `[PHONE]` chip ("Call" kept as visually hidden text). The full "Call …" label shows in the sheet. At 1280 the row has ~1 px to spare with the 80em toggle labels; a longer PHONE value only shrinks the icon button, never the row.
- **Desktop menus** use the opaque `bg-elevated` surface instead of `material.thick`: at .86 alpha the hero headline showed through the Service areas panel at 1280.
- **Mobile header height** is 64 px (`--layout-header-h` is set to `--layout-header-h-sm` below 64em in 30-chrome.css, as ds-core suggested); 30-chrome.css sets `scroll-padding-top` = header + 8 px and `scroll-padding-bottom` = bar + 10 px float + safe area + 8 px (desktop 8 px). The `html { scroll-padding }` in 05-layout.css is now superseded by the chrome layer and can go at W3b.
- **Sprite.** Added `moon`, `fireflies`, `external`, `question`, `info`, `alert`, `columns`, `building`, `home`, `plus`, `minus`, `filter`, `contour`, `route` (`ICON_NAMES` lists all 44). No symbol is referenced only from client JS, so nothing needs a `<template>`. The logo stays inline; see §11 for the decision and the sizes after fix round 1.

## Fix round 1 (`w2/ds-chrome--fix1`)

### 10. ds-comp: delete the dead hero breadcrumb colours in `50-legacy-08-ds-comp.css`
Lines 30–32 (`.hero .crumbs a { color: rgba(255,255,255,.78) }`, `.hero .crumbs a[aria-current], .hero .crumbs a:hover { color: #fff }`, `.hero .crumbs__sep { … }`) can no longer win: the chrome layer's `.crumbs a` beats @layer legacy whatever the specificity. 30-chrome.css now owns the hero crumbs (white text on a dark chip, `rgba(5,12,8,.42)`, 4.5:1 against the lightest pixel of the art at 320–1440 in both themes; e2e `breadcrumbs over the hero reach 4.5:1 … #disclosure-breadcrumbs`). Please drop those three lines when you next touch the slice. Request §4 (`data-hero-actions` on `.hero__ctas`) is still open: until it lands, a phone's first viewport on / and the service heroes shows both the hero's and the bar's "Get a free quote".

### 11. qa (budgets v2 `#v2-sprite`) and the orchestrator: the sprite decision before the W3 freeze
Decision: **the logo stays in the inline sprite** (an external logo file needs a build-emitted asset outside ds-chrome's owns, one more request on every first view, and a late logo paint), and the sprite was made smaller instead, inside sprite.mjs:
- the wordmark outlines are rewritten as one relative path (`minPath`: relative commands, implicit repeats, H/V, no zero-length segments; the unit test proves the end points are identical, and a raster diff at 8x shows 5 anti-aliasing pixels of 142 000): 9.0 KB → 4.4 KB;
- the squircle is drawn once (`<path id="logo-p">` in `<defs>`, reused by the fill, the rim and the clip path): 3 copies → 1;
- the icon symbols no longer repeat `fill/stroke/stroke-width/linecap/linejoin` (≈125 bytes each): `svg.i` in 30-chrome.css sets that line style once and it inherits into every `<use>`.

Used sprite per page: **8.4–9.6 KB raw** (was 15.6–17.7 KB; the whole site build went from 2845 KB to 2424 KB). That is still above the 8 KB `#v2-sprite` budget, by the logo (≈5.3 KB of the total; the icons a page uses are ≈2.5–4 KB). Please either set the sprite budget to 10 KB, or measure the `logo-*` symbols and defs separately (logo ≤ 6 KB, icons ≤ 8 KB). The orchestrator may overrule and ask for the external logo file instead; that needs build (emit `/assets/brand/logo.svg` from sprite.mjs's symbols) plus a one-line change in `logo()`.

### 12. living / ds-comp: page heads with the aurora fail text-over-media in the dark theme at 320 px
On a trial run of qa's `text-over-media` (w2/qa--fix1 tools against this branch's build) the remaining failures are the page-head pages, where the `h1` fails too, so the aurora behind them is the cause, not the crumb colour: `/projects/oak-bay-front-garden-renewal/` (h1 2.39:1, crumbs 2.27 / 4.16:1), `/resources/irrigation-start-up-and-winterization/` (crumbs 2.38 / 2.79:1), `/privacy/` (2.75:1), `/accessibility/` (3.22:1), `/resources/`, `/contact/`, `/404.html`, `/projects/` (h1 2.08–3.90:1), all `[dark 320px scroll 0]`. Please dim the aurora under the text (or confine it to the right edge) at narrow widths; `.aurora` is styled in `50-legacy-04-living.css`.

### 13. ds-core: `svg.i` line style
30-chrome.css now carries `svg.i { fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round }` (moved out of every sprite symbol, §11). It belongs next to `.i` in `08-utilities.css`; please take it over at W3b (then ds-chrome deletes its copy). Any new icon must keep using `icon()` (class `i`), or it renders filled.

### 14. qa: motion-audit `#no-auto-advance` on /free-quote/
Resolved inside ds-chrome: the sticky bar no longer toggles `inert` when it hides over the quote form. main.js flips only `.is-hidden`; the CSS slides the bar out and then sets `visibility: hidden` (out of the tab order and the accessibility tree). `#sticky-bar-hides` asserts that `inert` and `aria-hidden` stay unset. The bar is still made `inert` while the mobile sheet is open, which only happens after user input. On the trial run motion-audit reports only the 4-glass-card `policy-tiers` hits (ds-comp/ds-core step cards), none from the chrome.

### 15. W5 docs / content (accessibility.json): accepted behaviour
- **Menu button name** stays "Menu" while the sheet is open (COMPONENTS.md §Chrome: names only grow). The visible label also stays "Menu" (2.5.3 Label in Name); the bars turn into a cross, and `aria-expanded` carries the state. The fix round removed the old `aria-label="Close menu"` swap.
- **No JavaScript.** The Services / Service areas buttons render `aria-expanded="false"` (check-html `#no-href-hash` requires the attribute in the static header), while without JS their panels show on hover and focus-within at ≥ 64em and are expanded in the plain list below 64em. The buttons do nothing when activated without JS; every link they would reveal is in the panel already shown (and in the footer). Accepted no-JS behaviour, to be listed in the accessibility statement's known limitations.
- **Desktop disclosures** close on Escape, when focus moves to an element outside the item, or on a click outside. A click on the panel's own text or padding (focus goes to `<body>`) keeps the panel open.

