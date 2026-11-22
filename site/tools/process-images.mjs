#!/usr/bin/env node
// @ts-check
/**
 * RNC's own photos → responsive images (CONTRACT §7, REDESIGN-PLAN C4 / P4 #17).
 *
 *   node tools/process-images.mjs            process media/photos/<slot>.(jpg|jpeg|png) → static/img + media/photos.json
 *   node tools/process-images.mjs --check    verify the manifest against the sources and outputs (no sharp needed)
 *   options: --src=DIR --out=DIR --manifest=FILE --images=FILE (defaults: ../media/photos, static/img,
 *            ../media/photos.json, ../media/images.json) --sharp=DIR (folder whose node_modules holds sharp)
 *
 * For each source it writes <slot>-<w>.avif / .webp / .jpg at 480, 768, 1024 and 1600 px wide (never wider than the
 * source, never upscaled), auto-rotated from EXIF and then stripped of ALL metadata (EXIF, GPS, XMP, IPTC, ICC: sharp
 * keeps none unless asked). Every photo needs a licence record beside it, <slot>.licence.json:
 *   { "holder": "who owns the photo", "licence": "terms of use", "source": "optional", "releases": "optional" }
 * A photo without one fails the run: the manifest is the licence register (honesty rule, CONTRACT §2).
 *
 * sharp is a dev-time tool installed in scratch, never a repo dependency: npm install sharp --prefix "$SCRATCH/sharp",
 * then pass --sharp="$SCRATCH/sharp" (or set RNC_SHARP_DIR). The output is deterministic for a given sharp version.
 * Not a check-* tool: Netlify never runs it, and the built site only reads its outputs.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { join, resolve, relative, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WIDTHS = [480, 768, 1024, 1600];
export const FORMATS = /** @type {const} */ (['avif', 'webp', 'jpg']);
/** The manifest header. */
export const MANIFEST_COMMENT = "Written by site/tools/process-images.mjs: RNC's own photos (media/photos/<slot>.jpg + <slot>.licence.json) processed to site/static/img/<slot>-<w>.(avif|webp|jpg), all metadata stripped. picture() in lib/images.mjs reads this. Do not hand-edit.";
/** Hero raster budget (CONTRACT §16): the largest AVIF of a hero slot. */
export const HERO_AVIF_MAX = 120 * 1024;

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = resolve(HERE, '..');
const ROOT = resolve(SITE, '..');

/** @param {string[]} argv */
export function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */ const a = {};
  for (const arg of argv) { const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg); if (m) a[m[1]] = m[2] ?? true; }
  return {
    src: resolve(String(a.src || join(ROOT, 'media/photos'))),
    out: resolve(String(a.out || join(SITE, 'static/img'))),
    manifest: resolve(String(a.manifest || join(ROOT, 'media/photos.json'))),
    images: resolve(String(a.images || join(ROOT, 'media/images.json'))),
    sharp: a.sharp ? String(a.sharp) : process.env.RNC_SHARP_DIR || '',
    check: !!a.check,
  };
}

/** Find sharp outside the repo: --sharp / RNC_SHARP_DIR, the dev-setup devtools folder, then normal resolution. @param {string} dir */
export function loadSharp(dir) {
  const tries = [dir, '/tmp/rnc-devtools', SITE].filter(Boolean);
  for (const d of tries) {
    try { return createRequire(join(resolve(d), 'noop.js'))('sharp'); } catch { /* next */ }
  }
  return null;
}

/** @param {string} f */
const sha256 = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

/** Widths to emit for a source `width` px wide. @param {number} width */
export const widthsFor = (width) => { const w = WIDTHS.filter((x) => x <= width); return w.length ? w : [width]; };

/** Source photos in `src`: { slot, file, licenceFile }. @param {string} src */
export function sources(src) {
  if (!existsSync(src)) return [];
  return readdirSync(src).filter((f) => /\.(jpe?g|png)$/i.test(f) && statSync(join(src, f)).isFile()).sort()
    .map((f) => { const slot = basename(f, extname(f)); return { slot, file: join(src, f), licenceFile: join(src, `${slot}.licence.json`) }; });
}

/** @param {string} file */
function readLicence(file) {
  if (!existsSync(file)) return { error: `missing licence record ${basename(file)}` };
  let l;
  try { l = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { return { error: `${basename(file)} is not JSON: ${/** @type {Error} */ (e).message}` }; }
  if (!l || typeof l.holder !== 'string' || !l.holder.trim() || typeof l.licence !== 'string' || !l.licence.trim()) return { error: `${basename(file)} needs "holder" and "licence"` };
  return { licence: { holder: l.holder, licence: l.licence, ...(l.source ? { source: String(l.source) } : {}), ...(l.releases ? { releases: String(l.releases) } : {}) } };
}

/**
 * Process every source. Returns { manifest, errors, warnings }; writes outputs and the manifest unless errors.
 * @param {ReturnType<typeof parseArgs>} o @param {any} sharp
 */
export async function processAll(o, sharp) {
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];
  const slotList = existsSync(o.images) ? JSON.parse(readFileSync(o.images, 'utf8')) : [];
  const slots = new Map(slotList.map((/** @type {any} */ s) => [s.id, s]));
  const list = sources(o.src);
  /** @type {any[]} */ const photos = [];
  for (const s of list) {
    const lic = readLicence(s.licenceFile);
    if (lic.error) { errors.push(`${s.slot}: ${lic.error}`); continue; }
    if (!slots.has(s.slot)) warnings.push(`${s.slot}: no slot with this id in media/images.json (the photo is processed but no page shows it)`);
    // Auto-rotate from EXIF, then every output is written without metadata (sharp's default) in sRGB.
    const base = sharp(s.file, { failOn: 'error' }).rotate();
    const { data: probe, info } = await base.clone().toBuffer({ resolveWithObject: true });
    void probe;
    const widths = widthsFor(info.width);
    mkdirSync(o.out, { recursive: true });
    /** @type {Record<string, Record<string, number>>} */ const bytes = { avif: {}, webp: {}, jpg: {} };
    for (const w of widths) {
      const resized = base.clone().resize({ width: w, withoutEnlargement: true }).toColourspace('srgb');
      const outs = {
        avif: await resized.clone().avif({ quality: 50, effort: 4 }).toBuffer(),
        webp: await resized.clone().webp({ quality: 72, effort: 4 }).toBuffer(),
        jpg: await resized.clone().jpeg({ quality: 78, mozjpeg: true, progressive: true }).toBuffer(),
      };
      for (const f of FORMATS) { writeFileSync(join(o.out, `${s.slot}-${w}.${f}`), outs[f]); bytes[f][w] = outs[f].length; }
    }
    const top = widths[widths.length - 1];
    const slot = slots.get(s.slot);
    if (slot && /hero/.test(s.slot) && bytes.avif[top] > HERO_AVIF_MAX) warnings.push(`${s.slot}: hero AVIF at ${top}px is ${Math.round(bytes.avif[top] / 1024)} KB (> 120 KB budget)`);
    if (slot && !slot.alt) warnings.push(`${s.slot}: write hand-made alt text in media/images.json (alt="" only when decorative)`);
    photos.push({ slot: s.slot, source: relative(ROOT, s.file).split('\\').join('/'), sha256: sha256(s.file), width: info.width, height: info.height, widths, formats: [...FORMATS], bytes, licence: lic.licence });
  }
  const manifest = {
    $comment: MANIFEST_COMMENT,
    widths: WIDTHS,
    photos,
  };
  if (!errors.length) writeFileSync(o.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, errors, warnings };
}

/** Verify the manifest against sources and outputs (no sharp). @param {ReturnType<typeof parseArgs>} o */
export function checkAll(o) {
  /** @type {string[]} */ const errors = [];
  const m = existsSync(o.manifest) ? JSON.parse(readFileSync(o.manifest, 'utf8')) : { photos: [] };
  const listed = new Map((m.photos || []).map((/** @type {any} */ p) => [p.slot, p]));
  for (const s of sources(o.src)) {
    const p = listed.get(s.slot);
    if (!p) { errors.push(`${s.slot}: source not processed (run tools/process-images.mjs)`); continue; }
    if (p.sha256 !== sha256(s.file)) errors.push(`${s.slot}: source changed since processing`);
    if (!p.licence?.holder || !p.licence?.licence) errors.push(`${s.slot}: licence record missing in the manifest`);
    for (const w of p.widths || []) for (const f of FORMATS) if (!existsSync(join(o.out, `${s.slot}-${w}.${f}`))) errors.push(`${s.slot}: missing output ${s.slot}-${w}.${f}`);
    if (Math.max(...(p.widths || [0])) > 1600) errors.push(`${s.slot}: output wider than 1600px`);
    listed.delete(s.slot);
  }
  for (const slot of listed.keys()) errors.push(`${slot}: listed in the manifest but media/photos/${slot}.* is gone`);
  return errors;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.check) {
    const errors = checkAll(o);
    for (const e of errors) console.error(`process-images: ${e}`);
    console.log(`process-images --check: ${errors.length ? `${errors.length} problem(s)` : 'manifest matches sources and outputs'}`);
    process.exit(errors.length ? 1 : 0);
  }
  const list = sources(o.src);
  if (!list.length) {
    if (!existsSync(o.manifest)) writeFileSync(o.manifest, `${JSON.stringify({ $comment: MANIFEST_COMMENT, widths: WIDTHS, photos: [] }, null, 2)}\n`);
    console.log(`process-images: no photos in ${relative(process.cwd(), o.src) || '.'} yet (living art fills every slot)`);
    return;
  }
  const sharp = loadSharp(o.sharp);
  if (!sharp) { console.error('process-images: sharp not found. Install it in scratch (npm install sharp --prefix "$SCRATCH/sharp") and pass --sharp="$SCRATCH/sharp".'); process.exit(2); }
  const { manifest, errors, warnings } = await processAll(o, sharp);
  for (const w of warnings) console.warn(`process-images: warning: ${w}`);
  for (const e of errors) console.error(`process-images: ${e}`);
  if (errors.length) process.exit(1);
  console.log(`process-images: ${manifest.photos.length} photo(s) → ${relative(process.cwd(), o.out)} (${WIDTHS.join('/')} × ${FORMATS.join('/')}), manifest ${relative(process.cwd(), o.manifest)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
