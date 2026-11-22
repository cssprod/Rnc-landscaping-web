# Requests from ds-comp (W2)

Branch `w2/ds-comp`, base `bc475c6` (ds-core's W2 tip on wave-1-int). ds-comp edits only its own files; everything below is for another owner or the integrator. The new API is in `site/COMPONENTS.md` ("New primitives" + "W2 implementation notes (ds-comp)"); every primitive is rendered on `/styleguide/`.

## 1. Integrator: `tests/unit/build-modules.test.mjs #legacy-slices` (same as requests/ds-core.md §1)
ds-comp deletes its slices 02, 05, 08, 10, 12, 14 and 23 (brief acceptance: "ds-comp slices … deleted"), so the test's exact-list comparison against `.orchestra/legacy-css-map.json` fails on this branch exactly as it does on `w2/ds-core` (it is the only failing unit test here). Please apply ds-core's proposed change (compare against the segments whose file still exists, and check order and `@layer legacy` only for those).

## 2. ds-chrome (main.js, W2; frozen in W3): copy button and the sticky bar
- `contactFallback()` renders `<button type="button" class="… contact-fallback__copy" data-copy="#{id}-address" hidden>` plus `<span role="status" data-copy-status>`. Please wire a delegated handler for `button[data-copy^="#"]` in `main.js`: remove `hidden` on load, copy the `textContent` of the target on click, and write "Copied" (or the failure text) into the nearest `[data-copy-status]`. quote.js keeps its own `[data-copy]` in the quote form (its value is empty, so a `^="#"` selector does not collide).
- Sticky bar: `callBtn('sticky_bar')` renders a non-link placeholder in showcase while `[PHONE]` is unresolved and nothing in launch (CONTRACT §3). The bar's contract is "Contact → /contact/ until PHONE is known", so use `callBtn()` only when PHONE is known and keep your Contact fallback otherwise.
- `lib/tokens.mjs` `telLink` / `mailLink` (used by `contactCards()`) still send `call_clicked` / `email_clicked`; ds-comp renamed `secondaryBtn()` and every emitter in `ui/*` to `call_click` / `sms_click` / `email_click`.

## 3. living (W2): hooks the ui primitives expose
- `hero({ scene })` puts `livingScene(scene, { variant: 'hero', priority: true })` in `.hero__scene[data-scene-slot]` (full-bleed behind the copy for `layout: 'full'`, a framed panel for `'split'`). The slot paints a static sky from the `--scene-sky-*` / `--scene-aurora-*` tokens until the scene loads, and adds `illustrationChip()` only when the scene markup has no `media__chip--art`. 41-ui-heads.css sets `.hero__scene > .scene { width: 100%; height: 100% }`; override in 45-living.css if the scene sizes itself.
- `bentoCard({ scene })` puts `livingScene(scene, { variant: 'card' })` in `.bento__art` (aria-hidden; `> .scene` is absolutely positioned to fill it). Scene ids used on /styleguide/: `home`, `svc-<slug>`.
- Spotlight (T3): bento lists carry `data-spot-grid`, cards `data-spotlight` (cards are `position: relative; overflow: hidden`, so a `.spot-glow` child can be inserted directly).
- Living CTA band: `section.cta-band--living[data-living]` contains the three `[data-t2]` blobs and the `[data-t2]` conic ring; please include it in the IntersectionObserver that sets `data-offscreen` (it has no `.sc-land`, so the dolly rules never apply).
- `[data-reveal]` is emitted only where a caller asks (`sectionHead/bento/timeline/bentoCard({ reveal: true })`), never on the H1.

## 4. t-projects (W3)
- `beforeAfter(before, after, label, { toggle, id })` adds `button.ba__toggle[data-ba-toggle][aria-pressed="false"][hidden]` "Side by side" inside `.ba__control`. Wire it in `projects.js`: un-hide it, toggle `aria-pressed` and `.ba.is-side` (43-ui-projects.css then shows both images side by side and hides the range); same-document VT 250ms per the before-after effect.
- `.case__quote p` (the case-study quotation) shared its Newsreader rule with `.quote` in the deleted slice 12; 44-ui-trust.css keeps it for now. Please move it to 63-projects.css (or render the quote with `reviewCard()`), then ask ds-comp's W3 steward (t-company) to drop `.case__quote p` from 44.
- New: `specStrip()` (spec strip with filaments; never budgets) and `plantPalette(list, { sample: true })` ("Sample plant palette").

## 5. t-services (W3)
- `inPageToc(items, { label })` renders `nav.toc[data-toc]`; the sticky placement (≥ 64em) and the scroll-spy that sets `aria-current="location"` are yours (toc-firefly; 41-ui-heads.css already draws a dot on the rail for `[aria-current]`).
- `perVisitTable()`, `timeline()`, `localRulesCallout()`, `sharedRegional()` (one `aside[data-shared="regional"]` per page), `conditionsList()` are ready.

## 6. t-home / t-company / t-editorial (W3): what changed under existing pages
- Cards are lit solid now (`glass-card` dropped from `featureBento`, `trustBand`, `testimonials`, `sections()` item cards and `ctaBand`); `trustBand()` and `ctaBand()` carry `.on-deep`. pages/home.mjs still hand-writes `glass-card item-card item-card--row` and a `glass-card--media` panel: the legacy `.glass-card` (backdrop-filter) in `50-legacy-03x-ds-core.css` still applies there.
- Home grammar (DESIGN-DIRECTION §6): `bento(items, { layout: 'feature' })` with `span: 'feature' | 'tall' | 'wide' | 'full'` on the items, `hero({ scene: 'home', layout: 'full', proof })`, `ctaBand({ living: true, reply: true })` (one conic ring per page), `reviewsBand()` for the Google link.
- `sampleLabel('project')` / `sampleLabel('review')` give the "Sample project" / "Sample review" chips (projectCard, testimonials and reviewCard already use them).
- `contactCards()` is still styled by the t-company legacy slices 18/28.

## 7. ds-core / W3b (02-base)
`:where(.hero, …)` in 02-base gives every `.hero` the deep focus ring. A photo hero now carries `.on-deep` (same ring); a scene hero (`.hero--scene`) uses theme ink on the dawn sky in the light theme, so the rule can narrow to `.hero--photo` (or drop `.hero`). The sandwich ring passes either way; this is tidiness, not a failure.

## 8. qa (W2 deferred gates)
- `a11y#target-size` on /styleguide/: `.btn--sm` is now 44px tall; e2e `components.spec#target-size` checks buttons, chips, card links, source chips, TOC links and summaries at 320 and 1440 (my local axe run, wcag2a/aa/21/22aa + best-practice: 0 violations on /styleguide/ in dark/light × 320/1440 × motion off/on, and on 12 key pages).
- `check-honesty#reviews-credentials-guarantee` on /styleguide/: `section.reviews-band[data-reviews-band]` (≤ 3 `figure.review`, "Sample review" chips, Google link text + chip without href), `section.credentials dl.credentials__list` (token values only), `section.guarantee` (process.json text around `[WARRANTY]`).
- `check-motion-policy`: component T2 loops use raw durations (26s / 32s / 40s blobs, 14s conic ring) because no T2 duration token exists; they are `[data-t2]`, transform-only, and gated by 95-motion.css. Tell me if the lint wants tokens for them.
- `trace.mjs`: ds-comp provides `unit/ds-comp-markup.test#container-queries` (C4.1).

## 9. ds-chrome (W2 fix round): size and fill the header and action-bar buttons through the `.btn` hooks
`@layer components` sits above `@layer chrome`, so a padding, font-size or background that 30-chrome.css declares on a
`.btn` loses to the primitive (trial merge: `chrome.spec #header-call` "header row overlap at 1024", and the header quote
turned moss over photo heroes). `.btn` now reads custom properties that no components rule sets:
`--h` (height), `--btn-px` (inline padding), `--btn-fs` (font size), `--btn-min-w` (min width) and, on `.btn--primary`,
`--btn-bg`, `--btn-bg-hover`, `--btn-ink`, `--btn-shadow`. Please move to them:
- `.site-nav__quote { --h: 44px; --btn-px: 18px; --btn-fs: var(--font-size-subheadline); }`, `--btn-px: 14px` in the
  narrow-header query, `--h: 52px; --btn-fs: 1rem` in the menu sheet;
- `.site-header.is-over-media:not(.is-open) .site-nav__quote { --btn-bg: #fff; --btn-bg-hover: #EEF4F0; --btn-ink: #0E1611; --btn-shadow: none; }`;
- `.action-bar__btn { --h: 48px; --btn-px: 12px; --btn-fs: 1rem; --btn-min-w: 0; }`.
Until then 40-ui-actions.css carries a hand-off (`padding`/`font-size`/`min-width: revert-layer` on `.site-nav__quote` and
`.action-bar__btn`, and `background`/`color`/`box-shadow: revert-layer` on the over-media quote), so the chrome layer's
own declarations apply on a merge today (trial merge with w2/ds-chrome--fix1 + w2/living--fix1 + w2/qa--fix1:
chrome.spec 27/27 incl. #header-call). Once you use the hooks, ask t-company (ds-comp steward in W3) to delete those three lines.

## 10. qa (budgets v2): /styleguide/ inline SVG
`[v2-inline-svg] styleguide/index.html` was 55.7 KB on the trial merge; it is 52.2 KB now (bento art wells on the
feature and tall cards only, two project cards). 18.6 KB of it is the used sprite: the showcase renders every
icon-bearing primitive, so it uses more icons than any real page (the same sprite is also `[v2-sprite]` on 48 pages, a
ds-core/qa item). Without the sprite the page is ~33.6 KB. /styleguide/ is showcase-only (never built for launch):
please exempt it from `v2-inline-svg` / `v2-sprite` and the HTML-size warnings, or baseline the entry.

## 11. living (request 17): done in ds-comp's half
`.btn--glass` has no backdrop-filter (40-ui-actions.css) and `.hero:has([data-living]) .dock` drops the legacy
`.glass-bar` blur for `--material-media-strong` (41-ui-heads.css). Trial merge: motion-audit reports no `policy-tiers`
problem (the one remaining failure is `[no-auto-advance] free-quote/index.html`, quote's stepper, not ds-comp).

