// @ts-check
/**
 * Image slots from media/images.json (CONTRACT §7). picture() renders, in order of preference:
 *   1. RNC's own photo, processed by tools/process-images.mjs (media/photos.json manifest): a <picture> with AVIF,
 *      WebP and JPEG sources at 480/768/1024/1600, explicit width/height, hand-written alt;
 *   2. a stock placeholder (online showcase builds only; never under /projects/, where every slot has stock: null);
 *   3. living art for a slot that has `art` (components/living.mjs): projectArt() for `project:<slug>` scenes, the
 *      layered livingScene() for an eager hero, a static art well otherwise. Labelled with the "Illustration" chip;
 *   4. a labelled standalone illustration file (/assets/art/<slot>.svg) for any other slot, unknown ids included.
 * Heroes (eager) get fetchpriority="high" and are never lazy; everything else is loading="lazy" decoding="async".
 */
import { readFileSync, existsSync } from 'node:fs';
import { html, raw } from './html.mjs';
import { site } from '../../site.config.mjs';
import { landscapeSvg } from './art.mjs';
import { livingScene, projectArt } from '../components/living.mjs';

/** Local photo widths (CONTRACT §7). */
export const PHOTO_WIDTHS = [480, 768, 1024, 1600];
const MEDIA = new URL('../../../media/', import.meta.url);
const CONTENT = new URL('../../../content/', import.meta.url);

/** @type {Map<string, any>} */
let slots = new Map();
/** @type {Map<string, any>} */
let photos = new Map();
let offline = false;
/** Illustrations referenced by rendered pages: slot id -> aspect. @type {Map<string, string>} */
export const artNeeded = new Map();

/** Read the processed-photo manifest (media/photos.json). Missing or empty means no local photos yet. */
export function loadPhotos() {
  const f = new URL('photos.json', MEDIA);
  if (!existsSync(f)) return new Map();
  const m = JSON.parse(readFileSync(f, 'utf8'));
  return new Map((m.photos || []).map((/** @type {any} */ p) => [p.slot, p]));
}

/** @param {any[]} list @param {{ offline: boolean, photos?: any[] }} opts */
export function initImages(list, opts) {
  slots = new Map(list.map((s) => [s.id, s]));
  offline = opts.offline;
  photos = opts.photos ? new Map(opts.photos.map((p) => [p.slot, p])) : loadPhotos();
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

/** The processed local photo for a slot, or undefined. @param {string} id */
export const getPhoto = (id) => photos.get(id);

/** True when the slot shows a stock photo in this build (never when RNC's own photo exists). @param {string} id */
export const isStock = (id) => !photos.has(id) && !offline && !!slots.get(id)?.stock?.imageUrl;

/** True when the slot shows a real photo (RNC's own or stock) in this build. @param {string} id */
export const hasPhoto = (id) => photos.has(id) || isStock(id);

/** Absolute URL for OG tags, or null. @param {string} id */
export function ogUrl(id) {
  const s = slots.get(id);
  return s?.stock?.imageUrl ? sized(s.stock.imageUrl, 1200) : null;
}

/** Write every referenced illustration file. @returns {{ id: string, svg: string }[]} */
export function renderArt() {
  return [...artNeeded].map(([id, aspect]) => ({ id, svg: landscapeSvg(id, aspect).svg }));
}

/** @type {Map<string, any>} */
const projectCache = new Map();
/** The project behind a `project:<slug>` art scene (content/projects/<slug>.json), or a stub. @param {string} slug */
function projectFor(slug) {
  if (!projectCache.has(slug)) {
    const f = new URL(`projects/${slug}.json`, CONTENT);
    let p = { slug };
    try { if (existsSync(f)) p = JSON.parse(readFileSync(f, 'utf8')); } catch { /* stub */ }
    projectCache.set(slug, p);
  }
  return projectCache.get(slug);
}

/**
 * The art for a slot with `art: { scene }` (no photo in this build).
 * @param {any} slot @param {string} aspect @param {{ eager?: boolean, chip?: boolean }} o
 */
export function slotArt(slot, aspect, o) {
  const scene = String(slot.art.scene || slot.id);
  const label = slot.art.label || undefined;
  const chip = o.chip !== false;
  if (scene.startsWith('project:')) return projectArt(projectFor(scene.slice(8)), { aspect, label, chip });
  return livingScene(scene, { variant: o.eager ? 'hero' : 'card', aspect, label, chip });
}

/**
 * @param {string} id slot id
 * @param {{ sizes?: string, eager?: boolean, className?: string, sample?: boolean, credit?: boolean, alt?: string, aspect?: string, chip?: boolean }} [o]
 */
export function picture(id, o = {}) {
  const slot = slots.get(id);
  const aspect = o.aspect || slot?.aspect || '3:2';
  const [rw, rh] = ratio(aspect);
  const style = raw(`aspect-ratio:${rw}/${rh}`);
  const load = o.eager ? raw('fetchpriority="high"') : raw('loading="lazy" decoding="async"');
  const cls = o.className || '';

  // 1. RNC's own photo: <picture> AVIF → WebP → JPEG, sized and stripped by tools/process-images.mjs.
  const ph = photos.get(id);
  if (ph) {
    const widths = (ph.widths || PHOTO_WIDTHS).filter((/** @type {number} */ w) => w <= ph.width);
    const set = (/** @type {string} */ ext) => widths.map((/** @type {number} */ w) => `/img/${id}-${w}.${ext} ${w}w`).join(', ');
    const top = widths[widths.length - 1];
    const fallbackW = widths.filter((/** @type {number} */ w) => w <= 1024).pop() || top;
    const h = Math.round((ph.height * top) / ph.width);
    const sizes = o.sizes || '100vw';
    return html`<figure class="media ${cls}" style="${style}" data-slot="${id}"><picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="/img/${id}-${fallbackW}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${top}" height="${h}" alt="${o.alt ?? slot?.alt ?? ''}" ${load}></picture></figure>`;
  }

  // 2. Stock placeholder (online showcase builds; labelled, credited).
  if (isStock(id)) {
    const st = slot.stock;
    const W = 1600, H = Math.round((1600 * rh) / rw);
    const srcset = site.imageWidths.map((w) => `${sized(st.imageUrl, w)} ${w}w`).join(', ');
    const sampleTag = o.sample ? html`<span class="media__chip media__chip--sample">Sample image</span>` : '';
    const credit = o.credit !== false && st.photographer
      ? html`<figcaption class="media__credit">Photo: ${st.photographerUrl ? html`<a href="${st.photographerUrl}" rel="noopener">${st.photographer}</a>` : st.photographer} / ${st.provider || 'Stock'}</figcaption>`
      : '';
    return html`<figure class="media ${cls}" style="${style}" data-slot="${id}"><img src="${sized(st.imageUrl, 1200)}" srcset="${srcset}" sizes="${o.sizes || '100vw'}" width="${W}" height="${H}" alt="${o.alt ?? slot.alt ?? ''}" ${load}>${sampleTag}${credit}</figure>`;
  }

  // 3. Living art for a slot that has it (labelled "Illustration" inside the scene).
  if (slot?.art) {
    return html`<figure class="media media--art media--scene ${cls}" style="${style}" data-slot="${id}">${slotArt(slot, `${rw}:${rh}`, o)}</figure>`;
  }

  // 4. Labelled standalone illustration file for every other slot (unknown ids included).
  artNeeded.set(id, `${rw}:${rh}`);
  const W = 1600, H = Math.round((1600 * rh) / rw);
  const label = slot?.rncToSupply ? 'Photo to come' : 'Illustration';
  const fileLoad = o.eager ? raw('fetchpriority="high"') : raw('loading="lazy"');
  return html`<figure class="media media--art ${cls}" style="${style}" data-slot="${id}"><img src="/assets/art/${id}.svg" width="${W}" height="${H}" alt="" ${fileLoad} decoding="async">${o.chip === false ? '' : html`<span class="media__chip" aria-hidden="true">${label}</span>`}</figure>`;
}
