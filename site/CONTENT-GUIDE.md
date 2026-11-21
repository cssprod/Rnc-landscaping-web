# Content guide for the owner

## Edit text and projects
All copy lives in `content/` as JSON files: services, projects, testimonials, areas, resources and pages. Edit a file on GitHub (pencil icon), commit, and Netlify rebuilds the site in about a minute. There is no admin login: the repository is the editor.

Photos are referenced by slot ID (for example `proj-irrigation-1`) in `media/images.json`. To use your own photo, add it to `site/static/` (for example `site/static/photos/oak-bay-garden.jpg`) and ask your developer to point the slot at it. Until a slot has a photo, the site shows a labelled illustration.

## Replace the placeholders
Highlighted chips such as `[PHONE]` are information only you can supply. Open `site/site.config.mjs` and fill in each value (phone, email, hours, address, legal name, year, crew size, owner name and bio, liability limit, WorkSafeBC status, licences, certifications, memberships, warranty, domain). The showcase site shows what is left; a launch build refuses to publish until all are done.

## Replace samples
Every project and testimonial with `"sample": true` shows a visible Sample label and blocks a launch build. For a real project or a real, consented review, set it to `false`. Remove sample entries you do not replace. Never attribute a quote to a person or business without permission.

## Quote requests
The quote form opens the visitor's email app with their request written out, addressed to `EMAIL`. Requests arrive in that inbox like any other email; nothing is stored on the website.

## Other files you supply
- `static/downloads/rnc-capability-statement.pdf` for commercial buyers.
- Brand files (logo, icons, fonts, colours) live in `brand/`; see `brand/brand.md`.
