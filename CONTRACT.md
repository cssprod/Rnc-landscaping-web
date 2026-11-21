# RNC Landscaping website: shared build contract (v3)

Every agent reads this first. It is the single source of truth for folder layout, URLs, file formats, IDs, attributes and module names, so work done in parallel fits together.

**Order of precedence:**
1. The locked user decisions in the approved plan (dark-first, living vector art, PR with Deploy Preview, "Web3" means the look only).
2. This contract.
3. `REDESIGN-PLAN.md` v3.
4. `.orchestra/briefs/<stream>.json`.

**If you need this contract changed,** write `.orchestra/requests/<your-stream>.md` and carry on with the contract as written. The contract is frozen from the seed commit until the W5 docs lane.

v3 changes from v2:
- the C1 URL map with 301s;
- three new tokens;
- content schemas v3;
- the theme, motion and alive attribute contract;
- module and CSS naming;
- frozen head scripts;
- an ownership model that replaces the folder table.

## 1. Client and scope
- **Business:** RNC Landscaping, Greater Victoria, BC, Canada. Canadian English, CAD, metric.
- **Services:** 4 lines with fixed slugs, in this order:
  - `grounds-maintenance`: Grounds Maintenance. Recurring mowing, bed care, pruning and seasonal cleanups for residential, strata and commercial sites.
  - `landscape-installation`: Landscape Installation & Construction. Design-build, softscape, hardscape and planting.
  - `irrigation`: Irrigation. Install, repair, spring start-up, winterization and water-efficiency upgrades.
  - `tree-vegetation`: Tree & Vegetation Management. Pruning, removals, invasive species and clearing. The blueprint's `tree-vegetation-management` slug is only a 301 alias.
- **Areas:** 13, with fixed slugs: `victoria`, `saanich`, `oak-bay`, `esquimalt`, `langford`, `colwood`, `view-royal`, `sooke`, `central-saanich`, `north-saanich`, `sidney`, `highlands`, `metchosin`. The blueprint's "12" is a miscount; Highlands is included.
- **Audiences:**
  - homeowners;
  - strata councils and property managers;
  - commercial, institutional and public buyers: municipalities, school districts, health and campus facilities, housing providers, churches and nonprofits, and general contractors who need a landscape sub.
- **Calls to action:** the primary CTA is "Get a free quote" → `/free-quote/`. The secondary CTA is "Call [PHONE]" once the number is known; until then it is "See our work" → `/projects/`. **No prices anywhere**: free quotes only.
- **Careers:** no careers page at launch. Leave it out of the nav and the build.
- **Fully static, for show:**
  - no backend, sign-in, CMS, form service, gate or splash page;
  - the quote form composes an email in the visitor's own email app (mailto) and shows a copyable summary;
  - the site stores nothing about visitors (`localStorage` keeps only theme and motion choices; `sessionStorage` keeps only the quote draft).
- **Analytics:** Plausible (cookieless), loaded only in launch builds when `[PLAUSIBLE DOMAIN]` is set. No cookie banner; the privacy page says so.
- **Builds:**
  - The default **showcase** build shows unconfirmed details as placeholder chips and is `noindex`.
  - `SITE_MODE=launch` is the real launch build. It fails while any required [TOKEN], Sample item or fixture remains.
- **Logo:** the original squircle mark and outlined wordmark in `brand/`.

**Art direction (locked):**
- "Fir night", dark-first for every new visitor, with header toggles for **Dark theme** and **Animations**.
- Living vector art: layered, animated SVG/CSS landscapes. No AI photos.
- Unsplash stock stays as labelled placeholders outside `/projects/`.
- "Web3" means only the visual language: glow, glass, depth, gradients, bento grids and living motion. Nothing crypto-related, ever.

## 2. Hard rules (all v2 rules kept, plus the v3 additions)
- NEVER mention any internal software, bid tool, contract-finding system or automation anywhere: copy, code comments, metadata or file names.
- Never invent real-seeming facts about RNC. Unknown business facts stay as the bracket tokens listed in §3, spelled exactly.
- **Samples.** Sample testimonials and sample projects are allowed, but each one carries `"sample": true` and renders with a visible "Sample" label.
  - Never attribute a sample quote to a real, identifiable person or business. Use generic attributions such as "Strata council member, Langford".
  - Sample plant palettes and sample job notes carry the same flag.
- **Stock photos** are placeholders only, credited, and never presented as RNC's own completed work. They are **never used under `/projects/`**, where projects use per-project living art until RNC supplies photos. Never use stock for a person shown as the owner or crew.
- **Claims.** No superlatives you cannot prove ("best in Victoria", "#1", "award-winning"). No years-in-business claims: `[FOUNDED]` appears only in JSON-LD. No invented numbers, stats, counters or tickers.
- **Local rules** (CRD watering restrictions, municipal tree bylaws, well and burning rules) may be summarised only with:
  - a `sourceUrl`;
  - an `excerpt`;
  - `verify: true`;
  - `reviewedOn`, set only when the source was actually fetched in that session.

  Never claim "no bylaw exists".
- **Schema.** No `Review` or `AggregateRating` markup anywhere. Reviews are shown for people and linked to Google.
- **Prices.** No budgets, prices, cost ranges or `$` amounts in project data, service copy or schema.
- **Motion.** No loaders, sliders, auto-advancing carousels, tilt, typewriter, glitch, marquees, custom cursors, fake HUD readouts, video, Lottie, WebGL or canvas. Nothing auto-plays except T2 ambient art (§9), which is pausable and off without JS.
- **Third parties.** Plausible (launch only) and Unsplash placeholder images (online showcase builds only) are the only allowed origins. The offline build has none.

## 3. Bracket tokens (exact spelling, only these)
| Token | Launch | Notes |
|---|---|---|
| `[PHONE]` | required | `tel:` and `sms:` are derived from it |
| `[EMAIL]` | required | mailto target of the quote builder |
| `[HOURS]` | required | display string; the structured hours in `site.json` hours.openingHours are optional |
| `[ADDRESS]` | required | or "Serving Greater Victoria" if RNC hides its address on the Google Business Profile |
| `[LEGAL NAME]` | required | |
| `[YEAR]` | required | copyright year |
| `[CREW SIZE]` | required | |
| `[OWNER NAME]` | required | guide byline "[OWNER NAME], RNC Landscaping" |
| `[OWNER BIO]` | required | |
| `[LIABILITY LIMIT]` | required | |
| `[WORKSAFEBC STATUS]` | required | |
| `[LICENCES]` | required | |
| `[CERTIFICATIONS]` | required | |
| `[MEMBERSHIPS]` | required | |
| `[WARRANTY]` | required | the workmanship guarantee is built around it |
| `[DOMAIN]` | required | bare host |
| `[REPLY TIME]` | **required (new)** | e.g. "2 business days"; used in the reply-time promise on `/free-quote/`, the CTA band and the contact page |
| `[GOOGLE PROFILE]` | optional (new) | Google Business Profile or reviews URL. When it is unset in launch, every "Read all reviews on Google" link and the footer profile link are omitted (not chips) |
| `[FOUNDED]` | optional (new) | four-digit year; **JSON-LD `foundingDate` only**, never in visible copy |
| `[PLAUSIBLE DOMAIN]` | optional | turns on analytics in launch builds |

Token values live in `content/site.json` under `tokens` (`null` means unresolved). `site/site.config.mjs` reads them and keeps `optionalTokens = ['PLAUSIBLE DOMAIN', 'GOOGLE PROFILE', 'FOUNDED']`. Showcase builds render unresolved tokens as `<mark class="ph">` chips; launch fails on any unresolved required token.

## 4. Ownership and change control (how parallel work stays safe)
- **Exclusive ownership.** Every path has at most one owner per wave. The map is `.orchestra/ownership.json`: waves w0, w1, w2, w3, w3b, w4 and w5, each with per-stream `owns` and `forbidden` globs.
  - Anything not in your `owns` list is forbidden.
  - `site/tools/check-ownership.mjs --stream=<id> --base=<sha> --head=<branch>` fails a merge that touches anything outside its set.
  - Non-overlap within each wave is machine-checked by `.orchestra/tools/check-overlap.mjs`.
- **Handover only at wave barriers.** A path changes owner between waves, never during one. W3b is the css-consolidator's exclusive lock, with its own barrier after the W3 family merges.
- **Frozen registries.** These are frozen after W1:
  - `site/src/pages/routes.mjs` (the aggregator);
  - `site/src/components/ui/index.mjs` (`export *` from each module);
  - `site/site.config.mjs`;
  - `content/site.json`.

  The build auto-discovers `site/src/styles/*.css` (in name order), `site/src/scripts/*.js` and `site/tools/check-*.mjs`, so adding a file never needs a registry edit.
- **Pre-registered stubs.** W1 creates every file a later owner needs, as an empty or stub file:
  - `pages/{styleguide,quote}.mjs`;
  - `components/living.mjs`, with the frozen signatures from §10;
  - `scripts/{living,projects,areas}.js`;
  - `styles/{45-living,6x-*,70-quote,80-styleguide,95-motion,99-print}.css`.
- **Frozen APIs.** The `site/COMPONENTS.md` signatures, `data-*` hooks and accessible names are frozen. `tests/unit/ui-api.test.mjs` fails if an export or parameter disappears. Only additive optional parameters are allowed.
- **Requests, not edits.** An agent that needs a change in a file it does not own writes `.orchestra/requests/<stream>.md` and does not edit the file. The integrator applies or routes requests at the next barrier.
- **Integrator only.** These are never done by a stream:
  - the link codemod (`tools/rewrite-links.mjs --write`);
  - regenerating `brand/tokens.css` after merges;
  - tags and pushes.
- **Branches.**
  - Streams use `w<wave>/<stream>`; fix chains use `w<wave>/<stream>--fix<n>`; W4 uses `w4/r<round>/<owner>`.
  - Integration happens on `ccr-384bdb88-mx8gtv` only. Nobody merges the PR; the user does.
- **Ports and outputs.**
  - Ports are `44<wave><lane>`; reviewers add 10 and fixers add 20. The evidence collector uses 4400.
  - Each builder builds into its own `--out=$SCRATCH/dist/<branch-with-dashes>`. Never build into another agent's directory, and never into `site/dist` while others run.

## 5. URL map (C1)
URLs keep trailing slashes. The machine-readable map covering all 58 pre-redesign URLs is `.orchestra/url-map.json`.

| URL | Template | W3 owner |
|---|---|---|
| `/` | home | t-home |
| `/services/`, `/services/{service}/` (×4), `/commercial/` | services hub, service, commercial | t-services |
| `/areas/`, `/areas/{area}/` (×13) | areas hub, municipality | t-areas |
| `/projects/` | portfolio (filter by service × municipality; `?service=`/`?area=` preselect) | t-projects |
| `/projects/{project-slug}/` (×16, **flat**) | case study | t-projects |
| `/process/` (new) | process with maintenance and installation tracks | t-company |
| `/about/`, `/faq/`, `/reviews/`, `/contact/` | company pages | t-company |
| `/resources/`, `/resources/{slug}/` (×6) | guides hub, guide | t-editorial |
| `/privacy/`, `/terms/`, `/accessibility/`, `/404.html` | legal, accessibility statement, 404 | t-editorial |
| `/free-quote/` | quote builder | quote |
| `/styleguide/` | component showcase; **showcase builds only**: noindex, not in the sitemap, never built with `SITE_MODE=launch` | ds-comp |

**Redirects.** `site/src/pages/redirects.mjs` writes `dist/_redirects`, with one line per retired URL (23 rules):
- `/portfolio/` → `/projects/`
- `/portfolio/{service}/` → `/projects/?service={service}` (the four service-filter pages are retired)
- `/portfolio/{service}/{slug}/` → `/projects/{slug}/` (×16)
- `/quote/` → `/free-quote/`
- `/services/tree-vegetation-management/` → `/services/tree-vegetation/` (courtesy alias)

The rules for redirects:
- Exactly one hop, and the destination returns 200.
- No chains and no splats that could shadow a live page.
- `serve.mjs` applies `_redirects` with trailing-slash tolerance, so Playwright sees what Netlify serves.
- `check-links --strict-redirects` verifies every row.

**Internal linking:**
- Every service page links to all 13 municipality pages.
- Every municipality page links to the 4 services and to 1–3 projects in that municipality, when they exist.
- Every project links back to its service and municipality.
- Breadcrumbs appear on every page at depth 2 or more.

**Nav.** The primary nav is: Services ▾ · Projects · Service areas ▾ · Process · About · [Call] [Free quote].
- Services ▾ and Service areas ▾ are `<button aria-expanded aria-controls>` disclosures. Never use `href="#"`.
- Commercial sits in the Services menu.
- Resources, Reviews, FAQ and Contact sit in the footer.

**Footer:**
- the 4 services and Commercial;
- the 13 municipalities, as a list;
- NAP from `site.json`, and hours;
- `tel:`, `sms:` and `mailto:` links;
- Privacy, Terms, Accessibility and the Google profile;
- no careers link and no duplicate links.

## 6. Content schemas v3
**General rules:**
- All text is plain strings; paragraphs are arrays of strings.
- Inline links use only Markdown `[text](/path/)`, on the **new URLs only**.
- Image references are slot IDs from `media/images.json`.
- Dates are ISO `YYYY-MM-DD` and are displayed as "19 November 2026" (`lib/dates.mjs`).
- Every file validates with `site/tools/check-content.mjs` against `site/tools/schemas/*.schema.json`.

**Field changes:**
- **Additive changes:** a field marked *deprecated* stays readable until the W3 template that used it stops reading it. Only then may the content stream remove it.
- **Forbidden keys anywhere in content:** `budget`, `price`, `cost`, `rate`, and any `$` amount.

### `content/site.json` (single source of truth; owned by W1 ia, frozen afterwards)
```json
{
  "tokens": { "PHONE": null, "EMAIL": null, "HOURS": null, "ADDRESS": null, "LEGAL NAME": null, "YEAR": null,
    "CREW SIZE": null, "OWNER NAME": null, "OWNER BIO": null, "LIABILITY LIMIT": null, "WORKSAFEBC STATUS": null,
    "LICENCES": null, "CERTIFICATIONS": null, "MEMBERSHIPS": null, "WARRANTY": null, "DOMAIN": null,
    "REPLY TIME": null, "GOOGLE PROFILE": null, "FOUNDED": null, "PLAUSIBLE DOMAIN": null },
  "name": "RNC Landscaping", "shortName": "RNC", "locale": "en-CA", "region": "Greater Victoria, BC",
  "nap": { "name": "RNC Landscaping", "legalName": "[LEGAL NAME]", "address": "[ADDRESS]", "phone": "[PHONE]", "email": "[EMAIL]" },
  "hours": { "display": "[HOURS]", "openingHours": [] },
  "replyTime": "[REPLY TIME]",
  "googleProfile": "[GOOGLE PROFILE]",
  "founded": "[FOUNDED]",
  "owner": { "name": "[OWNER NAME]", "bio": "[OWNER BIO]", "photo": "about-owner" },
  "crewSize": "[CREW SIZE]",
  "warranty": "[WARRANTY]",
  "services": [ { "slug": "grounds-maintenance", "name": "Grounds Maintenance", "navLabel": "Grounds maintenance" } ],
  "municipalities": [ { "slug": "victoria", "name": "Victoria" } ],
  "credentials": [
    { "id": "insurance", "label": "Liability insurance", "value": "[LIABILITY LIMIT]", "issuerUrl": null },
    { "id": "worksafebc", "label": "WorkSafeBC", "value": "[WORKSAFEBC STATUS]", "issuerUrl": null },
    { "id": "licences", "label": "Business licences", "value": "[LICENCES]", "issuerUrl": null },
    { "id": "certifications", "label": "Certifications", "value": "[CERTIFICATIONS]", "issuerUrl": null },
    { "id": "memberships", "label": "Memberships", "value": "[MEMBERSHIPS]", "issuerUrl": null }
  ],
  "sameAs": [],
  "capabilityStatement": "/downloads/rnc-capability-statement.pdf"
}
```
- `services` lists all 4 in contract order; `municipalities` lists all 13.
- `hours.openingHours` uses schema.org `OpeningHoursSpecification` objects and is emitted only when non-empty.
- `sameAs` holds only profiles RNC controls.

**Consumers:** header, footer, JSON-LD, every page. `check-content#single-source` fails if any NAP value, municipality list or founding year appears hard-coded in templates or other content.

### `content/services/<slug>.json`
- **v2 fields:** `slug`, `name`, `navLabel`, `seo{title ≤60, description ≤160}`, `hero{h1, lede, image}`, `audiences[]`, `includes[{title, body}]`, `process[{title, body}]`, `seasonal[{season: Spring|Summer|Fall|Winter, items[]}]`, `detailImages[]`.
- `faqs[{q, a}]`: **5–6** per service.
- **New in v3:**
  - `"localContext": "one sentence of Greater Victoria context for the H1 lede"`
  - `"goodFitIf": ["3–5 short statements"]`
  - `"perVisit": { "caption": "What happens on each visit", "rows": [ { "task": "...", "detail": "..." } ] }`. A table, never prices. For installation and irrigation, "visit" means a job stage.
  - `"localRulesRefs": ["crd-watering"]`: ids of blocks in `content/regional.json` or of area `localRules`.

### `content/projects/<slug>.json` (16, 4 per service, all `sample: true` until RNC supplies real ones)
```json
{ "slug": "oak-bay-front-garden-renewal", "sample": true, "title": "...", "service": "landscape-installation", "area": "oak-bay",
  "clientType": "Homeowner | Strata | Commercial | Institutional | Public sector | General contractor",
  "seo": { "title": "≤60", "description": "≤160" }, "summary": "one sentence",
  "season": "Spring | Summer | Fall | Winter | Year-round", "duration": "e.g. 3 weeks",
  "scope": ["scope tags shown in the spec strip"], "tags": ["filter/feature tags, lowercase-hyphen"],
  "challenge": "para", "approach": ["para", "para"], "result": "one line, no invented numbers about RNC's business",
  "plantPalette": [ { "common": "Pacific bleeding heart", "botanical": "Dicentra formosa", "note": "optional" } ],
  "testimonial": "testimonial-slug | null",
  "images": { "before": "slot-id", "after": "slot-id", "gallery": ["slot-id"], "art": "proj-<slug>-art" } }
```
- `plantPalette` is optional, `[]` where irrelevant, and labelled "Sample plant palette" when `sample` is true.
- `story[]` is deprecated in favour of `challenge`/`approach`/`result`.
- No budgets.

### `content/testimonials/<slug>.json` (7 today, all samples)
`{ "slug", "sample": true, "quote", "attribution": "Strata council member, Langford", "service", "area", "source": "sample | google" }`

### `content/areas/<slug>.json` (13; owned by areas-content)
```json
{ "slug": "oak-bay", "name": "Oak Bay", "seo": { "title": "Landscaping in Oak Bay, BC — X & Y | RNC Landscaping", "description": "≤160" },
  "h1": "Landscaping in Oak Bay", "summary": ["paragraphs written only for this place"],
  "neighbourhoods": ["..."], "propertyTypes": ["..."],
  "localRules": [ { "id": "oak-bay-tree-bylaw", "topic": "trees | watering | wells | burning | invasives | other", "text": "...",
      "sourceUrl": "https://...", "excerpt": "verbatim sentence from the source", "verify": true, "reviewedOn": "2026-11-21 | null" } ],
  "conditions": [ { "id": "oak-bay-salt-spray", "kind": "soils | exposure | deer | salt-spray | water-supply | wells | lot-types | other",
      "text": "...", "sourceUrl": "https://...", "excerpt": "...", "verify": true, "reviewedOn": "YYYY-MM-DD | null" } ],
  "sharedRegional": ["crd-watering", "crd-invasives"],
  "proof": [ { "kind": "project", "project": "oak-bay-front-garden-renewal" },
             { "kind": "job-note", "service": "irrigation", "text": "...", "sample": true } ],
  "topServices": ["landscape-installation", "tree-vegetation"],
  "servicesBlurb": { "grounds-maintenance": "one local sentence on why it is requested here" },
  "neighbours": ["victoria", "saanich"],
  "featuredProject": "project-slug | null", "image": "area-oak-bay" }
```
- Every page needs at least 3 genuinely local blocks: localRules, conditions and proof.
- No sentence may appear on two area pages, except inside the shared regional block.
- Deprecated: `intro[]` (use `summary`) and `localNotes[]` (split into `localRules` plus `sharedRegional`).

### `content/regional.json` (owned by areas-content)
`{ "blocks": [ { "id": "crd-watering", "heading": "...", "text": "...", "sourceUrl", "excerpt", "verify": true, "reviewedOn", "appliesTo": ["all"] | ["slug", …] } ] }`
- Each CRD-wide rule exists **once**.
- An area page renders the blocks it references inside one `<aside data-shared="regional">`, which the duplicate checks exempt.
- Service pages reference the same ids through `localRulesRefs`.

### `content/resources/<slug>.json` (6)
`{ "slug", "title", "seo", "summary", "image", "body": [ {"h2"} | {"p"} | {"list": []} ], "sources": [{label, url}],`
`  "author": { "name": "[OWNER NAME]", "org": "RNC Landscaping", "url": "/about/" }, "published": "2026-11-19", "updated": null }`
- `published` is the real existing date. Never invent or spread dates.
- `updated` is set only when the content really changed.
- `date` is deprecated (an alias of `published`).
- Byline: "[OWNER NAME], RNC Landscaping", linking to `/about/`.

### `content/pages/*.json`
- **v2 shape kept:** `{ "seo": {title, description}, "h1", "lede", "sections": [{ "id", "heading", "body": [], "items": [{title, body}] }], "_notes" }`.
- **Files:** home, commercial, about, contact, faq (`faqs[{q, a, category}]`), reviews, resources, services (hub), **projects** (hub; replaces `portfolio.json`, which routes read as a fallback until it is removed), areas (hub, areas-content), privacy, terms, accessibility, 404, **process** (new), quote.

**`process.json` (new):**
```json
{ "seo": {}, "h1": "How we work", "lede": "...",
  "overview": [ { "title": "Request", "body": "..." }, { "title": "Site visit" }, { "title": "Written quote" }, { "title": "Scheduled work" } ],
  "tracks": [
    { "id": "maintenance", "name": "Maintenance track", "summary": "...", "steps": [ { "title": "...", "body": "...", "deliverable": "what you receive at this step" } ] },
    { "id": "installation", "name": "Installation track", "summary": "...", "steps": [ { "title": "...", "body": "...", "deliverable": "..." } ] } ],
  "guarantee": { "heading": "Our workmanship guarantee", "body": ["plain-language paragraphs built around [WARRANTY]"] } }
```
`overview` feeds the home 4-step timeline.

**`quote.json` v3 (the six-input builder, owned by quote from W2):**
```json
{ "seo": {}, "h1": "Get a free quote", "lede": "...",
  "reassurance": ["Free, no obligation", "We reply within [REPLY TIME]", "No prices shown here — every quote is site-specific"],
  "fields": {
    "services": { "label": "What do you need?", "help": "Choose one or more", "error": "Choose at least one service" },
    "area": { "label": "Municipality", "placeholder": "Choose your municipality", "other": "Somewhere else in Greater Victoria", "error": "..." },
    "details": { "label": "About the property or job", "help": "...", "examples": ["..."], "maxLength": 1200, "error": "..." },
    "timing": { "label": "Timing", "options": [ {"value": "asap", "label": "As soon as possible"}, {"value": "this-season", "label": "This season"}, {"value": "planning", "label": "Planning ahead"} ] },
    "name": { "label": "Your name", "error": "..." },
    "contact": { "label": "Best way to reach you",
      "options": [ {"value": "email", "label": "Reply by email"}, {"value": "call", "label": "Call me"}, {"value": "text", "label": "Text me"} ],
      "phone": { "label": "Phone number", "help": "Needed for a call or text", "error": "..." } } },
  "subject": "Free quote request — {services} — {area}",
  "buttons": { "submit": "Open my email app", "copy": "Copy request", "copied": "Copied", "copyAddress": "Copy address", "restart": "Start again", "gmail": "Gmail", "outlook": "Outlook.com", "call": "Call", "text": "Text us" },
  "messages": { "errorSummary": "...", "ready": { "heading": "...", "body": "..." }, "truncated": "...", "noJs": "...", "copyFailed": "..." },
  "nextSteps": [ { "title": "...", "body": "..." } ],
  "privacy": "..." }
```
- The visitor sends from their own email app, so there is **no email field**.
- The six inputs are: services, area, details, timing, name and contact. The phone field appears for call or text and is then required.
- `services` options come from `site.json`, plus "Not sure yet".

## 7. Images and media
- **`media/images.json`** is owned by W2 `living` and frozen in W3. It is an array of slots:

  `{ id, usedOn, purpose, aspect: 16:9|4:3|3:2|1:1|4:5|21:9, alt, brief, stock: {provider, pageUrl, imageUrl, photographer, photographerUrl, license} | null, rncToSupply, art?: {scene, palette} }`
  - All v2 slot ids are kept.
  - Slots are pre-allocated for `proj-<project-slug>-art` (×16) and `process-hero`.
  - `about-owner` and `about-crew` never get stock.
- **Slots without a photo** render labelled living art (`lib/art.mjs`, `components/living.mjs`), never an unlabelled stand-in.
- **Local photos** go through `site/tools/process-images.mjs`, which reads `media/photos/<slot>.(jpg|png)` and writes:
  - `site/static/img/<slot>-<w>.(avif|webp|jpg)` at 480/768/1024/1600 widths, with all metadata stripped;
  - the `media/photos.json` manifest of dimensions and licence.
- **`<picture>` rules:**
  - the hero gets `fetchpriority="high"` and is never lazy-loaded;
  - everything else gets `loading="lazy" decoding="async"`;
  - every image has explicit `width`/`height`;
  - alt text is written by hand, and `alt=""` is used when decorative.

## 8. Attribute contract (theme, motion, alive)
These attributes all sit on `<html>`:

| Attribute | Values | Meaning |
|---|---|---|
| `lang` | `en-CA` | always |
| `class="js"` | added by `HEAD_SCRIPT` | JS is running; every enhancement keys off it |
| `data-theme` | absent \| `dark` \| `light` | **Absent means dark** (D1: dark is the default for every visitor; `prefers-color-scheme` is NOT consulted). `[data-theme=light]` selects the light ("dawn") values. `dark` is an explicit stored choice and renders the same as absent. |
| `data-motion` | absent \| `on` \| `off` | Absent means auto: motion is effective only with `.js` **and** `prefers-reduced-motion: no-preference`. `on` is an explicit user opt-in that overrides the OS setting; `off` disables T1, T2, T3 and T4 and makes T0 instant. |
| `data-alive` | absent \| present | Set by `scripts/living.js` after `load` plus idle, only while motion is effective. It is removed when motion turns off or the tab is hidden. Ambient (T2) loops run only while it is present. |

- **Storage:**
  - `localStorage['rnc-theme']` holds `light` or `dark`;
  - `localStorage['rnc-motion']` holds `on` or `off`;
  - `sessionStorage['rnc-quote-draft']` holds the quote draft as JSON.

  Every storage access is wrapped in try/catch.
- **Before paint:** `HEAD_SCRIPT` (§11) applies only a *stored* choice. CSS decides the default, so the hash never changes.
- **`scripts/lib/prefs.js` API:**
  - `theme(): 'dark'|'light'`, `setTheme(t)` and `onThemeChange(fn)`;
  - `motionOn(): boolean`, `setMotion(on: boolean)` and `onMotionChange(fn)`.

  It dispatches `document` CustomEvents:
  - `rnc:theme` with `{detail: {theme}}`;
  - `rnc:motion` with `{detail: {on, source: 'user'|'system'}}`. `system` fires when the OS setting changes while no choice is stored.
- **The toggles** are rendered by `layout.mjs`, owned by ds-chrome:
  - Each is `<button type="button" class="pref-toggle" data-pref="theme|motion" aria-pressed="true|false">`. The accessible names are exactly **"Dark theme"** and **"Animations"**.
  - `aria-pressed="true"` means dark is effective, or motion is effective.
  - Each is at least 44×44 and visible at every width. They are hidden without JS (`html:not(.js) [data-pref] {display: none}`).
  - A theme change updates `<meta name="theme-color">` and may run a circular view-transition reveal from the button (T1).
- **`color-scheme`:** `:root` sets `color-scheme: dark` and `[data-theme=light]` sets `light`. The meta tag is `<meta name="color-scheme" content="dark light">`.
- **Off-screen pausing:** `[data-offscreen]` on a scene root (set by an IntersectionObserver in living.js) locally sets `--alive-play: paused`.

## 9. Motion policy (implemented in `95-motion.css`; living loops in `45-living.css`)
| Tier | What | Rule |
|---|---|---|
| T0 | essential feedback (hover, press, focus) | ≤ 250 ms via `var(--dur-t0)`; instant under reduced motion or `data-motion=off` |
| T1 | one-shot ≤ 2 s (reveals, contour draw-in, view transitions, theme reveal) | `var(--dur-t1)`, which is 0 when motion is not effective; never on the LCP element |
| T2 | ambient loops > 5 s (scene drift, fireflies, CTA blobs, map pulse) | `animation-play-state: var(--alive-play)`; runs only under `[data-alive]`, paused off-screen or on a hidden tab; no JS means no T2 (2.2.2 satisfied) |
| T3 | pointer effects (spotlight, magnetic ≤ 3 px) | `@media (hover: hover) and (pointer: fine)`, and only while motion is effective |
| T4 | scroll-linked (parallax, `view()` timelines) | inside `@supports (animation-timeline: scroll())`, keyed off `[data-reveal]` / `[data-parallax]`; off when motion is not effective |

- `prefers-reduced-motion` may appear only in `brand/tokens.css` and `95-motion.css`. Legacy slices are exempt until they are deleted.
- Component CSS animates through the variables and hooks above, never with raw durations. `tools/check-motion-policy.mjs` lints this.
- Only `transform` and `opacity` are animated, plus `stroke-dashoffset` for T1 contour draws.
- Living layers are separate OUTER `<svg>` boxes. Inner nodes are never animated.
- Cross-document view transitions are allowed: `@view-transition { navigation: auto }` sits inside a no-preference media query, and its pseudo-elements get `animation: none` under `[data-motion=off]`.

## 10. Components
- **The catalogue:** `site/COMPONENTS.md` is the frozen API: function name, module, parameters, root class, `data-*` hooks and accessible names.
- **Modules:**
  - `site/src/components/ui/{actions,heads,cards,projects,trust,faq,cta,seasons,callouts}.mjs`, plus `index.mjs` (`export *`, frozen after W1);
  - `components/{layout,sprite,map,forms,living}.mjs`.
- **Rules:**
  - Each primitive renders one DOM for every width, with no mobile and desktop copies.
  - Headings are never above H2 unless the caller passes a level.
  - Ids come from parameters, so two instances never collide.
- **Frozen signatures** in `components/living.mjs` (the W1 stub returns `''`):
  - `livingScene(sceneId, o?)`
  - `projectArt(project, o?)`
  - `illustrationChip()`

## 11. Head scripts (frozen at the seed commit; `site/src/lib/head-scripts.mjs`)
```js
export const HEAD_SCRIPT = "(function(d){d.classList.add('js');try{var s=localStorage,t=s.getItem('rnc-theme'),m=s.getItem('rnc-motion');if(t=='light'||t=='dark')d.setAttribute('data-theme',t);if(m=='on'||m=='off')d.setAttribute('data-motion',m)}catch(e){}})(document.documentElement)";
export const SPECULATION_RULES = '{"prefetch":[{"source":"document","where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/downloads/*"}}]},"eagerness":"moderate"}]}';
export const INLINE_SCRIPTS = [HEAD_SCRIPT, SPECULATION_RULES];
```
- **CSP hashes** (computed from the block above; `script-src` must contain both): `'sha256-Oll6+m4CCBe9f8HiX1NwMDMSxA4sH6+jgiL5Tt6PPmw='` (HEAD_SCRIPT) and `'sha256-e/V45puEkmExhxNeRRDj63BcBJYQnr0OxJtHNZf1ofY='` (SPECULATION_RULES).
- **Placement:** `layout.mjs` emits `<script>${HEAD_SCRIPT}</script>` before the stylesheet link and `<script type="speculationrules">${SPECULATION_RULES}</script>` in `<head>`.
- **Prefetch, not prerender:** prerender would make Plausible count pageviews that never happened.
- **Hash check:** the build fails if any inline `<script>` (other than `application/ld+json` data blocks) is not byte-equal to an entry in `INLINE_SCRIPTS`, or if its `sha256` is missing from the netlify.toml CSP `script-src`. `tools/csp.mjs --check` runs in every gate.
- **Fallback:** if Chromium rejects the speculation-rules hash, switch to a `Speculation-Rules` response header pointing at `/speculationrules.json`, and record the change here in W5.
- **`JS_FLAG` transition.** At the seed, the orchestrator also changes `layout.mjs` to emit `HEAD_SCRIPT` and re-export `JS_FLAG = HEAD_SCRIPT`, so the old `build.mjs` CSP check keeps passing on every W1 base.
  - W1 `build` switches the check to `INLINE_SCRIPTS`.
  - W2 `ds-chrome` deletes the alias.
  - The seed CSP carries the two `INLINE_SCRIPTS` hashes. The pre-redesign `JS_FLAG` hash is dropped at the seed, because that script is no longer emitted.

## 12. Scripts, modules and CSS naming
**JavaScript.** Each `site/src/scripts/*.js` file is an ES module; `site/src/scripts/lib/*.js` are leaf libraries.

| Module | Role | W2 owner | W3 owner |
|---|---|---|---|
| `main.js` | chrome: header state, disclosures, mobile sheet, sticky bar, toggles, delegated `data-track` clicks | ds-chrome | frozen |
| `lib/track.js` | `track(name, props)`: no-op unless Plausible is loaded; typed by `event-schema.d.ts` | ds-chrome | frozen |
| `lib/prefs.js` | theme and motion state (§8) | ds-chrome | frozen |
| `living.js` | `data-alive`, off-screen pausing, spotlight (T3) | living | frozen |
| `quote.js` | builder; exports pure functions `buildSubject`, `buildBody`, `buildMailto`, `buildWebmail`, `buildSms`, `capLength` | quote | frozen |
| `projects.js` | filters (same-document view transition), before/after | (frozen) | t-projects |
| `areas.js` | map ↔ list state mirroring | (frozen) | t-areas |

**How modules are built and loaded:**
- The build hashes modules in dependency order. Leaf libraries come first, and import specifiers are rewritten to the hashed URLs.
- Outputs are written to `/assets/build/<name>.<hash10>.js`, with `lib/track.js` → `lib-track.<hash>.js`.
- Each module is recorded as `env.assets.modules[name] = {src, deps[]}`, and every dependency gets a `<link rel="modulepreload">`. There is no import map.
- `main` and `living` load on every page. Other modules load through the route's `scripts: ['quote']` option, passed to `layout(env, {scripts})`.

**CSS.** The build concatenates `site/src/styles/NN-name.css` in file-name order into one hashed `/assets/build/site.<hash10>.css`. `brand/tokens.css` is prepended unlayered (ds-core may move it into a `tokens` layer in W2).

`00-layers.css` declares the layers, lowest priority first:
```css
@layer legacy, reset, base, layout, chrome, components, living, pages, utilities, motion, print;
```
Every other file wraps its rules in exactly one of those layers.

| Range | Files | Layer | Owner (W2 → W3) |
|---|---|---|---|
| 00–29 | `00-layers`, `01-reset`, `02-base`, `03-type`, `05-layout`, `08-utilities` | reset, base, layout, utilities | ds-core |
| 30 | `30-chrome` | chrome | ds-chrome |
| 40–49 | `40-ui-actions`, `41-ui-heads`, `42-ui-cards`, `43-ui-projects`, `44-ui-trust`, `46-ui-faq`, `47-ui-cta`, `48-ui-seasons`, `49-ui-callouts` (paired with `ui/*.mjs`) | components | ds-comp → actions and heads frozen; projects → t-projects; trust and faq → t-company; cards and cta → t-home; seasons and callouts → t-services |
| 45 | `45-living` | living | living |
| 50 | `50-legacy-NN-<owner>.css` (from `.orchestra/legacy-css-map.json`) | legacy | each owner deletes its own; W3b proves none remain |
| 60–65 | `60-home`, `61-services`, `62-areas`, `63-projects`, `64-company`, `65-editorial` | pages | W3 families |
| 70 | `70-quote` | pages | quote |
| 80 | `80-styleguide` | pages | ds-comp |
| 95 | `95-motion` | motion | ds-core |
| 99 | `99-print` | print | ds-core |

- **The minifier** is tokenizer-aware: it leaves strings, `url()`, custom-property values and `@supports`/`@media` conditions intact. Run `--no-minify` for debugging.
- **Container queries** are used for cards and tiles. The content breakpoints are 40em, 64em and 80em.
- **The view-transition and spotlight hooks** are implemented only in 95-motion.css and 45-living.css.

## 13. Analytics events (Plausible; no personal data in any property)
| Event | Props | Fired by |
|---|---|---|
| `quote_started` | none | quote.js, on first interaction |
| `quote_mailto_opened` | `service` (slug, or `multiple` or `not-sure`), `area` (slug or `other`) | quote.js |
| `quote_copied` | none | quote.js |
| `quote_webmail_opened` | `provider`: `gmail` or `outlook` | quote.js |
| `call_click` | `location` | `data-track="call_click" data-track-location="<location>"` |
| `sms_click` | `location` | `data-track="sms_click"` |
| `email_click` | `location` | `data-track="email_click"` |
| `capability_statement_downloaded` | none | `data-track` |

- Locations: `header`, `sticky_bar`, `hero`, `cta_band`, `footer`, `contact_page`, `quote_ready`, `quote_aside`.
- The v2 names `call_clicked`, `email_clicked`, `quote_submitted` and `quote_step_completed` are retired in W2. The quote stream owns `event-schema.yaml` and `.d.ts`; the owners of the files that emit `data-track` attributes rename them in the same wave.

## 14. Build interface
- `node build.mjs [--offline-images] [--out=DIR] [--no-minify]` builds into `site/dist` by default.
  - `--out` (or `SITE_DIST`) builds elsewhere.
  - The build writes a `.rnc-dist` marker and refuses to delete a directory that is neither empty nor marked.
- `SITE_MODE=launch` produces the launch build. `CONTEXT` is the Netlify context.
- All tools read `SITE_DIST`. `serve.mjs` reads `PORT` (default 4321) and applies `_redirects`, `_headers` and the netlify.toml headers.
- Every route declares `{ path, file, render, sources[], scripts[] }`. The sitemap `<lastmod>` is the latest git commit date of `sources`; on shallow clones it falls back to the build date with one warning.
- `/404.html` and `/styleguide/` are never in the sitemap.

## 15. Design tokens
- **Source and compilation:** `brand/tokens.json` (W3C Design Tokens format) is the source, owned by ds-core in W2 and frozen in W3. `node brand/build-tokens.mjs` compiles it to `brand/tokens.css`, and the site build compiles it on every run.
- **Naming:** names become custom properties by joining the path (`color.ink-2` → `--color-ink-2`).
- **Groups:** `color`, `material`, `glass`, `font`, `space`, `radius`, `shadow`, `motion`, `layout`, `z`, plus new `focus` (two-tone ring) and `scene` (art palette anchors).
- **v3 dark-first:**
  - `$value` is the dark ("Fir night") value, and `$extensions["ca.rnc.light"]` holds the light value, emitted under `:root[data-theme=light]`.
  - The top-level `$extensions["ca.rnc.default"]` is `"dark"`.
  - The v2 `ca.rnc.dark` extensions are migrated, not kept.
- **Aliases:** the older names (`--step-0`…`--step-5`, `--font-display`, `--font-text`, `--color-surface`, `--color-accent`, `--radius-s/m/l`, `--shadow-1/2`, `--dur-fast`, `--dur-base`, `--ease`, `--content-max`, `--gutter`) remain as aliases until the W3b consolidation removes their last use.
- **Living-art palettes** are CSS variables in `45-living.css`, derived from core tokens with `color-mix()`, so `living` never edits `tokens.json`.
- **Contrast (`brand/check-contrast.mjs`):**
  - every text/surface and focus/surface pair passes WCAG 2.2 AA in both themes;
  - every surface has at least one ring colour ≥ 3:1, and the two ring colours are ≥ 3:1 against each other;
  - glass is checked at worst case over art-palette extremes.

## 16. Gates, budgets, severity
- **Gates:** the full gate list is in each brief and in `REDESIGN-PLAN.md` §Verification. Every gate runs from `site/` with the stream's own `OUT` and `PORT`.
- **Budgets v2** (per page, gzip):

  | Metric | Fail | Warn |
  |---|---|---|
  | CSS | > 36 KB | > 28 KB |
  | JS, including the import graph | > 22 KB | > 14 KB |
  | HTML | > 30 KB gz / 150 KB raw | > 22 KB gz / 90 KB raw |
  | Inline SVG | > 45 KB raw | n/a |
  | Hero scene / used sprite / art file | > 16 / 8 / 14 KB raw | n/a |
  | Fonts | > 110 KB or > 2 files | n/a |
  | Page weight | home > 500 KB, inner > 350 KB | n/a |
  | Lighthouse mobile, any category (median of 3) | < 95 | < 98 |
  | LCP / CLS / TBT | > 1.8 s / > 0.05 / > 150 ms | n/a |
  | Infinite animations running with motion off | > 0 | n/a |
  | Infinite animations per viewport with motion on | > 8 | n/a |
  | `backdrop-filter` elements per mobile viewport | > 3 | n/a |
  | Third-party origins (offline build) | > 0 | n/a |
  | axe violations | > 0 | n/a |
- **Severity:**
  - **Blocker:** a hard-rule breach, CSP error, budget fail, broken link or redirect, or a no-JS failure.
  - **Major:** a missing blueprint item, a visible defect at a tested width, or an interaction bug.
  - **Minor:** polish; it goes to "known issues" in TRACEABILITY.
- **Traceability:** every blueprint item (A13 #1–36, A12 #1–7, C1–C8, P0 #1–P4 #19) maps to exactly one stream and one check in `.orchestra/traceability.json`.
