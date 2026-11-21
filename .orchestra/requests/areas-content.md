# Requests and hand-offs from areas-content (W1)

Branch `w1/areas-content` (fix round 1 on `w1/areas-content--fix1`), based on seed `064d569`. Files written: `content/areas/*.json` (13), `content/regional.json`, `content/pages/areas.json` and this file.

## 1. Facts still without a review date (for `.orchestra/carry.json`)
On 2026-11-21 this lane tried every research fact whose `reviewedOn` was null. Municipal, CRD and most gov.bc.ca hosts are reachable by curl from this session, and every fact on them already had a review date from R1 or V1–V3. The null facts sit almost entirely on hosts that are refused: `hat.bc.ca`, `www.sookenewsmirror.com`, `forums.botanicalgarden.ubc.ca`, `www.env.gov.bc.ca`, `bcrfc.env.gov.bc.ca`, `metchosin.civicweb.net` and the news sites listed below (WebFetch cannot resolve them either). The one exception is `colwood-garry-oak`: `www.colwood.ca` is reachable, but the PDF does not contain its excerpt. So no review date was added, and all 11 research facts stay `reviewedOn: null`.

Fix round 1 added one new condition, `esquimalt` `es-dpa1-exposure`. It is taken from the official DPA No. 1 guideline PDF (guideline 3, wind exposure and sea spray tolerance). The PDF was fetched by curl on 2026-11-21 and the excerpt is on it, so it has `reviewedOn: 2026-11-21`.

**Carried into content (4).** Each keeps `verify: true` and `reviewedOn: null`, so it renders "Review date to confirm":

| Area | Fact id | Source host | Why it is carried |
|---|---|---|---|
| victoria | `vic-salt-spray` | forums.botanicalgarden.ubc.ca (refused) | Victoria's only R1 condition, and the weakest swap-test block in the set. It is reworded as one gardener's report, limited to the search-snippet excerpt (no detail about where the gardener lives), and the street names are dropped. **Needs a primary source before launch: W2 or a fix lane should ask for network access to this host, or find an official Victoria source on shoreline exposure.** |
| central-saanich | `cs-aquifers` | www.env.gov.bc.ca (refused) | Reworded to match the excerpt only (peninsula aquifers are a significant source of water for farm irrigation). It no longer infers that farm-edge lots water from wells. The Hagan and Keating aquifer names are dropped. |
| sooke | `sooke-tree-bylaw-status` | www.sookenewsmirror.com (refused) | A status note for Sooke's tree rules, telling readers to check with the District. It never says that no bylaw exists. |
| sooke | `sooke-water-edges` | www.sookenewsmirror.com (refused) | Covers wells versus regional water in Sooke, framed as "reported". |

**Left out of content (7).** All of these are null and secondary or unverifiable:

| Area | Fact id | Reason |
|---|---|---|
| colwood | `colwood-garry-oak` | The excerpt is not in the PDF. This was re-fetched by curl today and is still absent. |
| oak-bay | `ob-gas-equipment-phaseout` | Only a news source (CTV) supports it. Publishing it risks implying that a ban is, or is not, in force. |
| central-saanich | `cs-deer-pilot` | Old news item (Times Colonist) that was never opened. |
| metchosin | `metchosin-10-per-acre` | Undated news item. The bylaw itself (metchosin.civicweb.net) was never read. |
| north-saanich | `ns-groundwater-levels` | bcrfc.env.gov.bc.ca was refused. The figure is a time-varying reading and must not be quoted. |
| sooke | `sooke-scotch-broom` | The 1851 claim is secondary. `sooke-priority-invasives` already covers broom. |
| esquimalt | `es-garry-oak-remnant` | Fix round 1: replaced by `es-dpa1-exposure` (official, reviewed 2026-11-21), as V1 suggested. The land-trust page (hat.bc.ca, refused) was never opened. It can come back once the page is fetched. |

To review these facts later, the network must allow: `www.env.gov.bc.ca`, `bcrfc.env.gov.bc.ca`, `hat.bc.ca`, `forums.botanicalgarden.ubc.ca`, `www.timescolonist.com`, `www.goldstreamgazette.com`, `vancouverisland.ctvnews.ca`, `www.sookenewsmirror.com`, `www.pressreader.com` and `metchosin.civicweb.net`.

## 2. Regional block ids (content stream and integrator)
`content/regional.json` holds one block per CRD-wide or provincial rule. The research ids from both verification lanes are merged into these blocks:

| content id | research ids merged | appliesTo |
|---|---|---|
| `crd-watering` | `regional-crd-stage1-watering`, `crd-watering-stage1` | all |
| `crd-water-systems` | `regional-crd-water-systems` | the 9 municipalities the CRD page names |
| `crd-invasives` | `regional-crd-invasive-disposal`, `crd-invasive-disposal` | all |
| `bc-riparian` | `regional-bc-rapr` | all except victoria and esquimalt |
| `bc-bird-nests` | `regional-bc-wildlife-act-nests` | all |
| `bc-private-wells` | `regional-bc-private-well-drought`, `prov-private-well-drought` | saanich, sooke, central-saanich, north-saanich, highlands, metchosin |

- **content** (services `localRulesRefs`): please use these ids. CONTRACT §6 already gives `crd-watering` and `crd-invasives` as its examples.
- **ia** (`check-content#schema-v3`, regional schema): blocks use only the CONTRACT §6 fields.

## 3. For ia: check-content and schemas (W1)
- Area files use the CONTRACT §6 v3 shape plus the deprecated `intro[]`, `localNotes[]`, `featuredProject` and `image`. No research-only fields are carried over (`unique`, `status`, `note`).
- `localRules[].topic` ∈ trees | watering | wells | burning | invasives | other. `conditions[].kind` ∈ soils | exposure | deer | salt-spray | water-supply | wells | lot-types | other.
- `proof[]`: each area has 1–2 `{kind:"project"}` refs, every one to a project in that municipality, plus exactly one `{kind:"job-note", service, text, sample:true}`.
- `excerpt` is verbatim from the source. Two excerpts differ from R1's text, but each is a sentence the verification lane recorded verbatim from the same source in its note:
  - `langford-tree-replacement`: the Victoria info sheet has the identical sentence, so a second Langford sentence keeps excerpts unique across area files.
  - `langford-construction-hours`: the original ended the same way as North Saanich's noise excerpt.
  - `sooke-municipal-trees-policy`: chosen to avoid quoting fee wording.
- **Display text** (`text` only, never `excerpt`) writes "Bylaw 4742" rather than "Bylaw No. 4742", and "9 am" rather than "9 a.m.". That way a naive sentence splitter cannot cut rules into shared fragments such as "Tree Protection Bylaw No.".
- **`sourceTitle` is carried over from research verbatim** (fix round 1), so it keeps the documents' own titles, e.g. "Tree Protection Bylaw No. 4742, 2020, ...". Request to ia: `check-content#area-unique-sentences` should scan only the CONTRACT prose fields (summary, localRules/conditions `text`, proof `text`, servicesBlurb, intro, localNotes `text`) and leave out the source labels (`sourceTitle`, `sourceUrl`, `excerpt`). Several rules from one municipality cite the same document, so the same label appears many times by design.
- Local pre-check run on this branch (re-run in fix round 1): no sentence is shared by two area files across summary, localRules, conditions, proof, servicesBlurb, intro, localNotes and seo. This holds with a smart splitter and with a naive one that splits on `[.!?]` and a space. Nothing is shared under name masking either (78 pairs), and no area sentence appears in `regional.json`. Fix round 1 also reworded the closest cross-area paraphrases (Oak Bay and Saanich pesticide bylaws; Colwood, Saanich and Victoria native-species thresholds; Colwood and Victoria pruning; Colwood and Saanich bylaw scope) and dropped the templated `intro[2]` service-and-quote sentence from all 13 files. The legacy page already links every service in its "Services in ..." list and has a free-quote CTA band, so `intro` now holds two paragraphs: the hero lede and one body paragraph.

## 4. For t-areas (W3) and seo
- Render `reviewedOn: null` as "Review date to confirm", and show `sourceType: "secondary"` sources as such.
- `topServices` is chosen from local conditions and the sample projects. It is **not** RNC booking data. Label it something like "Often needed here", never "most requested".
- Job notes must show the visible "Sample" label.
- The sharedRegional blocks render once inside `<aside data-shared="regional">`.
- Some texts name municipal phone numbers and emails (e.g. treepermits@victoria.ca, 250-642-1634). These are the municipalities' contacts, not RNC tokens.
- Two `propertyTypes` were made unique (Saanich, Sidney), because the legacy page renders them as list items.
- **Hub copy hand-off.** The `/areas/` lede and "Local rules differ" section were softened in fix round 1 so they are true on the legacy template, which renders only `intro`, `servicesBlurb` and `localNotes` (with source links). When t-areas renders `reviewedOn`, `conditions`, `proof` and the `[data-shared]` regional aside, the hub copy can say so again. Suggested lede then: "Each area page lists the local rules that affect yard and tree work, with a link to the source and the date it was last reviewed, along with local site conditions and sample projects." Rules section: "those are summarised once, with their sources, on each area page they apply to." areas-content (W2) or t-areas (W3) should make that change in the wave that ships the template.

## 5. Caveats to re-check at publish time (time-bound or flagged by V1–V3)
- **View Royal:** the tree size is still in conflict. The consolidated bylaw says 20 cm; the Town's pages say 30 cm. The copy says to confirm with the Town.
- **Highlands:** the only bylaw copy online is a 2001 consolidation. The copy says to confirm thresholds and lot-line buffers with the District.
- **Colwood:** the DPA text comes from DRAFT-marked PDFs and was amended in 2025. The copy says to check with the City.
- **Time-bound items:**
  - the Oak Bay deer treatment window (fall 2026, written in the past tense);
  - the Central Saanich burning season (October 16, 2026 to May 15, 2027);
  - the North Saanich burning calendar (opened November 5, 2026);
  - Sooke yard-waste dates (May, and Saturdays in October 2026);
  - the Highlands Broom Bash (Saturdays in May);
  - Langford blasting notices (as listed in November 2026);
  - Metchosin's posted burning status and its wildlife sightings.
- **Certifications:** Sidney, View Royal and Central Saanich rules mention certified or ISA arborists. The copy only states the rule and never implies that RNC holds a certification (`[CERTIFICATIONS]` is unresolved).

## 6. Links
The area files and the hub contain no `/quote/` or `/portfolio/` links. Since fix round 1 the area files contain no inline Markdown links at all. The hub links only to `/free-quote/`, `/contact/`, `/services/` and `/projects/`, so the integrator's codemod has nothing to change in these files.
