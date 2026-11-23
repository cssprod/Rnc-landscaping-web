# Area facts: source verification V1 (Victoria, Saanich, Oak Bay, Esquimalt, View Royal, Central Saanich, North Saanich)

Verified on 2026-11-21. Machine-readable results are in `research/area-facts/<slug>.json`; each fact's `note` starts with "V1:" and says what changed.

## Method
- Every `sourceUrl` was fetched live with curl, following redirects. PDFs were converted with pdftotext.
- Each excerpt was then checked by script against the fetched text, ignoring whitespace and quote style. Two-column PDFs were re-checked with a second extraction.
- All 82 excerpts on facts with `reviewedOn` set match their source verbatim, and each is 30 words or fewer.
- A confirmed fact got `reviewedOn: "2026-11-21"` and `sourceType: "official"`, and its "from search snippet" note was removed.
- An unverifiable fact keeps `reviewedOn: null`, with the reason in its `note`.
- **No $ amounts** appear in any `text` or `excerpt`. Deposits and fees are described without figures, per CONTRACT §2 and §6.
- Each file gained a `verifiedOn` key.

## Hosts that could not be reached (reviewedOn stays null)
| Host | Effect |
|---|---|
| `www.northsaanich.ca` | `northsaanich.ca` (allowed) returns 301 to `www.northsaanich.ca`, which is **not allowed**, so **no North Saanich page could be opened**. Allow `www.northsaanich.ca` and re-run. |
| `viewroyal.ca` (no www), `crd.bc.ca` (no www), `saanich.ca` (no www), `esquimalt.ca` (no www), `centralsaanich.ca` (no www) | Blocked, but the `www.` versions worked. URLs were switched to `www.`. |
| forums.botanicalgarden.ubc.ca, hat.bc.ca, vancouverisland.ctvnews.ca, timescolonist.com, letstalkcentralsaanich.ca.engagementhq.com, www.env.gov.bc.ca, bcrfc.env.gov.bc.ca | Not on the allowed list. Their facts remain unverified, except cs-tree-replacement, which was moved to the District's own news page. |

## Results per municipality
| Area | Confirmed | Corrected | Unverified | Added | Total |
|---|---|---|---|---|---|
| Victoria | 1 | 6 | 1 | 6 | 14 |
| Saanich | 4 | 6 | 0 | 6 | 16 |
| Oak Bay | 4 | 4 | 1 | 6 | 15 |
| Esquimalt | 4 | 4 | 1 | 4 | 13 |
| View Royal | 2 | 7 | 0 | 3 | 12 |
| Central Saanich | 4 | 3 | 2 | 5 | 14 |
| North Saanich | 1 | 1 | 8 | 1 | 11 |

"Corrected" means the text, the excerpt or the source changed in substance. The shared CRD watering fact counts as corrected in every file because its URL and excerpt changed. The new CRD invasive-disposal fact counts as added in every file.

### Victoria
- **Confirmed:** vic-tree-30cm.
- **Corrected:**
  - vic-tree-slope-watercourse: removed the "setback survey" claim, which is not on either info sheet.
  - vic-tree-native-height: URL redirect; the four species are now listed.
  - vic-tree-permit-scope: node/162 moved; excerpt is now verbatim.
  - vic-boulevard-gardens: the excerpt lives on the Community Gardening page, not the PDF. "Contact Parks" is now "register the garden and make a BC One Call".
  - vic-gorge-guidelines: now states the 7 m natural strip, the ban on pesticides and fertilizers, and that fill is allowed only for erosion.
  - crd-watering-stage1.
- **Unverified:** vic-salt-spray (secondary, host blocked).
- **Added:** vic-tree-pruning-permit (permit for branches over 10 cm or more than 25% of foliage), vic-tree-replacement, vic-boulevard-no-irrigation, vic-pesticide-bylaw (07-094), vic-leafblower-hours (Noise Bylaw 03-012, 2015 consolidation), crd-invasive-disposal.

### Saanich
- **Confirmed:** sa-tree-steep-slope, sa-tree-bylaw-review, sa-urban-rural-split, sa-pulling-together.
- **Corrected:**
  - sa-tree-native-small: removed "far smaller than most neighbouring bylaws", which is false.
  - sa-tree-large: added grand fir.
  - sa-streamside-dpa: new excerpt. The phone number is Planning's. Maintaining an existing landscape is exempt.
  - sa-pesticide-bylaw: removed the dandelion line. Added the bylaw number (9054), the land-use scope and the glyphosate rule.
  - sa-boulevard-permit: rocks, gravel, fences and walls **need a permit**; they are not banned. Planting a tree on a boulevard is prohibited.
  - crd-watering-stage1.
- **Added:** sa-tree-sdpa, sa-tree-pruning, sa-boulevard-heights (Bylaw 9487), sa-rural-groundwater, sa-interface-fire, crd-invasive-disposal.
- **Bylaw rewrite status (resolved):** the live page says drafting, testing and legal review continue through fall 2026. Bylaw 9272 (2014) still applies, and the proposals are not law.

### Oak Bay
- **Confirmed:** ob-tree-permit (consolidated March 10, 2025 to include Bylaws 4759 and 4893), ob-tree-pruning (5 cm and 10 cm are branch diameters), ob-deer-project, ob-deer-garden.
- **Corrected:**
  - ob-tree-deposit: the wording is on the permit form PDF, revision "Rev. 010222".
  - ob-uplands-guidelines: excerpt is now verbatim.
  - ob-prospect-hca: Prospect is an existing HCA, not "will be".
  - crd-watering-stage1.
- **Unverified:** ob-gas-equipment-phaseout. The official Anti-Noise Bylaw (consolidated to July 27, 2026) has leaf-blower **hours only** and no gas prohibition.
- **Added:** ob-tree-protected-def, ob-prospect-hap, ob-prospect-landscape, ob-pesticide-bylaw (4518), ob-leafblower-hours, crd-invasive-disposal.
- **Thresholds in the protected-tree definition (gap closed):** six native species once over 4 cm basal diameter or over 1 m tall, and any tree over 30 cm DBH.

### Esquimalt
- **Confirmed:** es-dpa1-landscaping, es-shoreline-setback, es-dpa1-soil-views (the 2026-01 PDF returns 404; switched to the OCP/DPA PDF), es-boulevard-permit.
- **Corrected:**
  - es-tree-bylaw-3076: "30 cm or more". Native conifers are protected from 4 m tall, and arbutus, bigleaf maple, Garry oak, Pacific dogwood and Pacific yew from 4 cm DBH.
  - es-tree-permit-scope: the old URL now serves the application form. Removed the "handled with the building permit" claim.
  - es-pesticide-bylaw: "bans" is now "regulates and reduces".
  - crd-watering-stage1.
- **Unverified:** es-garry-oak-remnant (hat.bc.ca blocked).
- **Added:** es-tree-neighbour-pruning, es-gorge-natural-strip (7.5 m), es-dpa1-native-planting (mentions sea spray), crd-invasive-disposal.
- **7.5 m conflict (resolved):** 7.5 m is a natural-state strip along the Gorge. The building setback stays at 20 m (Gorge) and 10 m (Strait).

### View Royal
- **Confirmed:** vr-tree-permit, vr-firesmart-assessments (excerpt fixed).
- **Corrected:**
  - vr-tree-species: added Sitka spruce and western redcedar.
  - **vr-tree-30cm: the consolidated bylaw (1069 as amended by 1145) says 20 cm; the Town's web pages still say 30 cm.**
  - vr-shoreline-setback: new OCP Bylaw 1180 (2026) sets 15 m for shorelines and 30 m for watercourses.
  - vr-watercourse-dpa: the DPA is now named "Environmental Protection and Natural Hazard".
  - vr-wildland-interface: URL moved; removed the "Thetis Lake priority areas" claim.
  - vr-strata-proof: recognition came in December 2025, with the sign presented in January 2026, not "February 2026".
  - crd-watering-stage1.
- **Added:** vr-tree-watercourse-slope (tree permit within 30 m of a watercourse, previously 15 m), vr-tree-pruning-exempt, crd-invasive-disposal.

### Central Saanich
- **Confirmed:** cs-tree-30cm, cs-tree-replacement (moved to the District's own news page), cs-tree-fees-emergency, cs-alr-share.
- **Corrected:**
  - cs-tree-species: protected once over 50 cm tall; trembling aspen added.
  - cs-erosion-district: now sourced from bylaw 2065. Removed the "two permits" wording.
  - crd-watering-stage1.
- **Unverified:** cs-aquifers (env.gov.bc.ca blocked), cs-deer-pilot (Times Colonist blocked).
- **Added:** cs-tree-pruning, cs-alr-tree-exemption, cs-burning (Bylaw 2058, season and pile sizes), cs-pesticide-public (Bylaw 1688 applies to public land), crd-invasive-disposal.
- **Threshold conflict (resolved: 30 cm):** Bylaw No. 2065 says "30 centimetres or more in diameter at DBH except when planted as a hedge", adopted **June 28, 2021**. The 0.6 m figure is on an older page that predates 2065.

### North Saanich
- **Confirmed:** prov-private-well-drought.
- **Corrected:** crd-watering-stage1.
- **Added:** crd-invasive-disposal.
- **Unverified:** all 8 District facts (www.northsaanich.ca blocked). ns-pesticide-policy was reworded so it no longer implies that no bylaw exists.
- **The 10 cm DPA claim stays UNVERIFIED.**

## Corrections the content writers MUST apply
1. **Central Saanich:** change 0.6 m to **30 cm** in `content/areas/central-saanich.json`. The bylaw was adopted June 28, 2021.
2. **View Royal:** do not publish "30 cm" as settled. Write "the consolidated bylaw lists 20 cm", or get the Town's confirmation. Tree permits now reach **30 m** from watercourses, not 15 m.
3. **North Saanich:** nothing is verified. Do not publish the 10 cm DPA claim, and do not give North Saanich facts a review date.
4. **Oak Bay:** never say a gas-equipment ban is in force, or that none exists. The verified rule is the leaf-blower hours, which apply to electric units too.
5. **Saanich:**
   - Boulevard rocks, gravel and fences need a Boulevard Permit; they are not banned.
   - Do not say Saanich's thresholds are smaller than the neighbours'.
   - Drop the dandelion line.
   - The tree-bylaw update is not law.
6. **Victoria:**
   - No in-ground irrigation on boulevards.
   - Drop the "setback survey" claim.
   - The Gorge 7 m strip bans pesticides and fertilizers.
7. **Esquimalt:** the pesticide bylaw "regulates and reduces" cosmetic use (do not say "bans"), and the tree threshold is "30 cm or more".
8. **No ISA claim:** View Royal's pruning exemption needs an ISA-certified arborist. Do not imply RNC qualifies; `[CERTIFICATIONS]` is unresolved.
9. **Shared ids:**
   - V1 kept the R1a ids `crd-watering-stage1` and `crd-invasive-disposal`, as instructed.
   - The six R1b/V2 files use `regional-crd-stage1-watering` and `regional-crd-invasive-disposal`, with the same www.crd.ca URLs, also reviewed 2026-11-21.
   - The shared block will render each fact twice unless the integrator aliases or aligns the ids.
   - The CRD URL is now `https://www.crd.ca/environment/water-conservation/watering-schedule`. The old excerpt "The watering schedule days only apply to lawns!" is not on the page.
10. **Time-bound items:**
    - Oak Bay's fall 2026 deer treatment window has passed.
    - The Central Saanich burning season shown runs from October 16, 2026 to May 15, 2027.
    - Re-check both at publish time.
