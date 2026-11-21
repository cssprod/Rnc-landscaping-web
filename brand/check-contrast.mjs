#!/usr/bin/env node
// Usage: node brand/check-contrast.mjs — reads tokens.json and prints WCAG ratios for light and dark appearances.
import { readFileSync } from 'node:fs';
const t = JSON.parse(readFileSync(new URL('./tokens.json', import.meta.url), 'utf8')).color;
const val = (k, mode) => { const n = t[k]; const v = mode === 'dark' ? (n.$extensions?.['ca.rnc.dark'] ?? n.$value) : n.$value; return /^\{color\.(.+)\}$/.test(v) ? val(v.slice(7, -1), mode) : v; };
const rgb = (s) => s.startsWith('#') ? [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)) : s.match(/[\d.]+/g).slice(0, 3).map(Number);
const alpha = (s) => (s.startsWith('rgba') ? Number(s.match(/[\d.]+/g)[3]) : 1);
const over = (fg, bg) => { const a = alpha(fg), f = rgb(fg), b = rgb(bg); return f.map((c, i) => Math.round(c * a + b[i] * (1 - a))); };
const lum = (c) => { const l = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
const ratio = (fg, bg) => { const [x, y] = [lum(over(fg, bg)), lum(rgb(bg))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const P = [
  ['ink', 'bg', 4.5], ['ink', 'bg-elevated', 4.5], ['ink', 'bg-grouped', 4.5], ['ink', 'bg-tint', 4.5],
  ['ink-2', 'bg', 4.5], ['ink-2', 'bg-elevated', 4.5], ['ink-2', 'bg-grouped', 4.5],
  ['ink-3', 'bg', 4.5], ['ink-3', 'bg-elevated', 4.5], ['ink-3', 'bg-grouped', 4.5],
  ['brand', 'bg', 4.5], ['brand', 'bg-elevated', 4.5], ['brand', 'bg-tint', 4.5], ['brand-ink', 'brand', 4.5], ['brand-2', 'bg-elevated', 3],
  ['on-deep', 'deep', 4.5], ['on-deep-2', 'deep', 4.5], ['focus', 'bg', 3], ['focus', 'bg-elevated', 3], ['focus-on-deep', 'deep', 3],
  ['placeholder', 'placeholder-bg', 4.5], ['success', 'bg', 4.5], ['error', 'bg', 4.5], ['error', 'bg-elevated', 4.5],
  ['line-strong', 'bg', 3], ['line-strong', 'bg-elevated', 3],
];
let fail = 0;
for (const mode of ['light', 'dark']) {
  console.log(`\n${mode}\n| Foreground | Background | Ratio | Required | Pass |\n|---|---|---|---|---|`);
  for (const [f, b, req] of P) {
    const bg = val(b, mode);
    const base = alpha(bg) < 1 ? `rgb(${over(bg, val('bg-elevated', mode)).join(',')})` : bg;
    const r = ratio(val(f, mode), base.startsWith('rgb(') ? `#${base.match(/\d+/g).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}` : base);
    if (r < req) fail++;
    console.log(`| ${f} | ${b} | ${r.toFixed(2)}:1 | ${req}:1 | ${r >= req ? 'yes' : 'NO'} |`);
  }
}
process.exit(fail ? 1 : 0);
