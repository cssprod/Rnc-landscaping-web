# Component catalogue (frozen API, v3 skeleton)

Written by the W0 architect. W2 `ds-comp` fills in markup examples and specimens (`/styleguide/`, showcase builds only). After that, the table cells marked **frozen** may only grow: new **optional** parameters, new modifiers, new `data-*` hooks.

`tests/unit/ui-api.test.mjs` snapshots every export name and parameter key, and fails if any disappears. Function names, parameter names, root classes, `data-*` hooks and accessible names are frozen once this file is committed at the seed.
- **Who maintains the snapshot:** W1 `ia` writes the test from this file, with one entry per export and its parameter keys. It is **append-only** in every wave: ds-comp adds entries for new exports and parameters, and `.orchestra/tools/ownership.mjs` fails on any deleted line.

## Rules for every primitive
- **Pure functions.** Each returns a `Safe` from `html\`\`` in `src/lib/html.mjs`. They do not read files, so all data comes from parameters. The exception is `site` (from `site.config.mjs`) for the fixed service and area lists.
- **One DOM for every width.** Never ship mobile and desktop copies. Reflow happens with container queries: every card or tile root sets `container-type: inline-size` on its wrapper.
- **Heading levels.** A primitive never emits an `<h1>`, except `hero()`/`pageHead()`, which always emit the page's only H1 with `id="page-title"`. Section-level primitives default to `<h2>` and take `headingLevel` / `level` where they nest.
- **Ids.** Every id comes from a parameter (`id`, or a slug). Defaults exist for single-use placements only, and two instances on one page must pass distinct ids.
- **Classes.** Roots use BEM (`block__el--mod`), with a root class unique to the primitive. Styling lives in the paired CSS file (§Modules); no inline styles except CSS custom properties (`style="--i:2"`).
- **Motion.** Only through CONTRACT §9: `data-reveal`, `data-parallax`, `data-spotlight`, `view-transition-name`, `var(--dur-t0/t1)` and `var(--alive-play)`. The LCP element (the H1) never gets `data-reveal`.
- **Tracking.** Interactive contact links carry `data-track` and `data-track-location`, using the CONTRACT §13 event names.
- **Samples.** A sample item renders `sampleLabel()` (`.sample-label`, which the launch build detects).
- **Tokens.** Bracket tokens are written literally (`[PHONE]`). `finalizeTokens()` resolves them at build time.

## Modules and paired CSS
| Module | Exports (existing → kept verbatim) | New in v3 | CSS | W2 owner → W3 steward |
|---|---|---|---|---|
| `ui/actions.mjs` | `sampleLabel`, `serviceIcon`, `quoteBtn`, `secondaryBtn`, `linkMore`, `chips` | `callBtn`, `contactLinks` | `40-ui-actions.css` | ds-comp → frozen (W4 fixers only) |
| `ui/heads.mjs` | `hero`, `pageHead`, `sectionHead`, `sections` | `inPageToc` | `41-ui-heads.css` | ds-comp → frozen (W4 fixers only) |
| `ui/cards.mjs` | `featureBento`, `serviceTiles` | `bento`, `bentoCard` | `42-ui-cards.css` | ds-comp → t-home |
| `ui/projects.mjs` | `projectCard`, `projectGrid`, `beforeAfter` | `specStrip`, `plantPalette` | `43-ui-projects.css` | ds-comp → t-projects |
| `ui/trust.mjs` | `testimonials`, `trustBand` | `reviewCard`, `reviewsBand`, `credentialsRow` | `44-ui-trust.css` | ds-comp → t-company |
| `ui/faq.mjs` | `faqList` | — | `46-ui-faq.css` | ds-comp → t-company |
| `ui/cta.mjs` | `ctaBand`, `contactCards` | `contactFallback` | `47-ui-cta.css` | ds-comp → t-home |
| `ui/seasons.mjs` | `seasons` | `timeline`, `perVisitTable` | `48-ui-seasons.css` | ds-comp → t-services |
| `ui/callouts.mjs` | (empty after the W1 split) | `localRulesCallout`, `sharedRegional`, `sourceChip`, `conditionsList`, `guarantee`, `reassuranceStrip`, `reviewedOn` | `49-ui-callouts.css` | ds-comp → t-services |
| `ui/index.mjs` | `export * from` each module above | — | — | frozen after W1 |
| `components/living.mjs` | — | `livingScene`, `projectArt`, `illustrationChip` | `45-living.css` | living → frozen |
| `components/layout.mjs` | `layout`, `breadcrumbNav` (`JS_FLAG` is a seed-time alias of `HEAD_SCRIPT`; ds-chrome deletes it in W2) | toggles, sticky bar (internal); `scripts[]` with a fallback to `env.assets.js` when `env.assets.modules` is absent | `30-chrome.css` | ia (W1) → ds-chrome (W2) → frozen |
| `components/sprite.mjs` | `icon`, `logo`, `sprite`, `SERVICE_ICON`, `SEASON_ICON` | `sprite(used?)`; ds-chrome adds every icon named in `DESIGN-DIRECTION.md` and this file in W2 | `30-chrome.css` | build (W1) → ds-chrome (W2) → frozen in W3 (icons by request) |
| `components/map.mjs` | `areaMap` | — | `62-areas.css` | frozen in W2 → t-areas |
| `components/forms.mjs` | `quoteForm` (`quoteSteps` may be removed by quote, its only caller) | — | `70-quote.css` | ia (W1) → quote (W2) |

The W1 split is mechanical and **byte-identical**. Each existing export moves to the module in this table with its exact name, parameters and output. Only the import path changes, and pages import from `../components/ui/index.mjs`.

## Existing primitives (signatures frozen as they are today)
| Function | Params | Root element / class | `data-*` hooks | Accessible name / semantics |
|---|---|---|---|---|
| `sampleLabel(noun?)` | **W2 additive** `noun?: string` (`'project'` → "Sample project", `'review'` → "Sample review") | `span.sample-label` (the class attribute stays exactly `class="sample-label"`: the launch build looks for it) | — | visible text "Sample" (+ noun) |
| `serviceIcon(slug)` | `slug: string` → icon name | — | — | — |
| `quoteBtn(o?)` | `{ tone?: 'primary'\|'light', size?: string }` | `a.btn.btn--{tone}` → `/free-quote/` (W1 URL change) | — | "Get a free quote" |
| `secondaryBtn(location, o?)` | `location: string`, `{ tone?: 'glass'\|'secondary'\|'on-deep', size? }` | `a.btn` | `data-track="call_click"`, `data-track-location` (W2 rename) | "Call [PHONE]" or "See our work" → `/projects/` |
| `linkMore(href, label)` | `href: string, label: any` | `a.link-more` | — | label text; arrow icon is aria-hidden |
| `chips(links)` | `[href, label][]` | `ul.chip-list > li > a.chip` | — | list of links |
| `hero(p)` | `{ h1, lede?, image, ctas?: boolean, variant?: 'home'\|'page', dock?, extra? }` | `section.hero.hero--{variant}` | `<!--crumbs-->` marker | `aria-labelledby="page-title"`; `h1#page-title` |
| `pageHead(p)` | `{ h1, lede?, extra?, className? }` | `header.page-head` | `<!--crumbs-->` marker | `h1#page-title` |
| `sectionHead(p)` | `{ id, title, lede?, link?, level?: number }` | `div.section-head` | — | `h{level}#id` |
| `sections(list, o?)` | `list: {id?, heading?, body?, items?}[]`, `{ level?, tone? }` | `section.section.prose-section` | — | heading per section |
| `featureBento(p)` | `{ id, heading, lede?, items: {title, body?}[], icons?: string[], link? }` | `section.section.bento-band` | `data-tilt` **removed in W2** (tilt is banned) → `data-spotlight` on each card, `data-spot-grid` on the list | `aria-labelledby=id` |
| `serviceTiles(data, o?)` | `{ heading?, lede?, id?, link?: boolean }` | `section.section.services-band > ul.tiles > li.tile` | — | `aria-labelledby=id`; each tile is one link |
| `projectCard(data, p, o?)` | `p`: project, `{ headingLevel? }` | `li.card.project-card` → `/projects/{slug}/` | `data-service`, `data-area` | one link per card; title in `h{headingLevel}` |
| `projectGrid(data, projects, o?)` | `{ filters?: boolean, headingLevel? }` | `form.filters` + `ul.card-grid` | `data-filters`, `data-filters-submit`, `data-filters-count`, `data-filters-empty`, `data-project-grid` | form `aria-label="Filter projects"`; count `role="status"` |
| `beforeAfter(before, after, label)` | slot ids, `label: string` | `figure.ba` | `data-ba`, `data-ba-range` | range labelled "Compare before and after"; `aria-valuetext` |
| `testimonials(data, list, o?)` | `{ heading?, lede?, id?, link? }` | `section.section.quotes-band > ul.quotes > li.quote` | — | `aria-labelledby=id` |
| `trustBand()` | — | `section.section.deep-band.trust > dl.trust__grid` | — | `aria-labelledby="trust-h"` |
| `ctaBand(p?)` | `{ heading?, body?, secondary?, image? }` | `section.cta-band` | — | `aria-labelledby="cta-h"` (default) |
| `contactCards()` | — | `ul.contact-cards` | `data-track` on links | h3 per method |
| `faqList(faqs, o?)` | `faqs: {q, a}[]`, `{ heading?, id?, lede?, level? = 2 }` (W2 additive `level`) | `section.section.faq` with `details.faq__item` | — | `<summary>` is the question; `aria-labelledby=id` |
| `seasons(list)` | `{season, items[]}[]` | `div.seasons > div.season.season--{season}` | — | h3 per season |
| `areaMap(data, o?)` | `{ id?, heading?, lede?, current? }` | `section.section.area-map` | `data-map`, `data-area-link` (W3 adds) | list of links is the keyboard path (W3: SVG tiles get `tabindex=-1`) |
| `layout(env, p)` | `{ path, title, description, crumbs?, body, jsonld?, ogImage?, bodyClass?, noindex?, hero? }` + **W1 additive:** `scripts?: string[]`, `ogType?`; route-level (not layout) `sources[]`, `sitemap?`, `noindex?`, `showcaseOnly?` (CONTRACT §14) | `html[lang=en-CA]`, `header.site-header`, `main#main`, `footer.site-footer` | §Chrome | skip link "Skip to content" |
| `breadcrumbNav(crumbs)` | `{name, path}[]` | `nav.crumbs > ol` | — | `aria-label="Breadcrumb"`; last item `aria-current="page"` |
| `icon(name, o?)` | `{ size?, className? }` | `svg.i > use[href=#i-name]` | — | `aria-hidden="true" focusable="false"` |

## New primitives (C3 inventory and the approved effects; implemented by ds-comp / living in W2)
Every parameter not marked required is optional.

| Function (module) | Params | Root / class | `data-*` hooks | Accessible name / semantics |
|---|---|---|---|---|
| `hero(p)` (heads), additive | **new** `layout?: 'split'\|'full'` (default `full`), `scene?: string` (a `livingScene` id; replaces `image` when given), `proof?: string` (one-line proof under the lede) | `section.hero.hero--{variant}.hero--{layout}` | `.hero__scene` slot holds `livingScene()`; H1 never `data-reveal` | `h1#page-title`; the scene is aria-hidden with `illustrationChip()` |
| `sectionHead(p)` (heads), additive | **new** `index?: string` ("01"… numbered sections), `eyebrow?: string`, `reveal?: boolean`; `level` is clamped to 2–6 | `div.section-head` (`.section-head--kicker` with `.section-head__kicker > .section-head__index + .section-head__eyebrow + .section-head__rule`) | `data-reveal` (with `reveal`) | index is `aria-hidden` and decorative |
| `inPageToc(items, o?)` (heads) | `items: {id, label}[]`, `{ label?: string = 'On this page' }` | `nav.toc` | `data-toc` (scroll-spy, T0) | `aria-label` = label; current link `aria-current="location"` |
| `callBtn(location, o?)` (actions) | `location`, `{ tone?, size?, label? }` | `a.btn.btn--call` `href=tel:` | `data-track="call_click"`, `data-track-location` | "Call [PHONE]" when PHONE is known. With PHONE unresolved: a non-link `span.btn.btn--call` with text + chip in showcase (never `href="tel:[PHONE]"`), nothing in launch |
| `contactLinks(location, o?)` (actions) | `location`, `{ sms?: boolean = true, email?: boolean = true }` | `ul.contact-links` | `data-track` = `call_click` / `sms_click` / `email_click` | links "Call", "Text", "Email" with visible values |
| `bento(items, o?)` (cards) | `items: BentoItem[]`, `{ id, heading?, lede?, index?, layout?: '2x2'\|'3'\|'feature' }` + W2 `eyebrow?`, `link?`, `level? = 2`, `reveal?` | `section.section.bento-band > .bento-stage.l-cq > ul.bento.bento--{layout}` (default layout `3`) | `data-spot-grid` on the `ul` (living.js T3 spotlight), `data-reveal` on the section with `reveal` | `aria-labelledby=id` when `heading` is set; cards are one level below the band |
| `bentoCard(item, o?)` (cards) | `{ title, body?, href?, icon?, scene?, tone?: 'glass'\|'solid'\|'deep' }` + W2 `span?: 'feature'\|'tall'\|'wide'\|'full'` (placement in the `feature` layout), `extra?` (markup under the body, e.g. chip links: then no `href`); `{ headingLevel? = 3, reveal? }` | `li.bento__card.bento__card--{tone}` (+ `--{span}`, `--link`; `deep` adds `.on-deep`), `.bento__art` (living vignette + chip) or `.bento__icon`, `.bento__body`, `.bento__go` | `data-spotlight` (T3, fine pointer), `data-reveal` (with `reveal`) | whole card is one link when `href` is set (the title link's `::after` covers the card; its text is the accessible name; the ring is drawn on the card) |
| `specStrip(items, o?)` (projects) | `items: {label, value, href?}[]` (municipality, service, season, duration, scope tags; **never budget**), `{ id?, compact? }` | `dl.spec-strip` | — | `dt`/`dd` pairs; tabular figures |
| `plantPalette(list, o?)` (projects) | `{common, botanical?, note?}[]`, `{ sample?: boolean, headingLevel?, id? = 'plants-h' }` | `section.plant-palette > ul` | — | heading "Plant palette" (+ "Sample" label) |
| `beforeAfter(before, after, label)` (projects), additive | **new 4th param** `o?: { toggle?: boolean = true, id?: string }` | `figure.ba` | `data-ba`, `data-ba-range`, `data-ba-toggle` (side-by-side) | toggle `<button aria-pressed>` "Side by side"; works by keyboard |
| `reviewCard(t, o?)` (trust) | testimonial, `{ headingLevel? }` | `figure.review` (blockquote + figcaption) | — | Newsreader italic quote; attribution as role + municipality; `sampleLabel()` when sample |
| `reviewsBand(data, list, o?)` (trust) | `list` (3 testimonials), `{ id, heading?, lede? }` + W2 `index?`, `eyebrow?` (passed to `sectionHead()`) | `section.section.reviews-band` | `data-reviews-band` | "Read all reviews on Google" → `[GOOGLE PROFILE]`. While unset: text + chip without an `href` in showcase, omitted in launch. **Never emits Review schema** |
| `credentialsRow(o?)` (trust) | `{ id?, items? = site.json credentials }` + W2 `label? = 'Licences and insurance'` | `section.credentials > dl.credentials__list` | — | `aria-label=label`, which must differ from every other region name on the page (`trustBand()`'s section is already named "Credentials" by its h2; axe `landmark-unique`); token values only; issuer link ("Check with the issuer") only when `issuerUrl` is set |
| `ctaBand(p)` (cta), additive | **new** `id?: string = 'cta-h'`, `living?: boolean`, `reply?: boolean` (W2 fix: the `[REPLY TIME]` promise shows on every band by default, CONTRACT §3; `true` adds the trust line, `false` drops the promise) | `section.cta-band.cta-band--living` | `.cta-band__blobs` (T2, `var(--alive-play)`), fixed scrim under the text | `aria-labelledby=id` |
| `contactFallback(o?)` (cta) | `{ id?, heading?, location = 'contact_page' }` + W2 `level? = 2` | `section.contact-fallback` (`contactLinks()` + hours + address) | `data-track` on links, `data-copy="#{id}-address"` on the copy button (ships `hidden` until a script wires it), `data-copy-status` | address shown as text with a copy button (`role="status"` confirmation) |
| `timeline(steps, o?)` (seasons) | `steps: {title, body, deliverable?}[]`, `{ id, heading?, orientation?: 'auto'\|'vertical', index? }` + W2 `lede?`, `eyebrow?`, `level?`, `headingLevel?`, `reveal?` (with `heading` it renders `section.timeline-band` with a section head) | `ol.timeline` (horizontal ≥ 64em via container query, vertical below) | `data-reveal` | ordered list; step numbers in the markup |
| `perVisitTable(t, o?)` (seasons) | `{caption, rows: {task, detail}[]}`, `{ id? }` | `table.visit-table` | — | `<caption>`; `th scope="col"` |
| `localRulesCallout(rules, o?)` (callouts) | `rules: LocalRule[]` (CONTRACT §6), `{ id, heading? = 'Local rules that affect your yard', area?: string }` + W2 `level? = 2` | `section.local-rules` | — | each rule shows `sourceChip()` and `reviewedOn()`; a `verify` note is visible |
| `sharedRegional(blocks, o?)` (callouts) | `blocks` from `content/regional.json`, `{ id, heading? = 'Rules across the Capital Regional District' }` + W2 `level? = 2` | `aside.regional` | **`data-shared="regional"`** (the duplicate checks exempt it) | `aria-labelledby=id` |
| `conditionsList(list, o?)` (callouts) | `conditions[]`, `{ id, heading? = 'Local conditions' }` + W2 `level? = 2` | `section.conditions > ul` | — | each item cites its source |
| `sourceChip(url, label?)` (callouts) | `url: string`, `label? = sourceTitle ?? host` | `a.source-chip` (`rel="noopener"`) | — | "Source: {label}" |
| `reviewedOn(iso)` (callouts) | ISO date or null | `p.reviewed` with `<time datetime>` | — | "Last reviewed 19 November 2026", or "Review date to confirm" when null |
| `guarantee(o?)` (callouts) | `{ id?, heading?, body? }` + W2 `level? = 2`. Primitives never read files: pass `heading`/`body` from `process.json` `guarantee`; without them it states the `[WARRANTY]` token alone | `section.guarantee` | — | plain-language text around `[WARRANTY]` |
| `reassuranceStrip(items)` (callouts) | `string[]` (from `quote.json`) | `ul.reassurance` | — | plain list |
| `livingScene(sceneId, o?)` (living) | `sceneId: string` (`home`, `area-<slug>`, `svc-<slug>`, `process`, `cta`, `404`…), `{ variant?: 'hero'\|'band'\|'card' = 'hero', aspect?: string, priority?: boolean, label?: string }` | `div.scene.scene--{variant}` holding 4–6 OUTER `svg.scene__layer` | `data-scene`, `data-layer="sky\|ranges\|water\|ridge\|firs\|mist"`, `data-parallax` (T4), `data-offscreen` (set by living.js) | container `aria-hidden="true"`; visible `illustrationChip()` |
| `projectArt(project, o?)` (living) | project object, `{ aspect? = '4:3', variant? }` | `div.scene.scene--card` | `data-scene="proj-<slug>"` | aria-hidden + chip; replaces stock under `/projects/` |
| `illustrationChip()` (living) | — | `span.media__chip.media__chip--art` | — | visible text "Illustration"; the chip itself is `aria-hidden` (decorative label) |

## Chrome (`layout.mjs`, ds-chrome): hooks and names
| Element | Markup contract | Hooks | Accessible name |
|---|---|---|---|
| Header | `<header class="site-header" data-header>` (literal string kept for check-html). The header Call and Free quote buttons show only at ≥ 64em; below that the sticky bar carries them. Logo, Menu and both toggles are visible at every width | `.is-scrolled`, `.is-over-media` | — |
| Main nav | one `<nav id="site-nav" aria-label="Main">` | — | "Main" |
| Disclosures | `<button type="button" aria-expanded="false" aria-controls="menu-services\|menu-areas" data-disclosure>`. **W1** markup keeps the existing `data-mega` (item), `data-mega-toggle` (button) and `data-mega-panel` hooks, because `main.js` drives them. **W2** ds-chrome renames both sides at once | `data-disclosure-panel` | "Services", "Service areas" (visible text) |
| Mobile sheet | `<button class="nav-toggle" aria-expanded aria-controls="site-nav" data-nav-toggle>`; background gets `inert` while open | `data-sheet` | "Menu" |
| Theme toggle | `<button type="button" class="pref-toggle" data-pref="theme" aria-pressed>` | `rnc:theme` | **"Dark theme"** |
| Motion toggle | `<button type="button" class="pref-toggle" data-pref="motion" aria-pressed>` | `rnc:motion` | **"Animations"** |
| Sticky bar | `<div class="action-bar" data-action-bar>` with `callBtn('sticky_bar')` + `quoteBtn()`; hidden ≥ 64em, over `[data-quote-form]` and while the keyboard is open | `data-action-bar`, `.is-hidden` | "Call [PHONE]" / "Get a free quote" (Contact → `/contact/` until PHONE is known) |
| Breadcrumbs | `breadcrumbNav()` | — | "Breadcrumb" |
| Footer | `<footer class="site-footer">` with `nav[aria-label=Services]`, `nav[aria-label="Service areas"]`, `nav[aria-label=Company]`, `address` | `data-track` on tel/sms/mailto | — |
| Skip link | `a.skip-link[href=#main]` | — | "Skip to content" |

## Page-level hooks used by scripts
- **quote:** `form[data-quote-form]` (replaces `data-stepper`), `[data-quote-ready]`, `[data-copy]`, `[data-error-summary]`, `[data-show-when]`. W1 ia adds `data-quote-form` to the existing stepper form, keeping `data-stepper`, so W2 chrome tests can find the form. Quote drops `data-stepper` in W2.
- **projects:** `[data-filters]` and `[data-project-grid]`; cards carry `data-service` and `data-area`.
- **areas:** `[data-map]` and `[data-area-link]`.
- **living:** `[data-scene]`, `[data-spotlight]`. The spotlight (T3) is implemented only in `living.js`. `main.js` loses its v2 pointer sheen in W2.
- **motion:** `[data-reveal]`, `[data-parallax]`.
- **seo:** `[data-shared]`.

## W2 implementation notes (ds-comp)
Specimens of every primitive below live on `/styleguide/` (showcase builds only; `site/src/pages/styleguide.mjs`). `tests/unit/ds-comp-markup.test.mjs` and `tests/e2e/components.spec.mjs` hold the rules (`#container-queries`, `#heading-levels`, `#track-names`, `#call-button`, `#no-tilt`, `#honesty`, `#legacy-slices`, `#target-size`, `#motion`).

**Surfaces and motion.** Content cards are lit solid (`--surface-card` / `--surface-card-hi` + `--glass-rim` + `--color-line`), never `backdrop-filter` (DESIGN-DIRECTION §7). Over art or photos the "glass" buttons and chips use the thick `--material-media-strong` fill, no blur. T0 transitions animate `transform`, `opacity` and colours through `--dur-t0` / `--dur-t0-fast` only. The T2 loops (CTA blobs, conic ring) carry `data-t2` in the markup; 95-motion.css gates them. No primitive reads `prefers-reduced-motion`.

**Button hooks (lower layers).** `@layer components` sits above `@layer chrome` and `@layer layout`, so a lower layer cannot restyle a `.btn` by declaring `padding` or `background`. It sets custom properties instead, and no components rule sets them: `--h` (height), `--btn-px`, `--btn-fs`, `--btn-min-w`, and on `.btn--primary` `--btn-bg`, `--btn-bg-hover`, `--btn-ink`, `--btn-shadow`. Photo heroes: `.hero__media .media` overrides `picture()`'s inline `aspect-ratio` with `aspect-ratio: auto !important` (an inline style beats every normal declaration), so the photo box always matches the hero box (e2e `#hero-media`).

**Reflow (C4.1).** One DOM for every width. Grids sit in an inline-size container (`.l-cq` wrapper or the band itself) and reflow with `@container` at 40em / 64em (80em reserved); cards (`.bento__card`, `.tile`, `.card`, `.quote`, `.review`, `.plant-palette`, `.contact-fallback`, `.guarantee`, `.ba`, `.spec-strip`, `.local-rules`, `.conditions`, `.regional`, `.credentials`) are containers too. Component CSS has no viewport width media queries.

**Headings.** `hero()` / `pageHead()` emit the only H1 (`h1#page-title`, never `data-reveal`). Everything else defaults to h2 (cards and steps one level below their band) and clamps a caller's level to h2–h6; `reviewCard()` emits no heading unless `headingLevel` is passed (then a visually hidden one).

**Token-dependent links (CONTRACT §3).** `callBtn()`: `a.btn.btn--call[href^="tel:"][data-track=call_click]` once `[PHONE]` is known; in showcase a non-link `span.btn.btn--call.btn--pending` ("Call" + chip, dashed outline, not pressable); in launch nothing. `contactLinks()`, `reviewsBand()`'s Google link and `credentialsRow()`'s issuer link follow the same rule. Call/Text/Email links use `call_click`, `sms_click`, `email_click` with `data-track-location`. `secondaryBtn()` sends `call_click` (was `call_clicked`).

**Markup examples** (abridged):
```html
<!-- hero({ h1, lede, scene: 'home', layout: 'split', proof }) -->
<section class="hero hero--page hero--split hero--scene" aria-labelledby="page-title">
  <div class="hero__content wrap"><div class="hero__copy"><!--crumbs--><h1 id="page-title" class="hero__title">…</h1>
    <p class="hero__lede">…</p><p class="hero__proof">…</p><div class="hero__ctas">…</div></div>
  <div class="hero__scene" data-scene-slot="home"><!-- livingScene('home', { variant: 'hero', priority: true }) + illustrationChip() --></div></div>
</section>
<!-- A photo hero (image, no scene) is .hero--photo.on-deep: white type on the scrim, deep focus ring. -->

<!-- sectionHead({ id, title, index: '01', eyebrow: 'Services' }) -->
<div class="section-head section-head--kicker"><div class="section-head__text">
  <div class="section-head__kicker"><span class="section-head__index t-num" aria-hidden="true">01</span><span class="section-head__eyebrow">Services</span><span class="section-head__rule" aria-hidden="true"></span></div>
  <h2 id="svc-h">What we do</h2></div></div>

<!-- bentoCard({ title, body, href, scene, span: 'feature' }) inside bento(items, { id, heading, layout: 'feature' }) -->
<li class="bento__card bento__card--solid bento__card--feature bento__card--link" data-spotlight>
  <div class="bento__art" aria-hidden="true">…scene…</div>
  <div class="bento__body"><h3 class="bento__title"><a class="bento__link" href="/services/grounds-maintenance/">Grounds maintenance</a></h3><p class="bento__text">…</p></div>
  <span class="bento__go" aria-hidden="true">…</span></li>

<!-- specStrip([{ label, value, href? }]) -->
<dl class="spec-strip"><div class="spec-strip__item"><dt>Service</dt><dd><a href="/services/irrigation/">Irrigation</a></dd></div>…</dl>

<!-- localRulesCallout(rules, { id, area }) → each rule: -->
<li class="sourced rule" data-rule="ob-tree-permit"><p class="sourced__label">Trees</p><p class="sourced__text">…</p>
  <p class="sourced__excerpt"><q cite="https://…">verbatim excerpt</q></p>   <!-- never a blockquote: those are testimonials only -->
  <div class="sourced__meta"><a class="source-chip" href="https://…" rel="noopener">…<span>Source: Trees | District of Oak Bay</span></a>
  <p class="reviewed">…<span>Last reviewed <time datetime="2026-11-21">21 November 2026</time></span></p></div>
  <p class="verify-note">…Rules change: check the source before you plan work.</p></li>

<!-- ctaBand({ id, living: true, reply: true }) -->
<section class="cta-band on-deep cta-band--living" aria-labelledby="cta-h" data-living>
  <div class="cta-band__bg" aria-hidden="true"><div class="cta-band__blobs"><span class="cta-band__blob cta-band__blob--1" data-t2></span>…×3</div><svg class="cta-band__contours">…</svg><span class="cta-band__grain"></span></div>
  <div class="wrap"><div class="cta-band__panel"><h2 id="cta-h">…</h2><p class="cta-band__body">…</p><p class="cta-band__reply">We get back to you within [REPLY TIME] …</p>
    <div class="cta-band__actions"><span class="conic"><span class="conic__ring" data-t2 aria-hidden="true"></span><a class="btn btn--primary btn--lg" href="/free-quote/">Get a free quote</a></span>…</div>
    <p class="cta-band__trust">Reply within [REPLY TIME] · No obligation · 13 municipalities, Sidney to Sooke</p></div></div></section>
```

**Behaviour that needs a script (hooks only; the controls ship inert-safe).**
- `beforeAfter()`'s `button[data-ba-toggle][aria-pressed]` "Side by side" ships `hidden`; the script that wires it removes `hidden` and toggles `.ba.is-side` (CSS shows both images side by side, the range hidden). Without JS the images already sit side by side.
- `contactFallback()`'s `button[data-copy="#{id}-address"]` ships `hidden`; the script that wires it removes `hidden` and writes the confirmation into `[data-copy-status]` (`role="status"`).
- `inPageToc()`: plain anchor links; a scroll-spy may set `aria-current="location"` (CSS draws the rail dot for it).
- `bento()` / `featureBento()`: `ul[data-spot-grid] > li[data-spotlight]` for living.js's T3 spotlight; the edge glow and lift are CSS only.
- `ctaBand({ living })`: `data-living` on `section.cta-band` lets living.js set `data-offscreen` (pauses the blobs and the conic ring off-screen).

**Media frames.** `picture()` writes the slot's aspect ratio inline, so `.tile .media` (4:3 in one column, 4:5 from 40em), `.card__media .media` (4:3) and `.area-card .card__media .media` (16:9) keep `!important` in 42/43 (they replaced the legacy slice-08 `!important`s).
