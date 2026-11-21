# RNC Landscaping website

Zero-dependency static site generator (plain Node 22 ESM). Output is `dist/`, deployed on Netlify. No backend, sign-in, CMS or form service.

## Commands (no npm install needed)
| Task | Command |
|---|---|
| Showcase build (placeholders as chips, noindex) | `node build.mjs` |
| Build with illustrations instead of CDN photos | `node build.mjs --offline-images` |
| Launch build (fails on tokens, samples, fixtures) | `SITE_MODE=launch node build.mjs` |
| Build and run all static checks | `node tools/check-all.mjs` |
| Serve `dist/` | `node tools/serve.mjs 4321` |
| Browser tests (global Playwright) | `CHROME=/usr/bin/google-chrome npx playwright test` |
| Screenshots (390 and 1440 px, `--dark`, `--full`) | `node tools/screenshots.mjs --full` |
| Compile design tokens | `node ../brand/build-tokens.mjs` |
| Contrast check (light and dark) | `node ../brand/check-contrast.mjs` |
| Typecheck (JSDoc) | `tsc -p jsconfig.json` |
| Regenerate event types | `node tools/gen-event-types.mjs` |

## Layout
- `build.mjs`: compiles tokens, minifies CSS, renders routes, writes illustrations, sitemap, robots, manifest; checks CSP and tokens.
- `site.config.mjs`: the one place bracket tokens (`[PHONE]` etc.) get real values.
- `src/lib`: `html.mjs` (escaping templates, typographer), `data.mjs` (loaders), `images.mjs` (photos and illustration fallback), `art.mjs` (generated landscapes), `tokens.mjs`, `schema.mjs` (JSON-LD).
- `src/components`: `layout.mjs` (head, glass navigation capsule, footer), `sprite.mjs` (logo and icons), `ui.mjs`, `map.mjs`, `forms.mjs` (email-composing quote form). `src/pages/routes.mjs`: every URL.
- `src/styles/site.css` (after the compiled tokens) and `src/scripts/main.js` (one deferred module, about 5 KB gzip).
- `static/`: copied as-is (`downloads/` for the capability statement PDF). `fixtures/`: sample data used only when `../content`, `../brand` or `../media` are empty.

## Modes
The default build is the **showcase** edition: unconfirmed details show as placeholder chips, Sample items stay labelled, pages are `noindex`, `robots.txt` disallows crawling and a short note in the footer explains the placeholders. Netlify builds this for every context.

`SITE_MODE=launch` is the real launch: real values required, canonical URLs use `https://[DOMAIN]`, Plausible loads when `PLAUSIBLE DOMAIN` is set, robots allow indexing, and the build fails while any token, Sample item or fixture remains.

## Design system
Tokens come from `brand/tokens.json` (DTCG format) and are documented in `brand/brand.md`: glass materials (`--material-*`, `--glass-*`), an Apple-style type ramp (`--font-size-display` … `--font-size-caption`), concentric radii, spring motion, light and dark appearances. Glass turns solid under `prefers-reduced-transparency` and `prefers-contrast: more`; motion stops under `prefers-reduced-motion`.

Slots in `media/images.json` without a photo get a generated landscape illustration (`src/lib/art.mjs`), labelled "Illustration" or "Photo to come".

## Design decisions
- Testimonials are a static grid, not a carousel: every quote is reachable by keyboard and screen reader.
- Services panel: the Services link stays a real link; a separate button toggles the panel (`aria-expanded`, Esc closes, focus returns). Without JS the panel opens on hover and focus-within, and the mobile menu is always expanded.
- The navigation capsule draws its glass on a pseudo-element, so the capsule is not a backdrop root and its panel and mobile sheet can blur the page.
- No Review or AggregateRating schema while testimonials are samples; placeholder facts are left out of JSON-LD.
- Quote form: one long form without JS (submits text/plain to mailto:); with JS a 4-step stepper with inline validation that opens the visitor's email app and shows a copyable summary.
- One Content-Security-Policy for every path in `netlify.toml` (the inline JS-flag script is hash-pinned; `build.mjs` fails if the hash or the header is missing).
