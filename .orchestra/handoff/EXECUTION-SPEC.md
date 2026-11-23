# RNC "Fir night" redesign: execution spec (architect output, approved with PLAN.md)

Read alongside `PLAN.md`. The locked user decisions in PLAN.md win over anything here.

## Ownership rules (go into CONTRACT.md v3 and every brief)
- **Exclusive ownership.** Each path glob has one owner per wave. The source of truth is `.orchestra/ownership.json`. `site/tools/check-ownership.mjs --stream --base --head` fails when a branch touches anything outside its set.
- **Handover between waves only.** A file can change owner at a wave boundary, never during a wave.
- **Frozen registries.** The `src/pages/routes.mjs` aggregator and `ui/index.mjs` (`export *`) are frozen after W1. The build auto-discovers `src/styles/*.css` (in name order), `src/scripts/*.js` and `tools/check-*.mjs`.
- **Pre-registered stubs.** W1 creates every file a later owner will need: `pages/{styleguide,quote}.mjs`, `components/living.mjs` (frozen signature), `scripts/{living,projects,areas}.js`, `styles/{45-living,6x-*,70-quote}.css`.
- **Frozen APIs.** The COMPONENTS.md signatures, `data-*` hooks and accessible names are frozen. A snapshot test (`tests/unit/ui-api.test.mjs`) fails if an export or parameter disappears. Only additive optional parameters are allowed.
- **Requests, not edits.** An agent that needs a change in a file it does not own writes `.orchestra/requests/<agent>.md` and does not edit the file. The integrator applies or routes requests at the next barrier.
- **Generated and mechanical changes belong to the integrator.** These are the link codemod (`tools/rewrite-links.mjs --write`) and the regenerated `brand/tokens.css`. They are never hand-merged.

## Hotspot decisions
| Hotspot | Decision |
|---|---|
| `ui.mjs` | W1 `ia` splits it mechanically, with byte-identical HTML, into `components/ui/{actions,heads,cards,projects,trust,faq,cta,seasons,callouts}.mjs` plus `index.mjs`. CSS is paired: 40-ui-actions, 41-ui-heads, 42-ui-cards, 43-ui-projects, 44-ui-trust, 46-ui-faq, 47-ui-cta, 48-ui-seasons, 49-ui-callouts. W2 `ds-comp` owns all of them. W3 hands stewardship to the main consumers with signatures frozen: projects → t-projects; trust and faq → t-company; cards and cta → t-home; seasons and callouts → t-services. `actions` and `heads` stay frozen in W3 and only W4 fixers may change them. |
| `main.js` | W1 `build` splits it into `main.js` (chrome), `lib/track.js` (same `track()` API), `lib/prefs.js` (theme and motion state: `motionOn()`, `onMotionChange()`, `theme()`, plus `rnc:motion` / `rnc:theme` events), `quote.js` and `projects.js`. Modules are hashed in dependency order: leaf libraries first, then importers with their specifiers rewritten to the hashed URLs, plus `<link rel=modulepreload>`. No import map, because its hash would change on every build. W2 owners: ds-chrome takes main.js and lib/**, living takes living.js, quote takes quote.js. W3: t-projects takes projects.js. |
| `layout.mjs` | W1 `ia` adds the C1 nav structure, the seo.mjs calls and a `scripts:[]` option that reads `env.assets.modules[name] = {src, deps[]}`. W2 ds-chrome adds the visual chrome, the toggles and the sticky bar. Frozen in W3. Keep the exact strings `<header class="site-header"` and `<footer class="site-footer"`, because `check-html.mjs:35` matches them, unless qa changes that check first. |
| netlify.toml CSP | Hashes are set at seed time and the inline scripts are frozen, so the CSP does not change again. `tools/csp.mjs --check` runs in every gate. `serve.mjs` applies the netlify.toml headers, so every Playwright test runs against the real CSP. Owners: W1 build (other headers), W2 qa, W5 ci. |
| `brand/tokens.json` | Only W2 ds-core edits it (and regenerates tokens.css). Living-art palettes are CSS variables in 45-living.css, derived from core tokens with `color-mix()`, so `living` never edits tokens.json. Frozen in W3. |
| `media/images.json` | Only W2 `living` edits it. It pre-allocates every slot (per-project art slots, process-hero). Frozen in W3. Unknown slots still render labelled art. |
| `site.config.mjs`, `content/site.json` | Only W1 ia edits them (new tokens; NAP and lists move into site.json). Frozen afterwards; the orchestrator applies any later change. |
| `tests/` | W1 ia splits site.spec.mjs into per-owner `tests/e2e/{global,chrome,quote,projects,areas,…}.spec.mjs` using the new URLs. Unit tests are `tests/unit/<owner>-*.test.mjs`. qa owns the harness: `playwright.config.mjs`, `tests/helpers/**` and `global.spec.mjs`. |
| `CONTRACT.md` | W0 A1/A3 write it. Frozen until W5 docs. |
| Legacy CSS | W1 build splits site.css into `5x-legacy-<owner>.css` per `legacy-css-map.json`, wrapped in `@layer legacy` (lowest priority, declared in `00-layers.css`). Each owner deletes its own slice once replaced. The consolidator verifies that none remain. |

## Seed commit (orchestrator, after the W0 contract lane)
1. `git mv cedar-springs-teardown-blueprint.md research/` and fix the references.
2. Commit CONTRACT v3, REDESIGN-PLAN v3, the COMPONENTS.md skeleton and `.orchestra/**`.
3. Add `site/src/lib/head-scripts.mjs`, then **freeze it**. It applies only a stored choice; CSS decides the default, so the hash never changes:
```js
export const HEAD_SCRIPT = "(function(d){d.classList.add('js');try{var s=localStorage,t=s.getItem('rnc-theme'),m=s.getItem('rnc-motion');if(t=='light'||t=='dark')d.setAttribute('data-theme',t);if(m=='on'||m=='off')d.setAttribute('data-motion',m)}catch(e){}})(document.documentElement)";
export const SPECULATION_RULES = '{"prefetch":[{"source":"document","where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/downloads/*"}}]},"eagerness":"moderate"}]}';
export const INLINE_SCRIPTS = [HEAD_SCRIPT, SPECULATION_RULES];
```
   Use prefetch, not prerender: prerender would make Plausible count pageviews that never happened. `layout.mjs` and `build.mjs` import from this file, and the build requires the hash of every `INLINE_SCRIPTS` entry in the CSP. Both hashes go into the netlify.toml CSP. W1 verifies in Playwright that there is no CSP error. If Chromium rejects the speculation-rules hash, switch to the `Speculation-Rules` header pointing at `/speculationrules.json`.
4. `git config gc.auto 0`.

## W0 contract and art-direction lanes
| ID | Lens | Owns | Outputs / acceptance |
|---|---|---|---|
| A1 architect | Contract-first systems architect | CONTRACT.md, REDESIGN-PLAN.md, site/COMPONENTS.md (skeleton), `.orchestra/**` (except direction/ and reports/) | **CONTRACT v3:** URL map; tokens `[REPLY TIME]` (required), `[GOOGLE PROFILE]` and `[FOUNDED]` (optional); content schemas v3; `data-theme`/`data-motion` attribute contract; module and CSS naming; ownership.json; briefs; traceability skeleton. **Acceptance:** every A13 #1–36, C1–C8 and P0 #1–P4 #19 maps to exactly one stream and one check; ownership globs do not overlap within any wave (machine-checked); all 58 current URLs are in url-map. |
| A2 critic → A3 reviser | Adversarial completeness | n/a | Finds gaps, overlaps and unverifiable criteria; A3 fixes them. |
| P1/P2/P3 proposers | Art director plus prototyper | `.orchestra/direction/P<n>.md` and scratch specimens | Both-theme palettes (contrast pre-checked), type, bento grammar, a hero concept per template, the effects they chose from the inventory, and 8 screenshots (390/1440 × dark/light × motion frame). **Rules:** no fake stats, telemetry, tickers or counters. |
| L1 effects lab | Rendering performance | `.orchestra/reports/effects-lab.json` | For each effect: main-thread ms per frame at 4× CPU throttle (CDP), whether it is composited, and its Lighthouse delta on a test page. |
| R1 area research | Local-government researcher | `research/area-facts/<slug>.json`, `research/area-sources.md` | ≥ 3 sourced rule or condition facts per municipality. Each fact: URL, excerpt, `verify:true`, and `reviewedOn` only if fetched in this session. Cover Sooke, wells vs regional water, deer, salt spray and soils. **Never claim "no bylaw exists".** |
| R2 content auditor | Editor, honesty lens | `.orchestra/reports/content-audit.json` | Per-file edit briefs (boilerplate, shared images, duplicate area text, old links) and a swap-test baseline. |
| J1/J2/J3 judges | J1 conversion and honesty; J2 a11y and performance (veto, reads L1); J3 "stunning and alive" art director | `.orchestra/direction/J<n>.md` | Rubric scores, vetoes and the picks to graft. |
| S1 synthesizer | Creative director | `DESIGN-DIRECTION.md`, `.orchestra/direction/{tokens-proposal.json, effects-approved.json, motion-policy.md}` | Resolves each REDESIGN restraint conflict explicitly. Every effect has a budget, a fallback and an a11y note. The palette passes AA. |

## W1–W3 stream acceptance (summary; full detail lives in the briefs)
- **build.** `--out` / `SITE_DIST` / `PORT`, with a `.rnc-dist` marker guard before any `rmSync`. Tokenizer-aware minifier with golden tests and a `--no-minify` mode. `@layer` concatenation and legacy slices with **0 px screenshot diff at 390 and 1440**. Module-graph hashing, modulepreload and `env.assets.modules`. `lib/{track,prefs}.js`. Sprite tree-shaking. Git `lastmod`, falling back to the build date with a warning on shallow clones. `serve.mjs` applies `_redirects` (301, trailing-slash tolerant), `_headers` and the netlify.toml headers (CSP included), and serves avif/webp/jpg MIME types. `tools/csp.mjs`. `tools/dev-setup.mjs` (symlinks `site/node_modules/{playwright,playwright-core,@types/node}`; `--devtools` installs lighthouse@12 and axe-core@4 into `$SCRATCH/devtools`). `check-all` discovers every `check-*` tool. `check-ownership.mjs`. tsc green. The first CI steps go green.
  - **Verifier:** rerun in a clean worktree; run two builds in parallel into different `--out` dirs and confirm they don't interfere; inject an inline script and confirm the CSP console error; minifier parity; budgets within ±2 %.
- **ia.** C1 URLs (`/projects/`, `/projects/{slug}/`, `/free-quote/`, a `/process/` stub). A 301 for every retired URL with no chains (A13 #2, #35). Family files, `_shared`, the frozen aggregator, stubs, and `sources` declared per route. seo.mjs (`headMeta`, `jsonLd`). site.json as the single source (P0 #1, A13 #13, #14). C1 nav with disclosure buttons and the C1 footer (A13 #7, #8, #25, #26; P2 #13). Routes read `pg('projects') ?? pg('portfolio')` during the transition. Output byte-identical except URLs. The codemod runs dry-run only, **never on content/**. A content schema validator (A13 #23). The ui/ split. Tests split per owner.
  - **Verifier:** old sitemap vs new; every old URL gets one 301 to a 200; no orphan pages; nav landmarks and names; strict check-links on a codemodded scratch copy.
- **areas-content.** ≥ 3 genuinely local blocks per page: `localRules` (source, verify, reviewedOn), sourced `conditions`, and `proof` (project references, or job notes flagged `sample:true`). CRD-wide rules are referenced by id from ONE shared regional block. No sentence appears on two or more area pages outside that block. New URLs only.
- **content.** Projects: challenge/approach/result, season and sample plantPalette, no budgets. Services: per-visit/season tables, 5–6 FAQs, "good fit if". Resources: byline `[OWNER NAME], RNC Landscaping` and real dates only. `process.json` with two tracks. A `[WARRANTY]` guarantee. `[REPLY TIME]` and `[GOOGLE PROFILE]`. No superlatives, prices or year counts. Additive changes; old fields are removed only where the current templates tolerate it.
- **ds-core.** Dark-first defaults (`ca.rnc.default: "dark"`; light under `[data-theme=light]`). C3 type scale. Glass minimum alphas. Two-tone focus tokens. check-contrast covers every text/surface pair in both themes. Every surface has at least one ring colour ≥ 3:1, and the two ring colours are ≥ 3:1 against each other. Glass worst cases are checked over art-palette extremes. `95-motion.css` holds the policy tiers. Rules for reduced-transparency, prefers-contrast and forced-colors. Manifest colours come from tokens.
- **ds-chrome.** Disclosure menus. Mobile sheet: `inert`, Esc, focus return, accordions. Sticky bar below 64em: ≥ 48 px, safe-area aware, hidden while `[data-quote-form]` is in view or the keyboard is open. `tel:` / `sms:` / `mailto:` in the header and footer. Theme and motion toggles (`aria-pressed`, persisted, ≥ 44×44, visible at every width, view-transition reveal, updates `theme-color`). Scroll-padding equal to header and bar heights. One nav DOM. Namespaced sprite.
- **ds-comp.** The full C3 inventory, container-query reflow at 320, an API snapshot test, and `/styleguide/` (noindex, out of the sitemap, showcase builds only).
- **living.** Layered, theme-reactive scenes, with 13 distinct area scenes. Layers are separate OUTER `<svg>` boxes animated only by transform and opacity. Gated by the motion policy, paused off-screen and on hidden tabs, started after load + idle. Deterministic bytes, namespaced ids, within budget, an aria-hidden "Illustration" chip. Per-project art, so /projects/ has no stock photos. `<picture>` AVIF/WebP/JPEG at 480/768/1024/1600 (A13 #27). `process-images.mjs` uses sharp from scratch, strips EXIF and writes a licence manifest.
- **seo.** The C6 @graph. No Review or AggregateRating; placeholders omitted. en_CA and the correct og:type. check-seo covers A13 #4–6, #19, #21, #24, #33 and P3 #15, plus repeated-paragraph and cross-area duplicate checks (`[data-shared]` exempt). The OG tool is ready; cards are rendered in W5.
- **quote.** REDESIGN v2 C5 exactly. Pure builders, unit-tested.
- **qa.** A global spec. Tools: a11y.mjs, lighthouse.mjs, measure.mjs, motion-audit.mjs, text-over-media.mjs, check-honesty.mjs, budgets v2, a screenshot matrix and a motion-policy lint. CI targets the new URLs.
  - **Verifier:** fault injection. Plant one each of an a11y bug, a CSP violation, an overflow and a stock photo on /projects/; all four must be caught.
- **W3 families.** Each owns its own legacy slice, `6x-<family>.css` and `tests/e2e/<family>.spec.mjs` (see PLAN.md). In t-areas the map has a single keyboard path: the list is the accessible route, and the SVG tiles get `tabindex=-1` and mirror state via `:has()`.

## Integration mechanics
- **Branches.** Integration happens on `ccr-384bdb88-mx8gtv` in the main checkout. Streams use `w<wave>/<stream>`. Fix chains use `w<wave>/<stream>--fix<n>` (never `/fix`). W4 rounds use `w4/r<round>/<owner>`. Local tags: `wave-<n>-int`. Only the ccr branch is pushed.
- **Builder.** Gets a worktree, then runs `git switch -c <branch>`, `node site/tools/dev-setup.mjs` (once it exists), and sets its own `OUT=$SCRATCH/dist/<branch-with-dashes>` and PORT. Ports follow `44<wave><lane>`, reviewers +10, fixers +20, and the evidence collector uses 4400. Commits at least every ~20 min and at the end, then runs `git format-patch $BASE..HEAD -o $SCRATCH/patches/<branch>/`. Returns `{branch, head, base, files, gates, acceptance[], requests[]}`.
- **Reviewer.** Gets a worktree, runs `git switch --detach <tip>`, reads `git diff $BASE...<tip>` and runs the gates. It never commits. Returns findings JSON.
- **Fixer.** Gets a worktree, runs `git switch -c <branch>--fix1 <tip>`, and fixes only verified findings, staying within the builder's write set. The integrator merges the last branch in the chain.
- **Merge order.**
  - W1: build → ia → areas-content → content, then the codemod commit.
  - W2: ds-core → ds-chrome → ds-comp → living → seo → quote → qa, then the codemod.
  - W3: editorial → company → services → areas → projects → home, then the consolidator.
- **Conflict policy.** Run check-ownership before every merge. On a violation, take only the owned paths with `git checkout <branch> -- <globs>` and file the rest as requests. Never hand-merge semantic code; regenerate generated files.
- **Failure handling.**
  - A crash or no commits: relaunch once.
  - Gates green but acceptance partial after 2 fix rounds: merge and log the gap in `.orchestra/carry.json`.
  - Gates red: don't merge. The wave continues, the legacy slice keeps the old pages working, and the stream gets a catch-up lane next wave.
  - Never revert another stream's work.

## "Alive" effects inventory
| Effect | Technique | Budget (gz) | Reduced-motion / off | Notes | Verdict |
|---|---|---|---|---|---|
| Living landscape hero | 4–6 stacked OUTER inline `<svg>` layer boxes: sky/stars, ranges, water, ridge, firs, mist. Colours via CSS vars: bioluminescent at night, dawn in light. Ambient drift over 60–120 s; firefly fades ≤ 0.5 Hz. Animate the boxes, not inner nodes. | ≤ 5 KB HTML + 1.5 KB CSS | Static frame (also with no JS) | aria-hidden; "Illustration" chip; the H1 is the LCP element | Signature |
| Scroll parallax | `animation-timeline: scroll()` on layer boxes, inside `@supports` | 0.4 KB | None | Vestibular: off under the motion policy | Yes |
| Contour draw-in | `stroke-dashoffset`, one shot ≤ 1.6 s, view timeline | 1 KB | Drawn statically | ≤ 5 s, so exempt from 2.2.2 | Yes |
| Scroll reveals | `view()` timeline, opacity/transform from-state, inside `@supports` | 0.6 KB | Always visible | NEVER on LCP elements | Sections only |
| Cursor spotlight | One delegated rAF-throttled `pointermove` setting `--mx`/`--my`; `::before` radial gradient | 0.8 KB | Off | Fine pointer only | Yes |
| `@property` gradient borders | `--angle` driving a conic gradient | 0.5 KB | Static | Ambient on ≤ 2 elements; elsewhere on hover | Rationed |
| Two-tone glow focus | Outline plus an outer box-shadow glow | 0.3 KB | Same | forced-colors falls back to the system outline | MANDATORY |
| Cross-document view transitions | `@view-transition{navigation:auto}` inside `@media (prefers-reduced-motion:no-preference)`; pseudo-elements get `animation:none` under `[data-motion=off]` | 0.5 KB | Instant | Names unique per page | Yes |
| Same-document view transitions | `startViewTransition` for the filter, the before/after toggle and a theme reveal (circular clip-path from the toggle) | 0.4 KB | Instant | Focus kept | Yes |
| Glowing area map | Hover/focus `drop-shadow` only while active; `:has()` links list and tiles; ambient pulse on the current area | 1 KB | Static highlight | One keyboard path | Yes |
| Living CTA band | 2–3 PRE-BLURRED radial-gradient blobs moved by transform (no `filter: blur`) | 0.5 KB | Static | Fixed scrim under the text | Yes |
| Glass bento | `backdrop-filter` with a contrast-safe alpha | 0.6 KB | Solid under reduced-transparency or more contrast | No `backdrop-filter` over animated layers below 64em | Rationed |
| Grain | Static ≤ 1 KB data-URI tile at 3–5 % on deep bands; no blend modes | 1 KB | Same | Removed under prefers-contrast and forced-colors | Yes |
| Speculation rules | prefetch, moderate eagerness | 0.2 KB | n/a | n/a | Yes (seed) |
| Magnetic CTA | ≤ 3 px | 0.3 KB | Off | n/a | Optional |
| Tilt | n/a | n/a | n/a | n/a | SKIP |
| Counters, tickers, marquees, typewriter, glitch, custom cursor, fake HUD, skeleton loaders, Lottie, video | n/a | n/a | n/a | n/a | BANNED |
| WebGL/canvas | n/a | n/a | n/a | SwiftShader rendering adds TBT in headless Lighthouse | BANNED in this PR |

**Motion policy (95-motion.css).**
- **T0** essential feedback ≤ 250 ms; becomes instant under reduced motion.
- **T1** one-shot ≤ 2 s and view transitions; off under `[data-motion=off]` or reduced motion.
- **T2** ambient loops > 5 s; run ONLY when both of these hold:
  - `[data-motion=on]` is set, or no choice is stored AND `.js` is present AND the user has `prefers-reduced-motion: no-preference`;
  - `data-alive` is set (living.js sets it after load + idle).

  They pause off-screen and on hidden tabs, and every loop uses `animation-play-state: var(--alive-play)`.
- **T3** pointer effects: fine pointer only, and not when motion is off.
- **T4** scroll-linked effects: inside `@supports`, and not when motion is off.

`prefers-reduced-motion` may appear ONLY in tokens.css and 95-motion.css. With no JS, there is no ambient motion.

**REDESIGN restraint vs "alive" (the user wins on aesthetics; the hard constraints stay):**
- Aurora is allowed as T2, composited only.
- Pointer sheen is allowed as the T3 spotlight.
- Tilt stays removed.
- Glass may be used on cards, with a contrast-safe alpha and a solid fallback.
- The 150–250 ms limit applies to interactive motion; ambient motion falls under T2.
- Large photography gives way to living art; photo slots stay for RNC's future photos.
- In TRACEABILITY, P4 #18 is recorded as "superseded on aesthetics; hard constraints kept".

## Gates
```
cd $WT/site && node tools/dev-setup.mjs --devtools
export OUT=$SCRATCH/dist/<branch> PORT=<port> SITE_DIST=$OUT CHROME_PATH=/usr/bin/google-chrome
node ../brand/build-tokens.mjs --check && node ../brand/check-contrast.mjs
tsc -p jsconfig.json            # until dev-setup exists: tsc -p jsconfig.json --typeRoots /opt/node-tools/node_modules/@types
node --test "tests/unit/**/*.test.mjs"
node build.mjs --offline-images --out=$OUT && node tools/check-all.mjs --no-build [--strict-redirects]
node tools/csp.mjs --check
node node_modules/playwright/cli.js test --trace off      # config reads PORT/SITE_DIST, reuseExistingServer:false
node tools/a11y.mjs --themes=dark,light --widths=320,1440 --motion=off,on   # bypassCSP context only for axe injection; tags wcag2a/2aa/21aa/22aa
node tools/motion-audit.mjs && node tools/text-over-media.mjs
node tools/lighthouse.mjs --runs=3   # quiet slot only; skip is-crawlable (showcase noindex by contract); reject runs with benchmarkIndex >15% below baseline
node build.mjs && node tools/check-all.mjs --no-build     # Netlify parity
node tools/check-ownership.mjs --stream=<id> --base=<sha> --head=<branch>
```
**Budgets v2 (gzip per page).**

| Metric | Fail | Warn |
|---|---|---|
| CSS | > 36 KB | > 28 KB |
| JS (including the import graph) | > 22 KB | > 14 KB |
| HTML | > 30 KB gz / 150 KB raw | > 22 KB gz / 90 KB raw |
| Inline SVG | > 45 KB raw | n/a |
| Hero scene / used sprite / art file | > 16 / 8 / 14 KB raw | n/a |
| Fonts | > 110 KB or > 2 files | n/a |
| Page weight | home > 500 KB, inner > 350 KB | n/a |
| Lighthouse | any score < 95 | < 98 |
| LCP / CLS / TBT | > 1.8 s / > 0.05 / > 150 ms | n/a |
| Infinite animations, motion off | > 0 | n/a |
| Infinite animations, motion on, per viewport | > 8 | n/a |
| `backdrop-filter` elements per mobile viewport | > 3 | n/a |
| Third-party origins (offline) | > 0 | n/a |
| axe violations | > 0 | n/a |

**Severity.**
- **Blocker:** a hard-constraint breach, CSP error, budget fail, broken link or redirect, or a no-JS failure.
- **Major:** a missing blueprint item, a visible defect at a tested width, or an interaction bug.
- **Minor:** polish; goes to TRACEABILITY "known issues".

**W4 loop limits.** At most 3 rounds. Divergence guard: stop if a round opens ≥ the previous round's Blocker + Major count.

## Decisions
| ID | Decision |
|---|---|
| D1 | Dark is the default for every visitor without a stored choice; light comes only from the toggle. |
| D2 | Two `aria-pressed` buttons: "Dark theme" and "Animations". |
| D3 | Dates are shown as "19 November 2026". |
| D4 | /styleguide/ is built in showcase builds only. |
| D5 | "No autoplay" means media and carousels. |
| D6 | Unsplash photos only outside /projects/. |
| D7 | Draft PR after W1. |
