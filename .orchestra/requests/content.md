# Requests from the content stream (W1)

Branch `w1/content`, base `064d569`. Each item names the owner who can make the change. Nothing here was edited by content.

## ia (W1): `check-content` schemas and routes
1. **Page schema: allow the new page keys.** Content added structured keys that the legacy templates ignore and the W3 templates will read. Please let `tools/schemas/*` accept them (or tell content which shape you prefer and we will move them in W2):
   - `home.json`: `featuredProject` (project slug), `process` `{heading, lede, source: "process.overview", link{label, href}}`, `reviewsBand` `{heading, lede, googleLink{label}}` (the band reads `featuredTestimonials`; the Google URL comes from `site.json` `googleProfile`, never from page content), `localExpertise` `{heading, body[], areas[], regional[], link{label, href}}`, `faq` `{heading, ids[]}`, and `cta.secondary.fallback` `{label, href}`.
   - `reviews.json`: `googleLink` `{label}` (URL from `site.json` `googleProfile`).
   - `projects.json`: `filters` `{label, service, area, all, allServices, allAreas, apply, count, countOne, empty, noJs}` (`count` uses `{n}`).
   - `process.json`: CONTRACT shape plus an empty `sections: []`.
   - `faq.json`: every `faqs[]` entry now has an `id` (kebab-case, unique); `home.faq.ids` references them.
2. **Projects:** `story[]` is kept (deprecated, = challenge + approach) because the legacy case-study template renders it. `plantPalette` is `[]` on projects with no planting. `images.art` = `proj-<slug>-art` on all 16 (virtual slot).
3. **Resources:** `author`, `published`, `updated` (`null` or `2026-11-21`) added; `date` kept as the deprecated alias the legacy routes sort and render by. `published == date` on all 6.
4. **Testimonials:** `source: "sample"` added to all 8. `strata-council-view-royal` exists and is referenced by `reviews.json` and the View Royal project.
5. **Routes:** `pg("projects") ?? pg("portfolio")` can now resolve to `projects.json`. `portfolio.json` is untouched and can be deleted by content once no route falls back to it (tell content, or let the integrator delete it at the barrier).
6. **home.mjs regex:** `home.json` keeps the "[Browse the portfolio](/portfolio/)" sentence unchanged, so your regex fix for `(/portfolio/)` and `(/projects/)` still applies after the codemod.

## ia (W1) and integrator: no stock under `/projects/` (D6, CONTRACT section 2)
15. **Project cards and case studies must not render stock.** On a throwaway merge of w1/ia + w1/areas-content, the online build of `/projects/` renders 13 Unsplash photos, because cards use `images.after`, which points at stock slots (`proj-*-N`, `svc-*-after`) in 13 of the 16 project files; `/projects/oak-bay-front-garden-renewal/` renders 6. Until W2 living allocates `proj-<slug>-art`, the project family templates (ia) should render `images.art` or the "Photo to come" illustration for every image under `/projects/`, never `before`/`after`/`gallery` stock. Content can instead clear `before`, `after` and `gallery` on the 16 projects in W2 if you prefer that route (tell content). `content/pages/projects.json` now says "Pictures are illustrations or placeholder images", which is true in either state.

## ia / t-company and media: no stock people as crew or owner
16. **About hero key.** `about.json` `images.crew` now points at `commercial-hero` (lawn, shrubs and trees, no people) instead of `about-crew` (stock of a landscaper presented above "[OWNER NAME] ... Crew [CREW SIZE]"). Please rename the key to `images.hero` in the about template and drop the `'about-crew'` fallback in `site/src/pages/routes.mjs` (about route), so a missing key cannot bring the stock crew photo back. Content will rename the key in the same wave the template reads it.
17. **Media owner:** retire the stock photo on the `about-crew` slot (CONTRACT: `about-owner` and `about-crew` never get stock). Also review `home-hero` (stock of two landscapers mowing, the home hero, read from a hard-coded `'home-hero'` in the home route, not from `home.json` `heroImage`): under "never use stock for a person shown as the owner or crew" it should become the living hero scene or a slot with no people.

## areas-content (W1)
7. **`content/pages/areas.json` SEO description is 156 characters** (limit 155). It is yours; content did not touch it. Three area files are also over: `highlands.json` (156), `oak-bay.json` (156), `saanich.json` (157) on the seed copy; please confirm on your branch.
18. **Optional: federal nest excerpt on `bc-bird-nests`.** Content removed the clause "federal law also protects migratory birds' nests" from the tree-vegetation FAQ and the spring checklist, because only Wildlife Act s.34 is excerpted. If you want the federal rule on the site, add a verified excerpt from the federal Migratory Birds Regulations (review round 2 notes they generally protect a nest only while it holds a live bird or viable egg, with longer protection for some listed species; please confirm) with `verify: true` and `reviewedOn`, and tell content; content will then add a qualified sentence ("federal rules also protect active nests of migratory birds"). No action needed otherwise.
8. **Regional ids.** Service `localRulesRefs` and `home.localExpertise.regional` use the ids in your `content/regional.json`: `crd-watering`, `crd-water-systems`, `crd-invasives`, `bc-riparian`, `bc-bird-nests`, `bc-private-wells`. If you rename a block, tell content.

## Integrator (W1 barrier)
9. **Codemod scope.** Existing `/quote/` and `/portfolio/` links in content are left for `rewrite-links.mjs --write`. Suggest the service `process[0]` quote links become `/free-quote/?service=<slug>` (C5 prefill) in the same pass. New text written by content already uses `/free-quote/`, `/projects/` and `/process/`.

## quote (W2)
10. `quote.json` was not touched. The new reply promise reads "We reply within [REPLY TIME]" on contact, FAQ, commercial and `/process/`; please use the same wording in `reassurance` so the promise reads the same everywhere.

## docs (W5): LAUNCH-CHECKLIST items for the owner to confirm
11. Practice claims written as RNC commitments, kept as copy until the owner confirms or removes them:
    - commercial `commitments`: written scope before work, one contact, visit notes and issue reports in writing, reply within [REPLY TIME]; commercial `process`: start-up meeting;
    - `/process/` deliverables at each step, and the guarantee steps (reply within [REPLY TIME], arrange a time to look at the concern);
    - about `safety` ("Crews plan each job, use the right protective equipment and stop work when conditions are unsafe");
    - commercial `safety` ("signage and barriers where needed") and `references` ("available on request");
    - FAQ `insurance` ("Documents are available on request").
12. Guide bylines say "[OWNER NAME], RNC Landscaping": the owner should read and adopt each guide before launch.

## Deferred to content W2 (needs W2 features first)
13. `accessibility.json`: document the "Dark theme" and "Animations" toggles and the dark default once ds-chrome ships them; the quote form is still a stepper on the W1 base, so "form steps" stays until the W2 builder lands.
14. `privacy.json`: align "What we collect" with the six-input builder (no email field) and add "Settings saved on your device" (`rnc-theme`, `rnc-motion` in localStorage; the quote draft in sessionStorage) once those exist.

---

# Requests from the content stream (W2)

Branch `w2/content`, base `a3a99dd` (wave-1-int). Nothing below was edited by content; each item names the owner.

## quote (W2)
19. **`?service=` prefill links.** The first process step on all four service pages now links to `/free-quote/?service=<slug>` (carry: content, requests #9). The W1 stepper already matches `?service=` against its checkbox values, which are the four service slugs. Please keep the v3 builder's service values equal to the `site.json` slugs so these links keep working; tell content if they change.
20. **Copy that describes the builder.** `privacy.json` and `accessibility.json` now describe the six-input builder as CONTRACT section 6 specifies. If the builder ships differently, tell content (or, after W2, the integrator; see #28) so the pages stay true:
    - the email carries services, municipality, details, timing, name, preferred reply and (for call or text) the phone number; no email field;
    - Gmail and Outlook.com convenience links on the ready panel;
    - an error summary at the top plus a message next to each field, and entered values are kept;
    - the draft lives in `sessionStorage['rnc-quote-draft']` only;
    - FAQ `specification` and the service process steps say photos and specifications are attached to the email the form opens (the form has no upload).
21. Carried: please use "We reply within [REPLY TIME]" in `quote.json` `reassurance` (requests #10).

## ds-chrome (W2)
22. **Display settings copy.** `accessibility.json` section `settings` documents: buttons named exactly "Dark theme" and "Animations" in the header; dark by default; animations start off when the device asks for reduced motion; "with animations off, nothing on the page moves by itself" (so `data-motion=off` must stop T1 to T4); without JS both buttons are hidden, the theme is dark and nothing moves; choices remembered on the device (`rnc-theme`, `rnc-motion`, also named in `privacy.json`). Tell content (or, after W2, the integrator; see #28) if any of this differs.

## ds-comp (W2) / t-home (W3)
23. **Reviews band heading and lede (rendered page still says "What clients say").** `ui/trust.mjs` falls back to "What clients say" when no heading is passed, and `site/src/pages/home.mjs` (line 38 on `a3a99dd`) calls `ui.testimonials(d, quotes, { link })` with no heading and no lede, so `home.json` `reviewsBand.heading` ("Reviews") and `reviewsBand.lede` are never rendered. The built home page still shows the h2 "What clients say", which reads as real client words while every review is a sample. Content has changed the JSON only; the rendered heading stays wrong until a template changes:
    - **t-home (W3):** pass `reviewsBand.heading` and `reviewsBand.lede` from `home.json` into `ui.testimonials` (and `reviewsBand.googleLink.label` with the `site.json` `googleProfile` URL, CONTRACT section 3).
    - **ds-comp (W2):** change the fallback to a neutral heading such as "Reviews", so no caller can bring "What clients say" back.
24. **Home "Browse the portfolio" sentence.** `home.json` section `projects` keeps "[Browse the portfolio](/projects/)." unchanged because `home.mjs` `PORTFOLIO_LINK_RE` strips it. When t-home drops that regex, tell content and the sentence becomes plain copy without the stale "portfolio" label.

## t-company (W3)
25. **About hero key.** `about.json` now has `images.hero` (= `commercial-hero`, no people) next to the deprecated `images.crew` (same value). Please read `images.hero` and drop the `'about-crew'` fallback in `pages/company.mjs`; content then deletes `images.crew` (requests #16, carry).

## docs (W5): LAUNCH-CHECKLIST
26. Confirm against the W4 evidence pack before launch: `accessibility.json` says text, controls and focus outlines are checked for AA contrast in both themes, and that pages are built to reflow at narrow widths and 200% zoom. If W4 finds otherwise, content rewords; do not leave the claim.
27. `privacy.json` `updated` is 2026-11-22 because "What we collect", "Settings saved on your device" and "Analytics and cookies" changed; the lawyer's review should date from this text.

## Integrator (W2 barrier) and W4 fix lane: copy written ahead of W2 features
28. **Check feature copy against the merged build.** `privacy.json` (sections `collect`, `device`) and `accessibility.json` (sections `settings`, `forms`) describe the six-input quote builder and the "Dark theme" / "Animations" header buttons as CONTRACT sections 6 and 8 specify. On `w2/content` alone they are not yet true: `/free-quote/` still has email, organization, address and phone fields and no webmail links, and the header has no `data-pref` buttons, because `w2/quote` and `w2/ds-chrome` had not landed. Content's brief has no lane after W2, so after the quote and ds-chrome merges the integrator should check these four sections (and the items in #20, #22 and #26) against the built `/free-quote/`, `/privacy/`, `/accessibility/` and header, and hand any mismatch to the W4 `fix-content` lane (it owns `content/pages/**` then). docs (W5): please also add this as a LAUNCH-CHECKLIST item ("privacy and accessibility pages match the shipped quote form and display settings").

## t-company (W3): reviews page over-claims client feedback
29. **`/reviews/` heading and lede are hard-coded.** `site/src/pages/company.mjs` (reviews route, line 63 on `a3a99dd`) renders `ui.testimonials(d, testimonials, { heading: 'Client feedback', lede: '...will be replaced with reviews from RNC clients...' })`, then `ui.sections(without(p, ['sample-note']))`, so the page's h2 list is "Client feedback | See the work" and the `sample-note` copy in `reviews.json` never appears. While every review is a sample, "Client feedback" states that RNC has client feedback. Please pass a neutral heading (for example "Reviews" or "Sample reviews", or read one from `reviews.json`) and either render the `sample-note` section or take the lede from `reviews.json` `sample-note.body[0]` instead of the hard-coded string. Content has already set `reviews.json` `seo.title` to "Reviews | RNC Landscaping" and a description that claims no client reviews.

## t-editorial (W3): display date format
30. **Dates show as "November 22, 2026", not "22 November 2026".** CONTRACT section 6 (D3) and `site/CONTENT-GUIDE.md` say dates display as "19 November 2026" (`lib/dates.mjs` `formatDate`). The legacy `fmtDate` in `pages/_shared.mjs` (`toLocaleDateString('en-CA')`) is still used by `editorial.mjs` (guide "Published" line, privacy/terms "Updated" line) and the resource card in `_shared.mjs`, so the built pages show "November 22, 2026". Please switch those to `formatDate`/`timeEl` from `lib/dates.mjs` as planned (the `_shared.mjs` card goes to whichever lane owns `_shared.mjs` then). Content keeps the guide's "19 November 2026", which matches the contract.
