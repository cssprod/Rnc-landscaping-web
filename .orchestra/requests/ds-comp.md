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
