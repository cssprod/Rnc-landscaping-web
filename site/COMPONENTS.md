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
| `sampleLabel()` | — | `span.sample-label` | — | visible text "Sample" |
| `serviceIcon(slug)` | `slug: string` → icon name | — | — | — |
| `quoteBtn(o?)` | `{ tone?: 'primary'\|'light', size?: string }` | `a.btn.btn--{tone}` → `/free-quote/` (W1 URL change) | — | "Get a free quote" |
| `secondaryBtn(location, o?)` | `location: string`, `{ tone?: 'glass'\|'secondary'\|'on-deep', size? }` | `a.btn` | `data-track="call_click"`, `data-track-location` (W2 rename) | "Call [PHONE]" or "See our work" → `/projects/` |
| `linkMore(href, label)` | `href: string, label: any` | `a.link-more` | — | label text; arrow icon is aria-hidden |
| `chips(links)` | `[href, label][]` | `ul.chip-list > li > a.chip` | — | list of links |
| `hero(p)` | `{ h1, lede?, image, ctas?: boolean, variant?: 'home'\|'page', dock?, extra? }` | `section.hero.hero--{variant}` | `<!--crumbs-->` marker | `aria-labelledby="page-title"`; `h1#page-title` |
| `pageHead(p)` | `{ h1, lede?, extra?, className? }` | `header.page-head` | `<!--crumbs-->` marker | `h1#page-title` |
| `sectionHead(p)` | `{ id, title, lede?, link?, level?: number }` | `div.section-head` | — | `h{level}#id` |
| `sections(list, o?)` | `list: {id?, heading?, body?, items?}[]`, `{ level?, tone? }` | `section.section.prose-section` | — | heading per section |
| `featureBento(p)` | `{ id, heading, lede?, items: {title, body?}[], icons?: string[], link? }` | `section.section.bento-band` | `data-tilt` **removed in W2** (tilt is banned) → `data-spotlight` | `aria-labelledby=id` |
| `serviceTiles(data, o?)` | `{ heading?, lede?, id?, link?: boolean }` | `section.section.services-band > ul.tiles > li.tile` | — | `aria-labelledby=id`; each tile is one link |
| `projectCard(data, p, o?)` | `p`: project, `{ headingLevel? }` | `li.card.project-card` → `/projects/{slug}/` | `data-service`, `data-area` | one link per card; title in `h{headingLevel}` |
| `projectGrid(data, projects, o?)` | `{ filters?: boolean, headingLevel? }` | `form.filters` + `ul.card-grid` | `data-filters`, `data-filters-submit`, `data-filters-count`, `data-filters-empty`, `data-project-grid` | form `aria-label="Filter projects"`; count `role="status"` |
| `beforeAfter(before, after, label)` | slot ids, `label: string` | `figure.ba` | `data-ba`, `data-ba-range` | range labelled "Compare before and after"; `aria-valuetext` |
| `testimonials(data, list, o?)` | `{ heading?, lede?, id?, link? }` | `section.section.quotes-band > ul.quotes > li.quote` | — | `aria-labelledby=id` |
| `trustBand()` | — | `section.section.deep-band.trust > dl.trust__grid` | — | `aria-labelledby="trust-h"` |
| `ctaBand(p?)` | `{ heading?, body?, secondary?, image? }` | `section.cta-band` | — | `aria-labelledby="cta-h"` (default) |
| `contactCards()` | — | `ul.contact-cards` | `data-track` on links | h3 per method |
| `faqList(faqs, o?)` | `faqs: {q, a}[]`, `{ heading?, id?, lede? }` | `section.section.faq` with `details.faq__item` | — | `<summary>` is the question; `aria-labelledby=id` |
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
| `sectionHead(p)` (heads), additive | **new** `index?: string` ("01"… numbered sections), `eyebrow?: string` | `div.section-head` | `data-reveal` (optional) | index is `aria-hidden` and decorative |
| `inPageToc(items, o?)` (heads) | `items: {id, label}[]`, `{ label?: string = 'On this page' }` | `nav.toc` | `data-toc` (scroll-spy, T0) | `aria-label` = label; current link `aria-current="location"` |
| `callBtn(location, o?)` (actions) | `location`, `{ tone?, size?, label? }` | `a.btn.btn--call` `href=tel:` | `data-track="call_click"`, `data-track-location` | "Call [PHONE]" when PHONE is known. With PHONE unresolved: a non-link `span.btn.btn--call` with text + chip in showcase (never `href="tel:[PHONE]"`), nothing in launch |
| `contactLinks(location, o?)` (actions) | `location`, `{ sms?: boolean = true, email?: boolean = true }` | `ul.contact-links` | `data-track` = `call_click` / `sms_click` / `email_click` | links "Call", "Text", "Email" with visible values |
| `bento(items, o?)` (cards) | `items: BentoItem[]`, `{ id, heading?, lede?, index?, layout?: '2x2'\|'3'\|'feature' }` | `section.section.bento-band > ul.bento.bento--{layout}` | — | `aria-labelledby=id` |
| `bentoCard(item, o?)` (cards) | `{ title, body?, href?, icon?, scene?, tone?: 'glass'\|'solid'\|'deep' }`, `{ headingLevel? = 3 }` | `li.bento__card.bento__card--{tone}` | `data-spotlight` (T3, fine pointer), `data-reveal` | whole card is one link when `href` is set |
| `specStrip(items, o?)` (projects) | `items: {label, value, href?}[]` (municipality, service, season, duration, scope tags; **never budget**), `{ id?, compact? }` | `dl.spec-strip` | — | `dt`/`dd` pairs; tabular figures |
| `plantPalette(list, o?)` (projects) | `{common, botanical?, note?}[]`, `{ sample?: boolean, headingLevel? }` | `section.plant-palette > ul` | — | heading "Plant palette" (+ "Sample" label) |
| `beforeAfter(before, after, label)` (projects), additive | **new 4th param** `o?: { toggle?: boolean = true, id?: string }` | `figure.ba` | `data-ba`, `data-ba-range`, `data-ba-toggle` (side-by-side) | toggle `<button aria-pressed>` "Side by side"; works by keyboard |
| `reviewCard(t, o?)` (trust) | testimonial, `{ headingLevel? }` | `figure.review` (blockquote + figcaption) | — | Newsreader italic quote; attribution as role + municipality; `sampleLabel()` when sample |
| `reviewsBand(data, list, o?)` (trust) | `list` (3 testimonials), `{ id, heading?, lede? }` | `section.section.reviews-band` | `data-reviews-band` | "Read all reviews on Google" → `[GOOGLE PROFILE]`. While unset: text + chip without an `href` in showcase, omitted in launch. **Never emits Review schema** |
| `credentialsRow(o?)` (trust) | `{ id?, items? = site.json credentials }` | `section.credentials > dl` | — | token values only; issuer link only when `issuerUrl` is set |
| `ctaBand(p)` (cta), additive | **new** `id?: string = 'cta-h'`, `living?: boolean`, `reply?: boolean` (shows the `[REPLY TIME]` promise) | `section.cta-band.cta-band--living` | `.cta-band__blobs` (T2, `var(--alive-play)`), fixed scrim under the text | `aria-labelledby=id` |
| `contactFallback(o?)` (cta) | `{ id?, heading?, location = 'contact_page' }` | `section.contact-fallback` | `data-track` on links, `data-copy` for the address | address shown as text with a copy button (`role="status"` confirmation) |
| `timeline(steps, o?)` (seasons) | `steps: {title, body, deliverable?}[]`, `{ id, heading?, orientation?: 'auto'\|'vertical', index? }` | `ol.timeline` (horizontal ≥ 64em via container query, vertical below) | `data-reveal` | ordered list; step numbers in the markup |
| `perVisitTable(t, o?)` (seasons) | `{caption, rows: {task, detail}[]}`, `{ id? }` | `table.visit-table` | — | `<caption>`; `th scope="col"` |
| `localRulesCallout(rules, o?)` (callouts) | `rules: LocalRule[]` (CONTRACT §6), `{ id, heading? = 'Local rules that affect your yard', area?: string }` | `section.local-rules` | — | each rule shows `sourceChip()` and `reviewedOn()`; a `verify` note is visible |
| `sharedRegional(blocks, o?)` (callouts) | `blocks` from `content/regional.json`, `{ id, heading? }` | `aside.regional` | **`data-shared="regional"`** (the duplicate checks exempt it) | `aria-labelledby=id` |
| `conditionsList(list, o?)` (callouts) | `conditions[]`, `{ id, heading? }` | `section.conditions > ul` | — | each item cites its source |
| `sourceChip(url, label?)` (callouts) | `url: string`, `label? = sourceTitle ?? host` | `a.source-chip` (`rel="noopener"`) | — | "Source: {label}" |
| `reviewedOn(iso)` (callouts) | ISO date or null | `p.reviewed` with `<time datetime>` | — | "Last reviewed 19 November 2026", or "Review date to confirm" when null |
| `guarantee(o?)` (callouts) | `{ id?, heading?, body? }` (defaults from `process.json` guarantee) | `section.guarantee` | — | plain-language text around `[WARRANTY]` |
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
