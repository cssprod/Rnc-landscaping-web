// @ts-check
/**
 * Living scenes (owner: living): deterministic bytes, byte budgets, namespaced and unique ids, no inline colour,
 * loop budgets, 13 distinct area scenes, the "Illustration" chip, and a motion-safe stylesheet and runtime
 * (DESIGN-DIRECTION §8, effects-approved.json, CONTRACT §9).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { livingScene, projectArt, illustrationChip, livingSpecimens, sceneRecipe } from '../../src/components/living.mjs';
import { AREAS, SERVICES, vignette, projectVignette, landscapeSvg, contourPlate } from '../../src/lib/art.mjs';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT = join(SITE, '..');
const s = (/** @type {any} */ x) => String(x);
const site = JSON.parse(readFileSync(join(ROOT, 'content/site.json'), 'utf8'));
const AREA_SLUGS = site.municipalities.map((/** @type {any} */ m) => m.slug);
const SERVICE_SLUGS = site.services.map((/** @type {any} */ m) => m.slug);
const projects = readdirSync(join(ROOT, 'content/projects')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(ROOT, 'content/projects', f), 'utf8')));
const ids = (/** @type {string} */ h) => [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const loops = (/** @type {string} */ h) => (h.match(/\sdata-t2[\s>]/g) || []).length;

test('scenes are deterministic: the same id gives the same bytes #determinism', () => {
  for (const id of ['home', ...AREA_SLUGS.map((/** @type {string} */ a) => `area-${a}`), ...SERVICE_SLUGS.map((/** @type {string} */ v) => `svc-${v}`), 'process', 'cta', '404']) {
    assert.equal(s(livingScene(id)), s(livingScene(id)), id);
    assert.equal(s(livingScene(id, { variant: 'card' })), s(livingScene(id, { variant: 'card' })), `${id} card`);
  }
  for (const p of projects) assert.equal(s(projectArt(p)), s(projectArt(p)), p.slug);
  assert.equal(landscapeSvg('area-sooke', '16:9').svg, landscapeSvg('area-sooke', '16:9').svg);
  for (const f of ['src/lib/art.mjs', 'src/components/living.mjs']) assert.ok(!/Math\.random|Date\.now|new Date/.test(readFileSync(join(SITE, f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), `${f} has no randomness or clock`);
});

test('byte budgets: hero ≤ 16 KB, area ≤ 12 KB, service ≤ 10 KB, art wells ≤ 1.5 KB raw #budgets', () => {
  assert.ok(s(livingScene('home')).length <= 16000, `home ${s(livingScene('home')).length}`);
  for (const a of AREA_SLUGS) { const n = s(livingScene(`area-${a}`)).length; assert.ok(n <= 12000, `area-${a} ${n}`); }
  for (const v of SERVICE_SLUGS) { const n = s(livingScene(`svc-${v}`)).length; assert.ok(n <= 10000, `svc-${v} ${n}`); }
  for (const p of projects) { const n = projectVignette(p).length; assert.ok(n <= 1500, `${p.slug} ${n}`); }
  for (const k of [...SERVICE_SLUGS, ...AREA_SLUGS.map((/** @type {string} */ a) => `area-${a}`), 'cove']) { const n = vignette(k, 'x').length; assert.ok(n <= 1500, `vignette ${k} ${n}`); }
  // A page with 16 project cards stays well inside the 45 KB inline-SVG budget on its own.
  const cards = projects.reduce((t, p) => t + s(projectArt(p)).length, 0);
  assert.ok(cards <= 26000, `16 project cards ${cards}`);
});

test('ids are namespaced lv-*, unique across scenes on one page, and every <use> resolves #ids', () => {
  const page = [livingScene('home'), ...AREA_SLUGS.map((/** @type {string} */ a) => livingScene(`area-${a}`)), ...SERVICE_SLUGS.map((/** @type {string} */ v) => livingScene(`svc-${v}`)), livingScene('cta', { variant: 'band' }), livingScene('process', { variant: 'band', still: true }), ...projects.map((p) => projectArt(p)), ...AREA_SLUGS.map((/** @type {string} */ a) => livingScene(`area-${a}`, { variant: 'card' }))].map(s).join('');
  const all = ids(page);
  assert.ok(all.length > 50);
  for (const id of all) assert.match(id, /^lv-/, id);
  assert.equal(new Set(all).size, all.length, 'no duplicate id');
  for (const m of page.matchAll(/(?:href="#|url\(#)([^")]+)/g)) assert.ok(all.includes(m[1]), `reference #${m[1]} resolves`);
  // Art wells carry no ids at all, so any number can share a page.
  for (const p of projects) assert.deepEqual(ids(s(projectArt(p))), [], p.slug);
  // o.uid separates two copies of one scene.
  assert.ok(ids(s(livingScene('home', { uid: 'second' }))).every((i) => !ids(s(livingScene('home'))).includes(i)));
});

test('no inline colour: fills and strokes come from classes mapped to --sc-* #no-inline-colour', () => {
  const page = [livingScene('home'), livingScene('area-oak-bay'), livingScene('svc-irrigation'), projectArt(projects[0]), livingScene('area-sidney', { variant: 'card' })].map(s).join('');
  assert.ok(!/(fill|stroke|stop-color|color)="(?!url\(|none)[^"]*"/.test(page), 'no colour attributes');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b(?![-\w])/.test(page.replace(/(href="|url\()#[^")]+/g, '')), 'no hex colours');
  assert.ok(!/rgba?\(|hsla?\(|style="[^"]*(color|fill|stroke)/.test(page), 'no rgb()/hsl() or colour styles');
  assert.ok(!/<animate|<set\b/.test(page), 'no SMIL');
});

test('structure: aria-hidden scenes, outer-svg layers with data-layer hooks, visible "Illustration" chip #structure', () => {
  assert.equal(s(illustrationChip()), '<span class="media__chip media__chip--art" aria-hidden="true">Illustration</span>');
  const home = s(livingScene('home'));
  assert.match(home, /^<div class="scene scene--hero" data-living data-scene="home" aria-hidden="true">/);
  assert.ok(home.includes('Illustration</span></div>'));
  for (const layer of ['aurora', 'stars', 'orb', 'ranges', 'water', 'glints', 'ridge', 'contours', 'mist', 'firs', 'fore', 'fireflies', 'seam']) assert.ok(home.includes(`data-layer="${layer}"`), layer);
  // Layer svgs are direct children of the land box: no svg nests inside another, and inner nodes carry no animation hooks.
  const land = home.slice(home.indexOf('<div class="sc-land"'));
  assert.ok(!/<svg[^>]*>(?:(?!<\/svg>).)*<svg/s.test(land), 'no nested svg');
  assert.ok(!/<(path|g|circle|use|rect)[^>]*data-t2/.test(home), 'only outer boxes loop');
  assert.match(home, /class="sc-mfore"/, 'the hero carries the mobile fore stand');
  assert.match(home, /data-draw/, 'ridge contours are a T1 draw group');
  const p = projects[0];
  assert.match(s(projectArt(p)), new RegExp(`^<div class="scene scene--card" data-scene="proj-${p.slug}" aria-hidden="true"><svg class="sc-vig sc-${p.season.toLowerCase().replace(/[^a-z]+/g, '-')}"`));
  assert.match(s(livingScene('area-sooke', { label: 'Photo to come' })), />Photo to come<\/span><\/div>$/);
  assert.ok(!s(livingScene('area-sooke', { chip: false })).includes('media__chip'));
  assert.match(s(livingSpecimens({ projects })), /<h2 id="living-h">Living scenes<\/h2>/);
});

test('loop budgets: home ≤ 7, areas ≤ 5, services ≤ 4, bands ≤ 3, still and art wells 0 #loops', () => {
  assert.equal(loops(s(livingScene('home'))), 7);
  for (const a of AREA_SLUGS) assert.ok(loops(s(livingScene(`area-${a}`))) <= 5, a);
  for (const v of SERVICE_SLUGS) assert.ok(loops(s(livingScene(`svc-${v}`))) <= 4, v);
  assert.ok(loops(s(livingScene('cta', { variant: 'band' }))) <= 3);
  assert.equal(loops(s(livingScene('home', { still: true }))), 0);
  assert.match(s(livingScene('home', { still: true })), /data-still/);
  for (const p of projects) assert.equal(loops(s(projectArt(p))), 0);
  assert.equal(loops(s(livingScene('area-sooke', { variant: 'card' }))), 0);
});

test('13 distinct area scenes, one recipe per municipality, ids accept area:<slug> too #areas', () => {
  assert.deepEqual(Object.keys(AREAS).sort(), [...AREA_SLUGS].sort());
  assert.deepEqual(Object.keys(SERVICES).sort(), [...SERVICE_SLUGS].sort());
  const out = AREA_SLUGS.map((/** @type {string} */ a) => s(livingScene(`area-${a}`)).replace(/lv-[a-z0-9]+-/g, ''));
  assert.equal(new Set(out).size, 13, 'every area scene differs');
  const cards = AREA_SLUGS.map((/** @type {string} */ a) => s(livingScene(`area-${a}`, { variant: 'card' })).replace(/data-scene="[^"]+"/, ''));
  assert.equal(new Set(cards).size, 13, 'every area art well differs');
  assert.equal(new Set(Object.values(AREAS).map((r) => r.cue)).size, 13, 'one landform cue per municipality');
  assert.equal(sceneRecipe('area:oak-bay').id, 'area-oak-bay');
  const pa = projects.map((p) => projectVignette(p));
  assert.equal(new Set(pa).size, projects.length, 'every project art differs');
});

test('contour plate and baked file art #files', () => {
  const plate = contourPlate({ a: ['0,0 10,0 10,10 0,10', 5, 5] }, { rings: 2, labels: { a: 'A' }, current: 'a' });
  assert.match(plate, /<path class="s-cont is-current" pathLength="1" d="M0 0 10 0 10 10 0 10ZM2 2 8 2 8 8 2 8ZM3 3 7 3 7 7 3 7Z"\/><text x="5" y="5" text-anchor="middle">A<\/text>/);
  const night = landscapeSvg('area-victoria', '16:9').svg, dawn = landscapeSvg('area-victoria', '16:9', { theme: 'dawn' }).svg;
  assert.ok(night.includes('#030A10') && dawn.includes('#C9DCE4') && night !== dawn);
  assert.ok(night.length <= 14000, `art file ${night.length} ≤ 14 KB`);
});

test('motion safety: loops only under html[data-alive], transform/opacity keyframes, no reduced-motion reads #motion', () => {
  const css = readFileSync(join(SITE, 'src/styles/45-living.css'), 'utf8');
  const js = readFileSync(join(SITE, 'src/scripts/living.js'), 'utf8');
  assert.ok(!/prefers-reduced-motion/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'CSS never reads prefers-reduced-motion');
  assert.ok(!/prefers-reduced-motion/.test(js.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'living.js asks prefs.motionOn()');
  assert.match(js, /import \{ motionOn, onMotionChange \} from '\.\/lib\/prefs\.js'/);
  assert.match(css, /^@layer living \{/m);
  for (const m of css.matchAll(/([^{}]+)\{[^{}]*\binfinite\b[^{}]*\}/g)) {
    assert.match(m[1].trim(), /^html\[data-alive\] /, `infinite animation outside [data-alive]: ${m[1].trim()}`);
    assert.match(m[0], /var\(--alive-play, running\)/, 'loops follow --alive-play');
  }
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
    for (const d of m[2].matchAll(/([a-z-]+)\s*:/g)) assert.ok(['transform', 'opacity'].includes(d[1]), `@keyframes ${m[1]} animates ${d[1]}`);
  }
  assert.ok(!/animation[^;]*--lv-rim/.test(css), '@property rim is a hover/focus transition, never a loop');
  assert.ok(!/\bfilter\s*:/.test(css.replace(/backdrop-filter/g, '')), 'no filter on scenes');
  // T2 periods: every literal loop period is ≥ 5 s (motion policy T2 > 5 s; check-motion-policy #raw-durations).
  for (const m of css.matchAll(/animation:\s*[\w-]+\s+([\d.]+)s\b[^;]*\binfinite\b/g)) assert.ok(Number(m[1]) >= 5, `loop period ${m[1]}s ≥ 5 s`);
});

test('slots sharing one scene get their own art well; the same slot keeps its bytes #slot-seed', () => {
  for (const v of SERVICE_SLUGS) {
    const a = s(livingScene(`svc-${v}`, { variant: 'card', seed: `svc-${v}-after` }));
    const b = s(livingScene(`svc-${v}`, { variant: 'card', seed: `svc-${v}-detail-1` }));
    const c = s(livingScene(`svc-${v}`, { variant: 'card', seed: `svc-${v}-detail-2` }));
    assert.equal(new Set([a, b, c]).size, 3, `svc-${v}: after, detail-1 and detail-2 differ`);
    assert.equal(a, s(livingScene(`svc-${v}`, { variant: 'card', seed: `svc-${v}-after` })), `svc-${v}: deterministic per slot`);
  }
  // Without a seed the well keeps its scene-id bytes (unchanged callers).
  assert.equal(s(livingScene('svc-irrigation', { variant: 'card' })), s(livingScene('svc-irrigation', { variant: 'card', seed: 'svc-irrigation' })));
});

test('livingSpecimens(): only the home-hero specimen loops; every grid row is still, so no viewport holds > 8 loops #specimen-budget', () => {
  const out = s(livingSpecimens({ projects }));
  const hero = out.slice(out.indexOf('lv-spec--hero'), out.indexOf('<div class="lv-spec-grid'));
  assert.equal(loops(hero), 7, 'the home hero specimen is live');
  const grids = out.split('<div class="lv-spec-grid').slice(1);
  assert.equal(grids.length, 2);
  for (const g of grids) {
    const frames = g.split('<figure class="lv-spec').slice(1);
    assert.ok(frames.length >= 4, `${frames.length} frames`);
    // A row holds at most 4 frames at 1440 px; with the hero above it in the same viewport the sum stays ≤ 8.
    for (let i = 0; i < frames.length; i += 4) assert.equal(frames.slice(i, i + 4).reduce((n, f) => n + loops(f), 0), 0, 'grid row is still');
  }
  assert.ok(loops(out) <= 8, `whole section ${loops(out)} loops`);
  assert.equal((out.match(/data-living[^>]*data-still/g) || []).length, 5, 'area ×3, service and band frames carry data-still');
});

test('aurora: "still" paints the aurora without its loop; the other loops stay #aurora-still', () => {
  const live = s(livingScene('home')), calm = s(livingScene('home', { aurora: 'still' }));
  assert.match(live, /class="sc-aurora" data-layer="aurora" data-t2/);
  assert.match(calm, /class="sc-aurora" data-layer="aurora" data-parallax/);
  assert.equal(loops(calm), loops(live) - 1);
});

test('project art reads the area: a seaside project shows water, an inland one does not #project-area', () => {
  const base = { slug: 'x-test', service: 'landscape-installation', season: 'Spring' };
  const sea = Object.keys(AREAS).find((a) => AREAS[a].water === 'sea');
  const dry = Object.keys(AREAS).find((a) => AREAS[a].water !== 'sea');
  assert.ok(sea && dry);
  assert.match(s(projectArt({ ...base, area: sea })), /class="f-w1"/, `${sea} project shows the sea`);
  assert.doesNotMatch(s(projectArt({ ...base, area: dry })), /class="f-w1"/, `${dry} project has no sea`);
  for (const p of projects.filter((q) => AREAS[q.area]?.water === 'sea')) assert.match(s(projectArt(p)), /class="f-w1"/, p.slug);
});
