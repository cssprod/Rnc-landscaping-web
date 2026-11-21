// @ts-check
/**
 * Generative landscape illustrations for image slots that have no photo yet.
 * Each slot gets a deterministic coastal scene (sky, low sun, Olympic-style
 * ranges or Gulf Islands, water, rolling ridges with stepped Douglas firs) in
 * the brand palette. Area slots use a hand-set recipe so every municipality
 * reads differently. Output is a standalone SVG file written by build.mjs to
 * /assets/art/<slot>.svg and shown through a normal <img>.
 */

/** @param {string} s */
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
/** mulberry32 PRNG @param {number} seed */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Light palettes, kept cool and slightly desaturated (see brand photography notes). */
const PALETTES = {
  morning: { skyTop: '#C9DDE3', skyBottom: '#EEF1E7', sun: '#FBEFC8', glow: '#FFF6DC', range: '#A7BBC3', far: '#86A39E', water: ['#B9CFD3', '#8FAEB2'], mid: '#55806B', near: '#2D5A43', fore: '#163A28' },
  day: { skyTop: '#BCD6DF', skyBottom: '#E9F0EA', sun: '#FFF7DF', glow: '#FFFFFF', range: '#9FB6BF', far: '#7D9D96', water: ['#A9C7CE', '#7FA2A8'], mid: '#4F7B63', near: '#2A563F', fore: '#133525' },
  dusk: { skyTop: '#B9BDD6', skyBottom: '#F1DFC9', sun: '#F7D9A8', glow: '#FCE9C9', range: '#9CA0B6', far: '#6F8682', water: ['#C9C5CF', '#8E98A6'], mid: '#456A5A', near: '#25483A', fore: '#10281D' },
  overcast: { skyTop: '#D3DDDF', skyBottom: '#F0F2EC', sun: '#F6F1E2', glow: '#FFFFFF', range: '#B0BEC1', far: '#8CA39D', water: ['#C3D1D2', '#99B0B2'], mid: '#5C8270', near: '#335C47', fore: '#1A3D2C' },
};

/**
 * Per-area recipes. water: sea | lake | none. distant: range (Olympic Mountains across the strait), islands (Gulf Islands), hills.
 * @type {Record<string, { time: keyof typeof PALETTES, water: 'sea'|'lake'|'none', distant: 'range'|'islands'|'hills', trees: number, horizon: number, sunX: number }>}
 */
const AREAS = {
  victoria: { time: 'morning', water: 'sea', distant: 'range', trees: 0.6, horizon: 0.56, sunX: 0.72 },
  saanich: { time: 'day', water: 'lake', distant: 'hills', trees: 0.8, horizon: 0.5, sunX: 0.3 },
  'oak-bay': { time: 'dusk', water: 'sea', distant: 'range', trees: 0.45, horizon: 0.58, sunX: 0.62 },
  esquimalt: { time: 'overcast', water: 'sea', distant: 'range', trees: 0.55, horizon: 0.55, sunX: 0.25 },
  langford: { time: 'day', water: 'lake', distant: 'hills', trees: 1, horizon: 0.48, sunX: 0.78 },
  colwood: { time: 'dusk', water: 'sea', distant: 'range', trees: 0.7, horizon: 0.57, sunX: 0.35 },
  'view-royal': { time: 'morning', water: 'sea', distant: 'hills', trees: 0.8, horizon: 0.54, sunX: 0.68 },
  sooke: { time: 'dusk', water: 'sea', distant: 'range', trees: 1, horizon: 0.55, sunX: 0.8 },
  'central-saanich': { time: 'day', water: 'none', distant: 'hills', trees: 0.35, horizon: 0.52, sunX: 0.4 },
  'north-saanich': { time: 'day', water: 'sea', distant: 'islands', trees: 0.6, horizon: 0.56, sunX: 0.58 },
  sidney: { time: 'morning', water: 'sea', distant: 'islands', trees: 0.4, horizon: 0.58, sunX: 0.3 },
  highlands: { time: 'overcast', water: 'lake', distant: 'hills', trees: 1, horizon: 0.44, sunX: 0.6 },
  metchosin: { time: 'dusk', water: 'sea', distant: 'range', trees: 0.75, horizon: 0.56, sunX: 0.5 },
};

/** @param {number} n */
const r0 = (n) => Math.round(n);

/**
 * Smooth closed ridge: Catmull-Rom through points, then down to the bottom edge.
 * @param {[number, number][]} pts @param {number} H
 */
function ridgePath(pts, H) {
  let d = `M${r0(pts[0][0])} ${r0(H)}L${r0(pts[0][0])} ${r0(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r0(c1[0])} ${r0(c1[1])} ${r0(c2[0])} ${r0(c2[1])} ${r0(p2[0])} ${r0(p2[1])}`;
  }
  return `${d}L${r0(pts[pts.length - 1][0])} ${r0(H)}Z`;
}

/**
 * Ridge height function from a few seeded sines.
 * @param {() => number} rand @param {number} W @param {number} base @param {number} amp @param {number} waves
 */
function ridgeFn(rand, W, base, amp, waves = 3) {
  const comps = Array.from({ length: waves }, (_, k) => ({ f: (k + 1) * (0.6 + rand() * 0.9), p: rand() * Math.PI * 2, a: amp / (k + 1.2) }));
  return (/** @type {number} */ x) => base - comps.reduce((s, c) => s + c.a * Math.sin((x / W) * Math.PI * 2 * c.f + c.p), 0);
}

/** @param {(x:number)=>number} f @param {number} W @param {number} n */
const sample = (f, W, n = 14) => Array.from({ length: n + 1 }, (_, i) => /** @type {[number, number]} */ ([(-0.04 + (i / n) * 1.08) * W, f((-0.04 + (i / n) * 1.08) * W)]));

/**
 * @param {string} id slot id (seed)
 * @param {string} aspect e.g. "16:9"
 * @param {{ area?: string }} [o]
 * @returns {{ svg: string, width: number, height: number }}
 */
export function landscapeSvg(id, aspect = '16:9', o = {}) {
  const [aw, ah] = String(aspect).split(':').map(Number);
  const W = 1600, H = Math.round((W * (ah || 9)) / (aw || 16));
  const rand = rng(hash(id));
  const areaKey = o.area || (id.startsWith('area-') ? id.slice(5) : '');
  const times = /** @type {(keyof typeof PALETTES)[]} */ (['morning', 'day', 'dusk', 'overcast']);
  const recipe = AREAS[areaKey] || {
    time: times[Math.floor(rand() * times.length)],
    water: /** @type {'sea'|'lake'|'none'} */ (['sea', 'sea', 'lake', 'none'][Math.floor(rand() * 4)]),
    distant: /** @type {'range'|'islands'|'hills'} */ (['range', 'islands', 'hills'][Math.floor(rand() * 3)]),
    trees: 0.4 + rand() * 0.6, horizon: 0.5 + rand() * 0.08, sunX: 0.2 + rand() * 0.6,
  };
  const P = PALETTES[recipe.time];
  // Tall frames (portraits) push the horizon up so the ground fills the lower half.
  const tall = H > W;
  const hz = H * (tall ? recipe.horizon - 0.08 : recipe.horizon);
  const parts = [];
  const defs = [];

  defs.push(`<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.skyTop}"/><stop offset="1" stop-color="${P.skyBottom}"/></linearGradient>`);
  defs.push(`<radialGradient id="g"><stop offset="0" stop-color="${P.glow}" stop-opacity=".95"/><stop offset=".35" stop-color="${P.glow}" stop-opacity=".35"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient>`);
  defs.push(`<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.water[0]}"/><stop offset="1" stop-color="${P.water[1]}"/></linearGradient>`);
  defs.push(`<linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  // One stepped Douglas fir (unit height 100), echoing the logo mark.
  defs.push('<path id="t" d="M0 -100L-13 -64H-7.5L-20 -33H-12.5L-26 0H26L12.5 -33H20L7.5 -64H13Z"/>');

  parts.push(`<rect width="${W}" height="${H}" fill="url(#s)"/>`);
  const sunX = W * recipe.sunX, sunY = hz - H * (0.1 + rand() * 0.08), sunR = Math.min(W, H) * 0.06;
  parts.push(`<circle cx="${r0(sunX)}" cy="${r0(sunY)}" r="${r0(sunR * 6)}" fill="url(#g)"/>`);
  parts.push(`<circle cx="${r0(sunX)}" cy="${r0(sunY)}" r="${r0(sunR)}" fill="${P.sun}"/>`);

  // Distant layer
  if (recipe.distant === 'range') {
    // Two jagged ranges: a pale far range with a few prominent peaks, then lower foothills.
    const peaks = Array.from({ length: 3 }, () => ({ x: rand(), h: 0.08 + rand() * 0.08, w: 0.05 + rand() * 0.06 }));
    const jag = (/** @type {number} */ base, /** @type {number} */ scale, /** @type {number} */ n, /** @type {number} */ rough) => {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const u = -0.02 + (i / n) * 1.04;
        let hgt = 0.025 + rough * rand();
        for (const pk of peaks) hgt += pk.h * Math.max(0, 1 - Math.abs(u - pk.x) / pk.w) ** 1.6;
        hgt += 0.02 * Math.sin(u * 23 + base);
        pts.push(`${r0(u * W)} ${r0(base - H * hgt * scale)}`);
      }
      return `M${r0(-0.02 * W)} ${r0(base + 2)}L${pts.join('L')}L${r0(1.02 * W)} ${r0(base + 2)}Z`;
    };
    parts.push(`<path d="${jag(hz + 1, 1, 44, 0.03)}" fill="${P.range}" opacity=".7"/>`);
    parts.push(`<path d="${jag(hz + 1, 0.42, 30, 0.02)}" fill="${P.range}"/>`);
  } else if (recipe.distant === 'islands') {
    for (let i = 0; i < 4; i++) {
      const unit = Math.min(W, H * 1.78);
      const cx = W * (0.12 + i * 0.24 + rand() * 0.1), w = unit * (0.12 + rand() * 0.14), h = unit * 0.5625 * (0.03 + rand() * 0.035);
      parts.push(`<path d="M${r0(cx - w / 2)} ${r0(hz + 1)}C${r0(cx - w / 4)} ${r0(hz - h * 1.4)} ${r0(cx + w / 5)} ${r0(hz - h * 1.6)} ${r0(cx + w / 2)} ${r0(hz + 1)}Z" fill="${P.far}" opacity=".8"/>`);
    }
  } else {
    parts.push(`<path d="${ridgePath(sample(ridgeFn(rand, W, hz - H * 0.05, H * 0.05), W), H)}" fill="${P.range}" opacity=".8"/>`);
  }

  // Water band with shimmer
  let landTop = hz;
  if (recipe.water !== 'none') {
    const wTop = recipe.water === 'lake' ? hz + H * 0.07 : hz;
    if (recipe.water === 'lake') parts.push(`<path d="${ridgePath(sample(ridgeFn(rand, W, hz + H * 0.02, H * 0.03), W), H)}" fill="${P.far}"/>`);
    parts.push(`<rect y="${r0(wTop)}" width="${W}" height="${r0(H - wTop)}" fill="url(#w)"/>`);
    const lines = [];
    for (let i = 0; i < 14; i++) {
      const y = wTop + 6 + (i / 14) ** 1.4 * H * 0.2;
      const x = sunX + (rand() - 0.5) * W * (0.08 + i * 0.03);
      const len = W * (0.02 + rand() * 0.06) * (1 + i * 0.08);
      lines.push(`M${r0(x - len / 2)} ${r0(y)}h${r0(len)}`);
    }
    parts.push(`<path d="${lines.join('')}" stroke="#fff" stroke-opacity=".42" stroke-width="${Math.max(2, r0(H / 400))}" stroke-linecap="round"/>`);
    landTop = wTop + H * 0.05;
  }

  /**
   * Ridge with firs standing on it.
   * @param {number} base @param {number} amp @param {string} fill @param {number} treeH @param {number} density
   */
  const layer = (base, amp, fill, treeH, density) => {
    const f = ridgeFn(rand, W, base, amp);
    const out = [`<path d="${ridgePath(sample(f, W), H)}" fill="${fill}"/>`];
    const count = Math.round(density * (W / (treeH * 0.42)) * recipe.trees);
    const trees = [];
    for (let i = 0; i < count; i++) {
      // Cluster trees: skip a stretch now and then so ridges read as clearings and groves.
      const x = rand() * W * 1.04 - W * 0.02;
      if (Math.sin((x / W) * 7.3 + base * 0.01) + Math.sin((x / W) * 17 + base) * 0.5 > 0.45) continue;
      const s = (treeH * (0.55 + rand() * 0.6)) / 100;
      trees.push(`<use href="#t" transform="translate(${r0(x)} ${r0(f(x) + treeH * 0.08)}) scale(${s.toFixed(2)})"/>`);
    }
    if (trees.length) out.push(`<g fill="${fill}">${trees.join('')}</g>`);
    return out.join('');
  };
  const span = H - landTop;
  parts.push(layer(landTop + span * 0.16, H * 0.035, P.mid, H * 0.07, 0.55));
  parts.push(layer(landTop + span * 0.42, H * 0.05, P.near, H * 0.16, 0.42));
  parts.push(`<path d="${ridgePath(sample(ridgeFn(rand, W, landTop + span * 0.74, H * 0.05, 2), W, 10), H)}" fill="${P.fore}"/>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#h)"/>`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs.join('')}</defs>${parts.join('')}</svg>\n`;
  return { svg, width: W, height: H };
}
