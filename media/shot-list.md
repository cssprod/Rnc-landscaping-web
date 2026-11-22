# RNC Landscaping: shot list and credits

Until RNC supplies its own photos, every image slot shows labelled living vector art (an "Illustration" chip) or, outside
`/projects/`, a credited stock placeholder. **No stock photo is ever used under `/projects/`** and no stock person stands
for the owner or crew (CONTRACT §2, §7): every project and portfolio slot, `about-crew`, `about-owner`, `home-hero` and
the three service heroes that pictured a person (`svc-grounds-maintenance-hero`, `svc-landscape-installation-hero`,
`svc-tree-vegetation-hero`) have `stock: null` and show their living scene. `area-central-saanich` also shows its living
scene, so all 13 area pages read alike. To replace a slot with RNC's own photo, follow `media/photos/README.md` (one
file per slot id plus a licence record, processed by `site/tools/process-images.mjs` to AVIF/WebP/JPEG with all metadata stripped).

## Living art until photos arrive
Slots with an `art` record in `media/images.json` render theme-reactive living art through `picture()` when no photo exists:
- `art.scene: "project:<slug>"`: per-project art (lit cottage, stone path, beds in the project's season, the service
  motif); `palette` names the season. Used by `proj-<service>-<n>` (each project's main image) and `proj-<slug>-art`.
- `art.scene: "area-<slug>"`: the municipality's landscape (a hero scene on the area page, an art well on cards).
- `art.scene: "svc-<slug>"`: the service nocturne (a hero scene on the service page) or vignette (detail, before and
  after slots; each slot seeds its own picture); `"home"`, `"process"`, `"cove"`
  for the home hero, the process header and the people slots (labelled "Photo to come"). `palette: "theme"` means the
  art follows the site theme (night by default, dawn in the light theme).

## Priority 1 (launch-critical)
1. about-owner: real portrait of [OWNER NAME] (required, no stock).
2. home-hero, about-crew: crew at work on a Greater Victoria lawn, faces not the focus.
3. Each service hero (svc-*-hero).
4. Before/after pairs from the same tripod spot for each service.

## Priority 2
- Service detail shots, project main images (proj-*), commercial-hero, home-commercial.

## Priority 3
- Area scenery (area-*), resource headers (res-*), quote-aside, og-default.

## grounds-maintenance
- **svc-grounds-maintenance-hero** (16:9): a landscaper mowing a residential lawn with a walk-behind mower, clean stripes
- **svc-grounds-maintenance-detail-1** (4:3): a worker string-trimming a lawn edge along a bed
- **svc-grounds-maintenance-detail-2** (4:3): a crew member shaping a hedge with a powered hedge trimmer
- **svc-grounds-maintenance-before** (4:3): an untidy residential lawn covered in fallen leaves and shaggy grass before a seasonal cleanup
- **svc-grounds-maintenance-after** (4:3): the same kind of lawn freshly mown, edged and cleared of leaves
- **proj-grounds-maintenance-1** (3:2): a neat front lawn and steps at a residential home
- **proj-grounds-maintenance-2** (3:2): a tall freshly clipped hedge beside a paved strata driveway
- **proj-grounds-maintenance-3** (3:2): a lush maintained hedge in front of a house
- **proj-grounds-maintenance-4** (3:2): a maintained lawn under mature trees in morning sun

## landscape-installation
- **svc-landscape-installation-hero** (16:9): a landscaper moving material with a wheelbarrow on a garden build
- **svc-landscape-installation-detail-1** (4:3): a new hardscape pathway through planted areas
- **svc-landscape-installation-detail-2** (4:3): a newly planted mixed perennial bed
- **svc-landscape-installation-before** (4:3): a bare unfinished residential yard with compacted soil and patchy weeds before a landscape build
- **svc-landscape-installation-after** (4:3): the same kind of yard after installation with planted beds and a path
- **proj-landscape-installation-1** (3:2): a finished garden path with layered planting
- **proj-landscape-installation-2** (3:2): an established installed garden with trees and shrubs
- **proj-landscape-installation-3** (3:2): an outdoor seating area on a new lawn
- **proj-landscape-installation-4** (3:2): a new lawn edged by trees and planting

## irrigation
- **svc-irrigation-hero** (16:9): pop-up sprinklers watering a residential lawn in low evening light
- **svc-irrigation-detail-1** (4:3): a close view of a sprinkler head spraying across turf
- **svc-irrigation-detail-2** (4:3): a spray head watering a planted bed
- **svc-irrigation-before** (4:3): a dry patchy lawn with brown spots from uneven sprinkler coverage before an irrigation tune-up
- **svc-irrigation-after** (4:3): the same kind of lawn green and evenly watered after an irrigation upgrade
- **proj-irrigation-1** (3:2): a sprinkler watering a home lawn
- **proj-irrigation-2** (3:2): drip irrigation line in a mulched bed of native plants
- **proj-irrigation-3** (3:2): a technician's hands programming an irrigation controller
- **proj-irrigation-4** (3:2): a technician winterizing an irrigation system with compressed air

## tree-vegetation
- **svc-tree-vegetation-hero** (16:9): an arborist in harness and helmet pruning a large conifer
- **svc-tree-vegetation-detail-1** (4:3): an arborist making a pruning cut
- **svc-tree-vegetation-detail-2** (4:3): a climber pruning branches high in a tree
- **svc-tree-vegetation-before** (4:3): a lot overgrown with invasive Himalayan blackberry and English ivy before clearing
- **svc-tree-vegetation-after** (4:3): the same lot after invasive removal, mulched with young native shrubs
- **proj-tree-vegetation-1** (3:2): a worker in high-visibility gear working on a tree
- **proj-tree-vegetation-2** (3:2): a climber in helmet resting on a branch
- **proj-tree-vegetation-3** (3:2): a crew member trimming branches from a ladder
- **proj-tree-vegetation-4** (3:2): a crew member with chainsaw and PPE ready for removal work

## Video clips (social media only: the website shows no video, CONTRACT §2)
- Grounds maintenance: slow push-in on mower stripes forming; trimmer edging along a bed; leaf blowing in autumn light.
- Landscape installation: pavers being set and tamped; plants lowered into a bed; time-lapse of a yard build.
- Irrigation: pop-up heads rising at dawn; drip emitter close-up; hands adjusting a controller.
- Tree and vegetation: climber ascending on rope (wide, safe distance); pruning cut in slow motion; cleared invasive area reveal.
- General: drone pass over a finished property (Transport Canada rules apply; verify before flying).

## Stock photo credits (placeholders in use outside /projects/)
- home-commercial: "Aerial view of a worker trimming a large sports field" by [Rémi Müller](https://unsplash.com/@remimullercha) on [Unsplash](https://unsplash.com/photos/aerial-photography-of-person-trimming-sports-field-during-day-LlHgaeBwYVE), Unsplash License (https://unsplash.com/license)
- commercial-hero: "Large well-kept lawn with shrubs and mature trees" by [Raelle Cameron](https://unsplash.com/@raegocreative) on [Unsplash](https://unsplash.com/photos/a-large-green-lawn-with-bushes-and-trees-JUNyb_cetns), Unsplash License (https://unsplash.com/license)
- quote-aside: "Wheelbarrow in a garden beside a small shed and flowering shrubs" by [Annie Spratt](https://unsplash.com/@anniespratt) on [Unsplash](https://unsplash.com/photos/wheelbarrow-in-garden-with-shed-ch_j5gH6INY), Unsplash License (https://unsplash.com/license)
- og-default: "Brick garden path lined with flowers and trees" by [Annie Tray-Gavin](https://unsplash.com/@annietraygavin) on [Unsplash](https://unsplash.com/photos/a-brick-path-with-a-garden-of-flowers-and-trees-aqqx2yrVB2M), Unsplash License (https://unsplash.com/license)
- svc-irrigation-hero: "Sprinklers watering a green lawn at sunset" by [Alef Morais](https://unsplash.com/@alef_visuals) on [Unsplash](https://unsplash.com/photos/sprinklers-watering-a-green-lawn-at-sunset-RjxqFCXpt2c), Unsplash License (https://unsplash.com/license)
- res-1: "Fresh green spring lawn" by [Petar Tonchev](https://unsplash.com/@ptonchev) on [Unsplash](https://unsplash.com/photos/green-grass-field-c-5-QE5kBYk), Unsplash License (https://unsplash.com/license)
- res-2: "Grass and leaves covered in water droplets" by [Lorenzo Maranci](https://unsplash.com/@lorenzo06x) on [Unsplash](https://unsplash.com/photos/a-field-with-grass-and-leaves-covered-in-rain-AI-OQtNS958), Unsplash License (https://unsplash.com/license)
- res-3: "Pile of fallen autumn leaves" by [Vasilina Sirotina](https://unsplash.com/@luniavis) on [Unsplash](https://unsplash.com/photos/a-pile-of-leaves-swSa-DbI-eo), Unsplash License (https://unsplash.com/license)
- res-4: "Person in protective gear trimming a tall hedge from a ladder" by [Mustafa Turhan](https://unsplash.com/@mustaphaturhan) on [Unsplash](https://unsplash.com/photos/person-trimming-hedge-on-ladder-QnodCAbcqvc), Unsplash License (https://unsplash.com/license)
