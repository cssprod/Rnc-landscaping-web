# Requests from ds-core (W2)

Branch `w2/ds-core`, base `a3a99dd` (wave-1-int). ds-core edits only its own files; everything below is for another owner or the integrator.

## 1. Integrator: `tests/unit/build-modules.test.mjs #legacy-slices` (no W2 owner) — blocks every W2 stream that deletes a slice
The test asserts that every `.orchestra/legacy-css-map.json` segment file still exists:
`assert.deepEqual(legacy.filter((n) => !/^50-legacy-\d\dx-ds-core\.css$/.test(n)), planned)`.
Deleting a slice by its `mustDeleteIn` wave (ds-core deletes 01, 03, 24, 32 as its acceptance requires; ds-chrome, ds-comp, living and quote delete theirs in W2) makes it fail. Proposed change: compare against the segments whose file still exists, and fail only when an existing slice is out of order, or a slice whose `mustDeleteIn` wave has passed still exists (W3b already proves none remain):

```js
const present = planned.filter((f) => names.includes(f));
assert.deepEqual(legacy.filter((n) => !/^50-legacy-\d\dx-ds-core\.css$/.test(n)), present);
for (const seg of map.segments) { if (!existsSync(join(REPO, seg.file))) continue; /* …existing checks… */ }
```
On `w2/ds-core` this is the only failing unit test (113/114 pass before it; it fails only because slices 01/03/24/32 are gone).

## 2. Integrator: `tests/unit/build-dist.test.mjs #route-shape` (carry item)
`site/tests/unit/ds-core-build.test.mjs #route-shape` now proves the same rules without patching the frozen `routes.mjs`: it appends test routes to a family file (`pages/styleguide.mjs`) in a scratch copy by rebinding its exported `routes`. Please delete the fragile `'\n  return R;'` patching test in `build-dist.test.mjs` (or keep it until routes.mjs changes; it still passes today).
The `legacyDir: DEFAULT_DIST` exemption in `build.mjs` stays: `build-dist.test.mjs #dist-guard` tests it, and a Netlify or CI checkout can still hold a pre-marker `site/dist`. It only ever applies to the default `site/dist` path with the old build fingerprint.

## 3. ds-chrome: theme colours, color-scheme and font preloads in `layout.mjs`
- `env.themeColors = { dark, light, background }` is new on the build env (from tokens `meta.*`, also used for `site.webmanifest`). Replace the two `<meta name="theme-color" media="(prefers-color-scheme: …)">` tags with one `<meta name="theme-color" content="${env.themeColors.dark}">` (dark-first, D1: the OS scheme is never consulted); the theme toggle updates it to `themeColors.light` / `.dark` (CONTRACT §8).
- `<meta name="color-scheme" content="dark light">` (CONTRACT §8); tokens.css sets `color-scheme: dark` on `:root` and `light` under `[data-theme=light]`.
- Newsreader is now `font-display: optional` with `preload: true` (DESIGN-DIRECTION §5, J2 V3). Add `<link rel="preload" href="/assets/fonts/newsreader-latin-italic-var.woff2" as="font" type="font/woff2" crossorigin>` next to the Inter preload; `fontFaces(readTokens())` from `brand/build-tokens.mjs` lists the faces with their `preload` flag if you prefer to read it.
- `.site-header`: `95-motion.css` gives it `view-transition-name: site-header` and `main h1` gets `page-title` (xdoc-vt). Do not name other elements; the pageswap title morph (moving `page-title` to the clicked card) is yours.
- Header heights: `--layout-header-h` (80px) is still the height at every width in the legacy chrome; `--layout-header-h-sm` (64px) and `--layout-actionbar-h` (64px) exist for the < 64em header and the sticky bar. `05-layout.css` sets `scroll-padding-top: calc(var(--layout-header-h) + 1rem)`; if the mobile header becomes 64px, set `--layout-header-h` to it below 64em (e.g. on `:root` in 30-chrome) so scroll padding, sticky offsets and `main > :first-child.section` follow.
- Focus: the legacy `.site-header.is-over-media :focus-visible { outline-color }` rule no longer wins (02-base sets the ring from `--focus-ring` / `--focus-halo`); on-photo headers get the deep ring through 02-base until you add `.on-deep` to the over-media header.

## 4. ds-comp, living, quote, W3 families: using the design system
- **Focus ring:** never set `outline`/`box-shadow` for focus yourselves; use the 02-base ring. For a deep or photo surface add class `on-deep` (tokens re-declare the dark text, line, brand, placeholder and ring values there, in `@layer base`, so components can refine them). For an inset ring inside a clipping box set `--focus-offset` (e.g. `-4px`) on the focusable element.
- 02-base keeps the legacy intent of `.faq__item summary` (inset ring), `.map__tile` and `.service-item h3 a` (ring on a delegate) and `.segmented__opt input + span`; when you restyle one of those, ask fix-system/W3b to drop its line from 02-base.
- **Motion:** animate through `--dur-t0`, `--dur-t0-fast`, `--dur-t1`, `--dur-theme`, `--dur-draw`, `--dur-dolly`, `--dur-vt` (all 0ms when motion is not effective) and the hooks in 95-motion.css: `[data-reveal="armed"|"in"]` (section wrappers below the first viewport only), `[data-living] .sc-land` + `[data-entered]`, `[data-draw]` + `[data-drawn]`, `[data-t2]` (every infinite animation), `[data-offscreen]`, `.spot-glow`, `[data-parallax]` (`--depth`), `.read-progress`. Never write `prefers-reduced-motion` outside tokens.css / 95-motion.css. The keyframes `fade` and `pop` (used by 50-legacy-07-ds-chrome.css menus) live in 95-motion.css.
- **The view() reveals are gone** (J2 V10, DESIGN-DIRECTION §11 #20: replaced by IO one-shots). Cards that used to rise into view (`.tile, .card, .bento__card, .quote, …`) are now static until living.js arms `[data-reveal]` on their section wrappers. (The brief's "view() reveals become T4" is superseded by the approved effects list and qa's `check-motion-policy`, which bans `animation-timeline: view(`.)
- **Type roles:** `.t-display`, `.t-title`, `.t-lede`, `.t-small`, `.t-label`, `.t-num`, `.t-quote` (03-type) and `em.accent` (one per page, H1 or display line). Layout primitives: `.l-cq` (container), `.l-stack`, `.l-cluster`, `.l-grid` (`--l-gap`, `--l-min`), `.wrap--narrow`, `.wrap--wide`.
- **Surfaces:** new cards use `--surface-card` / `--surface-card-hi` (lit solid; flatten to `bg-elevated` under reduced transparency / more contrast); glass text only on `material.regular|thick|chrome` (alphas >= `ca.rnc.minAlpha`), never text on ultrathin/thin over art; grain and stage read `--grain-opacity` / `--stage-opacity` (0 under reduced transparency, more contrast, forced colours).

## 5. living and quote: dark-appearance rules in your legacy slices
Dark is now the default and `prefers-color-scheme` is never consulted. These rules only fire on an OS dark setting and should become the default (with a `[data-theme="light"]` variant) when you re-home your slices:
- `50-legacy-25-living.css`: `.media--art img { filter: brightness(0.8) saturate(0.95) }` (under `prefers-color-scheme: dark` and `[data-theme=dark]`).
- `50-legacy-26-quote.css`: `.choice input:checked` dark tick (`stroke='%2306140C'`) under `prefers-color-scheme: dark`.

## 6. W3b css-consolidator: the ds-core fallback slices
`50-legacy-01x-ds-core.css` (a, a:hover, h1–h4, p, .section) and `50-legacy-03x-ds-core.css` (.glass-card, .glass-bar, .icon-tile, no-backdrop fallback) keep the pre-redesign cascade position because legacy component rules in other slices restyle those selectors (computed-style diff: 4,000+ changed elements across 56 pages when moved to `@layer base`). Once no legacy slice restyles them, move the element defaults into 02-base / 03-type and `.section` into 05-layout, and delete the glass rules that have no users left.

## 7. qa
- `tools/trace.mjs`: `traceability.json` names the contrast rules' file as `site/tools/check-contrast.mjs`, but CONTRACT §15 and ds-core's owns put the tool at `brand/check-contrast.mjs` (`site/tools/**` is not in ds-core's W2 owns; the gate runs it as `node ../brand/check-contrast.mjs`). Its literal `export const RULES = ['all-pairs', 'focus-pairs', 'glass-worst-case'];` is in `brand/check-contrast.mjs`; please read RULES from there (or the integrator corrects the path in traceability.json).
- e2e `global.spec#reflow-320-zoom-200`: checked locally on this branch for all 55 pages × dark/light at 320 px and at 640 px with DPR 2 (1280 px at 200 %): `scrollWidth <= clientWidth` and body font-size >= 16px everywhere.
- `motion-audit`: with the OS set to reduce and `data-motion=on`, `--dur-t0`/`--dur-t1` are 220/600 ms; absent or `off` they are 0 (unit test `ds-core-tokens.test#motion-tiers` proves it in Chromium today).
