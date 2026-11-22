# Requests from qa (W2)

qa merges last in W2. The new rules below are expected to fail on the W1 base until the named stream's W2 work merges; anything still failing after the qa merge is what the integrator baselines (CONTRACT §17). Each item names the rule that reports it, so the owner can check their fix with that tool.

## Integrator (W2 barrier)
- Run once with `--write-baseline --baseline-at=w2/qa` right after the qa merge, as CONTRACT §17 says: `check-honesty`, `check-motion-policy`, `check-ci`, `check-html` (new rule `data-track-names`), `budgets` (v2 rules), and the browser tools `a11y`, `motion-audit` and `text-over-media`. `lighthouse` is quiet-slot only. It exits 2 without judging any page when the machine's median benchmarkIndex is below 600.
- Renamed baseline keys: `check-tokens` and `check-placeholders` now report as `check-tokens` / `check-placeholders` with rule ids `tokens-compiled` / `no-placeholders`. The old display names (`design tokens compiled`, `no placeholders (strict)`) had no baseline files, so nothing needs to move.
- `budgets` dropped its W1 rule ids (`css-gz`, `js-gz`, `html-gz`, `html-raw`). The CONTRACT §16 table now reports as `budgets#v2`, with the metric in the message. `.orchestra/baselines/budgets.json` was empty, so nothing needs to move.
- **Two builds, one baseline.** The full gate runs `check-all` on the offline build and on the Netlify-parity online build, and some failures exist in only one of them. `budgets#third-party-origins` fails only offline (the Unsplash preconnect). `budgets#image-widths` and `check-honesty` stock-photo messages show up only online (CDN srcsets up to 2400w). Write the baselines over both builds: `node tools/check-all.mjs --no-build --strict-redirects --write-baseline --baseline-at=w2/qa` on the offline dist, then `SITE_DIST= node tools/check-all.mjs --no-build --write-baseline --baseline-merge` on the online dist (the union). Prune with `BASELINE_LEDGER=<scratch dir>` and `--prune-baseline` on each build, then `node tools/lib.mjs --apply-ledger=<scratch dir>`. That keeps every entry that still fails in at least one build. A plain `--prune-baseline` on one build would drop the other build's entries. A cross-build entry is reported as stale on the build where it does not apply. That is expected.
- `BASELINE_DIR=<dir>` (tools/lib.mjs) points `report()` at a scratch baselines folder. A reviewer can use it to rehearse the ratchet without touching `.orchestra/baselines/`.
- `tools/trace.mjs --upto=w2` (without `--stream`) lists every W2 item still missing a rule or test. On the qa branch it lists the other W2 streams' unmerged checks: check-seo, check-contrast (traceability names `site/tools/check-contrast.mjs`, while ds-core's tool today is `brand/check-contrast.mjs`), and the quote, chrome, ds-core, ds-comp, living and seo specs and tests. Please run it after the last W2 merge.

## ds-chrome (W2)
- `check-html#data-track-names` fails on the v2 names `call_clicked` and `email_clicked`: `main.js` delegated handler, `layout.mjs` tel/mail links, `lib/tokens.mjs` `telLink`/`mailLink`. Rename them to the CONTRACT §13 v3 names (`call_click`, `email_click`, `sms_click`, with `data-track-location`). ds-comp does the same in `ui/actions.mjs`, and quote then deletes the deprecated YAML entries (carried from requests/ia.md).
- `check-motion-policy#reduced-motion-placement`: `site/src/scripts/main.js` line 24 reads `matchMedia('(prefers-reduced-motion: reduce)')`. Use `motionOn()` / `onMotionChange()` from `lib/prefs.js`.
- `budgets#third-party-origins`: every page in an offline build has `<link rel="preconnect" href="https://images.unsplash.com">`. Emit it only in an online showcase build that actually shows a CDN photo (A13 #28: an offline build has no third-party origin).
- `budgets#v2`: the used sprite is 15–16.5 KB raw per page (budget 8 KB). The two logo symbols are the bulk of it, so an external, cached logo SVG is the way under (carried from requests/build.md #9).
- `motion-audit#policy-tiers`: at 390 px with motion on, /projects/, /commercial/ and /services/irrigation/ show 4 `backdrop-filter` elements in one viewport at 50 % scroll (budget 3). These are the glass bars and cards. Solid surfaces below the header would fix it (C3: glass only on chrome).
- The global spec opens the mobile menu with the header button named /menu/i and expects `aria-expanded="true"`. Keep that accessible name when the sheet is rebuilt.

## ds-core (W2)
- `check-motion-policy`: `50-legacy-32-ds-core.css` lines 11 and 22 (`prefers-reduced-motion`) and line 19 (`animation-timeline: view()`). Deleting the slice is the CONTRACT §8 / §9 task.
- `motion-audit#policy-tiers`: the H1 is animated on /about/, /commercial/ and /areas/oak-bay/ with motion off and on (the legacy hero entrance in slice 32).
- `motion-audit#vt-and-loader`: a same-document view transition animates for 250 ms under OS reduce and under `data-motion=off` on every page. The 95-motion.css skeleton fixes this: `::view-transition-group(*) { animation-duration: var(--dur-vt) }` plus `animation: none` under `[data-motion=off]`.
- Traceability names the contrast tool `site/tools/check-contrast.mjs` (A12 #6, C3.3, P0 #3, P4 #18), so `trace.mjs` looks for that file's `RULES` (`all-pairs`, `focus-pairs`, `glass-worst-case`). If it stays at `brand/check-contrast.mjs`, ask the orchestrator to correct `checkFile` in traceability.json.

- `text-over-media#worst-pixel` (W1 base, 17 findings): in the light theme, the breadcrumb links in the page head measure 2.95–4.46:1 against the worst pixel of the aurora behind them (`/areas/oak-bay/`, `/commercial/`, `/projects/`, `/services/irrigation/`, `/contact/`, the resources pages). The home H1 is 3.25:1 at 1440 px in light, and the `/resources/` byline is 4.03:1 at 320 px in dark. These go to ds-core (scene and aurora anchors, text-safe masks) and living (P2 rule: mask bright layers behind copy).

## living (W2)
- `check-honesty#stock-in-projects`: /projects/ and all 16 case studies use slots with Unsplash stock (`proj-*-1..4`, `svc-*`). Allocate `proj-<slug>-art` with `stock: null` (carried from requests/content.md #15). The rule reads the slots a page uses, so an offline build shows it too.
- `check-honesty#no-stock-people`: `media/images.json` `about-crew` has stock. Stock photos of people sit in the page hero of `/` (`home-hero`) and of the grounds-maintenance, landscape-installation and tree-vegetation service pages (`svc-*-hero`). Per CONTRACT §2 and §7, no stock person may stand for the owner or crew (carried from requests/content.md #17).

- `budgets#image-widths` (online build): `lib/images.mjs` writes Unsplash `srcset` candidates of 2000w and 2400w on every page that shows a stock photo (332 candidates). Cap them at 1600w, as A13 #27 and C4 require.

## quote (W2)
- `check-honesty#trust-without-prices`: /free-quote/ has no reply-time promise yet. quote.json v3 `reassurance` carries "We reply within [REPLY TIME]".
- `site/tools/schemas/quote.schema.json` now validates `content/pages/quote.json` v3 exactly as CONTRACT §6 gives it: six inputs, no email field, contact options email/call/text, and a subject with `{services}` and `{area}`. Until your v3 file lands, the legacy `steps[]` shape is still accepted and warned as deprecated. Please tell qa if v3 needs a field beyond §6.
- `check-html#data-track-names` fails on `quote_step_completed` and `quote_submitted` (in `quote.js`). Use the §13 names, then delete the deprecated YAML entries.

## ds-comp / content / t-* (W2–W3)
- `check-honesty#trust-without-prices`: the CTA band on inner pages (every page except `/`) has no reply-time promise. CONTRACT §3 says `[REPLY TIME]` goes in the CTA band, /free-quote/ and /contact/. /contact/ and the home CTA band already have it.
- `check-honesty#reviews-credentials-guarantee` reads credentials rows by class (`*cred*`) and review cards as `<li|figure|article>` holding a `<blockquote>`. A sample card needs `.sample-label` (or the text "Sample") inside the same card.

## seo (W2)
- `lighthouse#median-of-3`: in showcase builds the canonical is relative (no `[DOMAIN]`, CONTRACT §3), so Lighthouse's `canonical` audit is skipped there, along with `is-crawlable` (noindex). Both run in launch builds, which need an absolute canonical once `[DOMAIN]` is set.

## t-home / fix-system (W3–W4)
- `lighthouse#cwv`: the home page's lab LCP was 1.95 s (budget 1.8 s) in a one-run smoke test on this machine (benchmarkIndex about 1600–2000). Re-measure in a quiet slot with `--runs=3`.

## Carry items handled here
- Deprecated event intents: `check-html` reads `event-schema.yaml` with a quote-tolerant parser (`/^["']?\s*Deprecated\s*:/`).
- `check-content#area-unique-sentences` already scans only the CONTRACT prose fields (summary, intro, localRules/conditions/proof/localNotes `.text`, servicesBlurb). It never reads `sourceTitle`, `sourceUrl` or `excerpt`, so no change was needed.
- `quote.schema.json` was added (see quote above).
- Analytics names: qa owns only the check (`data-track-names`). The renames are template edits for ds-chrome, ds-comp and quote (see above).
