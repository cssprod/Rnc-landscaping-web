# RNC Landscaping website

Static showcase site for RNC Landscaping (Greater Victoria, BC), designed in a "Liquid Glass" system: full-bleed photography under translucent glass navigation and cards, Inter with optical sizing, a fir-green palette with light and dark appearances.

There is no backend, sign-in, CMS or form service. The quote form opens the visitor's own email app with the request written out.

- `site/`: zero-dependency Node 22 site generator, quality tools and tests (see `site/README.md`).
- `content/`: all page copy as JSON.
- `brand/`: logo, icons, self-hosted fonts, design tokens (`tokens.json` → `tokens.css`), brand guide (`brand.md`).
- `media/`: image slots and credits. `research/`: competitors, keywords, local facts.
- `CONTRACT.md`: shared spec (slugs, tokens, content formats).

Build: `cd site && node build.mjs`. Checks: `node tools/check-all.mjs`. Deploy: Netlify builds from `netlify.toml` (base `site`, publish `dist`).

Bracket placeholders (`[PHONE]` and so on) and `sample: true` content are intentional in the showcase edition and show as labelled chips. A launch build (`SITE_MODE=launch`) fails until they are replaced; see `site/LAUNCH-CHECKLIST.md`.
