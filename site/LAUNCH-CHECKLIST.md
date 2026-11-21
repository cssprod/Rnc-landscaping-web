# Launch checklist

The showcase edition can be shown as it is. Before using the site to win real work:

- [ ] Fill every value in `site/site.config.mjs` (phone, email, hours, address, legal name, year, crew size, owner name and bio, insurance, WorkSafeBC, licences, certifications, memberships, warranty, domain).
- [ ] Replace or delete every Sample project and testimonial; replace stock-photo slots with RNC photos (owner portrait and crew photos especially). Slots still showing "Photo to come" need RNC photos.
- [ ] Add `static/downloads/rnc-capability-statement.pdf`.
- [ ] Verify every `verify: true` local note (CRD watering rules, tree bylaws) against its source URL.
- [ ] Have a lawyer review the privacy and terms pages (both are marked draft).
- [ ] Send yourself a test request from `/free-quote/` once `EMAIL` is set, from a phone and a laptop.
- [ ] Optional: set `PLAUSIBLE DOMAIN` and add the site in Plausible.
- [ ] Netlify: set `SITE_MODE = "launch"` for the production context, add the custom domain and HTTPS, and keep visitor access open.
- [ ] Run Lighthouse and axe on the live URL; fix anything below target.
- [ ] Submit `https://[DOMAIN]/sitemap.xml` in Google Search Console and Bing Webmaster Tools; create the Google Business Profile.
