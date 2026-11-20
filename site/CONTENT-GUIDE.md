# Content guide for the owner

## Edit text and projects
1. Go to `https://[DOMAIN]/admin/` and sign in (Netlify Identity invite).
2. Choose a collection: Services, Projects, Testimonials, Areas, Resources or Pages. Edit, then **Save** and **Publish**. The site rebuilds in about a minute.
3. Photos are referenced by slot ID (for example `proj-irrigation-1`). Upload new photos in the editor, then ask your developer to point the slot at them.

## Replace the placeholders
Highlighted `[PHONE]`-style text on preview sites is information only you can supply. Open `site/site.config.mjs` and fill in each value (phone, email, hours, address, legal name, year, crew size, owner name and bio, liability limit, WorkSafeBC status, licences, certifications, memberships, warranty, domain, Plausible domain). Preview shows what is left; a live build refuses to publish until all are done.

## Replace samples
Every project and testimonial with **Sample** ticked shows a visible Sample label and blocks a live build. For a real project or a real, consented review, untick Sample. Remove sample entries you do not replace. Never attribute a quote to a person or business without permission. Photos marked "Photo to be supplied by RNC" must be your own work photos.

## Other files you supply
- `static/downloads/rnc-capability-statement.pdf` for commercial buyers.
- Real logo files and tokens come from the `brand/` folder.
