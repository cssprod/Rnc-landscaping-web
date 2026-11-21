#!/usr/bin/env node
// A1 architect generator, revised by A3 after the A2 critique (2026-11-21).
// Writes .orchestra/{ownership,url-map,legacy-css-map,traceability}.json and .orchestra/briefs/*.json.
// Usage: node .orchestra/tools/gen-a1.mjs <repo> .orchestra/tools/urls-pre-redesign.txt
// NEVER hand-edit the JSON outputs: change this file, regenerate, then run check-overlap.mjs.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.argv[2];
const URLS = readFileSync(process.argv[3], 'utf8').trim().split('\n');
const OR = join(REPO, '.orchestra');
mkdirSync(join(OR, 'briefs'), { recursive: true });
const W = (f, o) => writeFileSync(join(OR, f), JSON.stringify(o, null, 2) + '\n');
const TODAY = '2026-11-21';
const WAVES = ['w0', 'w1', 'w2', 'w3', 'w3b', 'w4', 'w5'];
const wi = (w) => WAVES.indexOf(w);

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
  [651, 670, 'ds-core', 'motion: keyframes, hero entrance, view() reveals, reduced-motion kill switch (→ 95-motion.css, deleted in W2)'],
  [671, 677, 'ds-core', 'print (→ 99-print.css, deleted in W2)'],
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
// !important inventory: in the lowest layer an !important declaration beats every normal declaration in every later layer.
const importantDecls = (s) => (s.match(/[\w-]+\s*:[^;{}]*!important/g) || []).map((d) => d.trim());
const importantIn = (from, to) => {
  const out = []; let med = null;
  for (let i = from; i <= to; i++) {
    const line = css[i - 1];
    const mm = line.match(/^@media ([^{]+)\{/); if (mm) { med = mm[1].trim(); continue; }
    if (/^\}/.test(line)) { med = null; continue; }
    if (!line.includes('!important')) continue;
    const sel = (line.trim().match(/^([^{]+)\{/) || [])[1];
    out.push({ line: i, media: med, selector: sel ? sel.trim() : null, declarations: importantDecls(line) });
  }
  return out;
};
const deleteWave = (o) => (o.startsWith('t-') ? 'w3' : 'w2');
// build segments in order
const segs = [];
let seq = 0;
const push = (owner, from, to, label, extra = {}) => {
  const last = segs[segs.length - 1];
  if (last && last.owner === owner && !extra.split && !last.split && last.lines[1] + 1 >= from) { last.lines[1] = to; last.label += `; ${label}`; return; }
  seq++;
  segs.push({ seq, file: `site/src/styles/50-legacy-${String(seq).padStart(2, '0')}-${owner}.css`, owner, lines: [from, to], label, mustDeleteIn: deleteWave(owner), ...extra });
};
for (const [a, b, o, l] of base) push(o, a, b, l);
const lateOwners = [...new Set(lateRules.map((r) => r.owner))].sort();
for (const o of lateOwners) push(o, late[0], late[1], 'responsive + dark-appearance rules for this owner (selector-split, original media-query order kept)', {
  split: true, rules: lateRules.filter((r) => r.owner === o).map((r) => ({ line: r.line, media: r.media, selector: r.selector })),
});
for (const [a, b, o, l] of tail) push(o, a, b, l);
for (const s of segs) {
  s.importantRules = s.split
    ? lateRules.filter((r) => r.owner === s.owner && r.declarations.includes('!important')).map((r) => ({ line: r.line, media: r.media, selector: r.selector, declarations: importantDecls(r.declarations) }))
    : importantIn(s.lines[0], s.lines[1]);
}
const lastBaseSeq = segs.filter((s) => !s.split && s.lines[1] < late[0]).at(-1).seq;
// coverage: every line 1..677 belongs to a segment
const covered = new Set();
for (const s of segs) for (let i = s.lines[0]; i <= s.lines[1]; i++) covered.add(i);
const missing = []; for (let i = 1; i <= css.length; i++) if (!covered.has(i) && css[i - 1].trim()) missing.push(i);
const FALLBACK_EXAMPLE = `site/src/styles/50-legacy-${String(lastBaseSeq).padStart(2, '0')}x-ds-core.css`;
W('legacy-css-map.json', {
  $comment: 'W1 build splits site/src/styles/site.css into these slices, each wrapped in @layer legacy { } (legacy is the FIRST, lowest-priority layer declared in 00-layers.css). Concatenation is in file-name order, so the two-digit sequence reproduces the original source order exactly and the cascade is unchanged (acceptance: 0 px screenshot diff at 390 and 1440, dark and light). Split segments copy each listed selector rule into the owner slice inside its original @media wrapper; combined selector lists are split into one rule per selector (same specificity, same relative order). importantRules lists every legacy !important: inside the lowest layer an !important declaration BEATS every normal declaration in every newer layer, so a stream that restyles one of those selectors must delete that declaration from the slice (if it owns the slice) or request it from the slice owner. mustDeleteIn is the wave by which the owner deletes the slice; css-consolidator (W3b) proves none remain.',
  source: 'site/src/styles/site.css', sourceLines: css.length, generatedOn: TODAY,
  layerDecl: '@layer legacy, reset, base, layout, chrome, components, living, pages, utilities, motion, print;',
  fallbackSlice: {
    pattern: 'site/src/styles/50-legacy-<NN>x-ds-core.css',
    example: FALLBACK_EXAMPLE,
    rule: `If moving a split rule causes a pixel diff, put that rule AND every rule it conflicts with, in original source order, into 50-legacy-<NN>x-ds-core.css, where NN is the seq of the last slice that precedes the rules' original source position. "NNx" sorts after slice NN and before slice NN+1, so the moved rules keep their place in the cascade. For the media-split block (lines ${late[0]}–${late[1]}) that is ${FALLBACK_EXAMPLE.replace('site/src/styles/', '')} (after the base slices, before the split slices). Never use a number that sorts after the split slices or the motion slice (e.g. 90). Record every moved rule in the build return. ds-core keeps fallback slices; the selector owner deletes the rule when it restyles it, and css-consolidator (W3b) removes what is left.`,
  },
  coverage: { uncoveredNonBlankLines: missing, unownedSelectors: unowned },
  importantSummary: Object.fromEntries(segs.filter((s) => s.importantRules.length).map((s) => [s.file.replace('site/src/styles/', ''), s.importantRules.length])),
  owners: Object.fromEntries([...new Set(segs.map((s) => s.owner))].sort().map((o) => [o, segs.filter((s) => s.owner === o).map((s) => s.file)])),
  segments: segs,
});

/* ------------------------------------------------------------------ glob helpers (same engine as check-overlap.mjs) */
function braces(g) {
  const i = g.indexOf('{');
  if (i < 0) return [g];
  let depth = 0, j = i;
  for (; j < g.length; j++) { if (g[j] === '{') depth++; else if (g[j] === '}' && --depth === 0) break; }
  const inner = g.slice(i + 1, j); const parts = []; let d = 0, s = 0;
  for (let k = 0; k < inner.length; k++) { if (inner[k] === '{') d++; else if (inner[k] === '}') d--; else if (inner[k] === ',' && d === 0) { parts.push(inner.slice(s, k)); s = k + 1; } }
  parts.push(inner.slice(s));
  return parts.flatMap((p) => braces(g.slice(0, i) + p + g.slice(j + 1)));
}
const toRe = (g) => new RegExp('^' + g.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '\u0000').replace(/\*\*/g, '\u0001').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '(?:.*/)?').replace(/\u0001/g, '.*') + '$');
const probes = (g) => braces(g).flatMap((e) => [e.replace(/\*\*/g, 'probe/deep').replace(/\*/g, 'x').replace(/\?/g, '9'), e.replace(/\*\*\//g, '').replace(/\*\*/g, 'f.mjs').replace(/\*/g, 'y').replace(/\?/g, '0')]);
const ownsAny = (owns, g) => { const res = owns.flatMap(braces).map(toRe); return probes(g).some((p) => res.some((r) => r.test(p))); };
// drop a forbidden glob when the stream owns any path it names (a wave's owns overrides frozen for that wave)
const pruneForbidden = (forbidden, owns) => [...new Set(forbidden)].filter((g) => !ownsAny(owns, g));

/* ------------------------------------------------------------------ streams */
const req = (id) => `.orchestra/requests/${id}.md`;
const slices = (o) => `site/src/styles/50-legacy-*-${o}.css`;
const OWNERSHIP_TOOL = 'node ../.orchestra/tools/ownership.mjs';
const ALWAYS_FORBIDDEN = ['CONTRACT.md', 'REDESIGN-PLAN.md', 'site/src/lib/head-scripts.mjs', '.orchestra/ownership.json', '.orchestra/briefs/**', '.orchestra/traceability.json', '.orchestra/url-map.json', '.orchestra/legacy-css-map.json', '.orchestra/tools/**', '.orchestra/baselines/**', 'research/**'];
const FROZEN_AFTER_W1 = ['site/src/pages/routes.mjs', 'site/src/components/ui/index.mjs', 'site/site.config.mjs', 'content/site.json', 'site/src/lib/data.mjs'];
const FROZEN_W3 = ['site/src/components/ui/actions.mjs', 'site/src/components/ui/heads.mjs', 'site/src/styles/40-ui-actions.css', 'site/src/styles/41-ui-heads.css', 'brand/tokens.json', 'brand/tokens.css', 'media/images.json', 'site/src/components/layout.mjs', 'site/src/components/sprite.mjs', 'site/src/components/living.mjs', 'site/src/scripts/main.js', 'site/src/scripts/lib/**', 'site/src/pages/_shared.mjs'];
const BASE = { w1: 'the seed commit on ccr-384bdb88-mx8gtv', w2: 'tag wave-1-int', w3: 'tag wave-2-int', w3b: 'tag wave-3-int (after the six family merges)', w4: 'tag wave-3b-int, then the previous round tip w4/r<n-1>-int', w5: 'tag wave-4-int' };
const CONTEXT = {
  w1: [
    'Your base is the seed commit. It has ONE routes.mjs, ONE site.css and ONE main.js (no page families, no ui/ split, no new URLs, no --out). head-scripts.mjs exists and is frozen; layout.mjs emits HEAD_SCRIPT and keeps JS_FLAG as an alias.',
    'Seed gate enablers already on your base: tools/lib.mjs honours SITE_DIST; playwright.config.mjs reads PORT and SITE_DIST and uses reuseExistingServer:false; build.mjs writes a route whose file does not end in .html raw and leaves sitemap:false routes out of the sitemap; tools/csp.mjs (--check) and tools/dev-setup.mjs exist as minimal versions; site.config.mjs has [REPLY TIME], [GOOGLE PROFILE] and [FOUNDED]; event-schema.yaml carries the CONTRACT §13 names next to the v2 ones; tools/check-links.mjs --url-map accepts url-map new/added URLs as targets.',
    'NOT on your base (they come from the other W1 streams and meet only at the integrator): --out, module hashing, serve.mjs _redirects (build); page families, /free-quote/, /projects/, /process/, seo.mjs, site.json, check-content, rewrite-links (ia); the new area and content JSON (areas-content, content). Anything that needs them is an integration gate (see integrationGates).',
    'Build into your worktree\'s own site/dist (OUT=$WT/site/dist): each worktree has its own dist, so parallel builds never collide. Always set your own PORT.',
    'Tools: Playwright 1.63.0 at /opt/node-tools (Chromium in /opt/pw-browsers), tsc at /opt/node-tools/node_modules/.bin/tsc. WebSearch/WebFetch work server-side; curl reaches only the allow-listed hosts named in research/area-verification-V*.md (Unsplash and the Netlify API stay blocked).',
  ],
  w2: [
    'Your base is tag wave-1-int: page families + frozen routes.mjs aggregator, ui/ split, layout scripts[] with env.assets.modules, new URLs + _redirects, legacy CSS slices in @layer legacy, module hashing, --out/SITE_DIST/PORT, dev-setup --devtools, check-content, rewrite-links, site.json.',
    'qa merges LAST in W2, so a11y.mjs, motion-audit.mjs, text-over-media.mjs, check-honesty.mjs, trace.mjs and budgets v2 are not on your base: run those gates as deferred (report them) and the integrator runs them after the qa merge, when it also writes their baselines.',
    'No stream owns the page files (site/src/pages/{home,services,areas,projects,company,editorial}.mjs) in W2: new primitives and scenes are proven on /styleguide/ (showcase build), not on real pages.',
  ],
  w3: [
    'Your base is tag wave-2-int: dark-first tokens, chrome with toggles and sticky bar, every C3 primitive, living scenes, the seo graph and check-seo, the quote builder, qa tools and the .orchestra/baselines/ files written at the W2 barrier.',
    'Frozen in W3: layout.mjs, sprite.mjs (icons), main.js and lib/**, ui/actions + ui/heads, tokens, images.json, living.mjs, _shared.mjs, routes.mjs. Need something there? Write a request.',
  ],
  w3b: ['Your base is tag wave-3-int (all six families merged). You hold an exclusive lock on site/src/styles/**.'],
  w4: ['Your base is tag wave-3b-int (round 1) or the previous round tip. Every baseline must be empty when W4 exits.'],
  w5: ['Your base is tag wave-4-int. Baselines are empty; the release gate runs with --no-baseline.'],
};
const COMMON_RULES = [
  'Write ONLY paths matched by your owns for the wave you are running in; everything else is forbidden. Need a change elsewhere? Describe it in your requests file and carry on. ' + OWNERSHIP_TOOL + ' enforces this before every merge.',
  'Builders commit on their own branch (at least every ~20 minutes and at the end), then git format-patch $BASE..HEAD -o $SCRATCH/patches/<branch>/. Never merge, tag or push: the integrator does that. Reviewers never commit. Fixers branch <branch>--fix<n> from the tip and fix only verified findings, inside the builder\'s owns.',
  'Never invent facts about RNC. Unknown business facts stay as the exact bracket tokens of CONTRACT §3. Samples carry sample:true and a visible "Sample" label. No prices, budgets, superlatives, years-in-business claims, invented numbers, counters or tickers. Never mention internal software or automation. Canadian English.',
  'A URL that depends on an unresolved token ([PHONE], [EMAIL], [GOOGLE PROFILE], [DOMAIN]) is never put in an href: render plain text plus the placeholder chip in showcase builds, and omit it (or use the documented fallback) in launch builds (CONTRACT §3).',
  'Legacy !important: .orchestra/legacy-css-map.json lists every !important in the legacy slices (importantRules). In @layer legacy an !important beats every newer layer, so if you restyle one of those selectors, delete that declaration from its slice (if you own the slice) or request it from the slice owner.',
  'Baselines (CONTRACT §17): tools apply .orchestra/baselines/<tool>.json automatically; a failure not in the baseline fails your gate. Never edit a baseline (integrator-only). Where your acceptance says so, the entries for your pages or files must be gone.',
  'Generated files are never hand-edited: brand/tokens.css (integrator regenerates), event-schema.d.ts (tools/gen-event-types.mjs), the .orchestra JSON files (gen-a1.mjs).',
  'Frozen APIs: site/COMPONENTS.md signatures, data-* hooks and accessible names only grow (new optional parameters). site/tests/unit/ui-api.test.mjs is append-only.',
  'Traceability: every acceptance line names one check. A check you author must exist under that exact id: tool rules in the tool\'s literal `export const RULES = [...]`, e2e/unit checks as a test whose title contains `#<rule>`. From W2 on, tools/trace.mjs fails when one is missing.',
  'Return {branch, head, base, files, gates:{name:pass|fail|deferred}, acceptance:[{item, status, evidence}], requests:[...]} as your final answer.',
];

const S = {};
const def = (id, o) => { S[id] = { id, ...o }; };

/* W1 */
def('build', {
  waves: ['w1'], lens: 'Build-systems engineer (zero-dependency Node 22 SSG, cascade-preserving refactors, CSP)', port: { w1: 4411 },
  owns: { w1: ['site/build.mjs', 'site/src/lib/build/**', 'site/src/scripts/**', 'site/src/styles/**', 'site/src/components/sprite.mjs', 'site/tools/{csp,dev-setup,serve,lib,check-all,budgets,screenshots}.mjs', 'site/tests/unit/build-*.test.mjs', 'site/tests/fixtures/build/**', 'site/playwright.config.mjs', 'site/jsconfig.json', 'netlify.toml', '.github/workflows/ci.yml', '.gitignore', 'site/.gitignore', req('build')] },
  forbidden: ['content/**', 'site/src/pages/**', 'site/src/components/{layout,ui,map,forms,living}.mjs', 'site/src/components/ui/**', 'brand/**', 'media/**'],
  reads: ['site/build.mjs', 'site/src/styles/site.css', 'site/src/scripts/main.js', 'site/src/components/sprite.mjs', 'site/tools/**', 'netlify.toml', '.github/workflows/ci.yml', '.orchestra/legacy-css-map.json', 'CONTRACT.md §11 Head scripts, §12 Scripts/CSS, §14 Build interface, §17 Baselines'],
  deliverables: [
    '--out=DIR / SITE_DIST / PORT everywhere (build, check-all, serve, playwright.config, screenshots). Keep the seed changes (tools/lib.mjs SITE_DIST; playwright PORT/SITE_DIST with reuseExistingServer:false). Dist guard: rmSync only a directory that is empty or contains .rnc-dist; write the marker on every build.',
    'site/src/lib/build/minify-css.mjs: tokenizer-aware minifier (strings, url(), comments, custom-property values, @supports/@media conditions preserved) + golden tests in tests/fixtures/build + --no-minify.',
    'CSS pipeline: auto-discover site/src/styles/*.css in name order, prepend tokens.css unlayered, 00-layers.css declares the layer order; split site.css into the 50-legacy-NN-<owner>.css slices of legacy-css-map.json, keeping every importantRules declaration byte-identical; if a split rule causes a diff use the fallback naming rule in legacy-css-map.json (50-legacy-<NN>x-ds-core.css, never a number that sorts after the split slices); pre-registered empty stubs for every later CSS file (CONTRACT §12).',
    'JS: split main.js into main.js (chrome), lib/track.js (same track() API), lib/prefs.js (theme/setTheme/onThemeChange, motionOn/setMotion/onMotionChange + rnc:theme / rnc:motion events), quote.js and projects.js; stubs living.js and areas.js. In W1 main.js statically imports ./quote.js and ./projects.js; each self-initialises on its own hook (form[data-stepper] or form[data-quote-form]; [data-filters], [data-ba]) and does nothing without it, so the quote and filter e2e tests stay green on your branch with the seed layout. Keep every behaviour byte-identical, including the pointer sheen (ds-chrome removes it in W2).',
    'Module-graph hashing in dependency order (leaves first, import specifiers rewritten to the hashed URLs), <link rel=modulepreload> for deps, env.assets.modules[name] = {src, deps[]}; no import map. KEEP env.assets.js (main) and env.assets.css as today, so the seed layout and ia\'s fallback keep working. The static import and a route\'s scripts:["quote"] resolve to the same hashed URL, so the module evaluates once.',
    'Inline scripts only from site/src/lib/head-scripts.mjs INLINE_SCRIPTS; the build fails if any inline <script> in the output (other than application/ld+json) is not in that list or its sha256 is missing from the netlify.toml CSP (replaces the JS_FLAG check).',
    'Sprite tree-shaking: emit only the <symbol>s a page references (about −14 KB per page); namespaced ids i-* / logo-*.',
    'Route shape {path, file, render, sources[], scripts[], sitemap?, noindex?, showcaseOnly?} (CONTRACT §14): keep the seed behaviour (a file not ending in .html is written raw: no token chips, no typographer; sitemap:false routes stay out of the sitemap) and add: showcaseOnly routes are not built when SITE_MODE=launch; noindex and showcaseOnly routes never enter the sitemap; sitemap <lastmod> = latest git commit date of the route\'s sources (fallback: build date + one warning on shallow clones).',
    'serve.mjs: applies dist/_redirects (301, trailing-slash tolerant, query destinations kept), dist/_headers and the netlify.toml [[headers]] (CSP included); MIME types for avif/webp/jpg/jpeg/mjs/webmanifest.',
    'Complete the seed versions of tools/csp.mjs (--check: every INLINE_SCRIPTS hash present in the netlify.toml script-src, nothing stale) and tools/dev-setup.mjs (symlinks site/node_modules/{playwright,playwright-core,@types/node} from /opt/node-tools, untracked; --devtools installs lighthouse@12 and axe-core@4 into $SCRATCH/devtools). The ownership checker is NOT yours: it is the frozen .orchestra/tools/ownership.mjs.',
    'check-all discovers every tools/check-*.mjs. CONTRACT §14 discovery rules: each must run offline with only SITE_DIST, need no Playwright or devtools, and exit 0 when it does not apply (Netlify runs check-all). Browser tools are never named check-*.',
    'tools/lib.mjs: report(tool, failures[{rule, path, message}]) with the CONTRACT §17 baseline logic (auto-apply .orchestra/baselines/<tool>.json resolved from the repo root when it exists; --no-baseline; --write-baseline and --prune-baseline are integrator-only) and the RULES convention (a literal `export const RULES = [...]` per tool). Move budgets.mjs onto it.',
    'URLs the codemod does not touch: .github/workflows/ci.yml (LHCI --collect.url=/quote/ → /free-quote/; the axe loop\'s /quote/ and /portfolio/ → /free-quote/ and /projects/) and the tools/screenshots.mjs default page list now use the NEW URLs. Your own branch still serves the old ones, so pass them explicitly (--pages) for the pre/post-split comparison.',
    'tsc -p jsconfig.json green (fix TS2688 typeRoots); CI steps 1–3 green.',
  ],
  extraAcceptance: [
    'On your branch alone (seed base, old URLs): build, check-all, csp --check and the existing e2e suite are green, including the quote stepper and the project filters now driven from quote.js and projects.js',
    '0 px screenshot diff at 390 and 1440 (dark and light) between the pre-split and post-split builds (tools/screenshots.mjs --compare --pages=<old URLs>)',
    'Two builds into different --out dirs in parallel do not interfere; the build refuses to delete a non-dist directory',
    'An injected unhashed inline <script> → build error AND a CSP console error in Playwright via serve.mjs',
    'Minifier output parses identically (golden tests) and gz CSS is within ±2 % of the old minifier; budgets within ±2 % of baseline except the sprite saving',
  ],
  verifierLens: 'Reproducibility sceptic: re-run in a clean worktree, parallel builds, fault-inject a stray inline script, diff screenshots pixel-for-pixel',
});
def('ia', {
  waves: ['w1'], lens: 'Information architect + SSG router engineer (C1, redirects, single source of truth)', port: { w1: 4412 },
  owns: { w1: ['site/src/pages/**', 'site/src/components/{layout,ui,map,forms,living}.mjs', 'site/src/components/ui/**', 'site/src/lib/{seo,schema,data,tokens,dates}.mjs', 'site/site.config.mjs', 'content/site.json', 'site/tools/{check-links,check-html,rewrite-links,check-content}.mjs', 'site/tools/schemas/**', 'site/tests/e2e/**', 'site/tests/helpers/**', 'site/tests/site.spec.mjs', 'site/tests/unit/ia-*.test.mjs', 'site/tests/unit/ui-api.test.mjs', 'site/fixtures/**', req('ia')] },
  forbidden: ['content/{areas,projects,services,resources,testimonials,pages}/**', 'content/regional.json', 'site/src/styles/**', 'site/src/scripts/**', 'site/build.mjs', 'brand/**', 'media/**', 'netlify.toml'],
  reads: ['site/src/pages/routes.mjs', 'site/src/components/**', 'site/src/lib/**', 'site/site.config.mjs', 'content/**', 'site/tests/site.spec.mjs', '.orchestra/url-map.json', 'CONTRACT.md §5 URL map, §6 Content schemas v3, §10 Components, §14 Build interface', 'site/COMPONENTS.md'],
  deliverables: [
    'Route families: site/src/pages/{_shared,home,services,areas,projects,company,editorial,quote,styleguide}.mjs + the routes.mjs aggregator (frozen after W1; concatenates family exports in a fixed order). Every route declares {path, file, render, sources[], scripts[], sitemap?, noindex?, showcaseOnly?}; scripts:["quote"] on /free-quote/ and scripts:["projects"] on /projects/ and every case study.',
    'C1 URLs: /projects/, /projects/{slug}/ (flat), /free-quote/, a /process/ stub; routes read pg("projects") ?? pg("portfolio") and pg("process") ?? stub during the transition.',
    'site/src/pages/redirects.mjs → a route {path:"/_redirects", file:"_redirects", sitemap:false} built from .orchestra/url-map.json (one 301 per retired URL, no chains), unit-tested in tests/unit/ia-redirects.test.mjs. One-hop resolution needs w1/build\'s serve.mjs, so it is an integration gate.',
    '/styleguide/ route registered with showcaseOnly:true, noindex:true, sitemap:false, rendering the pages/styleguide.mjs stub (ds-comp fills it in W2). /404.html also gets sitemap:false.',
    'site/src/lib/seo.mjs: headMeta(env, p) and jsonLd(env, p); layout.mjs only calls them (logic moved, output identical except URLs).',
    'content/site.json (schema v3) as the single source of NAP, hours, services, municipalities, credentials and token values; site.config.mjs reads it and keeps the three tokens the seed added ([REPLY TIME] required; [GOOGLE PROFILE], [FOUNDED] optional).',
    'site/src/lib/data.mjs: loadAll() gains site (content/site.json) and regional (content/regional.json), each with an empty fallback ({} and {blocks: []}), so pages build before areas-content merges. Update site/fixtures/content/** to schema v3 (site, regional, process, projects) so a fixture build still works.',
    'C1 header: Services ▾ · Projects · Service areas ▾ · Process · About · [Call] [Free quote]. Both disclosures are <button type=button aria-expanded aria-controls> and in W1 they KEEP the existing hooks data-mega / data-mega-toggle / data-mega-panel, because main.js (build in W1, ds-chrome in W2) drives [data-mega]; ds-chrome renames both sides in W2. The header Call and Free quote buttons show only at ≥ 64em (below that the W2 sticky bar carries them). Keep the literal strings <header class="site-header" and <footer class="site-footer".',
    'C1 footer: the 4 services + Commercial, the 13 municipalities, NAP from site.json, hours, tel:/sms:/mailto:, Privacy/Terms/Accessibility/Google profile; no careers link, no duplicate links.',
    'ui.mjs split mechanically into components/ui/{actions,heads,cards,projects,trust,faq,cta,seasons,callouts}.mjs + index.mjs (export * from each; frozen): byte-identical HTML; callouts.mjs starts empty; components/living.mjs stub with the frozen livingScene/projectArt/illustrationChip signatures returning "".',
    'layout.mjs: scripts:[] option reading env.assets.modules[name] = {src, deps[]} → <script type=module> + <link rel=modulepreload> per dep; main and living on every page. FALLBACK when env.assets.modules is absent (your seed base): emit env.assets.js exactly as today and ignore scripts[]. Keep the JS_FLAG alias untouched.',
    'components/forms.mjs: add data-quote-form to the existing stepper form (keep data-stepper), so the W2 chrome sticky-bar test can find the form before the quote builder ships.',
    'site/src/pages/home.mjs: the inline-link stripping regex that lives at routes.mjs:64 today must match both "(/portfolio/)" and "(/projects/)", otherwise the codemod duplicates the "Browse the portfolio" link.',
    'site/src/lib/dates.mjs: formatDate(iso) → "19 November 2026", timeEl(iso) → <time datetime>.',
    'tools/rewrite-links.mjs (dry-run by default; --write is integrator-only; never run on content/ by a stream), tools/check-content.mjs + tools/schemas/*.schema.json (schema v3: required fields, enums, no budget/price keys, slug lint, link targets exist). check-content accepts the virtual art slots proj-*-art and process-hero and treats images.art as optional until W2. Its rules under providesRules gate content and areas-content in W1, so ship them all in W1.',
    'tools/check-links.mjs: keep the seed --url-map mode (url-map new/added URLs count as valid targets; W1 only), add --strict-redirects and the providesRules rules. check-links, check-html and check-content export RULES and, once w1/build merges, report through tools/lib.mjs report().',
    'Tests split per owner into tests/e2e/{global,chrome,components,living,quote,projects,areas,home,services,company,editorial,redirects}.spec.mjs on the new URLs, tests/helpers/ for shared fixtures. Every test that verifies a traceability item has "#<rule>" in its title; a test that can only pass once w1/build has merged (one-hop redirects through serve.mjs) also carries "@integration" in its title. tests/unit/ui-api.test.mjs created from site/COMPONENTS.md: one entry per export with its parameter keys, laid out so later owners only append.',
  ],
  extraAcceptance: [
    'Own branch (seed base): tests/unit/ia-redirects.test.mjs proves redirects.mjs emits exactly the url-map redirect rules; HTML byte-identical to the pre-split build except URL changes, nav/footer and the moved seo calls (diff report attached); the quote and filter e2e tests pass with the env.assets.js fallback',
    'Integration (after w1/build merges): every url-map 301 resolves in one hop to a 200 (serve.mjs + check-links --strict-redirects); no orphan pages; strict check-links passes on a scratch copy with tools/rewrite-links.mjs --write applied',
  ],
  integrationGates: ['node tools/check-links.mjs --strict-redirects   # needs w1/build serve.mjs _redirects', 'node node_modules/playwright/cli.js test --trace off --grep @integration   # the one-hop redirect tests'],
  verifierLens: 'Crawler + screen-reader landmark auditor: old→new URL matrix, nav landmark names, disclosure semantics, orphan detection',
});
def('areas-content', {
  waves: ['w1', 'w2'], lens: 'Local-government researcher-editor (doorway-page avoidance, swap test, sourcing discipline)', port: { w1: 4413, w2: 4428 },
  owns: { w1: ['content/areas/**', 'content/regional.json', 'content/pages/areas.json', req('areas-content')], w2: ['content/areas/**', 'content/regional.json', 'content/pages/areas.json', req('areas-content')] },
  forbidden: ['site/**', 'content/{projects,services,resources,testimonials}/**', 'content/site.json'],
  reads: ['research/area-facts/*.json', 'research/area-sources-R1a.md', 'research/area-sources-R1b.md', 'research/area-verification-V*.md', 'research/areas.json', '.orchestra/reports/content-audit.json', 'CONTRACT.md §2 Hard rules, §6 Content schemas v3 (areas, regional)', 'content/projects/*.json (for proof references)'],
  deliverables: [
    '13 content/areas/<slug>.json files on schema v3 built from research/area-facts: R1 kind "rule" → localRules, "condition" → conditions, "regional" → content/regional.json. Carry sourceUrl, excerpt, sourceTitle, sourceType and verify:true; add summary (written only for this place), proof[], sharedRegional[] ids, servicesBlurb, topServices, neighbours. Never add a fact R1 did not source; never claim "no bylaw exists"; resolve R1\'s flagged conflicts (e.g. the Central Saanich tree threshold) only from a fetched source, otherwise keep the verify note.',
    'reviewedOn: copy the research value where R1 or the V1–V3 verification set it (they fetched the page that day; 2026-11-21). For every fact that is still null, try WebFetch (or curl, for allow-listed hosts) on its sourceUrl in your session and set reviewedOn to today ONLY if the fetch succeeded and the excerpt is on the page; otherwise leave null (it renders "Review date to confirm"). List every fact left null in your return and in .orchestra/requests/areas-content.md; the integrator logs them in .orchestra/carry.json.',
    'The deprecated intro[] and localNotes[] are rewritten IN PLACE with the new place-specific text, with the shared CRD sentences removed (they now live only in regional.json): the legacy area template renders those fields until t-areas ships in W3, so the rendered pages must already be unique.',
    'content/regional.json: ONE block per CRD-wide rule (watering stages, invasive species disposal, provincial private-well guidance, …) referenced by id; rendered once per page inside [data-shared] from W3.',
    'content/pages/areas.json hub copy on the new URLs only.',
  ],
  extraAcceptance: [
    '≥ 3 genuinely local blocks per page: at least one own localRule (sourceUrl, excerpt, verify:true, reviewedOn only if fetched), one sourced condition and one proof (project ref or job note with sample:true), none shared with another area',
    'Sooke covered (wells vs regional water, deer, salt spray, soils where sourced); never "no bylaw exists"',
    'Swap test: exchanging any two municipality names makes both pages false (13/13)',
  ],
  integrationGates: ['node tools/check-content.mjs   # from w1/ia: area-unique-sentences, area-local-blocks, schema-v3', 'node tools/check-links.mjs   # strict, after w1/ia creates the new URLs'],
  verifierLens: 'Adversarial swap-tester and source checker: open every sourceUrl excerpt, run the 78-pair swap test, hunt shared sentences',
});
const CONTENT_PAGES = 'content/pages/{404,about,accessibility,commercial,contact,faq,home,portfolio,projects,privacy,process,resources,reviews,services,terms}.json';
def('content', {
  waves: ['w1', 'w2'], lens: 'Senior copy editor with an honesty lens (no invented facts, Canadian English, plain language)', port: { w1: 4414, w2: 4429 },
  owns: { w1: ['content/{projects,services,resources,testimonials}/**', CONTENT_PAGES, 'site/CONTENT-GUIDE.md', req('content')], w2: ['content/{projects,services,resources,testimonials}/**', CONTENT_PAGES, 'site/CONTENT-GUIDE.md', req('content')] },
  forbidden: ['site/src/**', 'site/tools/**', 'content/areas/**', 'content/regional.json', 'content/site.json', 'content/pages/areas.json', 'content/pages/quote.json'],
  reads: ['.orchestra/reports/content-audit.json', 'content/**', 'CONTRACT.md §2 Hard rules, §3 Bracket tokens, §6 Content schemas v3', 'research/cedar-springs-teardown-blueprint.md A12, A13, C2, C5'],
  deliverables: [
    'Projects (16): challenge, approach[], result, season, duration, scope tags, tags, sample plantPalette (labelled sample), images.art = "proj-<slug>-art" (a virtual slot until living allocates it in W2; check-content accepts it), no budgets; story[] kept only until W3 t-projects stops reading it.',
    'Services (4): localContext, goodFitIf[3–5], perVisit table, seasonal table, faqs 5–6 each, localRulesRefs to regional blocks; seo.title ≤ 60 and seo.description ≤ 155 characters.',
    'content/pages/process.json: overview (4 steps) + two tracks (maintenance, installation) with a deliverable per step + a guarantee built on [WARRANTY].',
    'content/pages/projects.json (replaces portfolio.json; portfolio.json is removed once routes stop falling back).',
    'Resources (6): author {name:"[OWNER NAME]", org:"RNC Landscaping", url:"/about/"}; published = the existing real date (never move or spread dates); updated only when the content really changed; date kept as a deprecated alias.',
    'Trust copy: the [REPLY TIME] promise, "What happens next", credentials via tokens only, reviews band copy with [GOOGLE PROFILE], and commercial proof points written as concrete operational commitments with no invented numbers (A12 #5).',
    'People: only the real owner via [OWNER NAME] / [OWNER BIO]; no team grid; never invent names, roles, bios or crew photos.',
    'Links: NEW text uses the new URLs (/free-quote/, /projects/, /projects/{slug}/, /process/); existing /quote/ and /portfolio/ links are left for the integrator\'s codemod (do not hand-edit them). On your seed base, check-links --url-map accepts the new URLs.',
    'content/pages/quote.json is NOT yours: the quote stream rewrites the whole file in W2. Leave it untouched in W1.',
  ],
  extraAcceptance: [
    'Every sample carries sample:true; additive changes only: old fields removed only where the current templates tolerate it (build + e2e green)',
  ],
  integrationGates: ['node tools/check-content.mjs   # from w1/ia: schema-v3, resource-byline-dates, guarantee, service-tables, service-faqs', 'node tools/check-links.mjs   # strict, after w1/ia creates the new URLs'],
  verifierLens: 'Honesty auditor: flags any real-seeming fact about RNC, invented numbers, superlatives, duplicated boilerplate',
});

/* W2 */
def('ds-core', {
  waves: ['w2'], lens: 'Design-token and accessibility engineer (DTCG, WCAG contrast maths, cascade layers)', port: { w2: 4421 },
  owns: { w2: ['brand/tokens.json', 'brand/tokens.css', 'brand/build-tokens.mjs', 'brand/check-contrast.mjs', 'site/src/styles/0?-*.css', 'site/src/styles/1?-*.css', 'site/src/styles/2?-*.css', 'site/src/styles/9?-*.css', slices('ds-core'), 'site/build.mjs', 'site/src/lib/build/**', 'site/fixtures/brand/**', 'site/tests/unit/ds-core-*.test.mjs', req('ds-core')] },
  forbidden: ['content/**', 'site/src/components/**', 'site/src/scripts/**', 'site/src/styles/{3,4,6,7,8}?-*.css'],
  reads: ['DESIGN-DIRECTION.md', '.orchestra/direction/tokens-proposal.json', '.orchestra/direction/motion-policy.md', '.orchestra/direction/effects-approved.json', 'brand/**', '.orchestra/legacy-css-map.json', 'CONTRACT.md §8 Attribute contract, §9 Motion policy, §12 CSS, §15 Design tokens'],
  deliverables: [
    'tokens.json: dark-first defaults ($extensions["ca.rnc.default"]:"dark"), light values under [data-theme=light]; C3 fluid type scale; glass minimum alphas; two-tone focus ring tokens; manifest colours as tokens.',
    'build-tokens.mjs: emit the reduced-motion zeroing as @media (prefers-reduced-motion: reduce) { :root:not([data-motion=on]) { …0ms } } plus :root[data-motion=off] { …0ms }, so data-motion=on really overrides the OS setting (CONTRACT §8, §9). The integrator regenerates tokens.css after merges.',
    'check-contrast.mjs: every text/surface and focus/surface pair in both themes, solid fallbacks, glass worst cases over the art-palette extremes from tokens-proposal.json.',
    '00-layers.css (layer order), 01-reset, 02-base, 03-type, 05-layout (≥ 16 px body, no horizontal scroll at 320 px, 200 % zoom), 08-utilities, 95-motion.css (T0–T4 tiers; with tokens.css the only place allowed to mention prefers-reduced-motion), 99-print.css.',
    'Delete 50-legacy-32-ds-core.css in W2: its motion rules move into 95-motion.css under the policy (the hero entrance never animates the H1/LCP; the view() reveals become T4 inside @supports and stop when motion is off), its print rules move into 99-print.css. Its `*{animation-duration:0ms!important…}` kill switch is NOT carried over: the tiers replace it. Until it is gone, data-motion=on cannot work.',
    'Re-home the other ds-core slices (01, 03, 24): [hidden] and .vh keep their !important in 01-reset / 08-utilities; then delete the slices. Fallback slices (50-legacy-NNx-ds-core.css, if build created any) stay until their selector owner or W3b removes the rules.',
    'prefers-reduced-transparency, prefers-contrast: more and forced-colors rules; build.mjs reads manifest/theme colours from tokens (site/src/lib/build/** is yours in W2 if the pipeline needs it).',
  ],
  extraAcceptance: [
    'Every surface has ≥ 1 ring colour ≥ 3:1 and the two ring colours are ≥ 3:1 against each other',
    'Without data-theme the page renders dark; [data-theme=light] renders light; no flash (HEAD_SCRIPT applies the stored choice before paint)',
    'With the OS set to reduce and data-motion=on, T1/T2 durations are non-zero; with data-motion=off they are 0 (unit test on the generated CSS now; motion-audit once qa merges)',
    'ds-core slices 01, 03, 24 and 32 deleted; entries for your files gone from the baselines written at the W2 barrier',
  ],
  verifierLens: 'Contrast mathematician: recompute every pair, test forced-colors and 200 % zoom, grep for stray prefers-reduced-motion',
});
def('ds-chrome', {
  waves: ['w2'], lens: 'Interaction engineer for navigation chrome (disclosure, dialogs-without-dialog, focus management, WCAG 2.4.11)', port: { w2: 4422 },
  owns: { w2: ['site/src/components/{layout,sprite}.mjs', 'site/src/scripts/main.js', 'site/src/scripts/lib/**', 'site/src/styles/30-chrome.css', slices('ds-chrome'), 'site/src/lib/tokens.mjs', 'site/tests/e2e/chrome.spec.mjs', 'site/tests/unit/ds-chrome-*.test.mjs', req('ds-chrome')] },
  forbidden: ['content/**', 'brand/**', 'site/src/components/ui/**', 'site/src/pages/**'],
  reads: ['DESIGN-DIRECTION.md', '.orchestra/direction/motion-policy.md', 'CONTRACT.md §3 Tokens, §5 Nav/Footer, §8 Attribute contract, §13 Analytics events', 'site/COMPONENTS.md §Chrome', 'site/tests/e2e/chrome.spec.mjs (keep every #rule test ia wrote)'],
  deliverables: [
    'Glass header; Services ▾ / Service areas ▾ disclosures: rename the W1 hooks data-mega / data-mega-toggle / data-mega-panel to data-disclosure / data-disclosure-panel on BOTH sides (layout.mjs and main.js) in your branch; mobile sheet (inert background, Esc closes, focus returns, accordions); one nav DOM.',
    'Header Call and Free quote buttons only at ≥ 64em; below 64em the sticky bar carries them (five 44 px header buttons plus the logo overflow 320 px). Logo, Menu and the two toggles stay visible at every width.',
    'Sticky Call / Free-quote bar below 64em: each ≥ 48 px, env(safe-area-inset-bottom), hidden while [data-quote-form] is in view (ia added the hook in W1) or the on-screen keyboard is open. Its Call button reads "Contact" → /contact/ until [PHONE] is known (CONTRACT §8).',
    'Theme and Animations toggles: <button aria-pressed> named "Dark theme" and "Animations", ≥ 44×44, visible at every width, persisted (rnc-theme / rnc-motion), circular view-transition reveal, updates meta theme-color.',
    'tel:/sms:/mailto: in header and footer (telLink/mailLink/smsLink in lib/tokens.mjs). A link whose URL depends on an unresolved token renders as text + chip, never an href (CONTRACT §3).',
    'scroll-padding-top/bottom = header and bar heights (2.4.11); lib/prefs.js + lib/track.js final.',
    'main.js clean-up: delete the pointer sheen ("glass highlight that follows the pointer"; the T3 spotlight belongs to living.js); replace every reduceMotion matchMedia check with prefs.motionOn() / onMotionChange(); remove the W1 static imports of ./quote.js and ./projects.js (routes load them through scripts[]).',
    'Delete the seed-time JS_FLAG alias from layout.mjs. Rename data-track values to the CONTRACT §13 names in layout.mjs (call_clicked → call_click), lib/tokens.mjs (telLink → call_click, mailLink → email_click, new smsLink → sms_click) and main.js\'s delegated handler.',
    'Plausible loader in layout.mjs: only in launch builds with [PLAUSIBLE DOMAIN] set; no other third party (A13 #28).',
    'sprite.mjs: add every icon named in DESIGN-DIRECTION.md and site/COMPONENTS.md now. The sprite is frozen in W3; later needs go through requests.',
  ],
  extraAcceptance: [
    'Keyboard-only pass: no focused element fully obscured by header or bar at 320–1440',
    'check-html#data-track-names green on the integration tip after the W2 merge',
    'ds-chrome slices 07, 21 and 22 deleted (the !important on .mega and .brand--footer:hover with them)',
  ],
  verifierLens: 'Keyboard and screen-reader tester: Tab through every page width, Esc paths, focus return, aria-pressed state persistence across reloads',
});
def('ds-comp', {
  waves: ['w2'], lens: 'Component-library engineer (frozen APIs, container queries, accessible markup patterns)', port: { w2: 4423 },
  owns: { w2: ['site/src/components/ui/{actions,heads,cards,projects,trust,faq,cta,seasons,callouts}.mjs', 'site/src/styles/{40,41,42,43,44,46,47,48,49}-ui-*.css', 'site/src/styles/80-styleguide.css', slices('ds-comp'), 'site/src/pages/styleguide.mjs', 'site/COMPONENTS.md', 'site/tests/unit/ui-api.test.mjs', 'site/tests/unit/ds-comp-*.test.mjs', 'site/tests/e2e/components.spec.mjs', req('ds-comp')] },
  forbidden: ['content/**', 'brand/**', 'site/src/components/ui/index.mjs', 'site/src/components/{layout,living,map,forms}.mjs', 'site/src/pages/{home,services,areas,projects,company,editorial,quote,routes,_shared}.mjs'],
  reads: ['site/COMPONENTS.md', 'DESIGN-DIRECTION.md', '.orchestra/direction/effects-approved.json', '.orchestra/legacy-css-map.json', 'CONTRACT.md §3 Tokens, §8 Attribute contract, §10 Components, §13 Analytics events'],
  deliverables: [
    'Every C3 primitive in COMPONENTS.md with the frozen API: hero with living-scene slot, numbered section heads, spec strip, tiles, spotlight bento card, timeline, review card + reviews band, credentials row, local-rules callout with last-reviewed date, shared-regional block, guarantee, reassurance strip, FAQ <details>, living CTA band, fallback contact panel, in-page TOC.',
    'Replace data-tilt on featureBento (cards.mjs; ui.mjs:97 before the split) with data-spotlight: tilt is banned.',
    'Rename data-track values in actions.mjs (secondaryBtn and callBtn: call_clicked → call_click) and every other emitter you own to the CONTRACT §13 names. callBtn renders a non-link placeholder (text + chip) when [PHONE] is unresolved in showcase builds and nothing in launch builds.',
    'Container-query reflow at 320 px for every card/tile; paired 4x-ui-*.css files. Restyling a selector with a legacy !important (the aspect-ratio rules in slice 08) means deleting that declaration from your slice.',
    'tests/unit/ui-api.test.mjs was written by ia in W1: you may only APPEND entries for new exports and parameters (.orchestra/tools/ownership.mjs fails on any deleted line in that file).',
    '/styleguide/ (noindex, not in the sitemap, showcase builds only) rendering every primitive in both themes. W2 primitive acceptance (P1 #8, C4.1, C4.4a) is checked there, because no stream owns the page files in W2.',
  ],
  extraAcceptance: [
    'No primitive emits a heading level the caller did not choose; hero()/pageHead() emit the page\'s only H1',
    'ds-comp slices 02, 05, 08, 10, 12, 14 and 23 deleted',
  ],
  verifierLens: 'API contract auditor: diff exports against COMPONENTS.md, axe every styleguide specimen at 320 and 1440 in both themes',
});
def('living', {
  waves: ['w2'], lens: 'Generative-SVG artist + rendering-performance engineer (composited-only animation, deterministic output)', port: { w2: 4424 },
  owns: { w2: ['site/src/lib/{art,images}.mjs', 'site/src/components/living.mjs', 'site/src/styles/45-living.css', slices('living'), 'site/src/scripts/living.js', 'media/images.json', 'media/shot-list.md', 'media/photos/**', 'media/photos.json', 'site/static/img/**', 'site/tools/process-images.mjs', 'site/fixtures/media/**', 'site/tests/unit/living-*.test.mjs', 'site/tests/e2e/living.spec.mjs', req('living')] },
  forbidden: ['content/**', 'brand/tokens.json', 'site/src/components/ui/**', 'site/src/pages/**'],
  reads: ['DESIGN-DIRECTION.md', '.orchestra/direction/effects-approved.json', '.orchestra/direction/motion-policy.md', '.orchestra/reports/effects-lab.json', 'CONTRACT.md §7 Images, §8 Attribute contract, §9 Motion policy, §10 Components'],
  deliverables: [
    'livingScene(id, o) / projectArt(project, o) / illustrationChip(): layered theme-reactive scenes (night bioluminescent, light dawn), 13 distinct area scenes, per-project art.',
    'Layers are separate OUTER <svg> boxes animated by transform/opacity only; living.js sets data-alive after load + idle while prefs.motionOn(), pauses off-screen (IntersectionObserver → data-offscreen) and on hidden tabs via --alive-play.',
    'Cursor spotlight (T3, fine pointer only, off when motion is off) and rationed @property borders in living.js / 45-living.css (main.js no longer has a sheen).',
    '<picture> AVIF/WebP/JPEG at 480/768/1024/1600 via tools/process-images.mjs (sharp from scratch, EXIF stripped, licence manifest media/photos.json).',
    'media/images.json: stock:null on every project and portfolio slot; per-project art slots proj-<slug>-art (×16) and process-hero allocated; usedOn updated to the new URLs. picture() in lib/images.mjs renders projectArt()/livingScene() for a slot that has art and no stock: that is how /projects/ ends up with no stock photos without editing page files. Unknown slots still render labelled art.',
    'Scenes are proven on /styleguide/ (living section) and, through images.json, on /projects/ in W2.',
  ],
  extraAcceptance: ['Deterministic bytes (two builds identical), namespaced ids lv-*, hero scene ≤ 16 KB raw, aria-hidden "Illustration" chip', 'No infinite animation runs with motion off or without JS', 'living slices 04, 06 and 25 deleted'],
  verifierLens: 'Frame-budget profiler: 4× CPU throttle traces, Lighthouse delta, motion-audit with motion off/on, determinism diff',
});
def('seo', {
  waves: ['w2'], lens: 'Technical SEO engineer (schema.org graphs, Google policies on self-serving reviews and doorway pages)', port: { w2: 4425 },
  owns: { w2: ['site/src/lib/{schema,seo}.mjs', 'site/src/pages/redirects.mjs', 'site/tools/{check-seo,og-cards}.mjs', 'site/static/og/**', 'site/tests/unit/seo-*.test.mjs', 'site/tests/e2e/redirects.spec.mjs', req('seo')] },
  forbidden: ['content/**', 'site/src/components/**', 'site/src/styles/**'],
  reads: ['CONTRACT.md §5 URL map, §14 Build interface, §17 Baselines', '.orchestra/url-map.json', 'research/cedar-springs-teardown-blueprint.md C6, A9, A13'],
  deliverables: [
    'C6 @graph per page with @ids: HomeAndConstructionBusiness, WebSite, WebPage, Service, BreadcrumbList, FAQPage (semantic only), Article with author; areaServed 13 places, hasOfferCatalog 4 services; placeholders omitted; no Review/AggregateRating.',
    'og:locale en_CA, og:type website (article for guides), per-page OG image with fallback.',
    'tools/check-seo.mjs with every rule under providesRules (export RULES; report through tools/lib.mjs so the integrator can baseline legacy failures at your merge). [data-shared] is exempt from the duplicate rules. Titles ≤ 60 and meta descriptions ≤ 155 characters.',
    'tools/og-cards.mjs ready (cards rendered in W5 by og-render).',
  ],
  extraAcceptance: ['Unit tests snapshot the graph for home, a service, an area, a project and a guide'],
  verifierLens: 'Rich-results validator mindset: parse every JSON-LD block, check @id references resolve, look for invented values',
});
def('quote', {
  waves: ['w2'], lens: 'Conversion-form engineer (progressive enhancement, mailto encoding, accessible validation)', port: { w2: 4426 },
  owns: { w2: ['site/src/components/forms.mjs', 'site/src/scripts/quote.js', 'site/src/styles/70-quote.css', slices('quote'), 'site/src/pages/quote.mjs', 'content/pages/quote.json', 'site/event-schema.yaml', 'site/event-schema.d.ts', 'site/tools/gen-event-types.mjs', 'site/tests/unit/quote-*.test.mjs', 'site/tests/e2e/quote.spec.mjs', req('quote')] },
  forbidden: ['site/src/components/ui/**', 'site/src/components/layout.mjs', 'brand/**'],
  reads: ['REDESIGN-PLAN.md §Quote builder', 'CONTRACT.md §6 quote.json, §13 Analytics events', 'research/cedar-springs-teardown-blueprint.md C2 Free quote, C5'],
  deliverables: [
    'Six inputs: services (4 multi-select cards + "Not sure yet"), municipality <select> of 13 (+ "somewhere else"), description, timing (ASAP / this season / planning ahead), name, best way to reach you (email / call / text; the phone field appears and becomes required for call or text). No email field.',
    '?area= / ?service= prefill; form action = mailto (method=post enctype=text/plain) so it works without JS; subject "Free quote request — X — Y"; URL body ≤ 1,800 characters (truncate + tell them to paste the copied full text). Keep form[data-quote-form].',
    'Ready panel: Copy request (role=status confirmation), address + copy button, Call / Text (only when PHONE is known), Gmail / Outlook web compose links.',
    'Native validation + inline errors (aria-describedby) + error summary on submit; values never cleared; sessionStorage draft.',
    'content/pages/quote.json is yours outright (v3 schema, CONTRACT §6); nobody edited it in W1.',
    'Plausible events (CONTRACT §13) with no personal data; pure builder functions exported from quote.js and unit-tested. event-schema.yaml: the seed added the §13 names next to the v2 ones; rename your own emitters, then delete the deprecated v2 entries and regenerate event-schema.d.ts (ds-chrome and ds-comp merge before you and rename theirs).',
  ],
  extraAcceptance: ['Free-quote page order: H1 → reassurance strip ([REPLY TIME]) → builder → What happens next (3) → alternative contacts → privacy note', 'quote slices 19 and 26 deleted (the !important on [aria-invalid] and .choice--check with them)'],
  verifierLens: 'Mail-client pessimist: length caps, encoding of non-ASCII, no-JS submit, back-navigation draft restore, screen-reader error flow',
});
def('qa', {
  waves: ['w2'], lens: 'QA tooling engineer (Playwright, axe, Lighthouse, fault injection)', port: { w2: 4427 },
  owns: { w2: ['site/playwright.config.mjs', 'site/tests/helpers/**', 'site/tests/e2e/global.spec.mjs', 'site/tools/{a11y,lighthouse,measure,motion-audit,text-over-media,check-honesty,check-motion-policy,check-ci,trace,budgets,screenshots,check-all,check-html,check-links,check-placeholders,check-tokens,check-content,serve,lib,csp,dev-setup}.mjs', 'site/tools/schemas/**', 'site/fixtures/content/**', 'site/lighthouserc.json', '.github/workflows/ci.yml', 'netlify.toml', 'site/tests/unit/qa-*.test.mjs', req('qa')] },
  forbidden: ['content/**', 'site/src/**', 'brand/**'],
  reads: ['.orchestra/traceability.json', '.orchestra/ownership.json', 'CONTRACT.md §14 Build interface, §16 Gates and budgets, §17 Baselines', '.orchestra/direction/motion-policy.md', 'site/event-schema.yaml'],
  deliverables: [
    'global.spec: every page 200, one H1, no console/CSP errors in both themes, no horizontal overflow at 320 px, 200 % zoom (#reflow-320-zoom-200).',
    'a11y.mjs (axe injected via a bypassCSP context only; wcag2a/2aa/21aa/22aa; themes × widths × motion; rules axe-matrix and target-size), lighthouse.mjs (median of 3, benchmarkIndex guard; rules median-of-3 and cwv: lab LCP ≤ 1.8 s, CLS ≤ 0.05, TBT ≤ 150 ms as the INP proxy), measure.mjs (audit-report JSON), motion-audit.mjs, text-over-media.mjs, check-honesty.mjs, check-motion-policy.mjs (banned effects + raw durations + prefers-reduced-motion placement), budgets v2 (CONTRACT §16 incl. hero raster ≤ 120 KB), screenshot matrix. Every rule under providesRules, exported in RULES.',
    'check-html#data-track-names: every data-track value and track() name exists in site/event-schema.yaml and none is a deprecated v2 name.',
    'tools/trace.mjs (not a check-*: it needs .orchestra): fails when a traceability tool#rule is missing from that tool\'s literal RULES, or an e2e/unit check has no test whose title contains #rule; --upto=<wave> limits it to items due by then; --stream=<id>. Read RULES statically: never import a tool, because tools run on import.',
    'tools/check-ci.mjs#required-gates: parses .github/workflows/ci.yml; typecheck, unit, build, check-all, csp, Playwright, a11y and Lighthouse steps present, on the new URLs, and not continue-on-error (except the launch gate); exits 0 when ci.yml is absent.',
    'Every tool reports through tools/lib.mjs report() with baselines (CONTRACT §17); take over check-links, check-html, check-content and site/fixtures/content/** from ia without dropping a rule.',
    'CI on the new URLs; serve.mjs-based Playwright so the real CSP is enforced.',
  ],
  extraAcceptance: ['Fault injection in a scratch copy: an a11y bug, a CSP violation, a 320 px overflow and a stock photo on /projects/ are all caught, each naming the page'],
  verifierLens: 'Mutation tester: seed faults, confirm each tool fails loudly and names the page',
});

/* W3 */
const fam = (id, lens, page, cssn, extra, port, ext = {}) => def(id, {
  waves: ['w3'], lens, port: { w3: port },
  owns: { w3: [`site/src/pages/${page}.mjs`, `site/src/styles/${cssn}.css`, slices(id), `site/tests/e2e/${page}.spec.mjs`, `site/tests/unit/${id}-*.test.mjs`, ...extra, req(id)] },
  forbidden: ['content/**', 'brand/**', ...FROZEN_W3, 'site/src/pages/{routes,_shared}.mjs'],
  reads: ['DESIGN-DIRECTION.md', 'site/COMPONENTS.md', 'CONTRACT.md', '.orchestra/legacy-css-map.json', 'research/cedar-springs-teardown-blueprint.md C2', ...(ext.extraReads || [])],
  verifierLens: 'Art director + blueprint auditor: C2 section order, both themes at 5 widths, motion on/off, no-JS',
  ...ext,
  extraAcceptance: [...(ext.extraAcceptance || []), `${id} legacy slices deleted; no .orchestra/baselines entry left whose path is one of your pages (url-map owner ${id}) or your files`],
});
fam('t-home', 'Art-directed template builder: Home', 'home', '60-home', ['site/src/components/ui/{cards,cta}.mjs', 'site/src/styles/{42-ui-cards,47-ui-cta}.css'], 4431, {
  deliverables: ['C2 Home sections 1–10: living split hero (H1 + CTAs, scene slot), four service tiles, featured project spec strip (no budget), 4-step timeline from process.json overview, reviews band with Google link, local-rules teaser, area map + list, short FAQ (4), living CTA band, footer', 'Remove the inline-link regex hack in site/src/pages/home.mjs (ia moved it there from routes.mjs:64 in W1): the featured-project link is rendered by home.mjs, not stripped out of content', 'Home dock/hero: no decorative text rendered twice (aria-hidden on decorative duplicates or render once)'],
  extraAcceptance: ['H1 is the LCP element; no reveal animation on it'], extraReads: ['content/pages/home.json', 'content/pages/process.json', 'content/projects/*.json', 'content/testimonials/*.json', 'content/regional.json'],
});
fam('t-services', 'Art-directed template builder: Services + Commercial', 'services', '61-services', ['site/src/components/ui/{seasons,callouts}.mjs', 'site/src/styles/{48-ui-seasons,49-ui-callouts}.css'], 4432, {
  deliverables: ['Services hub + 4 service pages: H1 with local context → What\'s included → Good fit if… → per-visit table → seasonal timeline → process → related projects → reviews band with the Google profile link → local-rules callout → FAQ 5–6 → CTA; sticky in-page TOC on desktop', 'Every service page links to all 13 municipality pages', 'Commercial page rendering the content stream\'s operational proof points (no invented numbers)'],
  extraReads: ['content/services/*.json', 'content/pages/{services,commercial}.json', 'content/regional.json'],
});
fam('t-areas', 'Art-directed template builder: Service areas + interactive map', 'areas', '62-areas', ['site/src/components/map.mjs', 'site/src/scripts/areas.js'], 4433, {
  deliverables: ['/areas/ hub with an interactive glowing SVG map + list (ONE keyboard path: the list; tiles tabindex=-1, state mirrored via :has())', '13 municipality pages: H1 "Landscaping in X" → place summary → Local rules that affect your yard (sourceChip, reviewedOn: "Last reviewed 19 November 2026" or "Review date to confirm") → conditions → most-requested services and why → local proof → shared regional block [data-shared] → neighbouring municipalities → CTA /free-quote/?area=<slug>. Stop rendering the deprecated intro[]/localNotes[] (areas-content may then drop them)'],
  extraAcceptance: ['Each municipality links to the 4 services and to 1–3 projects in that municipality when they exist', 'Map hover/focus glow only while active; ambient pulse on the current area is T2 (var(--alive-play))'], extraReads: ['content/areas/*.json', 'content/regional.json', 'content/pages/areas.json', 'research/area-facts/*.json'],
});
fam('t-projects', 'Art-directed template builder: Projects + case studies', 'projects', '63-projects', ['site/src/components/ui/projects.mjs', 'site/src/styles/43-ui-projects.css', 'site/src/scripts/projects.js'], 4434, {
  deliverables: ['/projects/ filters by service × municipality (GET form; works without JS, shows all) with a same-document View Transition', 'Case study: hero (projectArt) → spec strip (municipality, service, season, duration, scope tags, plant palette) → Challenge / Approach / Result → gallery with keyboard before/after + side-by-side toggle → client quote if real → related → CTA; every project links back to its service and municipality'],
  extraAcceptance: ['No stock photo anywhere under /projects/ (check-honesty#stock-in-projects)', 'Stop reading story[] (content may then drop it)'], extraReads: ['content/projects/*.json', 'content/pages/projects.json', 'content/testimonials/*.json'],
});
fam('t-company', 'Art-directed template builder: Process, About, FAQ, Reviews, Contact', 'company', '64-company', ['site/src/components/ui/{trust,faq}.mjs', 'site/src/styles/{44-ui-trust,46-ui-faq}.css'], 4435, {
  deliverables: ['/process/ with maintenance and installation tracks, a deliverable per step and the guarantee', '/about/: only real people — the owner via [OWNER NAME] / [OWNER BIO]; no team grid; no stock people; credentials row from tokens only', '/faq/ grouped by category, /reviews/ (labelled Sample, Google link, no review schema), /contact/ with the fallback contact panel'],
  extraAcceptance: ['No Review or AggregateRating markup anywhere'], extraReads: ['content/pages/{process,about,faq,reviews,contact}.json', 'content/testimonials/*.json', 'content/site.json'],
});
fam('t-editorial', 'Editorial template builder: guides, legal, accessibility statement, 404', 'editorial', '65-editorial', [], 4436, {
  deliverables: ['Resources hub + 6 guides with byline "[OWNER NAME], RNC Landscaping" → /about/, published/updated <time> shown as "19 November 2026"; reading progress is scroll-linked, so it is T4 (inside @supports (animation-timeline: scroll()), off when motion is off)', 'Privacy, terms, accessibility statement (WCAG 2.2 AA, voluntary under Accessible BC; documents the Dark theme and Animations toggles)', 'Helpful 404 with links to the hubs, the free quote and contact'],
  extraReads: ['content/resources/*.json', 'content/pages/{resources,privacy,terms,accessibility,404}.json'],
});
def('css-consolidator', {
  waves: ['w3', 'w3b'], lens: 'CSS architect (cascade layers, dead-code removal, pixel-diff discipline)', port: { w3: 4437, w3b: 4437 },
  owns: { w3: ['site/tools/check-css.mjs', 'site/tests/unit/css-*.test.mjs', req('css-consolidator')], w3b: ['site/src/styles/**', 'site/tools/check-css.mjs', 'site/tests/unit/css-*.test.mjs', req('css-consolidator')] },
  forbidden: ['content/**', 'site/src/components/**', 'site/src/pages/**', 'site/src/scripts/**', 'brand/**'],
  reads: ['.orchestra/legacy-css-map.json', '.orchestra/direction/motion-policy.md', 'CONTRACT.md §9 Motion policy, §12 CSS'],
  deliverables: ['w3 (parallel with the families; your w3 branch is NOT merged at the W3 barrier but first thing at W3b): tools/check-css.mjs — no 50-legacy-* files, no duplicate selectors across files, every animation/transition routed through the motion-policy custom properties, prefers-reduced-motion only in tokens.css/95-motion.css, a layer declared in every file', 'w3b (exclusive lock after the family merges): delete leftover legacy slices (fallback NNx slices included), dedupe, consolidate; check-css green'],
  extraAcceptance: ['≤ 0.1 % pixel diff across the screenshot matrix before/after w3b', 'CSS gz per page ≤ 28 KB warn / 36 KB fail'],
  verifierLens: 'Cascade forensics: per-selector diff of computed styles across the screenshot matrix',
});

/* W4 */
const FINDERS = {
  'f-a11y': ['Accessibility auditor (WCAG 2.2 AA, keyboard, screen reader)', 'axe matrix from the evidence pack; a MANUAL keyboard + screen-reader pass (NVDA/VoiceOver equivalents via the accessibility tree) on every template at 320 and 1440 in both themes; focus not obscured; target sizes; reduced motion'],
  'f-perf': ['Performance engineer', 'Lighthouse median of 3 per template, CWV lab values, budgets v2, long tasks with motion on, backdrop-filter counts per mobile viewport'],
  'f-seo': ['Technical SEO auditor', 'JSON-LD graph, titles/meta, canonicals, sitemap, _redirects one hop, internal linking matrix, duplicate text'],
  'f-visual': ['Art director reading the screenshot PNGs', '5 widths × 2 themes × motion; "stunning and alive" against DESIGN-DIRECTION.md; A12 #6 and P4 #18 recorded as superseded on aesthetics with the hard constraints kept'],
  'f-blueprint': ['Adversarial blueprint auditor', 'every .orchestra/traceability.json item against the running site, not against the code'],
  'f-honesty': ['Honesty auditor', 'invented facts, prices, superlatives, stock under /projects/, samples unlabelled, Review schema, and a REAL swap test across the 78 area pairs'],
  'f-interaction': ['Interaction tester', 'menus, sheet, toggles, sticky bar, quote builder (JS and no-JS), filters, before/after, map, view transitions, back/forward'],
};
let fport = 4471;
for (const [id, [lens, scope]] of Object.entries(FINDERS)) def(id, {
  waves: ['w4'], lens: `${lens} — READ-ONLY finder`, port: { w4: fport++ }, readOnly: true,
  owns: { w4: [] }, forbidden: ['**'],
  reads: ['.orchestra/reports/w4/evidence/**', '.orchestra/traceability.json', 'CONTRACT.md', 'DESIGN-DIRECTION.md'],
  deliverables: [`Scope: ${scope}.`, 'Return findings as JSON [{id, severity: Blocker|Major|Minor, page, width, theme, motion, repro, expected, actual, check?, suspectedOwner}] using the CONTRACT §16 severity rules. Write nothing; w4-triage records your findings.'],
  extraAcceptance: [], verifierLens: 'n/a (finder)',
});
def('w4-evidence', {
  waves: ['w4'], lens: 'Quiet-slot measurement operator (reproducible evidence, no flakiness)', port: { w4: 4400 },
  owns: { w4: ['.orchestra/reports/w4/evidence/**', '.orchestra/reports/trace-status.json', req('w4-evidence')] },
  forbidden: ['site/**', 'content/**', 'brand/**', 'media/**'],
  reads: ['REDESIGN-PLAN.md §Verification', '.orchestra/traceability.json', 'CONTRACT.md §16, §17'],
  deliverables: [
    'Evidence pack per round in .orchestra/reports/w4/evidence/r<n>/: axe matrix (dark/light × 320/1440 × motion off/on), Lighthouse median of 3 on about 15 templates, screenshots at 320/390/768/1024/1440 × light/dark × motion, budgets, motion-audit, text-over-media, measure.mjs audit-report.json (A13 #36).',
    '.orchestra/reports/trace-status.json: status per traceability item (planned → in-progress → evidenced with an evidence path → known-issue). traceability.json itself never changes.',
    'Run alone in the quiet slot (no other builds or browsers), with --no-baseline as well as with baselines, so remaining baseline entries are visible.',
  ],
  extraAcceptance: [], verifierLens: 'n/a (evidence)',
});
def('w4-triage', {
  waves: ['w4'], lens: 'Triage lead (dedupe, reproduce, route by ownership)', port: { w4: 4446 },
  owns: { w4: ['.orchestra/tickets/**', '.orchestra/carry.json', '.orchestra/reports/w4/findings/**', '.orchestra/reports/w4/manual-a11y.md', req('w4-triage')] },
  forbidden: ['site/**', 'content/**', 'brand/**', 'media/**'],
  reads: ['.orchestra/ownership.json (waves.w4)', '.orchestra/reports/w4/evidence/**', 'CONTRACT.md §16'],
  deliverables: [
    'Dedupe and reproduce the 7 finders\' findings; write .orchestra/reports/w4/findings/r<n>.json and one ticket per defect in .orchestra/tickets/T<nnn>.json {id, severity, owner (the W4 fixer whose owns match the paths), paths, repro, check, closure}.',
    'Record f-a11y\'s manual keyboard + screen-reader pass in .orchestra/reports/w4/manual-a11y.md (C7 #5): template, width, theme, assistive path, result.',
    'Closure checks every round; the divergence guard: stop and escalate if a round opens ≥ the previous round\'s Blocker + Major count. Partial items go to .orchestra/carry.json.',
  ],
  extraAcceptance: [], verifierLens: 'n/a (triage)',
});
const W4_OWNS = {
  'fix-system': ['brand/tokens.json', 'brand/tokens.css', 'brand/check-contrast.mjs', 'brand/build-tokens.mjs', 'site/build.mjs', 'site/src/lib/build/**', 'site/src/lib/{tokens,data,html,dates}.mjs', 'site/src/components/{layout,sprite}.mjs', 'site/src/components/ui/{actions,heads}.mjs', 'site/src/scripts/main.js', 'site/src/scripts/lib/**', 'site/src/styles/{0,1,2,9}?-*.css', 'site/src/styles/30-chrome.css', 'site/src/styles/{40-ui-actions,41-ui-heads}.css', 'site/tests/e2e/chrome.spec.mjs', 'site/tests/unit/{build,ds-core,ds-chrome}-*.test.mjs', 'site/tests/fixtures/build/**'],
  'fix-features': ['site/src/lib/{art,images,schema,seo}.mjs', 'site/src/components/{living,forms}.mjs', 'site/src/scripts/{living,quote}.js', 'site/src/styles/{45-living,70-quote,80-styleguide}.css', 'site/src/pages/{quote,styleguide,redirects}.mjs', 'site/src/components/ui/{cards,cta,seasons,callouts,trust,faq,projects}.mjs', 'site/src/styles/{42,43,44,46,47,48,49}-ui-*.css', 'media/**', 'site/static/**', 'site/event-schema.*', 'site/tests/e2e/{quote,living,components,redirects}.spec.mjs', 'site/tests/unit/{quote,living,seo,ds-comp}-*.test.mjs', 'site/tests/unit/ui-api.test.mjs'],
  'fix-pages': ['site/src/pages/{_shared,home,services,areas,projects,company,editorial}.mjs', 'site/src/styles/6?-*.css', 'site/src/components/map.mjs', 'site/src/scripts/{areas,projects}.js', 'site/tests/e2e/{home,services,areas,projects,company,editorial}.spec.mjs', 'site/tests/unit/t-*.test.mjs'],
  'fix-qa': ['site/tools/**', 'site/tests/helpers/**', 'site/tests/e2e/global.spec.mjs', 'site/tests/unit/{qa,ia,css}-*.test.mjs', 'site/fixtures/**', 'site/playwright.config.mjs', 'site/lighthouserc.json', 'site/jsconfig.json', '.github/workflows/ci.yml', 'netlify.toml'],
  'fix-content': ['content/{areas,projects,services,resources,testimonials,pages}/**', 'content/regional.json', 'site/CONTENT-GUIDE.md'],
};
const W4_LENS = { 'fix-system': 'System fixer (tokens, build, chrome, frozen primitives)', 'fix-features': 'Feature fixer (living art, quote, seo, primitives)', 'fix-pages': 'Page-template fixer', 'fix-qa': 'Tooling and CI fixer', 'fix-content': 'Content fixer (honesty, swap test)' };
let xport = 4441;
for (const [id, owns] of Object.entries(W4_OWNS)) def(id, {
  waves: ['w4'], lens: W4_LENS[id], port: { w4: xport++ },
  owns: { w4: [...owns, req(id)] }, forbidden: ['site/src/pages/routes.mjs', 'site/src/components/ui/index.mjs'],
  reads: ['.orchestra/tickets/*.json (yours only)', '.orchestra/reports/w4/**', 'CONTRACT.md', 'site/COMPONENTS.md'],
  deliverables: ['Fix every ticket assigned to you this round, on branch w4/r<round>/' + id + ', inside your owns; a ticket that needs another owner\'s path goes back to triage as a request.', 'Prune: make every baseline entry for your files or pages pass, so the integrator can remove it (W4 exits only with every baseline empty).'],
  extraAcceptance: ['Every assigned ticket\'s closure check passes on the round tip'],
  verifierLens: 'Ticket closure verifier: re-run each ticket\'s repro and check on the round tip',
});

/* W5 */
def('og-render', {
  waves: ['w5'], lens: 'Social-card renderer', port: { w5: 4451 },
  owns: { w5: ['site/static/og/**', req('og-render')] }, forbidden: ['site/src/**', 'content/**'],
  reads: ['site/tools/og-cards.mjs', 'CONTRACT.md §5'],
  deliverables: ['Render and commit one OG card per page template with tools/og-cards.mjs (≤ 45 KB each), wired through the existing per-page og:image fallback.'],
  extraAcceptance: [], verifierLens: 'Social preview checker: every og:image resolves, ≤ 45 KB, correct per template',
});
def('docs', {
  waves: ['w5'], lens: 'Technical writer (truthful status, launch hand-off)', port: { w5: 4452 },
  owns: { w5: ['README.md', 'site/README.md', 'CONTRACT.md', 'REDESIGN-PLAN.md', 'TRACEABILITY.md', 'site/CHANGELOG.md', 'site/LAUNCH-CHECKLIST.md', 'site/CONTENT-GUIDE.md', 'site/COMPONENTS.md', 'brand/brand.md', 'DESIGN-DIRECTION.md', req('docs')] },
  forbidden: ['content/**', 'site/src/**'],
  reads: ['.orchestra/traceability.json', '.orchestra/reports/trace-status.json', '.orchestra/carry.json', '.orchestra/reports/w4/**'],
  deliverables: ['README, site/README.md, CONTRACT v3 final (record any speculation-rules fallback), CHANGELOG, brand.md', 'LAUNCH-CHECKLIST: every token to fill, every verify:true fact to re-check, GBP set-up (categories = the 4 service lines, service areas = the 13 municipalities, NAP identical to site.json, review link = [GOOGLE PROFILE]), SITE_MODE=launch steps', 'TRACEABILITY.md from traceability.json + trace-status.json: every item → code and evidence; A12 #6 and P4 #18 marked "superseded on aesthetics, hard constraints kept"; known issues from carry.json'],
  extraAcceptance: [], verifierLens: 'Fact checker: every claim in the docs matches the code and the evidence',
});
def('ci', {
  waves: ['w5'], lens: 'CI engineer', port: { w5: 4453 },
  owns: { w5: ['.github/workflows/ci.yml', 'site/lighthouserc.json', 'site/playwright.config.mjs', 'netlify.toml', req('ci')] }, forbidden: ['content/**', 'site/src/**'],
  reads: ['REDESIGN-PLAN.md §Verification', 'site/tools/check-ci.mjs'],
  deliverables: ['Final ci.yml: typecheck fixed, pinned Playwright, the new URLs, filesystem LHCI uploads, check-ci green'],
  extraAcceptance: [], verifierLens: 'CI sceptic: run the workflow steps locally in order',
});
def('release-gate', {
  waves: ['w5'], lens: 'Release gatekeeper (read-only)', port: { w5: 4454 },
  owns: { w5: ['.orchestra/reports/w5/**', req('release-gate')] }, forbidden: ['site/**', 'content/**', 'brand/**', 'media/**'],
  reads: ['REDESIGN-PLAN.md §Verification', '.orchestra/traceability.json', '.orchestra/reports/trace-status.json'],
  deliverables: ['Run the full REDESIGN-PLAN §Verification gate with --no-baseline on the W5 tip and write .orchestra/reports/w5/release-gate.json; git hygiene (no stray files, no secrets, branch refs, tags)'],
  extraAcceptance: [], verifierLens: 'n/a (gate)',
});

/* W0 (ownership only; these lanes have run or run alongside W1) */
const W0 = {
  architect: { owns: ['CONTRACT.md', 'REDESIGN-PLAN.md', 'site/COMPONENTS.md', '.orchestra/{ownership,url-map,legacy-css-map,traceability}.json', '.orchestra/briefs/**', '.orchestra/tools/**'], note: 'A1 architect, then A3 reviser (sequential, same write set)' },
  'art-direction': { owns: ['.orchestra/direction/**', 'DESIGN-DIRECTION.md'], note: 'P1–P3, judges, S1; overlaps W1' },
  reports: { owns: ['.orchestra/reports/**'], note: 'L1 effects lab, R2 content audit; overlaps W1' },
  r1: { owns: ['research/area-facts/**', 'research/area-sources-R1{a,b}.md', 'research/area-verification-V*.md'], note: 'R1 area research and the V1–V3 source verification (W0b); may still re-verify sources while W1 runs' },
};

/* ------------------------------------------------------------------ ownership.json */
const waves = Object.fromEntries(WAVES.map((w) => [w, {}]));
for (const [k, v] of Object.entries(W0)) waves.w0[k] = { owns: [...new Set([...v.owns, req(k)])], forbidden: ['site/src/**', 'content/**'], note: v.note };
for (const s of Object.values(S)) for (const w of s.waves) {
  const owns = s.owns[w];
  const raw = s.readOnly ? s.forbidden : [...ALWAYS_FORBIDDEN, ...(w !== 'w1' ? FROZEN_AFTER_W1 : []), ...s.forbidden];
  waves[w][s.id] = { owns, forbidden: s.readOnly ? raw : pruneForbidden(raw, owns), ...(s.readOnly ? { readOnly: true } : {}) };
}
const planned = [
  // build + lib
  'site/src/lib/head-scripts.mjs', 'site/src/lib/seo.mjs', 'site/src/lib/dates.mjs', 'site/src/lib/build/minify-css.mjs', 'site/src/lib/build/modules.mjs', 'site/src/lib/build/sprite-shake.mjs', 'site/src/lib/build/lastmod.mjs', 'site/src/lib/build/dist-guard.mjs',
  ...['_shared', 'home', 'services', 'areas', 'projects', 'company', 'editorial', 'quote', 'styleguide', 'redirects', 'routes'].map((p) => `site/src/pages/${p}.mjs`),
  ...['index', 'actions', 'heads', 'cards', 'projects', 'trust', 'faq', 'cta', 'seasons', 'callouts'].map((p) => `site/src/components/ui/${p}.mjs`), 'site/src/components/living.mjs',
  ...['main', 'quote', 'projects', 'living', 'areas'].map((p) => `site/src/scripts/${p}.js`), 'site/src/scripts/lib/track.js', 'site/src/scripts/lib/prefs.js',
  ...['00-layers', '01-reset', '02-base', '03-type', '05-layout', '08-utilities', '30-chrome', '40-ui-actions', '41-ui-heads', '42-ui-cards', '43-ui-projects', '44-ui-trust', '45-living', '46-ui-faq', '47-ui-cta', '48-ui-seasons', '49-ui-callouts', '60-home', '61-services', '62-areas', '63-projects', '64-company', '65-editorial', '70-quote', '80-styleguide', '95-motion', '99-print'].map((p) => `site/src/styles/${p}.css`),
  FALLBACK_EXAMPLE,
  ...segs.map((s) => s.file),
  ...['csp', 'dev-setup', 'rewrite-links', 'check-content', 'check-seo', 'og-cards', 'process-images', 'a11y', 'lighthouse', 'measure', 'motion-audit', 'text-over-media', 'check-honesty', 'check-motion-policy', 'check-css', 'check-ci', 'trace'].map((t) => `site/tools/${t}.mjs`), 'site/tools/schemas/project.schema.json',
  ...['global', 'chrome', 'components', 'living', 'quote', 'projects', 'areas', 'home', 'services', 'company', 'editorial', 'redirects'].map((p) => `site/tests/e2e/${p}.spec.mjs`),
  ...['build-minify', 'build-lastmod', 'ia-routes', 'ia-redirects', 'ia-site-json', 'ui-api', 'ds-comp-markup', 'ds-core-tokens', 'ds-chrome-prefs', 'seo-graph', 'quote-builder', 'quote-events', 'living-scenes', 'living-images', 'qa-tools', 'css-lint', 't-home-sections', 't-areas-map'].map((p) => `site/tests/unit/${p}.test.mjs`), 'site/tests/helpers/server.mjs', 'site/tests/fixtures/build/strings.css',
  'site/fixtures/content/site.json', 'site/fixtures/content/regional.json', 'site/fixtures/media/images.json', 'site/fixtures/brand/tokens.json',
  'content/site.json', 'content/regional.json', 'content/pages/process.json', 'content/pages/projects.json', 'media/photos.json', 'media/photos/home-hero.jpg', 'site/static/og/home.jpg', 'site/static/img/home-hero-480.avif', 'site/lighthouserc.json',
  'DESIGN-DIRECTION.md', 'TRACEABILITY.md', 'research/area-facts/oak-bay.json', 'research/area-sources-R1a.md', 'research/area-sources-R1b.md', 'research/area-verification-V1.md', 'research/area-verification-V2.md', 'research/area-verification-V3.md', '.orchestra/tools/ownership.mjs', '.orchestra/direction/P1.md', '.orchestra/reports/effects-lab.json',
  '.orchestra/reports/w4/evidence/r1/axe.json', '.orchestra/reports/w4/findings/r1.json', '.orchestra/reports/w4/manual-a11y.md', '.orchestra/reports/trace-status.json', '.orchestra/reports/w5/release-gate.json', '.orchestra/tickets/T001.json', '.orchestra/carry.json',
  ...Object.values(waves).flatMap((w) => Object.keys(w)).filter((k) => !S[k]?.readOnly).map(req),
];
const SEED = [
  { step: 1, what: 'git mv cedar-springs-teardown-blueprint.md research/ and fix every reference to it.' },
  { step: 2, what: 'Commit CONTRACT.md v3, REDESIGN-PLAN.md v3, site/COMPONENTS.md and .orchestra/** (this file, briefs, maps, traceability, tools/ownership.mjs).' },
  { step: 3, what: 'Add the frozen site/src/lib/head-scripts.mjs (CONTRACT §11); layout.mjs emits HEAD_SCRIPT + speculation rules and re-exports JS_FLAG = HEAD_SCRIPT; put both INLINE_SCRIPTS hashes in the netlify.toml CSP (drop the old JS_FLAG hash); build once to prove the CSP check is green.' },
  { step: 4, what: 'Gate enablers, so every W1 stream can run its gates on its own branch (A2 critique #1, #2, #11, #15):', items: [
    'site/playwright.config.mjs: const PORT = Number(process.env.PORT || 4321); baseURL http://localhost:${PORT}; webServer { command: "node tools/serve.mjs", env: { PORT, SITE_DIST }, url, reuseExistingServer: false }.',
    'site/tools/lib.mjs: DIST = process.env.SITE_DIST ? resolve(process.env.SITE_DIST) : <site>/dist (serve.mjs and every check already import DIST from lib.mjs).',
    'site/build.mjs: a route whose file does not end in .html is written raw (no finalizeTokens html mode, no typographer); routes with sitemap:false are left out of sitemap.xml.',
    'site/tools/csp.mjs (--check: sha256 of every INLINE_SCRIPTS entry is in the netlify.toml script-src, and no unknown sha256 is) and site/tools/dev-setup.mjs (symlink site/node_modules/{playwright,playwright-core,@types/node} from /opt/node-tools/node_modules; ensure site/node_modules is git-ignored). Minimal working versions; W1 build completes them.',
    'site/site.config.mjs: tokens "REPLY TIME", "GOOGLE PROFILE", "FOUNDED" (null) in the object and the TokenName typedef; optionalTokens = ["PLAUSIBLE DOMAIN", "GOOGLE PROFILE", "FOUNDED"].',
    'site/event-schema.yaml: add the CONTRACT §13 events (call_click, sms_click, email_click with location; quote_mailto_opened with service/area; quote_copied; quote_webmail_opened with provider) NEXT TO the v2 ones (call_clicked, email_clicked, quote_submitted, quote_step_completed, whose intent line starts "Deprecated: removed by quote in W2"), then node tools/gen-event-types.mjs.',
    'site/tools/check-links.mjs: --url-map (read from process.argv, so it also works inside check-all) treats every url-map new/added URL in .orchestra/url-map.json as an existing target, so W1 content written on the new URLs passes on the seed base.',
  ] },
  { step: 5, what: 'git config gc.auto 0; run node .orchestra/tools/check-overlap.mjs . (must PASS); run the W1 own-branch gate list once on the seed (tsc passes once dev-setup has linked @types/node) and log any pre-existing failure in .orchestra/carry.json so no W1 stream is blocked by it; record the seed sha as every W1 brief\'s --base.' },
];
W('ownership.json', {
  $comment: 'Exclusive write sets per wave. A stream may write ONLY paths matched by its owns globs for the wave it is running in; forbidden lists the hazards explicitly, and everything not owned is forbidden. .orchestra/tools/ownership.mjs --stream=<id> --wave=<w> --base=<sha> --head=<ref> enforces this (plus appendOnly) before every merge; it lives in .orchestra/ (frozen) so no stream owns the checker that polices it, and it is not a site/tools/check-* tool, so Netlify never runs it. Globs: ** any depth, * one segment, ? one char, {a,b} alternatives. Generated by .orchestra/tools/gen-a1.mjs: never hand-edit.',
  version: 3, revision: 'A3 (after the A2 critique)', generatedOn: TODAY,
  globSyntax: { '**': 'zero or more path segments', '*': 'any chars except /', '?': 'one char except /', '{a,b}': 'alternatives (may contain globs)' },
  rules: [
    'owns is the complete write set for that wave; anything not matched by it is forbidden.',
    'A wave\'s owns overrides frozen for that wave (e.g. fix-system owns site/src/lib/data.mjs in W4; css-consolidator owns 40/41 CSS in W3b). frozen applies from the seed commit; before it only the W0 owns apply.',
    'Owners change only at wave barriers. W3b is the css-consolidator\'s exclusive lock, with its own barrier after the six W3 family merges.',
    'appendOnly files may only gain lines in any wave (ownership.mjs fails on a deleted or changed line).',
    'Streams that run at the same time across a wave boundary are listed in concurrent and are checked for overlap as one group.',
    'readOnly streams write nothing; they return findings.',
  ],
  checker: 'node .orchestra/tools/ownership.mjs --stream=<id> --wave=<w> --base=<sha> --head=<ref>',
  seed: SEED,
  seedOnly: ['site/src/lib/head-scripts.mjs'],
  integratorOnly: ['.orchestra/baselines/** (written once when a tool merges with --write-baseline, then only pruned)', 'brand/tokens.css (regeneration after merges)', 'tools/rewrite-links.mjs --write (link codemod over content/** and site/src/**)', '.orchestra/carry.json outside W4', 'routing .orchestra/requests/*.md', 'git tags wave-<n>-int', 'pushes to ccr-384bdb88-mx8gtv'],
  integratorFiles: ['.orchestra/baselines/**', '.orchestra/carry.json'],
  appendOnly: ['site/tests/unit/ui-api.test.mjs'],
  frozen: { always: ALWAYS_FORBIDDEN, afterW1: FROZEN_AFTER_W1, w3: FROZEN_W3 },
  concurrent: [
    { label: 'W0 direction and research lanes run alongside W1', members: [{ wave: 'w0', streams: ['art-direction', 'reports', 'r1'] }, { wave: 'w1', streams: '*' }] },
    { label: 'areas-content and content run from W1 into W2', members: [{ wave: 'w1', streams: ['areas-content', 'content'] }, { wave: 'w2', streams: '*', except: ['areas-content', 'content'] }] },
  ],
  mergeOrder: {
    w1: ['build', 'ia', 'areas-content', 'content'],
    w2: ['ds-core', 'ds-chrome', 'ds-comp', 'living', 'seo', 'quote', 'qa', 'areas-content', 'content'],
    w3: ['t-editorial', 't-company', 't-services', 't-areas', 't-projects', 't-home'],
    w3b: ['css-consolidator'],
    w4: ['fix-system', 'fix-features', 'fix-pages', 'fix-qa', 'fix-content'],
    w5: ['og-render', 'ci', 'docs'],
  },
  barrier: [
    '1. Run the ownership checker for the stream, then merge it in mergeOrder; run the quick gate after each merge (on a violation take only the owned paths with git checkout <branch> -- <globs> and file the rest as requests).',
    '2. After the LAST merge: the codemod (tools/rewrite-links.mjs --write over content/** and site/src/**; W1 and W2) and regeneration of generated files (brand/tokens.css, event-schema.d.ts), each as its own commit.',
    '3. Baselines: for every tool that merged this wave, run it with --write-baseline on the integration tip; for every other tool, --prune-baseline. Commit .orchestra/baselines/.',
    '4. The FULL gate (REDESIGN-PLAN §Verification) on the integration tip. Red: fix lane before tagging.',
    '5. Tag wave-<n>-int, verify every branch ref exists, push with retries.',
  ],
  integration: {
    w1: {
      rule: 'Every W1 stream branches from the seed commit and must pass its own-branch gates there. Gates that need another W1 stream\'s work are integrationGates: the reviewer runs them on a throwaway local merge of the reviewed upstream tips (git merge --no-ff --no-commit in its detached worktree, never committed) when those tips exist, otherwise reports them as deferred; the integrator always runs them right after the stream merges, and a failure sends the stream to a fix lane before the codemod.',
      upstream: { build: [], ia: ['build'], 'areas-content': ['ia'], content: ['ia'] },
    },
    w2: { rule: 'qa merges last: a11y, motion-audit, text-over-media, check-honesty, trace and budgets v2 are deferred gates for every other W2 stream; the integrator runs them after the qa merge and writes their baselines.' },
  },
  ports: { rule: 'builder = port; reviewer = port + 10; fixer = port + 20. W0 lanes use 4401–4409, the W4 evidence collector 4400, W4 finders 4471–4477.', streams: Object.fromEntries(Object.values(S).map((s) => [s.id, s.port])) },
  waves,
  plannedFiles: [...new Set(planned)].sort(),
});

/* ------------------------------------------------------------------ traceability */
// Who authors each check (the "verifier"), by the wave in which the rule must exist. The owner of the largest wave key ≤ the needed wave writes the rule.
const TOOL_AUTHORS = {
  'check-links': { w1: 'ia', w2: 'qa' }, 'check-html': { w1: 'ia', w2: 'qa' }, 'check-content': { w1: 'ia', w2: 'qa' },
  'check-seo': { w2: 'seo' }, 'og-cards': { w2: 'seo' },
  'check-honesty': { w2: 'qa' }, 'check-motion-policy': { w2: 'qa' }, 'check-ci': { w2: 'qa' }, budgets: { w1: 'build', w2: 'qa' },
  a11y: { w2: 'qa' }, lighthouse: { w2: 'qa' }, measure: { w2: 'qa' }, 'motion-audit': { w2: 'qa' }, 'text-over-media': { w2: 'qa' },
  'check-contrast': { w2: 'ds-core' }, 'check-css': { w3: 'css-consolidator' },
  ownership: { w0: 'architect' }, 'full-gate': { w5: 'release-gate' }, manual: { w4: 'w4-triage' },
};
const SPEC_AUTHORS = {
  chrome: { w1: 'ia', w2: 'ds-chrome' }, quote: { w1: 'ia', w2: 'quote' }, global: { w1: 'ia', w2: 'qa' }, components: { w1: 'ia', w2: 'ds-comp' }, living: { w1: 'ia', w2: 'living' }, redirects: { w1: 'ia', w2: 'seo' },
  home: { w1: 'ia', w3: 't-home' }, services: { w1: 'ia', w3: 't-services' }, areas: { w1: 'ia', w3: 't-areas' }, projects: { w1: 'ia', w3: 't-projects' }, company: { w1: 'ia', w3: 't-company' }, editorial: { w1: 'ia', w3: 't-editorial' },
};
const UNIT_AUTHORS = { 'ui-api': { w1: 'ia' }, 'ia-site-json': { w1: 'ia' }, 'build-lastmod': { w1: 'build' }, 'ds-core-tokens': { w2: 'ds-core' }, 'ds-comp-markup': { w2: 'ds-comp' }, 'quote-builder': { w2: 'quote' }, 'quote-events': { w2: 'quote' }, 'seo-graph': { w2: 'seo' }, 'living-images': { w2: 'living' } };
const TOOL_FILE = (tool) => (tool === 'ownership' ? '.orchestra/tools/ownership.mjs' : ['full-gate', 'manual'].includes(tool) ? null : `site/tools/${tool}.mjs`);
const parseCheck = (c) => {
  let m;
  if ((m = c.match(/^e2e\/([\w-]+)\.spec#([\w-]+)$/))) return { kind: 'e2e', unit: m[1], rule: m[2], file: `site/tests/e2e/${m[1]}.spec.mjs`, authors: SPEC_AUTHORS[m[1]] };
  if ((m = c.match(/^unit\/([\w-]+)\.test#([\w-]+)$/))) return { kind: 'unit', unit: m[1], rule: m[2], file: `site/tests/unit/${m[1]}.test.mjs`, authors: UNIT_AUTHORS[m[1]] };
  if ((m = c.match(/^([\w-]+)#([\w-]+)$/))) return { kind: m[1] === 'full-gate' ? 'gate' : m[1] === 'manual' ? 'manual' : 'tool', unit: m[1], rule: m[2], file: TOOL_FILE(m[1]), authors: TOOL_AUTHORS[m[1]] };
  throw new Error(`bad check id ${c}`);
};
const authorAt = (authors, wave) => { let o = null; for (const [w, s] of Object.entries(authors).sort((a, b) => wi(a[0]) - wi(b[0]))) if (wi(w) <= wi(wave)) o = s; return o; };
const firstWave = (authors) => Object.keys(authors).sort((a, b) => wi(a) - wi(b))[0];
const streamWaves = (id) => S[id]?.waves || (W0[id] ? ['w0'] : null);
const T = {}; const traceErrors = [];
const t = (id, title, stream, check, o = {}) => {
  const p = parseCheck(check);
  if (!p.authors) { traceErrors.push(`${id}: no author map for ${check}`); return; }
  const sw = streamWaves(stream); if (!sw) { traceErrors.push(`${id}: unknown stream ${stream}`); return; }
  const due = o.passableFrom || sw.find((w) => wi(w) >= wi(firstWave(p.authors)));
  if (!due) { traceErrors.push(`${id}: ${check} does not exist before ${stream} finishes (${sw.join(',')})`); return; }
  const verifier = o.verifier || authorAt(p.authors, due);
  T[id] = { title, stream, verifier, check, kind: p.kind, checkFile: p.file, due, ...(o.evidence ? { evidence: o.evidence } : {}), ...(o.superseded ? { superseded: true } : {}), ...(o.proxy ? { proxy: true } : {}), ...(o.passableFrom ? { passableFrom: o.passableFrom } : {}), ...(o.note ? { note: o.note } : {}) };
};
// A13
t('A13#1', 'Card links generated from the post URL; link checker in CI', 'ia', 'check-links#internal-200');
t('A13#2', 'Netlify _redirects 301 map for every retired URL', 'ia', 'check-links#strict-redirects', { note: 'every url-map 301 → one hop → 200; integration gate in W1 (needs w1/build serve.mjs)' });
t('A13#3a', 'One responsive component per pattern: one nav DOM, no duplicated chrome', 'ds-chrome', 'check-seo#single-nav-dom', { note: 'one nav[aria-label=Main]; header/footer link sets not duplicated' });
t('A13#3b', 'No content repeated in the markup (home dock and hero duplicates)', 't-home', 'check-seo#repeated-text', { note: 'no text node repeated in a page outside [data-shared]; every other template keeps its baseline empty' });
t('A13#4', 'Descriptive hand-written alt; alt="" for decorative', 'living', 'check-seo#alt-filename', { note: 'alt text lives in media/images.json' });
t('A13#5', 'One H1 per template; embedded blocks start at H2', 'ds-comp', 'check-seo#h1-count', { note: 'hero()/pageHead() emit the only H1' });
t('A13#6', 'H1 on every index page', 'ds-comp', 'check-seo#h1-present-on-hubs');
t('A13#7', 'Services menu lists every service page (no orphans)', 'ia', 'check-links#orphans');
t('A13#8', '<button aria-expanded> disclosures, never href="#"', 'ia', 'check-html#no-href-hash');
t('A13#9', 'Header call button, sticky mobile bar, tel:/mailto: everywhere', 'ds-chrome', 'e2e/chrome.spec#tel-sms-mailto');
t('A13#10', 'About 6 inputs, single name field, no CAPTCHA', 'quote', 'e2e/quote.spec#six-inputs');
t('A13#11a', 'Reviews band on the home page linking to Google', 't-home', 'e2e/home.spec#reviews-band-google-link');
t('A13#11b', 'Reviews band on every service page linking to Google', 't-services', 'e2e/services.spec#reviews-band-google-link');
t('A13#12', 'Only claim what can be verified; credentials band links to issuers', 'content', 'check-honesty#unverifiable-claims');
t('A13#13', 'Single source of truth for founding year / business facts', 'ia', 'check-content#single-source');
t('A13#14', 'One municipality list in data; one page per municipality', 'ia', 'check-content#municipality-list');
t('A13#15', 'No loader; native View Transitions honouring reduced motion', 'ds-core', 'motion-audit#vt-and-loader');
t('A13#16', 'Static, user-controlled project rail (no auto-advance)', 't-home', 'motion-audit#no-auto-advance');
t('A13#17', 'aria-hidden on decorative duplicates, or render once', 't-home', 'check-seo#decorative-duplicate');
t('A13#18', 'One OG card per page; website type; en_CA locale', 'seo', 'check-seo#og-tags');
t('A13#19', 'Escape once at build; no double-encoding', 'seo', 'check-seo#double-encoding');
t('A13#20a', 'Named author and real publish dates in the guide data', 'content', 'check-content#resource-byline-dates');
t('A13#20b', 'Byline "[OWNER NAME], RNC Landscaping" → /about/ and real dates rendered on every guide', 't-editorial', 'e2e/editorial.spec#byline-dates');
t('A13#21', 'Slug linting', 'seo', 'check-seo#slug-lint');
t('A13#22', 'One <time datetime> format, displayed "19 November 2026"', 't-editorial', 'check-seo#time-format');
t('A13#23', 'Structured project data with validation', 'ia', 'check-content#schema-v3');
t('A13#24', 'Spell-check in CI', 'content', 'check-honesty#spelling');
t('A13#25', 'Footer links deduplicated', 'ia', 'check-links#footer-duplicates');
t('A13#26', 'Footer phone and email linked', 'ia', 'check-html#footer-tel-mailto');
t('A13#27', 'AVIF+WebP srcset, max 1600 w', 'living', 'budgets#image-widths');
t('A13#28', 'Plausible only; no consent banner', 'ds-chrome', 'budgets#third-party-origins', { note: 'the Plausible loader lives in layout.mjs' });
t('A13#29', 'HTTPS, consistent canonicals', 'seo', 'check-seo#canonical');
t('A13#30', 'Plain-language workmanship guarantee', 'content', 'check-content#guarantee');
t('A13#31', '"What\'s included each visit / season" tables (no prices)', 'content', 'check-content#service-tables');
t('A13#32', 'Short FAQs on each service page', 'content', 'check-content#service-faqs');
t('A13#33', 'Proper case in the HTML source text', 'content', 'check-seo#sentence-case', { note: 'template strings added in W3 must not add entries (baseline rule)' });
t('A13#34', 'Only real people: the owner via [OWNER NAME] / [OWNER BIO]; no team grid; no stock people', 't-company', 'e2e/company.spec#about-people');
t('A13#35', '301 old duplicate URLs to new; one canonical per page', 'seo', 'check-seo#canonical-unique');
t('A13#36', 'Audit performance, contrast, focus and tap targets before quoting numbers', 'w4-evidence', 'measure#audit-report', { evidence: '.orchestra/reports/w4/evidence/r<n>/audit-report.json' });
// A12
t('A12#1', 'Project spec strip (municipality, service, duration, plant palette, challenge→approach→result; no budgets)', 't-projects', 'e2e/projects.spec#spec-strip');
t('A12#2', 'Named, phased process with deliverables', 't-company', 'e2e/company.spec#process-tracks');
t('A12#3', 'Filterable portfolio', 't-projects', 'e2e/projects.spec#filter');
t('A12#4', 'Real-crew credibility (faces and roles, only when real)', 't-company', 'check-honesty#no-stock-people');
t('A12#5a', 'Commercial proof points written as concrete operational commitments (no invented numbers)', 'content', 'check-honesty#commercial-proof');
t('A12#5b', 'Commercial proof points rendered on /commercial/', 't-services', 'e2e/services.spec#commercial-proof');
t('A12#6', 'Restraint: two-tone palette, big imagery, white space', 'ds-core', 'check-contrast#all-pairs', { superseded: true, proxy: true, note: 'superseded on aesthetics by the alive direction; the hard constraint kept is contrast, so the proxy is C3.3\'s check; f-visual records the review in W4' });
t('A12#7', 'Dedicated landing page per service line with local context', 't-services', 'e2e/services.spec#local-context');
// C1–C8
t('C1.1', 'Sitemap and URL map (/projects/, /free-quote/, /process/ …)', 'ia', 'check-links#sitemap-matches-url-map');
t('C1.2', 'Primary nav: Services ▾ · Projects · Service areas ▾ · Process · About · Call · Free quote', 'ia', 'e2e/chrome.spec#primary-nav');
t('C1.3', 'Footer: services, municipalities, NAP, hours, tel/sms/mailto, legal + Google profile, no careers', 'ia', 'e2e/chrome.spec#footer');
t('C1.4a', 'Internal linking: every service page links to all 13 municipality pages', 't-services', 'check-seo#internal-links-service');
t('C1.4b', 'Internal linking: every municipality links to the 4 services and to 1–3 local projects', 't-areas', 'check-seo#internal-links-area');
t('C1.4c', 'Internal linking: every project links back to its service and municipality', 't-projects', 'check-seo#internal-links-project');
t('C1.5', 'Breadcrumbs on all depth-2+ pages', 'ds-chrome', 'check-seo#breadcrumbs');
t('C2.1', 'Home wireframe sections 1–10', 't-home', 'e2e/home.spec#sections');
t('C2.2', 'Service page wireframe', 't-services', 'e2e/services.spec#template-order');
t('C2.3', 'Municipality page wireframe', 't-areas', 'e2e/areas.spec#template-order');
t('C2.4', 'Project case study wireframe', 't-projects', 'e2e/projects.spec#case-study-order');
t('C2.5', 'Free quote page wireframe', 'quote', 'e2e/quote.spec#page-order');
t('C3.1', 'Keep / adapt / drop (no loaders, sliders, lowercase source, third-party embeds)', 'ds-core', 'check-motion-policy#banned-effects');
t('C3.2', 'Fluid type scale (display…small, Inter 400/600/700, Newsreader italic quotes only)', 'ds-core', 'unit/ds-core-tokens.test#type-scale');
t('C3.3', 'Colour usage and contrast incl. the dark focus token', 'ds-core', 'check-contrast#all-pairs');
t('C3.4', 'Imagery rules: own photos only in /projects/, stock labelled, illustration for process/maps', 'living', 'check-honesty#stock-in-projects');
t('C3.5', 'Motion rules (transform/opacity, VT where supported, reduced motion, nothing autoplays)', 'ds-core', 'motion-audit#policy-tiers');
t('C3.6', 'Component inventory', 'ds-comp', 'unit/ui-api.test#inventory', { note: 'ia writes the test in W1 from COMPONENTS.md; ds-comp may only append (appendOnly)' });
t('C4.1', 'Content breakpoints 40/64/80em, container queries, one DOM per component', 'ds-comp', 'unit/ds-comp-markup.test#container-queries');
t('C4.2', 'Mobile nav sheet: inert, Esc, focus return, accordions', 'ds-chrome', 'e2e/chrome.spec#mobile-sheet');
t('C4.3', 'Sticky action bar below 1024 px', 'ds-chrome', 'e2e/chrome.spec#sticky-bar');
t('C4.4a', 'Touch targets ≥ 44×44 primary, ≥ 24×24 all: buttons, chips, cards', 'ds-comp', 'a11y#target-size', { note: 'checked on /styleguide/ in W2' });
t('C4.4b', 'Touch targets ≥ 44×44 primary, ≥ 24×24 all: header, toggles, sheet, sticky bar, footer', 'ds-chrome', 'a11y#target-size');
t('C4.5', '<picture> AVIF/WebP/JPEG, srcset, dimensions, hero priority, lazy below the fold, EXIF strip', 'living', 'budgets#picture-pipeline');
t('C4.6', '≥ 16 px body, no horizontal scroll at 320 px, 200 % zoom', 'ds-core', 'e2e/global.spec#reflow-320-zoom-200');
t('C5.1', 'Quote builder six inputs, ?area= prefill', 'quote', 'e2e/quote.spec#prefill');
t('C5.2', 'mailto submit with encoded subject/body ≤ 1,800 chars; works without JS', 'quote', 'unit/quote-builder.test#mailto');
t('C5.3', 'Ready panel: copy, address, call/text, webmail links', 'quote', 'e2e/quote.spec#ready-panel');
t('C5.4', 'Native validation, inline errors, error summary, values kept', 'quote', 'e2e/quote.spec#validation');
t('C5.5', 'sessionStorage draft', 'quote', 'e2e/quote.spec#draft-restore');
t('C5.6', 'Plausible custom events, no personal data', 'quote', 'unit/quote-events.test#no-pii');
t('C5.7', 'Trust without prices (reply time, next steps, verifiable credentials, reviews, owner, local rules, guarantee)', 'content', 'check-honesty#trust-without-prices');
t('C6.1', 'One @id JSON-LD graph (business subtype, Service, BreadcrumbList, FAQPage optional, no Review/AggregateRating)', 'seo', 'unit/seo-graph.test#graph');
t('C6.2', 'Title and meta description patterns and lengths (≤ 60 / ≤ 155)', 'seo', 'check-seo#title-meta');
t('C6.3', 'Social cards: en_CA, one OG image per template, og:type website', 'og-render', 'og-cards#coverage', { passableFrom: 'w5', note: 'seo ships the tool and rule in W2; cards are rendered in W5' });
t('C6.4a', 'Municipality data avoids doorway risk: no sentence shared by two area files', 'areas-content', 'check-content#area-unique-sentences', { note: 'summary, localRules, conditions, proof, servicesBlurb, intro, localNotes; regional.json excluded' });
t('C6.4b', 'Municipality pages avoid doorway risk in the rendered HTML ([data-shared] exempt)', 't-areas', 'check-seo#cross-area-duplicates');
t('C6.5', 'Google Business Profile alignment: same NAP, 13 municipalities, 4 service lines', 'ia', 'check-content#gbp-alignment', { note: 'site.json has the 13 contract municipalities (the areaServed source) and the 4 services; the off-site GBP steps go in W5 LAUNCH-CHECKLIST' });
t('C6.6', 'Technical: sitemap, robots, self canonicals, _redirects, lang en-CA, build SEO checks', 'seo', 'check-seo#technical');
t('C7.1', 'Lighthouse mobile ≥ 95 ×4 every template', 'fix-system', 'lighthouse#median-of-3');
t('C7.2', 'Weights: home ≤ 500 KB, inner ≤ 350 KB, hero raster ≤ 120 KB, CSS/JS/fonts caps, 1 third party', 'fix-system', 'budgets#v2');
t('C7.3', 'WCAG 2.2 AA, 0 axe violations', 'fix-system', 'a11y#axe-matrix');
t('C7.4', 'Core Web Vitals: LCP < 1.8 s, INP < 200 ms, CLS < 0.05 (lab: LCP ≤ 1.8 s, CLS ≤ 0.05, TBT ≤ 150 ms as the INP proxy)', 'fix-system', 'lighthouse#cwv');
t('C7.5', 'Manual keyboard + screen-reader pass', 'f-a11y', 'manual#keyboard-sr-pass', { evidence: '.orchestra/reports/w4/manual-a11y.md' });
t('C8', 'Parallel streams on separate branches gated by the same CI; merge only when budgets pass', 'build', 'ownership#every-merge', { note: 'the checker is .orchestra/tools/ownership.mjs (frozen, run by the integrator before every merge)' });
// P0–P4
t('P0#1', 'site.json single source for NAP, founding year, hours, licences, municipalities', 'ia', 'unit/ia-site-json.test#consumers');
t('P0#2', 'Lighthouse CI budgets, axe/Playwright at 5 widths, link checker in the build', 'qa', 'check-ci#required-gates');
t('P0#3', 'Dark-mode focus ring ≥ 3:1 on Fir night; re-test all focus states', 'ds-core', 'check-contrast#focus-pairs');
t('P0#4', 'scroll-padding for sticky header and bar; 2.4.11 keyboard test', 'ds-chrome', 'e2e/chrome.spec#focus-not-obscured');
t('P1#5', 'Quote builder → mailto, no-JS path, copy, visible email, tel/sms fallbacks + status', 'quote', 'e2e/quote.spec#no-js-and-fallbacks');
t('P1#6', 'Sticky mobile Call / Free-quote bar (≥ 48 px, safe-area, hidden over the form)', 'ds-chrome', 'e2e/chrome.spec#sticky-bar-hides');
t('P1#7', 'tel:/mailto: in header and footer; desktop header call button', 'ds-chrome', 'e2e/chrome.spec#header-call');
t('P1#8', 'Reviews band, credentials row (verifiable only), written guarantee', 'ds-comp', 'check-honesty#reviews-credentials-guarantee', { note: 'checked on /styleguide/ in W2; on real pages from W3' });
t('P2#9', 'Services overview + 4 service pages on the C2 template', 't-services', 'e2e/services.spec#hub-and-four');
t('P2#10a', '13 municipality data files with ≥ 1 own local rule, condition and proof each (swap-test material)', 'areas-content', 'check-content#area-local-blocks');
t('P2#10b', '/areas/ hub with the SVG map and 13 municipality pages rendering the local blocks', 't-areas', 'e2e/areas.spec#hub-map');
t('P2#11', 'Case-study template, filterable portfolio, accessible before/after with side-by-side', 't-projects', 'e2e/projects.spec#before-after-keyboard');
t('P2#12a', 'Process page (two tracks) and FAQ page', 't-company', 'e2e/company.spec#process-faq');
t('P2#12b', 'Accessibility statement', 't-editorial', 'e2e/editorial.spec#a11y-statement');
t('P2#13a', 'Disclosure-button menus (no href="#") and breadcrumbs', 'ds-chrome', 'e2e/chrome.spec#disclosure-breadcrumbs');
t('P2#13b', 'A helpful 404', 't-editorial', 'e2e/editorial.spec#helpful-404');
t('P3#14', 'JSON-LD graph, OG per page, og:locale en_CA, lang en-CA', 'seo', 'check-seo#jsonld-graph');
t('P3#15', 'Sitemap with git lastmod, robots, _redirects, build checks', 'build', 'unit/build-lastmod.test#git-lastmod');
t('P3#16', 'GBP alignment: matching NAP, 13 service areas, review link', 'ia', 'check-content#nap-consistency');
t('P4#17', 'AVIF/WebP pipeline, EXIF stripping, licence records, no stock in /projects/', 'living', 'unit/living-images.test#pipeline');
t('P4#18', 'Glass limited to chrome, solid content, fluid type, reduced motion, no loaders/sliders/autoplay', 'ds-core', 'check-contrast#glass-worst-case', { superseded: true, note: 'superseded on aesthetics, hard constraints kept (contrast-safe glass, solid fallbacks, motion policy)' });
t('P4#19', 'Final regression: Lighthouse ≥ 95 ×4, 0 axe, manual SR pass, 200 % zoom, 320 px, CLS ≤ 0.05', 'release-gate', 'full-gate#no-baseline', { evidence: '.orchestra/reports/w5/release-gate.json', note: 'blueprint checklist item 19; the full REDESIGN-PLAN §Verification gate with --no-baseline, plus C7.5' });
if (traceErrors.length) { console.error(traceErrors.join('\n')); process.exit(1); }
// a check may be shared only by the #a/#b parts of one blueprint item (e.g. C4.4a/C4.4b) or by a proxy item
const baseId = (id) => id.replace(/[a-c]$/, '');
const dupChecks = [...new Set(Object.entries(T).filter(([, v]) => !v.proxy).map(([id, v]) => [baseId(id), v.check]).filter(([b, c], i, a) => a.some(([b2, c2], j) => j !== i && c2 === c && b2 !== b)).map(([, c]) => c))];
// rules each verifier must ship
const provides = {};
for (const [id, v] of Object.entries(T)) {
  const key = v.check;
  provides[v.verifier] ??= {};
  const p = parseCheck(key); const shipIn = Object.keys(p.authors).filter((w) => wi(w) <= wi(v.due)).sort((a, b) => wi(a) - wi(b)).at(-1);
  const e = (provides[v.verifier][key] ??= { check: key, kind: v.kind, file: v.checkFile, shipIn, neededBy: v.due, forItems: [], implementers: [] });
  e.forItems.push(id); if (!e.implementers.includes(v.stream)) e.implementers.push(v.stream);
  if (wi(v.due) < wi(e.neededBy)) e.neededBy = v.due;
}
const counts = { items: Object.keys(T).length, byKind: Object.fromEntries([...new Set(Object.values(T).map((v) => v.kind))].map((k) => [k, Object.values(T).filter((v) => v.kind === k).length])) };
W('traceability.json', {
  $comment: 'Every blueprint item (A13 #1–36, A12 #1–7, C1–C8, P0 #1–P4 #19; items with two implementers are split into #a/#b) → ONE implementing stream, ONE verifying check (tool#rule, e2e/<spec>.spec#rule, unit/<test>.test#rule, full-gate# or manual#) and its verifier (the stream that authors the check, by the wave in "due"). The verifier ships the rule (exported in the tool\'s literal RULES, or a test titled with #rule); site/tools/trace.mjs (qa, W2) enforces this. This file is static: per-item status lives in .orchestra/reports/trace-status.json (w4-evidence). W5 docs turns both into TRACEABILITY.md.',
  generatedOn: TODAY, statusFile: '.orchestra/reports/trace-status.json', counts, dupChecks,
  items: T,
});

/* ------------------------------------------------------------------ briefs */
const SETUP = (w) => (w === 'w1'
  ? ['cd $WT/site && node tools/dev-setup.mjs   # seed version: links playwright, playwright-core, @types/node', 'export PORT=<your port> OUT=$WT/site/dist SITE_DIST=$WT/site/dist   # worktree-local dist: isolated from every other worktree']
  : ['cd $WT/site && node tools/dev-setup.mjs --devtools', 'export PORT=<your port> OUT=$SCRATCH/dist/<branch-with-dashes> SITE_DIST=$OUT CHROME_PATH=/usr/bin/google-chrome']);
const CORE_GATES = (w) => [
  'node ../brand/build-tokens.mjs --check && node ../brand/check-contrast.mjs',
  '/opt/node-tools/node_modules/.bin/tsc -p jsconfig.json',
  'node --test "tests/unit/**/*.test.mjs"',
  w === 'w1' ? 'node build.mjs --offline-images && node tools/check-all.mjs --no-build --url-map   # --url-map: url-map new URLs count as link targets until w1/ia merges; no baselines exist in W1' : 'node build.mjs --offline-images --out=$OUT && node tools/check-all.mjs --no-build --strict-redirects   # .orchestra/baselines apply automatically',
  'node tools/csp.mjs --check',
  w === 'w1' ? 'node node_modules/playwright/cli.js test --trace off --grep-invert @integration   # reads PORT and SITE_DIST; tests titled @integration need another W1 stream and run at the integrator' : 'node node_modules/playwright/cli.js test --trace off   # reads PORT and SITE_DIST; reuseExistingServer:false',
];
const LATE_GATES = (w, id) => [
  `node tools/a11y.mjs --themes=dark,light --widths=320,1440 --motion=off,on${w === 'w2' && id !== 'qa' ? '   # deferred in W2 until qa merges' : ''}`,
  `node tools/motion-audit.mjs && node tools/text-over-media.mjs${w === 'w2' && id !== 'qa' ? '   # deferred in W2 until qa merges' : ''}`,
  `node tools/trace.mjs --upto=${w} --stream=${id}${w === 'w2' && id !== 'qa' ? '   # deferred in W2 until qa merges' : ''}`,
];
const OWN_GATE = (id, w) => `${OWNERSHIP_TOOL} --stream=${id} --wave=${w} --base=<base sha> --head=HEAD`;
const gatesFor = (s, w) => {
  if (s.readOnly) return ['Read the evidence pack; run nothing that writes to the repository.'];
  if (['w4-evidence', 'w4-triage', 'docs'].includes(s.id)) return [...SETUP(w), OWN_GATE(s.id, w)];
  const g = [...SETUP(w), ...CORE_GATES(w)];
  if (w !== 'w1') g.push(...LATE_GATES(w, s.id));
  if (['w3', 'w3b', 'w4', 'w5'].includes(w)) g.push('node tools/lighthouse.mjs --runs=3   # quiet slot only');
  if (w === 'w5') g.push('node tools/check-all.mjs --no-build --no-baseline');
  g.push(w === 'w1' ? 'node build.mjs && node tools/check-all.mjs --no-build --url-map   # Netlify parity: online images' : 'node build.mjs && node tools/check-all.mjs --no-build   # Netlify parity: online images, no extra flags');
  g.push(OWN_GATE(s.id, w));
  return g;
};
const segsOf = (id) => segs.filter((x) => x.owner === id).map((x) => ({ file: x.file, lines: x.lines, label: x.label, mustDeleteIn: x.mustDeleteIn, importantRules: x.importantRules.map((r) => `L${r.line} ${r.selector}${r.media ? ` (@media ${r.media})` : ''}: ${r.declarations.join('; ')}`) }));
for (const f of readdirSync(join(OR, 'briefs'))) if (f.endsWith('.json')) rmSync(join(OR, 'briefs', f));
for (const s of Object.values(S)) {
  const mine = Object.entries(T).filter(([, v]) => v.stream === s.id).map(([k, v]) => `${k}: ${v.title} — check ${v.check}${v.verifier !== s.id ? ` (authored by ${v.verifier}, due ${v.due})` : ` (you author it)`}${v.evidence ? `; evidence ${v.evidence}` : ''}${v.note ? `; ${v.note}` : ''}`);
  const prov = Object.values(provides[s.id] || {}).map((p) => ({ ...p, forItems: p.forItems.join(', '), implementers: p.implementers.join(', ') }));
  const w0 = s.waves[0];
  const brief = {
    id: s.id, wave: s.waves.length === 1 ? w0 : s.waves, lens: s.lens,
    branch: s.readOnly ? null : s.waves.map((w) => (w === 'w3b' ? `w3/${s.id}--lock` : w === 'w4' ? `w4/r<round>/${s.id}` : `${w}/${s.id}`)),
    base: Object.fromEntries(s.waves.map((w) => [w, BASE[w]])),
    port: s.port,
    portRule: 'builder = port; reviewer = port + 10; fixer = port + 20; W4 evidence collector 4400',
    out: s.waves.includes('w1') ? { w1: '$WT/site/dist (worktree-local)', later: '$SCRATCH/dist/<branch-with-dashes>' } : '$SCRATCH/dist/<branch-with-dashes>',
    owns: s.owns, forbidden: Object.fromEntries(s.waves.map((w) => [w, waves[w][s.id].forbidden])),
    ...(s.readOnly ? { readOnly: true } : {}),
    reads: [...new Set(['CONTRACT.md', 'REDESIGN-PLAN.md', '.orchestra/ownership.json', 'research/cedar-springs-teardown-blueprint.md (moved from the repo root at the seed commit)', ...s.reads.filter((r) => r !== 'CONTRACT.md')])],
    context: s.waves.flatMap((w) => CONTEXT[w].map((c) => (s.waves.length > 1 ? `[${w}] ${c}` : c))),
    deliverables: s.deliverables,
    acceptance: [...mine, ...s.extraAcceptance],
    providesRules: prov,
    ...(segsOf(s.id).length ? { legacySlices: segsOf(s.id) } : {}),
    gates: Object.fromEntries(s.waves.map((w) => [w, gatesFor(s, w)])),
    ...(s.integrationGates ? { integrationGates: { rule: 'W1 integration gates: see ownership.json integration.w1. Run them on a throwaway merge of the reviewed upstream tips (never committed) when they exist; otherwise report them as deferred. The integrator always runs them after your merge.', upstream: ({ ia: ['w1/build'], 'areas-content': ['w1/ia'], content: ['w1/ia'] })[s.id] || [], gates: s.integrationGates } } : {}),
    rules: COMMON_RULES,
    verifierLens: s.verifierLens,
    returns: '{branch, head, base, files, gates:{name:pass|fail|deferred}, acceptance:[{item, status, evidence}], requests:[...]}',
    requests: s.readOnly ? 'none (read-only: put everything in your returned findings)' : `.orchestra/requests/${s.id}.md (never edit a file outside owns; describe the change there)`,
  };
  W(`briefs/${s.id}.json`, brief);
}
const unprovided = Object.keys(provides).filter((v) => !S[v] && !W0[v]);
console.log(JSON.stringify({ urls: entries.length, redirects: redirects.length, newPages: newUrls.length, segments: segs.length, fallback: FALLBACK_EXAMPLE, important: segs.reduce((n, x) => n + x.importantRules.length, 0), cssUncovered: missing, cssUnowned: unowned, trace: counts, dupChecks, verifiersWithoutBrief: unprovided, streams: Object.keys(S).length, briefs: readdirSync(join(OR, 'briefs')).length }, null, 1));
