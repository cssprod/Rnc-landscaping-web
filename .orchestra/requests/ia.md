# Requests from ia (W1)

Changes ia needs in files it does not own, plus notes for the streams its checks gate. ia did not edit any of these files.

## build (W1) or ds-chrome (W2): chrome CSS for the C1 header
- **Disclosure buttons.** The C1 header has two `<button type="button" class="site-nav__disclosure" aria-expanded aria-controls data-mega-toggle>` disclosures with visible text ("Services", "Service areas") and a chevron. They replace the old link-plus-chevron pair. No rule styles `.site-nav__disclosure` yet, so the buttons render with browser defaults. They are legible but unstyled. Please style them like `.site-nav__item > a`: 40 px high (52 px in the sheet below 1120 px), `padding: 0 13px`, transparent background, `color: inherit`, the pill hover, and `[aria-expanded=true] .i { rotate: 180deg }`. The `.mega-toggle` class is no longer used.
- **Header call text.** While `[PHONE]` is unknown, `.site-nav__call` is the header's plain-text "Call [PHONE]" (CONTRACT §3: never a `tel:` href). It needs inline-flex, a gap, and `font-size: var(--font-size-subheadline)`.
- **Service areas panel.** `.mega--areas` / `.mega__areas` hold a `ul.chip-list` of the 13 municipalities plus a `link-more` "All service areas". It renders acceptably with the current chip styles. It needs `display: grid; gap` inside `.mega__areas`.
- **Header actions by width (CONTRACT §5).** Hide the header Call and Free quote below 64em, in the same branch that ships the sticky bar (W2 ds-chrome). Hiding them in W1 would leave phones without a header quote button.
- **Mega panel ids.** The panel ids are already `menu-services` / `menu-areas`, as COMPONENTS.md specifies. W2 only renames the `data-mega*` hooks to `data-disclosure*`, on both sides.

## build (W1): tool interfaces ia relies on
- `tools/check-links.mjs --strict-redirects` spawns `node tools/serve.mjs` with `PORT` and `SITE_DIST` in the environment. For both `/old/` and `/old` it expects `301` with `Location: <url-map new>`, and then `200` on the target. Please keep `serve.mjs` runnable that way.
- `check-links`, `check-html` and `check-content` call `report('<tool name>', failures)`. Each failure is `{ rule, path, message }` with a `toString()`, so the seed `report(title, string[])` and the new `report(tool, failures[])` both work. The first argument is the tool name, which matches `.orchestra/baselines/<tool>.json`.
- `build.mjs` messages still say "set it in site.config.mjs" (for unresolved tokens and `DOMAIN`). Token values now live in `content/site.json` `tokens`, and `site.config.mjs` reads them from there. Please point the messages at `content/site.json`.
- A fixture build (no `content/` folder) builds all 56 pages from `site/fixtures/content/**` (schema v3) and passes check-html. `check-links#sitemap-matches-url-map` reports the fixture slugs as not in the url-map, which is expected: the url-map describes the real content.
- `check-all` discovery picks up `check-content.mjs`. On Netlify (`check-all --no-build`), links that go through a 301 are warnings, not errors. They become errors with `--strict` or `SITE_MODE=launch`.

## Integrator / orchestrator (W1 barrier)
- After the link codemod, the full gate should pass `--strict` as well: `check-all --no-build --strict-redirects --strict`. This makes check-links fail any internal link that still goes through a 301, and makes check-content fail any content link to a retired URL. Before the codemod (the integration gate right after the ia merge), run without `--strict`. Evidence: on a scratch copy at the ia tip, `rewrite-links.mjs --write` rewrites 70 links in 51 files. After that, `check-links --strict` passes, and `check-links --strict-redirects --strict` passes against a `_redirects`-aware server.
- `check-content` gates content and areas-content. Before their merges it reports their files, for example: schema v3 fields still missing; `seo.description` over 155 characters in 21 files; no `process.json`; guide bylines; 4 FAQs instead of 5–6; no per-visit tables; shared area sentences; no local blocks. Use `--rules=` to gate a stream on its own rules. Write the baseline only for what is still red after all four W1 merges.
- REDESIGN-PLAN §Verification: the `check-links` line could mention `--strict` (frozen file; for the W5 docs lane).

## content (W1–W2): check-content findings in content/** at the seed (gate: `node tools/check-content.mjs`)
- `seo.description` over 155 characters in 21 files: 3 areas, 5 pages, 6 projects, 6 resources and 1 service. Areas are areas-content's files.
- Projects: `season`, `tags`, `challenge`, `approach` are missing, and `story` is deprecated. Resources: `author`, `published`, `updated` are missing. Services: `localContext`, `goodFitIf`, `perVisit` (≥ 3 rows), `localRulesRefs` are missing, and each has 4 FAQs (5–6 needed). Testimonials: `source` is missing.
- `pages/process.json` with `guarantee` built around `[WARRANTY]` (rule `guarantee`).
- `pages/projects.json` replaces `portfolio.json`. Routes read `pages.projects ?? pages.portfolio`. Delete `portfolio.json` only after the routes stop falling back to it (t-projects, W3).

## areas-content (W1–W2)
- `content/pages/areas.json` has an `areas` array of all 13 slugs. That is a second municipality list (rule `municipality-list`; `content/site.json` holds the only one). The routes never read it. Please remove it.
- Area v3 fields are missing: `summary`, `localRules`, `conditions`, `sharedRegional`, `proof`, `topServices`, `neighbours`. The shared CRD sentences appear in `intro` and `localNotes` (rule `area-unique-sentences`). Add `content/regional.json` (schema: `site/tools/schemas/regional.schema.json`).

## quote (W2)
- `components/forms.mjs` (legacy stepper) writes `action="mailto:[EMAIL]?…"` and `href="mailto:[EMAIL]"` (`[data-mailto]`) while `[EMAIL]` is unresolved. CONTRACT §3 forbids a token in a URL. The builder replaces this form. Please also add `site/tools/schemas/quote.schema.json` for quote.json v3 (or request it from the W2 owner of `site/tools/schemas/**`). Until then quote.json is validated against `page.schema.json`.

## seo (W2)
- `lib/schema.mjs` still emits `@type: LandscapingBusiness`, which is not a schema.org type (REDESIGN-PLAN). `foundingDate` (`[FOUNDED]`) and `openingHoursSpecification` (`site.json hours.openingHours`) are wired and emitted only when set. `Article.dateModified` should use the guide's `updated` once content sets it.

## t-editorial / t-projects / t-company (W3)
- To keep the W1 split byte-identical, pages still show dates through `_shared.mjs` `fmtDate()` ("November 19, 2026"). Switch them to `lib/dates.mjs` `formatDate()` / `timeEl()` ("19 November 2026", CONTRACT §6).
- `/process/` is a stub. It renders `pages/process.json` (overview, tracks, guarantee) when the file exists and `PROCESS_STUB` otherwise.

## build (W1): integration notes from a throwaway merge of w1/build 8e32a95 into w1/ia (not committed)
- Everything works together. The module graph emits `main`, `living` and `quote` on /free-quote/. `check-links --strict-redirects` passes through the new serve.mjs. All 24 `@integration` redirect tests pass, and so do 101 unit tests and 58 e2e tests. `check-all` is red only on check-content, which reports the content and areas-content files before those streams merge.
- `tests/unit/build-dist.test.mjs` `#route-shape` patches `site/src/pages/routes.mjs` by replacing `\n  return R;`. The frozen aggregator keeps `R`, `env`, `layout` and `html` in scope before that line so the test still works. A sturdier version would patch a family file (e.g. append a route in `site/src/pages/styleguide.mjs` on the scratch copy) instead of the aggregator.
