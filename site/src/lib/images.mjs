// @ts-check
/**
 * Image slots from media/images.json. Stock slots render responsive <img>
 * via the provider CDN; null-stock slots (or --offline-images) render an
 * inline SVG placeholder in token colours with the slot purpose.
 * (Astro port: becomes components/Picture.astro.)
 */
import { html, raw, esc } from './html.mjs';
import { site } from '../../site.config.mjs';

/** @type {Map<string, any>} */
let slots = new Map();
let offline = false;

/** @param {any[]} list @param {{offline:boolean}} opts */
export function initImages(list, opts) {
  slots = new Map(list.map((s) => [s.id, s]));
  offline = opts.offline;
}

/** @param {string} aspect */
export function ratio(aspect = '3:2') {
  const [w, h] = String(aspect).split(':').map(Number);
  return w && h ? [w, h] : [3, 2];
}

/** @param {string} url @param {number} w */
function sized(url, w) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('unsplash.com')) {
      u.searchParams.set('w', String(w)); u.searchParams.set('q', '70');
      u.searchParams.set('auto', 'format'); u.searchParams.set('fit', 'crop');
      return u.toString();
    }
    if (u.hostname.includes('pexels.com')) {
      u.searchParams.set('auto', 'compress'); u.searchParams.set('cs', 'tinysrgb'); u.searchParams.set('w', String(w));
      return u.toString();
    }
  } catch { /* fall through */ }
  return url;
}

/** @param {string} id */
export const getSlot = (id) => slots.get(id);

/** Absolute URL for OG tags, or null. @param {string} id */
export function ogUrl(id) {
  const s = slots.get(id);
  return s?.stock?.imageUrl ? sized(s.stock.imageUrl, 1200) : null;
}

/** Deterministic number from a string. @param {string} s */
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

/**
 * Topographic placeholder: contour rings in token colours + purpose label.
 * @param {string} id @param {any} slot @param {number} W @param {number} H
 */
function placeholderSvg(id, slot, W, H) {
  const h = hash(id);
  const cx = W * (0.3 + ((h % 40) / 100));
  const cy = H * (0.35 + (((h >> 8) % 30) / 100));
  const rings = [];
  for (let i = 1; i <= 9; i++) {
    const rx = (W / 9) * i * 0.9, ry = (H / 9) * i * 0.75;
    const wob = ((h >> i) % 7) - 3;
    rings.push(`<ellipse cx="${cx + wob * i}" cy="${cy - wob}" rx="${rx}" ry="${ry}" transform="rotate(${(h % 30) - 15} ${cx} ${cy})"/>`);
  }
  const purpose = slot?.purpose || slot?.alt || 'Photo to come';
  const label = slot?.rncToSupply ? 'Photo to be supplied by RNC' : 'Photo placeholder';
  const alt = slot?.alt || purpose;
  return html`<svg class="ph-img" viewBox="0 0 ${W} ${H}" role="img" aria-label="${alt}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" class="ph-img__bg"/>
<g class="ph-img__lines" fill="none">${raw(rings.join(''))}</g>
</svg><span class="ph-img__text" aria-hidden="true"><span class="ph-img__label">${label}</span><span class="ph-img__purpose">${purpose.length > 90 ? purpose.slice(0, 87) + '…' : purpose}</span></span>`;
}

/**
 * @param {string} id slot id
 * @param {{ sizes?: string, eager?: boolean, className?: string, sample?: boolean, credit?: boolean, alt?: string }} [o]
 */
export function picture(id, o = {}) {
  const slot = slots.get(id);
  const [rw, rh] = ratio(slot?.aspect);
  const W = 1600, H = Math.round((1600 * rh) / rw);
  const cls = `media ${o.className || ''}`.trim();
  const sampleTag = o.sample && slot?.stock?.imageUrl && !offline ? html`<span class="media__tag">Sample image</span>` : '';
  const style = raw(`aspect-ratio:${rw}/${rh}`);
  if (!slot || !slot.stock?.imageUrl || offline) {
    return html`<figure class="${cls}" style="${style}" data-slot="${id}">${placeholderSvg(id, slot, W, H)}${sampleTag}</figure>`;
  }
  const st = slot.stock;
  const srcset = site.imageWidths.map((w) => `${sized(st.imageUrl, w)} ${w}w`).join(', ');
  const credit = o.credit !== false && st.photographer
    ? html`<figcaption class="media__credit">Photo: ${st.photographerUrl ? html`<a href="${st.photographerUrl}" rel="noopener">${st.photographer}</a>` : st.photographer} / ${st.provider || 'Stock'}</figcaption>`
    : '';
  return html`<figure class="${cls}" style="${style}" data-slot="${id}"><img src="${sized(st.imageUrl, 1200)}" srcset="${srcset}" sizes="${o.sizes || '100vw'}" width="${W}" height="${H}" alt="${o.alt ?? slot.alt ?? ''}" ${o.eager ? raw('fetchpriority="high" loading="eager"') : raw('loading="lazy"')} decoding="async">${sampleTag}${credit}</figure>`;
}

export { esc };

/** True when the slot currently shows a stock photo (needs "Sample image" in portfolio contexts). @param {string} id */
export const isStock = (id) => !offline && !!slots.get(id)?.stock?.imageUrl;
