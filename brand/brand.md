# RNC Landscaping brand: "Liquid Glass"

A calm, coastal identity in the language of Apple's Liquid Glass: content first, full-bleed photography, and translucent glass controls that float above it. Tokens live in `tokens.json` (W3C Design Tokens format) and compile to `tokens.css` with `node brand/build-tokens.mjs`; the site build compiles them on every run. Earlier explorations ("Outcrop", "Field journal") remain in `directions.html` for reference only.

## Mark
A squircle tile, like an app icon: a stepped Douglas fir standing on a mossy hill, white on a fir-green gradient with a soft specular highlight. The fir echoes the original "Fir on the outcrop" mark; the hill replaces the circle so the mark sits naturally beside Liquid Glass controls and on home screens.

| File | Use |
|---|---|
| `logo.svg` | Lockup: tile + "RNC Landscaping" (outlined Inter Display, bold/medium) on light backgrounds |
| `logo-reversed.svg` | Same lockup, white wordmark, for dark bands and photos |
| `logo-mark.svg` | Tile alone (avatars, small spaces) |
| `favicon.svg` | Flat tile for browser tabs |
| `icons/apple-touch-icon.png`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png` | Home-screen and manifest icons |

The website draws the lockup from an inline sprite, so the wordmark takes the text colour of its surroundings (ink on light glass, white over photos). Clear space: half the tile's width on every side. Minimum: 20 px tile, 120 px lockup. Never recolour the tile, redraw the fir, or set the wordmark in live text. Regenerate with `brand/tools/make-logo.mjs` (needs opentype.js and static Inter Display instances; see the file header).

## Colour
Cool, fog-led neutrals; one brand green family; violet-blue only for focus. Every text pairing meets WCAG 2.2 AA in both appearances.

| Token | Light | Dark | Name and role |
|---|---|---|---|
| `color-bg` | #F4F6F2 | #0A0E0C | Sea fog: page |
| `color-bg-elevated` | #FFFFFF | #131A16 | Cards, inset lists, fields |
| `color-bg-grouped` | #EBEFE9 | #070A08 | Lichen: sunken areas |
| `color-bg-tint` | #E3EEE6 | #13241A | Moss mist: chips, icon tiles |
| `color-ink` | #0E1611 | #EEF2EE | Basalt: text (16.9:1) |
| `color-ink-2` | #46524A | #B2BDB5 | Wet granite: secondary text (7.5:1) |
| `color-ink-3` | #5F6B63 | #8D9991 | Weathered stone: tertiary text (4.8:1+) |
| `color-line-strong` | #7E8982 | #6E7B72 | Field borders (3:1+) |
| `color-brand` | #1D4A33 | #8ED3A6 | Douglas fir: links, primary buttons |
| `color-brand-2` | #367A4F | #6CC490 | Fern: icons, highlights |
| `color-deep` | #0B1F15 | #0C1811 | Fir night: dark bands, footer |
| `color-focus` | #5A4FCF | #B4ADFF | Camas, the violet-blue lily of Garry oak meadows: focus rings only |
| `color-placeholder` | #7A5200 on #FFF3D1 | #F2C462 | Placeholder chips for unconfirmed details |

Primary actions are fir-filled capsules on light surfaces and white capsules over photos or dark bands. Secondary actions are tinted "gray" capsules, or dark glass over photos.

## Glass materials
Named after Apple's material thicknesses, each a translucent fill used with `backdrop-filter: blur(24px) saturate(1.8)`:

| Token | Use |
|---|---|
| `material-ultrathin`, `material-thin` | Quiet overlays |
| `material-regular` | Cards over aurora washes |
| `material-thick` | Menus, sheets, the quote form |
| `material-chrome` | The floating navigation capsule |
| `material-media`, `material-media-strong` | Dark glass over photography (both appearances) |

Glass is built from four layers: the translucent fill and blur; a specular rim (`glass-rim`, an inset top highlight); a hairline edge (`glass-edge`); and a soft sheen gradient (`glass-sheen`). On pointer devices a faint highlight follows the cursor. Glass is only used where something sits behind it (photos, aurora washes, page content under the navigation); flat panels use elevated colour instead. Under `prefers-reduced-transparency` or `prefers-contrast: more` every material turns solid, and nested glass is never a backdrop root (the navigation's glass sits on a pseudo-element so its menus can blur the page).

## Type
**Inter** (variable, optical size 14–32) for everything: the Display cut appears automatically at headline sizes, so large titles are tight and crisp and body text stays open. **Newsreader** italic for client quotations only. Both are OFL fonts self-hosted from `brand/fonts/` (latin subsets, 53 KB and 42 KB); a metric-matched Arial fallback keeps layout stable while they load.

The ramp follows Apple's text styles and scales fluidly between 360 px and 1440 px viewports:

| Token | Size | Use |
|---|---|---|
| `font-size-display` | 42 → 80 px | Home hero |
| `font-size-large-title` | 36 → 64 px | Page titles |
| `font-size-title-1` | 30 → 48 px | Section headings |
| `font-size-title-2` | 24 → 34 px | Sub-sections |
| `font-size-title-3` | 20 → 24 px | Card titles |
| `font-size-lede` | 18 → 22 px | Introductions |
| `font-size-body` | 16 → 17 px | Body |
| `font-size-subheadline`, `footnote`, `caption` | 15, 13, 12 px | Supporting text |

Tracking tightens as size grows (−0.034 em display to −0.006 em body); leading runs 1.02 display, 1.08 titles, 1.55 body. Headlines use `text-wrap: balance`, paragraphs `pretty`. The build sets curly quotes, apostrophes and en dashes automatically. Sentence case everywhere; no all-caps labels.

## Shape, space, motion
Concentric corners: 8, 12, 18, 26, 34 and 44 px plus capsules; an inner corner equals the outer corner minus the padding between them. Space runs on a 4 px grid (4 to 112 px) with a fluid section rhythm of 64 to 128 px. Motion uses three curves (standard sheet, ease-out entrance, gentle spring for presses) at 140, 260 and 520 ms. Cards lift into place as they scroll in (transform only, never opacity), buttons compress slightly when pressed, and everything stops under `prefers-reduced-motion`.

## Illustrations
Where RNC has not supplied a photo yet, the site draws a generated coastal landscape for that slot (`site/src/lib/art.mjs`): sky, low sun, the Olympic Mountains or Gulf Islands, water, and ridges of stepped firs that echo the mark. Each municipality has its own recipe. Illustrations are always labelled "Illustration" or "Photo to come" so nobody mistakes them for RNC's work.

## Photography
Overcast or low-angle coastal light; real local textures (moss on rock, fir bark, wet stone, Garry oak silhouettes); ground line low with room for type; slightly cool grade. People shown working, never posed. Stock images carry "Sample image" in portfolio contexts.

## Voice
Calm, precise, neighbourly. Avoid: "transform", "oasis", "elevate", "passion", "premier", "best", "#1", "world-class", "dream yard".

## Contrast (generated by `node brand/check-contrast.mjs`)
Run the script after changing colours; it checks every text and UI pairing above in both appearances.
