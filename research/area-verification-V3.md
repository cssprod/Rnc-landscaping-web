# Area source verification: V3 (North Saanich, Highlands, Sooke re-check)

Verified on 2026-11-21. Machine-readable results are in `research/area-facts/<slug>.json`; each fact's `note` starts with "V3" and says what changed.

V3 re-ran the V1/V2 method for the hosts that were blocked earlier:
- `www.northsaanich.ca`: V1 could not open any North Saanich page.
- `www.highlands.ca`: V2 could not open any Highlands page.
- `www.sooke.ca`: re-checked only for the Sooke facts V2 left unverified.

## Method
- **Fetching.** Every `sourceUrl` was fetched live with `curl -sSL --max-time 20`, following redirects. HTML was converted to text. PDFs were saved to the session's `sources/` folder and read with `pdftotext`, both with and without `-layout`.
- **Excerpt check.** Each excerpt was checked by script against the fetched text. Whitespace, quote style and the space that HTML links leave before punctuation were normalised; nothing else was changed.
  - All 52 excerpts V3 reviewed passed: North Saanich 19, Highlands 19 and Sooke 14. The Sooke excerpts are 2 new facts, 7 pages re-opened on www.sooke.ca and 5 facts on the re-fetched OCP Part 7 PDF. No excerpt is longer than 30 words.
  - Quotes in the notes were checked against their stated source documents in a second pass.
- **Statuses.**
  - `confirmed`: the original claim held. The excerpt may have been re-cut so that it is verbatim.
  - `corrected`: the text's substance, or its source document, changed.
  - `added`: a new fact.
  - `unverified`: could not be checked. `reviewedOn` stays null and the reason is in `note`.
- **Fields.** Every fact now has `status`, `sourceType` and `unique` (`false` for the shared regional facts). The `sourceUrl`s are the canonical URLs that the old links redirect to, and the old URL is named in `note`.
- **Shared regional facts were not re-checked.** V1 (North Saanich) and V2 (Highlands, Sooke) verified them on the same day. Their `note` says so.
- **No dollar amounts** appear in any `text`, `excerpt` or `note`. North Saanich lists permit fees, deposits and fines; Highlands lists DP and tree-permit fees. None were used.
- **No fact claims that a bylaw does not exist.**

## Hosts
| Host | Result |
|---|---|
| `www.northsaanich.ca`, `www.highlands.ca`, `www.sooke.ca` | All reachable. Every fact on them was opened. |
| `bcrfc.env.gov.bc.ca` | Still refused (CONNECT 403, retried after 30 s), so `ns-groundwater-levels` stays unverified. |
| `www.sookenewsmirror.com`, `www.pressreader.com` | Still refused, so the 3 secondary Sooke facts stay unverified. |
| `www.sooke.ca/umbraco/...` (the bylaw search endpoint) | **Not queried.** The site's `robots.txt` disallows `/umbraco/`, and the session's permission check blocked the scripted POST. The public `sitemap.xml` was read instead. |

## Counts (municipal facts; shared regional facts are listed separately)
| Municipality | confirmed | corrected | added | unverified | total |
|---|---|---|---|---|---|
| North Saanich | 4 | 3 | 12 | 1 | 20 |
| Highlands | 4 | 4 | 11 | 0 | 19 |
| Sooke (V3 scope) | 0 | 0 (1 text trimmed) | 2 | 3 (re-checked, still unverified) | 5 touched |
| Sooke (whole file after V3) | 0 | 4 | 10 | 3 | 17 |

Before V3:
- North Saanich had 3 of 11 facts reviewed, all of them regional or provincial (V1). Now 22 of 23 are reviewed, regional facts included.
- Highlands had 5 of 13 reviewed, all of them regional (V2). Now all 24 are reviewed.

Shared regional facts, carried over unchanged:
- North Saanich keeps the V1 ids: `prov-private-well-drought`, `crd-watering-stage1` and `crd-invasive-disposal`.
- Highlands and Sooke keep the five V2 `regional-*` ids.
- The V1/V2 id mismatch is unchanged. The integrator should still merge `crd-watering-stage1` with `regional-crd-stage1-watering`, and `crd-invasive-disposal` with `regional-crd-invasive-disposal`.

## Corrections content writers MUST apply
1. **North Saanich: the 10 cm DPA rule is now VERIFIED.** This lifts V1 correction #3. The trees page lists as regulated any "Tree with a D.B.H. of 10 cm or greater growing in an environmental or steep slope Development Permit Area (DPA)". The `research/areas.json` claim may be published with `reviewedOn: 2026-11-21`, sourced to `https://www.northsaanich.ca/lands-planning/trees`. Everything in the North Saanich tree note in `content/areas/north-saanich.json` checks out on the live pages:
   - the 20 cm threshold;
   - arbutus, Garry oak, Pacific dogwood, yew and shore pine protected from 10 cm;
   - topping prohibited;
   - best-practice pruning needs no permit;
   - 2-3 weeks of review;
   - the permit posted 48 hours before work.
2. **North Saanich: pruning limits.** "Best-practice pruning needs no permit" is true. Do not imply that any pruning is permit-free: Bylaw 1548 counts the following as "Damage", which needs a permit:
   - removing more than 25% of the live crown in 12 months;
   - lift pruning that leaves the live crown below 50% of the tree's height;
   - topping.

   Hedges are not regulated.
3. **North Saanich: there are five DPAs, not three.** DPA 2 (Creeks, Wetlands, Riparian Areas and Significant Water Resources) and DPA 5 (Commercial, Industrial and Multi-Family) were missing. Routine maintenance of existing lawns, landscaped areas and paths is exempt in DPAs 2-4. Redeveloping patios, decks or non-native landscaped areas is not exempt.
4. **North Saanich: burning and green waste (new, time-bound).**
   - Every outdoor fire needs a Fire Department permit, and burning is allowed only on calendar days. The 2026-2027 season opened on 5 November 2026.
   - There is **no burning in Dean Park**.
   - Leaves, green grass and weeds may not be burned.
   - At the Green Waste Facility, **contractors must bring proof that the load came from a North Saanich property**, such as a letter from the owner.
5. **North Saanich: noise.** Bylaw 1383 allows machine or engine noise that disturbs neighbours only Monday to Friday, 7 a.m. to 7 p.m. (not on statutory holidays), and Saturday, 8 a.m. to 4 p.m. It lists no Sunday hours.
6. **North Saanich: source URLs.** The old `northsaanich.ca/...` WordPress paths and `node/` links redirect, and the facts now use the canonical URLs. `content/areas/north-saanich.json` cites `https://www.northsaanich.ca/node/51`, which still resolves, but `https://www.northsaanich.ca/lands-planning/trees` is preferred.
7. **North Saanich: pesticides.** Still say "check with the District". The bylaw list returned nothing for "pesticide", which is **not** proof that no bylaw exists.
8. **Highlands: the thresholds are now VERIFIED** (Douglas-fir over 60 cm, any tree over 80 cm). This lifts V2 correction #14 for the Highlands tree note, which may now carry `reviewedOn: 2026-11-21`.
   - A "significant tree" is a **specific tree listed in Schedule A of the bylaw**, not a size class. Do not write "large trees are significant trees".
   - The only bylaw PDF online is an office consolidation to 15 October 2001, so add "confirm with the District".
9. **Highlands: do not state the lot-line buffers as settled.** As consolidated, the bylaw needs a permit to cut any tree within 20 m of a lot line along a road, trail or right-of-way, or within 10 m of any other lot line. The District's tree page does not mention this. Write "check with the District before cutting near a property line".
10. **Highlands: the 30 m riparian rule.**
    - Earthworks or tree removal within 30 m of **any** watercourse or water body needs a QEP and a DPA 2 permit.
    - **A fence or other structure within 30 m needs a development variance permit** (Zoning Bylaw s.3.3).
    - The bylaw's own tree setbacks are 30 m from Millstream Creek and the named lakes, and 15 m elsewhere. Use 30 m for planning.
11. **Highlands: corrections to the old facts.**
    - The iron-wells fact no longer claims that iron stains paving, siding or plants. The District says the minerals stain plumbing, dishes and laundry.
    - Testing is yearly for coliform bacteria and every few years for metals, not "yearly for iron".
    - The "2009 Community Wildfire Protection Plan" is not on the current page; it now lists a Community Wildfire Resiliency Plan.
    - The fire bylaw is **No. 474 (2025)**, which repealed No. 264. Fires larger than a campfire need a "Good" venting index. A fire over 0.5 cubic metres must be at least 6 m from buildings and property lines.
12. **Highlands: steep slopes.** The bylaw needs a permit to cut **more than 2 trees a year** on a steep slope (over 30% across 6 m). The District's web page says "any tree located near ... steep slope area". Use the page's wording, or "check first". Do not say every tree on a slope needs a permit.
13. **Sooke tree bylaw: still UNVERIFIED.** The sitemap lists 78 bylaw pages and none is a tree bylaw. The only tree document is Policy 11.6 (2005, municipal boulevards, parks and trails). This is **not** evidence that no bylaw exists. Keep "check with the District (250-642-1634)" and never write "Sooke has no tree bylaw".
14. **Sooke yard-waste drop-off: commercial loads and invasive plants are NOT accepted.**
    - The drop-off is for residents only, so RNC cannot use it.
    - Do not tell readers that broom or other invasives can go there; use the CRD Hartland rule.
    - The old "annual broom drop-off" claim was removed from `sooke-scotch-broom`.
15. **Time-bound items to re-check at publish time:**
    - the North Saanich burning calendar;
    - the Highlands Broom Bash (Saturdays in May);
    - the Sooke yard-waste dates (May, plus Saturdays in October in 2026);
    - the Highlands bear sightings list.

## Per municipality

### North Saanich
**Sources fetched (www.northsaanich.ca):**
- Trees page; Residential Tree Permit Guide (Nov 2024); Tree Protection Bylaw No. 1548 (2022)
- Development Permits page; OCP Bylaw No. 1587 (April 2025), s.5.10
- Agriculture & Environment page; Water Conservation page; Water, Sewer & Drainage page; Pesticide Use page
- Burning in North Saanich; Burning Regulations (Sept 2024); 2026-2027 burning and green-waste calendar; Green Waste page
- Noise Bylaw No. 1383 (2015), found through the Bylaws & Policies search
- FireSmart Wildfire Prevention; Wildlife & Invasive Species
- Two regional drought PDFs (not North Saanich-specific; not used)

**Confirmed:**
- ns-tree-bylaw-1548: adopted October 3, 2022; repeals No. 935 (1999).
- ns-tree-20cm.
- ns-alr-rural: nearly 35% ALR; OCP goal 3.3.1.
- ns-pesticide-policy.

**Corrected:**
- ns-tree-topping: the guide does not say this; the source is now the trees page FAQ, with the s.5 emergency rule added.
- ns-dpas: there are five DPAs, and the old excerpt was not on the page.
- ns-water-supply: the supply and mains claim is now sourced to the Water, Sewer & Drainage page.

**Added:**
- ns-tree-protected-10cm, ns-tree-process, ns-tree-pruning-damage, ns-tree-alr-exemption
- ns-dpa-extent (15 m foreshore; slopes over 30% across 6 m plus 10 m), ns-dpa-maintenance-exempt
- ns-burning-season, ns-burning-rules, ns-green-waste
- ns-noise-hours, ns-firesmart, ns-wildlife-invasives

**Unverified:** ns-groundwater-levels (bcrfc host refused).

**Gaps closed:** the 10 cm DPA rule, burning, wildfire interface.

**Still open:** the well vs. municipal parcel map; deer, which the wildlife page does not mention.

### Highlands
**Sources fetched (www.highlands.ca):**
- Tree Management page; Tree Management Bylaw No. 10 (consolidation to 2001); Tree Cutting Permit form (2025)
- Development Permit Areas page; DP application form (Jan 2024); OCP Bylaw 277 consolidated (Chapter 11); Riparian Area Regulations page
- Groundwater & Well Information page; Groundwater Protection Work Plan; Caring for Your Well (2024); Taking Care of Our Water Supply (2017); 2018 and 2025 groundwater monitoring reports
- Burning Permits; Wood and Backyard Burning; Dec 9, 2025 burning notice; Fire Control and Protection Bylaw No. 474 (2025)
- FireSmart Program; Invasive Species; Wildlife Sightings and Information

**Confirmed:**
- highlands-tree-bylaw-10: the excerpt was re-cut to be verbatim.
- highlands-protected-species: thresholds included.
- highlands-wells-aquifer.
- highlands-burning-permits: the Bylaw 264 vs 474 question is resolved as 474.

**Corrected:**
- highlands-dpas: the old source was the application form; there are six DPAs.
- highlands-iron-wells: new source, the staining inference removed, testing intervals fixed.
- highlands-firesmart-wui: the 2009 CWPP removed, excerpt fixed.
- highlands-wells-proof: the 2025 report replaces the 2018 one, excerpt fixed.

**Added:**
- highlands-tree-cutdown-def, highlands-tree-water-setbacks, highlands-tree-slopes-buffers, highlands-dead-trees
- highlands-riparian-30m
- highlands-groundwater-seasonal, highlands-water-conservation-advice
- highlands-burning-distances
- highlands-firesmart-zones, highlands-broom-bash, highlands-wildlife-attractants

**Still open:**
- whether the bylaw has amendments after 2001;
- the Schedule A significant-tree list (not reviewed);
- soils;
- deer guidance;
- the fire-bylaw adoption date: 8 December 2025 in the PDF, December 9, 2025 on the web page.

### Sooke (re-check of the facts V2 left unverified because www.sooke.ca was blocked)
**Sources fetched (www.sooke.ca):**
- Bylaws page, Browse and Search Bylaws page, `robots.txt`, `sitemap.xml` (744 URLs)
- Trees On Municipal Property Policy No. 11.6 (2005)
- Urban Forest and Tree Care
- Yard-waste bulletins of 3 September and 30 October 2026
- Each V2 page that had been read through the Govstack host: Burning Regulations, Invasive Species, Coexisting with Wildlife, Securing Attractants, Whiffin Spit bulletin, OCP page. All re-opened and all excerpts match; their status is unchanged, with a "V3: re-opened on www.sooke.ca" note.

**Re-checked, still unverified:**
- sooke-tree-bylaw-status: no tree bylaw page in the sitemap; the scripted search was not queried. Never treat this as "no bylaw".
- sooke-scotch-broom: the 1851 claim is secondary; the drop-off clause was removed because it is contradicted for 2026.
- sooke-water-edges: no District page on the Otter Point extension.

**Added:**
- sooke-municipal-trees-policy (Policy 11.6)
- sooke-yard-waste-dropoff: no commercial loads, no invasives

**Leads, not added (outside V3 scope):** Soil Removal and Deposit Bylaw No. 860 (2022) and Noise Control Bylaw No. 485 are listed on www.sooke.ca and are relevant to landscaping work.
