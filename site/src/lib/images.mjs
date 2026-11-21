// @ts-check
/**
 * Image slots from media/images.json. Slots with a stock photo render a
 * responsive <img> from the provider CDN. Slots without one (or every slot
 * with --offline-images) render a generated landscape illustration from
 * /assets/art/<slot>.svg, labelled so nobody mistakes it for a photo.
 */
import { html, raw } from './html.mjs';
import { site } from '../../site.config.mjs';
import { landscapeSvg } from './art.mjs';

/** @type {Map<string, any>} */
let slots = new Map();
let offline = false;
/** Illustrations referenced by rendered pages: slot id -> aspect. @type {Map<string, string>} */
export const artNeeded = new Map();

/** @param {any[]} list @param {{offline:boolean}} opts */
export function initImages(list, opts) {
  slots = new Map(list.map((s) => [s.id, s]));
  offline = opts.offline;
  artNeeded.clear();
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
      u.searchParams.set('w', String(w)); u.searchParams.set('q', '72');
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

/** True when the slot shows a real (stock) photo in this build. @param {string} id */
export const hasPhoto = (id) => !offline && !!slots.get(id)?.stock?.imageUrl;

/** Stock photos must carry "Sample image" in portfolio contexts. */
export const isStock = hasPhoto;

/** Absolute URL for OG tags, or null. @param {string} id */
export function ogUrl(id) {
  const s = slots.get(id);
  return s?.stock?.imageUrl ? sized(s.stock.imageUrl, 1200) : null;
}

/** Write every referenced illustration. @returns {{ id: string, svg: string }[]} */
export function renderArt() {
  return [...artNeeded].map(([id, aspect]) => ({ id, svg: landscapeSvg(id, aspect).svg }));
}

/**
 * @param {string} id slot id
 * @param {{ sizes?: string, eager?: boolean, className?: string, sample?: boolean, credit?: boolean, alt?: string, aspect?: string, chip?: boolean }} [o]
 */
export function picture(id, o = {}) {
  const slot = slots.get(id);
  const aspect = o.aspect || slot?.aspect || '3:2';
  const [rw, rh] = ratio(aspect);
  const W = 1600, H = Math.round((1600 * rh) / rw);
  const style = raw(`aspect-ratio:${rw}/${rh}`);
  const load = o.eager ? raw('fetchpriority="high" loading="eager"') : raw('loading="lazy"');
  if (!hasPhoto(id)) {
    artNeeded.set(id, `${rw}:${rh}`);
    const label = slot?.rncToSupply ? 'Photo to come' : 'Illustration';
    return html`<figure class="media media--art ${o.className || ''}" style="${style}" data-slot="${id}"><img src="/assets/art/${id}.svg" width="${W}" height="${H}" alt="" ${load} decoding="async">${o.chip === false ? '' : html`<span class="media__chip" aria-hidden="true">${label}</span>`}</figure>`;
  }
  const st = slot.stock;
  const srcset = site.imageWidths.map((w) => `${sized(st.imageUrl, w)} ${w}w`).join(', ');
  const sampleTag = o.sample ? html`<span class="media__chip media__chip--sample">Sample image</span>` : '';
  const credit = o.credit !== false && st.photographer
    ? html`<figcaption class="media__credit">Photo: ${st.photographerUrl ? html`<a href="${st.photographerUrl}" rel="noopener">${st.photographer}</a>` : st.photographer} / ${st.provider || 'Stock'}</figcaption>`
    : '';
  return html`<figure class="media ${o.className || ''}" style="${style}" data-slot="${id}"><img src="${sized(st.imageUrl, 1200)}" srcset="${srcset}" sizes="${o.sizes || '100vw'}" width="${W}" height="${H}" alt="${o.alt ?? slot.alt ?? ''}" ${load} decoding="async">${sampleTag}${credit}</figure>`;
}
