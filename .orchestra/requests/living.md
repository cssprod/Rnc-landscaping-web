# Requests from the W2 living stream

Each item names the owner. None of these blocks living's own gates except where noted (items 1 and 2 are test
assumptions that a required living change breaks; living cannot edit those files).

## For the integrator (test files with no W2 owner)

1. **`tests/unit/build-modules.test.mjs` #legacy-slices** asserts that every slice in `.orchestra/legacy-css-map.json`
   still exists. Each W2 system owner must delete its slices (`mustDeleteIn: "w2"`; living deleted 04, 06 and 25 as its
   brief requires), so the test fails on every branch that does its job. Suggested fix: compare against the segments
   whose `mustDeleteIn` is later than the current wave (or allow a planned slice to be missing), and keep the
   `@layer legacy` and `!important` checks for the slices that remain.
2. **`tests/unit/build-dist.test.mjs` #parallel-out** asserts `> 100` files in a build. Living art is now inline (picture()
   renders scenes for slots with `art`), so the offline build writes about 10 illustration files instead of 56 and the
   total drops well under 100. Suggested fix: assert on the 56 pages (or `> 60`), which is what the check is about.

## For ds-comp (W2)

3. **Prove the scenes on `/styleguide/`**: `import { livingSpecimens } from '../components/living.mjs'` and place
   `${livingSpecimens({ projects: Object.values(env.data.projects) })}` in the page (it renders an `<h2 id="living-h">`
   section: the home hero, one sea, lake and field area scene, a service nocturne, a still band, four project art wells
   and the four service vignettes, each framed and captioned). Styles live in 45-living.css (`.lv-spec*`).
4. **Hero scene slot**: `hero(p)` with `scene` should place `livingScene(p.scene)` (default variant `hero`) inside
   `.hero__scene`; the scene is `position:absolute; inset:0` and needs a positioned parent. `ctaBand({ living: true })`
   can use `livingScene('cta', { variant: 'band' })` (≤ 3 loops) or its own blobs; `quote-calm` uses
   `livingScene(id, { still: true })` (0 loops, `data-still`).
5. **Spotlight**: give bento cards `data-spotlight`; living.js injects one aria-hidden `.spot` per hovered card and
   45-living.css paints the glow and the hover/focus `@property` rim (`isolation: isolate` and `position: relative` are
   set on `[data-spotlight]`). No component JS is needed.

## For ds-core (W2)

6. **95-motion.css hooks living.js sets** (motion-policy §2–§3):
   - `[data-living][data-entered]` on every scene on the first frame after load: value `go` when motion is effective,
     `still` when not. The dolly is `.sc-land { scale }`; `.sc-land` is centred with a negative margin, so `translate`
     is free for `[data-parallax]` (`--depth` is set inline: `.06` land, `.03` aurora).
   - `[data-draw][data-drawn]` (`go` / `still`) on the hero ridge-contour group (paths carry `pathLength="1"`).
   - `[data-reveal]` → `armed` → `in` below the fold, only while motion is effective.
   - `html[data-hidden]` while the tab is hidden and `[data-living][data-offscreen]` off-screen; 45-living.css sets
     `--alive-play: paused` for both. Please keep `--alive-play: running` as the token default.
   Living declares its T2 loops only under `html[data-alive]` with `var(--alive-play, running)` in the shorthand, and
   marks each loop box `data-t2`, so the 95-motion backstops (`html:not([data-alive]) [data-t2] { animation: none }`)
   apply unchanged.
7. **Scene tokens**: 45-living.css reads `--scene-sky-top/-mid/-low`, `--scene-aurora-1/2/3`, `--scene-orb`,
   `--survey-contour`, `--glow-firefly` and `--glow-spot` with the DESIGN-DIRECTION §2.2 values as fallbacks, so the
   ds-core token names land without a living change.

## For ds-chrome (W2)

8. `data-header-over-living`: scenes carry `[data-living]` (hero scenes also `.scene--hero`), which the header IO can
   observe. The theme toggle needs nothing else: scenes swap colours through `--sc-*` under `[data-theme=light]`.
   The layout's `<link rel="preconnect" href="https://images.unsplash.com">` is now wasted on pages with no stock image
   (every `/projects/` page, the home page offline): emit it only when the rendered body contains a stock URL.

## For seo (W2)

9. **og:image under `/projects/`** falls back to `ogUrl('og-default')`, an Unsplash photo, because project slots no
   longer have stock (`ogUrl()` returns null for art-only slots). Please skip the stock fallback for `/projects/**`
   (omit `og:image` or use a local file) until og-cards ships, so no stock photo is presented with a project.

## For qa (W2)

10. **sharp for the pipeline test**: `unit/living-images.test#pipeline` converts a fixture photo with sharp when it can
    find it (`RNC_SHARP_DIR`, else `/tmp/rnc-devtools/node_modules/sharp`). Please have `tools/dev-setup.mjs --devtools`
    also install `sharp` into `/tmp/rnc-devtools`, so the conversion half runs in every gate instead of being skipped.
11. **check-honesty#stock-in-projects** can assert on rendered `<img src>` / `<source srcset>` under `projects/**`: the
    offline and online builds now carry none (og:image is item 9).
12. **Measured W2 numbers** (offline build, this branch): inline SVG per page max 42.1 KB (home: sprite 16.9 + icons
    6.4 + map 3.6 + hero scene 10.1 + 4 project cards 5.8), `/projects/` 40.2 KB, area pages ≤ 34.7 KB; hero ≤ 7
    infinite animations, area heroes ≤ 5, art wells 0. motion-audit can count `[data-t2]` boxes per viewport.

## For content / qa honesty (W2–W3)

13. Done in living fix 1: `svc-grounds-maintenance-hero`, `svc-landscape-installation-hero` and
    `svc-tree-vegetation-hero` (stock photos of a landscaper and an arborist) now have `stock: null` and
    `art: { scene: 'svc-<slug>' }`, so the service pages show the labelled service scene (check-honesty#no-stock-people
    is green on a trial merge with w2/qa). `svc-irrigation-hero` (sprinklers, no person) keeps its credited stock (and
    the illustration file offline); `area-central-saanich` also drops its stock, so all 13 area heroes show their scene. qa: nothing to change in check-honesty.

## For W3 families

14. **t-projects**: cards and case studies can render `projectArt(p)` or `picture(p.images.art)` directly; the v2 slots
    (`proj-<service>-<n>`, `svc-*-before/after/detail-*`) already render the same art through `picture()`. Show the
    before/after comparison only when RNC's own photos exist (`hasPhoto()`).
15. **t-home / t-areas / t-services**: `picture('home-hero' | 'area-<slug>' | 'svc-<slug>-hero', { eager: true })`
    renders the layered scene inside the legacy hero today, under the legacy scrim, with the aurora painted still
    (item 17). With `ui.hero({ scene })` the scene sits in the new hero
    without a scrim; area cards on the hub get the static area art well (`livingScene('area-<slug>', { variant: 'card' })`).
16. **t-areas / t-editorial**: `contourPlate(TILES, { rings, labels, current })` in `lib/art.mjs` draws the 13-tile
    contour plate (contour lines only; `[data-draw]` group for the plate-draw T1).

## Glass over living heroes (motion-audit #policy-tiers; DESIGN-DIRECTION "never blur over animation")

17. **ds-comp (W2) / ds-chrome (W2), blocks a green motion-audit on the merge**: on a trial merge with w2/qa,
    motion-audit reports `backdrop-filter element a.btn.btn--glass sits over a running infinite animation` on `/`,
    `/areas/oak-bay/` (and on `/services/irrigation/` whenever its hero shows the scene), and `nav.dock.glass-bar …` on
    `/` (390 and 1440 px, motion on). The loops under the buttons are the land-box layers (stars, glints, mist, fireflies), which span the whole
    hero width, so living cannot move them out from under the copy. Please drop the blur where the glass sits on a
    living scene and use the thick material instead, for example:
    `.hero:has([data-living]) .btn--glass { -webkit-backdrop-filter: none; backdrop-filter: none; background: var(--material-thick); }`
    in the ds-comp button styles, and the same for `.dock` while it overlaps a `[data-living]` hero (ds-chrome can
    toggle a class from the existing header-over-living IO, `data-header-over-living`). Living fix 1 already reduced the
    cost: the aurora box is sized to the sky and drifts by translate only (no scale), and heroes placed through
    `picture({ eager: true })` paint the aurora still (`livingScene(id, { aurora: 'still' })`). Home at 1440 px in
    headless Chromium went from 31 fps to 50 fps (base 58). When W3 `hero(p)` places scenes itself without glass on
    top, it uses the default (`aurora: 'loop'`).

## Hero copy at dawn (text-over-media #worst-pixel, light theme)

18. **ds-comp (W2) / t-home, t-areas, t-services (W3)**: the legacy hero sets white copy over the scene, and the dawn
    sky is pale. Living fix 1 shades the copy side of `.hero__media .scene--hero` in the light theme only (a left-hand
    gradient in 45-living.css), which brings `/`, `/areas/sooke/`, `/areas/oak-bay/` and the service heroes to ≥ 4.5:1
    at every width on a trial merge with w2/qa. `hero(p)` in W3 should instead set the dawn ink colour on hero copy in
    the light theme (DESIGN-DIRECTION §2.2), and then drop the `.hero__media` shading; tell living if the hero no
    longer uses `.hero__media`, because the shading rule keys on it.

## Dead aurora markup (slice 04 is deleted)

19. **ds-comp (W2) or W3 owners**: living deleted legacy slice 04 (the aurora washes) as REDESIGN-PLAN requires, so
    `<div class="aurora …" aria-hidden="true">` now renders unstyled and empty on 41 pages (offline build). Please delete it:
    `ui/heads.mjs` (page head, ds-comp in W2, else fix-system in W4), `ui/cards.mjs` (bento band, ds-comp in W2, else
    t-home in W3), `ui/trust.mjs` (quotes band, ds-comp in W2, else t-company in W3) and `pages/quote.mjs` (quote in
    W2). Page heights do not change (the divs are absolutely positioned and empty); the soft page-head glow is gone by
    design, and a page head that wants depth gets `livingScene(id, { variant: 'band' })` or the ds-core page-head wash.

## Housekeeping done in W2 (for the record)

- Living fix 1: art wells placed through `picture()` are seeded by slot id (`livingScene(scene, { variant: 'card',
  seed })`), so the slots that share one scene (`svc-<slug>-after`, `-detail-1`, `-detail-2`) no longer repeat one
  picture on the case studies and service pages; `projectArt()` reads `project.area`, so seaside projects show water.
- Slice 04 is deleted; its `.aurora` markup is item 19.

- `media/images.json`: the v2 `genPrompt` fields (photorealistic generation prompts) are removed: the locked decision is
  living vector art and no AI photos. Every slot keeps its id, `alt` and shooting `brief`.
