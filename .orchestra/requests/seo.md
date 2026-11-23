# Requests from seo (W2)

Branch `w2/seo`, base `a3a99dd` (wave-1-int). These are changes to files that seo does not own, plus notes for the integrator. Nothing below was edited by seo.

## 1. Integrator: `site/tests/unit/ia-site-json.test.mjs` (no W2 owner) must read the one-graph JSON-LD

C6 / REDESIGN-PLAN "Schema": each page now has **one** `<script type="application/ld+json">` holding `{"@context","@graph":[…]}`. The business node is `HomeAndConstructionBusiness`, because `LandscapingBusiness` is not a schema.org type (carry.json w2 seo item).

Two `#consumers` tests in `ia-site-json.test.mjs` still look for one top-level object per script. They fail on `w2/seo` with "Cannot read properties of undefined (reading 'telephone' / 'areaServed')":
- `header, footer and JSON-LD follow site.json NAP, hours, founding year and credentials #consumers`;
- `municipalities and service labels come from site.json in the nav, footer and areaServed #consumers`.

The data they assert is still there: telephone, email, streetAddress, foundingDate, the areaServed names, and Service.areaServed names. Only the lookup has to change. Proposed patch:

```js
// line 28: search the @graph nodes, not the top-level objects
const ldNodes = (/** @type {string} */ h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap((m) => { const o = JSON.parse(m[1]); return o['@graph'] || [o]; });
const business = (/** @type {string} */ h) => ldNodes(h).find((o) => /Business$/.test(o['@type']));
// lines 104–105: the Service node
const ld = ldNodes(svc).find((o) => o['@type'] === 'Service');
```

Unrelated to the patch: `ADDRESS: '1 Test Road, Victoria'` still becomes `streetAddress`. The value "Serving Greater Victoria" (CONTRACT §3, hidden address) keeps only region and country.

## 1b. qa (W2, merges after seo): `site/tools/check-content.mjs` must read the one-graph JSON-LD

The same lookup breaks `check-content#gbp-alignment` and `#nap-consistency` on `w2/seo`: 57 "no business JSON-LD" failures, one per page. This is not a content problem, and it should not be baselined. Patch, verified on a temporary copy over the `w2/seo` offline build (✓ check-content):

```js
// line 382: search the @graph nodes
const businessOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap((m) => { try { const o = JSON.parse(m[1]); return o?.['@graph'] || [o]; } catch { return []; } })
  .find((o) => o && /Business$/.test(String(o['@type'])));
// line 432: "Serving Greater Victoria" (CONTRACT §3, hidden address) is not a street address, so schema leaves it out
if ((tokens.ADDRESS && !/^serving\b/i.test(tokens.ADDRESS) ? tokens.ADDRESS : undefined) !== b.address?.streetAddress) fail(…);
```

If qa's branch has already merged without this patch, the integrator should apply it at the W2 barrier.

## 2. Integrator: check-seo baseline at the seo merge (CONTRACT §17)

Run `node tools/check-seo.mjs --write-baseline --baseline-at=w2/seo` on the integration tip. On `w2/seo` (offline showcase build), only W3-due rules fail. Every seo-owned rule passes: og-tags, double-encoding, slug-lint, canonical, canonical-unique, title-meta, technical and jsonld-graph. So do the W2 rules that other streams implement: single-nav-dom, alt-filename, h1-count, h1-present-on-hubs and breadcrumbs.

The 23 entries expected on this branch:

| Rule | Paths | Owner (due) | Cause |
|---|---|---|---|
| `time-format` | `index.html`, `privacy/`, `terms/`, `resources/` and the 6 guides | t-editorial / t-home (W3) | `_shared.mjs fmtDate()` shows "November 19, 2026". Switch to `lib/dates.mjs formatDate()` / `timeEl()` ("19 November 2026"), as already logged in requests/ia.md. |
| `cross-area-duplicates` | all 13 `areas/<slug>/index.html` | t-areas (W3) | The template repeats 4 sentences on every area page: "Rules change, so each note links to the official source.", "Thirteen municipalities across the Capital Region, from the … Peninsula to the … Hills.", "Choose an area to see local notes and projects." and "Share a few details and photos and we will follow up to arrange a site visit." Wrap the shared template blocks (CTA, areas map intro, rules caveat) in `[data-shared]`, or render them only on `/areas/`. |

The content stream's W2 edits may add `title-meta` entries (≤ 60 / ≤ 155 visible characters, counted after entity decoding). These are not expected: every current title and description passes.

## 3. t-editorial (W3): Article image in offline builds

`pages/editorial.mjs` passes `getSlot(r.image)?.stock?.imageUrl` to `schema.article()`, even in `--offline-images` builds. So the offline JSON-LD names an Unsplash URL. Pass the stock URL only when `hasPhoto(r.image)` is true. Once og-render ships the cards, passing the page's OG card URL (`ogCard(path)` from `lib/seo.mjs`) is better. `schema.article()` drops a null image.

## 4. og-render (W5): rendering the cards

1. `node tools/og-cards.mjs --render` writes `site/static/og/<key>.jpg` (1200×630, ≤ 45 KB, stepped-down JPEG quality) for every built page, plus `default.jpg`. The key is `lib/seo.mjs ogKey()`: `/` → `home`, `/services/irrigation/` → `services-irrigation`.
2. Rebuild, then run `node tools/og-cards.mjs --check` (rule `og-cards#coverage`).

`lib/seo.mjs` picks a card up automatically: the page card, else `default.jpg`, else the photo slot (online builds only), else the brand icon. Run `--render` on the final W4 content, because the card text is the page's H1. Previews can go to `--dir=<scratch>` without touching `site/static/og`.

## 5. W3 page families: things the seo checks now enforce (FYI)

- `check-seo#internal-links-*` reads links in `<main>` only: the header and footer area lists do not count.
- `check-seo#breadcrumbs` compares the visible trail with the JSON-LD BreadcrumbList, which `lib/seo.mjs` builds from the same `crumbs`. Keep passing `crumbs` to `layout()`.
- `check-seo#decorative-duplicate` looks at headings and display classes (`eyebrow`, `kicker`, `tagline`, `display`, `deco`, `watermark`, `marquee`, `ticker`, `hero__*`). Give a decorative repeat `aria-hidden="true"`.
- `og:type` is `article` automatically for any page whose `jsonld` carries an Article node, so the guides need no `ogType`.
