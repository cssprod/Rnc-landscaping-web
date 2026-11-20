# RNC Landscaping website

Static marketing site for RNC Landscaping (Greater Victoria, BC).

- `site/`: zero-dependency Node 22 site generator, quality tools and tests (see `site/README.md`).
- `content/`: all page copy as JSON, edited through Decap CMS at `/admin`.
- `brand/`: logo, design tokens, brand voice. `media/`: image slots and credits. `research/`: competitors, keywords, local facts.
- `CONTRACT.md`: shared spec (slugs, tokens, content formats).

Build: `cd site && node build.mjs`. Checks: `node tools/check-all.mjs`. Launch steps: `site/LAUNCH-CHECKLIST.md`.

Bracket placeholders (`[PHONE]` and so on) and `sample: true` content are intentional. A production build fails until they are replaced.
