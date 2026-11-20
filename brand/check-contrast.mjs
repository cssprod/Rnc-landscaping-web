// Usage: node check-contrast.mjs  — reads tokens.css and prints WCAG ratios.
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const t = Object.fromEntries([...css.matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map(m => [m[1], m[2]]));
const lum = h => { const c = [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255).map(v => v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
const ratio = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const P = [
 ["ink","bg",4.5],["ink","surface",4.5],["ink","surface-2",4.5],["ink-muted","bg",4.5],["ink-muted","surface",4.5],["ink-muted","surface-2",4.5],
 ["brand","bg",4.5],["brand-ink","brand",4.5],["brand-ink","brand-deep",4.5],["accent-ink","accent",4.5],["accent","bg",4.5],
 ["success","bg",4.5],["error","bg",4.5],["error","surface",4.5],["placeholder","bg",4.5],
 ["line","bg",3],["line","surface",3],["focus","bg",3],["focus","surface-2",3],["brand-ink","accent",3]];
let fail = 0;
console.log("| Foreground | Background | Ratio | Required | Pass |\n|---|---|---|---|---|");
for (const [f,b,req] of P) { const r = ratio(t["color-"+f], t["color-"+b]); if (r < req) fail++;
  console.log(`| ${f} ${t["color-"+f]} | ${b} ${t["color-"+b]} | ${r.toFixed(2)}:1 | ${req}:1 | ${r>=req?"yes":"NO"} |`); }
process.exit(fail ? 1 : 0);
