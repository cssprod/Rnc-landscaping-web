// @ts-check
/**
 * Living vector art (CONTRACT §7, §9, §10; DESIGN-DIRECTION §8). Frozen signatures: livingScene(sceneId, o?),
 * projectArt(project, o?), illustrationChip(). Additive: livingSpecimens() for the /styleguide/ living section.
 *
 * Anatomy of a layered scene (hero / band):
 *   div.scene.scene--hero[data-living][data-scene][aria-hidden]       sky gradient (CSS), contain:paint
 *     svg.sc-defs                                                      fir sizes + glows, ids `lv-<scene>-…`
 *     div.sc-aurora[data-t2][data-parallax]                            T2 drift (transform) + T4 (translate)
 *     div.sc-land[data-parallax]                                       land box; T1 dolly (scale) + T4 (translate)
 *       svg.sc-l[data-layer]…                                          OUTER layer boxes; T2 on transform/opacity only
 *     div.sc-fade                                                      seam into --color-bg (never a straight cut)
 *     span.media__chip.media__chip--art                                visible "Illustration" chip
 * Colours are classes mapped to --sc-* in 45-living.css (night by default, dawn under [data-theme=light]).
 * Loops run only under html[data-alive] (scripts/living.js), so with no JS or motion off nothing loops.
 */
import { html, raw } from '../lib/html.mjs';
import { sceneLayers, vignette, projectVignette, AREAS, SERVICES, HOME_RECIPE, hash, rng } from '../lib/art.mjs';

/** Visible "Illustration" chip (`span.media__chip.media__chip--art`); decorative, so aria-hidden. @param {string} [label] @returns {any} */
export function illustrationChip(label = 'Illustration') {
  return html`<span class="media__chip media__chip--art" aria-hidden="true">${label}</span>`;
}

/**
 * Resolve a scene id to a recipe and loop budget. Ids: `home`, `area-<slug>` (or `area:<slug>`), `svc-<slug>`,
 * `process`, `cta`, `404`, anything else (a seeded cove).
 * @param {string} sceneId
 */
export function sceneRecipe(sceneId) {
  const id = String(sceneId).replace(/^area:/, 'area-');
  if (id === 'home') return { id, recipe: HOME_RECIPE, loops: 7, mobileFore: true, detail: 0.8 };
  if (id.startsWith('area-') && AREAS[id.slice(5)]) return { id, recipe: AREAS[id.slice(5)], loops: 5, mobileFore: false, detail: 0.75 };
  if (id.startsWith('svc-') && SERVICES[id.slice(4)]) return { id, recipe: SERVICES[id.slice(4)], loops: 4, mobileFore: false, motif: id.slice(4), detail: 0.55 };
  const R = rng(hash(id));
  /** @type {import('../lib/art.mjs').AreaRecipe} */
  const recipe = {
    water: /** @type {const} */ (['sea', 'sea', 'lake'])[Math.floor(R() * 3)], distant: /** @type {const} */ (['range', 'islands', 'hills'])[Math.floor(R() * 3)],
    trees: 0.5 + R() * 0.4, horizon: 0.55, orbX: 0.6 + R() * 0.25, cue: 'cove', time: 'dusk', sunX: 0.7,
  };
  return { id, recipe, loops: 4, mobileFore: false, detail: 0.6 };
}

/**
 * A layered landscape scene: `div.scene.scene--{variant}` holding OUTER `svg.sc-l` layer boxes.
 * - `hero` (default): every layer; ≤ 7 loops for home, ≤ 5 for areas, ≤ 4 for services.
 * - `band`: the same engine at ≤ 3 loops (CTA band, process).
 * - `card`: a small static art well (no loops, no ids), sized by `aspect`.
 * @param {string} sceneId `home`, `area-<slug>`, `svc-<slug>`, `process`, `cta`, `404`…
 * @param {{ variant?: 'hero'|'band'|'card', aspect?: string, priority?: boolean, label?: string, still?: boolean, uid?: string, chip?: boolean, seed?: string, aurora?: 'loop'|'still' }} [o]
 *   `label` replaces the chip text (e.g. "Photo to come"); `still` renders 0 loops (quote-calm); `uid` overrides the id
 *   prefix when one scene id appears twice on a page; `chip: false` omits the chip (the caller shows its own);
 *   `seed` seeds a `card` well (default: the scene id), so several slots sharing one scene each get their own picture;
 *   `aurora: 'still'` paints the aurora without its drift loop (the costliest composited layer; for heroes that still
 *   sit under backdrop-filter glass).
 * @returns {any}
 */
export function livingScene(sceneId, o = {}) {
  const variant = o.variant || 'hero';
  const { id, recipe, loops, mobileFore, motif, detail } = sceneRecipe(sceneId);
  const chip = o.chip === false ? '' : illustrationChip(o.label);
  if (variant === 'card') {
    const [aw, ah] = String(o.aspect || '4:3').split(':').map(Number);
    const w = 480, h = Math.round((480 * (ah || 3)) / (aw || 4));
    const kind = motif || (id.startsWith('area-') ? id : 'cove');
    return html`<div class="scene scene--card" data-scene="${id}" aria-hidden="true">${raw(vignette(kind, o.seed || id, { w, h }))}${chip}</div>`;
  }
  // Ids are namespaced `lv-` + a short hash of the scene id and variant (or `o.uid`), so two scenes never collide.
  const uid = `lv-${hash(o.uid || `${id}|${variant}`).toString(36).slice(0, 5)}-`;
  const max = o.still ? 0 : variant === 'band' ? Math.min(3, loops) : loops;
  const parts = sceneLayers(recipe, { seed: id, uid, motif, mobileFore: variant === 'hero' && mobileFore, loops: max, copySide: variant === 'band' ? 'none' : 'left', detail: variant === 'band' ? Math.min(detail, 0.6) : detail });
  const land = [];
  let aurora = '';
  for (const l of parts.layers) {
    const t2 = l.t2 && !(l.name === 'aurora' && o.aurora === 'still');
    const attrs = `data-layer="${l.name}"${t2 ? ' data-t2' : ''}`;
    if (l.html) {
      const el = `<div class="${l.cls}" ${attrs}${l.name === 'aurora' ? ' data-parallax style="--depth:.03"' : ''}>${l.svg}</div>`;
      if (l.name === 'aurora') aurora = el; else land.push(el);
    } else {
      land.push(l.svg.replace('<svg ', `<svg ${attrs} `));
    }
  }
  const still = o.still ? raw(' data-still') : '';
  return html`<div class="scene scene--${variant}" data-living data-scene="${id}"${still} aria-hidden="true">${raw(`<svg class="sc-defs" width="0" height="0"><defs>${parts.defs}</defs></svg>${aurora}<div class="sc-land" data-parallax style="--depth:.06">${land.join('')}</div><div class="sc-fade" data-layer="seam"></div>`)}${chip}</div>`;
}

/**
 * Per-project art (replaces stock under /projects/): the lit cottage, stone path and beds, seeded by slug, beds
 * coloured by `season`, the service motif in the yard. Static; no ids; aria-hidden with the "Illustration" chip.
 * @param {any} project project object (CONTRACT §6): slug, service, season
 * @param {{ aspect?: string, variant?: string, label?: string, chip?: boolean }} [o]
 * @returns {any}
 */
export function projectArt(project, o = {}) {
  const [aw, ah] = String(o.aspect || '4:3').split(':').map(Number);
  const w = 480, h = Math.round((480 * (ah || 3)) / (aw || 4));
  const p = { slug: String(project?.slug || 'project'), service: project?.service, season: project?.season, area: project?.area };
  return html`<div class="scene scene--card" data-scene="proj-${p.slug}" aria-hidden="true">${raw(projectVignette(p, { w, h }))}${o.chip === false ? '' : illustrationChip(o.label)}</div>`;
}

/**
 * The /styleguide/ living section (showcase builds only): the hero, three area scenes, a service nocturne, a still
 * band and project and vignette art wells, each in a labelled frame. ds-comp places it on /styleguide/.
 * @param {{ projects?: any[], id?: string }} [o]
 * @returns {any}
 */
export function livingSpecimens(o = {}) {
  const id = o.id || 'living-h';
  /** @param {string} title @param {any} body @param {string} [cls] */
  const frame = (title, body, cls = '') => html`<figure class="lv-spec ${cls}"><div class="lv-spec__stage">${body}</div><figcaption>${title}</figcaption></figure>`;
  const projects = (o.projects || []).slice(0, 4);
  return html`<section class="section lv-specimens" aria-labelledby="${id}"><div class="wrap">
  <h2 id="${id}">Living scenes</h2>
  <p>Layered vector landscapes: night is bioluminescent, the light theme is dawn. Loops run only while Animations is on, pause off-screen and on hidden tabs, and never run without JavaScript.</p>
  ${frame('Home hero (≤ 7 loops)', livingScene('home'), 'lv-spec--hero')}
  <div class="lv-spec-grid">
    ${['sea', 'lake', 'none'].map((water) => Object.keys(AREAS).find((a) => AREAS[a].water === water) || '').map((a) => frame(`Area scene: ${a}`, livingScene(`area-${a}`)))}
    ${frame('Service nocturne: irrigation', livingScene('svc-irrigation'))}
    ${frame('Still band (0 loops)', livingScene('cta', { variant: 'band', still: true }))}
  </div>
  <div class="lv-spec-grid lv-spec-grid--cards">
    ${projects.map((p) => frame(`Project art: ${p.title || p.slug}`, projectArt(p), 'lv-spec--card'))}
    ${['grounds-maintenance', 'landscape-installation', 'irrigation', 'tree-vegetation'].map((s) => frame(`Vignette: ${s}`, livingScene(`svc-${s}`, { variant: 'card' }), 'lv-spec--card'))}
  </div>
</div></section>`;
}
