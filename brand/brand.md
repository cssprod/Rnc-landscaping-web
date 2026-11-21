# RNC Landscaping brand: editorial system

Calm, coastal and editorial: large real photography, generous white space, a two-tone discipline (Basalt ink `#0E1611` on Sea fog `#F4F6F2`) and a Douglas fir primary. Liquid Glass survives only on chrome (header, menus, sticky action bar, CTA panels over photos); content surfaces are solid. RNC's own signature, so the site is not a copy of anyone else's: a field-survey **spec strip** (hairline rules, tabular figures, sentence-case labels), **numbered sections** (01, 02 … with a hairline eyebrow), and a subtle **topographic contour** motif drawn from the hills of the area map. Tokens live in `tokens.json` (W3C Design Tokens format) and compile to `tokens.css` with `node brand/build-tokens.mjs`; the site build compiles them on every run. Component markup: `site/COMPONENTS.md`. Earlier explorations remain in `directions.html` for reference only.

## Mark
A squircle tile, like an app icon: a stepped Douglas fir standing on a mossy hill, white on a fir-green gradient with a soft specular highlight. The fir echoes the original "Fir on the outcrop" mark; the hill replaces the circle so the mark sits naturally beside Liquid Glass controls and on home screens.

| File | Use |
|---|---|
| `logo.svg` | Lockup: tile + "RNC Landscaping" (outlined Inter Display, bold/medium) on light backgrounds |
| `logo-reversed.svg` | Same lockup, white wordmark, for dark bands and photos |
| `logo-mark.svg` | Tile alone (avatars, small spaces) |
| `favicon.svg` | Flat tile for browser tabs |
| `icons/apple-touch-icon.png`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png` | Home-screen and manifest icons |

The website draws the lockup from an inline sprite, so the wordmark takes the text colour of its surroundings (ink on Sea fog, white on Fir night). Clear space: half the tile's width on every side. Minimum: 20 px tile, 120 px lockup. Never recolour the tile, redraw the fir, or set the wordmark in live text. Regenerate with `brand/tools/make-logo.mjs` (needs opentype.js and static Inter Display instances; see the file header).

## Colour
Fog-led neutrals; one brand green family; Camas violet-blue only for focus. Every text, UI and focus pairing meets WCAG 2.2 AA in both appearances (`node brand/check-contrast.mjs` checks them all and exits 1 on a failure).

| Token | Light | Dark | Name and role |
|---|---|---|---|
| `color-bg` | #F4F6F2 | #0A0E0C | Sea fog: page |
| `color-bg-elevated` | #FFFFFF | #131A16 | Cards, fields |
| `color-bg-grouped` | #EBEFE9 | #070A08 | Lichen: sunken areas |
| `color-bg-tint` | #E3EEE6 | #13241A | Moss mist: chips, local-rules callout |
| `color-ink` | #0E1611 | #EEF2EE | Basalt: text |
| `color-ink-2` | #46524A | #B2BDB5 | Wet granite: secondary text |
| `color-ink-3` | #5F6B63 | #8D9991 | Weathered stone: tertiary text |
| `color-rule` | ink 18% | ink 22% | Hairlines: spec strip, eyebrows, FAQ rows |
| `color-line-strong` | #7E8982 | #6E7B72 | Field borders (3:1+) |
| `color-brand` | #1D4A33 | #8ED3A6 | Douglas fir: links, primary buttons |
| `color-brand-2` | #367A4F | #6CC490 | Fern: icons, indices |
| `color-contour` | #367A4F | #6CC490 | Contour motif (12–16% opacity) |
| `color-deep` | #0B1F15 | #0C1811 | Fir night: CTA band, credentials, footer |
| `color-focus` | #5A4FCF | #B4ADFF | Camas: focus ring on light surfaces |
| `color-focus-on-deep` | #B4ADFF | #B4ADFF | Camas tint: focus ring on Fir night and photos (Camas itself is only 2.8:1 on Fir night) |
| `color-focus-halo` | #0B1F15 | #06140C | Dark halo outside the ring on photos |
| `color-placeholder` | #7A5200 on #FFF3D1 | #F2C462 | Placeholder chips for unconfirmed details |

Primary actions are fir-filled on light surfaces and white on photos or Fir night. Secondary actions are quiet tinted buttons, or dark glass over photos. Mark a Fir night surface with `.on-deep` and a photo surface with `.on-media` so the right focus ring applies.

## Glass materials (chrome only)
`material-chrome` (header, sticky bar), `material-thick` (menus), `material-media`, `material-media-strong` (CTA panel and chips over photos, both appearances), used with `backdrop-filter: blur(24–44px) saturate(1.8)`. No aurora washes, sheen or pointer-following highlights, no tilt. Under `prefers-reduced-transparency` or `prefers-contrast: more` every material turns solid.

## Type
**Inter** (variable; weights 400, 600 and 700 only) for everything; **Newsreader** italic only in quotations. Both OFL, self-hosted latin subsets, with a metric-matched Arial fallback. Fluid scale between 360 px and 1280 px viewports:

| Token | Size | Use |
|---|---|---|
| `font-size-display` | 2.5 → 4.5 rem | Home hero |
| `font-size-h1` | 2.0 → 3.25 rem | Page titles |
| `font-size-h2` | 1.5 → 2.25 rem | Section headings |
| `font-size-h3` | 1.25 → 1.5 rem | Sub-sections, card titles |
| `font-size-body` | 1.0625 → 1.125 rem | Body, line-height 1.6, measure 65ch (`layout-measure`) |
| `font-size-lede` | 1.125 → 1.3125 rem | Introductions |
| `font-size-small` | 0.875 rem | Labels, captions, spec-strip labels |

Older names (`large-title`, `title-1/2/3`, `footnote`, `--step-*`) alias the new scale. Headlines use `text-wrap: balance`, paragraphs `pretty`; figures in specs, indices and dates are tabular. Sentence case everywhere in the source HTML; no all-caps or lowercase-by-hand text.

## Shape, space, motion
Corners 4, 6, 10, 14, 18, 24 px (cards 14, buttons 10). Space on a 4 px grid with a fluid section rhythm of 64 to 128 px. Breakpoints 40em, 64em, 80em; cards and tiles use container queries. Motion is 150–250 ms, opacity and transform only (menus, sheet, sticky bar, project-filter View Transitions); no loaders, sliders, autoplay, scroll-linked effects or scroll-jacking, and everything stops under `prefers-reduced-motion`.

## Illustrations
Where RNC has not supplied a photo yet, the site draws a generated coastal landscape for that slot (`site/src/lib/art.mjs`): sky, low sun, the Olympic Mountains or Gulf Islands, water, and ridges of stepped firs that echo the mark. Each municipality has its own recipe. Illustrations are always labelled "Illustration" or "Photo to come" so nobody mistakes them for RNC's work.

## Photography
Overcast or low-angle coastal light; real local textures (moss on rock, fir bark, wet stone, Garry oak silhouettes); ground line low with room for type; slightly cool grade. People shown working, never posed. Stock images carry "Sample image" in portfolio contexts.

## Voice
Calm, precise, neighbourly. Avoid: "transform", "oasis", "elevate", "passion", "premier", "best", "#1", "world-class", "dream yard".

## Contrast (generated by `node brand/check-contrast.mjs`)
Run the script after changing colours; it checks every text, UI and focus/background pairing (light surfaces, Fir night, glass, photo halo) in both appearances.
