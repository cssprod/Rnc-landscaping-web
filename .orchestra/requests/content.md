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
