#!/usr/bin/env node
// A1 architect generator: writes .orchestra/{ownership,url-map,legacy-css-map,traceability}.json and briefs/*.json
// Usage: node gen.mjs <repo> <current-urls.txt>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.argv[2];
const URLS = readFileSync(process.argv[3], 'utf8').trim().split('\n');
const OR = join(REPO, '.orchestra');
mkdirSync(join(OR, 'briefs'), { recursive: true });
const W = (f, o) => writeFileSync(join(OR, f), JSON.stringify(o, null, 2) + '\n');
const TODAY = '2026-11-21';

/* ------------------------------------------------------------------ url map */
const svcSlugs = ['grounds-maintenance', 'landscape-installation', 'irrigation', 'tree-vegetation'];
const family = (u) => {
  if (u === '/') return 't-home';
  if (/^\/services\//.test(u) || u === '/commercial/') return 't-services';
  if (/^\/areas\//.test(u)) return 't-areas';
  if (/^\/(portfolio|projects)\//.test(u)) return 't-projects';
  if (/^\/(about|faq|reviews|contact|process)\/$/.test(u)) return 't-company';
  if (/^\/(resources\/.*|privacy\/|terms\/|accessibility\/|404\.html)$/.test(u)) return 't-editorial';
  if (u === '/quote/' || u === '/free-quote/') return 'quote';
  if (u === '/styleguide/') return 'ds-comp';
  return '?';
};
const template = (u) => {
  if (u === '/') return 'home';
  if (u === '/services/') return 'services-hub';
  if (/^\/services\/[^/]+\/$/.test(u)) return 'service';
  if (u === '/commercial/') return 'commercial';
  if (u === '/areas/') return 'areas-hub';
  if (/^\/areas\/[^/]+\/$/.test(u)) return 'municipality';
  if (u === '/portfolio/' || u === '/projects/') return 'projects-hub';
  if (/^\/portfolio\/[^/]+\/$/.test(u)) return 'projects-hub (filtered)';
  if (/^\/(portfolio\/[^/]+|projects)\/[^/]+\/$/.test(u)) return 'case-study';
  if (u === '/resources/') return 'resources-hub';
  if (/^\/resources\/[^/]+\/$/.test(u)) return 'guide';
  if (['/privacy/', '/terms/'].includes(u)) return 'legal';
  if (u === '/accessibility/') return 'accessibility-statement';
  if (u === '/404.html') return '404';
  if (u === '/quote/' || u === '/free-quote/') return 'free-quote';
  return u.replace(/\//g, '') || 'page';
};
const entries = URLS.map((old) => {
  let nu = old, kind = 'kept';
  let m;
  if (old === '/portfolio/') { nu = '/projects/'; kind = 'moved'; }
  else if ((m = old.match(/^\/portfolio\/([^/]+)\/$/)) && svcSlugs.includes(m[1])) { nu = `/projects/?service=${m[1]}`; kind = 'retired'; }
  else if ((m = old.match(/^\/portfolio\/([^/]+)\/([^/]+)\/$/))) { nu = `/projects/${m[2]}/`; kind = 'moved'; }
  else if (old === '/quote/') { nu = '/free-quote/'; kind = 'moved'; }
  return { old, new: nu, status: kind === 'kept' ? 200 : 301, kind, template: template(nu.replace(/\?.*$/, '')), owner: family(nu.replace(/\?.*$/, '')) };
});
const added = [
  { new: '/process/', status: 200, kind: 'added', template: 'process', owner: 't-company', note: 'C1; stub in W1 (ia), full page W3 (t-company)' },
  { new: '/styleguide/', status: 200, kind: 'added', template: 'styleguide', owner: 'ds-comp', note: 'showcase builds only (D4): noindex, not in sitemap, never built when SITE_MODE=launch' },
];
const aliases = [
  { old: '/services/tree-vegetation-management/', new: '/services/tree-vegetation/', status: 301, kind: 'alias', note: 'blueprint C1 spelling of the slug; never published, redirect is a courtesy' },
];
const redirects = [...entries.filter((e) => e.status === 301), ...aliases];
const newUrls = [...new Set([...entries.map((e) => e.new.replace(/\?.*$/, '')), ...added.map((a) => a.new)])].sort();
W('url-map.json', {
  $comment: 'Every URL the current build emits (node build.mjs --offline-images, 58 pages) mapped to its C1 URL. status 301 rows become site/dist/_redirects lines via site/src/pages/redirects.mjs (W1 ia). Rules: exactly one hop, destination returns 200, trailing-slash tolerant, query destinations allowed (Netlify keeps them).',
  generatedOn: TODAY,
  source: 'site/dist from commit 8798346 (pre-redesign)',
  counts: { current: entries.length, kept: entries.filter((e) => e.kind === 'kept').length, moved: entries.filter((e) => e.kind === 'moved').length, retired: entries.filter((e) => e.kind === 'retired').length, added: added.length, aliases: aliases.length, newPages: newUrls.length },
  entries, added, aliases,
  redirectsFile: redirects.map((r) => `${r.old}  ${r.new}  301`),
  newSitemapExcludes: ['/404.html', '/styleguide/'],
});

/* ------------------------------------------------------------------ legacy css map */
const css = readFileSync(join(REPO, 'site/src/styles/site.css'), 'utf8').split('\n');
// [startLine, endLine, owner, label] — 1-based inclusive, in source order. Lines not listed are blank/comments carried with the next segment.
const base = [
  [1, 28, 'ds-core', 'header comment, base (reset, body, headings, focus, selection, .i, .vh, .note, skip link)'],
  [29, 39, 'ds-core', 'layout (.wrap, .section variants, main)'],
  [40, 47, 'ds-comp', 'section head + link-more (ui/heads, ui/actions)'],
  [48, 66, 'ds-core', 'glass materials (.glass-card, .glass-bar, .icon-tile, @supports fallback)'],
  [67, 82, 'living', 'aurora washes + .bento-band backdrop (replaced by living scenes)'],
  [83, 111, 'ds-comp', 'buttons, chips, placeholder chips, sample label'],
  [112, 121, 'living', 'media frame, media chips, credits (picture())'],
  [122, 193, 'ds-chrome', 'navigation capsule, mega panel, mobile sheet (+ its media queries)'],
  [194, 203, 'ds-chrome', 'breadcrumbs'],
  [204, 247, 'ds-comp', 'heroes, dock, page heads (ui/heads)'],
  [248, 262, 'ds-comp', 'service tiles (ui/cards)'],
  [263, 279, 'ds-comp', 'cards and grids (ui/cards, ui/projects)'],
  [280, 291, 'ds-comp', 'prose sections, item cards (ui/heads sections())'],
  [292, 294, 't-editorial', '.legal'],
  [295, 309, 'ds-comp', 'bento (ui/cards)'],
  [310, 320, 't-home', 'feature split (home)'],
  [321, 330, 'ds-comp', 'testimonials (ui/trust)'],
  [331, 340, 'ds-comp', 'deep bands, credentials (ui/trust)'],
  [341, 353, 'ds-comp', 'CTA band (ui/cta)'],
  [354, 375, 'ds-comp', 'inset lists, def-list, FAQ (ui/faq)'],
  [376, 385, 't-services', 'includes, steps (service template)'],
  [386, 393, 'ds-comp', 'seasons (ui/seasons)'],
  [394, 413, 'ds-comp', 'before/after (ui/projects beforeAfter)'],
  [414, 430, 't-areas', 'area map'],
  [431, 457, 't-areas', 'area pages: intro, facts, check-list, service-list, notes, source chips'],
  [458, 479, 't-projects', 'spec bar, case study, gallery'],
  [480, 489, 't-editorial', 'article date/media/body, prose, sources'],
  [490, 493, 't-company', 'owner block, capability row'],
  [494, 499, 't-company', 'contact cards'],
  [500, 569, 'quote', 'quote form, stepper, fields, choices, ready panel'],
  [570, 584, 't-projects', 'portfolio filters'],
  [585, 605, 'ds-chrome', 'footer'],
];
const late = [606, 650]; // responsive + dark-appearance blocks: split per selector owner, kept after every base segment
const tail = [
  [651, 670, 'ds-core', 'motion: keyframes, hero entrance, view() reveals, reduced-motion kill switch (→ 95-motion.css)'],
  [671, 677, 'ds-core', 'print (→ 99-print.css)'],
];
// selector prefix → owner, used for the late blocks and as a coverage check for the whole file
const prefixOwner = [
  [/^\.(tiles|tile)\b/, 'ds-comp'], [/^\.card-grid/, 'ds-comp'], [/^\.(prose-section|item-card)/, 'ds-comp'], [/^\.faq/, 'ds-comp'],
  [/^\.bento/, 'ds-comp'], [/^\.trust/, 'ds-comp'], [/^\.seasons?\b/, 'ds-comp'], [/^\.hero/, 'ds-comp'], [/^\.dock/, 'ds-comp'], [/^\.ba\b/, 'ds-comp'],
  [/^\.site-footer/, 'ds-chrome'], [/^\.contact-cards?/, 't-company'], [/^\.owner/, 't-company'],
  [/^\.includes/, 't-services'], [/^\.step__nav/, 'quote'], [/^\.(area-intro|area-map)/, 't-areas'],
  [/^\.(case__|spec-bar)/, 't-projects'], [/^\.(filters|segmented)/, 't-projects'], [/^\.quote-(page|aside)/, 'quote'],
  [/^\.feature-split/, 't-home'], [/^:root(:not\(\[data-theme="light"\]\)|\[data-theme="dark"\]) \.media--art/, 'living'],
  [/^:root:not\(\[data-theme="light"\]\) \.choice/, 'quote'], [/^:root:not\(\[data-theme="light"\]\) \.icon-tile/, 'ds-core'],
];
const ownerOf = (sel) => { for (const [re, o] of prefixOwner) if (re.test(sel.trim())) return o; return null; };
// parse late blocks into (media, selector, body) rules
const lateRules = []; const unowned = [];
let media = null;
for (let i = late[0]; i <= late[1]; i++) {
  const line = css[i - 1];
  if (/^\/\*/.test(line) || !line.trim()) continue;
  const mm = line.match(/^@media ([^{]+)\{/);
  if (mm) { media = mm[1].trim(); continue; }
  if (/^\}/.test(line)) { media = null; continue; }
  const r = line.trim().match(/^([^{]+)\{(.*)\}$/);
  if (!r) { unowned.push(`L${i}: unparsed`); continue; }
  for (const sel of r[1].split(/,(?![^(]*\))/)) {
    const o = ownerOf(sel);
    if (!o) unowned.push(`L${i}: ${sel.trim()}`);
    lateRules.push({ line: i, media, selector: sel.trim(), owner: o || 'ds-core', declarations: r[2].trim() });
  }
}
// build segments in order
const segs = [];
let seq = 0;
const push = (owner, from, to, label, extra = {}) => {
  const last = segs[segs.length - 1];
  if (last && last.owner === owner && !extra.split && !last.split && last.lines[1] + 1 >= from) { last.lines[1] = to; last.label += `; ${label}`; return; }
  seq++;
  segs.push({ seq, file: `site/src/styles/50-legacy-${String(seq).padStart(2, '0')}-${owner}.css`, owner, lines: [from, to], label, ...extra });
};
for (const [a, b, o, l] of base) push(o, a, b, l);
const lateOwners = [...new Set(lateRules.map((r) => r.owner))].sort();
for (const o of lateOwners) push(o, late[0], late[1], 'responsive + dark-appearance rules for this owner (selector-split, original media-query order kept)', {
  split: true, rules: lateRules.filter((r) => r.owner === o).map((r) => ({ line: r.line, media: r.media, selector: r.selector })),
});
for (const [a, b, o, l] of tail) push(o, a, b, l);
// coverage: every line 1..677 belongs to a segment
const covered = new Set();
for (const s of segs) for (let i = s.lines[0]; i <= s.lines[1]; i++) covered.add(i);
const missing = []; for (let i = 1; i <= css.length; i++) if (!covered.has(i) && css[i - 1].trim()) missing.push(i);
W('legacy-css-map.json', {
  $comment: 'W1 build splits site/src/styles/site.css into these slices, each wrapped in @layer legacy { } (legacy is the FIRST, lowest-priority layer declared in 00-layers.css). Concatenation is in file-name order, so the two-digit sequence reproduces the original source order exactly and the cascade is unchanged (acceptance: 0 px screenshot diff at 390 and 1440, dark and light). Split segments copy each listed selector rule into the owner slice inside its original @media wrapper; combined selector lists are split into one rule per selector (same specificity, same relative order). If a split rule causes any pixel diff, move it into 50-legacy-90-ds-core.css and record it here (ds-core re-homes it in W2). Each owner deletes its own slices once its new CSS replaces them; css-consolidator (W3b) proves none remain.',
  source: 'site/src/styles/site.css', sourceLines: css.length, generatedOn: TODAY,
  layerDecl: '@layer legacy, reset, base, layout, chrome, components, living, pages, utilities, motion, print;',
  fallbackSlice: 'site/src/styles/50-legacy-90-ds-core.css',
  coverage: { uncoveredNonBlankLines: missing, unownedSelectors: unowned },
  owners: Object.fromEntries([...new Set(segs.map((s) => s.owner))].sort().map((o) => [o, segs.filter((s) => s.owner === o).map((s) => s.file)])),
  segments: segs,
});

/* ------------------------------------------------------------------ streams */
const req = (id) => `.orchestra/requests/${id}.md`;
const slices = (o) => `site/src/styles/50-legacy-*-${o}.css`;
const ALWAYS_FORBIDDEN = ['CONTRACT.md', 'site/src/lib/head-scripts.mjs', '.orchestra/ownership.json', '.orchestra/briefs/**', '.orchestra/traceability.json', '.orchestra/url-map.json', '.orchestra/legacy-css-map.json', 'research/**', 'cedar-springs-teardown-blueprint.md'];
const FROZEN_AFTER_W1 = ['site/src/pages/routes.mjs', 'site/src/components/ui/index.mjs', 'site/site.config.mjs', 'content/site.json'];
const FROZEN_W3 = ['site/src/components/ui/actions.mjs', 'site/src/components/ui/heads.mjs', 'site/src/styles/40-ui-actions.css', 'site/src/styles/41-ui-heads.css', 'brand/tokens.json', 'brand/tokens.css', 'media/images.json', 'site/src/components/layout.mjs', 'site/src/components/living.mjs', 'site/src/pages/_shared.mjs'];

const S = {};
const def = (id, o) => { S[id] = { id, ...o }; };

/* W1 */
def('build', {
  waves: ['w1'], lens: 'Build-systems engineer (zero-dependency Node 22 SSG, cascade-preserving refactors, CSP)', port: { w1: 4411 },
  owns: { w1: ['site/build.mjs', 'site/src/lib/build/**', 'site/src/scripts/**', 'site/src/styles/**', 'site/src/components/sprite.mjs', 'site/tools/{csp,dev-setup,check-ownership,serve,lib,check-all,budgets,screenshots}.mjs', 'site/tests/unit/build-*.test.mjs', 'site/tests/fixtures/build/**', 'site/playwright.config.mjs', 'site/jsconfig.json', 'netlify.toml', '.github/workflows/ci.yml', '.gitignore', 'site/.gitignore', req('build')] },
  forbidden: ['content/**', 'site/src/pages/**', 'site/src/components/{layout,ui,map,forms,living}.mjs', 'site/src/components/ui/**', 'brand/**', 'media/**'],
  reads: ['site/build.mjs', 'site/src/styles/site.css', 'site/src/scripts/main.js', 'site/src/components/sprite.mjs', 'site/tools/**', 'netlify.toml', '.github/workflows/ci.yml', '.orchestra/legacy-css-map.json', 'CONTRACT.md §Build, §Modules, §CSS, §Head scripts'],
  deliverables: [
    '--out=DIR / SITE_DIST / PORT everywhere (build, check-all, serve, playwright.config, screenshots); dist guard: rmSync only a directory that is empty or contains .rnc-dist',
    'site/src/lib/build/minify-css.mjs: tokenizer-aware minifier (strings, url(), comments, custom-property values, @supports/@media conditions preserved) + golden tests in tests/fixtures/build + --no-minify',
    'CSS pipeline: auto-discover site/src/styles/*.css in name order, prepend tokens.css unlayered, 00-layers.css declares the layer order; site.css split into the 50-legacy-NN-<owner>.css slices of legacy-css-map.json; pre-registered empty stubs for every later CSS file (CONTRACT §CSS)',
    'JS: main.js split into main.js (chrome), lib/track.js (same track() API), lib/prefs.js (motionOn/onMotionChange/theme/onThemeChange + rnc:motion / rnc:theme events), quote.js, projects.js; stubs living.js, areas.js; module-graph hashing in dependency order (leaves first, import specifiers rewritten to hashed URLs), <link rel=modulepreload> for deps, env.assets.modules[name] = {src, deps[]}; no import map',
    'Inline scripts only from site/src/lib/head-scripts.mjs INLINE_SCRIPTS; build fails if any inline <script> in output is not in that list or its sha256 is missing from the netlify.toml CSP (replaces JS_FLAG check)',
    'Sprite tree-shaking: emit only the <symbol>s a page references (≈ -14 KB/page); namespaced ids i-* / logo-*',
    'sitemap <lastmod> from git log of each route\'s declared sources (fallback: build date + one warning on shallow clones)',
    'serve.mjs: applies dist/_redirects (301, trailing-slash tolerant, query destinations), dist/_headers and the netlify.toml [[headers]] (CSP included); MIME for avif/webp/jpg/jpeg/mjs',
    'tools/csp.mjs (--check: every INLINE_SCRIPTS hash present in netlify.toml, nothing extra), tools/dev-setup.mjs (symlinks site/node_modules/{playwright,playwright-core,@types/node} from /opt/node-tools, untracked; --devtools installs lighthouse@12 + axe-core@4 into $SCRATCH/devtools), tools/check-ownership.mjs (--stream --base --head against .orchestra/ownership.json), check-all discovers every tools/check-*.mjs',
    'tsc -p jsconfig.json green (fix TS2688 typeRoots); CI steps 1–3 green',
  ],
  extraAcceptance: [
    '0 px screenshot diff at 390 and 1440 (dark and light) between the pre-split build and the post-split build (tools/screenshots.mjs --compare)',
    'Two builds into different --out dirs in parallel do not interfere; build refuses to delete a non-dist directory',
    'Injected unhashed inline <script> → build error AND a CSP console error in Playwright via serve.mjs',
    'Minifier output parses identically (golden tests) and gz CSS within ±2 % of the old minifier',
    'Budgets within ±2 % of baseline except the sprite saving',
  ],
  verifierLens: 'Reproducibility sceptic: re-run in a clean worktree, parallel builds, fault-inject a stray inline script, diff screenshots pixel-for-pixel',
});
def('ia', {
  waves: ['w1'], lens: 'Information architect + SSG router engineer (C1, redirects, single source of truth)', port: { w1: 4412 },
  owns: { w1: ['site/src/pages/**', 'site/src/components/{layout,ui,map,forms,living}.mjs', 'site/src/components/ui/**', 'site/src/lib/{seo,schema,data,tokens,dates}.mjs', 'site/site.config.mjs', 'content/site.json', 'site/tools/{check-links,check-html,rewrite-links,check-content}.mjs', 'site/tools/schemas/**', 'site/tests/e2e/**', 'site/tests/helpers/**', 'site/tests/site.spec.mjs', 'site/tests/unit/ia-*.test.mjs', 'site/fixtures/**', req('ia')] },
  forbidden: ['content/{areas,projects,services,resources,testimonials,pages}/**', 'content/regional.json', 'site/src/styles/**', 'site/src/scripts/**', 'site/build.mjs', 'brand/**', 'media/**', 'netlify.toml'],
  reads: ['site/src/pages/routes.mjs', 'site/src/components/**', 'site/src/lib/**', 'site/site.config.mjs', 'content/**', 'site/tests/site.spec.mjs', '.orchestra/url-map.json', 'CONTRACT.md §URL map, §Content schemas v3, §Modules', 'site/COMPONENTS.md'],
  deliverables: [
    'Route families: site/src/pages/{_shared,home,services,areas,projects,company,editorial,quote,styleguide}.mjs + routes.mjs aggregator (frozen after W1; concatenates family exports in a fixed order); each route declares {path,file,render,sources[],scripts[]}',
    'C1 URLs: /projects/, /projects/{slug}/ (flat), /free-quote/, /process/ stub; routes read pg("projects") ?? pg("portfolio") and pg("process") ?? stub during the transition',
    'site/src/pages/redirects.mjs → dist/_redirects from .orchestra/url-map.json rules (one 301 per retired URL, no chains)',
    'site/src/lib/seo.mjs: headMeta(env, p) and jsonLd(env, p) — layout.mjs only calls them (logic moved, output identical except URLs)',
    'content/site.json (schema v3) as the single source of NAP, hours, services, municipalities, credentials and token values; site.config.mjs reads it; new tokens [REPLY TIME] (required), [GOOGLE PROFILE], [FOUNDED] (optional)',
    'C1 header: Services ▾ · Projects · Service areas ▾ · Process · About · [Call] [Free quote] with <button aria-expanded aria-controls> disclosures; C1 footer (4 services + commercial, 13 municipalities, NAP from site.json, hours, tel:/sms:/mailto:, Privacy/Terms/Accessibility/Google profile; no careers, no duplicates). Keep the literal strings <header class="site-header" and <footer class="site-footer"',
    'ui.mjs split mechanically into components/ui/{actions,heads,cards,projects,trust,faq,cta,seasons,callouts}.mjs + index.mjs (export * from each; frozen) — byte-identical HTML; callouts.mjs starts empty; components/living.mjs stub with the frozen livingScene/projectArt signatures returning ""',
    'layout.mjs: scripts:[] option reading env.assets.modules[name] = {src, deps[]} → <script type=module> + <link rel=modulepreload> per dep; main and living on every page; keep JS_FLAG alias (seed) untouched',
    'site/src/lib/dates.mjs: formatDate(iso) → "19 November 2026", timeEl(iso) → <time datetime>',
    'tools/rewrite-links.mjs (dry-run by default; --write is integrator-only; never run on content/ by a stream) + tools/check-content.mjs + tools/schemas/*.schema.json (content schema v3 validator: required fields, enum values, no budget/price keys, slug lint, link targets exist)',
    'tests split per owner into tests/e2e/{global,chrome,components,living,quote,projects,areas,home,services,company,editorial,redirects}.spec.mjs on the new URLs; tests/helpers/ for shared fixtures',
  ],
  extraAcceptance: [
    'Old sitemap vs new: every url-map 301 row resolves in one hop to a 200 (serve.mjs + check-links --strict-redirects)',
    'No orphan pages: every sitemap URL is reachable from header/footer/hub links',
    'HTML byte-identical to the pre-split build except URL changes, nav/footer and the moved seo calls (diff report attached)',
    'Strict check-links passes on a scratch copy with tools/rewrite-links.mjs --write applied',
  ],
  verifierLens: 'Crawler + screen-reader landmark auditor: old→new URL matrix, nav landmark names, disclosure semantics, orphan detection',
});
def('areas-content', {
  waves: ['w1', 'w2'], lens: 'Local-government researcher-editor (doorway-page avoidance, swap test, sourcing discipline)', port: { w1: 4413, w2: 4428 },
  owns: { w1: ['content/areas/**', 'content/regional.json', 'content/pages/areas.json', req('areas-content')], w2: ['content/areas/**', 'content/regional.json', 'content/pages/areas.json', req('areas-content')] },
  forbidden: ['site/**', 'content/{projects,services,resources,testimonials}/**', 'content/site.json', 'research/**'],
  reads: ['research/area-facts/*.json', 'research/area-sources.md', 'research/areas.json', '.orchestra/reports/content-audit.json', 'CONTRACT.md §Content schemas v3 (areas, regional)', 'content/projects/*.json (for proof references)'],
  deliverables: [
    '13 content/areas/<slug>.json files on schema v3: summary (place-specific), localRules[], conditions[], proof[], sharedRegional[] refs, servicesBlurb, topServices, neighbours, CTA area slug',
    'content/regional.json: ONE block per CRD-wide rule (watering stages, invasive species disposal, …) referenced by id; rendered once per page inside [data-shared]',
    'content/pages/areas.json hub copy on the new URLs only',
  ],
  extraAcceptance: [
    '≥ 3 genuinely local blocks per page: localRules (sourceUrl, excerpt, verify:true, reviewedOn only if fetched this session), sourced conditions, proof (project refs or job notes with sample:true)',
    'No sentence appears on two or more area pages outside the shared regional block (check-seo#cross-area-duplicates)',
    'Sooke covered (wells vs regional water, deer, salt spray, soils where sourced); never "no bylaw exists"',
    'Swap test: exchanging any two municipality names makes both pages false (13/13)',
  ],
  verifierLens: 'Adversarial swap-tester and source checker: open every sourceUrl excerpt, run the 78-pair swap test, hunt shared sentences',
});
def('content', {
  waves: ['w1', 'w2'], lens: 'Senior copy editor with an honesty lens (no invented facts, Canadian English, plain language)', port: { w1: 4414, w2: 4429 },
  owns: {
    w1: ['content/{projects,services,resources,testimonials}/**', 'content/pages/{404,about,accessibility,commercial,contact,faq,home,portfolio,projects,privacy,process,quote,resources,reviews,services,terms}.json', 'site/CONTENT-GUIDE.md', req('content')],
    w2: ['content/{projects,services,resources,testimonials}/**', 'content/pages/{404,about,accessibility,commercial,contact,faq,home,portfolio,projects,privacy,process,resources,reviews,services,terms}.json', 'site/CONTENT-GUIDE.md', req('content')],
  },
  forbidden: ['site/src/**', 'site/tools/**', 'content/areas/**', 'content/regional.json', 'content/site.json', 'content/pages/areas.json'],
  reads: ['.orchestra/reports/content-audit.json', 'content/**', 'CONTRACT.md §Hard rules, §Bracket tokens, §Content schemas v3', 'research/cedar-springs-teardown-blueprint.md A12, A13, C2, C5'],
  deliverables: [
    'Projects (16): challenge, approach[], result, season, scope tags, tags, sample plantPalette (labelled sample), no budgets; story[] kept only until W3 t-projects stops reading it',
    'Services (4): goodFitIf[3–5], perVisit table, seasonal table, faqs 5–6 each, localRulesRefs to regional blocks',
    'content/pages/process.json: overview (4 steps) + two tracks (maintenance, installation) with deliverables per step + guarantee built on [WARRANTY]',
    'content/pages/projects.json (replaces portfolio.json; portfolio.json removed once routes stop falling back)',
    'Resources (6): author {name:"[OWNER NAME]", org:"RNC Landscaping", url:"/about/"}, published = the existing real date, updated only when real',
    'content/pages/quote.json on the v3 six-input schema (W1 only; quote owns it from W2)',
    'Trust copy: [REPLY TIME] promise, "What happens next", credentials via tokens only, reviews band copy with [GOOGLE PROFILE]',
    'All /quote/ and /portfolio/ links in content left for the integrator codemod (do not hand-edit links)',
  ],
  extraAcceptance: [
    'No superlatives, prices, budgets or years-in-business claims (check-honesty); every sample carries sample:true',
    'Additive changes only: old fields removed only where the current templates tolerate it (build + e2e green)',
    'check-content passes schema v3 for every file',
  ],
  verifierLens: 'Honesty auditor: flags any real-seeming fact about RNC, invented numbers, superlatives, duplicated boilerplate',
});

/* W2 */
def('ds-core', {
  waves: ['w2'], lens: 'Design-token and accessibility engineer (DTCG, WCAG contrast maths, cascade layers)', port: { w2: 4421 },
  owns: { w2: ['brand/tokens.json', 'brand/tokens.css', 'brand/build-tokens.mjs', 'brand/check-contrast.mjs', 'site/src/styles/0?-*.css', 'site/src/styles/1?-*.css', 'site/src/styles/2?-*.css', 'site/src/styles/9?-*.css', slices('ds-core'), 'site/build.mjs', 'site/fixtures/brand/**', 'site/tests/unit/ds-core-*.test.mjs', req('ds-core')] },
  forbidden: ['content/**', 'site/src/components/**', 'site/src/scripts/**', 'site/src/styles/{3,4,6,7,8}?-*.css'],
  reads: ['DESIGN-DIRECTION.md', '.orchestra/direction/tokens-proposal.json', '.orchestra/direction/motion-policy.md', '.orchestra/direction/effects-approved.json', 'brand/**', 'CONTRACT.md §Attribute contract, §CSS'],
  deliverables: [
    'tokens.json: dark-first defaults ($extensions["ca.rnc.default"]:"dark"), light values under [data-theme=light]; C3 fluid type scale; glass minimum alphas; two-tone focus ring tokens; manifest colours as tokens',
    'check-contrast.mjs: every text/surface and focus/surface pair in both themes, solid fallbacks, glass worst cases over the art-palette extremes from tokens-proposal.json',
    '00-layers.css (layer order), 01-reset, 02-base, 03-type, 05-layout, 08-utilities, 95-motion.css (T0–T4 tiers, the only place besides tokens.css allowed to mention prefers-reduced-motion), 99-print.css',
    'prefers-reduced-transparency, prefers-contrast: more and forced-colors rules; build.mjs reads manifest/theme colours from tokens',
  ],
  extraAcceptance: [
    'Every surface has ≥ 1 ring colour ≥ 3:1 and the two ring colours are ≥ 3:1 against each other',
    'Without data-theme the page renders dark; [data-theme=light] renders light; no flash (HEAD_SCRIPT applies stored choice before paint)',
    'ds-core legacy slices deleted',
  ],
  verifierLens: 'Contrast mathematician: recompute every pair, test forced-colors and 200 % zoom, grep for stray prefers-reduced-motion',
});
def('ds-chrome', {
  waves: ['w2'], lens: 'Interaction engineer for navigation chrome (disclosure, dialogs-without-dialog, focus management, WCAG 2.4.11)', port: { w2: 4422 },
  owns: { w2: ['site/src/components/{layout,sprite}.mjs', 'site/src/scripts/main.js', 'site/src/scripts/lib/**', 'site/src/styles/30-chrome.css', slices('ds-chrome'), 'site/src/lib/tokens.mjs', 'site/tests/e2e/chrome.spec.mjs', 'site/tests/unit/ds-chrome-*.test.mjs', req('ds-chrome')] },
  forbidden: ['content/**', 'brand/**', 'site/src/components/ui/**', 'site/src/pages/**', 'site/src/lib/head-scripts.mjs'],
  reads: ['DESIGN-DIRECTION.md', '.orchestra/direction/motion-policy.md', 'CONTRACT.md §Attribute contract, §Analytics events', 'site/COMPONENTS.md §Chrome'],
  deliverables: [
    'Glass header; Services ▾ / Service areas ▾ disclosure menus; mobile sheet (inert background, Esc closes, focus returns, accordions); one nav DOM',
    'Sticky Call / Free-quote bar below 64em: each ≥ 48 px, env(safe-area-inset-bottom), hidden while [data-quote-form] is in view or the on-screen keyboard is open',
    'Theme and Animations toggles: <button aria-pressed> named "Dark theme" and "Animations", ≥ 44×44, visible at every width, persisted (rnc-theme / rnc-motion), circular view-transition reveal, updates meta theme-color',
    'tel:/sms:/mailto: in header and footer (telLink/mailLink/smsLink in lib/tokens.mjs); desktop header call button',
    'scroll-padding-top/bottom = header and bar heights (2.4.11); lib/prefs.js + lib/track.js final',
    'Delete the seed-time JS_FLAG alias from layout.mjs (build.mjs no longer imports it after W1); rename data-track values to the CONTRACT §13 names in layout/tokens.mjs',
  ],
  extraAcceptance: ['Keyboard-only pass: no focused element fully obscured by header or bar at 320–1440', 'ds-chrome legacy slices deleted'],
  verifierLens: 'Keyboard and screen-reader tester: Tab through every page width, Esc paths, focus return, aria-pressed state persistence across reloads',
});
def('ds-comp', {
  waves: ['w2'], lens: 'Component-library engineer (frozen APIs, container queries, accessible markup patterns)', port: { w2: 4423 },
  owns: { w2: ['site/src/components/ui/{actions,heads,cards,projects,trust,faq,cta,seasons,callouts}.mjs', 'site/src/styles/{40,41,42,43,44,46,47,48,49}-ui-*.css', 'site/src/styles/80-styleguide.css', slices('ds-comp'), 'site/src/pages/styleguide.mjs', 'site/COMPONENTS.md', 'site/tests/unit/ui-api.test.mjs', 'site/tests/unit/ds-comp-*.test.mjs', 'site/tests/e2e/components.spec.mjs', req('ds-comp')] },
  forbidden: ['content/**', 'brand/**', 'site/src/components/ui/index.mjs', 'site/src/components/{layout,living,map,forms}.mjs', 'site/src/pages/{home,services,areas,projects,company,editorial,quote,routes,_shared}.mjs'],
  reads: ['site/COMPONENTS.md', 'DESIGN-DIRECTION.md', '.orchestra/direction/effects-approved.json', 'CONTRACT.md §Components, §Attribute contract'],
  deliverables: [
    'Every C3 primitive in COMPONENTS.md implemented with the frozen API: hero with living-scene slot, numbered section heads, spec strip, tiles, spotlight bento card, timeline, review card + reviews band, credentials row, local-rules callout with last-reviewed date, shared-regional block, guarantee, reassurance strip, FAQ <details>, living CTA band, fallback contact panel, in-page TOC',
    'Container-query reflow at 320 px for every card/tile; paired 4x-ui-*.css files',
    'tests/unit/ui-api.test.mjs snapshot of every export and parameter name (fails on removal; additive optional params allowed)',
    '/styleguide/ (noindex, not in sitemap, showcase builds only) rendering every primitive in both themes',
  ],
  extraAcceptance: ['No primitive emits a heading level the caller did not choose; one H1 rule untouched', 'ds-comp legacy slices deleted'],
  verifierLens: 'API contract auditor: diff exports against COMPONENTS.md, axe every styleguide specimen at 320 and 1440 in both themes',
});
def('living', {
  waves: ['w2'], lens: 'Generative-SVG artist + rendering-performance engineer (composited-only animation, deterministic output)', port: { w2: 4424 },
  owns: { w2: ['site/src/lib/{art,images}.mjs', 'site/src/components/living.mjs', 'site/src/styles/45-living.css', slices('living'), 'site/src/scripts/living.js', 'media/images.json', 'media/shot-list.md', 'media/photos/**', 'media/photos.json', 'site/static/img/**', 'site/tools/process-images.mjs', 'site/fixtures/media/**', 'site/tests/unit/living-*.test.mjs', 'site/tests/e2e/living.spec.mjs', req('living')] },
  forbidden: ['content/**', 'brand/tokens.json', 'site/src/components/ui/**', 'site/src/pages/**'],
  reads: ['DESIGN-DIRECTION.md', '.orchestra/direction/effects-approved.json', '.orchestra/direction/motion-policy.md', '.orchestra/reports/effects-lab.json', 'CONTRACT.md §Attribute contract, §Living art'],
  deliverables: [
    'livingScene(id, o) / projectArt(project, o) / illustrationChip(): layered theme-reactive scenes (night bioluminescent, light dawn), 13 distinct area scenes, per-project art so /projects/ has no stock photos',
    'Layers are separate OUTER <svg> boxes animated by transform/opacity only; living.js sets data-alive after load + idle when motion is on, pauses off-screen (IntersectionObserver) and on hidden tabs via --alive-play',
    'Cursor spotlight (T3, fine pointer only) and rationed @property borders in living.js / 45-living.css',
    '<picture> AVIF/WebP/JPEG at 480/768/1024/1600 via tools/process-images.mjs (sharp from scratch, EXIF stripped, licence manifest media/photos.json)',
    'media/images.json pre-allocates every slot (per-project art, process-hero); unknown slots still render labelled art',
  ],
  extraAcceptance: ['Deterministic bytes (two builds identical), namespaced ids lv-*, hero scene ≤ 16 KB raw, aria-hidden "Illustration" chip', 'No infinite animation runs with motion off or without JS', 'living legacy slices deleted'],
  verifierLens: 'Frame-budget profiler: 4× CPU throttle traces, Lighthouse delta, motion-audit with motion off/on, determinism diff',
});
def('seo', {
  waves: ['w2'], lens: 'Technical SEO engineer (schema.org graphs, Google policies on self-serving reviews and doorway pages)', port: { w2: 4425 },
  owns: { w2: ['site/src/lib/{schema,seo}.mjs', 'site/src/pages/redirects.mjs', 'site/tools/{check-seo,og-cards}.mjs', 'site/static/og/**', 'site/tests/unit/seo-*.test.mjs', 'site/tests/e2e/redirects.spec.mjs', req('seo')] },
  forbidden: ['content/**', 'site/src/components/**', 'site/src/styles/**'],
  reads: ['CONTRACT.md §URL map, §Schema', '.orchestra/url-map.json', 'research/cedar-springs-teardown-blueprint.md C6, A9, A13'],
  deliverables: [
    'C6 @graph per page with @ids: HomeAndConstructionBusiness, WebSite, WebPage, Service, BreadcrumbList, FAQPage (semantic only), Article with author; areaServed 13 places, hasOfferCatalog 4 services; placeholders omitted; no Review/AggregateRating',
    'og:locale en_CA, og:type website (article for guides), per-page OG image with fallback',
    'check-seo.mjs rules: h1-count, title-meta (≤60 / ≤160, unique), double-encoding, alt-filename, slug-lint, sentence-case, canonical, repeated-text, decorative-duplicate, cross-area-duplicates ([data-shared] exempt), internal-links, breadcrumbs, time-format, technical',
    'tools/og-cards.mjs ready (cards rendered in W5)',
  ],
  extraAcceptance: ['Unit tests snapshot the graph for home, a service, an area, a project and a guide'],
  verifierLens: 'Rich-results validator mindset: parse every JSON-LD block, check @id references resolve, look for invented values',
});
def('quote', {
  waves: ['w2'], lens: 'Conversion-form engineer (progressive enhancement, mailto encoding, accessible validation)', port: { w2: 4426 },
  owns: { w2: ['site/src/components/forms.mjs', 'site/src/scripts/quote.js', 'site/src/styles/70-quote.css', slices('quote'), 'site/src/pages/quote.mjs', 'content/pages/quote.json', 'site/event-schema.yaml', 'site/event-schema.d.ts', 'site/tools/gen-event-types.mjs', 'site/tests/unit/quote-*.test.mjs', 'site/tests/e2e/quote.spec.mjs', req('quote')] },
  forbidden: ['site/src/components/{layout,ui}/**', 'site/src/components/layout.mjs', 'brand/**'],
  reads: ['REDESIGN-PLAN.md §Quote builder', 'CONTRACT.md §quote.json, §Analytics events', 'research/cedar-springs-teardown-blueprint.md C2 Free quote, C5'],
  deliverables: [
    'Six inputs: services (4 multi-select cards), municipality <select> of 13 (+ "somewhere else"), description, timing (ASAP / this season / planning ahead), name, best way to reach you (email / call / text; phone field appears and becomes required for call or text)',
    '?area= / ?service= prefill; form action = mailto (method=post enctype=text/plain) so it works without JS; subject "Free quote request — X — Y"; URL body ≤ 1,800 chars (truncate + tell them to paste the copied full text)',
    'Ready panel: Copy request (role=status confirmation), address + copy button, Call / Text (only when PHONE known), Gmail / Outlook web compose links',
    'Native validation + inline errors (aria-describedby) + error summary on submit; values never cleared; sessionStorage draft',
    'Plausible events (CONTRACT §Analytics events) with no personal data; pure builder functions exported from quote.js and unit-tested',
  ],
  extraAcceptance: ['Free-quote page order: H1 → reassurance strip ([REPLY TIME]) → builder → What happens next (3) → alternative contacts → privacy note', 'quote legacy slices deleted'],
  verifierLens: 'Mail-client pessimist: length caps, encoding of non-ASCII, no-JS submit, back-navigation draft restore, screen-reader error flow',
});
def('qa', {
  waves: ['w2'], lens: 'QA tooling engineer (Playwright, axe, Lighthouse, fault injection)', port: { w2: 4427 },
  owns: { w2: ['site/playwright.config.mjs', 'site/tests/helpers/**', 'site/tests/e2e/global.spec.mjs', 'site/tools/{a11y,lighthouse,measure,motion-audit,text-over-media,check-honesty,check-motion-policy,budgets,screenshots,check-all,check-html,check-links,check-placeholders,check-tokens,check-content,check-ownership,serve,lib,csp,dev-setup}.mjs', 'site/tools/schemas/**', 'site/lighthouserc.json', '.github/workflows/ci.yml', 'netlify.toml', 'site/tests/unit/qa-*.test.mjs', req('qa')] },
  forbidden: ['content/**', 'site/src/**', 'brand/**'],
  reads: ['.orchestra/traceability.json', 'CONTRACT.md §Gates, §Budgets', '.orchestra/direction/motion-policy.md'],
  deliverables: [
    'global.spec: every page 200, one H1, no console/CSP errors in both themes, no horizontal overflow at 320 px, 200 % zoom',
    'a11y.mjs (axe injected via bypassCSP context only; wcag2a/2aa/21aa/22aa; themes × widths × motion), lighthouse.mjs (median of 3, benchmarkIndex guard), measure.mjs, motion-audit.mjs, text-over-media.mjs, check-honesty.mjs, check-motion-policy.mjs (lint), budgets v2, screenshot matrix',
    'CI on the new URLs; serve.mjs-based Playwright so the real CSP is enforced',
  ],
  extraAcceptance: ['Fault injection in a scratch copy: an a11y bug, a CSP violation, a 320 px overflow and a stock photo on /projects/ are all caught'],
  verifierLens: 'Mutation tester: seed faults, confirm each tool fails loudly and names the page',
});

/* W3 */
const fam = (id, lens, page, cssn, extra, port, ext = {}) => def(id, {
  waves: ['w3'], lens, port: { w3: port },
  owns: { w3: [`site/src/pages/${page}.mjs`, `site/src/styles/${cssn}.css`, slices(id), `site/tests/e2e/${page}.spec.mjs`, `site/tests/unit/${id}-*.test.mjs`, ...extra, req(id)] },
  forbidden: ['content/**', 'brand/**', ...FROZEN_W3, 'site/src/pages/{routes,_shared}.mjs'],
  reads: ['DESIGN-DIRECTION.md', 'site/COMPONENTS.md', 'CONTRACT.md', 'research/cedar-springs-teardown-blueprint.md C2', ...(ext.extraReads || [])],
  verifierLens: 'Art director + blueprint auditor: C2 section order, both themes at 5 widths, motion on/off, no-JS',
  ...ext,
});
fam('t-home', 'Art-directed template builder: Home', 'home', '60-home', ['site/src/components/ui/{cards,cta}.mjs', 'site/src/styles/{42-ui-cards,47-ui-cta}.css'], 4431, {
  deliverables: ['C2 Home sections 1–10: living split hero (H1 + CTAs, scene slot), four service tiles, featured project spec strip (no budget), 4-step timeline, reviews band with Google link, local-rules teaser, area map + list, short FAQ (4), living CTA band, footer', 'Remove the routes.mjs:64 regex hack (feature now lives in home.mjs)'],
  extraAcceptance: ['H1 is the LCP element; no reveal animation on it', 't-home legacy slices deleted'], extraReads: ['content/pages/home.json', 'content/pages/process.json', 'content/projects/*.json', 'content/testimonials/*.json', 'content/regional.json'],
});
fam('t-services', 'Art-directed template builder: Services + Commercial', 'services', '61-services', ['site/src/components/ui/{seasons,callouts}.mjs', 'site/src/styles/{48-ui-seasons,49-ui-callouts}.css'], 4432, {
  deliverables: ['Services hub + 4 service pages: H1 with local context → What\'s included → Good fit if… → per-visit table → seasonal timeline → process → related projects → local-rules callout → FAQ 5–6 → CTA; sticky in-page TOC on desktop', 'Commercial page with operational proof points and no invented numbers'],
  extraAcceptance: ['Reviews band on every service page with the Google profile link (A13#11, shared with t-home)', 'Every service page links to all 13 municipality pages (C1 internal linking)', 't-services legacy slices deleted'], extraReads: ['content/services/*.json', 'content/pages/{services,commercial}.json', 'content/regional.json'],
});
fam('t-areas', 'Art-directed template builder: Service areas + interactive map', 'areas', '62-areas', ['site/src/components/map.mjs', 'site/src/scripts/areas.js'], 4433, {
  deliverables: ['/areas/ hub with an interactive glowing SVG map + list (ONE keyboard path: the list; tiles tabindex=-1, state mirrored via :has())', '13 municipality pages: H1 "Landscaping in X" → place summary → Local rules that affect your yard (sources, last-reviewed date) → conditions → most-requested services and why → local proof → shared regional block [data-shared] → neighbouring municipalities → CTA /free-quote/?area=<slug>'],
  extraAcceptance: ['Each municipality links to the 4 services and to 1–3 projects in that municipality when they exist', 'Map hover/focus glow only while active; ambient pulse on the current area is T2 (var(--alive-play))', 't-areas legacy slices deleted'], extraReads: ['content/areas/*.json', 'content/regional.json', 'content/pages/areas.json', 'research/area-facts/*.json'],
});
fam('t-projects', 'Art-directed template builder: Projects + case studies', 'projects', '63-projects', ['site/src/components/ui/projects.mjs', 'site/src/styles/43-ui-projects.css', 'site/src/scripts/projects.js'], 4434, {
  deliverables: ['/projects/ filters by service × municipality (GET form; works without JS, shows all) with a same-document View Transition', 'Case study: hero (project art) → spec strip (municipality, service, season, duration, scope tags, plant palette) → Challenge / Approach / Result → gallery with keyboard before/after + side-by-side toggle → client quote if real → related → CTA'],
  extraAcceptance: ['No stock photo anywhere under /projects/ (check-honesty)', 'Every project links back to its service and municipality', 'Stop reading story[] (content stream may then drop it)', 't-projects legacy slices deleted'], extraReads: ['content/projects/*.json', 'content/pages/projects.json', 'content/testimonials/*.json'],
});
fam('t-company', 'Art-directed template builder: Process, About, FAQ, Reviews, Contact', 'company', '64-company', ['site/src/components/ui/{trust,faq}.mjs', 'site/src/styles/{44-ui-trust,46-ui-faq}.css'], 4435, {
  deliverables: ['/process/ with maintenance and installation tracks and deliverables per step + guarantee', '/about/ (named owner token, 3–6 people max, credentials row tokens only), /faq/ grouped, /reviews/ (labelled Sample, Google link, no review schema), /contact/ with fallback contact panel'],
  extraAcceptance: ['No Review or AggregateRating markup anywhere (check-honesty)', 't-company legacy slices deleted'], extraReads: ['content/pages/{process,about,faq,reviews,contact}.json', 'content/testimonials/*.json', 'content/site.json'],
});
fam('t-editorial', 'Editorial template builder: guides, legal, accessibility statement, 404', 'editorial', '65-editorial', [], 4436, {
  deliverables: ['Resources hub + 6 guides with byline "[OWNER NAME], RNC Landscaping" → /about/, published/updated <time> shown as "19 November 2026", reading progress (T1, motion policy)', 'Privacy, terms, accessibility statement (WCAG 2.2 AA, voluntary under Accessible BC; documents the Dark theme and Animations toggles)', 'Helpful 404 with search-style links to hubs'],
  extraAcceptance: ['t-editorial legacy slices deleted'], extraReads: ['content/resources/*.json', 'content/pages/{resources,privacy,terms,accessibility,404}.json'],
});
def('css-consolidator', {
  waves: ['w3', 'w3b'], lens: 'CSS architect (cascade layers, dead-code removal, pixel-diff discipline)', port: { w3: 4437, w3b: 4437 },
  owns: { w3: ['site/tools/check-css.mjs', 'site/tests/unit/css-*.test.mjs', req('css-consolidator')], w3b: ['site/src/styles/**', 'site/tools/check-css.mjs', 'site/tests/unit/css-*.test.mjs', req('css-consolidator')] },
  forbidden: ['content/**', 'site/src/components/**', 'site/src/pages/**', 'site/src/scripts/**', 'brand/**'],
  reads: ['.orchestra/legacy-css-map.json', '.orchestra/direction/motion-policy.md', 'CONTRACT.md §CSS'],
  deliverables: ['w3 (parallel with families): tools/check-css.mjs — no 50-legacy-* files, no duplicate selectors across files, every animation/transition routed through the motion policy custom properties, prefers-reduced-motion only in tokens.css/95-motion.css, layer declared in every file', 'w3b (exclusive lock after the family merges): delete leftover legacy slices, dedupe, consolidate'],
  extraAcceptance: ['≤ 0.1 % pixel diff across the screenshot matrix before/after w3b', 'CSS gz per page ≤ 28 KB warn / 36 KB fail'],
  verifierLens: 'Cascade forensics: per-selector diff of computed styles across the screenshot matrix',
});

/* W4 / W5 (ownership only; briefs are written by the W4 triage and W5 lanes) */
const w4 = {
  'w4-evidence': ['.orchestra/reports/w4/**'],
  'w4-triage': ['.orchestra/tickets/**', '.orchestra/carry.json'],
  'fix-system': ['brand/tokens.json', 'brand/tokens.css', 'brand/check-contrast.mjs', 'brand/build-tokens.mjs', 'site/build.mjs', 'site/src/lib/{tokens,data,html,dates}.mjs', 'site/src/components/{layout,sprite}.mjs', 'site/src/components/ui/{actions,heads}.mjs', 'site/src/scripts/main.js', 'site/src/scripts/lib/**', 'site/src/styles/{0,1,2,9}?-*.css', 'site/src/styles/30-chrome.css', 'site/src/styles/{40-ui-actions,41-ui-heads}.css', 'site/tests/e2e/chrome.spec.mjs'],
  'fix-features': ['site/src/lib/{art,images,schema,seo}.mjs', 'site/src/components/{living,forms}.mjs', 'site/src/scripts/{living,quote}.js', 'site/src/styles/{45-living,70-quote,80-styleguide}.css', 'site/src/pages/{quote,styleguide,redirects}.mjs', 'site/src/components/ui/{cards,cta,seasons,callouts,trust,faq,projects}.mjs', 'site/src/styles/{42,43,44,46,47,48,49}-ui-*.css', 'media/**', 'site/static/**', 'site/event-schema.*', 'site/tests/e2e/{quote,living,components,redirects}.spec.mjs'],
  'fix-pages': ['site/src/pages/{home,services,areas,projects,company,editorial}.mjs', 'site/src/styles/6?-*.css', 'site/src/components/map.mjs', 'site/src/scripts/{areas,projects}.js', 'site/tests/e2e/{home,services,areas,projects,company,editorial}.spec.mjs'],
  'fix-qa': ['site/tools/**', 'site/tests/helpers/**', 'site/tests/e2e/global.spec.mjs', 'site/tests/unit/**', 'site/playwright.config.mjs', 'site/lighthouserc.json', 'site/jsconfig.json', '.github/workflows/ci.yml', 'netlify.toml'],
  'fix-content': ['content/{areas,projects,services,resources,testimonials,pages}/**', 'content/regional.json'],
};
const w5 = {
  'og-render': ['site/static/og/**'],
  docs: ['README.md', 'site/README.md', 'CONTRACT.md', 'REDESIGN-PLAN.md', 'TRACEABILITY.md', 'site/CHANGELOG.md', 'site/LAUNCH-CHECKLIST.md', 'site/CONTENT-GUIDE.md', 'site/COMPONENTS.md', 'brand/brand.md', 'DESIGN-DIRECTION.md'],
  ci: ['.github/workflows/ci.yml', 'site/lighthouserc.json', 'site/playwright.config.mjs', 'netlify.toml'],
  'release-gate': [],
};
const w0 = {
  a1: ['CONTRACT.md', 'REDESIGN-PLAN.md', 'site/COMPONENTS.md', '.orchestra/{ownership,url-map,legacy-css-map,traceability}.json', '.orchestra/briefs/**', '.orchestra/tools/**', '.orchestra/requests/a1.md'],
  'art-direction': ['.orchestra/direction/**', 'DESIGN-DIRECTION.md'],
  reports: ['.orchestra/reports/**'],
  r1: ['research/area-facts/**', 'research/area-sources.md'],
};

/* ------------------------------------------------------------------ ownership.json */
const waves = { w0: {}, w1: {}, w2: {}, w3: {}, w3b: {}, w4: {}, w5: {} };
for (const [k, v] of Object.entries(w0)) waves.w0[k] = { owns: [...new Set([...v, req(k)])], forbidden: ['site/src/**', 'content/**'] };
for (const s of Object.values(S)) for (const w of s.waves) waves[w][s.id] = { owns: s.owns[w], forbidden: [...new Set([...ALWAYS_FORBIDDEN, ...(w !== 'w1' ? FROZEN_AFTER_W1 : []), ...s.forbidden])].filter((g) => !s.owns[w].includes(g)) };
for (const [k, v] of Object.entries(w4)) waves.w4[k] = { owns: [...v, req(k)], forbidden: [...ALWAYS_FORBIDDEN, ...FROZEN_AFTER_W1] };
for (const [k, v] of Object.entries(w5)) waves.w5[k] = { owns: [...v, req(k)], forbidden: k === 'docs' ? ['site/src/lib/head-scripts.mjs', 'content/**', 'site/src/**'] : [...ALWAYS_FORBIDDEN] };
const planned = [
  // build + lib
  'site/src/lib/head-scripts.mjs', 'site/src/lib/seo.mjs', 'site/src/lib/dates.mjs', 'site/src/lib/build/minify-css.mjs', 'site/src/lib/build/modules.mjs', 'site/src/lib/build/sprite-shake.mjs', 'site/src/lib/build/lastmod.mjs', 'site/src/lib/build/dist-guard.mjs',
  ...['_shared', 'home', 'services', 'areas', 'projects', 'company', 'editorial', 'quote', 'styleguide', 'redirects', 'routes'].map((p) => `site/src/pages/${p}.mjs`),
  ...['index', 'actions', 'heads', 'cards', 'projects', 'trust', 'faq', 'cta', 'seasons', 'callouts'].map((p) => `site/src/components/ui/${p}.mjs`), 'site/src/components/living.mjs',
  ...['main', 'quote', 'projects', 'living', 'areas'].map((p) => `site/src/scripts/${p}.js`), 'site/src/scripts/lib/track.js', 'site/src/scripts/lib/prefs.js',
  ...['00-layers', '01-reset', '02-base', '03-type', '05-layout', '08-utilities', '30-chrome', '40-ui-actions', '41-ui-heads', '42-ui-cards', '43-ui-projects', '44-ui-trust', '45-living', '46-ui-faq', '47-ui-cta', '48-ui-seasons', '49-ui-callouts', '60-home', '61-services', '62-areas', '63-projects', '64-company', '65-editorial', '70-quote', '80-styleguide', '95-motion', '99-print', '50-legacy-90-ds-core'].map((p) => `site/src/styles/${p}.css`),
  ...segs.map((s) => s.file),
  ...['csp', 'dev-setup', 'check-ownership', 'rewrite-links', 'check-content', 'check-seo', 'og-cards', 'process-images', 'a11y', 'lighthouse', 'measure', 'motion-audit', 'text-over-media', 'check-honesty', 'check-motion-policy', 'check-css'].map((t) => `site/tools/${t}.mjs`), 'site/tools/schemas/project.schema.json',
  ...['global', 'chrome', 'components', 'living', 'quote', 'projects', 'areas', 'home', 'services', 'company', 'editorial', 'redirects'].map((p) => `site/tests/e2e/${p}.spec.mjs`),
  ...['build-minify', 'ia-routes', 'ui-api', 'ds-comp-markup', 'ds-core-tokens', 'ds-chrome-prefs', 'seo-graph', 'quote-builder', 'living-scenes', 'qa-tools', 'css-lint', 't-home-sections', 't-areas-map'].map((p) => `site/tests/unit/${p}.test.mjs`), 'site/tests/helpers/server.mjs', 'site/tests/fixtures/build/strings.css',
  'content/site.json', 'content/regional.json', 'content/pages/process.json', 'content/pages/projects.json', 'media/photos.json', 'media/photos/home-hero.jpg', 'site/static/og/home.jpg', 'site/static/img/home-hero-480.avif', 'site/lighthouserc.json',
  'DESIGN-DIRECTION.md', 'TRACEABILITY.md', 'research/area-facts/oak-bay.json', 'research/area-sources.md', '.orchestra/direction/P1.md', '.orchestra/reports/effects-lab.json', '.orchestra/reports/w4/axe.json', '.orchestra/tickets/T001.json', '.orchestra/carry.json',
  ...Object.values(waves).flatMap((w) => Object.keys(w)).map(req),
];
W('ownership.json', {
  $comment: 'Exclusive write sets per wave. A stream may write ONLY paths matched by its owns globs (and must not write anything matched by forbidden, which lists hazards explicitly; everything not owned is forbidden). site/tools/check-ownership.mjs --stream=<id> --base=<sha> --head=<branch> enforces this before every merge. Globs: ** any depth, * one segment, ? one char, {a,b} alternatives. Owners change only at wave barriers. w3b is the css-consolidator lock that runs after the W3 family merges (its own barrier). Integrator-only (never a stream): tools/rewrite-links.mjs --write, regenerating brand/tokens.css after merges, .orchestra/carry.json outside W4, tags and pushes.',
  version: 3, generatedOn: TODAY,
  globSyntax: { '**': 'zero or more path segments', '*': 'any chars except /', '?': 'one char except /', '{a,b}': 'alternatives (may contain globs)' },
  seedOnly: ['site/src/lib/head-scripts.mjs'],
  integratorOnly: ['brand/tokens.css (regeneration after merges)', 'tools/rewrite-links.mjs --write (link codemod over content/** and site/src/**)', 'git tags wave-<n>-int', 'pushes to ccr-384bdb88-mx8gtv'],
  frozen: { always: ALWAYS_FORBIDDEN, afterW1: FROZEN_AFTER_W1, w3: FROZEN_W3 },
  mergeOrder: { w1: ['build', 'ia', 'areas-content', 'content', 'codemod'], w2: ['ds-core', 'ds-chrome', 'ds-comp', 'living', 'seo', 'quote', 'qa', 'areas-content', 'content', 'codemod'], w3: ['t-editorial', 't-company', 't-services', 't-areas', 't-projects', 't-home', 'css-consolidator'], w3b: ['css-consolidator'] },
  waves,
  plannedFiles: [...new Set(planned)].sort(),
});

/* ------------------------------------------------------------------ traceability */
const T = {};
const t = (id, title, stream, check) => { T[id] = { title, stream, check, status: 'planned' }; };
// A13
t('A13#1', 'Card links generated from the post URL; link checker in CI', 'ia', 'check-links#internal-200');
t('A13#2', 'Netlify _redirects 301 map for every retired URL', 'ia', 'check-links#strict-redirects (every url-map 301 → one hop → 200)');
t('A13#3', 'One responsive component per pattern; no duplicated DOM', 'seo', 'check-seo#repeated-text (no text node repeated in a page outside [data-shared]; one nav[aria-label=Main])');
t('A13#4', 'Descriptive hand-written alt; alt="" for decorative', 'seo', 'check-seo#alt-filename');
t('A13#5', 'One H1 per template; embedded blocks start at H2', 'seo', 'check-seo#h1-count');
t('A13#6', 'H1 on every index page', 'seo', 'check-seo#h1-present-on-hubs');
t('A13#7', 'Services menu lists every service page (no orphans)', 'ia', 'check-links#orphans (every sitemap URL reachable from nav/footer/hubs)');
t('A13#8', '<button aria-expanded> disclosures, never href="#"', 'ia', 'check-html#no-href-hash');
t('A13#9', 'Header call button, sticky mobile bar, tel:/mailto: everywhere', 'ds-chrome', 'e2e/chrome.spec#tel-sms-mailto');
t('A13#10', '≈6 inputs, single name field, no CAPTCHA', 'quote', 'e2e/quote.spec#six-inputs');
t('A13#11', 'Reviews band on home and service pages linking to Google', 't-home', 'e2e/home.spec#reviews-band-google-link (+ services.spec)');
t('A13#12', 'Only claim what can be verified; credentials band links to issuers', 'content', 'check-honesty#unverifiable-claims');
t('A13#13', 'Single source of truth for founding year / business facts', 'ia', 'check-content#single-source');
t('A13#14', 'One municipality list in data; one page per municipality', 'ia', 'check-content#municipality-list');
t('A13#15', 'No loader; native View Transitions honouring reduced motion', 'ds-core', 'motion-audit#vt-and-loader');
t('A13#16', 'Static, user-controlled project rail (no auto-advance)', 't-home', 'motion-audit#no-auto-advance');
t('A13#17', 'aria-hidden on decorative duplicates or render once', 'seo', 'check-seo#decorative-duplicate');
t('A13#18', 'One OG card per page; website type; en_CA locale', 'seo', 'check-seo#og-tags');
t('A13#19', 'Escape once at build; no double-encoding', 'seo', 'check-seo#double-encoding');
t('A13#20', 'Named author with bio; real publish dates', 'content', 'check-content#resource-byline-dates');
t('A13#21', 'Slug linting', 'seo', 'check-seo#slug-lint');
t('A13#22', 'One <time datetime> format, displayed "19 November 2026"', 't-editorial', 'check-seo#time-format');
t('A13#23', 'Structured project data with validation', 'ia', 'check-content#schema-v3');
t('A13#24', 'Spell-check in CI', 'qa', 'check-honesty#spelling');
t('A13#25', 'Footer links deduplicated', 'ia', 'check-links#footer-duplicates');
t('A13#26', 'Footer phone and email linked', 'ia', 'check-html#footer-tel-mailto');
t('A13#27', 'AVIF+WebP srcset, max 1600 w', 'living', 'budgets#image-widths');
t('A13#28', 'Plausible only; no consent banner', 'qa', 'budgets#third-party-origins');
t('A13#29', 'HTTPS, consistent canonicals', 'seo', 'check-seo#canonical');
t('A13#30', 'Plain-language workmanship guarantee', 'content', 'check-content#guarantee');
t('A13#31', '"What\'s included each visit / season" tables (no prices)', 'content', 'check-content#service-tables');
t('A13#32', 'Short FAQs on each service page', 'content', 'check-content#service-faqs');
t('A13#33', 'Proper case in HTML source', 'seo', 'check-seo#sentence-case');
t('A13#34', 'Lead with 3–6 key people with real bios', 't-company', 'e2e/company.spec#about-people');
t('A13#35', '301 old duplicate URLs to new; one canonical per page', 'seo', 'check-seo#canonical-unique');
t('A13#36', 'Audit performance, contrast, focus, tap targets before quoting numbers', 'qa', 'evidence-pack (a11y.mjs + lighthouse.mjs + measure.mjs, W4)');
// A12
t('A12#1', 'Project spec strip (municipality, service, duration, plant palette, challenge→approach→result; no budgets)', 't-projects', 'e2e/projects.spec#spec-strip');
t('A12#2', 'Named, phased process with deliverables', 't-company', 'e2e/company.spec#process-tracks');
t('A12#3', 'Filterable portfolio', 't-projects', 'e2e/projects.spec#filter');
t('A12#4', 'Real-crew credibility (faces and roles, only when real)', 't-company', 'check-honesty#no-stock-people');
t('A12#5', 'Commercial proof points instead of adjectives', 't-services', 'check-honesty#commercial-proof');
t('A12#6', 'Restraint: two-tone palette, big imagery, white space (superseded on aesthetics by the alive direction; hard constraints kept)', 'ds-core', 'f-visual#restraint-review (W4 screenshot matrix)');
t('A12#7', 'Dedicated landing page per service line with local context', 't-services', 'e2e/services.spec#local-context');
// C1–C8
t('C1.1', 'Sitemap and URL map (/projects/, /free-quote/, /process/ …)', 'ia', 'check-links#sitemap-matches-url-map');
t('C1.2', 'Primary nav: Services ▾ · Projects · Service areas ▾ · Process · About · Call · Free quote', 'ia', 'e2e/chrome.spec#primary-nav');
t('C1.3', 'Footer: services, municipalities, NAP, hours, tel/sms/mailto, legal + Google profile, no careers', 'ia', 'e2e/chrome.spec#footer');
t('C1.4', 'Internal linking (service↔municipality↔project)', 'seo', 'check-seo#internal-links');
t('C1.5', 'Breadcrumbs on all depth-2+ pages', 'ds-chrome', 'check-seo#breadcrumbs');
t('C2.1', 'Home wireframe sections 1–10', 't-home', 'e2e/home.spec#sections');
t('C2.2', 'Service page wireframe', 't-services', 'e2e/services.spec#template-order');
t('C2.3', 'Municipality page wireframe', 't-areas', 'e2e/areas.spec#template-order');
t('C2.4', 'Project case study wireframe', 't-projects', 'e2e/projects.spec#case-study-order');
t('C2.5', 'Free quote page wireframe', 'quote', 'e2e/quote.spec#page-order');
t('C3.1', 'Keep / adapt / drop (no loaders, sliders, lowercase source, third-party embeds)', 'ds-core', 'check-motion-policy#banned-effects');
t('C3.2', 'Fluid type scale (display…small, Inter 400/600/700, Newsreader italic quotes only)', 'ds-core', 'unit/ds-core-tokens.test#type-scale');
t('C3.3', 'Colour usage and contrast incl. dark focus token', 'ds-core', 'check-contrast#all-pairs');
t('C3.4', 'Imagery rules: own photos only in /projects/, stock labelled, illustration for process/maps', 'living', 'check-honesty#stock-in-projects');
t('C3.5', 'Motion rules (transform/opacity, VT where supported, reduced motion, nothing autoplays)', 'ds-core', 'motion-audit#policy-tiers');
t('C3.6', 'Component inventory', 'ds-comp', 'unit/ui-api.test#inventory');
t('C4.1', 'Content breakpoints 40/64/80em, container queries, one DOM per component', 'ds-comp', 'check-css#breakpoints-and-cq');
t('C4.2', 'Mobile nav sheet: inert, Esc, focus return, accordions', 'ds-chrome', 'e2e/chrome.spec#mobile-sheet');
t('C4.3', 'Sticky action bar below 1024 px', 'ds-chrome', 'e2e/chrome.spec#sticky-bar');
t('C4.4', 'Touch targets ≥ 44×44 primary, ≥ 24×24 all', 'qa', 'a11y#target-size');
t('C4.5', '<picture> AVIF/WebP/JPEG, srcset, dimensions, hero priority, lazy below fold, EXIF strip', 'living', 'budgets#picture-pipeline');
t('C4.6', '≥ 16 px body, no horizontal scroll at 320 px, 200 % zoom', 'qa', 'e2e/global.spec#reflow-320-zoom-200');
t('C5.1', 'Quote builder six inputs, ?area= prefill', 'quote', 'e2e/quote.spec#prefill');
t('C5.2', 'mailto submit with encoded subject/body ≤ 1,800 chars; works without JS', 'quote', 'unit/quote-builder.test#mailto');
t('C5.3', 'Ready panel: copy, address, call/text, webmail links', 'quote', 'e2e/quote.spec#ready-panel');
t('C5.4', 'Native validation, inline errors, error summary, values kept', 'quote', 'e2e/quote.spec#validation');
t('C5.5', 'sessionStorage draft', 'quote', 'e2e/quote.spec#draft-restore');
t('C5.6', 'Plausible custom events, no personal data', 'quote', 'unit/quote-events.test#no-pii');
t('C5.7', 'Trust without prices (reply time, next steps, verifiable credentials, reviews, owner, local rules, guarantee)', 'content', 'check-honesty#trust-without-prices');
t('C6.1', 'One @id JSON-LD graph (business subtype, Service, BreadcrumbList, FAQPage optional, no Review/AggregateRating)', 'seo', 'unit/seo-graph.test#graph');
t('C6.2', 'Title and meta description patterns and lengths', 'seo', 'check-seo#title-meta');
t('C6.3', 'Social cards: en_CA, one OG image per template, og:type website', 'seo', 'og-cards#coverage');
t('C6.4', 'Municipality pages avoid doorway risk (3 local blocks, swap test)', 'areas-content', 'check-seo#cross-area-duplicates');
t('C6.5', 'Google Business Profile alignment (off-site; documented)', 'docs', 'LAUNCH-CHECKLIST#gbp');
t('C6.6', 'Technical: sitemap, robots, self canonicals, _redirects, lang en-CA, build SEO checks', 'seo', 'check-seo#technical');
t('C7.1', 'Lighthouse mobile ≥ 95 ×4 every template', 'qa', 'lighthouse#median-of-3');
t('C7.2', 'Weights: home ≤ 500 KB, inner ≤ 350 KB, CSS/JS/fonts caps, 1 third party', 'qa', 'budgets#v2');
t('C7.3', 'WCAG 2.2 AA, 0 axe violations', 'qa', 'a11y#axe-matrix');
t('C8', 'Parallel streams on separate branches gated by the same CI; merge only when budgets pass', 'build', 'check-ownership#every-merge');
// P0–P4
t('P0#1', 'site.json single source for NAP, founding year, hours, licences, municipalities', 'ia', 'unit/ia-site-json.test#consumers');
t('P0#2', 'Lighthouse CI budgets, axe/Playwright at 5 widths, link checker in the build', 'qa', 'ci#required-gates');
t('P0#3', 'Dark-mode focus ring ≥ 3:1 on Fir night; re-test all focus states', 'ds-core', 'check-contrast#focus-pairs');
t('P0#4', 'scroll-padding for sticky header and bar; 2.4.11 keyboard test', 'ds-chrome', 'e2e/chrome.spec#focus-not-obscured');
t('P1#5', 'Quote builder → mailto, no-JS path, copy, visible email, tel/sms fallbacks + status', 'quote', 'e2e/quote.spec#no-js-and-fallbacks');
t('P1#6', 'Sticky mobile Call / Free-quote bar (≥ 48 px, safe-area, hidden over the form)', 'ds-chrome', 'e2e/chrome.spec#sticky-bar-hides');
t('P1#7', 'tel:/mailto: in header and footer; desktop header call button', 'ds-chrome', 'e2e/chrome.spec#header-call');
t('P1#8', 'Reviews band, credentials row (verifiable only), written guarantee', 'ds-comp', 'check-honesty#reviews-credentials-guarantee');
t('P2#9', 'Services overview + 4 service pages on the C2 template', 't-services', 'e2e/services.spec#hub-and-four');
t('P2#10', '13 municipality pages pass the swap test; /areas/ hub with SVG map', 't-areas', 'f-honesty#swap-test-78-pairs');
t('P2#11', 'Case-study template, filterable portfolio, accessible before/after with side-by-side', 't-projects', 'e2e/projects.spec#before-after-keyboard');
t('P2#12', 'Process page (two tracks), FAQ page, accessibility statement', 't-company', 'e2e/company.spec#process-faq-statement');
t('P2#13', 'Disclosure menus (no href="#"), breadcrumbs, helpful 404', 'ia', 'e2e/chrome.spec#disclosure-breadcrumb-404');
t('P3#14', 'JSON-LD graph, OG per page, og:locale en_CA, lang en-CA', 'seo', 'check-seo#jsonld-graph');
t('P3#15', 'Sitemap with git lastmod, robots, _redirects, build checks', 'build', 'unit/build-lastmod.test#git-lastmod');
t('P3#16', 'GBP alignment: matching NAP, 13 service areas, review link', 'ia', 'check-content#nap-consistency');
t('P4#17', 'AVIF/WebP pipeline, EXIF stripping, licence records, no stock in /projects/', 'living', 'unit/living-images.test#pipeline');
t('P4#18', 'Glass limited to chrome, solid content, fluid type, reduced motion, no loaders/sliders/autoplay — superseded on aesthetics, hard constraints kept', 'ds-core', 'check-contrast#glass-worst-case');
t('P4#19', 'Final regression: LH ≥ 95 ×4, 0 axe, manual SR pass, 200 % zoom, 320 px, CLS ≤ 0.05', 'qa', 'release-gate#final-regression (W5)');
const checks = Object.values(T).map((x) => x.check);
const dupChecks = checks.filter((c, i) => checks.indexOf(c) !== i);
W('traceability.json', {
  $comment: 'Every blueprint item → exactly ONE accountable stream and ONE verifying check (tool#rule). "stream" is the implementer who must make the check pass; the tool may be built by another stream (qa/seo/ia) earlier. status moves planned → in-progress → evidenced (with evidence path) → known-issue. W5 docs turns this into TRACEABILITY.md.',
  generatedOn: TODAY, counts: { items: Object.keys(T).length },
  items: T,
});

/* ------------------------------------------------------------------ briefs */
const COMMON_GATES = [
  'cd $WT/site && node tools/dev-setup.mjs --devtools   # once it exists (W1 build); before that: tsc --typeRoots /opt/node-tools/node_modules/@types',
  'node ../brand/build-tokens.mjs --check && node ../brand/check-contrast.mjs',
  'tsc -p jsconfig.json',
  'node --test "tests/unit/**/*.test.mjs"',
  'node build.mjs --offline-images --out=$OUT && SITE_DIST=$OUT node tools/check-all.mjs --no-build [--strict-redirects from W1 ia on]',
  'node tools/csp.mjs --check',
  'PORT=$PORT SITE_DIST=$OUT node node_modules/playwright/cli.js test --trace off',
  'node tools/check-ownership.mjs --stream=<id> --base=<sha> --head=<branch>',
];
const W2_GATES = ['node tools/a11y.mjs --themes=dark,light --widths=320,1440 --motion=off,on   # once qa lands; until then axe via the global helper', 'node tools/motion-audit.mjs && node tools/text-over-media.mjs'];
for (const s of Object.values(S)) {
  const mine = Object.entries(T).filter(([, v]) => v.stream === s.id).map(([k, v]) => `${k}: ${v.title} — verified by ${v.check}`);
  const wavesOf = s.waves;
  const brief = {
    id: s.id, wave: wavesOf.length === 1 ? wavesOf[0] : wavesOf, lens: s.lens,
    branch: wavesOf.map((w) => `${w === 'w3b' ? 'w3' : w}/${s.id}${w === 'w3b' ? '--lock' : ''}`),
    owns: s.owns, forbidden: waves[wavesOf[0]][s.id].forbidden,
    reads: [...new Set(['.orchestra/ownership.json', 'CONTRACT.md', 'REDESIGN-PLAN.md', 'research/cedar-springs-teardown-blueprint.md (moved from the repo root at the seed commit)', ...s.reads.filter((r) => r !== 'CONTRACT.md')])],
    deliverables: s.deliverables,
    acceptance: [...mine, ...s.extraAcceptance],
    gates: [...COMMON_GATES, ...(wavesOf.some((w) => w !== 'w1') ? W2_GATES : []), ...(['w3', 'w3b'].some((w) => wavesOf.includes(w)) ? ['node tools/lighthouse.mjs --runs=3   # quiet slot only'] : [])],
    verifierLens: s.verifierLens,
    port: s.port,
    portRule: 'builder = port; reviewer = port + 10; fixer = port + 20; evidence collector 4400',
    out: '$SCRATCH/dist/<branch-with-dashes>',
    returns: '{branch, head, base, files, gates, acceptance[], requests[]}',
    requests: `.orchestra/requests/${s.id}.md (never edit a file outside owns; describe the change there)`,
  };
  W(`briefs/${s.id}.json`, brief);
}
console.log(JSON.stringify({ urls: entries.length, redirects: redirects.length, newPages: newUrls.length, segments: segs.length, cssUncovered: missing, cssUnowned: unowned, trace: Object.keys(T).length, dupChecks, streams: Object.keys(S) }, null, 1));
