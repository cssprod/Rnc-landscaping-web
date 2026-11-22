# Requests from quote (W2)

Branch `w2/quote`, based on `wave-1-int` (a3a99dd). The six-input builder ships at `/free-quote/`: `components/forms.mjs` (`quoteForm`, plus the new `quoteContacts`), `scripts/quote.js`, `pages/quote.mjs`, `content/pages/quote.json` v3 and `70-quote.css`. Legacy slices 19 and 26 are deleted, along with their `!important` rules (`[aria-invalid]`, `.choice--check`, `.quote-aside .media`).

## integrator (W2 barrier)
1. **`tests/unit/build-modules.test.mjs` `#legacy-slices` fails on every branch that deletes its slice.** The test requires every `legacy-css-map.json` segment file to exist. Deleting a slice by its `mustDeleteIn` wave is the acceptance for every W2 system owner (quote deletes 19 and 26). No W2 stream owns `build-*.test.mjs`, so please change the test once at the barrier: a segment whose `mustDeleteIn` wave has been reached may be absent, but when it exists it must keep its `!important` declarations. On `w2/quote` alone, this is the only failure in `node --test "tests/unit/**/*.test.mjs"` (118 of 119 pass).
2. **`event-schema.yaml`: delete `call_clicked` and `email_clicked` after ds-chrome merges.** quote deleted the two quote-only v2 events (`quote_step_completed`, `quote_submitted`). `call_clicked` and `email_clicked` are still sent on this base by `main.js`, `layout.mjs`, `lib/tokens.mjs` and `ui/actions.mjs` (ds-chrome / ds-comp). They also type `track('call_clicked')` in `main.js`, so deleting them here would break `tsc` on this branch. Once quote merges after ds-chrome and ds-comp (mergeOrder), please remove both blocks and run `node tools/gen-event-types.mjs` (or ask the quote fixer to). `unit/quote-events.test#schema` allows only those two deprecated entries, so it will keep passing either way. `node tools/gen-event-types.mjs --check` is new and exits 1 when the `.d.ts` is stale.
3. **`tests/unit/ia-routes.test.mjs` still asserts `data-stepper data-quote-form`.** COMPONENTS.md says quote drops `data-stepper` in W2, but nobody owns that test in W2, so the form keeps the inert `data-stepper` attribute (nothing reads it any more) right before `data-quote-form`. Please relax the assertion to `data-quote-form` at the barrier; quote can then drop `data-stepper` in W3/W4.

## ds-chrome (W2)
4. The quote page emits v3 `data-track` names only: `call_click` / `sms_click` with `data-track-location="quote_ready"` (ready panel, once `[PHONE]` is known) and `call_click` / `sms_click` / `email_click` with `quote_aside` (the "Other ways to reach us" panel). On this base, `main.js`'s delegated handler only knows the v2 names, so these clicks are not counted until your renamed handler lands. Please make the handler forward any live §13 name with its location.
5. The sticky bar should hide while `form[data-quote-form]` is in view (hook unchanged). The form is now one long page, so the bar will be hidden for most of `/free-quote/` below 64em. The "Other ways to reach us" panel carries Call/Text/Email there.

## living (W2/W3)
6. DESIGN-DIRECTION §9 asks for a still scene (`data-still`, 0 loops) behind the quote head. Until a `quote` scene exists, `pages/quote.mjs` renders a static CSS backdrop (`.quote-page__backdrop[data-still]`, no animation). If you add `livingScene('quote', { variant: 'band' })` as a still variant, tell quote (or the W3/W4 owner of `pages/quote.mjs`) and it will be swapped in. The page no longer uses the `quote-aside` stock slot, so `media/images.json` `quote-aside` can be retired or kept for later.

## qa (W2)
7. Carry item: `site/tools/schemas/quote.schema.json` for quote.json v3. The keys are `seo`, `h1`, `lede`, `reassurance[]`, `fields{services, area, details, timing, name, contact{…, phone}}`, `subject`, `summary{}`, `buttons{}`, `messages{…, ready{heading, body}}`, `nextSteps[{title, body}]` (exactly 3), `contacts{}` and `privacy`. Until then it validates against `page.schema.json`, which passes.
8. `check-html#data-track-names`: the quote templates use only `call_click`, `sms_click` and `email_click`. `quote.js` calls `track()` with `quote_started`, `quote_mailto_opened`, `quote_copied` and `quote_webmail_opened` only.
9. `check-motion-policy`: `70-quote.css` animates only `opacity`, through `var(--dur-t1, 0ms)` (the ready panel and error summary enter once, T1). It uses no raw durations and no `prefers-reduced-motion`.

## content (W2)
10. Carry items #13 and #14 can go ahead now that the builder exists:
    - `privacy.json` "What we collect": six inputs (services, municipality, description, timing, name, best way to reach you, plus a phone number only for call or text). There is no email field. Nothing is sent by the site. The draft is kept in `sessionStorage['rnc-quote-draft']` for the tab only, and "Start again" clears it.
    - `accessibility.json`: "form steps" no longer applies. The form is one page with inline errors and an error summary.
11. Carry item (C5 prefill): `?service=` accepts the four service slugs (comma list or repeated) and the retired `tree-vegetation-management` alias; `?area=` accepts the 13 municipality slugs. So service `process[0]` links can become `/free-quote/?service=<slug>`.

## t-projects (W3)
12. `70-quote.css` temporarily carries the shared `.select` rules and `.js .filters [data-filters-submit] { display: none }`, which used to live in quote's legacy slice 19 and which the portfolio filter relies on. It carries only the properties that legacy slice 20 does not set, so the filter keeps its pill shape. Please move these rules into `63-projects.css` when you restyle the filter, and tell quote so they can be deleted from 70.
