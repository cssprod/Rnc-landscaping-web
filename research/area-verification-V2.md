# Area source verification: V2 (Sidney, Langford, Colwood, Sooke, Highlands, Metchosin)

Verified on 2026-11-21. Machine-readable results are in `research/area-facts/<slug>.json`.

## Method
- Each `sourceUrl` was fetched live with curl, and redirects were followed. HTML was converted to text; PDFs were saved and read with `pdftotext`.
- Each excerpt was then checked by script against the fetched text (whitespace normalised, nothing else changed). Every fact with `reviewedOn: "2026-11-21"` passed this check, and every excerpt is 30 words or fewer.
- Each fact now has two new fields:
  - `status`: `confirmed`, `corrected`, `added` or `unverified`;
  - `sourceType`: `official` or `secondary`.
- `note` records what changed. The old "from search snippet" notes were removed wherever the page was actually read.
- Unverifiable facts keep `reviewedOn: null`, with the reason given in `note`. No fact claims that a bylaw does not exist.
- Hosts this session's network **refused**:
  - `www.highlands.ca` (`highlands.ca` 301-redirects there);
  - `www.sooke.ca`;
  - the bare `sidney.ca` (the `www.` form works);
  - `colwood.civicweb.net` and `metchosin.civicweb.net`;
  - `env.gov.bc.ca`, `canada.ca` and news sites.
- **Sooke pages** were read through `sooke-012-ca.govstack.com`, the District's own Govstack host, which serves the same site. The `sourceUrl`s keep the public `www.sooke.ca` path, and each note says so.

## Counts (municipal facts; shared regional facts are counted separately)
| Municipality | confirmed | corrected | added | unverified |
|---|---|---|---|---|
| Sidney | 5 | 3 | 9 | 0 |
| Langford | 2 | 5 | 9 | 0 |
| Colwood | 1 | 7 | 7 | 1 |
| Sooke | 0 | 4 | 8 | 3 |
| Highlands | 0 | 0 | 0 | 8 (host blocked) |
| Metchosin | 2 | 4 | 6 | 1 |

These five **regional facts are in every V2 file**, with the same id and the same text, and are all reviewed:

| id | Status | What changed or was found |
|---|---|---|
| `regional-crd-stage1-watering` | corrected | Added the automatic-irrigation window, the garden-bed rules and the bylaw number. |
| `regional-crd-water-systems` | new | The Juan de Fuca system serves Colwood, Langford, Metchosin, View Royal, Sooke and *parts of* Highlands; the Saanich Peninsula system serves Sidney. |
| `regional-crd-invasive-disposal` | new | Confirms the CRD invasive note already used in `content/areas/*.json`. |
| `regional-bc-rapr` | corrected | The source is now the provincial brochure (for the 30 m figure). Applies across the CRD except Victoria and Esquimalt; amendments take effect 1 January 2027. |
| `regional-bc-wildlife-act-nests` | corrected | The old URL is 404. The new source is a BC Timber Sales sheet quoting section 34. |

**Id mismatch:** the R1a files use `crd-watering-stage1` and the R1b/V2 files use `regional-crd-stage1-watering`. The integrator should merge them into one shared block.

## Corrections content writers MUST apply
1. **Colwood thresholds:** the R1b fact "trees 30 cm or more are protected" was wrong. The correct thresholds are:
   - 2 m tall or 4 cm in diameter for arbutus, Garry oak, Pacific dogwood and Pacific yew;
   - 30 cm in diameter only for Douglas-fir, grand fir, bigleaf maple and western redcedar;
   - over 60 cm for any other tree.

   The fact is now `colwood-protected-trees`. `content/areas/colwood.json` already matches it.
2. **Colwood OCP DPA text is DRAFT:**
   - "Slopes over 30% must be avoided" is **not** in the Hillside PDF, so it was removed.
   - The Garry oak "dominate drier areas" line was not found, so `colwood-garry-oak` is unverified. Do not use it.
   - The shoreline DPA text (30 m buffer, 100 m lagoon sanctuary) comes from a DRAFT-watermarked PDF, and Amendment No. 10 (February 2025) rewrote the riparian guidelines. Publish it only with "check with the City".
3. **Sooke has 9 DPAs, not 10:** adopted OCP Bylaw 800 (8 December 2025), Part 7.
   - There is no wildfire DPA.
   - Yard and garden work in an existing landscaped area is exempt.
   - Invasive removal by low-disturbance methods is exempt if native plants go back in right away.
4. **Sooke burning:**
   - The season is November 1 to April 30, with venting rated Good.
   - The FAQ for Bylaw 292 says yard-waste burning and land clearing need a Sooke Fire Rescue permit, with a 15 m setback.
   - The page's opening text and its FAQ disagree on permits, so say "contact Sooke Fire Rescue".
5. **Sooke tree bylaw:** still **unverified**.
   - The District's bylaw pages read this session list no tree page, but the full bylaw search is scripted and was not run.
   - Keep "check with the District". Never say "Sooke has no tree bylaw".
6. **Langford threshold confirmed at 20 cm DBH** under Bylaw 2269, from the November 2024 FAQ linked on the current page. Other points:
   - Pruning needs no permit if it follows best practice (no more than 25% of live foliage).
   - The riparian DPA is 45 m, with a 30 m usual setback.
   - The tree page still mentions "Bylaw No. 2206" and links "2179". Those are stale; use 2269.
7. **Langford burning** is now from an official source: lots of 0.5 acre or more, permit required, **November 1-30 and March 15-April 15**, no long weekends.
8. **Langford construction hours** (Bylaw 2255 counts landscaping and grading as construction):
   - Monday to Friday 7 am-7 pm;
   - Saturday 9 am-5 pm;
   - no Sunday or holiday work without a Noise Permit.
9. **Metchosin burning** is limited to **three** consecutive days (not two). Other points:
   - The season is October 1 to May 31.
   - Backyard piles must be 20 m from structures and 10 m from trees, fences and shrubs.
   - When fetched, the page showed backyard burning as "CLOSED", so content must say "check current status".
10. **Metchosin DPAs:** there are 4, with Centre Mountain Resort added. They are triggered by subdivision or building work, not by landscaping alone.
11. **Metchosin wells:** "Aquifer 606" was dropped. The OCP (s.14.2.2) says parts of the District rely on vulnerable aquifers within a high-to-extreme interface fire hazard regime.
12. **Sidney:**
    - Pruning without a permit is limited to 20% of the crown per season.
    - Branches over 5 cm (2.5 cm for arbutus, Pacific dogwood and Garry oak) need a permit.
    - Tree work must be done by a certified arborist hired by the applicant.
    - The per-tree amount is both a refundable 2-year deposit and the fee in lieu.
13. **No $ amounts:** Sidney, Langford, Colwood and Metchosin sources all list fees, deposits or fines. No figures are in the fact `text`, and none may be published.
14. **Highlands:** every fact is unverified, including the thresholds in `content/areas/highlands.json` (Douglas-fir over 60 cm, any tree over 80 cm). `www.highlands.ca` has to be allowed on the network before the Highlands page is published with any `reviewedOn` date.

## Per municipality: what was confirmed and what was found
### Sidney
**Sources fetched:**
- `/services/trees/tree-preservation-bylaw/`
- `/services/trees/tree-removal-and-pruning-permits/`
- `2138-Tree-Preservation-Bylaw.pdf`
- `Tree-Permit-Application.pdf` (the old `2025_REV.pdf` is 404)
- the ESA DPA page
- `1738-Boulevard-Maintenance-Bylaw.pdf` (on www)
- Fire Services (`?p=2028` redirects there)
- Yard & Garden Waste (`?p=1994` redirects there)
- Bylaw 2259
- Water, Sea Level Rise and Wildfire Resiliency

**Gaps closed:**
- the species list and size thresholds;
- the CRD watering rules apply in Sidney;
- salt and wave exposure (the 30 m wave-effect zone).

**Still open:**
- deer;
- the Shoal Harbour sanctuary (canada.ca blocked).

### Langford
**Sources fetched:**
- Tree Removal page
- `2024/11/Tree-Bylaw-FAQs.pdf`
- Environmental & Hazard DPA Guidelines (June 2026)
- Community Standards Bylaw 2255
- Bylaw 1000 consolidated to 2024-05-09 (the 2023 URL is 404)
- Zoning Bylaw 300 s.3.21
- Advisories list
- Fire Rescue page

**Notes:**
- The 2269 bylaw PDF is an image-only scan, so it could not be read.
- Blasting: the "rock close to surface" inference was removed. The fact now cites the live Blasting advisories (Walfred, Treanor, Westhills).

### Colwood
**Sources fetched:**
- Tree Permits (`node/5090` redirects there; the 2017 PDF also redirects there)
- Bylaw 1735 page and rack card
- OCP sections 20, 21 and 22 (DRAFT)
- Fire (`node/140` is "Access Denied")
- Pesticides, Boulevards, Invasive Species, FireSmart, Blasting & Dust Control
- Neighbourhoods (`node/6830` is 404)
- the February 2025 DPA hearing notice
- CRD Esquimalt Lagoon page

**Not reached:**
- the consolidated OCP Part D (colwood.civicweb.net blocked);
- canada.ca.

### Sooke
**Sources fetched (via the Govstack host):**
- Burning Regulations
- Urban Forest & Tree Care
- Invasive Species
- Coexisting with Wildlife
- Securing Attractants (Bylaw 392)
- OCP page and Part 7 PDF
- Bylaws page
- Whiffin Spit bulletin (16 November 2026)

**Replaced as sources:**
- the Island Social Trends, CTV and Wikipedia sources were replaced with official pages;
- the Times Colonist (broom) and Sooke News Mirror (water extension, tree bylaw) items stay unverified and secondary.

### Highlands
- No page could be fetched, so all 8 local facts stay `reviewedOn: null`.
- `highlands-wells-aquifer` was reworded to match the CRD's "parts of Highlands".

### Metchosin
**Sources fetched:**
- Tree Cutting Permits (`node/485`)
- Protected Trees (`node/521`)
- Burning Regulations (`node/448` is 404)
- Development Permits (`node/498`)
- OCP Bylaw 258, consolidated March 2026 (newer than the April 2025 copy)
- EASC agenda (November 2024)
- Agricultural Area Plan
- FireSmart, Invasive Species, Wildlife Resources

**Not reached:**
- the Tree Management Bylaw and its FAQ (metchosin.civicweb.net blocked), so the "10 trees per acre" fact stays unverified.
