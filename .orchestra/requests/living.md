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
   renders scenes for slots with `art`), so the offline build writes 13 illustration files instead of 56 and the total
   drops to about 84. Suggested fix: assert on the 56 pages (or `> 60`), which is what the check is about.

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

13. The four `svc-*-hero` stock photos show landscapers and an arborist at work. They are labelled placeholders outside
    `/projects/`, but a reader may take them for RNC's crew (CONTRACT §2). Retiring them is one `stock: null` each in
    `media/images.json` (living, or by request in W3 when it is frozen); the service pages then show labelled art until
    `hero(p)` takes `scene: 'svc-<slug>'` in W3.

## For W3 families

14. **t-projects**: cards and case studies can render `projectArt(p)` or `picture(p.images.art)` directly; the v2 slots
    (`proj-<service>-<n>`, `svc-*-before/after/detail-*`) already render the same art through `picture()`. Show the
    before/after comparison only when RNC's own photos exist (`hasPhoto()`).
15. **t-home / t-areas / t-services**: `picture('home-hero' | 'area-<slug>', { eager: true })` renders the layered scene
    inside the legacy hero today, under the legacy scrim. With `ui.hero({ scene })` the scene sits in the new hero
    without a scrim; area cards on the hub get the static area art well (`livingScene('area-<slug>', { variant: 'card' })`).
16. **t-areas / t-editorial**: `contourPlate(TILES, { rings, labels, current })` in `lib/art.mjs` draws the 13-tile
    contour plate (contour lines only; `[data-draw]` group for the plate-draw T1).

## Housekeeping done in W2 (for the record)

- `media/images.json`: the v2 `genPrompt` fields (photorealistic generation prompts) are removed: the locked decision is
  living vector art and no AI photos. Every slot keeps its id, `alt` and shooting `brief`.
