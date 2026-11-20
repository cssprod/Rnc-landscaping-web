# RNC Landscaping website — shared build contract

Every agent reads this first. It is the single source of truth for folder layout, file formats and IDs, so work done in parallel fits together. Do not change another agent's folder. If you need a change to this contract, write it in `CHANGE-REQUESTS.md` and continue with the contract as written.

## Client and scope (from the approved plan)
- Business: **RNC Landscaping**, Greater Victoria, BC, Canada. Canadian English, CAD, metric.
- Services (4 lines, slugs fixed):
  - `grounds-maintenance`: Grounds Maintenance (recurring mowing, bed care, pruning, seasonal cleanups; residential, strata, commercial)
  - `landscape-installation`: Landscape Installation & Construction (design-build, softscape, hardscape, planting)
  - `irrigation`: Irrigation (install, repair, spring start-up, winterization, water-efficiency upgrades)
  - `tree-vegetation`: Tree & Vegetation Management (pruning, removals, invasive species, clearing)
- Areas (13, slugs fixed): `victoria`, `saanich`, `oak-bay`, `esquimalt`, `langford`, `colwood`, `view-royal`, `sooke`, `central-saanich`, `north-saanich`, `sidney`, `highlands`, `metchosin`
- Audiences: homeowners; strata councils and property managers; commercial, institutional and public buyers (municipalities, school districts, health and campus facilities, housing providers, churches and nonprofits, general contractors needing a landscape sub).
- Primary CTA "Get a Free Quote". Secondary "Call [PHONE]". **No prices anywhere**: free quote only.
- Careers page: NOT at launch (omit from nav and build).
- Analytics: Plausible (cookieless). No cookie banner needed; mention in privacy page.
- Quote requests go to a **Google Sheet** (no email inbox for now): Netlify Forms captures the submission, and a Netlify outgoing webhook posts it to a Google Apps Script web app that appends a row.
- Logo: an original mark is designed in this build (brand agent).

## Hard rules
- NEVER mention any internal software, bid tool, contract-finding system or automation anywhere (copy, code comments, metadata, file names).
- Never invent real-seeming facts about RNC. Unknown business facts stay as bracket tokens exactly as listed below.
- Sample testimonials and sample projects are allowed but every one carries `"sample": true` and renders with a visible "Sample" label. Never attribute a sample quote to a real, identifiable person or business: use generic attributions like "Strata council member, Langford".
- Stock photos are placeholders only, credited, never presented as RNC's own completed work without a "Sample image" label in portfolio contexts.
- No superlatives you cannot prove ("best in Victoria", "#1"). No years-in-business claims.
- Local rules (CRD watering restrictions, municipal tree bylaws) may be summarised only with a source URL and a `verify` note.

## Bracket tokens (exact spelling, only these)
`[PHONE]` `[EMAIL]` `[HOURS]` `[ADDRESS]` `[LEGAL NAME]` `[YEAR]` `[CREW SIZE]` `[OWNER NAME]` `[OWNER BIO]` `[LIABILITY LIMIT]` `[WORKSAFEBC STATUS]` `[LICENCES]` `[CERTIFICATIONS]` `[MEMBERSHIPS]` `[WARRANTY]` `[DOMAIN]` `[PLAUSIBLE DOMAIN]` `[SHEET WEBHOOK URL]`

## Folder ownership
| Folder | Owner | Contents |
|---|---|---|
| `research/` | Research agent | `competitors.md`, `positioning.md`, `keywords.md`, `areas.json` |
| `brand/` | Brand agent | `logo.svg`, `logo-mark.svg`, `logo-reversed.svg`, `favicon.svg`, `tokens.json`, `tokens.css`, `brand.md`, `directions.html` |
| `media/` | Imagery agent | `images.json`, `shot-list.md` |
| `content/` | Copy agent | JSON files as specified below |
| `site/` | Engineering agent | generator, templates, static assets, config, tests, docs |

## Content formats (copy agent writes, engineering agent reads)
All text is plain strings; paragraphs are arrays of strings; inline links use Markdown `[text](/path/)` only (the generator renders them). Image references are slot IDs from `media/images.json`.

`content/services/<slug>.json`
```json
{ "slug": "irrigation", "name": "Irrigation", "navLabel": "Irrigation",
  "seo": { "title": "≤60 chars", "description": "150–160 chars" },
  "hero": { "h1": "...", "lede": "...", "image": "svc-irrigation-hero" },
  "audiences": [ { "title": "Homeowners", "body": "..." } ],
  "includes": [ { "title": "...", "body": "..." } ],
  "process": [ { "title": "...", "body": "..." } ],
  "seasonal": [ { "season": "Spring", "items": ["..."] } ],
  "faqs": [ { "q": "...", "a": "..." } ],
  "detailImages": ["svc-irrigation-detail-1", "svc-irrigation-detail-2"] }
```
`content/projects/<slug>.json` (16 total, 4 per service; `slug` like `oak-bay-front-garden-renewal`)
```json
{ "slug": "...", "sample": true, "title": "...", "service": "landscape-installation", "area": "oak-bay",
  "clientType": "Homeowner | Strata | Commercial | Institutional | Public sector | General contractor",
  "summary": "one sentence", "scope": ["..."], "duration": "e.g. 3 weeks", "story": ["para", "para"],
  "result": "one line, no invented numbers about RNC's business", "testimonial": "testimonial-slug or null",
  "images": { "before": "slot-id", "after": "slot-id", "gallery": ["slot-id"] } }
```
`content/testimonials/<slug>.json` (8 total): `{ "slug", "sample": true, "quote", "attribution": "Strata council member, Langford", "service", "area" }`
`content/areas/<slug>.json` (13): `{ "slug", "name", "seo":{title,description}, "h1", "intro":["para"], "neighbourhoods":["..."], "propertyTypes":["..."], "localNotes":[{"text","sourceUrl","verify":true}], "servicesBlurb": {"<service-slug>": "one local sentence"}, "featuredProject": "project-slug", "image": "area-<slug>" }` — every area page must read differently.
`content/pages/home.json`, `commercial.json`, `about.json`, `quote.json`, `contact.json`, `faq.json`, `reviews.json`, `resources.json`, `services.json` (hub), `portfolio.json` (hub), `areas.json` (hub), `privacy.json`, `terms.json`, `accessibility.json`, `404.json`. Each: `{ "seo":{title,description}, "h1", "lede", "sections":[{ "id", "heading", "body":["para"], "items":[{"title","body"}] }] }` plus any page-specific keys documented at the top of the file in a `"_notes"` string. `faq.json` has `"faqs":[{q,a,category}]`. `quote.json` has `"steps"` describing the multi-step form fields, labels, help text and error messages.
`content/resources/<slug>.json` (6 seasonal articles): `{ "slug","title","seo","date":"2026-11-19","summary","image","body":[ {"h2"} | {"p"} | {"list":[...]} ] , "sources":[{label,url}] }`

## Images (imagery agent writes `media/images.json`)
Array of slots: `{ "id", "usedOn", "purpose", "aspect": "16:9|4:3|3:2|1:1|4:5", "alt", "brief", "genPrompt", "stock": { "provider", "pageUrl", "imageUrl", "photographer", "photographerUrl", "license" } | null, "rncToSupply": true|false }`.
Required slot IDs:
- `home-hero`, `home-commercial`, `about-crew`, `about-owner` (rncToSupply true, stock null — never stock a person as the owner), `commercial-hero`, `quote-aside`, `og-default`
- per service S: `svc-S-hero`, `svc-S-detail-1`, `svc-S-detail-2`, `svc-S-before`, `svc-S-after`
- per project: `proj-<project-slug>-main` (copy agent's 16 slugs are not known in advance, so imagery agent provides generic `proj-S-1` … `proj-S-4` for each service S; copy agent references those)
- per area A: `area-A`
- per resource: `res-1` … `res-6`

## Generator output
`site/dist/` is the deployable static site. URLs use trailing slashes: `/services/irrigation/`, `/portfolio/irrigation/`, `/portfolio/irrigation/<project-slug>/`, `/areas/oak-bay/`, `/resources/<slug>/`, `/commercial/`, `/about/`, `/reviews/`, `/faq/`, `/quote/`, `/quote/thanks/`, `/contact/`, `/privacy/`, `/terms/`, `/accessibility/`, `/404.html`.

## Design token names (brand agent defines values in `brand/tokens.css`; engineering agent uses only these names)
Colours: `--color-bg` `--color-surface` `--color-surface-2` `--color-ink` `--color-ink-muted` `--color-line` `--color-brand` `--color-brand-ink` (text on brand) `--color-brand-deep` `--color-accent` (CTA fill) `--color-accent-ink` (text on accent) `--color-focus` `--color-success` `--color-error` `--color-placeholder` (dashed highlight for bracket tokens on staging)
Type: `--font-display` `--font-text` and fluid sizes `--step--1` `--step-0` `--step-1` `--step-2` `--step-3` `--step-4` `--step-5`; `--leading-tight` `--leading-body`
Space: `--space-1` … `--space-9`; layout `--content-max` (e.g. 1240px) `--gutter`
Shape: `--radius-s` `--radius-m` `--radius-l` `--shadow-1` `--shadow-2`
Motion: `--dur-fast` `--dur-base` `--ease`
`brand/tokens.json` also gives `"fonts": { "googleCssUrl": "https://fonts.googleapis.com/css2?..." }`.
Dark mode is not required for launch; tokens target a light theme with WCAG 2.2 AA contrast for every text pairing.
