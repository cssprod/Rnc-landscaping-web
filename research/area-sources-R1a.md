# Area sources log: R1a (Victoria, Saanich, Oak Bay, Esquimalt, View Royal, Central Saanich, North Saanich)

Researched: 2026-11-21. Machine-readable facts are in `research/area-facts/<slug>.json`.

## Method and limits (read first)
- **No page was fetched.** WebFetch failed with DNS/host-blocked errors for victoria.ca, saanich.ca, oakbay.ca and esquimalt.ca, and curl is blocked. Every fact therefore comes from **WebSearch result snippets**: `reviewedOn: null`, `verify: true`, `note: "from search snippet …"`.
- Excerpts are short phrases that the search tool attributed to the source. A few are flagged as "paraphrased by search tool". Re-read every excerpt on the live page before publishing a "last reviewed" date.
- **Official vs secondary:** `sourceType: "official"` means a municipal, CRD or BC government page. `"secondary"` (news, forum, land trust) is used only for conditions or context, and the page copy should say so.
- **Regional vs local:** CRD watering rules are `kind: "regional"` (id `crd-watering-stage1`, the same in every file) so the areas stream can render them once in the shared `data-shared` block. The provincial private-well guidance (`prov-private-well-drought`) is also regional.
- To unblock real review dates, the session's network needs to allow: victoria.ca, saanich.ca, oakbay.ca, esquimalt.ca, viewroyal.ca, centralsaanich.ca, northsaanich.ca, crd.bc.ca, www2.gov.bc.ca.

## Flags for the areas-content stream
1. **Central Saanich threshold conflict.** `content/areas/central-saanich.json` says protected trees start at 0.6 m. centralsaanich.ca/trees and the June 2021 adoption notice say **30 cm**. node/256 still shows 0.6 m. Confirm before publishing.
2. **North Saanich "10 cm in DPAs"** (from research/areas.json) was not confirmed. Treat it as unverified.
3. **Oak Bay gas-equipment phase-out** comes from news only, and its 2026 in-force status is unconfirmed.
4. **Saanich tree bylaw is being rewritten** (June 2026 Q&A), so the thresholds may change.
5. **Victoria leaf-blower ban:** not confirmed, so it is not included as a fact.

## Shared / regional
| id | Source |
|---|---|
| crd-watering-stage1 | [CRD Watering Schedules](https://crd.bc.ca/education/water-conservation/at-home/watering-schedules) |
| prov-private-well-drought (North Saanich file) | [BC dry well brochure](https://www2.gov.bc.ca/assets/gov/environment/air-land-water/water/water-wells/bc_gov_drywellbrochure.pdf) |

## Victoria
- [Tree Protection Bylaw info sheet, property owners](https://www.victoria.ca/media/file/tree-protection-bylaw-info-sheet-property-owners): 30 cm trees and hedges; any tree on slopes over 33 per cent over 10 m or within 15 m of a watercourse.
- [Residential info sheet](https://www.victoria.ca/media/file/residential-info-sheetpdf): native species (Garry oak) protected over 50 cm tall. The snippet was fragmentary.
- [Tree Protection Bylaw page](https://www.victoria.ca/node/162): permit to prune, remove or work in the root zone.
- [Boulevard Gardening Guidelines](https://victoria.ca/media/file/boulevard-gardening-guidelines): no pre-approval; no paving or gravel; call Parks before digging.
- [Victoria Arm – Gorge Waterway Design Guidelines 2025](https://www.victoria.ca/media/file/victoria-arm-gorge-waterway-guidelines-2025): fill, seawalls and shoring only under conditions.
- Secondary: [UBC Botanical Garden forum, Oceanfront Plants](https://forums.botanicalgarden.ubc.ca/threads/oceanfront-plants.73692/): a Victoria gardener on salt spray.
- Gaps: leaf-blower ban status; full native-species list; Gorge landscaping clauses; soils.

## Saanich
- [Tree Bylaw Overview PDF](https://www.saanich.ca/assets/Community/Documents/Tree-Bylaw-Overview.pdf): native species from 2 m tall or 4 cm; conifers and bigleaf maple from 30 cm; other trees from 60 cm; steep-slope trees from 10 cm or 5 m.
- [Q&A Tree Bylaw project update, June 2026](https://www.saanich.ca/assets/Community/Documents/Q&A-Tree-Bylaw-project-update-June-2026.pdf): the existing bylaw applies until the new one passes.
- [Streamside Development Permit Area](https://www.saanich.ca/EN/main/community/natural-environment/environmental-planning/streamside-development-permit-area.html): 30 m SDPA, SPEA setback, Environmental Services 250-475-5471.
- [Pesticide Bylaw](https://www.saanich.ca/EN/main/community/natural-environment/pesticide-reduction/pesticides-bylaw.html): residential lawn and garden use generally banned; permit route.
- [Boulevards](https://saanich.ca/EN/main/local-government/departments/engineering-department/boulevards.html): Boulevard Permit; no fences, rocks, walls or hedges.
- [Rural Saanich Local Area Plan](https://www.saanich.ca/assets/Community/Documents/Planning/plans/Rural_lap_web.pdf): large lots and rural servicing outside the UCB.
- [Volunteer for Pulling Together](https://www.saanich.ca/EN/main/parks-recreation-community/parks/natural-areas/volunteer-for-pulling-together.html): invasive removal in 44 parks.
- Gaps: which rural lots are on wells; boulevard height limits; whether landscaping in the SDPA needs a permit.

## Oak Bay
- [Trees page](https://www.oakbay.ca/parks-recreation/parks/trees/): Municipal Arborist permit; Bylaw 4742 amended by 4759.
- [Bylaw 4742 consolidated](https://Oakbay.ca/sites/default/files/4742_CONSOLIDATED.pdf): pruning thresholds (5 cm / 10 cm); $500-per-tree security deposit on the 10/2022 form. Partly indexed.
- [Uplands Design Guidelines brochure, 2025](https://oakbay.ca/wp-content/uploads/2025/04/Uplands-Design-Guidelines-Brochure.pdf): Advisory Design Panel; "residential park atmosphere".
- [Heritage Conservation Area](https://www.oakbay.ca/building-infrastructure/planning/heritage-area): Prospect is the first HCA.
- [Urban Deer](https://www.oakbay.ca/community-culture/pets-wildlife/urban-deer): immunocontraception in fall 2026 with HERD.
- [Oak Bay deer flyer, 2017](https://Oakbay.ca/sites/default/files/OakBayDeer%20Info%20Flyer%20MAY%203%202017.pdf): combine methods; deer get used to repellents.
- Secondary: [CTV, Oak Bay votes to ban gas-powered landscaping gear](https://vancouverisland.ctvnews.ca/oak-bay-votes-to-ban-gas-powered-landscaping-gear-1.5919022).
- Gaps: diameter thresholds in 4742; current fees; waterfront exposure.

## Esquimalt
- [Tree cutting permit](https://www.esquimalt.ca/esquimalt-tree-cutting-permit): Bylaw 3076 (2022); over 30 cm DBH at 1.4 m; removal, pruning or root-zone work; trees@esquimalt.ca.
- [Environmental Areas](https://www.esquimalt.ca/node/277): DPA 1 covers landscaping; 20 m (Gorge) and 10 m (Strait) high-water setbacks.
- [DPA 1 Natural Environment, 2026-01](https://www.esquimalt.ca/sites/default/files/2026-01/DPA%201%20-%20Natural%20Environment.pdf): soil, views, Canadian Landscape Standards.
- [Pesticide bylaw info sheet](https://www.esquimalt.ca/sites/default/files/docs/municipal-hall/bylaws/pesticidebylawinfosheet.pdf): Bylaw 2686, applies to landscape professionals.
- [Boulevard Maintenance Bylaw 2860](https://esquimalt.ca/media/file/2019-07-bylaw-2860-boulevard-maintenance-consolidation): Boulevard Alteration Permit; no invasive plants.
- Secondary: [HAT Matson Conservation Area](https://hat.bc.ca/matson).
- Gaps: species list; slope rule; deer; exposure.

## View Royal
- [Tree Protection Bylaw page](https://viewroyal.ca/EN/main/discover/environment/tree-protection/tree-protection-bylaw.html): species list, shore pine added in 2022, 30 cm DBH.
- [Tree Removal or Alterations](https://www.viewroyal.ca/EN/main/business/permits-inspections/TreeRemoval.html): permit to remove or alter.
- [Environmental Regulations](https://www.viewroyal.ca/EN/main/business/community-planning/environmental-regulations.html): 15 m setback (Portage Inlet, Esquimalt Harbour, estuaries).
- [Development Permits](https://viewroyal.ca/EN/main/business/Land_Development/development-permits.html): watercourse DPA; Riparian Area Assessment.
- [FireSmart Stonecliffe news, 2026](https://www.viewroyal.ca/EN/meta/new/2026-latest-news/view-royal-strata-becomes-first-firesmart-recognized-neighbourhood-in-greater-victoria.html) and [FireSmart page](https://www.viewroyal.ca/EN/main/municipal/emergency-services/fire-department/firesmart.html): wildland-urban interface, Mill Hill fire in 2020, free assessments.
- Gaps: pesticide bylaw not found (not proof that none exists); small-tree species thresholds; deer and soils.

## Central Saanich
- [Trees](https://centralsaanich.ca/trees): 30 cm DBH; species list.
- [Trees on private property (node/256)](https://www.centralsaanich.ca/node/256): Erosion District permit plus geotechnical report. **Still lists 0.6 m (conflict).**
- [Tree Management Bylaw adopted June 29, 2021](https://letstalkcentralsaanich.ca.engagementhq.com/treebylaw/news_feed/tree-management-bylaw-adopted-june-29-2021): up to 3 replacement trees.
- [Tree permit application](https://www.centralsaanich.ca/sites/default/files/uploads/documents/tree_application.pdf): emergency removal of a high-hazard tree; fees.
- [Central Saanich Today](https://www.centralsaanich.ca/node/2914): 61% ALR, 18% UCB.
- [BC aquifers of the CRD](https://www.env.gov.bc.ca/wsd/plan_protect_sustain/groundwater/aquifers/aquifers_crd/aquif_crd.html): Hagan and Keating aquifers; irrigation.
- Secondary: [Times Colonist on the CRD deer pilots](https://www.timescolonist.com/local-news/stay-out-of-the-deer-control-business-staff-advise-crd-4624889).
- Gaps: threshold conflict; Bylaw 1688 private-land scope; Erosion District map.

## North Saanich
- [Tree Protection (node/51)](https://www.northsaanich.ca/node/51): Bylaw 1548, adopted 2022-10-03.
- [Residential Tree Permit Guide](https://northsaanich.ca/wp-content/uploads/NS-Residential-Tree-Permit-Guide-Web-Final-V1.pdf): 20 cm DBH; topping prohibited; retroactive applications.
- [Development Permits](https://northsaanich.ca/business-development/development-applications/development-permit/): DPA 1 / 3 / 4; OCP Bylaw 1587 s.5.10.
- [Agriculture & Land Security](https://northsaanich.ca/your-community/agriculture-land-security/): nearly 35% ALR.
- [West Coast Groundwater Report](https://bcrfc.env.gov.bc.ca/Real-time_Data/Drought_regional_statistics/West_Coast_Groundwater_Report.html): observation wells; a bedrock well low in October 2026.
- [Water Conservation (node/58)](https://www.northsaanich.ca/node/58): CRD schedules apply in the District.
- [Pesticide Use (node/57)](https://www.northsaanich.ca/node/57): reduction encouraged; no bylaw found in search.
- Gaps: the 10 cm DPA claim; well vs municipal water map; deer; pesticide bylaw (not proof that none exists).
