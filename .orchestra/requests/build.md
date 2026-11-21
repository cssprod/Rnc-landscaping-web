# Requests from the W1 build stream

Each item names the owner. None of these blocks build's own gates; they are for the barrier or the next wave.

## For ia (W1)

1. **`site/tests/site.spec.mjs` reads `../dist`** (carry.json, build item 1). Import `DIST` from `../tools/lib.mjs`
   (it honours `SITE_DIST`) instead of `new URL('../dist/', import.meta.url)`, in this file and in the split e2e specs,
   so the suite tests the build that `serve.mjs` serves when `SITE_DIST` points elsewhere.
2. **`check-links --url-map=FILE`** (carry.json, build item 2): exit 1 when an explicitly named map file is missing.
   `check-links.mjs` is ia's file.
3. **`report()` is ready in `tools/lib.mjs`**: `report(tool, failures)` takes `{ rule, path, message }` objects and applies
   `.orchestra/baselines/<tool>.json` (CONTRACT §17). Plain strings still work (rule `unspecified`), so nothing breaks
   meanwhile. When `check-links`, `check-html`, `check-content` move onto it, pass the tool id (`'check-links'`) as the
   first argument so the baseline file name matches, and declare `export const RULES = [...]`.
4. **Route `sources[]`**: the sitemap `<lastmod>` is the latest git commit date of a route's `sources` (repo-relative
   files or directories, e.g. `['content/areas/oak-bay.json', 'site/src/pages/areas.mjs']`). The seed routes declare
   none, so all 57 sitemap rows use the build date today (one warning per build). Please declare them in the page
   families.
5. **Module scripts**: `env.assets.modules[name] = { src, deps[] }` exists (names `main`, `quote`, `projects`, `living`,
   `areas`, `lib-track`, `lib-prefs`); `env.assets.js` (main) and `env.assets.css` are unchanged. For `scripts: ['quote']`
   emit `<script type="module" src="${env.assets.modules.quote.src}">`. Emitting the `modulepreload` links yourself is
   optional: the build adds any missing one for every `<script type="module">` on a page, and skips those already present.
6. **Inline scripts**: the build now fails on any inline `<script>` (other than `application/ld+json`) that is not
   byte-equal to an `INLINE_SCRIPTS` entry whose hash is in the netlify.toml CSP. `layout.mjs` may keep `JS_FLAG`
   (ds-chrome deletes the alias in W2); nothing in build uses it any more.
7. **Sprite ids**: the logo's paint servers are now `logo-g`, `logo-s`, `logo-h`, `logo-c` (were `lt-*`), and the build
   keeps only the `<symbol>`s a page references (`href="#i-…"`, `href="#logo-…"`, `url(#…)`). A symbol referenced only
   from client-side JS would be dropped; reference it in the page HTML (e.g. inside a `<template>`).

## For ds-chrome (W2)

8. `main.js` still reads `matchMedia('(prefers-reduced-motion: reduce)')` for the pointer sheen and still statically
   imports `./quote.js` and `./projects.js` (both kept on purpose so W1 behaviour is byte-identical). CONTRACT §8/§12
   hand both to ds-chrome: use `motionOn()` / `onMotionChange()` from `lib/prefs.js` and drop the static imports once
   the routes load `scripts: ['quote' | 'projects']`.

## For the orchestrator (CONTRACT / brief notes for the W5 docs lane)

9. **Sprite saving is about 3.6 KB per page, not 14 KB** (measured over all 58 pages: 2.0–4.1 KB, mean 3.6 KB raw).
   The sprite is 19.2 KB, but the logo symbols (`logo-tile` 1.7 KB + `logo-word` 9.0 KB) are referenced by the header
   and footer of every page, so they can never be shaken out. A larger saving needs either coarser path precision in
   `site/src/components/brand-paths.mjs` (not build's file, and it would change pixels) or an external, cached logo SVG
   (a ds-chrome decision in W2).
10. **JS minification**: CONTRACT §12 names only the CSS minifier. Splitting `main.js` into four modules cost about 30 %
    in summed gzip (per-file overhead), so the build now also minifies JS conservatively
    (`site/src/lib/build/minify-js.mjs`: comments, indentation and blank lines only; every line break kept, strings,
    templates and regex literals verbatim). The page's JS graph is 4.9 KB gzip against 5.0 KB for the seed's single
    file. `--no-minify` turns off both minifiers. Please record this in CONTRACT §12/§14 in W5.
11. **Pre-marker `site/dist`**: the dist guard accepts an unmarked, non-empty directory only at the default path
    `site/dist` (never an `--out` or `SITE_DIST` path), and only when it has an old build's fingerprint (`index.html`,
    `sitemap.xml`, `robots.txt` and `assets/build/`), so existing checkouts keep building; it warns and writes the
    marker. Every other non-empty, unmarked directory is refused and left untouched (unit test `#dist-guard`). If the
    orchestrator prefers no exemption at all, delete `legacyDir` in `build.mjs`: `site/dist` is git-ignored, so a user
    can empty it by hand.
12. **Shallow clones**: `<lastmod>` falls back to the build date on a shallow clone (one warning). CI now checks out with
    `fetch-depth: 0`. If Netlify's clone is shallow for this site, the Deploy Preview sitemap carries the build date.
