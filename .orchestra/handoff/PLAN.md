# RNC Landscaping redesign: "alive" art direction + multi-agent build to a Deploy Preview

## Context
The user uploaded the Cedar Springs teardown + RNC redesign blueprint (an identical copy is at the repo root) and `REDESIGN-PLAN.md` v2. They asked to carry out all of it with an extensive fleet of specialised agents working in parallel, from planning to deployment.
- **Art direction:** a cutting-edge "Web3-style" look that is **visually stunning and ALIVE**.
- **Outcome:** every blueprint fault fixed (A13 #1–36) and every C1–C8 / P0–P4 item delivered, at Lighthouse ≥ 95 ×4 and WCAG 2.2 AA, shipped as a PR with a Netlify Deploy Preview.

**Locked user decisions**
1. **Deploy:** push `ccr-384bdb88-mx8gtv` and open a PR to `main`. The Netlify Deploy Preview is the review surface. The user merges; we never merge.
2. **Imagery:** **living vector art**: layered, animated SVG/CSS landscapes, sharp at any DPI. Unsplash stock stays as labelled placeholders outside `/projects/`. No AI photos.
3. **Theme:** **dark-first ("Fir night") for every new visitor**, with header toggles for **Dark theme** and **Animations** (`aria-pressed`, remembered in `localStorage`, applied before paint).
4. **"Web3"** means the visual language only (glow, glass, depth, gradients, bento grids, living motion). Nothing crypto-related.

**Ground truth found while scouting (it shapes the plan)**
- **The foundation is missing.** The "Already done (foundation commit)" section of REDESIGN-PLAN v2 is false:
  - 58 pages still come from one `site/src/pages/routes.mjs`, one `site.css` and one `main.js`.
  - There is no `content/site.json`, no `seo.mjs`, no redirects and no `--out`/`SITE_DIST`; `build.mjs:26/32` deletes a hard-coded `dist`.
  - Content still has 53 `/quote/` and 17 `/portfolio/` links.
- **Broken tooling:**
  - CI has **never passed its first step**: tsc `TS2688` from `jsconfig.json typeRoots`.
  - `npx playwright test` fails because ESM can't resolve the global Playwright 1.63.0 in `/opt/node-tools`. Chromium is at `/opt/pw-browsers`.
  - `serve.mjs` ignores `_redirects` and `_headers`.
  - The regex CSS minifier mangles strings.
- **CSP:** the `JS_FLAG` sha256 must be in `netlify.toml` or the build fails. Any new inline script needs its own hash.
- **Contrast:** light focus `#5A4FCF` on Fir night measures 2.83:1, which fails. No single ring colour is safe over art, so a two-tone ring is needed.
- **Content gaps:**
  - Area pages share their CRD notes and `intro[2]`, so they fail the swap test.
  - No sourced local-conditions facts exist, and Sooke has no rule.
  - Projects lack `season`/`plantPalette` and carry a boilerplate `story[2]`.
  - Guides have no byline.
- **Environment:**
  - 4 CPUs, so the Workflow tool runs **2 agents per run**. Each wave therefore runs as **3–4 sibling workflows** (about 6 agents at once).
  - WebSearch / web-fetch work server-side for sourcing municipal facts; curl to municipal sites, Unsplash and the Netlify API is blocked.
  - npm works for scratch installs.

## Approach
Six waves. Each wave runs as concurrent sibling Workflow runs. Builders work in isolated git worktrees on local branches (`w<wave>/<stream>`). Each stream runs its own chain: **builder → reviewer → fixer**, with no barrier between streams. An integrator merges into the ccr branch at the wave barrier.

Between waves the orchestrator (main session) checks branch refs, runs the gate, commits, pushes and reports to the user. The **draft PR opens after W1**, so Netlify builds a preview on every push. It is marked ready at W5.

### Ownership model (prevents collisions)
- **One owner per path per wave.** The map lives in `.orchestra/ownership.json`. `site/tools/check-ownership.mjs` blocks any merge that touches files outside the stream's set. Files change owner only between waves.
- **Hotspots split in W1:**
  - `ui.mjs` → `components/ui/{actions,heads,cards,projects,trust,faq,cta,seasons,callouts}.mjs` + `index.mjs`, each paired with a `4x-ui-*.css`.
  - `main.js` → chrome-only `main.js` + `lib/track.js` + `lib/prefs.js` + feature modules (`quote`, `projects`, `areas`, `living`). Modules are hashed in dependency order with `modulepreload`; no import map.
  - `site.css` → `5x-legacy-<owner>.css` slices in `@layer legacy`. Each owner deletes its own slice.
  - `tests/site.spec.mjs` → `tests/e2e/<owner>.spec.mjs`.
- **Auto-discovery and freezes:** CSS, JS and `check-*` tools are discovered automatically. The `routes.mjs` aggregator and `ui/index.mjs` are frozen after W1. Stub files are pre-registered for every later owner.
- **Frozen head scripts:** `site/src/lib/head-scripts.mjs` (`HEAD_SCRIPT`: `js` class + stored `data-theme`/`data-motion`; `SPECULATION_RULES`: prefetch only) is fixed in the seed commit. Its hashes go into the CSP once, and the build checks every inline script's hash.
- **Change requests:** an agent that needs a change in a file it doesn't own writes `.orchestra/requests/<agent>.md` instead of editing. The integrator runs mechanical changes (the link codemod, the regenerated `tokens.css`).

### Wave plan and agent roster (≈ 94 agent runs, peak 6–7 at once)

**W0 — Contract and art direction (13 agents).** The contract lane gates the seed; the direction lane overlaps W1.
- **A1 architect** writes:
  - `CONTRACT.md` v3: URL map, new tokens `[REPLY TIME]` (required), `[GOOGLE PROFILE]` and `[FOUNDED]` (optional); content schemas v3; `data-theme`/`data-motion` contract;
  - `REDESIGN-PLAN.md` v3 (truthful status);
  - the `site/COMPONENTS.md` API skeleton;
  - `.orchestra/{ownership,briefs/*,url-map,legacy-css-map,traceability}.json`.
- **A2 completeness critic** (adversarial: every A13 / C / P item maps to one stream and one check; no ownership overlap) → **A3 reviser**.
- **P1–P3 art-direction proposers**: "Bioluminescent Fir", "Topographic Survey HUD", "Spatial Bento Glass". Each delivers both-theme palettes, a bento grammar, a hero concept per template, and 8 specimen screenshots.
- **L1 effects lab** measures each candidate effect's cost per frame under 4× CPU throttle and its Lighthouse delta.
- **R1 area researcher** (WebSearch / web-fetch): at least 3 sourced rule or condition facts for each of the 13 municipalities, including Sooke, wells, deer, salt spray and soils. Each fact gets `verify:true`; `reviewedOn` is set only if the page was fetched this session.
- **R2 content auditor** writes per-file edit briefs and a swap-test baseline.
- **Judges:** J1 conversion and honesty; **J2 accessibility and performance (veto)**; J3 "stunning and alive" art director.
- **S1 synthesizer** writes `DESIGN-DIRECTION.md` plus `tokens-proposal.json`, `effects-approved.json` and `motion-policy.md`.
- **Seed commit (orchestrator):**
  - move the blueprint to `research/` and fix references;
  - commit the contract and `head-scripts.mjs` + CSP hashes;
  - `git config gc.auto 0`.

**W1 — Foundation and content (≈ 11 agents; 2 builders + 2 content streams, each with reviewer and fixer).**
- **build**:
  - `--out` / `SITE_DIST` / `PORT` everywhere, with a `.rnc-dist` marker guard;
  - a tokenizer-aware CSS minifier with golden tests;
  - `@layer` concatenation and the legacy slices, with 0 px screenshot diff;
  - module-graph hashing and the `lib/{track,prefs}.js` split;
  - sprite tree-shaking (−14 KB per page);
  - git `lastmod`;
  - `serve.mjs` applies `_redirects`, `_headers` and the netlify.toml CSP, and serves avif/webp;
  - `tools/{csp,dev-setup,check-ownership}.mjs`. `dev-setup` symlinks `site/node_modules/{playwright,playwright-core,@types/node}` (untracked) and installs lighthouse and axe-core into scratch;
  - tsc green; CI's first steps green.
- **ia**:
  - C1 URLs: `/projects/`, `/projects/{slug}/`, `/free-quote/`, a `/process/` stub;
  - `redirects.mjs` → `_redirects`, one 301 per retired URL, no chains (A13 #2, #35);
  - page-family files + `_shared` + the frozen aggregator;
  - `seo.mjs` (`headMeta`, `jsonLd`);
  - `content/site.json` as single source for NAP, municipalities and services (P0 #1, A13 #13–14);
  - C1 nav with disclosure buttons and the C1 footer (A13 #7–9, #25–26);
  - the `ui/` split; tests split per owner with the new URLs;
  - `rewrite-links.mjs` (dry-run only) and a content schema validator.
- **areas-content** (W1–W2): rebuild the 13 area pages from R1's facts.
  - Every page has: local rules with source, verify flag and review date; sourced conditions; local proof.
  - The CRD rules sit in one shared regional block (`data-shared`).
  - No sentence is shared by two area pages, so all 13 pass the swap test.
- **content** (W1–W2):
  - Projects: challenge/approach/result, `season`, a sample `plantPalette`, no budgets.
  - Services: per-visit/season tables, 5–6 FAQs, "Good fit if…".
  - `process.json` with maintenance and installation tracks.
  - A guarantee built on `[WARRANTY]`.
  - Guides: byline "[OWNER NAME], RNC Landscaping" and real dates only (A12 #1–2, A13 #20, #22, #30–32).
- **Integrator:** merge, run the link codemod, run the full gate, tag `wave-1-int`, push, and **open a draft PR** (check for a PR template first).

**W2 — Systems (≈ 19 agents).** ds-core goes first; the others follow in parallel lanes.
- **ds-core**:
  - `brand/tokens.json`: dark-first defaults, light under `[data-theme=light]`, the C3 fluid type scale, contrast-safe glass alphas, a two-tone glow focus ring;
  - `check-contrast.mjs`: every text/surface and focus/surface pair in both themes, solid fallbacks, glass worst cases over art palettes (P0 #3);
  - base, layout, type and utility CSS, plus `95-motion.css` with the motion-policy tiers.
- **ds-chrome**:
  - `layout.mjs`, `sprite.mjs`, `main.js`, `lib/**`, `30-chrome.css`;
  - glass header; disclosure menus; mobile sheet (`inert`, Esc, focus return, accordions);
  - **sticky Call / Free-quote bar** below 64em: ≥ 48 px, safe-area aware, hidden while the quote form or keyboard is showing;
  - **theme and motion toggles** with a circular View Transition reveal;
  - `tel:`/`sms:`/`mailto:` links; scroll-padding for 2.4.11 (P0 #4, P1 #6–7).
- **ds-comp**: `components/ui/**`, `4x-ui-*.css`, `COMPONENTS.md`, a noindex `/styleguide/` (showcase builds only).
  - Primitives: hero with a living-scene slot, numbered section heads, spec strip, tiles, spotlight bento card, timeline, review card, credentials row, local-rules callout with last-reviewed date, FAQ `<details>`, living CTA band, fallback contact panel.
  - Container queries; an API snapshot test.
- **living**: `lib/{art,images}.mjs`, `components/living.mjs`, `45-living.css`, `scripts/living.js`, `media/images.json`, `tools/process-images.mjs`.
  - Layered, theme-reactive scenes: night is bioluminescent, light is dawn; 13 distinct area scenes; per-project art, so `/projects/` has no stock photos.
  - Animate outer layer boxes only. Start after `load` + idle; pause off-screen.
  - `<picture>` AVIF/WebP pipeline (max width 1600, EXIF stripped).
- **seo**:
  - C6 `@graph`: HomeAndConstructionBusiness, WebSite, WebPage, Service, BreadcrumbList, FAQPage, Article with author. No Review or AggregateRating.
  - `og:locale` en_CA and per-page OG.
  - `check-seo.mjs`: one H1, unique titles, encoding, filename-style alt text, slugs, repeated paragraphs, cross-area duplicates (A13 #4–6, #18–19, #21, #24, #33).
  - The `og-cards` tool.
- **quote**: the REDESIGN v2 C5 builder exactly.
  - Six inputs; `?area=` / `?service=` prefill; a mailto form action that works without JS; subject "Free quote request — X — Y"; 1,800-character cap.
  - Ready panel with copy, Call/Text and webmail options; inline errors and an error summary; `sessionStorage` draft.
  - Plausible events with no personal data; unit-tested pure builder functions (A13 #10, P1 #5).
- **qa**: Playwright harness and global spec.
  - Global spec: 200s, one H1, no console or CSP errors in both themes, no overflow at 320 px, 200 % zoom.
  - Tools: `a11y.mjs` (axe injected), `lighthouse.mjs` (median of 3), `motion-audit.mjs`, `text-over-media.mjs`, `check-honesty.mjs`, budgets v2, the screenshot matrix, CI on the new URLs.
  - Proven by fault injection: seed 4 known bugs in a scratch copy and confirm the tools catch all 4.

**W3 — Templates (≈ 17 agents).** 6 family builders in parallel; each owns `pages/<family>.mjs`, `6x-<family>.css`, its legacy slice, its e2e spec and its stewarded `ui/` modules.
- **t-home**: the C2 Home sections 1–10, including the living split hero, featured spec strip, 4-step timeline, reviews band with Google link, local-rules teaser, map and FAQ. Remove the `routes.mjs:64` regex hack.
- **t-services**: hub, 4 service pages with a sticky TOC on desktop, and commercial proof points without invented numbers (P2 #9).
- **t-areas**: hub with an **interactive glowing SVG map** (one keyboard path, via the list) and 13 municipality pages (P2 #10, C6).
- **t-projects**: filters by service × municipality with a same-document View Transition, working without JS. Case study with spec strip, challenge/approach/result, and a keyboard before/after with a side-by-side toggle (P2 #11).
- **t-company**: process (two tracks), about, FAQ, reviews (labelled Sample, Google link, no schema), contact (P2 #12).
- **t-editorial**: guides with byline and reading progress; privacy, terms, and the accessibility statement (WCAG 2.2 AA, voluntary under Accessible BC; documents the toggles); a helpful 404 (P2 #13).
- **css-consolidator** (exclusive lock on the styles afterwards): no legacy slices left, no duplicate selectors, every motion rule goes through the policy, ≤ 0.1 % pixel diff.

**W4 — Verify loop (≈ 30 agents, up to 3 rounds).**
- One quiet **evidence pack**: an axe matrix across themes × widths × motion, Lighthouse median of 3 on about 15 templates, screenshots at 320/390/768/1024/1440 in light and dark, budgets and motion-audit.
- **7 read-only finders:** f-a11y, f-perf, f-seo, f-visual (art director reading the PNGs), f-blueprint (adversarial, every A13/C/P item), f-honesty (including a real swap test across the 78 area pairs), f-interaction.
- **Triage** dedupes and reproduces findings, then tickets go to owner fixers (at most 6 in parallel). Closure checks run each round.
- **Exit:** no Blocker or Major open, full gate green, axe 0, Lighthouse ≥ 95 ×4, honesty 0 issues, swap test 13/13.
- **Divergence guard:** if a round opens at least as many Blocker/Major findings as the previous one, stop and escalate.

**W5 — Docs and ship (4 agents).**
- **og-render** commits the OG cards (≤ 45 KB each).
- **docs**: README, `site/README.md`, CONTRACT v3 final, CHANGELOG, LAUNCH-CHECKLIST (GBP set-up, verifying the `verify` notes), `brand.md`, and **TRACEABILITY.md** mapping every blueprint item to code (P4 #18 marked "superseded on aesthetics, hard constraints kept").
- **ci**: final `ci.yml` (typecheck fixed, pinned Playwright, new URLs, filesystem LHCI uploads).
- **release-gate** (read-only): full gate and git hygiene.
- The orchestrator then pushes, marks the PR ready, and reports the PR link and the Deploy Preview status (`deploy-preview-<n>--rnc-landscaping-web.netlify.app`, SSO-protected).

### "Alive" inventory (seed for W0; J2 can veto)
**Signature effects**
- **Living landscape hero:** 4–6 stacked SVG layers (stars or dawn sky, ranges, water shimmer, firs, mist) with slow drift and fireflies, about 5 KB.
- **Scroll-linked parallax:** `animation-timeline: scroll()`.
- **Topographic contour draw-in.**
- **Scroll reveals:** `view()`, never on the LCP element.
- **Cursor spotlight** on bento cards.
- **Rationed `@property` gradient borders.**
- **Two-tone glow focus ring:** mandatory.
- **Cross-document View Transitions** between pages, and same-document ones for the filter, before/after and theme reveal.
- **Glowing interactive area map.**
- **Living CTA band:** pre-blurred gradient blobs.
- **Contrast-safe glass bento.**
- **Static grain** on deep bands.
- **Speculation-rules prefetch.**

**Banned:** tilt, counters and tickers, marquees, typewriter, glitch, custom cursor, fake HUD readouts, loaders, video/Lottie, and WebGL/canvas (software-rendered GL breaks Lighthouse TBT).

**Motion policy (`95-motion.css`)**
- **T0** feedback ≤ 250 ms.
- **T1** one-shot effects ≤ 2 s.
- **T2** ambient loops: run only when Animations is on (default on unless prefers-reduced-motion) and JS is present; paused off-screen and when the tab is hidden. This satisfies WCAG 2.2.2.
- **T3** pointer effects: fine pointer only.
- **T4** scroll-linked effects: inside `@supports`.
- Without JS, nothing ambient runs.

### Budgets (budgets v2, per page, gzip)
| Metric | Fail at | Warn at |
|---|---|---|
| CSS | > 36 KB | > 28 KB |
| JS (with import graph) | > 22 KB | > 14 KB |
| HTML | > 30 KB gz / 150 KB raw | n/a |
| Inline SVG | > 45 KB raw | n/a |
| Hero scene | > 16 KB raw | n/a |
| Fonts | > 110 KB or > 2 files | n/a |
| Page weight transferred | home > 500 KB, inner > 350 KB | n/a |
| Lighthouse mobile ×4 (median of 3) | < 95 | < 98 |
| LCP / CLS / TBT | > 1.8 s / > 0.05 / > 150 ms | n/a |
| Infinite animations running when motion is off | > 0 | n/a |
| Third-party origins in the offline build | > 0 | n/a |

## Critical files
- `site/build.mjs`
- `site/src/components/{layout.mjs,ui.mjs→ui/*,map.mjs,forms.mjs}`
- `site/src/pages/routes.mjs` → `pages/*.mjs`
- `site/src/lib/{art,images,schema,tokens,data}.mjs` (+ new `seo.mjs`, `head-scripts.mjs`)
- `site/src/styles/site.css` → numbered files
- `site/src/scripts/main.js` → modules
- `brand/{tokens.json,build-tokens.mjs,check-contrast.mjs}`
- `site/tools/*`, `site/tests/*`, `site/jsconfig.json`, `site/playwright.config.mjs`
- `netlify.toml`, `.github/workflows/ci.yml`
- `content/**`, `media/images.json`, `research/areas.json`
- `CONTRACT.md`, `REDESIGN-PLAN.md`

**Reuse, don't rewrite:**
- `html`/`md`/`typographer` (`src/lib/html.mjs`)
- `finalizeTokens`/`telLink`/`mailLink` (`src/lib/tokens.mjs`)
- `generate()` (`brand/build-tokens.mjs`)
- `landscapeSvg` (`src/lib/art.mjs`), extended
- `picture()` (`src/lib/images.mjs`)
- `areaMap` `TILES` polygons (`src/components/map.mjs`)
- the check modules in `site/tools/`

## Integration mechanics
- **Builders:** worktree, then `git switch -c w<N>/<stream>`. Own `OUT=$SCRATCH/dist/<branch>` and `PORT`; Playwright runs with `reuseExistingServer:false`. Commit often, then `git format-patch` to scratch as a backup. Return `{branch, head, files, gates, acceptance, requests}`.
- **Reviewers:** detached worktree, read-only, return findings. **Fixers:** `git switch -c <branch>--fix<n> <tip>`.
- **Integrator:**
  1. Run `check-ownership`, then merge in the planned order.
  2. Regenerate generated files; never hand-merge code.
  3. Run the quick gate after each merge and the full gate after the last one, then run the codemod and tag `wave-N-int`.
  4. Push with retries.
- **Failed streams:** relaunch once. If acceptance items are still partial, merge and log them in `.orchestra/carry.json`. If gates are red, don't merge; the legacy slice keeps the pages working, and the stream gets a catch-up lane in the next wave.
- **Loss protection:** after each workflow, the orchestrator verifies every branch ref exists, with `gc.auto 0` set.

## Verification (gate run at every merge and wave end)
```
cd site && node tools/dev-setup.mjs --devtools
node ../brand/build-tokens.mjs --check && node ../brand/check-contrast.mjs
tsc -p jsconfig.json
node --test "tests/unit/**/*.test.mjs"
node build.mjs --offline-images --out=$OUT && SITE_DIST=$OUT node tools/check-all.mjs --no-build --strict-redirects   # links, html, tokens, placeholders, budgets, content, seo, honesty, ownership
node tools/csp.mjs --check
PORT=$P SITE_DIST=$OUT node node_modules/playwright/cli.js test --trace off      # e2e incl. CSP enforced via serve.mjs, no-JS paths, 320px overflow
node tools/a11y.mjs --themes=dark,light --widths=320,1440 --motion=off,on       # axe 0 violations
node tools/motion-audit.mjs && node tools/text-over-media.mjs
node tools/lighthouse.mjs --runs=3     # quiet slot only; ≥95 ×4 on every template
node build.mjs && node tools/check-all.mjs --no-build                            # Netlify parity (online images, default dist)
```
**End to end:**
- Visual: the art director reviews the screenshot matrix (5 widths × 2 themes × motion).
- Swap test: 13/13 area pages pass.
- TRACEABILITY: all items evidenced.
- GitHub: CI green on the PR; Netlify Deploy Preview build green.
- The user does the final visual check on the SSO-protected preview and merges.
