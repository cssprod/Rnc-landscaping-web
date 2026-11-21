# Cedar Springs Teardown and RNC Landscaping Redesign Blueprint

Cedar Springs' site (cedarsprings.net) is worth copying in three ways: it is led by real photography, it uses a confident editorial layout, and it publishes rich data with each project. But it has more than 35 faults you can fix, so RNC can beat it on speed, accessibility, local SEO and how easy it is to request a quote, while keeping your current Lighthouse 99–100 / accessibility 100 baseline. Cedar Springs is a premium design-build firm, not a direct competitor. It is based in Oakville, Ontario, and does mostly pool-led backyard projects with budgets of $550k to $5M+. [cedarsprings](https://cedarsprings.net/) [cedarsprings](https://cedarsprings.net/design-build/) Treat it as a reference for art direction, not for content or information architecture.

## TL;DR

- **Copy the feel, not the features.** Cedar Springs looks premium because of large real-project photos, a calm near-black-and-white palette (Awwwards lists #212123 and #FFFFFF), a "featured project" panel with location, budget, design time and build time, and a named five-phase process. [awwwards](https://www.awwwards.com/sites/cedar-springs-landscapes) [cedarsprings](https://cedarsprings.net/) Its faults are largely those of a typical WordPress agency build: the same content repeated in the page markup, filenames used as alt text, two H1s on one page, every blog "Read More" link pointing to /about/, legacy URLs that are now broken, design-build and snow pages missing from the menu, no reviews or awards section despite an "Award-Winning" H1, and a contact form with 8+ fields plus reCAPTCHA.
- **RNC's advantages are structural.** You already have a fast static build with no dependencies, WCAG 2.2 AA, cookieless analytics and pages for each municipality. "Better than Cedar Springs" means adding Cedar Springs-grade art direction (an editorial hero, project case studies, a process timeline and an outcome-led home page) on top of that, without adding a page loader, AJAX page transitions or third-party scripts.
- **Conversion plan within the constraints.** Use a short quote builder (about 6 inputs) that writes a `mailto:` message, with a visible fallback: copy-to-clipboard, the plain email address, and tap-to-call/text. Add a sticky mobile Call / Free Quote bar that never hides focused elements (WCAG 2.4.11). Keep schema honest: LocalBusiness-type markup with `areaServed`, and no self-serving review stars. Give each municipality page content that is specific to that place, so the pages are not doorway pages.

---

## Executive Summary

**Who Cedar Springs is.** Cedar Springs Landscapes (legally Cedar Springs Landscape Group Inc.) runs a design studio at 3242 South Service Rd W, Oakville, plus yards in Dundas and Bond Head. [dnb](https://www.dnb.com/business-directory/company-profiles.cedar_springs_landscape_group_inc.e794dde345ed62e5f94cbb8124339a16.html) [cedarsprings](https://cedarsprings.net/contact/) It sells residential design-build ("home resort specialist"), residential and commercial property care, and snow and ice management. [cedarsprings](https://cedarsprings.net/) [cedarsprings](https://cedarsprings.net/commercial-snow/) [cedarsprings](https://cedarsprings.net/property-care-residential/) Its service area is the GTHA: Oakville, Burlington, Mississauga, Hamilton/Ancaster, Brant, Etobicoke, King City, Aurora, Vaughan and Richmond Hill. [cedarsprings](https://cedarsprings.net/) [cedarsprings](https://cedarsprings.net/about/) The firm has won many Landscape Ontario awards. [landscapeontario](https://landscapeontario.com/having-a-solid-base-key-to-cedar-springs-success) [landscapeontario](https://landscapeontario.com/attach/1359147406.RELEASE_-_Awards_of_Excellence_Winners_2013.pdf) In the 2025 program it received five Awards of Merit for residential construction (Tranquil Lines, Nature's Edge, Level Up, Classic Meets Contemporary, Buckdown Resort). [landscapeontario](https://landscapeontario.com/2025-awards-of-excellence-winners/) It also won the 2022 Casey van Maris Award for "Wonderful in White" and a 2016 National Award of Landscape Excellence in Residential Maintenance. [landscapeontario](https://landscapeontario.com/lo-members-win-big-at-national-awards-of-landscape-excellence/) [landscapeontario](https://landscapeontario.com/49th-annual-awards-special-winners/) [landscape-alberta](https://www.landscape-alberta.com/winners-announced-at-the-13th-annual-national-awards-of-landscape-excellence/) The current site was built by Ripple Design & Marketing (Ancaster, ON) and received an Awwwards Honorable Mention on Nov 20, 2025. [awwwards](https://www.awwwards.com/ripple-ca/) [weareripple](https://weareripple.ca/) [awwwards](https://www.awwwards.com/ripple-ca/) [awwwards](https://www.awwwards.com/sites/cedar-springs-landscapes) [cedarsprings](https://cedarsprings.net/)

**How comparable it is.** Partly. RNC shares the service mix (maintenance, installation, irrigation, vegetation work) and the multi-municipality model. Cedar Springs, however, sells six- and seven-figure luxury projects and publishes budgets; [cedarsprings](https://cedarsprings.net/) RNC must never show prices. Borrow its *presentation*, not its *positioning*.

**Verdict.** The site's visual design is good (Awwwards jurors mostly scored it 7–8 for design). [awwwards](https://www.awwwards.com/sites/cedar-springs-landscapes) Its engineering, accessibility, information architecture and SEO hygiene are average or weak. The faults that matter most for RNC to avoid:
1. Markup that repeats the same content: desktop and mobile versions of the menu, the process steps and the project slider all ship in the HTML. As a result, design-build reports a 31-minute "reading time". [cedarsprings](https://cedarsprings.net/design-build/)
2. Image alt text made from filenames, including the misspelling "ceder-creek-landscapes". [cedarsprings](https://cedarsprings.net/projects/)
3. Broken internal links: every blog "Read More" goes to /about/. [cedarsprings](https://cedarsprings.net/blog/)
4. Old URLs from the 2016–2024 site that now return errors or duplicate content.
5. Important pages (design-build, commercial snow) left out of the menu.
6. Inconsistent service-area lists and no location pages.
7. Trust signals left unused: awards and reviews are missing from the site.
8. A high-friction contact form.

---

## A. Cedar Springs Teardown

*Method: page content, metadata and markup structure were pulled with a text-extraction fetch on 21 Nov 2026 from the home, contact, process, about, projects, design-build, residential property care, commercial snow and blog pages, plus index snippets for careers, legacy URLs and project detail pages. I could not run PageSpeed Insights, Lighthouse, CrUX, axe, or a real browser at phone, tablet and desktop widths: the PSI web UI and API were not reachable from my tools, and a follow-up research pass confirmed they remain UNKNOWN. Every claim about rendered behaviour is therefore marked UNKNOWN or "verify".*

### A1. Identity and positioning
- **Name and brand:** Cedar Springs Landscapes. Older listings use Cedar Springs Landscape Group. The key principal is Adrian Bartels, President/Design & Sales. [dnb](https://www.dnb.com/business-directory/company-profiles.cedar_springs_landscape_group_inc.e794dde345ed62e5f94cbb8124339a16.html) [cedarsprings](https://cedarsprings.net/about/)
- **Positioning:** "get away every day", luxury "backyard resort" design-build, "five-star" service. [cedarsprings](https://cedarsprings.net/)
- **Services shown:** design-build (consultation, survey, 2D design and estimate, 3D visualization, materials and contract, permits, construction, client training, warranty); residential property care (clean-ups, pruning, lawn care, planting, gardening, pool care, plant health care, mulching, irrigation, enhancements, snow); commercial grounds maintenance and snow (24-hour call centre, GPS-tracked proof of service, "$10 million in liability insurance"). [cedarsprings](http://cedarsprings.net/process/) [cedarsprings](https://cedarsprings.net/commercial-snow/) [cedarsprings](https://cedarsprings.net/property-care-residential/)
- **Founding year is stated inconsistently:** the About title says "Since 1991", the About meta description says "over 35 years", the About body says "over 30 years", and the Landscape Ontario member listing says "since 1989". [landscapeontario](https://landscapeontario.com/member/cedar-springs-landscape-group/) [cedarsprings](https://cedarsprings.net/about/)

### A2. Information architecture
**Primary nav, in order:** home · projects · process · about · careers · property care (a dropdown whose parent link is `href="#"`, containing residential and commercial) · contact. A header CTA reads "Start Your Backyard Resort" and goes to /contact/. Social links go to Facebook, Instagram and Houzz. [cedarsprings](https://cedarsprings.net/)

**Footer:** a logo, three repeated taglines ("inspired by nature / guided by experience / defined by character"), and a long-sentence link to contact. Contact details: phone as plain text (not a `tel:` link), email as plain text (not `mailto:`), and the Oakville address only. Links: Home, Projects, Process, About, Careers, Property Care, Blog (Blog appears twice), privacy policy, accessibility policy, terms and conditions, and a "design by: Ripple" credit. [cedarsprings](https://cedarsprings.net/)

**URL patterns:** flat slugs (/process/, /about/, /design-build/, /commercial-snow/, /property-care-residential/), with /projects/{slug}/ for case studies. Blog posts sit at root level (e.g. /why-winter-is-the-best-time-to-book-a-landscaper-in-oakvill/, where the slug itself is cut off). [cedarsprings](https://cedarsprings.net/blog/)

**Orphaned or hidden pages:** /design-build/ and /commercial-snow/ are fully built landing pages but are not in the main nav or footer. Old URLs from the previous site (built by Compass Creative, footer "© 2016 - 2024") are still in Google's index: /inspiration/clean-and-modern now returns a client error, and /pricing (previously "Landscaping Cost Calculator Canada") now serves the contact page under a /contact/ canonical instead of a 301 redirect. [cedarsprings](https://cedarsprings.net/inspiration/clean-and-modern) [cedarsprings](https://cedarsprings.net/pricing) [cedarsprings](https://cedarsprings.net/pricing)

**Missing page types:** no individual service pages for design, construction or irrigation; no service-area or location pages; no FAQ; no reviews or testimonials page; no awards page.

### A3. Page-by-page layout (section order)
| Page | Section order observed | Notes |
|---|---|---|
| Home | Header → H1 "Award-Winning Landscaping in Oakville, Burlington & Ancaster" with H2 "get away every day" and a "scroll" cue → intro ("live more of what you love", city list, "Find Out More About Us") → image plus "5-star landscapes" SVG graphic → **Featured Project slider** (8 projects, each with a description and data rows for location, budget, design time and installation time) → "design is just the beginning" with an "Our Process" link → "start the process today" with a "Get In Touch" link → footer [cedarsprings](https://cedarsprings.net/) | No reviews, no awards panel, no services overview, no service-area block, no FAQ |
| Process | H1 "the proven process" → three pillars (next-level design: 5 steps; built to last: 3 steps; customer experience: client rep, maintenance and warranty) → "our team is" (3 values) → CTA [cedarsprings](http://cedarsprings.net/process/) | A strong section. Step content is repeated for desktop and mobile layouts |
| Projects | H1 "featured projects" (8 large cards with feature tags) → "project gallery" with a "Filter by spaces" list (23 tags) → about 40 or more project cards [cedarsprings](https://cedarsprings.net/projects/) | A good filtering pattern. Card alt text is filenames |
| Project detail | Hero → "Project details" narrative → gallery → "more projects" (3 related) → footer | Strong narrative copy (e.g. Buckdown: a 105-ft lagoon pool, a 55,000 sq ft wetland pond) [cedarsprings](https://cedarsprings.net/projects/buckdown-resort/) |
| About | H1 "about us" → H2 "The GTHA's landscape resort company" → mission and 4 values → **team grid (about 40 people)** with bios for some → one testimonial ("we couldn't be happier") → "Join Our Team" [cedarsprings](https://cedarsprings.net/about/) | A stray "." paragraph. The only testimonial on the site is placed here |
| Design-build (orphan) | H1 → city-specific copy ("Oakville, Ontario") → why choose us → local experience → consultation CTA → the full process block, repeated → team values → **embedded contact block with a second H1 "contact us"** → the whole featured-project slider again [cedarsprings](https://cedarsprings.net/design-build/) | Reports a 31-minute reading time [cedarsprings](https://cedarsprings.net/design-build/) |
| Residential property care | H1 → three benefit cards (four-season care, five-star experience, exclusive perks) → service list (items repeated) → winter services → CTA [cedarsprings](https://cedarsprings.net/property-care-residential/) | Thin; no process, no frequency or plan details |
| Commercial snow (orphan) | H1 → H2 value proposition → 24-hour call centre → GPS proof of service → monitoring → email updates → residential cross-sell → CTA → embedded contact block (second H1) [cedarsprings](https://cedarsprings.net/commercial-snow/) | The best-written page on the site, specific and full of proof points |
| Contact | H1 "contact us" → phone (tel link), email (plain text), 3 addresses → H2 "start the process today" form → city list [cedarsprings](https://cedarsprings.net/contact/) | The form is described below |
| Blog | H2 "blog" (**no H1**) → latest post → "featured posts" → post grid [cedarsprings](https://cedarsprings.net/blog/) | Every "Read More" link goes to /about/; all posts are dated 2026-02-03 [cedarsprings](https://cedarsprings.net/blog/) |

**Contact form:** First Name, Last Name, Phone, Email, Address, City, Message, then "Service Required" (Design / Construction / Maintenance / Snow & Ice), then reCAPTCHA. [cedarsprings](https://cedarsprings.net/contact/) That is 8 inputs plus a CAPTCHA. Whether fields are labelled, whether the form explains its consent or privacy handling, what errors look like and what confirmation the user sees are all UNKNOWN (not visible in the extraction; verify in a browser).

### A4. Visual design
- **Palette:** Awwwards lists **#212123** (near-black) and **#FFFFFF**. [awwwards](https://www.awwwards.com/sites/cedar-springs-landscapes) Accent colours are UNKNOWN.
- **Typography:** font families, weights and scale are **UNKNOWN**; the extraction strips CSS and Awwwards gives no type data. Headings are written in lowercase ("about us", "the proven process", even team names like "adrian bartels"), [cedarsprings](https://cedarsprings.net/about/) which gives an editorial, fashion-brand tone.
- **Imagery:** professional photography of the firm's own award-winning projects, delivered as WordPress "-scaled" images (2560 px) converted to WebP, with some AVIF hero images. This photography is the main reason the site feels premium.
- **Motion:** Awwwards catalogues a **"Website Loading Screen"**, an **"AJAX Page Transition"**, a featured-project slider and a footer treatment. [awwwards](https://www.awwwards.com/inspiration/desktop-cedar-springs-landscapes) [awwwards](https://www.awwwards.com/inspiration/cedar-springs-featured-project-cedar-springs-landscapes) "scroll" text cues appear in the hero and on each slide.
- **What makes it sleek:** large full-bleed photography, very restrained colour, generous white space, lowercase editorial headings, a data strip on each project (location / budget / design time / installation time) that reads like a spec sheet, and a branded process ("three uniques").
- **What undermines it:** a loading screen and AJAX transitions add perceived wait and accessibility risk; sloppy data formatting in the data strips ("$550-600k", "900-950 k", "$700-750 k", "$650K", "$5M +", "jerseyville, ON"); the "get away every day" tagline is duplicated in the markup; the same three footer taglines appear on every page; and the brand name is misspelled in image names ("ceder-creek", "ceder-springs"). [cedarsprings](https://cedarsprings.net/)

### A5. Responsive and mobile behaviour
**Mostly UNKNOWN; this needs a browser check at 360, 390, 768, 1024 and 1440 px.**

What I can see from the markup:
- Separate mobile and desktop versions of the nav, process steps and featured-project panels are all present in the HTML, so the layout swaps components per breakpoint rather than reflowing one component.
- There is no `tel:` link in the header, and the footer phone number is not linked. Mobile visitors therefore have no one-tap call option outside the contact page.
- A "property care" dropdown parent with `href="#"` is a common source of mobile tap-to-open bugs.

Sticky header, sticky call bar, tap-target sizes and horizontal overflow: UNKNOWN.

### A6. Tech stack
- **Platform:** WordPress, with WP Rocket 3.24 (some pages 3.23.3.3) for caching and WebP. [zoominfo](https://www.zoominfo.com/c/cedar-springs-landscape-group/352903465) [cedarsprings](https://cedarsprings.net/) [cedarsprings](https://cedarsprings.net/design-build/)
- **Tracking:** Google Tag Manager, container GTM-K3FH84TT. [cedarsprings](https://cedarsprings.net/)
- **Forms:** Google reCAPTCHA (named on the form; ZoomInfo's tech-stack detection also lists it). [zoominfo](https://www.zoominfo.com/c/cedar-springs-landscape-group/352903465) [cedarsprings](https://cedarsprings.net/contact/)
- **Cookies:** a cookie-consent banner ("We value your privacy… Accept All… Customise Consent Preferences… Powered by…"); [cedarsprings](https://cedarsprings.net/) the vendor is UNKNOWN.
- **SEO plugin:** the "Est. reading time" Twitter labels and robots meta pattern suggest Yoast SEO (unverified).
- **Hosting/CDN:** UNKNOWN.
- **Design agency:** Ripple Design & Marketing. [cedarsprings](https://cedarsprings.net/) Its co-founder previously worked at Cedar Springs. [zoominfo](https://www.zoominfo.com/p/Gavin-Wieske/14133872614) [awwwards](https://www.awwwards.com/ripple-ca/)

### A7. Performance
**PSI / Lighthouse (mobile and desktop) scores: UNKNOWN. CrUX LCP / INP / CLS: UNKNOWN. Total page weight: UNKNOWN.** Every attempt on 21 Nov 2026 to reach pagespeed.web.dev or the PSI v5 API from my research tools failed, and no cached third-party report could be found.

Risk factors visible in the markup:
- Repeated DOM for nav, process and slider (reading-time labels of 10–31 minutes on pages that have only a few minutes of unique copy). [cedarsprings](http://cedarsprings.net/process/) [cedarsprings](https://cedarsprings.net/design-build/)
- 2560 px "-scaled" source images.
- A loading screen and AJAX transitions, which typically delay LCP.
- GTM, reCAPTCHA and a consent-management script loaded as third parties.

Run PSI before claiming any number.

### A8. Accessibility (WCAG 2.2 AA), from markup evidence
- **Alt text:** filenames used as alt text (e.g. "cedar-springs-landscapes-home-more-about-us", "cedars-springs-projects-fire-water-alfresco (20)"). [cedarsprings](https://cedarsprings.net/projects/) [cedarsprings](https://cedarsprings.net/) Lazy-load placeholders duplicate images with empty alt.
- **Headings:** two H1s on design-build and commercial-snow (the embedded "contact us" H1); no H1 on the blog index. [cedarsprings](https://cedarsprings.net/design-build/) [cedarsprings](https://cedarsprings.net/commercial-snow/) [cedarsprings](https://cedarsprings.net/blog/)
- **Repeated text:** duplicated hero text, plus visible "scroll" labels, will be read aloud twice unless they are `aria-hidden` (UNKNOWN; verify).
- **Navigation:** the dropdown parent `href="#"` is not a proper disclosure button.
- **Motion:** the loading screen, AJAX transitions and slider risk failing 2.2.2 Pause/Stop/Hide and 2.3.3 (AAA) if they cannot be paused or don't respect `prefers-reduced-motion` (UNKNOWN; verify).
- **CAPTCHA:** reCAPTCHA can create barriers related to 3.3.8 Accessible Authentication and cognitive load.
- **Compliance context:** an accessibility policy page exists (likely for AODA; Ontario requires WCAG 2.0 AA for private organisations with 50+ employees, and the firm's team page shows about 40 named staff, so applicability is UNKNOWN). [cedarsprings](https://cedarsprings.net/about/) [acquia](https://www.acquia.com/web-accessibility-legislation/aoda) [equalweb](https://www.equalweb.com/platform/standards/aoda.html)
- **Not checked:** contrast, keyboard focus and form errors are UNKNOWN.

### A9. SEO and local SEO
- **Titles and meta:** generally good and city-targeted ("Cedar Springs | Award-Winning Landscaping Company Oakville"). But there is double-encoding in the meta description ("Burlington &amp; Mississauga") and in the blog title ("Insights &amp;amp; Ideas"). [cedarsprings](https://cedarsprings.net/) [cedarsprings](https://cedarsprings.net/design-build/) [cedarsprings](https://cedarsprings.net/blog/)
- **Open Graph:** `og:type` is "article" on static pages, `og:locale` is **en_US** for a Canadian business, and **the same og:image is used on every page**. [cedarsprings](https://cedarsprings.net/projects/) [cedarsprings](https://cedarsprings.net/) [cedarsprings](https://cedarsprings.net/contact/)
- **Structured data:** JSON-LD exists with name, description, email, address and sameAs (including an es.pinterest.com profile URL). [cedarsprings](https://cedarsprings.net/) The type and phone number are UNKNOWN. No Service, FAQ or Breadcrumb markup was observed.
- **Index hygiene:** legacy URLs and an http:// variant (http://cedarsprings.net/process/) appear in search results. At least one indexed snippet showed a stale or mismatched title (/commercial-snow/ shown as "Landscape Design-Build Oakville"). [cedarsprings](http://cedarsprings.net/process/) [cedarsprings](https://cedarsprings.net/commercial-snow/)
- **Location strategy:** none. City lists differ between the home page (Oakville, Burlington, Mississauga, Hamilton, Aurora, King City, Vaughan, Richmond Hill), the About page (Brant, Ancaster, Burlington, Oakville, Mississauga, Etobicoke, King City, Aurora) and the contact page. [cedarsprings](https://cedarsprings.net/) [cedarsprings](https://cedarsprings.net/contact/) [cedarsprings](https://cedarsprings.net/about/) There are no city pages apart from design-build copy aimed at Oakville.
- **Blog:** 8 or more posts all dated 2026-02-03 (a bulk upload), authored by "Cedar Springs Team" (weak E-E-A-T), one truncated slug, and broken "Read More" links. [cedarsprings](https://cedarsprings.net/blog/)
- **Sitemap.xml and robots.txt:** UNKNOWN.

### A10. Content and UX quality
- **Strengths:** specific, high-proof commercial copy (24-hour call centre, GPS logs, $10M insurance), rich project narratives, and a named process with deliverables (2D design and estimate, 3D model, permits, client training). [cedarsprings](http://cedarsprings.net/process/) [cedarsprings](https://cedarsprings.net/commercial-snow/)
- **Weaknesses:**
  - No reviews: Facebook shows "84% recommend (16 reviews)", and Google review data isn't used. [facebook](https://www.facebook.com/cedarspringscsl/)
  - No awards section despite the "Award-Winning" H1 and a decade of Landscape Ontario wins. [landscapeontario](https://landscapeontario.com/2025-awards-of-excellence-winners/) [landscapeontario](https://landscapeontario.com/having-a-solid-base-key-to-cedar-springs-success) [landscapeontario](https://landscapeontario.com/attach/1359147406.RELEASE_-_Awards_of_Excellence_Winners_2013.pdf)
  - The warranty is mentioned but not explained.
  - No FAQ, timelines or "what to expect" for maintenance.
  - Typos: careers says "AWLAYS"; a stray "." on About. [cedarsprings](https://cedarsprings.net/careers/landscape-maintenance-team-member-lead-hands-and-foremen)
  - Inconsistent founding claims.
  - Blog posts written for SEO ("design build landscaping Oakville" placed awkwardly in sentences). [cedarsprings](https://cedarsprings.net/blog/)

### A11. Privacy, legal and security
HTTPS is in use. A consent banner, a privacy policy, an accessibility policy and terms all exist (content quality not reviewed). Some internal links render as http:// on the /pricing variant. [cedarsprings](https://cedarsprings.net/pricing) Security headers: UNKNOWN. Norton Safe Web rates the site "SAFE". [norton](https://safeweb.norton.com/report/show?url=cedarsprings.net)

### A12. What Cedar Springs does well (copy these in spirit)
1. **A project "spec strip":** each project shows location, duration, scope tags and narrative. RNC version: municipality, service line, duration, plant palette and "challenge → approach → result", **with no budget figures**.
2. **A named, phased process with deliverables** at each step.
3. **Filterable portfolio** by feature or space.
4. **Real-crew credibility:** team faces and roles.
5. **Commercial proof points:** concrete operational guarantees instead of adjectives.
6. **Restraint:** a two-tone palette, big photography, lots of white space.
7. **Dedicated landing pages for each service line**, written with local context (design-build in Oakville).

### A13. Prioritised fault and issue table
| # | Issue | Evidence (URL) | Severity | Category | Fix for RNC |
|---|---|---|---|---|---|
| 1 | Every blog "Read More" link goes to /about/ | /blog/ | Critical | UX/SEO | Card links generated from the post URL; link checker in CI |
| 2 | Legacy URLs 404 or serve duplicate content under a /contact/ canonical instead of a 301 | /inspiration/clean-and-modern, /pricing | High | SEO | Netlify `_redirects` 301 map for every retired URL |
| 3 | Same content repeated in markup (nav, process steps, slider); 31-minute reading time on design-build | /design-build/, /process/ | High | Performance/A11y | One responsive component per pattern; CSS-only reflow |
| 4 | Filenames used as alt text; brand misspelled ("ceder") | /, /projects/ | High | A11y/SEO | Descriptive alt written by hand; `alt=""` for decorative images |
| 5 | Two H1s per page (embedded contact block) | /design-build/, /commercial-snow/ | High | A11y/SEO | One H1 per template; embedded blocks start at H2 |
| 6 | No H1 on blog index | /blog/ | Medium | SEO/A11y | Add an H1 |
| 7 | Key landing pages missing from nav (orphans) | /design-build/, /commercial-snow/ | High | IA | Services mega-menu listing every service page |
| 8 | Dropdown parent is `href="#"` | all pages | Medium | A11y | `<button aria-expanded>` disclosure pattern |
| 9 | No click-to-call in header or footer; email not `mailto:` | all pages | High | Conversion | Header call icon-button, sticky mobile bar, `tel:`/`mailto:` links everywhere |
| 10 | Contact form: 8 inputs, split name, address, reCAPTCHA | /contact/ | High | Conversion/A11y | About 6 inputs, single name field, no CAPTCHA (mailto needs none) |
| 11 | No reviews section; one testimonial hidden on About | site-wide | High | Trust | Reviews band on home and service pages, linking to the Google Business Profile |
| 12 | "Award-Winning" H1 but no awards shown | / | Medium | Trust | Only claim what can be verified; credentials band with links to issuers |
| 13 | Inconsistent founding year (1989/1991/"30"/"35 years") | /about/, LO listing | Medium | Trust | A single source of truth in site data tokens |
| 14 | Service-area lists inconsistent; no location pages | /, /about/, /contact/ | High | Local SEO | One municipality list in data; one page per municipality with unique content |
| 15 | Loading screen and AJAX page transitions | per Awwwards elements | High | Perf/A11y | No loader; native View Transitions only, honouring reduced-motion |
| 16 | Slider with "scroll" cues; pause/reduced-motion support unknown | / | Medium | A11y/UX | Static, scrollable project rail (no auto-advance) |
| 17 | Repeated decorative text ("get away every day" ×2) | / | Low | A11y | `aria-hidden` on decorative duplicates, or render once |
| 18 | Same og:image on every page; `og:type` article; `og:locale` en_US | all | Medium | SEO/Social | One OG card per page; `website` type; `en_CA` locale |
| 19 | HTML double-encoding in titles/meta | /blog/, /design-build/ | Medium | SEO | Escape once at build; test snapshots |
| 20 | Blog posts all dated the same day; generic author | /blog/ | Medium | E-E-A-T | Named author with bio; real publish dates; seasonal cadence |
| 21 | Truncated slug "oakvill" | /blog/ post | Low | SEO | Slug linting |
| 22 | Inconsistent date formats (2026-02-03 vs 26/02/03) | /blog/ | Low | Content | One `<time datetime>` format, displayed as "3 Feb 2026" |
| 23 | Messy project data formatting ("900-950 k", "jerseyville") | / | Low | Content | Structured project data with validation |
| 24 | Typos ("AWLAYS", stray ".") | /careers/…, /about/ | Low | Content | Spell-check in CI |
| 25 | Blog link duplicated in footer | all | Low | IA | Dedupe |
| 26 | Footer phone and email not linked | all | Medium | Conversion | Link them |
| 27 | 2560 px "-scaled" images; mixed WebP/AVIF | / | Medium | Performance | AVIF+WebP `srcset`, max 1600 w for heroes |
| 28 | Third parties: GTM, reCAPTCHA, consent manager | all | Medium | Perf/Privacy | Plausible only; no consent banner needed |
| 29 | Index shows an http:// variant and a stale title | search index | Low | SEO | Force HTTPS, consistent canonicals |
| 30 | Warranty mentioned but undefined | /process/ | Medium | Trust | Plain-language workmanship guarantee page/FAQ |
| 31 | Property-care page thin: no frequency, plan, or what to expect | /property-care-residential/ | Medium | Content | "What's included each visit / season" tables (no prices) |
| 32 | No FAQ anywhere | site-wide | Medium | Content/SEO | Short FAQs on each service page |
| 33 | Lowercase names and headings in source text | /about/ | Low | Content | Proper case in HTML; lowercase via CSS if wanted |
| 34 | Very large team grid without bios | /about/ | Low | UX | Lead with 3–6 key people with real bios |
| 35 | Possible duplicate commercial URLs (/property-care vs /property-care-commercial/) | search index | Low | SEO | 301 old to new |
| 36 | Performance, contrast, focus, mobile tap targets unmeasured | — | UNKNOWN | — | Audit before quoting numbers |

---

## B. Benchmark and Best Practices

### B1. Benchmark sites
*Scope note: these were reviewed from home-page extracts and index snippets only, not full audits. Performance and accessibility scores are UNKNOWN for all of them.*

| Site | Region | What's excellent | Weaknesses observed |
|---|---|---|---|
| Cedar Springs (cedarsprings.net) | Oakville, ON | Awwwards HM (Nov 2025); editorial photography; project spec strips; filterable portfolio | See section A [awwwards](https://www.awwwards.com/ripple-ca/) |
| Fallingwater (fallingwaterlandscapes.com) | Victoria, BC | "Red Seal Certified" and "budget centric guidance" stated above the fold; a clear "Book my Free Consultation" CTA repeated in the header; very complete service inventory (design, construction, maintenance, irrigation) [fallingwaterlandscapes](https://www.fallingwaterlandscapes.com/) | Squarespace cart artifact in the header ("0"); a long bulleted wall of services; irrigation page slug reads like a blog title [fallingwaterlandscapes](https://www.fallingwaterlandscapes.com/) |
| Acacia Landscape (acaciavictoria.com) | Victoria, BC | Credible trust story: family-owned, founded 1987 by a registered landscape architect, BBB A+, multiple BC Landscape Awards of Excellence; covers design, build, maintenance, irrigation, rainwater harvesting [acaciavictoria](https://www.acaciavictoria.com/) | Award claims are generic (no years or projects named) |
| Turk Landscape Design (victorialandscapedesign.com) | Victoria, BC | "Click to call" with the number in the hero plus "Book A Consultation"; a memorable four-verb tagline ("Design. Create. Cultivate. Illuminate.") [victorialandscapedesign](https://victorialandscapedesign.com/) | Generic SEO body copy |
| Vision Landscaping (visionlandscapingvictoria.ca) | Victoria, BC | Phone and email in the header; design offer explained (2D to-scale plans, on-site design) [visionlandscapingvictoria](https://visionlandscapingvictoria.ca/) | Superlatives ("the leading company") without proof [visionlandscapingvictoria](https://visionlandscapingvictoria.ca/) |
| Larix Landscape (larixlandscape.com) | Saanich, BC | "25+ years" longevity; a differentiator (custom carpentry/pergolas) [larixlandscape](https://www.larixlandscape.com/) | Typos ("comanies", "custoom", "carpenty") hurt credibility [larixlandscape](https://www.larixlandscape.com/) |
| Swick's Landscaping (swicks.net) | Greater Vancouver | Publicises named BCLNA award wins (2024 awards for Shaughnessy Estate and Shaughnessy Shade Garden) with project names and dates | Award news lives in a blog post, not a persistent trust band [bclna](https://bclna.com/bc-landscape-awards-of-excellence) [swicks](https://swicks.net/swicks-landscaping-wins-two-awards-at-the-2024-bclna-landscape-awards-of-excellence/) |

**Industry award context:** the BCLNA BC Landscape Awards of Excellence judge projects against criteria. The 2025 program drew 24 entries from 12 companies, and 8 companies received 10 awards. [bclna](https://bclna.com/landscape-awards-of-excellence) If RNC ever enters and wins, that is the provincial equivalent of Cedar Springs' Landscape Ontario wins.

**Pattern to take away:** the Victoria competitors convert with a phone number plus a "free consultation" CTA and lists of credentials. None of the sites reviewed pairs that with Cedar Springs-level art direction, a project case-study system, or municipality-specific local-rule content. That gap is RNC's opening.

### B2. Best practices for 2025–2026, with evidence
- **Speed pays.** Google's web.dev case studies: Vodafone Italy improved LCP by 31% and saw 8% more sales. Rakuten 24's A/B test of Core Web Vitals work showed a 33.13% conversion-rate increase and 53.37% more revenue per visitor. [web](https://web.dev/case-studies/vitals-business-impact) [web](https://web.dev/case-studies/rakuten) Google's web.dev Renault case study (about 10 million landing-page visits) found that a 1-second LCP improvement correlated with a 14-percentage-point drop in bounce rate and a 13% increase in conversions; this is a correlation, not an A/B test. In the Google-commissioned "Milliseconds Make Millions" study by 55 and Deloitte (published on web.dev), a 0.1 s mobile speed gain went with a 21.6% increase in lead-gen users who progressed to the form-submission page (progression, not completed submissions).
- **Short forms.** Baymard Institute's "Checkout Optimization: Minimize Form Fields" (June 2024) finds most sites need only 8 form fields, while the 2024 average was 11.3 (down from 11.8 in 2021 and 12.7 in 2019). 17% of users have abandoned because the checkout was too complex, and field count matters more than step count. This applies by analogy to quote forms: cut fields, use a single "Name" field, and hide optional fields. [x](https://x.com/Baymard/status/1506684103696990213) [matsio](https://matsio.com/what-baymards-checkout-research-means-for-b2b-lead-forms/)
- **No auto-rotating carousels.** NN/g advises against auto-forwarding on mobile devices and documented a user missing an offer shown in 98-point type because the panel rotated. [nngroup](https://www.nngroup.com/articles/designing-effective-carousels/) [nngroup](https://www.nngroup.com/articles/auto-forwarding/) Use a static hero and a user-controlled project rail.
- **WCAG 2.2 for sticky bars.** 2.5.8 Target Size (Minimum) requires at least 24×24 CSS px (aim for 44×44 on touch). 2.4.11 Focus Not Obscured (Minimum) means sticky headers and bottom bars must not fully hide the focused element, [dequeuniversity](https://dequeuniversity.com/resources/wcag-2.2/) [deesu](https://deesu.org/blog/wcag-2-2-target-size-focus-visibility) so add `scroll-padding` on both edges.
- **Location pages without doorway risk.** Google's spam policy names "pages targeted at specific regions or cities that funnel users to one page" as doorway abuse, and the 2024 scaled-content policy targets templated pages. [townsmithwp](https://townsmithwp.com/guides/doorway-pages/) [richwoodmarketing](https://richwoodmarketing.com/blog/doorway-pages-vs-location-pages/) Each municipality page must be useful on its own and different from its siblings.
- **Reviews and schema.** Since 16 Sept 2019, Google treats reviews about a business shown on that business's own site (including via widgets) as self-serving, and LocalBusiness/Organization pages are not eligible for review stars. [wprichsnippets](https://wprichsnippets.com/schema-types/review-snippets/) [hirebalzac](https://hirebalzac.ai/google-review-snippet-structured-data/) Show reviews for people, link to Google, and don't add AggregateRating markup.
- **LocalBusiness markup.** Google requires `name` and `address`. `areaServed` is valid schema.org and useful for describing a service area, but it is not in Google's supported-property list. [dev](https://dev.to/jp-digital-seo/localbusiness-json-ld-for-service-area-businesses-copy-paste-examples-4l37)

---

## C. RNC Landscaping Redesign Blueprint

### C1. Sitemap and information architecture
```
/                                  Home
/services/                         Services overview
  /services/grounds-maintenance/
  /services/landscape-installation/
  /services/irrigation/
  /services/tree-vegetation-management/
/areas/                            Service-area hub (map + list)
  /areas/victoria/ … /areas/metchosin/   (12 municipality pages)
/projects/                         Portfolio (filter: service × municipality)
  /projects/{slug}/                Case study
/process/                          How we work (maintenance + installation tracks)
/about/                            People, credentials, values
/faq/                              Grouped FAQ (also excerpted on service pages)
/free-quote/                       Quote builder (mailto) + fallbacks
/privacy/  /terms/  /accessibility/
/404                               Helpful 404 with search-style links
```
**Primary nav (desktop):** Services ▾ · Projects · Service Areas ▾ · Process · About · [Call] [Free Quote]. Services and Service Areas use `<button aria-expanded>` disclosures, never `href="#"`.

**Footer:**
- Four service links and all 12 municipality links (organised as a list, not a keyword block).
- NAP (name, address, phone) taken from one data file.
- Hours, plus `tel:`, `sms:` and `mailto:` links.
- Links to Privacy, Terms, Accessibility and the Google Business Profile.

No careers link.

**Internal linking:** every service page links to the municipality pages; every municipality page links to the four services and to 1–3 projects in that municipality (when they exist); every project page links back to its service and municipality. Breadcrumbs on all depth-2+ pages.

### C2. Page wireframes (mobile → desktop)
**Home**
1. **Hero.** Mobile: a full-width real photo (16:10), H1 below it (e.g. "Landscape care and construction across Greater Victoria"), a single line of proof (e.g. "Maintenance · Installation · Irrigation · Tree work — 12 municipalities"), primary "Get a free quote" and secondary "Call". Desktop: a split layout with H1 and CTAs on the left over a frosted Sea fog panel and the photo on the right. Static, never a carousel.
2. **Four service tiles** (icon + one line + "What's included"); a 2×2 grid on desktop, stacked on mobile.
3. **Featured project** spec strip: municipality · service · duration · scope tags, and a link to the case study. **No budget.**
4. **Process in 4 steps** (Request → Site visit → Written quote → Scheduled work), as a horizontal timeline on desktop and a vertical list on mobile.
5. **Reviews band:** 3 real quotes (Newsreader italic), attribution as first name and municipality, and a "Read all reviews on Google" link. No star schema.
6. **Local expertise:** a block teasing local rules (tree bylaw / watering schedule) linking to municipality pages. This is RNC's moat.
7. **Service-area map** (static SVG of the CRD with 12 linked labels) plus a list.
8. **Short FAQ** (4 questions).
9. **Final CTA band** (Douglas fir background, white text).
10. **Footer.**

**Service page** (e.g. Irrigation): H1 with a sentence of local context → "What's included" checklist → "Good fit if…" → seasonal timeline (spring start-up / summer audit / fall blow-out) → process → related projects → local rules callout linking to municipality pages → FAQ (5–6) → CTA. Use a sticky in-page table of contents on desktop.

**Municipality page** (e.g. Oak Bay): H1 "Landscaping in Oak Bay" → a summary written specifically for that place (soils, typical lot types, deer, heritage trees) → **"Local rules that affect your yard"** (the municipality's tree-protection bylaw, permit triggers, watering restrictions and source links, with a last-reviewed date) → which of the 4 services are most requested there and why → nearby projects (if any) → neighbouring municipalities → CTA prefilled with the municipality (`/free-quote/?area=oak-bay`).

**Project case study:** hero → spec strip (municipality, service, season, duration, scope tags) → Challenge / Approach / Result → gallery (optional before/after, using an accessible comparison slider that works by keyboard and offers a "side-by-side" toggle) → client quote if real → related projects → CTA.

**Free quote:** H1 → reassurance strip ("Free, no obligation · We reply within X business days · No prices shown here — every quote is site-specific") → quote builder (C5) → "What happens next" (3 steps) → alternative contacts → privacy note.

### C3. Design direction
**Keep:**
- The DTCG token system, Inter variable with Newsreader italic quotes, and light/dark modes.
- The Douglas fir primary colour and the logo.
- Liquid Glass, but **only on chrome**: header, sticky bar, menus and CTA panels sitting over photos. Content cards should be solid Sea fog / white surfaces so text contrast is predictable.

**Adapt from Cedar Springs:**
- Large real photography.
- Lots of white space.
- An editorial heading scale.
- The project spec strip.
- The phased process.
- A two-tone discipline (Basalt ink #0E1611 on Sea fog #F4F6F2, which is very close to Cedar Springs' #212123 on white but greener and more local).

**Drop:**
- Loader screens and AJAX transitions.
- Sliders.
- Lowercase body text written that way in the source HTML.
- Decorative duplicated taglines.
- Third-party embeds.

**Type scale** (fluid, `clamp()`, ratio about 1.25 on mobile and about 1.333 on desktop):

| Token | Size |
|---|---|
| display | 2.5 → 4.5 rem |
| h1 | 2.0 → 3.25 rem |
| h2 | 1.5 → 2.25 rem |
| h3 | 1.25 → 1.5 rem |
| body | 1.0625 → 1.125 rem, line-height 1.6, measure 65ch |
| small | 0.875 rem |

Inter weights 400/600/700. Newsreader italic only in quote blocks.

**Colour usage and contrast** (my calculations with the WCAG relative-luminance formula; verify in tooling):
- Basalt ink or Douglas fir on Sea fog: body text. Douglas fir on Sea fog ≈ 9.3:1; white on Douglas fir ≈ 10.1:1, which suits primary buttons.
- Fern #367A4F on Sea fog ≈ 4.8:1. That passes AA for body text but with little margin, so use it for links and icons, not small grey-on-green text.
- **Camas #5A4FCF focus ring on Fir night #0B1F15 ≈ 2.8:1, which fails the 3:1 non-text contrast requirement (1.4.11) in dark mode.** Add a lighter dark-mode focus token (e.g. a Camas tint) and re-test. On Sea fog, Camas is about 5.6:1 (passes).

**Imagery when real photography is limited:**
1. Run a one-day shoot each season covering crews at work, tools, irrigation heads and finished beds. Work-in-progress and detail shots read as authentic and are cheap to get.
2. Use only RNC's own photos in project case studies, and label each with municipality and season.
3. If stock is used for mood (hero backgrounds, service tiles), never put it in /projects/ and never caption it as a client's property. Prefer clearly generic subjects (texture, foliage, rain on a lawn) and record the licence in the image metadata.
4. Use illustration or SVG for process and maps instead of fake "team" stock.

**Motion:**
- 150–250 ms opacity and transform transitions.
- Same-document View Transitions only where supported.
- No scroll-jacking.
- `@media (prefers-reduced-motion: reduce)` turns off all non-essential motion.
- Nothing auto-plays.

**Component inventory:**
- Header (glass), disclosure menu, mobile sheet nav, sticky action bar.
- Hero (split / full-bleed), service tile, project card, project spec strip.
- Timeline / steps, review quote card, credential badge row.
- Local-rules callout (with a "last reviewed" date), FAQ accordion (`<details>`), CTA band.
- Breadcrumb, quote builder, fallback contact panel.
- Map SVG, before/after comparison, footer, skip link, 404 block.

### C4. Responsive strategy
- **Content breakpoints (min-width):** 0 (base, 360 design width) · 40em/640 px · 64em/1024 px · 80em/1280 px. Container queries for cards and tiles so components reflow inside grids. One DOM per component, never separate mobile and desktop copies.
- **Mobile nav:** a hamburger `<button aria-expanded aria-controls>` opens a full-height sheet using `inert` on the background, closes with Esc, and returns focus to the button. Service and Area submenus are accordions inside the sheet.
- **Sticky action bar (below 1024 px):** two equal buttons, "Call" (`tel:`) and "Free quote". Each is at least 48 px tall, the bar includes `env(safe-area-inset-bottom)`, and the bar hides while the on-screen keyboard is open or the quote form is in view. Add `scroll-padding-top` and `scroll-padding-bottom` equal to header and bar heights to satisfy 2.4.11.
- **Touch targets:** at least 44×44 px for primary controls; at least 24×24 px (2.5.8) for all others, [deesu](https://deesu.org/blog/wcag-2-2-target-size-focus-visibility) including footer links and chips.
- **Images:** `<picture>` with AVIF, then WebP, then JPEG; `srcset` widths 480/768/1024/1600; explicit `width`/`height` or `aspect-ratio` (protects CLS). The hero gets `fetchpriority="high"`, is never lazy-loaded, and is preloaded only if it isn't discoverable in the HTML. Everything below the fold uses `loading="lazy" decoding="async"`. Build-time resizing in the Node SSG; strip EXIF GPS data from client-property photos.
- **Text:** at least 16 px body on mobile; no horizontal scroll at 320 px (1.4.10 Reflow); test 200% zoom.

### C5. Conversion strategy (free quote, no prices, no backend)
**Quote builder (progressive enhancement over a real `<form>`):**
1. Service (4 large radio cards, multi-select allowed).
2. Municipality (`<select>` of 12; prefilled from the `?area=` URL parameter).
3. A short description of the property or job (textarea with example placeholder prompts).
4. Preferred timing (radio: ASAP / this season / planning ahead).
5. Name.
6. Phone **or** email (at least one; preferred-contact radio).

Optional: "Add photos after the email opens" hint. That is six inputs, against Cedar Springs' eight plus a CAPTCHA.

**Submit behaviour:**
- JavaScript builds a `mailto:` URL with an encoded subject ("Free quote request — Irrigation — Saanich") and a neatly formatted body. Keep the URL under about 1,800 characters, because some clients truncate long URLs.
- The form `action` is the mailto itself, so it still works without JavaScript (`method="post" enctype="text/plain"` as a degraded path).
- After the click, show an in-page panel: "Your email app should have opened with your request. Didn't open?" Offer:
  - **Copy request** (Clipboard API, with a visible confirmation that has `role="status"`).
  - The address shown as text with a copy button.
  - **Call** and **Text us** (`sms:` with a short prefilled body).
  - "Open Gmail / Outlook web" links (compose URLs with the same subject and body; describe them as convenience links).
- Validation: native constraint validation plus inline error text tied with `aria-describedby`; an error summary at the top on submit; keep entered values; never clear the form.
- Persist the draft in `sessionStorage` so it survives a back-navigation after the mail app opens. This is not a cookie and stays consistent with cookieless analytics.
- Analytics: Plausible custom events (`quote_mailto_opened`, `quote_copied`, `call_click`, `sms_click`). No personal data in event properties.

**Trust without prices:**
- Reply-time promise.
- "What happens next" steps.
- Insurance and WorkSafeBC coverage, certifications and memberships, **only if true and verifiable**.
- Real reviews with a link to Google.
- Named owner with photo.
- Local-rules expertise.
- A plain-language workmanship guarantee (define it, which Cedar Springs doesn't).

### C6. SEO and local SEO plan
- **Schema (JSON-LD, one `@id` graph):**
  - `HomeAndConstructionBusiness` or `LocalBusiness` (choose the most specific accurate subtype; schema.org has no "LandscapingBusiness" type, so treat it as unverified and don't invent one), with `name`, `address` (required by Google; if RNC is a service-area business that hides its address on its Business Profile, follow the GBP choice and accept that rich-result eligibility is limited), `telephone`, `email`, `url`, `logo`, `image`, `openingHoursSpecification`, `areaServed` (12 `City`/`AdministrativeArea` objects), `sameAs` (only profiles you control), and `hasOfferCatalog` listing the 4 services.
  - `Service` on each service page (`provider` → business @id, `areaServed`, `serviceType`).
  - `BreadcrumbList` on depth-2+ pages.
  - `FAQPage` markup is optional and purely semantic: per Search Engine Journal (10 May 2026), FAQ rich results stopped appearing in Google Search on 7 May 2026.
  - **No** `Review`/`AggregateRating` on own pages.
- **Titles:** `{Service} in Greater Victoria | RNC Landscaping`; `Landscaping in {Municipality}, BC — {Top 2 services} | RNC Landscaping`; keep under about 60 characters. Meta descriptions under about 155 characters with a benefit and "free quote".
- **Social cards:** `og:locale` en_CA; one OG image per template (generated at build time with page title and photo); `og:type` website.
- **Municipality pages, avoiding doorway risk.** Each page must contain at least three blocks that are genuinely local:
  1. Local rules with source links and a review date.
  2. Local conditions (exposure, soils, deer, salt spray, lot types).
  3. Local proof (projects or anonymised job notes from that municipality).

  Run a "swap test": if you exchange two municipality names and both pages still read as true, rewrite. [townsmithwp](https://townsmithwp.com/guides/doorway-pages/) Merge thin ones into /areas/ until they have real content.
- **Google Business Profile alignment:** the same NAP everywhere; GBP categories matched to the four service lines; GBP service areas = the 12 municipalities; the website URL on GBP points to /, with UTM parameters only if Plausible reporting needs them; post seasonal updates; ask happy clients for reviews by direct link.
- **Technical:** `sitemap.xml` with `lastmod` from the git commit date; `robots.txt` linking to the sitemap; self-referencing canonicals; `_redirects` for any retired URLs; `lang="en-CA"`; and a build check that fails on duplicate titles, missing H1s, broken internal links or alt text that looks like a filename.

### C7. Quality targets and budgets
| Metric | Target |
|---|---|
| Lighthouse (mobile, all 4 categories) | ≥ 95 on every template (keep current 99–100) |
| LCP (field p75) | < 1.8 s goal, < 2.5 s hard limit |
| INP (field p75) | < 200 ms (aim < 100 ms) |
| CLS (field p75) | < 0.05 (hard < 0.1) |
| Accessibility | WCAG 2.2 AA, 0 axe violations, manual keyboard + screen-reader pass |
| Home page weight (mobile, transferred) | ≤ 500 KB total; hero ≤ 120 KB AVIF; CSS ≤ 40 KB; JS ≤ 25 KB; fonts ≤ 2 files / ≤ 110 KB (subset Inter + Newsreader italic) |
| Inner pages | ≤ 350 KB transferred |
| Third-party requests | 1 (Plausible) |

### C8. Suggested Claude Code multi-agent workflow (cssprod/rnc-landscaping-web)
Run sub-agents in parallel on separate branches, all gated by the same CI:
1. **IA and content agent:** routes, data files (`services.json`, `areas.json`, `projects.json`, `site.json` as the single source of NAP), copy linting.
2. **Design-system agent:** token updates (dark-mode focus token, type scale, surface tokens), component CSS.
3. **Templates agent:** home, service, municipality, project, quote and legal templates.
4. **Quote-builder agent:** form, mailto builder, fallbacks, sessionStorage, Plausible events, unit tests for URL length and encoding.
5. **SEO agent:** JSON-LD graph, OG image generation, sitemap, redirects, build-time SEO checks.
6. **QA agent:** Lighthouse CI budgets, axe via Playwright at 320/390/768/1024/1440 px, keyboard-path tests for the sticky bar and focus visibility, a link checker.

Merge only when all budgets pass.

---

## Caveats
- **Not measured:** Cedar Springs' PageSpeed, CrUX, contrast, fonts, mobile rendering, sitemap/robots and security headers are UNKNOWN. My tools could not run PSI or a real browser. Run PSI (mobile + desktop), securityheaders.com and a manual 360 px pass before quoting any Cedar Springs numbers to stakeholders.
- **Extraction limits:** text extraction may show elements that are hidden or `aria-hidden` on the live site. The "duplicated DOM" and "double reading" findings are strong signals but should be confirmed in DevTools.
- **Benchmark depth:** competitors were reviewed from home-page content only.
- **Secondary-source figures:** some conversion figures (Renault, Deloitte) come from secondary summaries of the original studies.
- **AODA:** applicability to Cedar Springs is unknown. In any case it is an Ontario law and does not apply to RNC; [accessibilitychecker](https://www.accessibilitychecker.org/guides/aoda/) under the Accessible British Columbia Regulation (B.C. Reg. 105/2022) only listed public bodies are covered, and the province's proposed service-delivery and employment standards were still drafts as of its 21 Jan 2026 update, so RNC's WCAG 2.2 AA work is voluntary best practice.
- **Contrast ratios:** these are my calculations; confirm them with your token tests.

---

## Prioritised Implementation Checklist (static site on Netlify)

**P0: before any visual work**
1. Set up `site.json` as the single source for NAP, founding year, hours, licences and the municipality list, and feed it to the header, footer, schema and pages.
2. Add Lighthouse CI budgets (C7), axe/Playwright at 5 widths and a link checker to the Netlify build. The build fails on any regression.
3. Add a dark-mode focus-ring token that reaches at least 3:1 on Fir night. Re-test all focus states.
4. Add `scroll-padding` for the sticky header and bar, and test 2.4.11 with keyboard-only navigation.

**P1: conversion and trust**
5. Quote builder (6 inputs) → mailto, with a no-JS path, copy-to-clipboard, a visible email address, and `tel:`/`sms:` fallbacks plus a status message.
6. Sticky mobile Call / Free-quote bar (≥ 48 px, safe-area aware, hidden while the form is in view).
7. `tel:` and `mailto:` links in header and footer; a call button in the desktop header.
8. Reviews band (real quotes, link to Google; no review schema); credentials row (only verifiable claims); written workmanship guarantee.

**P2: information architecture and templates**
9. Services overview plus 4 service pages using the C2 template (what's included, seasonal timeline, local-rules callout, FAQ).
10. Rebuild the 12 municipality pages to pass the swap test (local rules with sources and review date, local conditions, local proof); add an /areas/ hub with an SVG map.
11. Project case-study template with spec strip (no budgets), a filterable portfolio, and an accessible before/after with a side-by-side toggle.
12. Process page (maintenance track + installation track), an FAQ page, and an accessibility statement.
13. Disclosure-button menus (no `href="#"`), breadcrumbs, a helpful 404.

**P3: SEO hardening**
14. JSON-LD graph (business subtype + `areaServed` + `Service` + `BreadcrumbList`), one OG image per page, `og:locale` en_CA, `lang="en-CA"`.
15. Sitemap with git `lastmod`, robots.txt, `_redirects` for any changed URLs, build checks for H1 count, title uniqueness, encoding and filename-style alt text.
16. GBP alignment: categories, 12 service areas, matching NAP, a review-request link.

**P4: art direction and polish**
17. Seasonal photo shoot; an AVIF/WebP `srcset` pipeline in the SSG; EXIF GPS stripping; image licence records; no stock photos in /projects/.
18. Liquid Glass limited to chrome; solid content surfaces; fluid type scale; reduced-motion overrides; no loaders, sliders or autoplay.
19. Final regression: Lighthouse ≥ 95 ×4 on every template, 0 axe violations, manual VoiceOver/NVDA pass, 200% zoom and 320 px reflow check, CLS ≤ 0.05 on the slowest template.