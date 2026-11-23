# Area sources: R1b (Sidney, Langford, Colwood, Sooke, Highlands, Metchosin)

Researched 2026-11-21. Machine-readable facts: `research/area-facts/<slug>.json`.

## How these were gathered (read first)
- **No page was fetched this session.** WebFetch failed DNS for every official host tried: sidney.ca, langford.ca, colwood.ca, highlands.ca, metchosin.ca, crd.ca and sooke-012-ca.govstack.com. They are outside this session's allowed network, and curl is blocked too.
- Every fact therefore comes **from search-result snippets**, with `reviewedOn: null` and `verify: true`. Before publishing, someone must open each `sourceUrl`, confirm the wording, then set `reviewedOn`.
- Some excerpts are the snippet's wording and may be lightly paraphrased. Those are flagged in each fact's `note`.
- Each fact has `unique: true` when it is specific to that municipality, or `kind: "regional"` / `unique: false` for CRD or provincial rules. Regional facts share an `id` (`regional-crd-stage1-watering`, `regional-bc-rapr`, `regional-bc-wildlife-act-nests`) so the areas page can show them once in the shared `data-shared` block.
- Secondary sources (news or third-party sites) are labelled "SECONDARY" in `note`.

## Regional (shared block, not per municipality)
| id | Source |
|---|---|
| regional-crd-stage1-watering | CRD watering schedule https://www.crd.ca/node/4919 (the Saanich watering-schedules page gives the same dates) |
| regional-bc-rapr | Province of B.C., RAPR https://www2.gov.bc.ca/gov/content/environment/plants-animals-ecosystems/fish/aquatic-habitat-management/riparian-areas-regulation |
| regional-bc-wildlife-act-nests | Province of B.C., Wildlife compliance https://www2.gov.bc.ca/gov/content/transportation/transportation-infrastructure/engineering-standards-guidelines/environmental-management/reference-documents/environmental-regulatory-compliance/wildlife |

## Sidney
- Tree Preservation Bylaw page: https://www.sidney.ca/services/trees/tree-preservation-bylaw/ (official)
- Tree Permit Application 2025: https://www.sidney.ca/wp-content/uploads/Tree-Permit-Application-2025_REV.pdf (official)
- Bylaw text: https://www.sidney.ca/wp-content/uploads/Tree-Preservation-Bylaw-No.pdf (official, not read)
- Environmentally Sensitive Areas DPAs: https://www.sidney.ca/planning-building/community-planning/environmentally-sensitive-development-permit-areas/ (official)
- Boulevard Maintenance Bylaw 1738: https://sidney.ca/wp-content/uploads/1738-Boulevard-Maintenance-Bylaw.pdf (official, 2002)
- Fire Department (no wood burning): https://sidney.ca/?p=2028 (official)
- Yard waste collection: https://www.sidney.ca/?p=1994 and Bylaw 2259 https://www.sidney.ca/wp-content/uploads/2259-Collection-and-Disposal-of-Refuse.pdf (official)
- Not used:
  - The Wikipedia "rain shadow" claim is tagged "citation needed".
  - Sidney Island deer is a different place.

## Langford
- Tree removal page: https://langford.ca/residents/resident-resources/tree-removal/ (official)
- Old Tree Bylaw FAQ for interim Bylaws 2117/2118: https://langford.ca/wp-content/uploads/2023/02/Tree-Bylaw-FAQs.pdf. Its 20 cm threshold may be out of date, so it is not used.
- Environmental Protection & Hazard Area DPA Guidelines: https://langford.ca/wp-content/uploads/2026/04/Environmental-Development-Permit-Areas.pdf (official)
- Community Standards Bylaw 2255: https://langford.ca/wp-content/uploads/2026/05/Community-Standards-Bylaw-No.-2255-2026-Online-1.pdf (official, text fragmented)
- Servicing Bylaw 1000 (Schedule 14): https://langford.ca/wp-content/uploads/2023/04/Bylaw-1000-Consolidated-20231026_Updated.pdf (official)
- Blasting advisory: https://langford.ca/advisories/blasting-langford-heights-millstream-road-expires-october-2024/ (official)
- Open burning, half-acre lots: https://www.goldstreamgazette.com/news/open-burning-permitted-this-month-in-langford/ (SECONDARY, undated)

## Colwood
- Tree Permits: https://www.colwood.ca/node/5090 (official)
- Urban Forest Bylaw rack card: https://colwood.ca/sites/default/files/2024-06/rack-card-urban-forest-bylaw.pdf (official)
- Tree Management Permit Application (2017): https://www.colwood.ca/sites/default/files/trees/2017 October 4 Tree Management Permit Application City of Colwood.pdf (official, older)
- Consolidated Urban Forest Bylaw: https://www.colwood.ca/node/5251 (official, not read)
- OCP sections, some of them DRAFT text:
  - Section 20, Riparian/Marine Shorelines: https://www.colwood.ca/sites/default/files/plans-reports/ocp/ocp-toc/20.%20Riparian%20Areas%20and%20Marine%20Shorelines%20Environmental%20DPA%20rev.pdf
  - Section 21, Sensitive Ecosystems: https://www.colwood.ca/sites/default/files/plans-reports/ocp/ocp-toc/21.%20Sensitive%20Ecosystems%20Environmental%20DPA.pdf
  - Section 22, Hillside: https://www.colwood.ca/sites/default/files/plans-reports/ocp/ocp-toc/22.%20Hillside%20Environmental%20DPA-2.pdf
- Burning (no open burning): https://colwood.ca/node/140 (official)
- Royal Bay reclamation: https://www.colwood.ca/node/6830 (official)
- Esquimalt Lagoon MBS: https://www.canada.ca/en/environment-climate-change/services/migratory-bird-sanctuaries/locations/esquimalt-lagoon.html (official federal; attribution of the snippet is uncertain)

## Sooke
- Proposed tree bylaw: https://www.sookenewsmirror.com/news/sooke-survey-collects-thoughts-on-tree-bylaw/ (SECONDARY, Oct 2020). **No adopted Sooke tree bylaw was found. That does not mean none exists.**
- OCP Bylaw 800 (adopted Dec 8, 2025): https://sooke-012-ca.govstack.com/media/wa2dwxxg/ocp-bylaw-no-800-2022-adopted-08-dec-2025.pdf (official, not reachable)
- DPA count on the draft OCP: https://capitaldaily.ca/news/sooke-homeowners-irked-by-districts-draft-community-plan (SECONDARY)
- Burning season: https://islandsocialtrends.ca/?p=163851 (SECONDARY). The official page is sooke.ca/burning.
- FireSmart: https://vancouverisland.ctvnews.ca/sooke-offering-free-assessments-to-help-residents-mitigate-wildfire-risk-1.5767982 (SECONDARY)
- Scotch broom: https://www.pressreader.com/canada/times-colonist/20240505/281981792670376 (SECONDARY, May 2024)
- Water extension: https://www.sookenewsmirror.com/news/sooke-council-backs-water-service-extension/ (SECONDARY)
- CRD Juan de Fuca system: https://crd.bc.ca/service/drinking-water/systems/juan-de-fuca-water-distribution-service (official)
- Whiffin Spit: https://en.wikipedia.com/wiki/Sooke_Basin (SECONDARY)

## Highlands
- Tree cutting: https://www.highlands.ca/node/133 (official)
- Development Permit Areas 1-5 (Jan 2024): https://www.highlands.ca/sites/31/files/2025-02/Development%20Permit%201-5%20-%20Jan%202024_202401251135368466.pdf (official)
- Groundwater work plan: https://www.highlands.ca/sites/31/files/2025-02/District%20of%20Highlands%20Groundwater%20Protection%20-%20Final%20Work%20Plan%20and%20Implementation%20Report.pdf (official)
- Groundwater page: https://www.highlands.ca/node/150 (official)
- 2018 GW report: https://www.highlands.ca/sites/31/files/2025-02/2018%20GW%20Monitoring%20Report-31JUL_19.pdf (official)
- Burning permits: https://www.highlands.ca/node/149 (official)
- FireSmart: https://www.highlands.ca/node/105 (official)
- CWPP 2009: https://www.highlands.ca/sites/31/files/2025-02/Highlands_CWPP%20-%20r.pdf (official)

## Metchosin
- Tree Cutting Permits: https://www.metchosin.ca/node/485 (official)
- Protected Trees: https://www.metchosin.ca/node/521 (official, content not read)
- Tree fines / 10 per acre: https://www.goldstreamgazette.com/community/metchosin-tree-fines-spike/ (SECONDARY, undated)
- Burning Regulations: https://www.metchosin.ca/node/448 (official)
- Development Permits: https://www.metchosin.ca/node/498 (official)
- OCP Bylaw 258 (consolidated Apr 2025): https://www.metchosin.ca/sites/metchosin.ca/files/2025-09/258OCP_ConApr2025_2.pdf (official, not read)
- Environmental Advisory Select Committee (EASC) agenda, Nov 2024: https://metchosin.ca/sites/metchosin.ca/files/2024-11/11%2026%202024%20MEASC%20Agenda%20Pkg.pdf (official)
- Agricultural Area Plan 2024: https://metchosin.ca/sites/metchosin.ca/files/2024-09/Metchosin%20Ag%20Plan_FINAL.pdf (official)
- CRD aquifers (Province): https://www.env.gov.bc.ca/wsd/plan_protect_sustain/groundwater/aquifers/aquifers_crd/pdfs/aquif_crd.pdf (official, older)

## Discrepancies with `research/areas.json` (for the areas-content stream)
- **Colwood:** areas.json gives species thresholds of 2 m / 4 cm and 30 cm, and pruning limits. They were not re-confirmed here; the rack card snippet says "30 cm or more".
- **Highlands:** areas.json gives size thresholds (Douglas-fir over 60 cm, any tree over 80 cm). They were not re-confirmed, and one snippet listed only Garry oak.
- **Langford:** areas.json and the current page agree; the bylaw is No. 2269.
