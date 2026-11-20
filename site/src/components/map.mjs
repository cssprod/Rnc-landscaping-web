// @ts-check
/**
 * Schematic service-area map: hand-drawn tiles approximating the relative
 * positions of the 13 municipalities (not to scale, not survey data).
 * Each tile is a link; a plain list of the same links sits beside it.
 */
import { html, raw } from '../lib/html.mjs';
import { site } from '../../site.config.mjs';

/** slug -> [polygon points, label x, label y] */
const TILES = {
  'north-saanich': ['372,18 440,8 462,40 450,92 500,118 470,150 408,150 360,128 350,70', 400, 90],
  sidney: ['462,40 512,30 528,78 500,118 450,92', 490, 72],
  'central-saanich': ['360,128 408,150 470,150 478,200 456,246 380,250 340,214 336,160', 406, 202],
  highlands: ['224,182 300,168 336,160 340,214 330,262 300,292 240,288 212,236', 272, 232],
  saanich: ['330,262 340,214 380,250 456,246 498,262 512,320 484,364 430,372 372,366 336,334', 424, 312],
  'view-royal': ['300,292 330,262 336,334 340,362 302,366 284,334', 312, 330],
  langford: ['168,300 240,288 300,292 284,334 302,366 270,394 202,394 170,350', 230, 346],
  colwood: ['202,394 270,394 302,366 316,404 296,448 240,452', 262, 420],
  metchosin: ['108,406 170,350 202,394 240,452 214,500 138,504 96,466', 162, 446],
  sooke: ['10,352 92,330 168,300 170,350 108,406 96,466 40,470 8,420', 74, 404],
  esquimalt: ['340,362 372,366 392,380 388,424 350,432 330,404', 360, 402],
  victoria: ['372,366 430,372 460,384 456,440 412,452 388,424 392,380', 424, 414],
  'oak-bay': ['430,372 484,364 520,384 528,438 488,452 456,440 460,384', 492, 412],
};

/** @param {any} data @param {{ current?: string, heading?: string, lede?: string }} [o] */
export function areaMap(data, o = {}) {
  const name = (/** @type {string} */ a) => data.areas[a]?.name || a;
  const tiles = site.areas.map((a) => {
    const t = /** @type {[string, number, number]} */ (TILES[/** @type {keyof typeof TILES} */ (a)]);
    const cur = o.current === a;
    return html`<a href="/areas/${a}/" class="map__tile${cur ? ' is-current' : ''}" aria-label="${name(a)}${cur ? ' (this page)' : ''}"${cur ? raw(' aria-current="page"') : ''}>
      <polygon points="${t[0]}"/><text x="${t[1]}" y="${t[2]}" text-anchor="middle">${name(a)}</text></a>`;
  });
  return html`<section class="area-map wrap" aria-labelledby="map-h">
  <div class="area-map__text">
    <h2 id="map-h">${o.heading || 'Where we work'}</h2>
    <p>${o.lede || 'Thirteen municipalities across the Capital Region, from the Saanich Peninsula to the Sooke Hills. Choose an area to see local notes and projects.'}</p>
    <ul class="area-map__list">${site.areas.map((a) => html`<li><a href="/areas/${a}/"${o.current === a ? raw(' aria-current="page"') : ''}>${name(a)}</a></li>`)}</ul>
  </div>
  <div class="area-map__figure">
    <svg class="map" viewBox="0 0 540 520" role="group" aria-labelledby="map-title" xmlns="http://www.w3.org/2000/svg">
      <title id="map-title">Schematic map of the 13 Greater Victoria service areas</title>
      <path class="map__sea" d="M0 0H540V520H0Z"/>
      <g class="map__contours" aria-hidden="true" fill="none">${[0, 1, 2, 3, 4].map((i) => raw(`<path d="M${-20 + i * 6} ${470 - i * 24} C ${120 + i * 10} ${520 - i * 30}, ${260} ${480 - i * 28}, ${560} ${500 - i * 30}"/>`))}</g>
      ${tiles}
      <text class="map__water" x="150" y="512" aria-hidden="true">Juan de Fuca Strait</text>
      <text class="map__water" x="520" y="200" aria-hidden="true" transform="rotate(90 520 200)">Haro Strait</text>
    </svg>
    <p class="area-map__note">Schematic only, not to scale.</p>
  </div>
</section>`;
}
