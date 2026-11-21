# RNC redesign plan (v3: "Fir night", alive)

This is the working brief for the redesign.

**Sources and documents:**
- **Requirements** come from `research/cedar-springs-teardown-blueprint.md` (the "blueprint"; it sits at the repo root until the seed commit moves it). Section numbers below refer to it.
- **The contract** is `CONTRACT.md` v3: URLs, schemas, attributes, module names and ownership.
- **The art direction** is in `DESIGN-DIRECTION.md`, written by the W0 synthesizer: palettes, the bento grammar, a hero concept per template, and the approved effects with their budgets.
- **Per-stream work** is in `.orchestra/briefs/<stream>.json`. The item-by-item checklist is `.orchestra/traceability.json`.

Read the contract, this file and your brief before changing anything.

**Goal:**
- A visually stunning, **alive** site (living vector landscapes, glow, glass and bento depth) on top of RNC's fast, accessible static build.
- Every fault the blueprint lists is fixed (A13 #1–36), and the full RNC blueprint is delivered (A12 #1–7, C1–C8, P0 #1–P4 #19).
- Lighthouse ≥ 95 in all four categories and WCAG 2.2 AA, shipped as a PR with a Netlify Deploy Preview.

## Status (true as of 21 November 2026, commit `8798346`)
v2 of this file claimed an "Already done (foundation commit)" section. **None of it exists.** This is the real state.

**What exists:**
- **Generator:** the zero-dependency Node 22 SSG, `site/build.mjs`, which builds **58 pages** in about 0.2 s. They are listed in `.orchestra/url-map.json`.
- **Pages:** all 58 come from one `site/src/pages/routes.mjs`, one `site/src/styles/site.css` (677 lines) and one `site/src/scripts/main.js` (279 lines).
- **Components:**
  - `site/src/components/ui.mjs` holds 21 exports: the v2 "Liquid Glass" primitives;
  - `layout.mjs` (header with a services mega panel, footer, `JS_FLAG`);
  - `map.mjs` (13 SVG tiles), `forms.mjs` (a 4-step quote stepper with 13 fields), `sprite.mjs`.
- **Libraries:** `site/src/lib/{html,tokens,images,art,schema,data}.mjs`.
  - `html`/`md`/`typographer`, `finalizeTokens`/`telLink`/`mailLink`, `picture()` and `landscapeSvg()` are reusable.
  - `schema.mjs` emits `LandscapingBusiness`, **which is not a schema.org type**.
- **Tokens:** `brand/tokens.json` (DTCG), light-first with `ca.rnc.dark` extensions, plus `build-tokens.mjs` and `check-contrast.mjs`.
- **Content:** `content/` holds 4 services, 16 sample projects, 7 sample testimonials, 13 areas, 6 guides and 15 pages. `media/images.json` has 62 slots, and `research/areas.json` holds the facts checked on 19 November 2026.
- **Tools and tests:** `site/tools/` has check-all, check-links, check-html, check-tokens, check-placeholders, budgets, serve, screenshots and gen-event-types. `site/tests/site.spec.mjs` is one Playwright file. `.github/workflows/ci.yml` and `netlify.toml` (CSP with the `JS_FLAG` sha256) also exist.

**What does not exist (every item below is planned work in W1–W3):**
- No `content/site.json`.
- No `seo.mjs`, `redirects.mjs` or `_redirects`.
- No page-family files.
- No `/projects/`, `/free-quote/` or `/process/`: the site still serves `/portfolio/{service}/{slug}/` and `/quote/`.
- No `--out`/`SITE_DIST` support: `build.mjs` deletes a hard-coded `site/dist`.
- No numbered CSS files.
- No JS modules beyond `main.js`.
- No `COMPONENTS.md` before this W0 skeleton.

**Content defects still to fix:**
- **52** content links to `/quote/` and **17** to `/portfolio/` (the integrator's codemod handles these in W1).
- Area pages share their CRD notes and boilerplate intro paragraphs, so they fail the swap test. Sooke has no local rule.
- Projects lack `season`/`plantPalette` and carry a boilerplate `story[2]`.
- Guides have no byline.

**Broken tooling:**
- CI has never passed its first step: `tsc` fails with `TS2688` (jsconfig `typeRoots`).
- `npx playwright test` cannot resolve the global Playwright from ESM.
- `serve.mjs` ignores `_redirects` and `_headers`.
- The regex CSS minifier can mangle strings.

## Decisions (do not relitigate)
**Locked user decisions (from the approved plan; they win over everything):**
1. **Deploy:** push `ccr-384bdb88-mx8gtv` and open a PR to `main`. The Netlify Deploy Preview is the review surface. A draft PR opens after W1 and is marked ready at W5. The user merges; agents never merge.
2. **Imagery:** **living vector art** (layered, animated SVG/CSS landscapes, sharp at any DPI). Unsplash stays as labelled placeholders outside `/projects/`. No AI photos.
3. **Theme:** **dark-first ("Fir night") for every new visitor**, with header toggles for **Dark theme** and **Animations** (`aria-pressed`, remembered in `localStorage`, applied before paint).
4. **"Web3"** means the visual language only: glow, glass, depth, gradients, bento grids and living motion. Nothing crypto-related.

**Execution decisions D1–D7:**
- **D1:** dark is the default for every visitor without a stored choice; `prefers-color-scheme` is not consulted.
- **D2:** two `aria-pressed` buttons, named exactly "Dark theme" and "Animations".
- **D3:** dates are displayed as "19 November 2026".
- **D4:** `/styleguide/` is built in showcase builds only.
- **D5:** "No autoplay" means media and carousels. Ambient art is T2 and is pausable.
- **D6:** Unsplash photos are used only outside `/projects/`.
- **D7:** draft PR after W1.

**v2 decisions that still stand:**
- **Places and slugs.** Keep **13** municipalities and the contract's service slugs (`tree-vegetation`, with a 301 alias from the blueprint's spelling).
- **Pages.** Keep `/commercial/` (commercial proof points, A12 #5), `/resources/`, `/reviews/` and `/contact/` in addition to C1. No careers page.
- **Navigation.** Primary nav per C1: Services ▾ · Projects · Service areas ▾ · Process · About · [Call] [Free quote].
  - Disclosures are `<button aria-expanded>`.
  - Commercial sits in the Services menu.
  - Resources, Reviews, FAQ and Contact sit in the footer.
- **Quote builder (C5): one page, six inputs** (CONTRACT §6 `quote.json`, §13 events).
  - **Inputs:** services (4 multi-select cards); municipality `<select>` of 13, prefilled from `?area=` (and `?service=` prefills services); a description; timing; name; and "best way to reach you" (email / call / text). A phone field appears for call or text and is then required. There is **no email field**.
  - **Submit:** builds a `mailto:` with the subject "Free quote request — Irrigation — Saanich". The body in the URL is capped at about 1,800 characters; a longer request is truncated with a note to paste the copied full text. The form `action` is the mailto (`method="post" enctype="text/plain"`), so it works without JS.
  - **Ready panel:** Copy request (`role="status"`), the address with a copy button, Call / Text (only when `[PHONE]` is known), and Gmail / Outlook web links.
  - **Validation:** native validation, inline errors and an error summary. Values are never cleared, and the draft is kept in `sessionStorage`.
  - **Code:** pure builders are unit-tested with `node --test`.
- **Schema (C6).** One `@graph` per page:
  - `HomeAndConstructionBusiness`, `WebSite`, `WebPage`;
  - `Service` per service page;
  - `BreadcrumbList`;
  - `FAQPage` (semantic only; FAQ rich results stopped on 7 May 2026);
  - `Article` with author for guides.

  `areaServed` is the 13 places and `hasOfferCatalog` the 4 services. Placeholders are omitted, never published. **No** `Review` or `AggregateRating`.
- **OG.** `og:locale` en_CA and `og:type` website (article for guides), with one OG card per page. `site/tools/og-cards.mjs` is built in W2, and cards are rendered and committed in W5 at ≤ 45 KB each.
- **Focus contrast (C3, P0 #3).** v2 light-mode Camas `#5A4FCF` measures 2.83:1 on Fir night, which fails. No single ring colour is safe over art, so the ring is **two-tone** (inner and outer colours, each pair ≥ 3:1). `check-contrast.mjs` tests every focus/surface pair in both themes.
- **Responsive (C4).**
  - One DOM per component; breakpoints at 40em, 64em and 80em; container queries for cards and tiles.
  - **Mobile sheet:** `inert`, Esc, focus return, accordions.
  - **Sticky Call / Free-quote bar below 64em:** each button ≥ 48 px, `env(safe-area-inset-bottom)`, hidden over the quote form or while the keyboard is open.
  - **Focus and targets:** `scroll-padding` equals the header and bar heights (2.4.11). Primary targets are ≥ 44×44 and all others ≥ 24×24.
  - No horizontal scroll at 320 px, and 200 % zoom works.
- **Images (C4, P4 #17).** `<picture>` AVIF → WebP → JPEG at 480/768/1024/1600 via `site/tools/process-images.mjs`, with `sharp` installed in scratch, never as a repo dependency. All metadata is stripped and licences go in a manifest. Alt text is written by hand.
- **Municipality pages (C2, C6).**
  - **Local blocks:** at least 3 genuinely local blocks on every page: local rules with source, verify flag and last-reviewed date; sourced conditions; local proof.
  - **Shared CRD rules:** they live **once** in `content/regional.json` and render inside `[data-shared]`.
  - **Also on every page:** most-requested services and why, neighbouring municipalities, and a CTA to `/free-quote/?area=<slug>`.
  - **Swap test:** all 13 pages must pass it.
- **Projects (A12 #1):**
  - The spec strip shows municipality, service, season, duration, scope tags and the plant palette.
  - The story follows Challenge → Approach → Result. **No budgets.** Samples are labelled.
- **Guides (A13 #20).** The byline is "[OWNER NAME], RNC Landscaping", linking to `/about/`. Keep the real dates. Show published and updated dates as "19 November 2026".
- **Trust (C5):**
  - a `[REPLY TIME]` promise and "What happens next";
  - a credentials row that uses tokens only;
  - a reviews band: 3 quotes in Newsreader italic, labelled Sample, with "Read all reviews on Google" → `[GOOGLE PROFILE]`;
  - a named owner, local-rules expertise, and a plain-language guarantee built around `[WARRANTY]`.

**v2 decisions that are superseded (aesthetics only; every hard constraint is kept):**

| v2 restraint | v3 decision |
|---|---|
| "Editorial, not glass everywhere"; Liquid Glass only on chrome | Glass is allowed on content cards **with a contrast-safe minimum alpha and a solid fallback** under `prefers-reduced-transparency`, `prefers-contrast: more` and `forced-colors`. No `backdrop-filter` over animated layers below 64em, and at most 3 per mobile viewport. |
| Remove aurora washes | Aurora survives only as **T2 ambient, composited only** (transform/opacity on pre-blurred layers), inside living scenes and the CTA band. |
| Remove pointer-following sheen | It returns as the **T3 cursor spotlight** on bento cards: fine pointer only, and off when motion is off. |
| Remove tilt | **Tilt stays removed.** |
| Large real photography | **Living vector art** carries the imagery. Photo slots stay for RNC's future photos (`media/images.json`). |
| Motion 150–250 ms only | The 150–250 ms limit applies to **interactive** motion (T0). Ambient motion is T2 under the motion policy. |
| Light, Sea fog default | **Dark-first**: light is a toggle. |

In TRACEABILITY, P4 #18 and A12 #6 are recorded as "superseded on aesthetics; hard constraints kept".

**Kept from v2's direction:**
- the field-survey **spec strip** (hairline rules, tabular figures, sentence-case labels), numbered sections and the topographic contour motif drawn from the area map;
- sentence case in the source HTML;
- no loaders, sliders, autoplay media or scroll-jacking.

## The "alive" direction (summary; `DESIGN-DIRECTION.md` is authoritative)
- **Living landscape hero.** 4–6 stacked OUTER `<svg>` layer boxes: stars or dawn sky, ranges, water shimmer, ridge, firs, mist.
  - Slow drift over 60–120 s, and fireflies fading at ≤ 0.5 Hz.
  - About 5 KB of HTML plus 1.5 KB of CSS.
  - Bioluminescent at night, dawn in light.
  - 13 distinct area scenes and per-project art.
  - The H1, not the art, is the LCP element.
- **Other approved effects:**
  - scroll-linked parallax (T4);
  - topographic contour draw-in (T1);
  - `view()` scroll reveals (T1/T4, never on the LCP element);
  - cursor spotlight (T3);
  - `@property` gradient borders, ambient on at most 2 elements;
  - the two-tone glow focus ring (mandatory);
  - cross-document and same-document view transitions (filter, before/after, a circular theme reveal);
  - the glowing interactive area map;
  - the living CTA band (pre-blurred blobs, a fixed scrim under the text);
  - contrast-safe glass bento;
  - static grain on deep bands;
  - speculation-rules prefetch;
  - an optional magnetic CTA (≤ 3 px).
- **Banned:** tilt, counters, tickers, marquees, typewriter, glitch, custom cursor, fake HUD readouts, skeleton loaders, video/Lottie, and WebGL/canvas (software GL breaks Lighthouse TBT).
- **The judges:** J2 (accessibility and performance) has a veto, informed by the L1 effects lab (`.orchestra/reports/effects-lab.json`). J3 ("stunning and alive") picks the grafts. S1 writes `DESIGN-DIRECTION.md`, `.orchestra/direction/{tokens-proposal.json,effects-approved.json,motion-policy.md}`.

## Motion policy (CONTRACT §9; implemented in `95-motion.css`)
- **T0** essential feedback ≤ 250 ms; instant under reduced motion or with Animations off.
- **T1** one-shot ≤ 2 s and view transitions; off under `[data-motion=off]` or reduced motion; never on the LCP element.
- **T2** ambient loops (> 5 s) run only when motion is effective **and** `data-alive` is set. `living.js` sets it after `load` plus idle. Loops pause off-screen and on hidden tabs (`animation-play-state: var(--alive-play)`). With no JS, nothing ambient runs (WCAG 2.2.2).
- **T3** pointer effects: fine pointer only, and not when motion is off.
- **T4** scroll-linked effects: inside `@supports`, and not when motion is off.
- **Where `prefers-reduced-motion` may appear:** only in `tokens.css` and `95-motion.css`. The motion-policy lint enforces this.
- **Budgets:**
  - 0 infinite animations running with motion off;
  - at most 8 per viewport with motion on;
  - animate only transform and opacity, plus `stroke-dashoffset` for T1 draws.

## Waves and streams
Each stream runs builder → reviewer → fixer in its own worktree and branch `w<wave>/<stream>`. Ownership is exclusive per wave (`.orchestra/ownership.json`; non-overlap machine-checked).

| Wave | Streams | Merge order |
|---|---|---|
| W0 | A1 architect, A2 critic → A3 reviser; P1–P3 art proposers; L1 effects lab; R1 area research; R2 content audit; J1–J3 judges; S1 synthesizer; then the seed commit | — |
| W1 | build, ia, areas-content, content | build → ia → areas-content → content → codemod; then draft PR |
| W2 | ds-core, ds-chrome, ds-comp, living, seo, quote, qa (+ areas-content and content continuing) | ds-core → ds-chrome → ds-comp → living → seo → quote → qa → areas-content → content → codemod |
| W3 | t-home, t-services, t-areas, t-projects, t-company, t-editorial, css-consolidator (tooling) | t-editorial → t-company → t-services → t-areas → t-projects → t-home |
| W3b | css-consolidator (exclusive lock on `site/src/styles/**`) | consolidator |
| W4 | evidence pack, 7 read-only finders, triage, owner fixers (fix-system, fix-features, fix-pages, fix-qa, fix-content); at most 3 rounds with a divergence guard | per round |
| W5 | og-render, docs (README, CONTRACT final, CHANGELOG, LAUNCH-CHECKLIST, brand.md, TRACEABILITY.md), ci, release-gate | then the PR is marked ready |

**Seed commit (orchestrator, after the W0 contract lane):**
1. `git mv cedar-springs-teardown-blueprint.md research/` and fix the references.
2. Commit CONTRACT v3, this file, the COMPONENTS.md skeleton and `.orchestra/**`.
3. Add the frozen `site/src/lib/head-scripts.mjs` (CONTRACT §11). Make `layout.mjs` emit `HEAD_SCRIPT` and the speculation rules, with `JS_FLAG` kept as an alias of `HEAD_SCRIPT` so the old build check passes. Put both hashes in the netlify.toml CSP, then build once to prove the CSP check is green.
4. `git config gc.auto 0`.

**Failure handling:**
- A crash, or a run with no commits, is relaunched once.
- Green gates with partial acceptance after 2 fix rounds: merge, and log the gap in `.orchestra/carry.json`.
- Red gates: do not merge. The legacy CSS slices keep the old pages working, and the stream gets a catch-up lane next wave.
- Never revert another stream's work.

## Verification (gate at every merge and wave end)
```
cd site && node tools/dev-setup.mjs --devtools
node ../brand/build-tokens.mjs --check && node ../brand/check-contrast.mjs
tsc -p jsconfig.json
node --test "tests/unit/**/*.test.mjs"
node build.mjs --offline-images --out=$OUT && SITE_DIST=$OUT node tools/check-all.mjs --no-build --strict-redirects
node tools/csp.mjs --check
PORT=$P SITE_DIST=$OUT node node_modules/playwright/cli.js test --trace off
node tools/a11y.mjs --themes=dark,light --widths=320,1440 --motion=off,on
node tools/motion-audit.mjs && node tools/text-over-media.mjs
node tools/lighthouse.mjs --runs=3          # quiet slot only; ≥ 95 ×4 on every template
node build.mjs && node tools/check-all.mjs --no-build   # Netlify parity (online images, default dist)
node tools/check-ownership.mjs --stream=<id> --base=<sha> --head=<branch>
```
`check-all` covers links, html, tokens, placeholders, budgets, content, seo, honesty and ownership.

**End to end:**
- the art director reviews the screenshot matrix (320/390/768/1024/1440 × dark/light × motion);
- the swap test passes 13/13;
- TRACEABILITY has every item evidenced;
- CI is green on the PR, and the Netlify Deploy Preview builds green;
- the user does the final visual check on the SSO-protected preview and merges.

## Commands
```
cd site && node build.mjs --offline-images --out=$SCRATCH/dist/<branch>
SITE_DIST=$SCRATCH/dist/<branch> node tools/check-all.mjs --no-build
PORT=44xx SITE_DIST=$SCRATCH/dist/<branch> node tools/serve.mjs
```
- **Playwright** is 1.63.0 under `/opt/node-tools` and Chromium is at `/opt/pw-browsers`. Until `tools/dev-setup.mjs` exists, use `/opt/node-tools/node_modules/.bin/tsc -p jsconfig.json --typeRoots /opt/node-tools/node_modules/@types`.
- **Scratch installs:** the npm registry works for `axe-core`, `lighthouse` and `sharp`. Install them outside the repo.
- **Blocked hosts:** Unsplash, municipal sites and the Netlify API cannot be reached from the container. Use `--offline-images` for screenshots and tests.
