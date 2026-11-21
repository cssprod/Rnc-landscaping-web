# Requests and hand-offs from areas-content (W1)

Branch `w1/areas-content`, based on seed `064d569`. Files written: `content/areas/*.json` (13), `content/regional.json`, `content/pages/areas.json` and this file.

## 1. Facts still without a review date (for `.orchestra/carry.json`)
On 2026-11-21 this lane tried every research fact whose `reviewedOn` was null. WebFetch could not resolve any of the hosts. Curl reached only `www.colwood.ca`, and that PDF still does not contain its excerpt. So no review date was added, and all 11 facts stay `reviewedOn: null`.

**Carried into content.** Each keeps `verify: true` and `reviewedOn: null`, so it renders "Review date to confirm":

| Area | Fact id | Source host | Why it is carried |
|---|---|---|---|
| victoria | `vic-salt-spray` | forums.botanicalgarden.ubc.ca (refused) | Victoria's only R1 condition. It is reworded as one gardener's report and the street names are dropped. **Needs a primary source before launch.** |
| esquimalt | `es-garry-oak-remnant` | hat.bc.ca (refused) | Esquimalt's only R1 condition. The land trust is named as the source. **Needs a primary source before launch.** |
| central-saanich | `cs-aquifers` | www.env.gov.bc.ca (refused) | Reworded to match the excerpt only (peninsula aquifers matter for farm irrigation). The Hagan and Keating aquifer names are dropped. |
| sooke | `sooke-tree-bylaw-status` | www.sookenewsmirror.com (refused) | A status note for Sooke's tree rules, telling readers to check with the District. It never says that no bylaw exists. |
| sooke | `sooke-water-edges` | www.sookenewsmirror.com (refused) | Covers wells versus regional water in Sooke, framed as "reported". |

**Left out of content.** All of these are null and secondary or unverifiable:

| Area | Fact id | Reason |
|---|---|---|
| colwood | `colwood-garry-oak` | The excerpt is not in the PDF. This was re-fetched by curl today and is still absent. |
| oak-bay | `ob-gas-equipment-phaseout` | Only a news source (CTV) supports it. Publishing it risks implying that a ban is, or is not, in force. |
| central-saanich | `cs-deer-pilot` | Old news item (Times Colonist) that was never opened. |
| metchosin | `metchosin-10-per-acre` | Undated news item. The bylaw itself (metchosin.civicweb.net) was never read. |
| north-saanich | `ns-groundwater-levels` | bcrfc.env.gov.bc.ca was refused. The figure is a time-varying reading and must not be quoted. |
| sooke | `sooke-scotch-broom` | The 1851 claim is secondary. `sooke-priority-invasives` already covers broom. |

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
- **Display text** (`text`, `sourceTitle`, never `excerpt`) writes "Bylaw 4742" rather than "Bylaw No. 4742", and "9 am" rather than "9 a.m.". That way a naive sentence splitter cannot cut rules into shared fragments such as "Tree Protection Bylaw No.".
- Local pre-check run on this branch: no sentence is shared by two area files across summary, localRules, conditions, proof, servicesBlurb, intro, localNotes and seo. This holds with a smart splitter and with a naive one that splits on `[.!?]` and a space. Nothing is shared under name masking either (78 pairs), and no area sentence appears in `regional.json`.

## 4. For t-areas (W3) and seo
- Render `reviewedOn: null` as "Review date to confirm", and show `sourceType: "secondary"` sources as such.
- `topServices` is chosen from local conditions and the sample projects. It is **not** RNC booking data. Label it something like "Often needed here", never "most requested".
- Job notes must show the visible "Sample" label.
- The sharedRegional blocks render once inside `<aside data-shared="regional">`.
- Some texts name municipal phone numbers and emails (e.g. treepermits@victoria.ca, 250-642-1634). These are the municipalities' contacts, not RNC tokens.
- Two `propertyTypes` were made unique (Saanich, Sidney), because the legacy page renders them as list items.

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
The area files and the hub contain no `/quote/` or `/portfolio/` links. New text links only to `/free-quote/`, `/projects/` and `/services/*`, so the integrator's codemod has nothing to change in these files.
