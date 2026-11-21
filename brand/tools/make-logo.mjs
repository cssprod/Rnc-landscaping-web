// Generates the RNC Landscaping mark (squircle tile) and outlined wordmark lockups.
import opentype from 'opentype.js';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = process.argv[2] || 'out';
mkdirSync(OUT, { recursive: true });

/** Superellipse (n=5) squircle path in a box. */
function squircle(x0, y0, w, h, n = 5, steps = 120) {
  const a = w / 2, b = h / 2, cx = x0 + a, cy = y0 + b;
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const x = cx + a * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = cy + b * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M${pts[0]}L${pts.slice(1).join('L')}Z`;
}
const TILE = squircle(0, 0, 64, 64);
// Glyph: stepped Douglas fir on a mossy outcrop (refined from the original mark)
const FIR = 'M32 9.5 L23 23 H27.2 L18.6 34.6 H23.6 L15.2 45.6 C21 41.8 26.4 40.6 32 40.6 C37.6 40.6 43 41.8 48.8 45.6 L40.4 34.6 H45.4 L36.8 23 H41 Z';
const GROUND = 'M-2 51.5 C8 45.2 19.5 43.2 30 45.6 C40 47.9 46.5 45.3 55 46.8 C59.5 47.6 63 49.6 66 51.8 V66 H-2 Z';

const tileDefs = (id) => `<linearGradient id="${id}-g" x1="12" y1="0" x2="52" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3A7D55"/><stop offset=".55" stop-color="#1D4A33"/><stop offset="1" stop-color="#0B1F15"/></linearGradient>
<radialGradient id="${id}-s" cx="18" cy="6" r="44" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset=".6" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}-h" x1="32" y1="43" x2="32" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7CC596"/><stop offset=".45" stop-color="#3F8A5A"/><stop offset="1" stop-color="#2A6A43"/></linearGradient>
<clipPath id="${id}-c"><path d="${TILE}"/></clipPath>`;
const tileBody = (id, { flat = false } = {}) => `<g clip-path="url(#${id}-c)"><path d="${TILE}" fill="url(#${id}-g)"/>${flat ? '' : `<rect width="64" height="64" fill="url(#${id}-s)"/>`}<path d="${GROUND}" fill="url(#${id}-h)"/><path d="${FIR}" fill="#fff"/></g>${flat ? '' : `<path d="${TILE}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>`}`;

const mark = (id = 'rm') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="RNC Landscaping"><defs>${tileDefs(id)}</defs>${tileBody(id)}</svg>\n`;
const favicon = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${tileDefs('f')}</defs>${tileBody('f', { flat: true })}</svg>\n`;
// Full-bleed square for apple-touch / maskable icons (the OS applies its own mask)
const square = (pad = 0) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="q" x1="12" y1="0" x2="52" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3A7D55"/><stop offset=".55" stop-color="#1D4A33"/><stop offset="1" stop-color="#0B1F15"/></linearGradient></defs><linearGradient id="h" x1="32" y1="43" x2="32" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7CC596"/><stop offset=".45" stop-color="#3F8A5A"/><stop offset="1" stop-color="#2A6A43"/></linearGradient><rect width="64" height="64" fill="url(#q)"/><g transform="translate(32 34) scale(${1 - pad}) translate(-32 -34)"><path d="${GROUND}" fill="url(#h)" transform="translate(0 ${pad * 10})"/><path d="${FIR}" fill="#fff"/></g></svg>\n`;

// Wordmark outlines
const bold = opentype.loadSync('fonts/inter-display-bold.ttf');
const med = opentype.loadSync('fonts/inter-display-medium.ttf');
const SIZE = 30;
function textPath(font, text, x, y, tracking) {
  let d = '', cx = x;
  const glyphs = font.stringToGlyphs(text);
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const p = g.getPath(cx, y, SIZE);
    d += p.toPathData(1);
    let adv = (g.advanceWidth / font.unitsPerEm) * SIZE;
    if (i < glyphs.length - 1) adv += (font.getKerningValue(g, glyphs[i + 1]) / font.unitsPerEm) * SIZE;
    cx += adv + tracking * SIZE;
  }
  return { d, end: cx };
}
const baseline = 43.2;
const r = textPath(bold, 'RNC', 80, baseline, -0.022);
const l = textPath(med, 'Landscaping', r.end + 7.5, baseline, -0.018);
const W = Math.ceil(l.end + 2);
const lockup = (ink, sub, id) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 64" role="img" aria-label="RNC Landscaping"><defs>${tileDefs(id)}</defs><g transform="translate(4 4) scale(.875)">${tileBody(id)}</g><path d="${r.d}" fill="${ink}"/><path d="${l.d}" fill="${sub}"/></svg>\n`;
writeFileSync(`${OUT}/logo.svg`, lockup('#0E1611', '#0E1611', 'rl'));
writeFileSync(`${OUT}/logo-reversed.svg`, lockup('#FFFFFF', '#FFFFFF', 'rr'));
writeFileSync(`${OUT}/logo-mark.svg`, mark());
writeFileSync(`${OUT}/favicon.svg`, favicon());
writeFileSync(`${OUT}/icon-square.svg`, square(0));
writeFileSync(`${OUT}/icon-maskable.svg`, square(0.22));
// Symbol data for the inline sprite (wordmark uses currentColor)
writeFileSync(`${OUT}/wordmark.json`, JSON.stringify({ width: W, rnc: r.d, landscaping: l.d, tile: TILE, fir: FIR, ground: GROUND }, null, 1));
console.log('lockup width', W);
