# Changelog

## 2026-11-21: Liquid Glass showcase edition
- New design system: DTCG design tokens (`brand/tokens.json` compiled by `brand/build-tokens.mjs`) with glass materials, an Apple-style fluid type ramp, concentric radii, spring motion, and light and dark appearances that pass WCAG 2.2 AA.
- New identity: squircle fir-and-hill mark, outlined Inter Display wordmark, favicon and home-screen icons.
- Typography: self-hosted Inter (optical sizes) and Newsreader italic for quotations, metric-matched fallback, automatic curly quotes and en dashes.
- Every template redrawn: floating glass navigation capsule with a frosted services panel and mobile sheet, full-bleed photographic heroes with a service dock, glass service tiles, bento cards, inset grouped lists, serif testimonials, credentials band, glass call-to-action band, segmented portfolio filters, glass before/after slider.
- Generated, labelled landscape illustrations for every image slot without a photo; each municipality has its own scene.
- Removed the backend and sign-in: no Netlify Forms, Google Sheet webhook, Decap CMS or Identity, no thanks page or preview bar. The quote form now opens the visitor's email app and shows a copyable summary.
- Showcase build by default (placeholders as chips, noindex); `SITE_MODE=launch` keeps the strict launch gate.
- Fixed the build reading `netlify.toml` from the wrong folder; one CSP for every path; content-hashed assets under `/assets/build/`.
- Budgets measured as gzip transfer size; new token check in `tools/check-all.mjs`.

## 2026-11-19
- Zero-dependency generator, 59 pages: home, 4 services, portfolio hub, 4 collections, 16 case studies, 13 areas, 6 resources, commercial, about, reviews, FAQ, quote, thanks, contact, legal, 404.
- Accessible mega-menu, mobile menu, filters, before/after slider, 4-step quote form, SVG area map.
- Quality tools, Playwright tests, CI workflow.
