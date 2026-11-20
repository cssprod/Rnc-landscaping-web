# RNC Landscaping website

Zero-dependency static site generator (plain Node 22 ESM) for the RNC Landscaping site. Output is `dist/`, deployed on Netlify.

## Commands (no npm install needed)
| Task | Command |
|---|---|
| Preview build (tokens highlighted, noindex) | `node build.mjs` |
| Build with SVG placeholders instead of stock photos | `node build.mjs --offline-images` |
| Production build (fails on tokens, samples, fixtures) | `CONTEXT=production node build.mjs` |
| Build and run all static checks | `node tools/check-all.mjs` |
| Serve `dist/` | `node tools/serve.mjs 4321` |
| Browser tests (global Playwright) | `CHROME=/usr/bin/google-chrome node $(npm root -g)/playwright/cli.js test` |
| Screenshots (390 and 1280 px) | `node tools/screenshots.mjs` |
| Typecheck (JSDoc) | `tsc -p jsconfig.json` |
| Regenerate event types | `node tools/gen-event-types.mjs` |

## Layout
- `build.mjs`: orchestrates CSS/JS bundling, routes, sitemap, robots, manifest, token checks.
- `site.config.mjs`: the one place bracket tokens (`[PHONE]` etc.) get real values.
- `src/lib`: `html.mjs` (escaping templates), `data.mjs` (loaders), `images.mjs`, `tokens.mjs`, `schema.mjs` (JSON-LD).
- `src/components`: layout/header/footer, ui, area map, forms. `src/pages/routes.mjs`: every URL.
- `src/styles/site.css` (after `brand/tokens.css`) and `src/scripts/main.js` (one deferred module, about 13 KB).
- `static/`: copied as-is (`admin/` CMS, `uploads/`, `downloads/`). `fixtures/`: sample data used only when `../content`, `../brand` or `../media` are empty.
- `integrations/google-sheet`: Apps Script and `SETUP.md`. `tools/`, `tests/`: quality tooling.

## Environments
`CONTEXT=production` means a live build: real values required, canonical URLs use `https://[DOMAIN]`, Plausible loads, robots allow indexing. Anything else (deploy previews, local) writes `Disallow: /`, `noindex`, an `X-Robots-Tag` header, relative canonicals, highlights tokens and shows a preview bar.

## Design decisions
- Testimonials are a static grid, not a carousel: no auto-motion to pause, every quote reachable by keyboard and screen reader.
- Mega-menu: the Services link stays a real link; a separate button toggles the panel (`aria-expanded`, Esc closes, focus returns). Without JS the panel opens on hover and focus-within, and the mobile menu is always expanded.
- No Review or AggregateRating schema while testimonials are samples.
- Quote form: one long form without JS; with JS a 4-step stepper with inline validation. Photos: 3 files, 5 MB each, 7.5 MB total (Netlify caps requests at 8 MB, 30 s upload timeout).
- CSP is set per section in `netlify.toml` (the inline JS-flag script is hash-pinned; `build.mjs` fails if the hash or a section is missing).

## Astro port notes
Pages in `routes.mjs` become `src/pages/*.astro` with `getStaticPaths`; `html``` templates become `.astro` components (`src/components/*`); `data.mjs` becomes content collections (JSON loaders, same schemas); `site.config.mjs` stays; `build.mjs` token pass becomes an integration using `astro:build:done`; `main.js` stays as a hoisted script.
