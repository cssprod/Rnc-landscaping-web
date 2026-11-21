# DESIGN-DIRECTION: "Living Coast"

**Status:** authoritative art direction for W2–W5. It is written by S1, the creative director and synthesizer, and it replaces the "alive" summary in REDESIGN-PLAN v3. Where this file and an older brief disagree on aesthetics, this file wins. Hard constraints never relax:
- WCAG 2.2 AA in both themes;
- Lighthouse ≥ 95 ×4 on mobile;
- the budgets in CONTRACT §16;
- honesty.

**Machine-readable companions** (all in `.orchestra/direction/`):
- `tokens-proposal.json`: DTCG token deltas for ds-core. It compiles with today's `brand/build-tokens.mjs`; this was verified by merging and running `generate()`, which resolved 165 custom properties with 0 unresolved `var()` references.
- `effects-approved.json`: 35 approved effects, each with technique, gzip budget, tier, fallback, a11y note and owner.
- `motion-policy.md`: tiers T0–T4 as CSS and hooks, plus the QA gates.

**Proof specimen (scratch).** The specimen is `/tmp/claude-0/-home-user-Rnc-landscaping-web/5110250c-2871-5a49-ba20-c506ac0ea22b/scratchpad/direction/S1/spec/specimen-{dark,light}.html`. Its generator is `gen.mjs`, built from P1's by `patch.py` plus later rounds. The gates live in `check.cjs`, with results in `check.json`. It passes every J2 gate it exercises:
- **Loops:** 7 infinite loops in the hero viewport with motion on (cap 8). There are 0 under reduced motion with no stored choice, and 0 after the Animations toggle is switched off.
- **Blur:** no `backdrop-filter` overlaps a running animation at 320, 390, 1024 or 1440, in either theme, scrolled to 0, 1200 or the CTA band.
- **CLS:** 0 at 390 and 0.0008 at 1440 in both themes, at 4× CPU with fonts delayed 500 ms. P1 measured 0.64.
- **Reflow:** `scrollWidth` equals the viewport at 320.
- **Toggles:** both are 44 × 44 at every width.
- **Errors:** no console errors.

The section "Known gaps" lists what the specimen does not yet prove.

---

## 1. Vision

Greater Victoria at night, seen from the shore: firs stand black against a slow aurora, the cove's surf glows sea-glass where it breaks, fireflies drift in the understory and the moon lays a path across the strait. Switch the theme and the same scene becomes a Pacific dawn: peach and honey sky, lilac Olympics, the sun rising behind the range, dew instead of fireflies. A surveyor's hand runs quietly through it all. Glowing contour lines trace the headland, the real 13-municipality map becomes a plate of contour hills, and spec strips have hairline rules. That is what RNC does: it reads land and local rules before it touches anything. The site looks alive because the art breathes, not because numbers move. It shows no counters, readouts, HUD chrome or crypto gloss. "Web3" here means only glow, glass depth, gradients, bento and living motion. Every frame is calm enough that a homeowner on a phone sees what RNC does, where, and how to ask for a free quote, before the art finishes settling.

**Synthesis of the judges.**
- **Base:** P1 "Bioluminescent Fir". J3 scored it 8.4, J1 8.0 (a near-tie with P3 on conversion), and J2 found its palette sound once V1, V2, V3 and V9 are fixed.
- **Conversion chassis (P3):** the header Free quote, the Next-step link card, the 13 named municipalities, the CTA trust line, the sample chips and container-query bento.
- **Honesty and engineering (P2):** the footer disclaimer, "Schematic, not to scale", worst-pixel text-over-media QA, text-safe masks, filled/hollow toggle dots, the material alphas, the contour language and the "Off the map" 404.
- **Vetoes:** all ten J2 vetoes are binding and resolved here (§11).
- **Not grafted:** see §12.

## 2. Palette: "Fir night" (default) and "Pacific dawn" (light)
Dark is the default for every visitor (CONTRACT §8 D1). Light applies only under `:root[data-theme=light]`. Names map 1:1 onto `brand/tokens.json`; **NEW** marks additions. Exact DTCG deltas are in `tokens-proposal.json`.

### 2.1 color.*
| Token | Fir night (dark) | Pacific dawn (light) | Role / change |
|---|---|---|---|
| bg | `#06110C` | `#F2F6F3` | page |
| bg-elevated | `#0D1D16` | `#FFFFFF` | fields, menus, sheet, solid material fallback |
| bg-grouped | `#030907` | `#E7EEEA` | sunken |
| bg-tint | `#0F2A1F` | `#DCEBE2` | chips, quiet fills |
| ink | `#E8F4EC` | `#0C1A13` | text |
| ink-2 | `#B2C8BB` | `#3E5047` | secondary text |
| ink-3 | `#9AB3A4` | `#4F6157` | tertiary: meta, spec `dt`. Raised from P1 so it holds 4.5 on fills over art and under the spotlight. |
| line | `rgba(200,240,215,.12)` | `rgba(12,26,19,.11)` | decorative hairlines only |
| line-strong | `#5E7D6C` | `#6C7F76` | field borders ≥ 3:1. Light is darkened for margin. Never the only state cue. |
| brand | `#7FEBB0` bioluminescent moss | `#1D4A33` Douglas fir (unchanged) | links, primary buttons, the one accent phrase |
| brand-hover | `#A6F5CA` | `#143826` | |
| brand-ink | `#03140B` | `#FFFFFF` | text on brand |
| brand-2 | `#6FE0D2` sea-glass | `#2B6E4C` fern | icons, ticks, UI contour strokes |
| deep / deep-2 | `#020806` / `#0A1E16` | `#0B1F15` / `#163826` | CTA band and footer, **dark in both themes** |
| on-deep / on-deep-2 | `#FFFFFF` / `rgba(255,255,255,.76)` | `#FFFFFF` / `rgba(255,255,255,.78)` | |
| **accent-on-deep** (NEW) | `#9FF2C4` | `#9FF2C4` | Newsreader phrase and links on deep bands |
| placeholder / -bg | `#F2C462` / `rgba(242,196,98,.14)` | `#7A5200` / `#FFF3D1` | `[TOKEN]` chips |
| success / error | `#74D9A0` / `#FF8F85` | `#1C6E3F` / `#B42318` | |
| sky / sun | `#0A1C26` / `#E4EEF2` (moon) | `#DCE9EC` / `#FFE7B8` (sun) | illustration anchors |
| focus, focus-on-deep | alias → `{focus.ring}`, `{focus.ring-on-deep}` | | contract aliases |

### 2.2 NEW groups
| Token | Dark | Light | Use |
|---|---|---|---|
| focus.ring | `#C9C1FF` | `#4A3FC2` | camas; **the only violet in UI** |
| focus.halo | `#1A0F4D` | `#FFFFFF` | sandwich halo |
| focus.glow | `rgba(201,193,255,.45)` | `rgba(74,63,194,.28)` | decorative glow |
| focus.ring-on-deep / halo-on-deep | `#C9C1FF` / `#1A0F4D` | same | deep bands, both themes |
| glow.moss / sea | `rgba(127,235,176,.42)` / `rgba(111,224,210,.34)` | `rgba(43,110,76,.18)` / `rgba(70,160,160,.20)` | text-shadow on the accent phrase, halos |
| glow.firefly | `#E6FFA3` | `#FFD98A` | fireflies / dew motes |
| glow.spot | `rgba(127,235,176,.08)` | `rgba(255,200,140,.22)` | cursor spotlight peak (contrast-checked) |
| surface.card | `linear-gradient(160deg,#10241B,#0B1A14 55%,#08150F)` | `linear-gradient(160deg,#FFF,#F7FAF8 60%,#EEF4F0)` | lit-solid card |
| surface.card-hi | `…#143128,#0D1F18 55%,#09170F` | `…#FFF,#FBF4EC 60%,#F3EDE4` | featured card (dawn honey) |
| surface.edge | `135deg #7FEBB0 → #6FE0D2 → #F2C462` | `135deg #1D4A33 → #2B6E4C → #B07A1E` | hover/focus-within rim on tiles (moss → sea-glass → honey; **no violet**) |
| scene.sky-top / -mid / -low | `#030A10` / `#081B22` / `#0D2A28` | `#C9DCE4` / `#EADFD6` / `#F8E3CC` | sky gradient anchors |
| scene.aurora-1/2/3 (max alpha behind copy) | `rgba(64,230,160,.22)` / `rgba(70,200,225,.24)` / `rgba(150,132,255,.22)` | `rgba(255,190,150,.45)` / `rgba(255,214,160,.40)` / `rgba(200,186,235,.34)` | |
| scene.orb / art-bright / art-glow / art-dark / far-range | `#E4EEF2` / `#E6FFA3` / `#6FE0D2` / `#030907` / `#1A2E36` | `#FFE7B8` / `#FFFFFF` / `#FFD98A` / `#0E2A1D` / `#AEB8CF` | worst-case anchors for contrast and text-over-media |
| survey.contour / contour-faint / rule | `#5ED8C6` / `rgba(94,216,198,.22)` / `rgba(170,230,196,.22)` | `#2F7A6C` / `rgba(47,122,108,.20)` / `rgba(12,26,19,.16)` | map plate, ridge contours, band rings. Lines only. |

### 2.3 material.* and glass.*
Fill alphas carry contrast **without** blur, because nothing blurs over animated art (J2 V2).

| Material | Dark | Light | Solid fallback | Text allowed over art? |
|---|---|---|---|---|
| ultrathin | `rgba(16,34,26,.40)` | `rgba(255,255,255,.40)` | bg-elevated | **no** (1.60 measured) |
| thin | `rgba(12,28,21,.56)` | `rgba(255,255,255,.58)` | bg-elevated | **no** |
| regular | `rgba(10,24,18,.80)` | `rgba(255,255,255,.84)` | bg-elevated | yes: ink, ink-2, ink-3, brand |
| thick | `rgba(8,20,15,.86)` | `rgba(255,255,255,.88)` | bg-elevated | yes |
| chrome | `rgba(7,18,13,.82)` | `rgba(246,250,247,.84)` | bg-elevated | yes |
| media / media-strong | `rgba(3,10,7,.58)` / `.70` | `rgba(9,17,12,.58)` / `.72` | `#13211A` / `#0F1C15` | white only |

- `glass.rim`: dark `rgba(255,255,255,.10)`, light `.90`.
- `glass.edge`: dark `rgba(0,0,0,.60)`, light `rgba(12,26,19,.08)`.
- `glass.blur` is **16px** (was 24). `blur-strong` becomes an alias of it.
- `glass.saturate` is **1.5**.
- P3's regular .66 is vetoed (V7): it measures 3.64 for ink-2 over the moon.

### 2.4 Scene palette (`--sc-*` in 45-living.css; living owns it; derive from tokens with `color-mix()` where possible)
| Var | Night | Dawn | Var | Night | Dawn |
|---|---|---|---|---|---|
| sc-star | `#DDEBF5` | `#FFFFFF` (layer opacity 0) | sc-mid | `#0B2820` | `#7C9A8C` |
| sc-moon (orb) | `#E4EEF2` | `#FFE2AE` | sc-near | `#04150F` | `#456B5A` |
| sc-halo | `#CFE6EE` | `#FFC46E` | sc-fore | `#010806` | `#21402F` |
| sc-far1 / far2 | `#1B3746` / `#13293A` (tonal fill, J3 #2) | `#AEB8CF` / `#C4C6D6` | sc-rim / forerim | `rgba(127,235,176,.75)` / `.38` | `rgba(255,238,210,.85)` / `rgba(255,230,200,.35)` |
| sc-farrim | `rgba(170,215,235,.55)` | `rgba(255,236,214,.9)` | sc-surf | `#6FE0D2` | `#FFFFFF` (vignette strokes use brand-2 in light) |
| sc-w1 / w2 | `#0C2A33` / `#03110D` | `#EBD9CC` / `#A8C3C6` | sc-fly | `#E6FFA3` | `#FFE7B8` |
| sc-glint | `#CDEBF2` | `#FFF4DC` | sc-mist | `rgba(111,224,210,.10)` | `rgba(255,255,255,.55)` |
| sc-ray | `rgba(110,240,190,.085)` | `rgba(255,255,255,.16)` | stars-o / moon-y / full-o | `1` / `0%` / `.07` | `0` / `30%` (sun rises behind the range) / `1` |

## 3. Contrast (recomputed by script; 558 checks, 0 fails)
- **Script:** `scratchpad/direction/S1/contrast.mjs`. It uses WCAG 2 relative luminance with alpha compositing, and its single source is `palette.mjs`.
- **Scope:**
  - every text token on every content surface (each card gradient stop, and each stop under the spotlight peak);
  - hero copy on every sky stop composited with each aurora at full alpha;
  - every fill (regular, thick, chrome, media) composited over the art extremes (moon or sun, firefly or foam, surf glow, darkest ridge, far range), with no blur credited;
  - deep bands under the CTA blob peaks with the fixed scrim;
  - two-tone focus on every surface (best tone ≥ 3, ring vs halo ≥ 3);
  - toggle state dots against the pill.
- **Minimums:**

| | Dark min | Light min |
|---|---|---|
| Text on content surfaces | 5.10 (ink-3 on card-hi + spotlight) | 4.95 (brand-2 on bg-tint) |
| Hero copy on sky + aurora | 5.04 | 5.59 |
| Fills over art, no blur | 4.51 (ink-3 on regular over firefly) | 4.59 (ink-3 on chrome over the fir ridge) |
| Focus, best tone | 5.33 | 3.80 (over the far range) |
| Ring vs halo | 10.30 | 7.55 |
| line-strong (non-text) | 3.08 | 3.45 |
| Toggle dot vs pill | 6.67 | 7.79 |

**Forbidden pairs.** These are never rendered; each is prevented by the layout rule named in the table, and `text-over-media.mjs` enforces it:

| Theme | Pair | Ratio | Rule |
|---|---|---|---|
| light | ink-2 over far range `#AEB8CF` | 4.32 | **H1: hero copy never overlaps land** |
| dark | ink-2 over `rgba(12,24,19,.66)` over moon | 3.64 | V7: no regular .66 |
| dark | ink-2 over ultrathin over moon | 1.60 | no text on ultrathin/thin over art |

The full matrices are in Appendix A. ds-core ports this exact scope into `brand/check-contrast.mjs`. The old script resolves only `{color.*}` references, so it must also follow the new `{focus.ring}` alias.

## 4. Focus ring (mandatory, T0)
```css
:focus-visible{ outline:2px solid var(--focus-ring); outline-offset:2px;
  box-shadow:0 0 0 6px var(--focus-halo), 0 0 24px 6px var(--focus-glow); }
.on-deep :focus-visible{ outline-color:var(--focus-ring-on-deep);
  box-shadow:0 0 0 6px var(--focus-halo-on-deep), 0 0 24px 6px rgba(201,193,255,.45); }
@media (forced-colors: active){ :focus-visible{ outline:2px solid Highlight; box-shadow:none; } }
```
- **The sandwich** (P3 shape, P1 colours). The halo shows at 0–2 px and 4–6 px around a 2 px ring. On light fills (the moss button, the moon, dawn sky) the dark halo carries the contrast; on dark fills the light ring does. Both are proven on every surface in §3.
- **Never removed, never `outline:none`.** Components that clip (overflow:hidden capsules) keep the ring on the focusable element itself, never on an inner child.
- `scroll-padding-top` equals `--layout-header-h(-sm)` + 8px, and `scroll-padding-bottom` equals the sticky bar height + 8px, so focus is never obscured (2.4.11).

## 5. Type
- **Faces.** Inter Variable (opsz auto, wght 400–720) for everything. **Newsreader italic** is used for client quotations **and one accent phrase per page**, which goes in the H1 or display line and is mirrored by the CTA band line. This is the ruling on C3's "Newsreader only in quote blocks" (see §11): J3 and J1 both prefer it to gradient text.
- **Fonts budget:** 2 files, 75.7 KB (Inter 39.3 KB + Newsreader 36.4 KB), within the ≤ 110 KB limit.
- **Loading** (J2 V3):
  - both faces are preloaded;
  - Inter uses `font-display: swap` with the metric-matched Arial fallback that already exists;
  - **Newsreader uses `font-display: optional`**, so the accent phrase can never swap after first render and shift the hero;
  - ds-core adds `display` and `preload` support to `ca.rnc.fontFaces` in generate().
- **Scale** (C3 targets, 360 → 1440, mapped onto the existing token names):

| Role | Token | Value | Weight / tracking / leading |
|---|---|---|---|
| display (home H1) | font.size.display | `clamp(2.5rem, 1.833rem + 2.963vw, 4.5rem)` | 700 / −.036em / 1.02, `text-wrap:balance`, max 13.6em, `"opsz" 32` |
| h1 (inner titles) | font.size.large-title | `clamp(2rem, 1.583rem + 1.852vw, 3.25rem)` | 680 / −.03em / 1.06 |
| h2 | font.size.title-1 | `clamp(1.5rem, 1.25rem + 1.111vw, 2.25rem)` | 680 / −.028em / 1.06 |
| feature-card title | font.size.title-2 | `clamp(1.25rem, 1.083rem + 0.741vw, 1.75rem)` | 660 / −.02em |
| h3 | font.size.title-3 | `clamp(1.25rem, 1.167rem + 0.37vw, 1.5rem)` | 640 / −.02em / 1.15 |
| lede | font.size.lede | `clamp(1.125rem, 1.042rem + 0.37vw, 1.375rem)` | 400 / −.006em / 1.5, max 34em |
| body | font.size.body | `clamp(1.0625rem, 1.042rem + 0.093vw, 1.125rem)` | 400 / −.006em / **1.6**, 65ch |
| small | font.size.small (NEW) | `.875rem` | 400–520 |
| label | font.size.footnote | `.8125rem` | 560–600, **sentence case**, +.02em |

- **Accent phrase.** `em.accent{font:italic 500 1.06em/1 var(--font-family-serif); color:var(--color-brand); text-shadow:0 0 28px var(--glow-moss)}`. On deep bands it uses `accent-on-deep`. Under forced-colors it gets `color:CanvasText; text-shadow:none`. Rules:
  - **never** a gradient fill (J1 must-fix 2);
  - never more than one per heading;
  - never in body copy.
- **Numerals.** Use tabular figures in spec strips and section numbers. There are no numerals on list items, spec cells or card titles (J1 must-fix 1).

## 6. Layout, grid and bento grammar
- **Containers:**
  - `--layout-content-max` is 1200px, with the gutter `clamp(1rem, .583rem + 1.852vw, 2.25rem)`, which gives 16px at 320 and 360;
  - the hero, the CTA band and the page sections **share one left edge** (J3 flagged P3's 40/120 mismatch);
  - the section rhythm is `clamp(4rem, 2.667rem + 5.926vw, 8rem)`.
  - **Footer gap (J3 #6):** the last section above the footer has its bottom padding capped at `clamp(3rem, 6vw, 5rem)`. That closes the dead air.
- **Breakpoints:** 40em, 64em and 80em. Every card or tile is a `container-type:inline-size` unit and reflows with `@container`. There is one DOM per component.
- **Numbered section heads.** Each head is a pill (`01`), then a sentence-case label, then a 120px hairline fading from brand, then the H2 (max 46rem), then the lede in ink-2. Numbers run 01–n per page **in DOM order with no gaps** (J1 #8). They are decorative: the heading text carries the meaning. **No right-aligned counts** and no data badges. A true count such as "13 municipalities" goes in prose (J1 #1 overrides J3's count suggestion).
- **Bento (home services):**
  - **Grid.** 1 column below 40em, 2 columns at 40em with the feature card spanning both, and 4 columns at 64em with `grid-auto-rows:minmax(200px,auto)`. Gap 14px. Radii are concentric: 26px outer, 18px inner.
  - **Order.** DOM order = reading order = visual order:
    1. Grounds maintenance (feature, 2×2);
    2. Landscape installation (tall, 1×2);
    3. Irrigation;
    4. Tree and vegetation;
    5. **Not sure which?** (links to `/free-quote/`);
    6. **Where we work** (2–3 columns wide: 13 named chips plus a constellation of dots, §9.1);
    7. **How we work** (full row: Local rules, handled / A written scope / One contact, from home.json).
  - **Card anatomy.** An art well (a living vignette, never empty, J3 #4), then the H3, then one sentence, then a 40px "go" chip. The whole card is clickable through the link's `::after`, and the link text is the accessible name.
  - **Stage.** A static "stage" sits behind the grid gaps: pre-blurred moss and sea glows plus a radial-masked 48px hairline grid (P3). It is never animated and never behind text.
- **Spec strip.**
  - It is a `<dl>`: 2 columns, 4 from 40em.
  - The `dt` is ink-3 at 13px in sentence case; the `dd` is ink 600.
  - Separators are a 1px brand → transparent "filament", plus an optional CSS ruler-tick hairline across the top (P2, decoration only, with no numbers).
  - Fields come only from content: municipality, service, client type, duration, season and plant palette.
  - "Sample project" chips (placeholder colours) sit next to the content they label.
  - **No budgets, invented areas or invented counts.**
- **Deep bands.** The CTA band and the footer use the `.on-deep` scope in both themes. It re-declares the dark brand, ink, focus and placeholder values locally, so a dawn page shows a window into the night forest.

## 7. Glass vs solid (resolves C3 against "Web3 glass")
| Surface | Material | Blur | Why |
|---|---|---|---|
| Header capsule | chrome | **only** when `html[data-scrolled]:not([data-header-over-living])` | L1: blur over animation costs 4.2× compositor work and drops 55 → 42 fps (J2 V2) |
| Sticky bar | thick | never | it can cross the CTA band blobs |
| Desktop disclosure menus | thick | never | they drop over the live hero |
| Mobile sheet | bg-elevated | n/a | full height; the page behind is `inert` |
| Hero "Call" / secondary buttons over the scene | thick | never | V2 (P1's `.btn-glass`) |
| Next-step card over the sky | thick | never | contrast is proven over the moon, aurora and firefly |
| Content cards, bento, spec strip, FAQ, quote form | **lit solid** (`surface.card`) plus rim, edge and sheen | n/a | C3: predictable contrast; the glass look at zero cost |
| Chips over art ("Illustration") | media-strong | never | white ≥ 5.28 |

- **Budget:** at most 1 `backdrop-filter` element per mobile viewport (the cap is 3); blur ≤ 16px; saturate 1.5.
- **Accessibility fallbacks:**
  - under `prefers-reduced-transparency` or `prefers-contrast: more`, every material is solid and the stage, grain and card gradients flatten;
  - under `forced-colors`, the art is hidden and system colours apply.

## 8. The living-landscape scene system (owner: living)

### 8.1 Anatomy
Each scene is a `div[data-living].scene` with `aria-hidden="true"`, a visible "Illustration" chip, and `position:absolute; inset:0; overflow:hidden; contain:paint`. It holds the layers below, back to front. Each layer is **an HTML wrapper div with one outer `<svg>` inside**: the wrapper owns `translate` (T4 parallax) and `scale` (T1 dolly), and the inner svg owns `transform`/`opacity` (T2). No element has two writers of one property, and inner nodes are never animated. All layers share `viewBox 0 0 1600 400` with `preserveAspectRatio="xMidYMax slice"` inside a land box `width:max(100%,1360px); aspect-ratio:4/1` (mobile: `width:960px`).

| # | Layer | Night | Dawn | Motion (hero) |
|---|---|---|---|---|
| 0 | Sky | static CSS gradient on the scene root (sky-top → sky-mid 52% → sky-low) | mist blue → peach | none |
| 1 | Aurora wrap (2 divs: ellipses + masked rays) | moss, sea, camas fringe | peach, honey, lilac wash + light shafts | T2 drift 38s (1 loop) |
| 2 | Stars A/B | round-cap dots, **masked to 10% behind the copy column** (P2) | opacity 0 | T2 twinkle on A (1 loop) |
| 3 | Moon / sun | crescent + earthshine + halo | full disc rises behind the Olympics (`moon-y:30%`) | none |
| 4 | Far + mid ranges | **tonal fills**, moonlit rim, atmospheric perspective (J3 #2) | lilac with a pink rim | T1 dolly via wrapper |
| 5 | Water + moon column + glints A/B | | gold glints | T2 cross-fade + 10–14px slide (2 loops) |
| 6 | Ridge contours (2–4 paths) | glowing sea-glass; glow baked as a wider low-opacity stroke | ink-teal hairline, no glow | T1 one-shot draw after idle |
| 7 | Mist | sea-glass 10% | fog bank 55% | T2 drift 70s (1 loop) |
| 8 | Near shore + firs + **bioluminescent surf** (one path, 3 `<use>` strokes) | glowing surf | white foam | none |
| 9 | Fore firs + moss rim (+ mobile-only fore stand, §8.4) | | | none |
| 10 | Fireflies A/B (radial-gradient dots) | glowing ≤ 0.5 Hz | gold dew motes at 55% | T2 pulse + drift (2 loops) |
| 11 | Seam | mist band + fore-ridge silhouette fading into `--color-bg`; **never a straight cut** (J3 #1) | | none |

- **Hero loop count:** 7. The cap is 8, and the spare slot is not spent in the hero.
- **Hero bytes:** ≤ 16 KB raw (P1 measured 14.7 KB / 4.6 KB gz).
- **Byte techniques:**
  - 13 pre-sized fir `<symbol>`s placed with `x`/`y`;
  - stars as zero-length round-cap strokes;
  - surf as one path drawn 3×;
  - ids namespaced `sc-<sceneId>-`;
  - a seeded RNG (reuse `hash`/`rng` from art.mjs), so bytes are deterministic.

### 8.2 Rules
1. **Copy never overlaps land.** The hero copy's `padding-bottom` is `land-h × .95` at ≥ 40em and `× .66` below. The hero has `min-block-size:max(100svh,640px)` and its content must fit it at 390 × 844. The scene is absolutely positioned and never sized by the copy (J2 V3). text-over-media checks it at scroll 0 and at 50% of the hero.
2. **The H1 is the LCP element** and is never animated. No layer animates before `load`. T2 starts after load + idle.
3. **Theme change swaps custom properties only:** there is one DOM, and the classes `.f-*`, `.s-*` and `.st-*` map to `--sc-*`.
4. **Light-theme vignette strokes** use brand-2, not `--sc-surf` (white on pale sky is invisible).
5. **No filters on the scene.** No `filter:blur`, no `drop-shadow`, no blend modes. Glows are pre-drawn gradients or second strokes.

### 8.3 Variation
**13 area scenes** (`livingScene('area:<slug>')`, ≤ 12 KB raw, ≤ 5 loops) take the art.mjs `AREAS` recipe (water / distant / trees / horizon / orb x) and add one landform cue from public geography. These are illustrations, never captions or claims:

| Area | Recipe | Cue |
|---|---|---|
| victoria | sea · range | wide strait, Olympics, low rocky point |
| saanich | lake · hills | lake with rolling farm-field strips |
| oak-bay | sea · range | Garry oak silhouettes among firs on the shore |
| esquimalt | sea · range | narrow harbour inlet |
| langford | lake · hills | dense fir hills around a lake |
| colwood | sea · range | lagoon spit with a low shoreline |
| view-royal | sea · hills | sheltered inlet between hills |
| sooke | sea · range | the tallest firs, the most open strait |
| central-saanich | none · hills | field strips and hedgerows, no water |
| north-saanich | sea · islands | Gulf Islands chain |
| sidney | sea · islands | low shoreline, islands close in |
| highlands | lake · hills | rock outcrops and fir, no sea |
| metchosin | sea · range | pastoral meadow, scattered oaks |

**Per-service motifs** (service-nocturne hero foreground and bento vignettes, drawn in the hero's hand):

| Service | Motif |
|---|---|
| grounds-maintenance | mown stripes and a clipped hedge line |
| landscape-installation | flagstone path and terraces with blooms (camas-coloured dots allowed in art only) |
| irrigation | drip line with droplets and two spray arcs, emitters glowing |
| tree-vegetation | one lit fir with a clean pruning cut, tree-ring cross-section, a chip pile |

**Per-project art** (`projectArt(project)`) uses the cottage-with-lit-windows template from P3, redrawn in P1's hand: stone path, beds, firs. It is seeded by slug and coloured by season (`season` field), so `/projects/` has **no stock photos**.

**The P3 frame-break motif is allowed in one place only:** on the featured-project card, one slim fir with a moonlit rim crosses the card's top edge by 24–40px. Never in the home hero, never as black spikes.

### 8.4 Mobile composition (J3 #3)
At < 40em the land box is 960px wide, so the visible crop is viewBox x ≈ 475–1125. That band must hold a complete composition:
- headland shoulders on both sides;
- a fir stand on at least one edge;
- the surf line;
- fireflies.

Add a mobile-only static fore layer (`display:none` ≥ 40em; no loop). Scale the far range `scaleY(.8)` from the bottom, which is static, so peaks stay under the copy. The target is that the scene fills ≥ 30% of a 390 × 844 first viewport with recognisable land, not just water. The specimen reaches 30% coverage, but the crop still reads mostly as water, so living must author this band. See "Known gaps".

### 8.5 How `art.mjs` evolves (owner: living, W2)
- **Keep** `landscapeSvg(id, aspect, o)` for static file art: OG cards and `<img>` fallbacks in RSS or email. Add a `theme:'night'|'dawn'` option that bakes the §2.4 palettes, because files cannot read CSS variables.
- **Add** to the same module:
  - `sceneLayers(recipe, {seed, layers, mobileFore})`, which returns the layer svgs as strings with class hooks only and no colours;
  - `vignette(kind, seed)` (services, "Not sure?", "Where we work", how-we-work icons);
  - `contourPlate(tiles, {rings:3, labels:true})`, using `map.mjs` `TILES` and inset rings, for the area plate, the CTA band rings and the 404.
- **`components/living.mjs`** (frozen signatures) composes them: `livingScene(sceneId, o)`, `projectArt(project, o)`, `illustrationChip()`. A page emits the `<symbol>` defs once.
- **Tests:**
  - byte budgets per scene (16 / 12 / 10 KB raw; vignettes ≤ 1.5 KB; page inline SVG ≤ 45 KB);
  - snapshot determinism;
  - id uniqueness across two scenes on one page;
  - "no inline colour" (fills come from classes).

## 9. Signature moments per template
**On every page:**
- the two-tone focus ring;
- the theme "moonrise" reveal;
- a 250ms cross-document crossfade with an H1 morph;
- IO one-shot section reveals below the fold;
- the deep CTA band with a living blob loop and the Newsreader line;
- the footer honesty line.

| Template | Signature moment | Effects (ids in effects-approved.json) | Calm rule |
|---|---|---|---|
| **Home** | Full-bleed living night cove; the Newsreader-italic "*Greater Victoria*" glows on open sky; the land settles in (dolly) and 2–4 contour lines draw along the headland after idle; at ≥ 64em a lit-solid **Next step** link card floats over the sky as a second depth plane. Bento with cursor spotlight and moss→sea→honey rim. **Where we work** constellation. Featured sample project with the frame-break fir. CTA band with **one** rotated conic comet ring on its primary button and the trust line. | living-hero, hero-dolly, scene-parallax, ridge-contours, hero-seam, next-step, spotlight, edge-glow, lift, stage, lit-solid, where-we-work, art-wells, cta-band, conic-ring, grain | ≤ 7 loops in the hero viewport; sticky bar hidden while hero CTAs are visible |
| **Services hub** | 4 large lit-solid service cards, each with its motif vignette; a "Good fit if…" strip | art-wells, spotlight, edge-glow | no hero loops beyond 4 |
| **Service page** | **Service nocturne** hero (4 layers + motif foreground, ≤ 4 loops); sticky TOC (≥ 64em) with a **firefly marker** on the active section; seasonal table as a spec strip; local-rules callout linking to area pages | service-nocturne, toc-firefly | TOC marker is T0 only |
| **Areas hub** | **Contour plate map**: 13 real `TILES` as nested contour hills, **municipality names on the plate**, "Schematic, not to scale", water labels in Newsreader; hover or focus a list item → that tile glows (instant) and its rings brighten; a current-area pulse is an HTML glow box | area-map, plate-draw | the list is the only keyboard path; tiles `tabindex=-1` |
| **Area page** ×13 | Distinct area scene (§8.3); **"You are here" plate**: the area's own tile at hero scale, inset rings drawn once, one marker pulse, neighbours as hairlines; local-rules callout with source, verify flag and "last reviewed" date | area-scenes, plate-draw, area-map (pulse) | regional rules render once inside `[data-shared]` |
| **Projects** | Filter by service × municipality (links work without JS; with JS a 250ms same-document VT re-sort); per-project art thumbs with "Illustration" and "Sample project" chips | projects-filter-vt, art-wells | count announced politely |
| **Case study** | Card title morphs into the H1 (cross-doc); spec strip with filaments; challenge / approach / result; keyboard before/after with a side-by-side toggle | xdoc-vt, before-after, lit-solid | no budgets |
| **Process** | **Path of fireflies**: one spine draws once as the timeline enters; each step node lights once; two tracks (maintenance, installation) | process-path | step numbers are labels |
| **About / Reviews / FAQ / Contact** | Lit-solid editorial cards; reviews in Newsreader italic with a **"Sample review"** chip and a "Read all reviews on Google" link (text plus chip until `[GOOGLE PROFILE]` resolves); FAQ `<details>` with a T0 chevron; contact panel with `tel:`/`sms:`/`mailto:` | lit-solid, edge-glow | no stars, ratings, counts or Review schema |
| **Free quote** | **Calm by design**: a still scene (`data-still`, 0 loops) behind the header only; the lit-solid form; the reassurance strip "Free, no obligation · We get back to you within [REPLY TIME] · No prices shown: every quote is site-specific"; the ready panel enters once | quote-calm | nothing moves near inputs; sticky bar hidden while the form is in view |
| **Guides** | Reading-progress **moss filament** under the header (T4); byline "[OWNER NAME], RNC Landscaping"; a small 2-layer header strip with no loops | reading-progress | |
| **Legal** (privacy, terms, accessibility) | Plain editorial, solid surfaces, no scene. The accessibility statement documents the two toggles and the motion policy | — | 0 loops |
| **404** | **"Off the map"**: the 13-tile contour plate with no marker, a hairline compass rose, links to areas and services | off-the-map | static |
| **/styleguide/** (showcase only, noindex) | Every primitive in both themes, the motion tiers side by side (on / off / reduce), the focus ring on every surface, and both conic rings (the only page allowed 2) | all | demonstrates fallbacks |

### 9.1 "Where we work" tile (home)
- **Content:** "Thirteen municipalities across Greater Victoria, Sidney to Sooke", then **13 chip links** in a fixed order: Victoria, Saanich, Oak Bay, Esquimalt, View Royal, Central Saanich, North Saanich, Sidney, Langford, Colwood, Highlands, Metchosin, Sooke.
- **Constellation:** an aria-hidden constellation of 13 dots placed from real lon/lat (P3). `:has(a:hover, a:focus-visible)` lights the matching dot with T0.
- **Keyboard path:** the chips are the keyboard path.

## 10. Approved effects (summary; `effects-approved.json` is normative)
| id | Tier | Budget gz | Fallback | A11y note | Owner |
|---|---|---|---|---|---|
| focus-ring | T0 | 0.3 KB | system outline (forced-colors) | mandatory; best tone ≥ 3 everywhere | ds-core |
| motion-gate | T0–T4 | 0.9 KB | static | 2.2.2; 0 loops when off or reduce | ds-core |
| living-hero | T1+T2 | 6.3 KB | static composed frame | aria-hidden, chip, copy never on land | living |
| hero-dolly | T1 | 0.2 KB | none | transform only | living |
| scene-parallax | T4 | 0.4 KB | static | ≤ 15% amplitude; off when motion is off | living |
| ridge-contours | T1 | 0.5 KB | drawn | ≤ 4 paths, after idle | living |
| hero-seam | static | 0.3 KB | — | — | living |
| art-wells | static | 0.6 KB each | — | chip where photo-like | living |
| area-scenes | T2 | 4.0 KB | static | ≤ 5 loops | living |
| service-nocturne | T2 | 3.0 KB | static | ≤ 4 loops | living |
| reveal-io | T1 | 0.4 KB | visible | never from 0, never first viewport | living |
| spotlight | T3 | 0.4 KB | none | fine pointer + motion on | living |
| edge-glow | T0/T3 | 0.3 KB | hairline | no violet | ds-comp |
| lift | T0 | 0.1 KB | none | | ds-comp |
| conic-ring | T2 | 0.3 KB | static rim | 1 per page (max 2), never `@property` | ds-comp |
| cta-band | T2 | 1.1 KB | static blobs | on-deep-2 ≥ 8.8 over blob peaks | ds-comp |
| grain | static | 0.9 KB | removed (contrast or transparency preference) | | ds-comp |
| stage | static | 0.3 KB | removed | never behind text | ds-comp |
| lit-solid | static | 0.4 KB | flat | | ds-comp |
| glass-header | T0 | 0.4 KB | fill only | blur only past the hero and off living art | ds-chrome |
| pref-toggles | T0 | 0.7 KB | hidden without JS | shape cue + aria-pressed | ds-chrome |
| theme-reveal | T1 | 0.4 KB | instant | focus stays on the toggle | ds-chrome |
| xdoc-vt | T1 | 0.4 KB | instant | ≤ 3 names, 250ms, reduce-gated | ds-chrome |
| sticky-bar | T0 | 0.6 KB | always shown (no JS) | 48px, safe-area, 2.4.11 | ds-chrome |
| where-we-work | T0 | 0.9 KB | static | chips are the path | t-home |
| next-step | static | 0.3 KB | — | real link | t-home |
| area-map | T0+T2 | 1.2 KB | static highlight | one keyboard path | t-areas |
| plate-draw | T1 | 0.4 KB | drawn | IO, ≤ 12 paths | t-areas |
| projects-filter-vt | T1 | 0.4 KB | instant | focus kept, count announced | t-projects |
| before-after | T0+T1 | 0.6 KB | side by side | named range | t-projects |
| process-path | T1 | 0.5 KB | drawn and lit | | t-company |
| toc-firefly | T0 | 0.2 KB | underline | aria-current | t-services |
| reading-progress | T4 | 0.2 KB | hidden | aria-hidden | t-editorial |
| off-the-map | static | 0.8 KB | — | | t-editorial |
| quote-calm | T0/T1 | 0.1 KB | — | nothing moves near inputs | quote |

**Page budget check (home, worst case).**
- **CSS:** the effects above that home uses total about 13.5 KB gz. Base, chrome and component CSS come to roughly 14 KB, so the total is about 27.5 KB, inside the warn line (28) and the fail line (36). Measure it in W2.
- **JS:** main + prefs + track + living.js comes to about 6 KB gz, against a 22 KB budget.

## 11. Rulings: REDESIGN v2 / C3 / brand.md restraints vs "alive"
| # | Restraint (source) | Ruling | Why |
|---|---|---|---|
| 1 | Liquid Glass only on chrome; content cards solid (C3, v2) | **Kept, and stricter than REDESIGN v3.** Cards are lit solid. Real blur sits only on the header, past the hero and off living art. | J2 V2 + L1 "avoid"; contrast is predictable |
| 2 | Remove aurora washes (v2) | Aurora returns **inside living scenes and the CTA band only**, as T2 pre-blurred gradients moved by transform | L1 safe (2.9 ms/s) |
| 3 | Remove pointer-following sheen (v2) | Returns as the **T3 spotlight**, transform version, fine pointer only | L1 ration; +43 ms/s only while the pointer moves |
| 4 | Remove tilt (v2) | **Stays removed** | banned list |
| 5 | Large real photography (C3, v2) | **Living vector art** carries imagery; photo slots stay in `media/images.json` for RNC's own photos; `/projects/` has no stock | locked user decision 2 |
| 6 | Motion 150–250ms (C3) | Applies to **T0**. `motion.duration.base` drops 260 → **220ms**. Ambient motion is T2 under the policy. | CONTRACT §9 |
| 7 | Light "Sea fog" default (v2) | **Dark-first**; light is a toggle; `prefers-color-scheme` is not consulted | D1 |
| 8 | Newsreader italic for quotations only (C3, brand.md) | **Plus one accent phrase per page** (H1/display + CTA band line), solid brand colour + moss glow, `font-display:optional`, preloaded. brand.md is updated in W5. | J1 #2, J3; replaces gradient text; J2 V3 handled |
| 9 | Inter weights 400/600/700 (C3) | Variable 400–720, used at 400 / 520 / 600 / 640–680 / 700 | same file, finer hierarchy |
| 10 | Cards lift into place as they scroll in, transform only, never opacity (brand.md) | IO one-shot reveal from `opacity:.4; translate:0 24px` (never 0, never first viewport, never LCP) | J2 V10; content stays perceivable mid-transition |
| 11 | Sentence case, no all-caps labels (brand.md) | **Kept.** Section labels and spec `dt` are sentence case (P1 used caps; builders must not copy that). | brand voice |
| 12 | Glass `blur(24px) saturate(1.8)` (brand.md) | **16px / 1.5** | L1 measured 16; J2 |
| 13 | Same-document View Transitions only (C3) | Same-document for the filter, before/after and theme reveal, **plus** cross-document at 250ms with ≤ 3 names (site-header, page-title), off under reduce or off | L1 ration; lab guidance |
| 14 | Douglas fir primary (C3, brand.md) | Light brand is unchanged `#1D4A33`. Dark brand is **bioluminescent moss `#7FEBB0`**, the same family by night. | P1 |
| 15 | Display 42 → 80px (brand.md ramp) | **C3 scale** 2.5 → 4.5rem (§5) | blueprint target |
| 16 | "12 municipalities" (C1/C6 text) | **13**, per content and `site.json` | content is the truth |
| 17 | Primary actions on dark bands are white capsules (brand.md) | On deep bands the primary is the **moss capsule** (dark brand values in `.on-deep`); white stays for photos | consistency with night palette |
| 18 | v3 allowed glass on content cards with a contrast-safe alpha | **Not used**: lit solid instead | J2 V2/V7, J1, J3 all point here |
| 19 | `@property` gradient borders "rationed, ambient on ≤ 2" (inventory) | **Ambient `@property` banned.** Use the rotated conic layer instead (≤ 2/page, 1 by default). `@property` is allowed on hover/focus only. | J2 V1 |
| 20 | `view()` reveals, scroll-scrubbed contour draws (inventory) | **Replaced** by IO one-shot classes | J2 V8/V10 |
| 21 | Magnetic CTA (optional) | **Declined** | adds little beside the spotlight (P1, P2) |

TRACEABILITY records P4 #18 and A12 #6 as "superseded on aesthetics; hard constraints kept".

## 12. Grafts considered and rejected
| Proposal item | Why not |
|---|---|
| P3 windowed home hero; giant black frame-breaking firs | J3: less immersive, crude; J1/J3: weakest mobile first viewport |
| P3 gradient-text H1 at weight 340 (fern→tide→camas) | J1 must-fix 2 / J3: reads as crypto |
| P3 H2 weight settle on scroll | J2 V4 (layout per frame, CLS) |
| P3 "Free on-site quote", "No pressure" | J1 must-fix 3: content says "free quote", "a site visit if needed", "no obligation" |
| P3 invented review text | J3 honesty flag: real `testimonials/*` text or a `[REVIEW]` chip only |
| P2 grid letters A–I/1–8, registration crosses, `S-01` codes, numbered list items and spec cells, right-aligned counts | J1 must-fix 1 (HUD grammar) |
| P2 glass instrument plate over the live hero | J2 V2; the plate moves to the areas hub, area pages and 404 as lit solid |
| P2 clinical light theme | J3: dawn from P1 instead |
| P1 `@property` comet ring on the hero CTA | J2 V1; rebuilt as a rotated conic layer on the CTA band button |
| P1 `translate` entrance on `<svg>` layers | J2 V9; replaced by `scale` on the HTML wrapper |
| P3 tile → hero cross-document morphs with names per tile | L1: ≤ 3 names; replaced by a title morph set on `pageswap` (2 names) |
| `view-transition-name: scene` (P1/J3) | L1 guidance: never name living layers |

## 13. Header: Dark theme / Animations toggles (owner: ds-chrome)
- **Markup:** `<button type="button" class="pref-toggle" data-pref="theme|motion" aria-pressed="true|false"><span class="dot" aria-hidden="true"></span><svg …/><span class="pref-label">Dark theme</span></button>`. The visible label is the only name source, so there is no `aria-label` and no doubled name (J2).
- **State cue (J2 V5):**
  - **filled dot** (brand, with a moss glow) means on;
  - **hollow ring** (1.75px ink-2) means off;
  - the dot measures ≥ 6.67 against the pill, so the state survives greyscale;
  - icon colour also changes, as a secondary cue.
- **Icons:** a moon for Dark theme and **three fireflies** for Animations (not a spark or sun: in light, the spark read as a theme control, J3 #5).
- **Sizes:**
  - **< 80em:** 44 × 44 icon buttons. The dot is a 9px corner badge (top-right) and the label is visually hidden.
  - **≥ 80em:** a pill (`dot · icon · label`) 44px tall, with a hairline ring.
  - The labels show from 80em rather than 64em, because at 64–80em the nav, both labelled pills and Free quote do not fit (measured in the specimen).
- **At 320px:** logo lockup at 24px height (120px wide, the brand minimum), the two toggles and Menu, with gaps of 2px. **No overflow** (J2 V6, measured).
- **Behaviour:**
  - The theme toggle runs the moonrise reveal (`startViewTransition` with a circular clip from the button, 520ms) only when `motionOn()`. It updates `<meta name=theme-color>` and keeps focus on the button.
  - The Animations toggle writes `rnc-motion`, flips `data-motion`, removes or adds `data-alive`, and fires `rnc:motion`.
  - Both toggles are hidden without JS.
- **Header order:** logo · nav (≥ 64em) · toggles · **Free quote** (≥ 64em; on mobile it is the first row of the sheet, with Call) · Menu (< 64em).

## 14. Sticky mobile action bar (owner: ds-chrome)
- **Where:** below 64em only. It is fixed with `inset: auto 10px calc(10px + env(safe-area-inset-bottom))` and has radius 24.
- **Surface:** **solid `material.thick`** with no blur, a glass rim on top, and a 1px line ring.
- **Buttons:** two equal **48px** buttons. "Call" is outlined and reads **"Contact"** linking to `/contact/` until `[PHONE]` resolves. "Free quote" is filled brand. Tracking uses `data-track="call_click" data-track-location="sticky_bar"`.
- **Visibility:**
  - **hidden** while the hero actions (`[data-hero-actions]`) are in view, so the first mobile viewport shows one primary CTA (J1 #6);
  - hidden while `[data-quote-form]` is in view;
  - hidden while the on-screen keyboard is open (`visualViewport` height drops by more than 150px);
  - **always shown without JS.**
- **Motion:** in and out by `translate` with `var(--dur-t0)`, instant when motion is off.
- **Focus safety:** `scroll-padding-bottom` equals the bar height + 8px.

## 15. Copy and honesty rules for every builder (J1)
- **Reply promise wording:** "We get back to you within [REPLY TIME] to ask any questions and arrange your free quote." It never says "with a written scope". The written quote comes after.
- **Banned phrases:** "on-site quote" and "no pressure". Use "free quote", "a site visit if needed" and "no obligation". qa's `check-honesty` flags these phrases and "reply … written scope".
- **Trust line:** "Reply within [REPLY TIME] · No obligation · 13 municipalities, Sidney to Sooke".
- **Footer:** every footer carries "Illustrations are drawn art, not photos of RNC projects."
- **Maps:** every map names the municipalities and says "Schematic, not to scale".
- **Sample labels:** "Sample project" and "Sample review" chips sit next to what they label. No stars, ratings, review counts, prices, budgets, year counts, counters or HUD readouts.
- **Links and buttons:** anything that looks like a button is a link or a button. The Next-step card links to `/free-quote/`.

## 16. Do / don't for agents
**Do**
- Read tokens from CSS custom properties; put living colours in `45-living.css` as `--sc-*`.
- Animate only `transform` and `opacity`, on the layer anatomy in §8.1, through the hooks in motion-policy.md. Mark every infinite animation with `[data-t2]`.
- Start ambient motion only under `html[data-alive]`, and pause it with `--alive-play`.
- Use `prefs.motionOn()` / `onMotionChange()` in scripts.
- Keep hero copy on sky. Measure the worst pixel at 320/390/1024/1440 in both themes.
- Put "Illustration" chips on art, and "Sample" chips on samples.
- Use container queries and one DOM per component, and verify 320px reflow in both themes.
- Size every scene independently of text, reserve space for every image, and keep CLS ≤ 0.05 at 4× with fonts delayed.
- Use lit-solid surfaces for content, and fill-only materials over art.
- Keep camas violet for focus only (art may use it as aurora fringe or camas blooms).

**Don't**
- Animate `@property`/custom properties, `filter`, `backdrop-filter`, `font-*`, layout properties or `stroke-dashoffset` in a loop or on a scroll or view timeline.
- Use SMIL, JS rAF style loops, `filter:blur()` on moving things, or `translate`/`scale` on `<svg>` elements.
- Put `backdrop-filter` over anything animated, at any width. Use more than 1 blurred element per mobile viewport.
- Write `prefers-reduced-motion` outside tokens.css and 95-motion.css. Write a raw duration in component CSS.
- Use gradient text, teal→violet gradients on copy, HUD grammar (grid letters, crosshairs, codes, numbered list items, counts as badges), counters, tickers, marquees, typewriter, glitch, custom cursors, loaders, carousels, autoplay video, Lottie, WebGL/canvas or tilt.
- Start any animation before `load`, or put any reveal or entrance on the H1/LCP or in the first viewport.
- Name living layers or images in view transitions, or use more than 3 cross-document names.
- Invent RNC facts, prices, budgets, ratings or reviews. Use stock photos on `/projects/`.

## 17. Known gaps (what the specimen does not prove yet; owners carry them)
1. **Mobile scene composition** (living). The 390 crop now covers about 30% of the viewport but still reads as mostly open water. The §8.4 central band must be authored (headland shoulders, a fir stand, surf, fireflies).
2. **CTA band right half** (ds-comp). It is empty in the specimen. Add the static contour rings from 3 real `TILES`.
3. **Featured-project art** (living). It is still P1's moon-and-range plate; replace it with the cottage template (§8.3).
4. **"Where we work" constellation dots** (t-home). They are not drawn in the specimen; only the chips are.
5. **Uppercase labels** (ds-comp). They come from the P1 base; switch to sentence case (§11 #11).
6. **Footer dead air** (ds-comp, t-home). It is still present in the specimen; cap the bottom padding as in §6.
7. **WebKit** (W4 evidence). L1 measured Chromium only, so the outer-box rule stays for WebKit safety, and the evidence pack includes a Safari/WebKit run if available.

## 18. Specimen screenshots (S1 hybrid, DPR 1)
These are in `/tmp/claude-0/-home-user-Rnc-landscaping-web/5110250c-2871-5a49-ba20-c506ac0ea22b/scratchpad/direction/S1/spec/`:
- **Viewport shots:** `s1-{dark,light}-{390,1440}-motion.png` are the first viewport about 2 s after load with motion on.
  - At 1440, the dark shot shows the sandwich focus ring on the logo after one Tab.
  - At 390 the hero copy, the CTA, Call and the trust ticks sit above the fold, and the toggles' filled and hollow dots show state.
- **Full pages:** `s1-{dark,light}-{390,1440}-static.png` are full pages with Animations off, which is the reduced-motion and no-JS frame.
- **Crops:** `crop-{dark,light}-bento.png` and `crop-dark-band.png`. `s1-390-pair.png` puts dark and light side by side at 390.

## Appendix A: contrast matrices (every check from `contrast.mjs`; "·" means the pair is not used)

**Text and UI on content surfaces (min 4.5 text, 3 line-strong), dark** (136 checks, min 3.08)

| Surface | ink | ink-2 | ink-3 | brand | brand-2 | placeholder | success | error | line-strong | brand-ink | on-deep | on-deep-2 | accent-on-deep | placeholder (dark) on chip | brand-ink (dark) on band button |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bg | 17.00 | 10.86 | 8.56 | 13.18 | 12.14 | 11.75 | 11.14 | 8.71 | 4.23 | · | · | · | · | · | · |
| bg-elevated | 15.43 | 9.86 | 7.77 | 11.97 | 11.02 | 10.67 | 10.11 | 7.90 | 3.84 | · | · | · | · | · | · |
| bg-grouped | 17.77 | 11.35 | 8.95 | 13.78 | 12.69 | 12.28 | 11.64 | 9.10 | 4.42 | · | · | · | · | · | · |
| bg-tint | 13.55 | 8.66 | 6.82 | 10.51 | 9.68 | 9.37 | 8.88 | 6.94 | 3.37 | · | · | · | · | · | · |
| card stop 1 | 14.40 | 9.20 | 7.25 | 11.17 | 10.28 | 9.96 | 9.44 | 7.38 | 3.59 | · | · | · | · | · | · |
| card stop 2 | 15.85 | 10.13 | 7.98 | 12.30 | 11.32 | 10.96 | 10.39 | 8.12 | 3.95 | · | · | · | · | · | · |
| card stop 3 | 16.53 | 10.56 | 8.32 | 12.82 | 11.80 | 11.43 | 10.83 | 8.47 | 4.11 | · | · | · | · | · | · |
| card-hi stop 1 | 12.39 | 7.92 | 6.24 | 9.61 | 8.85 | 8.57 | 8.12 | 6.35 | 3.08 | · | · | · | · | · | · |
| card-hi stop 2 | 15.15 | 9.68 | 7.63 | 11.75 | 10.82 | 10.48 | 9.93 | 7.76 | 3.77 | · | · | · | · | · | · |
| card-hi stop 3 | 16.29 | 10.40 | 8.20 | 12.63 | 11.63 | 11.26 | 10.67 | 8.34 | 4.05 | · | · | · | · | · | · |
| card stop 1 + spotlight peak | 11.90 | 7.60 | 5.99 | 9.23 | 8.50 | 8.23 | 7.80 | 6.10 | · | · | · | · | · | · | · |
| card-hi stop 1 + spotlight peak | 10.14 | 6.48 | 5.10 | 7.86 | 7.24 | 7.01 | 6.64 | 5.19 | · | · | · | · | · | · | · |
| placeholder-bg over bg | · | · | · | · | · | 8.98 | · | · | · | · | · | · | · | · | · |
| placeholder-bg over bg-elevated | · | · | · | · | · | 7.91 | · | · | · | · | · | · | · | · | · |
| brand (button) | · | · | · | · | · | · | · | · | · | 13.00 | · | · | · | · | · |
| brand-hover | · | · | · | · | · | · | · | · | · | 14.91 | · | · | · | · | · |
| bg-tint (chip) | 13.55 | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| deep | · | · | · | · | · | · | · | · | · | · | 20.19 | 11.52 | 15.36 | · | · |
| deep + chip | · | · | · | · | · | · | · | · | · | · | · | · | · | 9.78 | · |
| brand (dark) button | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 13.00 |
| deep-2 | · | · | · | · | · | · | · | · | · | · | 17.35 | 10.35 | 13.20 | · | · |
| deep-2 + chip | · | · | · | · | · | · | · | · | · | · | · | · | · | 7.88 | · |
| band: blob 1 peak + scrim | · | · | · | · | · | · | · | · | · | · | 14.17 | 8.81 | 10.78 | · | · |
| band: blob 1 peak + scrim + chip | · | · | · | · | · | · | · | · | · | · | · | · | · | 6.33 | · |
| band: blob 2 peak + scrim | · | · | · | · | · | · | · | · | · | · | 14.99 | 9.20 | 11.40 | · | · |
| band: blob 2 peak + scrim + chip | · | · | · | · | · | · | · | · | · | · | · | · | · | 6.75 | · |
| band: blob 3 peak + scrim | · | · | · | · | · | · | · | · | · | · | 16.59 | 10.00 | 12.62 | · | · |
| band: blob 3 peak + scrim + chip | · | · | · | · | · | · | · | · | · | · | · | · | · | 7.42 | · |

**Text and UI on content surfaces (min 4.5 text, 3 line-strong), light** (136 checks, min 3.45)

| Surface | ink | ink-2 | ink-3 | brand | brand-2 | placeholder | success | error | line-strong | brand-ink | on-deep | on-deep-2 | accent-on-deep | placeholder (dark) on chip | brand-ink (dark) on band button |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bg | 16.42 | 7.88 | 6.05 | 9.26 | 5.60 | 6.34 | 5.74 | 6.03 | 3.90 | · | · | · | · | · | · |
| bg-elevated | 17.91 | 8.60 | 6.60 | 10.10 | 6.11 | 6.92 | 6.27 | 6.57 | 4.26 | · | · | · | · | · | · |
| bg-grouped | 15.19 | 7.29 | 5.60 | 8.57 | 5.18 | 5.87 | 5.32 | 5.58 | 3.61 | · | · | · | · | · | · |
| bg-tint | 14.52 | 6.97 | 5.35 | 8.19 | 4.95 | 5.61 | 5.08 | 5.33 | 3.45 | · | · | · | · | · | · |
| card stop 1 | 17.91 | 8.60 | 6.60 | 10.10 | 6.11 | 6.92 | 6.27 | 6.57 | 4.26 | · | · | · | · | · | · |
| card stop 2 | 17.04 | 8.18 | 6.28 | 9.61 | 5.81 | 6.59 | 5.96 | 6.26 | 4.05 | · | · | · | · | · | · |
| card stop 3 | 16.06 | 7.71 | 5.92 | 9.06 | 5.48 | 6.21 | 5.62 | 5.90 | 3.82 | · | · | · | · | · | · |
| card-hi stop 1 | 17.91 | 8.60 | 6.60 | 10.10 | 6.11 | 6.92 | 6.27 | 6.57 | 4.26 | · | · | · | · | · | · |
| card-hi stop 2 | 16.42 | 7.88 | 6.05 | 9.26 | 5.60 | 6.34 | 5.74 | 6.03 | 3.90 | · | · | · | · | · | · |
| card-hi stop 3 | 15.39 | 7.39 | 5.67 | 8.68 | 5.25 | 5.95 | 5.38 | 5.65 | 3.66 | · | · | · | · | · | · |
| card stop 1 + spotlight peak | 16.38 | 7.86 | 6.04 | 9.24 | 5.59 | 6.33 | 5.73 | 6.02 | · | · | · | · | · | · | · |
| card-hi stop 1 + spotlight peak | 16.38 | 7.86 | 6.04 | 9.24 | 5.59 | 6.33 | 5.73 | 6.02 | · | · | · | · | · | · | · |
| placeholder-bg over bg | · | · | · | · | · | 6.26 | · | · | · | · | · | · | · | · | · |
| placeholder-bg over bg-elevated | · | · | · | · | · | 6.26 | · | · | · | · | · | · | · | · | · |
| brand (button) | · | · | · | · | · | · | · | · | · | 10.10 | · | · | · | · | · |
| brand-hover | · | · | · | · | · | · | · | · | · | 12.94 | · | · | · | · | · |
| bg-tint (chip) | 14.52 | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| deep | · | · | · | · | · | · | · | · | · | · | 17.20 | 10.80 | 13.08 | · | · |
| deep + chip | · | · | · | · | · | · | · | · | · | · | · | · | · | 7.78 | · |
| brand (dark) button | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 13.00 |
| deep-2 | · | · | · | · | · | · | · | · | · | · | 12.90 | 8.47 | 9.81 | · | · |
| deep-2 + chip | · | · | · | · | · | · | · | · | · | · | · | · | · | 5.78 | · |
| band: blob 1 peak + scrim | · | · | · | · | · | · | · | · | · | · | 14.17 | 9.20 | 10.78 | · | · |
| band: blob 1 peak + scrim + chip | · | · | · | · | · | · | · | · | · | · | · | · | · | 6.33 | · |
| band: blob 2 peak + scrim | · | · | · | · | · | · | · | · | · | · | 14.99 | 9.60 | 11.40 | · | · |
| band: blob 2 peak + scrim + chip | · | · | · | · | · | · | · | · | · | · | · | · | · | 6.75 | · |
| band: blob 3 peak + scrim | · | · | · | · | · | · | · | · | · | · | 16.59 | 10.51 | 12.62 | · | · |
| band: blob 3 peak + scrim + chip | · | · | · | · | · | · | · | · | · | · | · | · | · | 7.42 | · |

**Hero copy on sky + aurora (min 4.5), dark** (30 checks, min 5.04)

| Surface | brand (accent) | ink | ink-2 |
|---|---|---|---|
| sky-top | 13.66 | · | · |
| sky-top+aurora-1 | 8.63 | 11.13 | 7.11 |
| sky-top+aurora-2 | 8.62 | 11.11 | 7.10 |
| sky-top+aurora-3 | 10.14 | 13.07 | 8.35 |
| sky-mid | 12.11 | · | · |
| sky-mid+aurora-1 | 7.11 | 9.17 | 5.86 |
| sky-mid+aurora-2 | 7.19 | 9.28 | 5.93 |
| sky-mid+aurora-3 | 8.64 | 11.14 | 7.12 |
| sky-low | 10.45 | · | · |
| sky-low+aurora-1 | 6.12 | 7.89 | 5.04 |
| sky-low+aurora-2 | 6.21 | 8.00 | 5.11 |
| sky-low+aurora-3 | 7.47 | 9.63 | 6.15 |

**Hero copy on sky + aurora (min 4.5), light** (30 checks, min 5.59)

| Surface | brand (accent) | ink | ink-2 |
|---|---|---|---|
| sky-top | 7.14 | · | · |
| sky-top+aurora-1 | 6.68 | 11.85 | 5.69 |
| sky-top+aurora-2 | 7.22 | 12.80 | 6.14 |
| sky-top+aurora-3 | 6.56 | 11.64 | 5.59 |
| sky-mid | 7.71 | · | · |
| sky-mid+aurora-1 | 6.99 | 12.39 | 5.95 |
| sky-mid+aurora-2 | 7.53 | 13.36 | 6.41 |
| sky-mid+aurora-3 | 6.91 | 12.25 | 5.88 |
| sky-low | 8.10 | · | · |
| sky-low+aurora-1 | 7.20 | 12.77 | 6.13 |
| sky-low+aurora-2 | 7.82 | 13.86 | 6.65 |
| sky-low+aurora-3 | 7.18 | 12.73 | 6.11 |

**Fills over art extremes, no blur (min 4.5), dark** (78 checks, min 4.51)

| Surface | ink | ink-2 | ink-3 | brand | on-deep |
|---|---|---|---|---|---|
| regular over orb | 9.15 | 5.84 | 4.61 | 7.09 | · |
| regular over art-bright | 8.96 | 5.72 | 4.51 | 6.95 | · |
| regular over art-glow | 10.07 | 6.43 | 5.07 | 7.81 | · |
| regular over art-dark | 16.50 | 10.54 | 8.31 | 12.80 | · |
| regular over far-range | 15.52 | 9.92 | 7.82 | 12.04 | · |
| thick over orb | 11.61 | 7.42 | 5.85 | 9.00 | · |
| thick over art-bright | 11.46 | 7.32 | 5.77 | 8.89 | · |
| thick over art-glow | 12.33 | 7.88 | 6.21 | 9.56 | · |
| thick over art-dark | 16.86 | 10.77 | 8.49 | 13.08 | · |
| thick over far-range | 16.09 | 10.28 | 8.10 | 12.48 | · |
| chrome over orb | 10.44 | 6.67 | 5.26 | 8.10 | · |
| chrome over art-bright | 10.22 | 6.53 | 5.14 | 7.92 | · |
| chrome over art-glow | 11.38 | 7.27 | 5.73 | 8.83 | · |
| chrome over art-dark | 17.09 | 10.92 | 8.61 | 13.26 | · |
| chrome over far-range | 16.22 | 10.36 | 8.17 | 12.58 | · |
| ultrathin over bg | 16.13 | 10.30 | · | · | · |
| ultrathin over bg-tint | 13.99 | 8.94 | · | · | · |
| thin over bg | 16.27 | 10.39 | · | · | · |
| thin over bg-tint | 14.75 | 9.42 | · | · | · |
| media over orb | · | · | · | · | 5.54 |
| media over art-bright | · | · | · | · | 5.28 |
| media over art-glow | · | · | · | · | 6.77 |
| media over art-dark | · | · | · | · | 19.99 |
| media over far-range | · | · | · | · | 17.92 |
| media-strong over orb | · | · | · | · | 8.51 |
| media-strong over art-bright | · | · | · | · | 8.11 |
| media-strong over art-glow | · | · | · | · | 9.84 |
| media-strong over art-dark | · | · | · | · | 19.99 |
| media-strong over far-range | · | · | · | · | 18.57 |

**Fills over art extremes, no blur (min 4.5), light** (78 checks, min 4.59)

| Surface | ink | ink-2 | ink-3 | brand | on-deep |
|---|---|---|---|---|---|
| regular over orb | 17.36 | 8.33 | 6.40 | 9.79 | · |
| regular over art-bright | 17.91 | 8.60 | 6.60 | 10.10 | · |
| regular over art-glow | 17.06 | 8.19 | 6.29 | 9.62 | · |
| regular over art-dark | 13.03 | 6.26 | 4.81 | 7.35 | · |
| regular over far-range | 16.25 | 7.80 | 5.99 | 9.16 | · |
| thick over orb | 17.49 | 8.39 | 6.45 | 9.86 | · |
| thick over art-bright | 17.91 | 8.60 | 6.60 | 10.10 | · |
| thick over art-glow | 17.22 | 8.27 | 6.35 | 9.71 | · |
| thick over art-dark | 14.12 | 6.78 | 5.21 | 7.96 | · |
| thick over far-range | 16.57 | 7.95 | 6.11 | 9.34 | · |
| chrome over orb | 16.61 | 7.97 | 6.13 | 9.37 | · |
| chrome over art-bright | 17.15 | 8.23 | 6.32 | 9.67 | · |
| chrome over art-glow | 16.34 | 7.84 | 6.02 | 9.21 | · |
| chrome over art-dark | 12.44 | 5.97 | 4.59 | 7.01 | · |
| chrome over far-range | 15.45 | 7.41 | 5.70 | 8.71 | · |
| ultrathin over bg | 17.04 | 8.18 | · | · | · |
| ultrathin over bg-tint | 15.82 | 7.59 | · | · | · |
| thin over bg | 17.26 | 8.29 | · | · | · |
| thin over bg-tint | 16.46 | 7.90 | · | · | · |
| media over orb | · | · | · | · | 5.36 |
| media over art-bright | · | · | · | · | 4.69 |
| media over art-glow | · | · | · | · | 5.79 |
| media over art-dark | · | · | · | · | 17.65 |
| media over far-range | · | · | · | · | 7.37 |
| media-strong over orb | · | · | · | · | 8.57 |
| media-strong over art-bright | · | · | · | · | 7.76 |
| media-strong over art-glow | · | · | · | · | 9.06 |
| media-strong over art-dark | · | · | · | · | 18.23 |
| media-strong over far-range | · | · | · | · | 10.62 |

**Focus (best tone, min 3) and toggle cue (min 3), dark** (35 checks, min 5.33)

| Surface | ring 11.48 / halo 1.12 | ring 10.42 / halo 1.01 | ring 12.00 / halo 1.17 | ring 9.16 / halo 1.12 | ring 9.73 / halo 1.06 | ring 10.71 / halo 1.04 | ring 11.17 / halo 1.08 | ring 8.37 / halo 1.23 | ring 10.24 / halo 1.01 | ring 11.00 / halo 1.07 | ring 8.04 / halo 1.28 | ring 6.85 / halo 1.50 | ring 1.15 / halo 11.82 | ring 1.32 / halo 13.56 | ring 1.42 / halo 14.61 | ring 1.53 / halo 15.74 | ring 1.06 / halo 10.88 | ring 8.44 / halo 1.22 | ring 7.06 / halo 1.46 | ring 11.90 / halo 1.16 | ring 5.33 / halo 1.93 | ring | ring-on-deep | dot filled = brand | dot hollow = ink-2 ring |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bg | 11.48 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| bg-elevated | · | 10.42 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| bg-grouped | · | · | 12.00 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| bg-tint | · | · | · | 9.16 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card stop 1 | · | · | · | · | 9.73 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card stop 2 | · | · | · | · | · | 10.71 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card stop 3 | · | · | · | · | · | · | 11.17 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card-hi stop 1 | · | · | · | · | · | · | · | 8.37 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card-hi stop 2 | · | · | · | · | · | · | · | · | 10.24 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card-hi stop 3 | · | · | · | · | · | · | · | · | · | 11.00 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card stop 1 + spotlight peak | · | · | · | · | · | · | · | · | · | · | 8.04 | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card-hi stop 1 + spotlight peak | · | · | · | · | · | · | · | · | · | · | · | 6.85 | · | · | · | · | · | · | · | · | · | · | · | · | · |
| brand (button) | · | · | · | · | · | · | · | · | · | · | · | · | 11.82 | · | · | · | · | · | · | · | · | · | · | · | · |
| brand-hover | · | · | · | · | · | · | · | · | · | · | · | · | · | 13.56 | · | · | · | · | · | · | · | · | · | · | · |
| orb | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 14.61 | · | · | · | · | · | · | · | · | · | · |
| art-bright | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 15.74 | · | · | · | · | · | · | · | · | · |
| art-glow | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 10.88 | · | · | · | · | · | · | · | · |
| art-dark | · | · | 12.00 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| far-range | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 8.44 | · | · | · | · | · | · | · |
| chrome over orb | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 7.06 | · | · | · | · | · | · |
| sky-top | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 11.90 | · | · | · | · | · |
| sky-low+aurora-1 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 5.33 | · | · | · | · |
| halo | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 10.30 | · | · | · |
| deep | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 12.07 | · | · |
| deep-2 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 10.37 | · | · |
| band: blob 1 peak + scrim | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 8.47 | · | · |
| band: blob 2 peak + scrim | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 8.96 | · | · |
| band: blob 3 peak + scrim | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 9.92 | · | · |
| halo-on-deep | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 10.30 | · | · |
| pill (bg-elevated) | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 11.97 | 9.86 |
| pill (chrome over sky-top) | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 13.17 | 10.85 |
| pill (chrome over orb) | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 8.10 | 6.67 |

**Focus (best tone, min 3) and toggle cue (min 3), light** (35 checks, min 3.80)

| Surface | ring 6.92 / halo 1.09 | ring 7.55 / halo 1.00 | ring 6.41 / halo 1.18 | ring 6.12 / halo 1.23 | ring 7.19 / halo 1.05 | ring 6.77 / halo 1.12 | ring 6.49 / halo 1.16 | ring 6.91 / halo 1.09 | ring 1.34 / halo 10.10 | ring 1.71 / halo 12.94 | ring 6.25 / halo 1.21 | ring 5.59 / halo 1.35 | ring 2.03 / halo 15.36 | ring 3.80 / halo 1.99 | ring 7.00 / halo 1.08 | ring 5.34 / halo 1.41 | ring 5.39 / halo 1.40 | ring | ring-on-deep | dot filled = brand | dot hollow = ink-2 ring |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bg | 6.92 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| bg-elevated | · | 7.55 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| bg-grouped | · | · | 6.41 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| bg-tint | · | · | · | 6.12 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card stop 1 | · | 7.55 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card stop 2 | · | · | · | · | 7.19 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card stop 3 | · | · | · | · | · | 6.77 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card-hi stop 1 | · | 7.55 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card-hi stop 2 | 6.92 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card-hi stop 3 | · | · | · | · | · | · | 6.49 | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card stop 1 + spotlight peak | · | · | · | · | · | · | · | 6.91 | · | · | · | · | · | · | · | · | · | · | · | · | · |
| card-hi stop 1 + spotlight peak | · | · | · | · | · | · | · | 6.91 | · | · | · | · | · | · | · | · | · | · | · | · | · |
| brand (button) | · | · | · | · | · | · | · | · | 10.10 | · | · | · | · | · | · | · | · | · | · | · | · |
| brand-hover | · | · | · | · | · | · | · | · | · | 12.94 | · | · | · | · | · | · | · | · | · | · | · |
| orb | · | · | · | · | · | · | · | · | · | · | 6.25 | · | · | · | · | · | · | · | · | · | · |
| art-bright | · | 7.55 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| art-glow | · | · | · | · | · | · | · | · | · | · | · | 5.59 | · | · | · | · | · | · | · | · | · |
| art-dark | · | · | · | · | · | · | · | · | · | · | · | · | 15.36 | · | · | · | · | · | · | · | · |
| far-range | · | · | · | · | · | · | · | · | · | · | · | · | · | 3.80 | · | · | · | · | · | · | · |
| chrome over orb | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 7.00 | · | · | · | · | · | · |
| sky-top | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 5.34 | · | · | · | · | · |
| sky-low+aurora-1 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 5.39 | · | · | · | · |
| halo | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 7.55 | · | · | · |
| deep | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 10.28 | · | · |
| deep-2 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 7.71 | · | · |
| band: blob 1 peak + scrim | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 8.47 | · | · |
| band: blob 2 peak + scrim | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 8.96 | · | · |
| band: blob 3 peak + scrim | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 9.92 | · | · |
| halo-on-deep | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 10.30 | · | · |
| pill (bg-elevated) | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 10.10 | 8.60 |
| pill (chrome over sky-top) | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 9.15 | 7.79 |
| pill (chrome over orb) | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | 9.37 | 7.97 |

