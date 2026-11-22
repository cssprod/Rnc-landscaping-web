# RNC's own photos

Put RNC's own photos here, one file per image slot in `media/images.json`, named after the slot id:

```
media/photos/proj-oak-bay-front-garden-renewal-art.jpg
media/photos/proj-oak-bay-front-garden-renewal-art.licence.json
```

Every photo needs a licence record beside it (`<slot>.licence.json`). A photo without one fails the run:

```json
{ "holder": "RNC Landscaping", "licence": "Own photo, all rights reserved", "source": "optional: who took it", "releases": "optional: property or people releases on file" }
```

Then run, from `site/` (sharp lives in scratch, never in the repo):

```
npm install sharp --prefix "$SCRATCH/sharp"
node tools/process-images.mjs --sharp="$SCRATCH/sharp"
node tools/process-images.mjs --check
```

The tool writes `site/static/img/<slot>-<480|768|1024|1600>.(avif|webp|jpg)` with every bit of metadata stripped
(EXIF, GPS, camera data) and records sizes and licences in `media/photos.json`. `picture()` then serves the photo as a
`<picture>` instead of the slot's living art. Write the slot's `alt` in `media/images.json` by hand to describe the
photo (`""` only when it is purely decorative). Only RNC's own photos go under `/projects/`; never use stock there.
