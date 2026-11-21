# Components

Primitives every page template uses. Import from `src/components/ui.mjs` (`import * as ui from '../components/ui.mjs'`). All return escaped `html` (Safe) and are pure functions of their arguments. Styles live in `src/styles/30-components.css` unless noted. Design rules: `brand/brand.md`.

Rules that apply to every component:
- Sentence case in the source HTML; never all caps. No prices, budgets or invented facts; unknown facts stay as bracket tokens (`[PHONE]`, `[REPLY TIME]` …). Sample items keep `"sample": true` and render `sampleLabel()`.
- One DOM per component; layout changes with CSS only (breakpoints `40em`, `64em`, `80em`; cards use container queries).
- Content surfaces are solid. Liquid Glass (`--material-*` + `backdrop-filter`) is only for chrome: header, menus, sticky bar, CTA panels over photos.
- Focus: `--focus` is Camas on light surfaces. Add `.on-deep` to any Fir night surface (switches text colours and the focus ring to `--color-focus-on-deep`) and `.on-media` to any block whose controls sit over a photo (ring plus a dark `--color-focus-halo`). `node brand/check-contrast.mjs` tests every pairing in light and dark.
- Motion: 150–250 ms, opacity/transform only, all off under `prefers-reduced-motion`.

## Layout utilities (`10-layout.css`)
| Class | Use |
|---|---|
| `.wrap`, `.wrap--narrow` | Centred container (1200 px / 720 px + gutters, safe-area aware) |
| `.section`, `--tight`, `--flush`, `--elevated`, `--rule` | Vertical rhythm; `--rule` adds a hairline above the content |
| `.on-deep` | Fir night surface (also `.deep-band` for padding) |
| `.contour` | Adds the topographic contour motif behind a positioned block. Tune with `--contour-color`, `--contour-opacity` |
| `.card-grid`, `.card-grid--4`, `.tiles`, `.quotes` | Auto-fit grids; each `li` is an inline-size container |
| `.split`, `.split--even` | 7/5 or 1/1 two-column split from 64em |
| `.num` | Tabular figures (also automatic on `time`, `.spec dd`, `.eyebrow__index`) |

## Contact actions and analytics
`callAction(location, { className?, label?: 'short'|'number' })` → `<a href="tel:…" data-track="call_click" data-track-location>Call</a>`, or `<a href="/contact/">Contact</a>` while `PHONE` is unknown.
`contactLink(kind: 'tel'|'sms'|'email', location, { className?, label? })` → link with `data-track="call_click|sms_click|email_click"`, or the token as text while unknown.
`callHref()`, `smsHref(body?)`, `mailHref()` → href or `null`.
Any element with `data-track="<event>" data-track-location="<where>"` is reported by `main.js` (`call_click`, `sms_click`, `email_click` with `{ location }`; `capability_statement_downloaded`). Older `call_clicked`/`email_clicked` values are mapped. Never put personal data in props.

## Breadcrumb
`breadcrumb(crumbs: {name, path}[])` (alias `breadcrumbNav` in layout.mjs). `layout()` renders it for every page with 2+ crumbs: at `<!--crumbs-->` if the body contains that marker (page heads and heroes do), else above `<main>` content.
```html
<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a><svg class="i crumbs__sep">…</svg></li><li><a href="/areas/" aria-current="page">Service areas</a></li></ol></nav>
```

## Section head with eyebrow / index number
`eyebrow({ index?, label? })` → `<p class="eyebrow"><span class="eyebrow__index">02</span><span>Label</span></p>` (hairline fills the rest of the line).
`sectionHead({ id, title, lede?, link?, level? = 2, index?, eyebrow? })`
```html
<div class="section-head"><div class="section-head__text">
  <p class="eyebrow"><span class="eyebrow__index">02</span><span>Our work</span></p>
  <h2 id="feat-h">Recent work</h2><p class="section-head__lede">…</p>
</div><a class="link-more" href="/projects/">All projects<svg/></a></div>
```
Number sections in page order (01, 02 …) on long templates; `index` is optional. `sections(list, { numbered?, start?, level?, tone? })`, `featureBento({ …, index? })`, `serviceTiles(data, { index? })`, `testimonials(…, { index? })`, `faqList(…, { index? })` and `trustBand({ index? })` pass it through.

## Heads and heroes
`pageHead({ h1, lede?, extra?, className?, eyebrow?, contour? = true })` → `<header class="page-head contour"><div class="wrap page-head__inner"><!--crumbs--><h1 id="page-title">…`.
`hero({ h1, lede?, image, variant?: 'page'|'home', ctas? = true, quoteHref?, eyebrow?, extra?, dock? })`. `page`: editorial split (text, large photo; side by side from 64em, photo `fetchpriority="high"`). `home`: full-bleed photo with a scrim, white text, `.on-deep.on-media`. Exactly one H1 per page: do not add another.

## Spec strip (RNC signature)
`specStrip(items: { label, value, href? }[], { compact?, className?, ariaLabel? })` drops empty values; arrays join with commas.
`projectSpec(data, project, { compact?, scope? })` → municipality, service (linked), season, duration, client, scope tags, plant palette. Reads optional project keys `season`, `scopeTags` (else `scope`), `plants` or `plantPalette`. Never budgets.
```html
<dl class="spec" aria-label="Project details">
  <div class="spec__item"><dt>Municipality</dt><dd><a href="/areas/oak-bay/">Oak Bay</a></dd></div>
  <div class="spec__item"><dt>Duration</dt><dd>3 weeks</dd></div>
</dl>
```
Hairline rules between cells, tabular figures, sentence-case labels. `.spec--compact` for cards. Works on `.on-deep`.

## Project card
`projectCard(data, project, { headingLevel? = 3 })` → `<li class="card project-card" data-service data-area>` with photo (`Sample` chip when `sample`), meta line (municipality · service · season · duration), title, summary. Put cards in `<ul class="card-grid">` (or `card-grid--4`). From 36rem of card width it lays out horizontally (container query).
`projectGrid(data, projects, { filters?, headingLevel? })` adds the service × municipality filter form (`data-filters`; no-JS submits GET, JS filters in place with a View Transition) and the grid (`data-project-grid`).
`resourceCards(list, { headingLevel? })` is the same card for guides (date in `<time>`).

## Service tile
`serviceTiles(data, { heading?, lede?, id?, link?, index?, eyebrow? })` → section with four tiles: 4:5 photo, solid caption (`.tile__title`, `.tile__text`).

## Review quote and reviews band
`reviewQuote(data, t, { tag?: 'li'|'div' })`
```html
<li class="quote"><figure class="review"><blockquote><p>…</p></blockquote>
  <figcaption><span>Strata council member, Langford</span><span class="quote__svc">…Grounds maintenance</span><span class="sample-label">Sample</span></figcaption></figure></li>
```
Newsreader italic is used only here and in `.case__quote`. `testimonials(data, list, { heading?, lede?, id?, link?, index?, eyebrow?, google? = true, max? })` (alias `reviewsBand`): static grid (never a carousel) plus `googleReviewsLink()` → "Read all reviews on Google" to `[GOOGLE PROFILE]` (placeholder text until set). Pass `max: 3` for bands. No review schema.

## CTA band
`ctaBand({ heading?, body?, secondary?, image?, quoteHref?, id? = 'cta-h', reply? = true })`. Without `image`: Fir night + contour motif, text left, actions right (64em). With `image`: photo background and a glass panel (`.cta-band--photo.on-media`). Shows "We reply within [REPLY TIME]." unless `reply: false`. Use `quoteHref: '/free-quote/?area=<slug>'` (or `?service=`) on area/service pages. Give each a unique `id` if a page has two.

## FAQ
`faqItem({ q, a })` → `<details class="faq__item"><summary>Q<svg class="faq__chev"/></summary><div class="faq__a"><p>…</p></div></details>`.
`faqList(faqs, { heading?, id?, lede?, index? })` → section with a sticky heading column (64em) and `<div class="faq__list">`. FAQ JSON-LD is the SEO stream's job.

## Local-rules callout
`localRules({ rules, reviewed?, heading? = 'Local rules that affect your yard', id? = 'rules-h', intro?, level? = 2 })`. `rules`: `{ title?, text, sourceUrl, sourceLabel?, verify: true, lastReviewed? }[]` (the shape in `content/areas/*.json` `localNotes`). Rules without `sourceUrl` or `verify` are dropped. Shows "Last reviewed 19 November 2026" (from `reviewed`, else the oldest `lastReviewed`).
```html
<aside class="rules" aria-labelledby="rules-h"><h2 id="rules-h"><svg/>Local rules that affect your yard</h2>
  <ul class="rules__list"><li><p><strong>Oak Bay tree permits</strong></p><p>…</p><a class="rules__src" href="…" rel="noopener">Source: oakbay.ca<svg/></a></li></ul>
  <p class="rules__meta">Last reviewed <time datetime="2026-11-19">19 November 2026</time>. Summaries only: …</p></aside>
```

## Credential row
`credentialRow({ items? })` → `<dl class="creds"><div class="creds__item"><dt><svg/>Liability insurance</dt><dd>[LIABILITY LIMIT]</dd></div>…</dl>`. Default items (`CREDENTIALS`): liability, WorkSafeBC, licences, certifications, memberships, workmanship guarantee, all tokens. `trustBand({ heading?, lede?, index?, id? })` wraps it in a Fir night band.

## Buttons and links
`quoteBtn({ tone?: 'primary'|'light', size?: 'sm'|'lg', href?, label? })`, `secondaryBtn(location, { tone?: 'secondary'|'glass'|'light', size? })` (Call [PHONE] once known, else "See our work"), `linkMore(href, label)`, `chips([[href, label]])`.
Classes: `.btn` (48 px) `--sm` (44 px) `--lg` (56 px); `--primary` (Douglas fir), `--secondary`/`--quiet`, `--light` (white on photos/Fir night), `--glass` (over photos only), `--plain`.

## Images
`picture(slotId, { sizes?, eager?, aspect?, sample?, credit?, chip?, alt?, className? })` is re-exported from `src/lib/images.mjs` (not owned by this stream). Hero: `eager: true` (`fetchpriority="high"`); everything else lazy. Slots without a photo render a labelled illustration.

## Other exports (current templates)
`hero`, `pageHead`, `sections`, `featureBento`, `beforeAfter(before, after, label)` (range input; side by side without JS), `seasons(list)`, `contactCards()` (tel, sms, email, hours, address), `sampleLabel()`, `serviceIcon(slug)`, `pad2(n)`.

## Chrome (`layout.mjs`, `20-chrome.css`, `main.js`)
- Header: glass bar; nav per C1: Services ▾ · Projects · Service areas ▾ · Process · About · Call/Contact · Free quote. Menus are `<button aria-expanded aria-controls>` disclosures (`data-menu`, `data-menu-toggle`, `data-menu-panel`); Esc closes and returns focus; outside click/focus-out closes on desktop. Without JS they open on hover/focus-within.
- Mobile (below 64em): `.nav-toggle` opens a full-height sheet; everything outside the header gets `inert`; Esc closes and focus returns to the toggle; menus become accordions.
- Sticky action bar (below 64em): `<nav class="action-bar" data-action-bar>` with `callAction('sticky_bar')` + Free quote, 48 px targets, safe-area padding. Hidden (`.is-hidden` + `inert`) while `[data-quote-form]`, `form[data-stepper]` or `.quote-form` is in view, or a text field has focus / the keyboard is open. Opt out per page with `layout(env, { actionBar: false })`.
- `scroll-padding-top/bottom` follow `--header-h` (64/72 px) and `--layout-bar-h`.
- Footer: brand + quote button, Services, Service areas (13 + hub), Company (Projects, Process, About), Resources (Seasonal guides, Reviews, FAQ, Contact), Contact (tel, sms, email, hours, address, Google reviews), legal links.

## CSS files
`00-base` (reset, type, focus, placeholders) · `10-layout` · `20-chrome` · `30-components` · `40-pages` (ports of the previous page styles so current templates keep working; phase 2 moves what it keeps into `6x-<family>.css` and deletes the rest) · `70-quote` (quote stream).
