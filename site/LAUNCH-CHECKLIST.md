# Launch checklist

- [ ] Fill every value in `site/site.config.mjs`; `CONTEXT=production node build.mjs` passes.
- [ ] Replace or delete every Sample project and testimonial; replace stock-photo slots with RNC photos (owner portrait and crew photos especially).
- [ ] Add `static/downloads/rnc-capability-statement.pdf`.
- [ ] Verify every `verify: true` local note (CRD watering rules, tree bylaws) against its source URL.
- [ ] Confirm brand files (`brand/`) are final; favicon shows.
- [ ] Netlify: connect repo (base `site`), enable Forms detection, set custom domain and HTTPS, enable Identity and Git Gateway.
- [ ] Follow `integrations/google-sheet/SETUP.md`; submit a real test quote and see the row appear.
- [ ] Plausible: add site, confirm custom events (quote_submitted, call_clicked) arrive.
- [ ] Run Lighthouse and axe on the deploy preview; fix anything below target.
- [ ] Submit `https://[DOMAIN]/sitemap.xml` in Google Search Console and Bing Webmaster Tools; create the Google Business Profile.
- [ ] Update the privacy page if you add any tool beyond Plausible.
