// @ts-check
/**
 * Generative living art (owner: living). Pure, deterministic string builders: the same input always gives the same
 * bytes (seeded RNG, integer coordinates, no dates, no Math.random).
 *
 * - `sceneLayers(recipe, o)`: the layered night/dawn landscape (hero, area and service scenes). Every layer is its own
 *   OUTER <svg> sharing viewBox 0 0 1600 400 (xMidYMax slice); colours are classes (.f-*, .s-*, .st-*) that
 *   45-living.css maps to the --sc-* palette, so one DOM serves both themes. components/living.mjs wraps the layers.
 * - `vignette(kind, seed, o)` / `projectVignette(project, o)`: small static art wells (cards, project art), one <svg>,
 *   no ids (several can share a page), drawn in the same hand.
 * - `contourPlate(tiles, o)`: the 13-tile contour plate (areas hub, 404, CTA rings) as contour lines only.
 * - `landscapeSvg(id, aspect, o)`: the standalone SVG *file* used for <img> fallbacks and OG cards. Files cannot read
 *   CSS variables, so `theme: 'night' | 'dawn'` bakes the palette in.
 *
 * Every scene is an illustration, never a claim: landform cues follow public geography (DESIGN-DIRECTION §8.3).
 */

/** FNV-1a string hash. @param {string} s */
export function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
/** mulberry32 PRNG @param {number} seed */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** @param {number} n */
const r0 = (n) => Math.round(n);
/** @param {number} n */
const r1 = (n) => Math.round(n * 10) / 10;
/** @param {number} v @param {number} a @param {number} b */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Land viewBox shared by every scene layer. */
export const LAND = { W: 1600, H: 400 };
const W = LAND.W, H = LAND.H;

/* ------------------------------------------------------------------ recipes */

/**
 * @typedef {'rocky-point'|'farm-strips'|'garry-oaks'|'inlet'|'fir-hills'|'lagoon-spit'|'sheltered-inlet'|'tall-firs'|'hedgerows'|'island-chain'|'islands-close'|'outcrops'|'meadow'|'cove'} Cue
 * @typedef {{ water: 'sea'|'lake'|'none', distant: 'range'|'islands'|'hills', trees: number, horizon: number, orbX: number, cue: Cue, time: 'morning'|'day'|'dusk'|'overcast', sunX: number }} AreaRecipe
 */

/**
 * Per-area recipes (CONTRACT §1 slugs). water: sea | lake | none; distant: range (Olympic Mountains across the strait),
 * islands (Gulf Islands), hills. `cue` is one landform from public geography (DESIGN-DIRECTION §8.3). `time`/`sunX`
 * drive the baked file palettes of landscapeSvg().
 * @type {Record<string, AreaRecipe>}
 */
export const AREAS = {
  victoria: { water: 'sea', distant: 'range', trees: 0.6, horizon: 0.56, orbX: 0.72, cue: 'rocky-point', time: 'morning', sunX: 0.72 },
  saanich: { water: 'lake', distant: 'hills', trees: 0.8, horizon: 0.5, orbX: 0.3, cue: 'farm-strips', time: 'day', sunX: 0.3 },
  'oak-bay': { water: 'sea', distant: 'range', trees: 0.45, horizon: 0.58, orbX: 0.62, cue: 'garry-oaks', time: 'dusk', sunX: 0.62 },
  esquimalt: { water: 'sea', distant: 'range', trees: 0.55, horizon: 0.55, orbX: 0.25, cue: 'inlet', time: 'overcast', sunX: 0.25 },
  langford: { water: 'lake', distant: 'hills', trees: 1, horizon: 0.48, orbX: 0.78, cue: 'fir-hills', time: 'day', sunX: 0.78 },
  colwood: { water: 'sea', distant: 'range', trees: 0.7, horizon: 0.57, orbX: 0.35, cue: 'lagoon-spit', time: 'dusk', sunX: 0.35 },
  'view-royal': { water: 'sea', distant: 'hills', trees: 0.8, horizon: 0.54, orbX: 0.68, cue: 'sheltered-inlet', time: 'morning', sunX: 0.68 },
  sooke: { water: 'sea', distant: 'range', trees: 1, horizon: 0.55, orbX: 0.8, cue: 'tall-firs', time: 'dusk', sunX: 0.8 },
  'central-saanich': { water: 'none', distant: 'hills', trees: 0.35, horizon: 0.52, orbX: 0.4, cue: 'hedgerows', time: 'day', sunX: 0.4 },
  'north-saanich': { water: 'sea', distant: 'islands', trees: 0.6, horizon: 0.56, orbX: 0.58, cue: 'island-chain', time: 'day', sunX: 0.58 },
  sidney: { water: 'sea', distant: 'islands', trees: 0.4, horizon: 0.58, orbX: 0.3, cue: 'islands-close', time: 'morning', sunX: 0.3 },
  highlands: { water: 'lake', distant: 'hills', trees: 1, horizon: 0.44, orbX: 0.6, cue: 'outcrops', time: 'overcast', sunX: 0.6 },
  metchosin: { water: 'sea', distant: 'range', trees: 0.75, horizon: 0.56, orbX: 0.5, cue: 'meadow', time: 'dusk', sunX: 0.5 },
};

/** The home cove: sea, Olympics, moon over the strait. @type {AreaRecipe} */
export const HOME_RECIPE = { water: 'sea', distant: 'range', trees: 0.8, horizon: 0.56, orbX: 0.74, cue: 'cove', time: 'dusk', sunX: 0.74 };

/** Service scenes: a calm cove behind the service motif. @type {Record<string, AreaRecipe>} */
export const SERVICES = {
  'grounds-maintenance': { water: 'none', distant: 'hills', trees: 0.6, horizon: 0.52, orbX: 0.78, cue: 'cove', time: 'day', sunX: 0.78 },
  'landscape-installation': { water: 'sea', distant: 'range', trees: 0.6, horizon: 0.56, orbX: 0.8, cue: 'cove', time: 'morning', sunX: 0.8 },
  irrigation: { water: 'lake', distant: 'hills', trees: 0.6, horizon: 0.5, orbX: 0.76, cue: 'cove', time: 'day', sunX: 0.76 },
  'tree-vegetation': { water: 'none', distant: 'range', trees: 1, horizon: 0.5, orbX: 0.72, cue: 'tall-firs', time: 'overcast', sunX: 0.72 },
};

/* ---------------------------------------------------------------- geometry */

/** "x y" with the separator dropped before a minus sign. @param {number} x @param {number} y */
const pair = (x, y) => `${x}${y < 0 ? '' : ' '}${y}`;

/** Smooth open path through points (Catmull-Rom as cubic Béziers), integer coordinates. @param {number[][]} pts */
export function smooth(pts) {
  let d = `M${pair(r0(pts[0][0]), r0(pts[0][1]))}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${pair(r0(p1[0] + (p2[0] - p0[0]) / 6), r0(p1[1] + (p2[1] - p0[1]) / 6))} ${pair(r0(p2[0] - (p3[0] - p1[0]) / 6), r0(p2[1] - (p3[1] - p1[1]) / 6))} ${pair(r0(p2[0]), r0(p2[1]))}`;
  }
  return d;
}
/** Polyline (implicit lineto after M). @param {number[][]} pts */
const poly = (pts) => `M${pts.map((p) => pair(r0(p[0]), r0(p[1]))).join(' ')}`;
/** Close an open ridge down to `bottom`. @param {string} d @param {number[][]} pts @param {number} bottom */
const down = (d, pts, bottom) => `${d}L${pair(r0(pts[pts.length - 1][0]), r0(bottom))}H${r0(pts[0][0])}Z`;
/** Sample f over [x0, x1]. @param {(x:number)=>number} f @param {number} x0 @param {number} x1 @param {number} n */
const sampleFn = (f, x0, x1, n) => Array.from({ length: n + 1 }, (_, i) => { const x = x0 + ((x1 - x0) * i) / n; return [x, f(x)]; });

/** Stepped Douglas fir (the logo mark), apex at (x, y - h), base centred on (x, y). k narrows it. @param {number} x @param {number} y @param {number} h @param {number} [k] */
export function firD(x, y, h, k = 0.85) {
  const s = h / 100, q = h < 60 ? r1 : r0, a = (/** @type {number} */ v) => q(v * s * k), b = (/** @type {number} */ v) => q(v * s);
  return `M${pair(q(x), q(y - h))}l${pair(a(-13), b(36))}h${a(5.5)}l${pair(a(-12.5), b(31))}h${a(7.5)}l${pair(a(-13.5), b(33))}h${a(52)}l${pair(a(-13.5), b(-33))}h${a(7.5)}l${pair(a(-12.5), b(-31))}h${a(5.5)}z`;
}
/** Garry oak silhouette: a broad, lumpy crown on a short trunk. @param {number} x @param {number} y @param {number} h */
export function oakD(x, y, h) {
  const s = h / 100, q = (/** @type {number} */ v) => r0(v * s);
  return `M${pair(r0(x - 4 * s), r0(y))}v${q(-34)}c${q(-30)} ${q(4)} ${q(-46)} ${q(-18)} ${q(-36)} ${q(-38)}c${q(-6)} ${q(-22)} ${q(18)} ${q(-30)} ${q(30)} ${q(-24)}c${q(8)} ${q(-16)} ${q(34)} ${q(-14)} ${q(40)} ${q(-2)}c${q(22)} ${q(-6)} ${q(40)} ${q(12)} ${q(32)} ${q(30)}c${q(14)} ${q(14)} ${q(2)} ${q(36)} ${q(-26)} ${q(34)}v${q(34)}z`;
}
/** Zero-length dots (stars, fireflies, blooms) as one path, relative moves; round caps come from CSS. @param {number[][]} pts */
const dots = (pts) => {
  let d = '', px = 0, py = 0;
  pts.forEach((p, i) => { const x = r0(p[0]), y = r0(p[1]); d += i ? `m${pair(x - px, y - py)}h0` : `M${pair(x, y)}h0`; px = x; py = y; });
  return d;
};

/** Pre-sized fir heights, reused through <use> inside one scene. */
const FIRH = [18, 26, 36, 50, 70, 96, 150, 220, 300, 360];
/** @param {number} h */
const firIdx = (h) => { let i = 0; for (let j = 0; j < FIRH.length; j++) if (Math.abs(FIRH[j] - h) < Math.abs(FIRH[i] - h)) i = j; return i; };

/**
 * Jagged mountain range (Olympics across the strait).
 * @param {() => number} R @param {{x:number,h:number,w:number}[]} peaks @param {number} base @param {number} scale @param {number} n @param {number} rough
 */
function rangePts(R, peaks, base, scale, n, rough) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = -0.03 + (i / n) * 1.06;
    let h = 8 + rough * R();
    for (const p of peaks) h += p.h * Math.max(0, 1 - Math.abs(u - p.x) / p.w) ** 1.5;
    h += 5 * Math.sin(u * 31);
    pts.push([u * W, base - h * scale]);
  }
  return pts;
}

/* ------------------------------------------------------------ scene layers */

/**
 * @typedef {{ name: string, cls: string, svg: string, t2?: boolean, mobile?: boolean, draw?: boolean, html?: boolean }} Layer
 * @typedef {{ defs: string, layers: Layer[], loops: number }} SceneParts
 */

/**
 * The layered night/dawn landscape. Returns the shared defs (namespaced ids `${uid}…`) and the layers back to front.
 * Each layer's `svg` is a complete OUTER <svg> (class hooks only, no colours). Layers share viewBox 0 0 1600 400 and
 * fill a 4:1 land box, so no preserveAspectRatio is needed; sky content sits at negative y and overflows upward.
 * `t2` marks an ambient loop layer. `detail` (1 hero … .55 service) thins trees, stars and lines to fit the budgets.
 * @param {AreaRecipe} recipe
 * @param {{ seed: string, uid: string, motif?: string, mobileFore?: boolean, loops?: number, copySide?: 'left'|'none', detail?: number }} o
 * @returns {SceneParts}
 */
export function sceneLayers(recipe, o) {
  const R = rng(hash(o.seed));
  const uid = o.uid;
  const k = o.detail ?? 1;
  const maxLoops = o.loops ?? 7;
  const rich = maxLoops >= 7;
  const HZ = recipe.water === 'sea' ? 132 : recipe.water === 'lake' ? 150 : 168;
  const MX = r0(clamp(recipe.orbX, 0.12, 0.9) * W), MY = -150;
  /** @type {Layer[]} */ const L = [];
  let loops = 0;
  const take = () => (loops < maxLoops ? (loops++, true) : false);
  /** @param {string} cls @param {string} inner @param {string} [extra] */
  const svg = (cls, inner, extra = '') => `<svg class="${cls}" viewBox="0 0 ${W} ${H}"${extra}>${inner}</svg>`;
  /** @param {number} x @param {number} y @param {number} h */
  const fir = (x, y, h) => { const i = firIdx(h); used.add(i); return `<use href="#${uid}${i}" x="${r0(x)}" y="${r0(y)}"/>`; };
  /** @param {(x:number)=>number} f @param {number} x0 @param {number} x1 @param {number} n @param {number} hmin @param {number} hmax @param {number} [sink] */
  const firs = (f, x0, x1, n, hmin, hmax, sink = 4) => {
    let g = '';
    for (let i = 0; i < Math.max(1, r0(n)); i++) { const x = x0 + R() * (x1 - x0); g += fir(x, f(x) + sink, hmin + R() * (hmax - hmin)); }
    return g;
  };

  // Defs: fir sizes, firefly and halo glows, water and moon-column gradients.
  const used = new Set();
  const glow = ``
    + `<radialGradient id="${uid}y"><stop offset=".08" class="st-flyc"/><stop offset=".16" class="st-fly" stop-opacity=".9"/><stop offset=".4" class="st-fly" stop-opacity=".22"/><stop offset="1" class="st-fly" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${uid}h"><stop offset="0" class="st-halo" stop-opacity=".6"/><stop offset=".22" class="st-halo" stop-opacity=".2"/><stop offset="1" class="st-halo" stop-opacity="0"/></radialGradient>`
    + (recipe.water !== 'none' ? `<linearGradient id="${uid}w" x2="0" y2="1"><stop class="st-w1"/><stop offset="1" class="st-w2"/></linearGradient>`
      + `<linearGradient id="${uid}c" x2="0" y2="1"><stop class="st-glint" stop-opacity=".34"/><stop offset="1" class="st-glint" stop-opacity="0"/></linearGradient>` : '');

  // 1. Aurora: an HTML wrapper with two CSS-painted divs (ellipses + masked rays); moved by transform only.
  if (take()) L.push({ name: 'aurora', cls: 'sc-aurora', svg: '<div class="sc-aurora-a"></div><div class="sc-aurora-b"></div>', t2: true, html: true });

  // 2. Stars A (twinkles) and B (static, hero only), masked behind the copy column in CSS.
  /** @param {number} n */
  const stars = (n) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = R() * W, y = -560 + R() * 640 * (0.35 + 0.65 * R());
      if (y > HZ - 34 || Math.hypot(x - MX, y - MY) < 70) continue;
      pts.push([x, y]);
    }
    return dots(pts);
  };
  /** @param {string} cls @param {number} a @param {number} b */
  const starLayer = (cls, a, b) => svg(cls, `<path class="ln s-st1" d="${stars(a)}"/><path class="ln s-st2" d="${stars(b)}"/>`);
  const tw = take();
  L.push({ name: 'stars', cls: 'sc-stars-a', svg: starLayer('sc-stars-a', r0(32 * k), r0(6 * k)), t2: tw });
  if (rich && k >= 1) L.push({ name: 'stars', cls: 'sc-stars-b', svg: starLayer('sc-stars-b', 22, 4) });

  // 3. Moon (night) / sun (dawn): the same shapes; CSS drops the orb behind the range at dawn.
  L.push({ name: 'orb', cls: 'sc-orb', svg: svg('sc-orb', `<circle cx="${MX}" cy="${MY}" r="330" fill="url(#${uid}h)"/><circle class="f-moon f-full" cx="${MX}" cy="${MY}" r="40"/><path class="f-moon" d="M${MX} ${MY - 40}A40 40 0 1 0 ${MX} ${MY + 40}A32 40 0 1 1 ${MX} ${MY - 40}Z" transform="rotate(-24 ${MX} ${MY})"/>`) });

  // 4. Distant: Olympic range, Gulf Islands or rolling hills; tonal fills with a moonlit rim.
  let far = '';
  if (recipe.distant === 'range') {
    const peaks = Array.from({ length: 5 }, (_, i) => ({ x: 0.08 + i * 0.21 + R() * 0.08, h: 44 + R() * 50, w: 0.07 + R() * 0.03 }));
    const f1 = rangePts(R, peaks, HZ + 1, 1, r0(40 * Math.max(k, 0.7)), 8), f2 = rangePts(R, peaks, HZ + 1, 0.45, 24, 6);
    far = `<path class="f-far1 s-farrim" d="${down(poly(f1), f1, HZ + 2)}"/><path class="f-far2" d="${down(poly(f2), f2, HZ + 2)}"/>`;
  } else if (recipe.distant === 'islands') {
    const close = recipe.cue === 'islands-close';
    const n = close ? 3 : 5;
    let d = '';
    for (let i = 0; i < n; i++) {
      const cx = W * (0.08 + (i / n) * 0.92 + R() * 0.08), w = W * (close ? 0.2 + R() * 0.1 : 0.1 + R() * 0.1), h = close ? 34 + R() * 26 : 14 + R() * 20;
      d += `M${r0(cx - w / 2)} ${HZ + 1}C${r0(cx - w / 4)} ${r0(HZ - h * 1.4)} ${r0(cx + w / 5)} ${r0(HZ - h * 1.6)} ${r0(cx + w / 2)} ${HZ + 1}Z`;
    }
    const f2 = rangePts(R, [{ x: 0.3, h: 30, w: 0.2 }, { x: 0.8, h: 36, w: 0.2 }], HZ + 1, 0.5, 16, 4);
    far = `<path class="f-far2" d="${down(poly(f2), f2, HZ + 2)}"/><path class="f-far1 s-farrim" d="${d}"/>`;
  } else {
    const base = HZ - 4, ph = R() * 6;
    const fA = (/** @type {number} */ x) => base - 34 - 22 * Math.sin(x / 230 + ph) - 12 * Math.sin(x / 97);
    const fB = (/** @type {number} */ x) => base - 12 - 14 * Math.sin(x / 180 + 2) - 8 * Math.sin(x / 61);
    const a = sampleFn(fA, -40, W + 40, 14), b = sampleFn(fB, -40, W + 40, 12);
    far = `<path class="f-far1 s-farrim" d="${down(smooth(a), a, HZ + 2)}"/><path class="f-far2" d="${down(smooth(b), b, HZ + 2)}"/>`;
  }
  L.push({ name: 'ranges', cls: 'sc-far', svg: svg('sc-far', far) });

  // 5. Water with the moon column; glint boxes cross-fade (no inner node animates).
  if (recipe.water !== 'none') {
    const col = MX > 200 && MX < 1400 ? `<path d="M${MX - 26} ${HZ}L${MX + 26} ${HZ}L${MX + 150} ${H}L${MX - 150} ${H}Z" fill="url(#${uid}c)"/>` : '';
    L.push({ name: 'water', cls: 'sc-water', svg: svg('sc-water', `<rect y="${HZ}" width="${W}" height="${H - HZ}" fill="url(#${uid}w)"/>${col}`) });
    /** @param {number} n */
    const glints = (n) => {
      let d = '';
      for (let i = 0; i < n; i++) {
        const t = (i / n) ** 1.3, y = HZ + 6 + t * (H - HZ - 80), x = MX + (R() - 0.5) * (30 + t * 240), len = 6 + R() * 18 * (1 + t * 1.6);
        d += `M${r0(x - len / 2)} ${r0(y)}h${r0(len)}`;
      }
      for (let i = 0; i < n * 0.4; i++) d += `M${r0(380 + R() * 900)} ${r0(HZ + 10 + R() * 100)}h${r0(4 + R() * 12)}`;
      return d;
    };
    L.push({ name: 'glints', cls: 'sc-glint-a', svg: svg('sc-glint-a', `<path class="ln s-glint" d="${glints(r0(22 * k))}"/>`), t2: take() });
    if (rich) L.push({ name: 'glints', cls: 'sc-glint-b', svg: svg('sc-glint-b', `<path class="ln s-glint" d="${glints(16)}"/>`), t2: take() });
  }

  // 6. Mid ground: headlands, hills or fields with small firs; the cue lives here or on the near shore.
  const tr = recipe.trees * k;
  let mid = '';
  if (recipe.water === 'sea') {
    const wide = recipe.cue === 'tall-firs' || recipe.cue === 'island-chain';
    const inlet = recipe.cue === 'inlet' || recipe.cue === 'sheltered-inlet';
    const xl = wide ? 520 : inlet ? 760 : 700, xr = inlet ? 900 : wide ? 1420 : 1340;
    const fMidL = (/** @type {number} */ x) => HZ - (inlet ? 44 : 32) + (x / xl) ** 2 * 44 - 10 * Math.sin(x / 90);
    const fMidR = (/** @type {number} */ x) => HZ - 6 - (inlet ? 46 : 30) * Math.sin(Math.PI * clamp((x - xr) / (W + 60 - xr), 0, 1)) - 6 * Math.sin(x / 70);
    const ml = sampleFn(fMidL, -40, xl + 20, 8), mr = sampleFn(fMidR, xr - 20, W + 60, 5);
    mid = `<path d="${down(smooth(ml), ml, HZ + 8)}"/><path d="${down(smooth(mr), mr, HZ + 8)}"/>`
      + firs(fMidL, -20, xl - 120, 18 * tr + 3, 16, recipe.cue === 'tall-firs' ? 54 : 40)
      + firs(fMidR, xr + 40, W + 20, 7 * tr + 2, 16, 34);
    if (recipe.cue === 'lagoon-spit') mid += `<path d="M560 ${HZ + 34}C760 ${HZ + 22} 1000 ${HZ + 24} 1260 ${HZ + 30}C1300 ${HZ + 32} 1340 ${HZ + 38} 1360 ${HZ + 44}C1100 ${HZ + 40} 820 ${HZ + 42} 560 ${HZ + 40}Z"/>`;
    if (recipe.cue === 'rocky-point') mid += `<path d="M1060 ${HZ + 46}L1110 ${HZ + 30} 1150 ${HZ + 34} 1196 ${HZ + 18} 1250 ${HZ + 24} 1300 ${HZ + 12} 1360 ${HZ + 20} 1360 ${HZ + 60}Z"/>`;
    if (recipe.cue === 'islands-close') mid += `<path d="M620 ${HZ + 26}C700 ${HZ - 4} 820 ${HZ - 8} 900 ${HZ + 26}Z"/>${firs(() => HZ + 8, 660, 860, 5, 14, 26, 0)}`;
  } else {
    const lake = recipe.water === 'lake';
    const fMid = lake
      ? (/** @type {number} */ x) => HZ - 40 - 26 * Math.sin(x / 260) - 10 * Math.sin(x / 77)
      : (/** @type {number} */ x) => HZ - 20 - 18 * Math.sin(x / 300 + 1) - 6 * Math.sin(x / 80);
    const m = sampleFn(fMid, -40, W + 40, 12);
    mid = `<path d="${down(smooth(m), m, lake ? HZ + 4 : H + 2)}"/>${firs(fMid, -20, W + 20, (lake ? 40 : 22) * tr + 4, 14, recipe.cue === 'fir-hills' ? 46 : recipe.cue === 'tall-firs' ? 60 : 32)}`;
  }
  // Field strips and hedgerows ride on the mid ground (hairlines in the rim colour); outcrops are rock fills.
  let extra = '';
  if (recipe.cue === 'farm-strips' || recipe.cue === 'hedgerows' || recipe.water === 'none') {
    let d = '';
    const lake = recipe.water === 'lake';
    for (let i = 0; i < 5; i++) {
      const y = (lake ? HZ - 20 : HZ + 10) + i * (lake ? 5 : 16) + i * i * 2, x0 = 200 + R() * 300 - i * 40, x1 = 1000 + R() * 400 + i * 40;
      d += `M${r0(x0)} ${r0(y)}C${r0(x0 + 200)} ${r0(y - 6)} ${r0(x1 - 200)} ${r0(y + 6)} ${r0(x1)} ${r0(y - 2)}`;
    }
    extra = `<path class="ln s-strip" d="${d}"/>`;
    if (recipe.cue === 'hedgerows') {
      const pts = [];
      for (let row = 0; row < 3; row++) for (let i = 0; i < 18; i++) pts.push([260 + i * 60 + R() * 10, HZ + 30 + row * 42 + Math.sin(i / 3) * 4]);
      extra += `<path class="ln s-hedge" d="${dots(pts)}"/>`;
    }
  }
  if (recipe.cue === 'outcrops') extra += `<path class="f-rock s-farrim" d="M520 ${HZ - 18}L560 ${HZ - 52} 604 ${HZ - 60} 650 ${HZ - 30} 668 ${HZ}H500ZM1040 ${HZ - 10}L1080 ${HZ - 40} 1130 ${HZ - 36} 1160 ${HZ - 8} 1170 ${HZ + 4}H1030Z"/>`;
  L.push({ name: 'ridge', cls: 'sc-mid', svg: svg('sc-mid', `<g class="f-mid">${mid}</g>${extra}`) });

  // 7. Ridge contours: glowing survey lines over the near headlands; a T1 one-shot draw ([data-draw]).
  const fN = recipe.water === 'none'
    ? (/** @type {number} */ x) => 306 - 40 * Math.exp(-(((x - 160) / 360) ** 2)) - 52 * Math.exp(-(((x - 1500) / 340) ** 2)) + 6 * Math.sin(x / 90)
    : (/** @type {number} */ x) => 300 - 70 * Math.exp(-(((x - 120) / 340) ** 2)) - 74 * Math.exp(-(((x - 1560) / 300) ** 2)) + 26 * Math.exp(-(((x - 900) / 360) ** 2)) + 6 * Math.sin(x / 70);
  {
    let c = '';
    for (let j = 0; j < (rich ? 2 : 1); j++) {
      const off = 18 + j * 18;
      const left = sampleFn((x) => fN(x) - off, -20, 420 - j * 60, 4), right = sampleFn((x) => fN(x) - off, 1240 + j * 60, W + 20, 4);
      c += `<path pathLength="1" d="${smooth(left)}"/><path pathLength="1" d="${smooth(right)}"/>`;
    }
    L.push({ name: 'contours', cls: 'sc-cont', svg: svg('sc-cont', `<g class="ln s-cont">${c}</g>`, ' data-draw'), draw: true });
  }

  // 8. Mist band (HTML, CSS gradients), a slow T2 drift.
  if (take()) L.push({ name: 'mist', cls: 'sc-mist', svg: '', t2: true, html: true });

  // 9. Near shore with firs at both edges; bioluminescent surf on the sea; the motif or cue in the middle.
  const near = sampleFn(fN, -40, W + 40, 10);
  const tall = recipe.cue === 'tall-firs' ? 1.35 : 1;
  let nearInner = `<path class="s-rim" d="${down(smooth(near), near, H + 2)}"/>`
    + firs(fN, -20, 430, 9 * tr + 3, 50 * tall, 92 * tall)
    + firs(fN, 1300, W + 20, 8 * tr + 3, 46 * tall, 98 * tall);
  if (recipe.cue === 'garry-oaks' || recipe.cue === 'meadow') {
    const meadow = recipe.cue === 'meadow';
    let d = '';
    for (let i = 0; i < 4; i++) { const x = (meadow ? 540 : 300) + i * (meadow ? 170 : 240) + R() * 60; d += oakD(x, fN(x) + 4, 46 + R() * 30); }
    nearInner += `<path d="${d}"/>`;
  } else if (!o.motif) {
    nearInner += firs(fN, 620, 1120, 3, 28, 44);
  }
  let surf = '', surfDef = '';
  if (recipe.water === 'sea') {
    const d = smooth(sampleFn((x) => fN(x) - 7, 330, 1380, 8));
    surfDef = `<path id="${uid}s" d="${d}"/>`;
    surf = `<g class="ln s-surf"><use href="#${uid}s" class="s-surf1"/><use href="#${uid}s" class="s-surf2"/><use href="#${uid}s"/></g>`;
  }
  L.push({ name: 'firs', cls: 'sc-near', svg: svg('sc-near', `<g class="f-near">${nearInner}</g>${surf}${o.motif ? motifFg(o.motif, fN, R) : ''}`) });

  // 10. Fore: the seam ridge and tall edge firs (taller on the right, away from the copy column).
  const fF = (/** @type {number} */ x) => 392 - 10 * Math.sin(x / 120);
  const big = o.copySide === 'none'
    ? [[-30, 200], [40, 230], [110, 170], [1440, 230], [1520, 270], [1590, 210]]
    : [[-30, 210], [40, 240], [110, 180], [180, 150], [1360, 210], [1420, 300 * tall], [1500, 360 * tall], [1570, 300]];
  L.push({ name: 'fore', cls: 'sc-fore', svg: svg('sc-fore', `<g class="f-fore s-forerim"><path d="M-40 ${H + 2}V384C200 370 420 396 700 402C1000 404 1300 376 1640 372V${H + 2}Z"/>${big.map(([x, h]) => fir(x, fF(x) + 6, h)).join('')}</g>`) });

  // 11. Mobile-only fore stand: the 960px land box shows x ≈ 475–1125, so that band needs its own shoulders.
  if (o.mobileFore) {
    L.push({ name: 'fore', cls: 'sc-mfore', mobile: true, svg: svg('sc-mfore', `<path class="f-mid" d="M440 402V300C500 286 560 292 640 312L700 402ZM1180 402V296C1110 284 1040 294 980 316L930 402Z"/><g class="f-fore s-forerim"><path d="M440 402C520 378 600 384 660 398V402ZM960 402C1040 382 1110 378 1180 386V402Z"/>${[[470, 404, 300], [556, 402, 150], [610, 404, 70], [1090, 404, 220], [1032, 404, 96], [1150, 404, 360]].map(([x, y, h]) => fir(x, y, h)).join('')}</g>`) });
  }

  // 12. Fireflies (night) / dew motes (dawn): boxes that pulse and drift.
  /** @param {number} n */
  const flies = (n) => {
    let g = '';
    for (let i = 0; i < n; i++) {
      const side = R();
      const x = side < 0.45 ? 40 + R() * 520 : side < 0.8 ? 1080 + R() * 500 : 560 + R() * 520;
      g += `<circle cx="${r0(x)}" cy="${r0(160 + R() * 220)}" r="${r0(11 + R() * 7)}"/>`;
    }
    return g;
  };
  L.push({ name: 'fireflies', cls: 'sc-fly-a', svg: svg('sc-fly-a', `<g fill="url(#${uid}y)">${flies(r0(12 * k))}</g>`), t2: take() });
  if (rich) L.push({ name: 'fireflies', cls: 'sc-fly-b', svg: svg('sc-fly-b', `<g fill="url(#${uid}y)">${flies(10)}</g>`), t2: take() });
  const defs = [...used].sort((a, b) => a - b).map((i) => `<path id="${uid}${i}" d="${firD(0, 0, FIRH[i])}"/>`).join('') + surfDef + glow;
  return { defs, layers: L, loops };
}

/**
 * Service motif foreground on the near shore (x ≈ 560–1060, inside the mobile crop).
 * @param {string} motif service slug @param {(x:number)=>number} fN near-shore height @param {() => number} R
 */
function motifFg(motif, fN, R) {
  const y0 = r0(fN(800));
  if (motif === 'grounds-maintenance') {
    // Mown stripes on a lawn and a clipped hedge line.
    let st = '';
    for (let i = 0; i < 6; i += 2) st += `M${560 - i * 20} ${y0 + 14 + i * 14}H${1060 + i * 20}v7H${560 - i * 20}Z`;
    return `<path class="f-stripe" d="${st}"/><rect class="f-mid s-rim" x="640" y="${y0 - 26}" width="340" height="30" rx="14"/>`;
  }
  if (motif === 'landscape-installation') {
    // Terraces and a flagstone path, blooms (camas dots in art only).
    let fl = '';
    [[810, y0 + 8, 18, 5], [800, y0 + 26, 26, 7], [818, y0 + 50, 34, 9], [796, y0 + 80, 42, 11]].forEach(([x, y, w, h]) => { fl += `M${x - w} ${y}q${r0(w * 0.2)}-${h} ${w}-${h}t${w} ${r0(h * 0.8)}q${-r0(w * 0.2)} ${h}-${w} ${r0(h * 0.9)}t-${w}-${r0(h * 0.7)}z`; });
    const bl = []; for (let i = 0; i < 14; i++) bl.push([620 + R() * 120 + (i % 2) * 300, y0 - 4 + R() * 50]);
    return `<path class="f-mid s-rim" d="M600 ${y0 - 20}H760V${y0 - 6}H600ZM860 ${y0 - 20}H1020V${y0 - 6}H860Z"/><path class="f-stone s-rim" d="${fl}"/><path class="ln s-bloom" d="${dots(bl)}"/>`;
  }
  if (motif === 'irrigation') {
    // Drip line with droplets, two spray arcs, glowing emitters.
    const y = y0 + 20;
    return `<path class="ln s-drip" d="M560 ${y}H1060"/><path class="ln s-spray" d="M660 ${y}C690 ${y - 90} 770 ${y - 110} 830 ${y - 56}M660 ${y}C700 ${y - 60} 780 ${y - 70} 860 ${y - 24}M960 ${y}C930 ${y - 90} 850 ${y - 110} 790 ${y - 56}M960 ${y}C920 ${y - 60} 840 ${y - 70} 760 ${y - 24}"/><path class="ln s-emit" d="M600 ${y}h0m60 0h0m60 0h0m180 0h0m60 0h0m60 0h0"/>`;
  }
  if (motif === 'tree-vegetation') {
    // One lit fir with a clean pruning cut, a tree-ring stump and a chip pile.
    const pile = []; for (let i = 0; i < 12; i++) pile.push([930 + R() * 70, y0 + 4 - R() * 16 * (1 - Math.abs(i - 6) / 8)]);
    return `<path class="f-near s-rim" d="${firD(760, y0 + 4, 170, 0.9)}M716 ${y0 - 70}l-22-6v6l22 4z"/><g class="ln s-rim"><ellipse cx="860" cy="${y0 - 2}" rx="26" ry="8"/><ellipse cx="860" cy="${y0 - 2}" rx="14" ry="4"/></g><path class="ln s-chip" d="${dots(pile)}"/>`;
  }
  return '';
}

/* ---------------------------------------------------------------- vignettes */

/** @typedef {{ w: number, h: number, hz: number, R: () => number, ground: (x:number) => number }} VigCtx */

/**
 * The shared hand for small static art wells: stars, orb, far range, ground; `fg` adds the subject. No ids, no
 * gradients, so any number can share a page. One <svg> sized `w × h` (default 480 × 360), ≤ 1.5 KB raw.
 * @param {string} seed @param {{ w?: number, h?: number, water?: boolean, orbX?: number, fg?: (ctx: VigCtx) => string, cls?: string, ground?: number }} o
 */
function miniScene(seed, o) {
  const w = o.w || 480, h = o.h || 360, R = rng(hash(seed));
  const hz = r0(h * (o.ground ?? 0.52));
  const mx = r0(w * (o.orbX ?? (0.62 + R() * 0.24))), my = r0(h * 0.2), mr = r0(h * 0.045);
  const st = []; for (let i = 0; i < 6; i++) { const x = R() * w, y = R() * hz * 0.7; if (Math.hypot(x - mx, y - my) > mr * 3) st.push([x, y]); }
  const peaks = [];
  for (let i = 0; i <= 8; i++) peaks.push([(i / 8) * w, hz - 6 - R() * h * 0.1 * (i % 2 ? 1 : 0.45)]);
  const ph = R();
  const ground = (/** @type {number} */ x) => hz + h * 0.1 + Math.sin((x / w) * 5 + ph) * h * 0.025;
  /** @type {VigCtx} */
  const ctx = { w, h, hz, R, ground };
  let s = `<svg class="sc-vig${o.cls ? ` ${o.cls}` : ''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice">`
    + `<path class="ln s-st2" d="${dots(st)}"/>`
    + `<circle class="f-halo" cx="${mx}" cy="${my}" r="${r0(mr * 2.4)}"/><circle class="f-moon f-full" cx="${mx}" cy="${my}" r="${mr}"/><path class="f-moon" d="M${mx} ${my - mr}a${mr} ${mr} 0 1 0 0 ${2 * mr}a${r0(mr * 0.8)} ${mr} 0 1 1 0-${2 * mr}z"/>`
    + `<path class="f-far1 s-farrim" d="${poly(peaks)}V${h}H0Z"/>`;
  if (o.water) s += `<path class="f-w1" d="M0 ${hz}H${w}V${h}H0Z"/><path class="ln s-glint" d="M${mx - 20} ${hz + 8}h40m-54 10h60m-46 12h30"/>`;
  const gp = sampleFn(ground, -10, w + 10, 2);
  s += `<path class="f-mid" d="${down(smooth(gp), gp, h + 2)}"/>`;
  s += o.fg ? o.fg(ctx) : '';
  return `${s}</svg>`;
}

/** Firs as one path (no <use>, no ids). @param {number[][]} list [x, y, h] @param {string} cls */
const firGroup = (list, cls) => `<path class="${cls}" d="${list.map(([x, y, h]) => firD(r0(x), r0(y), r0(h))).join('')}"/>`;
/** Fireflies as round-cap dots with a baked glow stroke. @param {number[][]} pts */
const flyDots = (pts) => { const d = dots(pts); return `<path class="ln s-flyg" d="${d}"/><path class="ln s-fly" d="${d}"/>`; };

/**
 * Small static art well. kind: a service slug (motif), `area-<slug>`, or anything else (a generic cove).
 * @param {string} kind @param {string} seed @param {{ w?: number, h?: number }} [o]
 */
export function vignette(kind, seed, o = {}) {
  const svc = SERVICES[kind];
  const area = kind.startsWith('area-') ? AREAS[kind.slice(5)] : undefined;
  return miniScene(`${kind}|${seed}`, {
    ...o, water: area ? area.water !== 'none' : svc ? svc.water !== 'none' : true,
    fg: (c) => {
      const { w, h, R, ground } = c;
      const fy = (/** @type {number} */ x) => ground(x) + 8;
      let fg = firGroup([[w * 0.06, fy(w * 0.06), h * 0.34], [w * 0.15, fy(w * 0.15), h * 0.24], [w * 0.92, fy(w * 0.92), h * 0.38]], 'f-near');
      const cx = r0(w * 0.52), gy = r0(ground(cx));
      if (kind === 'grounds-maintenance') {
        const a = r0(w * 0.22), b = r0(w * 0.6);
        fg += `<path class="f-stripe" d="M${a} ${gy + 12}h${b}v6h-${b}zm0 32h${b}v6h-${b}zm0 32h${b}v6h-${b}z"/><rect class="f-near s-rim" x="${r0(w * 0.3)}" y="${gy - 18}" width="${r0(w * 0.36)}" height="20" rx="9"/>`;
      } else if (kind === 'landscape-installation') {
        let fl = ''; [[0, 8, 12], [-8, 26, 18], [6, 50, 24], [-6, 80, 30]].forEach(([dx, dy, s]) => { fl += `M${cx + dx - s} ${gy + dy}q${r0(s * 0.3)}-${r0(s / 3)} ${s}-${r0(s / 3)}t${s} ${r0(s / 4)}q-${r0(s / 4)} ${r0(s / 3)}-${s} ${r0(s / 3)}z`; });
        const bl = []; for (let i = 0; i < 8; i++) bl.push([w * 0.24 + R() * w * 0.16 + (i % 2) * w * 0.38, gy + R() * 30]);
        fg += `<path class="f-stone s-rim" d="${fl}"/><path class="ln s-bloom" d="${dots(bl)}"/>`;
      } else if (kind === 'irrigation') {
        const y = gy + 24, a = r0(w * 0.3), b = r0(w * 0.72);
        fg += `<path class="ln s-drip" d="M${r0(w * 0.18)} ${y}H${r0(w * 0.86)}"/><path class="ln s-spray" d="M${a} ${y}c20-70 80-80 120-40M${b} ${y}c-20-70-80-80-120-40"/><path class="ln s-emit" d="M${a} ${y}h0M${b} ${y}h0"/>`;
      } else if (kind === 'tree-vegetation') {
        fg += `<path class="f-near s-rim" d="${firD(cx, gy + 6, r0(h * 0.5), 0.9)}"/><g class="ln s-rim"><ellipse cx="${r0(cx + w * 0.2)}" cy="${gy + 8}" rx="18" ry="6"/><ellipse cx="${r0(cx + w * 0.2)}" cy="${gy + 8}" rx="8" ry="3"/></g>`;
      } else if (area?.cue === 'garry-oaks' || area?.cue === 'meadow') {
        fg += `<path class="f-near" d="${oakD(cx - w * 0.12, gy + 4, h * 0.22)}${oakD(cx + w * 0.16, gy + 6, h * 0.17)}"/>`;
      } else if (area?.cue === 'farm-strips' || area?.cue === 'hedgerows') {
        let st = ''; for (let i = 0; i < 4; i++) st += `M${r0(w * 0.2)} ${gy + 14 + i * 18}c${r0(w * 0.2)}-4 ${r0(w * 0.4)} 4 ${r0(w * 0.64)}-2`;
        fg += `<path class="ln s-strip" d="${st}"/>`;
      } else if (area?.cue === 'outcrops') {
        fg += `<path class="f-rock s-farrim" d="M${cx - 60} ${gy + 4}l30-34 40-6 30 30 6 10z"/>`;
      } else if (area?.distant === 'islands') {
        fg += `<path class="f-far1 s-farrim" d="M${cx - 90} ${c.hz + 1}c30-24 80-28 120 0z"/>`;
      } else {
        fg += firGroup([[cx - w * 0.06, gy + 6, h * 0.16], [cx + w * 0.04, gy + 6, h * 0.12]], 'f-near');
      }
      const fl = []; for (let i = 0; i < 4; i++) fl.push([w * (0.1 + R() * 0.8), c.hz + R() * h * 0.36]);
      return fg + flyDots(fl);
    },
  });
}

/** Season → bed colour class (blooms in art only). @param {string} [season] */
const seasonCls = (season) => `sc-${String(season || 'year-round').toLowerCase().replace(/[^a-z]+/g, '-')}`;

/**
 * Per-project art: the lit cottage with a stone path, beds and firs, seeded by slug, beds coloured by season, the
 * service motif in the yard. Static; one <svg>; no ids.
 * @param {{ slug: string, service?: string, season?: string, area?: string }} p @param {{ w?: number, h?: number }} [o]
 */
export function projectVignette(p, o = {}) {
  const seed = `proj|${p.slug}`;
  const R0 = rng(hash(`${seed}|layout`));
  const left = R0() < 0.5;
  return miniScene(seed, {
    ...o, cls: seasonCls(p.season), orbX: left ? 0.7 + R0() * 0.14 : 0.14 + R0() * 0.14, ground: 0.46 + R0() * 0.08, water: AREAS[p.area || '']?.water === 'sea',
    fg: (c) => {
      const { w, h, R, ground } = c;
      const hx = r0(w * (left ? 0.24 + R0() * 0.12 : 0.54 + R0() * 0.12)), gy = r0(ground(hx)), bw = r0(w * (0.17 + R0() * 0.06)), bh = r0(h * 0.15), rf = r0(h * (0.08 + R0() * 0.06));
      const x0 = hx - (bw >> 1), win = r0(bw / 6);
      let s = firGroup([[left ? w * 0.08 : w * 0.92, ground(0) + 8, h * (0.3 + R0() * 0.1)]], 'f-near');
      const fx = left ? w * 0.9 : w * 0.1;
      s += R0() < 0.35 ? `<path class="f-near" d="${oakD(fx, ground(fx) + 6, h * 0.24)}"/>` : firGroup([[fx, ground(fx) + 8, h * 0.4]], 'f-near');
      // Cottage: body, roof and chimney in one path; two lit windows (glow baked as a wide round stroke); door.
      s += `<path class="f-house s-rim" d="M${x0} ${gy}v-${bh}h${bw}v${bh}zm-8-${bh}l${(bw >> 1) + 8}-${rf}l${(bw >> 1) + 8} ${rf}zm${r0(bw * 0.74)}-${r0(rf * 0.5)}v-${r0(rf * 0.55)}h9v${r0(rf * 0.3)}z"/>`;
      s += `<path class="f-win" d="M${x0 + win} ${gy - r0(bh * 0.66)}h${win}v${win}h-${win}zm${bw - 3 * win} 0h${win}v${win}h-${win}z"/><path class="f-door" d="M${hx - 6} ${gy}v-${r0(bh * 0.5)}h12v${r0(bh * 0.5)}z"/>`;
      // Stone path from the door to the viewer, stepping wider with depth.
      let st = '';
      for (let i = 0; i < 3; i++) { const t = (i + 1) / 3, x = hx + (left ? 1 : -1) * t * t * w * 0.14, y = gy + 8 + t * (h - gy) * 0.86, sw = r0(7 + t * 18), sh = r0(2 + t * 6); st += `M${r0(x - sw)} ${r0(y)}q${sw}-${sh} ${2 * sw} 0q-${sw} ${sh}-${2 * sw} 0z`; }
      s += `<path class="f-stone" d="${st}"/>`;
      // Beds either side of the path, in the season's colour.
      const bl = []; for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1; bl.push([hx + side * (bw * 0.6 + R() * w * 0.14), gy + 4 + R() * h * 0.12]); }
      s += `<path class="ln s-bloom" d="${dots(bl)}"/>`;
      // The service, small, in the yard.
      const yx = r0(left ? w * 0.68 : w * 0.24), yy = r0(ground(yx) + h * 0.12);
      if (p.service === 'grounds-maintenance') s += `<path class="f-stripe" d="M${yx - 50} ${yy}h100v5h-100zm-6 12h112v5h-112zm-6 12h124v5h-124z"/>`;
      else if (p.service === 'irrigation') s += `<path class="ln s-spray" d="M${yx} ${yy}c10-40 46-48 70-24M${yx} ${yy}c-10-40-46-48-70-24"/><path class="ln s-emit" d="M${yx} ${yy}h0"/>`;
      else if (p.service === 'tree-vegetation') s += `<g class="ln s-rim"><ellipse cx="${yx}" cy="${yy}" rx="16" ry="5"/><ellipse cx="${yx}" cy="${yy}" rx="7" ry="2"/></g>`;
      else s += `<path class="f-stone s-rim" d="M${yx - 40} ${yy}h34v-8h-34zm44-10h34v-8h-34z"/>`;
      return s + flyDots([[w * 0.1 + R() * w * 0.3, h * 0.6], [w * 0.55 + R() * w * 0.35, h * 0.66]]);
    },
  });
}

/* ------------------------------------------------------------ contour plate */

/**
 * Contour plate: each tile as its outline plus inset rings (contour lines only; schematic, not to scale).
 * @param {Record<string, [string, number, number]>} tiles slug -> [polygon points, label x, label y]
 * @param {{ rings?: number, labels?: Record<string, string>, current?: string }} [o]
 */
export function contourPlate(tiles, o = {}) {
  const rings = o.rings ?? 3;
  let g = '';
  for (const [slug, [pts, lx, ly]] of Object.entries(tiles)) {
    const P = pts.split(' ').map((p) => p.split(',').map(Number));
    const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cy = P.reduce((s, p) => s + p[1], 0) / P.length;
    let d = '';
    for (let k = 0; k <= rings; k++) { const t = 1 - k / (rings + 1); d += `M${P.map(([x, y]) => `${r0(cx + (x - cx) * t)} ${r0(cy + (y - cy) * t)}`).join(' ')}Z`; }
    g += `<path class="s-cont${o.current === slug ? ' is-current' : ''}" pathLength="1" d="${d}"/>`;
    if (o.labels?.[slug]) g += `<text x="${lx}" y="${ly}" text-anchor="middle">${o.labels[slug]}</text>`;
  }
  return `<svg class="sc-plate" viewBox="0 0 540 520" focusable="false" aria-hidden="true"><g fill="none" stroke-width="1.2" data-draw="">${g}</g></svg>`;
}

/* -------------------------------------------------- standalone SVG files */

/** Baked palettes for SVG files (OG cards, <img> fallbacks): DESIGN-DIRECTION §2.4 night and dawn. */
const BAKED = {
  night: { skyTop: '#030A10', skyBottom: '#0D2A28', sun: '#E4EEF2', glow: '#CFE6EE', range: '#1B3746', far: '#13293A', water: ['#0C2A33', '#03110D'], mid: '#0B2820', near: '#04150F', fore: '#010806', glint: '#CDEBF2', glintO: '.5' },
  dawn: { skyTop: '#C9DCE4', skyBottom: '#F8E3CC', sun: '#FFE2AE', glow: '#FFC46E', range: '#AEB8CF', far: '#C4C6D6', water: ['#EBD9CC', '#A8C3C6'], mid: '#7C9A8C', near: '#456B5A', fore: '#21402F', glint: '#FFF4DC', glintO: '.6' },
};
/** Light palettes kept for the pre-redesign file look (theme: 'photo'). */
const PALETTES = {
  morning: { skyTop: '#C9DDE3', skyBottom: '#EEF1E7', sun: '#FBEFC8', glow: '#FFF6DC', range: '#A7BBC3', far: '#86A39E', water: ['#B9CFD3', '#8FAEB2'], mid: '#55806B', near: '#2D5A43', fore: '#163A28', glint: '#fff', glintO: '.42' },
  day: { skyTop: '#BCD6DF', skyBottom: '#E9F0EA', sun: '#FFF7DF', glow: '#FFFFFF', range: '#9FB6BF', far: '#7D9D96', water: ['#A9C7CE', '#7FA2A8'], mid: '#4F7B63', near: '#2A563F', fore: '#133525', glint: '#fff', glintO: '.42' },
  dusk: { skyTop: '#B9BDD6', skyBottom: '#F1DFC9', sun: '#F7D9A8', glow: '#FCE9C9', range: '#9CA0B6', far: '#6F8682', water: ['#C9C5CF', '#8E98A6'], mid: '#456A5A', near: '#25483A', fore: '#10281D', glint: '#fff', glintO: '.42' },
  overcast: { skyTop: '#D3DDDF', skyBottom: '#F0F2EC', sun: '#F6F1E2', glow: '#FFFFFF', range: '#B0BEC1', far: '#8CA39D', water: ['#C3D1D2', '#99B0B2'], mid: '#5C8270', near: '#335C47', fore: '#1A3D2C', glint: '#fff', glintO: '.42' },
};

/** @param {(x:number)=>number} f @param {number} Wd @param {number} n */
const sampleW = (f, Wd, n = 14) => Array.from({ length: n + 1 }, (_, i) => /** @type {[number, number]} */ ([(-0.04 + (i / n) * 1.08) * Wd, f((-0.04 + (i / n) * 1.08) * Wd)]));
/** @param {() => number} rand @param {number} Wd @param {number} base @param {number} amp @param {number} waves */
function ridgeFn(rand, Wd, base, amp, waves = 3) {
  const comps = Array.from({ length: waves }, (_, k) => ({ f: (k + 1) * (0.6 + rand() * 0.9), p: rand() * Math.PI * 2, a: amp / (k + 1.2) }));
  return (/** @type {number} */ x) => base - comps.reduce((s, c) => s + c.a * Math.sin((x / Wd) * Math.PI * 2 * c.f + c.p), 0);
}

/**
 * Standalone landscape SVG file (served at /assets/art/<slot>.svg for slots without art or photo, and used for OG).
 * @param {string} id slot id (seed)
 * @param {string} aspect e.g. "16:9"
 * @param {{ area?: string, theme?: 'night'|'dawn'|'photo' }} [o] theme defaults to 'night' (the site is dark-first)
 * @returns {{ svg: string, width: number, height: number }}
 */
export function landscapeSvg(id, aspect = '16:9', o = {}) {
  const [aw, ah] = String(aspect).split(':').map(Number);
  const Wd = 1600, Hd = Math.round((Wd * (ah || 9)) / (aw || 16));
  const rand = rng(hash(id));
  const areaKey = o.area || (id.startsWith('area-') ? id.slice(5) : '');
  const times = /** @type {(keyof typeof PALETTES)[]} */ (['morning', 'day', 'dusk', 'overcast']);
  const recipe = AREAS[areaKey] || {
    time: times[Math.floor(rand() * times.length)],
    water: /** @type {'sea'|'lake'|'none'} */ (['sea', 'sea', 'lake', 'none'][Math.floor(rand() * 4)]),
    distant: /** @type {'range'|'islands'|'hills'} */ (['range', 'islands', 'hills'][Math.floor(rand() * 3)]),
    trees: 0.4 + rand() * 0.6, horizon: 0.5 + rand() * 0.08, sunX: 0.2 + rand() * 0.6,
  };
  const theme = o.theme || 'night';
  const P = theme === 'photo' ? PALETTES[recipe.time] : BAKED[theme];
  const tall = Hd > Wd;
  const hz = Hd * (tall ? recipe.horizon - 0.08 : recipe.horizon);
  const parts = [];
  const defs = [];
  defs.push(`<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.skyTop}"/><stop offset="1" stop-color="${P.skyBottom}"/></linearGradient>`);
  defs.push(`<radialGradient id="g"><stop offset="0" stop-color="${P.glow}" stop-opacity=".95"/><stop offset=".35" stop-color="${P.glow}" stop-opacity=".35"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient>`);
  defs.push(`<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.water[0]}"/><stop offset="1" stop-color="${P.water[1]}"/></linearGradient>`);
  defs.push('<path id="t" d="M0 -100L-13 -64H-7.5L-20 -33H-12.5L-26 0H26L12.5 -33H20L7.5 -64H13Z"/>');
  parts.push(`<rect width="${Wd}" height="${Hd}" fill="url(#s)"/>`);
  const sunX = Wd * recipe.sunX, sunY = hz - Hd * (0.1 + rand() * 0.08), sunR = Math.min(Wd, Hd) * 0.06;
  parts.push(`<circle cx="${r0(sunX)}" cy="${r0(sunY)}" r="${r0(sunR * 6)}" fill="url(#g)" opacity="${theme === 'night' ? 0.35 : 1}"/>`);
  parts.push(`<circle cx="${r0(sunX)}" cy="${r0(sunY)}" r="${r0(sunR)}" fill="${P.sun}"/>`);
  if (recipe.distant === 'range') {
    const peaks = Array.from({ length: 3 }, () => ({ x: rand(), h: 0.08 + rand() * 0.08, w: 0.05 + rand() * 0.06 }));
    const jag = (/** @type {number} */ base, /** @type {number} */ scale, /** @type {number} */ n, /** @type {number} */ rough) => {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const u = -0.02 + (i / n) * 1.04;
        let hgt = 0.025 + rough * rand();
        for (const pk of peaks) hgt += pk.h * Math.max(0, 1 - Math.abs(u - pk.x) / pk.w) ** 1.6;
        hgt += 0.02 * Math.sin(u * 23 + base);
        pts.push(`${r0(u * Wd)} ${r0(base - Hd * hgt * scale)}`);
      }
      return `M${r0(-0.02 * Wd)} ${r0(base + 2)}L${pts.join('L')}L${r0(1.02 * Wd)} ${r0(base + 2)}Z`;
    };
    parts.push(`<path d="${jag(hz + 1, 1, 44, 0.03)}" fill="${P.range}" opacity=".7"/>`);
    parts.push(`<path d="${jag(hz + 1, 0.42, 30, 0.02)}" fill="${P.range}"/>`);
  } else if (recipe.distant === 'islands') {
    for (let i = 0; i < 4; i++) {
      const unit = Math.min(Wd, Hd * 1.78);
      const cx = Wd * (0.12 + i * 0.24 + rand() * 0.1), w = unit * (0.12 + rand() * 0.14), h = unit * 0.5625 * (0.03 + rand() * 0.035);
      parts.push(`<path d="M${r0(cx - w / 2)} ${r0(hz + 1)}C${r0(cx - w / 4)} ${r0(hz - h * 1.4)} ${r0(cx + w / 5)} ${r0(hz - h * 1.6)} ${r0(cx + w / 2)} ${r0(hz + 1)}Z" fill="${P.far}" opacity=".8"/>`);
    }
  } else {
    const pts = sampleW(ridgeFn(rand, Wd, hz - Hd * 0.05, Hd * 0.05), Wd);
    parts.push(`<path d="${down(smooth(pts), pts, Hd)}" fill="${P.range}" opacity=".8"/>`);
  }
  let landTop = hz;
  if (recipe.water !== 'none') {
    const wTop = recipe.water === 'lake' ? hz + Hd * 0.07 : hz;
    if (recipe.water === 'lake') { const pts = sampleW(ridgeFn(rand, Wd, hz + Hd * 0.02, Hd * 0.03), Wd); parts.push(`<path d="${down(smooth(pts), pts, Hd)}" fill="${P.far}"/>`); }
    parts.push(`<rect y="${r0(wTop)}" width="${Wd}" height="${r0(Hd - wTop)}" fill="url(#w)"/>`);
    const lines = [];
    for (let i = 0; i < 14; i++) {
      const y = wTop + 6 + (i / 14) ** 1.4 * Hd * 0.2;
      const x = sunX + (rand() - 0.5) * Wd * (0.08 + i * 0.03);
      const len = Wd * (0.02 + rand() * 0.06) * (1 + i * 0.08);
      lines.push(`M${r0(x - len / 2)} ${r0(y)}h${r0(len)}`);
    }
    parts.push(`<path d="${lines.join('')}" stroke="${P.glint}" stroke-opacity="${P.glintO}" stroke-width="${Math.max(2, r0(Hd / 400))}" stroke-linecap="round"/>`);
    landTop = wTop + Hd * 0.05;
  }
  /** @param {number} base @param {number} amp @param {string} fill @param {number} treeH @param {number} density */
  const layer = (base, amp, fill, treeH, density) => {
    const f = ridgeFn(rand, Wd, base, amp);
    const pts = sampleW(f, Wd);
    const out = [`<path d="${down(smooth(pts), pts, Hd)}" fill="${fill}"/>`];
    const count = Math.round(density * (Wd / (treeH * 0.42)) * recipe.trees);
    const trees = [];
    for (let i = 0; i < count; i++) {
      const x = rand() * Wd * 1.04 - Wd * 0.02;
      if (Math.sin((x / Wd) * 7.3 + base * 0.01) + Math.sin((x / Wd) * 17 + base) * 0.5 > 0.45) continue;
      const s = (treeH * (0.55 + rand() * 0.6)) / 100;
      trees.push(`<use href="#t" transform="translate(${r0(x)} ${r0(f(x) + treeH * 0.08)}) scale(${s.toFixed(2)})"/>`);
    }
    if (trees.length) out.push(`<g fill="${fill}">${trees.join('')}</g>`);
    return out.join('');
  };
  const span = Hd - landTop;
  parts.push(layer(landTop + span * 0.16, Hd * 0.035, P.mid, Hd * 0.07, 0.55));
  parts.push(layer(landTop + span * 0.42, Hd * 0.05, P.near, Hd * 0.16, 0.42));
  const fp = sampleW(ridgeFn(rand, Wd, landTop + span * 0.74, Hd * 0.05, 2), Wd, 10);
  parts.push(`<path d="${down(smooth(fp), fp, Hd)}" fill="${P.fore}"/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wd} ${Hd}" preserveAspectRatio="xMidYMid slice"><defs>${defs.join('')}</defs>${parts.join('')}</svg>\n`;
  return { svg, width: Wd, height: Hd };
}
