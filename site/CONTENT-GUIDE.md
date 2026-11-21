# Content guide for the owner

All copy lives in `content/` as JSON files. Edit a file on GitHub (pencil icon), commit, and Netlify rebuilds the site in about a minute. There is no admin login: the repository is the editor. The full field list for every file is in `CONTRACT.md` section 6 ("Content schemas v3").

## Rules every edit follows
- **Only true facts about RNC.** Anything only you can confirm (phone, crew size, insurance, warranty and so on) stays as a bracket token such as `[PHONE]` until you supply it. Never replace a token with a guess.
- **No prices.** No budgets, prices, cost ranges or `$` amounts anywhere. Every quote is free and site-specific.
- **No claims you cannot prove.** No "best", "#1", "award-winning" or years in business. No invented numbers, counters or statistics.
- **Samples are labelled.** Sample projects, testimonials and plant palettes carry `"sample": true` and show a visible Sample label. A sample quote is never attributed to a real, identifiable person or business.
- **Local rules need a source.** A watering rule, tree bylaw, well or burning rule is summarised only with a link to the official source. Never write that "no bylaw exists".
- **Canadian English and plain language.** "Neighbour", "colour", "centre", "licence" (noun). Short sentences. Dates as `YYYY-MM-DD` in the files; the site shows them as "19 November 2026".
- **Links.** Inline links use Markdown, `[text](/path/)`. Use the current addresses: `/free-quote/`, `/projects/`, `/projects/<slug>/`, `/process/`.

## Replace the placeholders
Highlighted chips such as `[PHONE]` are information only you can supply. The values live under `tokens` in `content/site.json` (on older builds, `site/site.config.mjs`); `null` means "not supplied yet". The showcase site shows what is left; a launch build refuses to publish until every required value is filled in.

Three of them change how pages behave:
- `[REPLY TIME]`, for example "2 business days", is the reply promise on the quote, contact and commercial pages and in the FAQ. Only promise a time you can keep.
- `[GOOGLE PROFILE]` is your Google Business Profile or reviews link. Until it is set, "Read all reviews on Google" shows as plain text in the showcase and is left out of the launch site.
- `[WARRANTY]` is the wording of your workmanship guarantee. The guarantee on `/process/`, `/about/` and in the FAQ is built around it and promises nothing beyond it.

A link built from a token (`tel:` from `[PHONE]`, `mailto:` from `[EMAIL]`, the Google link) is never published while the token is empty.

## Projects (`content/projects/`)
Each project has a `challenge` (one paragraph), an `approach` (one or two paragraphs) and a `result` (one line, with no invented numbers). The spec strip shows the municipality, service, `season` (Spring, Summer, Fall, Winter or Year-round), `duration` and `scope` tags. `plantPalette` lists plants with common and botanical names; leave it as `[]` when no planting was involved. `images.art` names the illustration used until you supply photos; project pages never use stock photos. `story` is an older field kept until the new project template ships; keep it equal to the challenge followed by the approach.

To publish a real project, write it in the same shape, set `"sample": false`, and make sure the client agreed.

## Services (`content/services/`)
Besides the overview, each service has `localContext` (one sentence about Greater Victoria), `goodFitIf` (three to five short statements), a `perVisit` table of what happens on each visit or job stage (never prices), the seasonal plan, five or six FAQs written for that service, and `localRulesRefs`, which point at the shared rule blocks in `content/regional.json` instead of repeating rule text.

## Guides (`content/resources/`)
Each guide shows the byline "[OWNER NAME], RNC Landscaping", linking to `/about/`. `published` is the date the guide first went up; never move it. Set `updated` to the day you change what a guide says (a rule, a claim, advice), and leave it alone for typo fixes. `date` is an older copy of `published`, kept until the new template ships.

## Pages (`content/pages/`)
- `process.json` holds the four steps shown on the home page, the maintenance and installation tracks (each step names what you receive), and the workmanship guarantee.
- `projects.json` is the projects hub; it replaces `portfolio.json`, which stays only until the old route is retired.
- `faq.json` gives every question an `id`; the home page lists questions by id instead of copying them.
- People: the about page shows only you, through `[OWNER NAME]` and `[OWNER BIO]`, with your own photo in the `about-owner` slot. No team grid, and no names, roles or crew photos that are not real.

## Replace samples
Every project and testimonial with `"sample": true` shows a visible Sample label and blocks a launch build. For a real project or a real, consented review, set it to `false` (testimonials also set `"source": "google"` when the review is on your Google profile). Remove sample entries you do not replace.

## Photos
Photos are referenced by slot ID (for example `proj-irrigation-1`) in `media/images.json`. To use your own photo, add it to `site/static/` (for example `site/static/photos/oak-bay-garden.jpg`) and ask your developer to point the slot at it. Until a slot has your photo, it shows a placeholder: a labelled illustration, or a stock photo in online builds. A simpler photo workflow is planned, and this guide will be updated when it ships. Stock photos are never shown as your work, and never stand in for you or your crew.

## Quote requests
The quote form opens the visitor's email app with their request written out, addressed to `[EMAIL]`. Requests arrive in that inbox like any other email; nothing is stored on the website.

## Other files you supply
- `static/downloads/rnc-capability-statement.pdf` for commercial buyers.
- Brand files (logo, icons, fonts, colours) live in `brand/`; see `brand/brand.md`.
