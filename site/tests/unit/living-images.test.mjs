// @ts-check
/**
 * P4 #17 (traceability check unit/living-images.test#pipeline): the AVIF/WebP pipeline, EXIF stripping, licence
 * records and no stock under /projects/. Owner: living.
 * The conversion half needs sharp (a scratch install, never a repo dependency): set RNC_SHARP_DIR to the folder whose
 * node_modules holds it, or install it where tools/process-images.mjs looks (/tmp/rnc-devtools). Without sharp that
 * half is skipped with a message; every other assertion still runs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, existsSync, cpSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseArgs, processAll, checkAll, loadSharp, widthsFor, WIDTHS } from '../../tools/process-images.mjs';
import { initImages, picture, hasPhoto, isStock } from '../../src/lib/images.mjs';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT = join(SITE, '..');
const FIXTURE = join(SITE, 'fixtures/media/photos');
const images = JSON.parse(readFileSync(join(ROOT, 'media/images.json'), 'utf8'));
const projects = readdirSync(join(ROOT, 'content/projects')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(ROOT, 'content/projects', f), 'utf8')));
const sharp = loadSharp(process.env.RNC_SHARP_DIR || '');
const s = (/** @type {any} */ x) => String(x);

test('P4#17 pipeline: AVIF/WebP/JPEG at 480–1600, metadata stripped, licence recorded #pipeline', { skip: sharp ? false : 'sharp not installed (set RNC_SHARP_DIR); conversion half skipped' }, async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'rnc-img-'));
  try {
    const o = parseArgs([`--src=${FIXTURE}`, `--out=${join(tmp, 'img')}`, `--manifest=${join(tmp, 'photos.json')}`, `--images=${join(ROOT, 'media/images.json')}`]);
    // The fixture really carries EXIF and GPS, so stripping is meaningful.
    const srcMeta = await sharp(join(FIXTURE, 'fixture-hero.jpg')).metadata();
    assert.ok(srcMeta.exif && srcMeta.exif.length > 100, 'fixture has EXIF');
    assert.equal(srcMeta.width, 1800);
    const { manifest, errors } = await processAll(o, sharp);
    assert.deepEqual(errors, []);
    const p = manifest.photos.find((x) => x.slot === 'fixture-hero');
    assert.ok(p, 'manifest lists the photo');
    assert.deepEqual(p.widths, WIDTHS, '480/768/1024/1600, never wider than 1600');
    assert.deepEqual(p.formats, ['avif', 'webp', 'jpg']);
    assert.equal(p.licence.holder, 'Fixture licence holder (test data, not an RNC photo)');
    assert.ok(p.licence.licence);
    for (const w of p.widths) {
      for (const f of p.formats) {
        const file = join(tmp, 'img', `fixture-hero-${w}.${f}`);
        assert.ok(existsSync(file), file);
        const m = await sharp(file).metadata();
        assert.equal(m.width, w, `${f} at ${w}`);
        assert.equal(m.format, f === 'jpg' ? 'jpeg' : f === 'avif' ? 'heif' : f);
        assert.equal(m.exif, undefined, `${f} at ${w}: EXIF stripped`);
        assert.equal(m.xmp, undefined, `${f} at ${w}: XMP stripped`);
        assert.equal(m.iptc, undefined, `${f} at ${w}: IPTC stripped`);
        const bytes = readFileSync(file);
        assert.ok(!bytes.includes('Fixture photographer') && !bytes.includes('FixtureCam'), `${f} at ${w}: no camera or artist text`);
      }
    }
    // Deterministic: a second run writes the same manifest.
    const again = await processAll(o, sharp);
    assert.deepEqual(again.manifest, manifest);
    assert.deepEqual(checkAll(o), [], '--check agrees with the outputs');
    // A photo without a licence record fails the run and writes no manifest.
    const bare = join(tmp, 'bare');
    mkdirSync(bare, { recursive: true });
    cpSync(join(FIXTURE, 'fixture-hero.jpg'), join(bare, 'nolicence.jpg'));
    const r = await processAll(parseArgs([`--src=${bare}`, `--out=${join(tmp, 'img2')}`, `--manifest=${join(tmp, 'm2.json')}`]), sharp);
    assert.match(r.errors.join('\n'), /nolicence: missing licence record/);
    assert.ok(!existsSync(join(tmp, 'm2.json')));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('process-images: never upscales, and --check flags missing outputs and changed sources #pipeline', () => {
  assert.deepEqual(widthsFor(2400), [480, 768, 1024, 1600]);
  assert.deepEqual(widthsFor(900), [480, 768]);
  assert.deepEqual(widthsFor(300), [300]);
  const tmp = mkdtempSync(join(tmpdir(), 'rnc-chk-'));
  try {
    writeFileSync(join(tmp, 'photos.json'), JSON.stringify({ photos: [{ slot: 'fixture-hero', sha256: 'x', widths: [480], formats: ['avif', 'webp', 'jpg'], licence: { holder: 'h', licence: 'l' } }] }));
    const errs = checkAll(parseArgs([`--src=${FIXTURE}`, `--out=${join(tmp, 'img')}`, `--manifest=${join(tmp, 'photos.json')}`]));
    assert.ok(errs.some((e) => /source changed/.test(e)));
    assert.ok(errs.some((e) => /missing output fixture-hero-480\.avif/.test(e)));
    // The repo manifest matches media/photos (none yet: living art fills every slot).
    const r = spawnSync(process.execPath, ['tools/process-images.mjs', '--check'], { cwd: SITE, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('picture(): a processed photo renders <picture> with AVIF and WebP sources, srcset, dimensions, alt and loading #pipeline', () => {
  const photo = { slot: 'home-commercial', width: 1800, height: 1200, widths: [480, 768, 1024, 1600], formats: ['avif', 'webp', 'jpg'], licence: { holder: 'h', licence: 'l' } };
  initImages(images, { offline: false, photos: [photo] });
  const lazy = s(picture('home-commercial', { sizes: '50vw' }));
  assert.match(lazy, /<picture><source type="image\/avif" srcset="\/img\/home-commercial-480\.avif 480w, \/img\/home-commercial-768\.avif 768w, \/img\/home-commercial-1024\.avif 1024w, \/img\/home-commercial-1600\.avif 1600w" sizes="50vw">/);
  assert.match(lazy, /<source type="image\/webp" srcset="[^"]*-1600\.webp 1600w"/);
  assert.match(lazy, /<img src="\/img\/home-commercial-1024\.jpg" srcset="[^"]*-1600\.jpg 1600w" sizes="50vw" width="1600" height="1067" alt="[^"]+" loading="lazy" decoding="async">/);
  assert.ok(!lazy.includes('unsplash'), 'RNC\'s own photo wins over stock');
  assert.ok(hasPhoto('home-commercial') && !isStock('home-commercial'));
  const hero = s(picture('home-commercial', { eager: true }));
  assert.match(hero, /fetchpriority="high"/);
  assert.ok(!/loading="lazy"/.test(hero), 'the hero is never lazy');
  const slot = images.find((/** @type {any} */ x) => x.id === 'home-commercial');
  assert.ok(lazy.includes(`alt="${slot.alt}"`), 'alt comes from media/images.json');
  initImages(images, { offline: true, photos: [] });
});

test('no stock under /projects/: every project and portfolio slot has stock null and renders living art, online too #pipeline', () => {
  const byId = new Map(images.map((/** @type {any} */ x) => [x.id, x]));
  initImages(images, { offline: false, photos: [] });
  for (const p of projects) {
    const ids = [p.images?.after, p.images?.before, ...(p.images?.gallery || []), p.images?.art, `proj-${p.slug}-art`].filter(Boolean);
    for (const id of ids) {
      const slot = byId.get(id);
      assert.ok(slot, `${p.slug}: slot ${id} exists`);
      assert.equal(slot.stock, null, `${p.slug}: ${id} has no stock`);
      assert.ok(slot.art?.scene, `${p.slug}: ${id} has living art`);
      const html = s(picture(id, { eager: id === p.images?.after }));
      assert.ok(!/unsplash|pexels|<img/.test(html), `${id} renders no photo`);
      assert.match(html, /class="scene scene--(card|hero)"/);
      assert.match(html, /<span class="media__chip media__chip--art" aria-hidden="true">Illustration<\/span>/);
    }
    // The after slot draws this project's own art (seeded by slug).
    assert.ok(s(picture(p.images.after)).includes(`data-scene="proj-${p.slug}"`), `${p.slug}: per-project art`);
  }
  // Allocated art slots (CONTRACT §6/§7) and the retired crew stock.
  const artSlots = images.filter((/** @type {any} */ x) => /^proj-[a-z0-9-]+-art$/.test(x.id));
  assert.equal(artSlots.length, 16);
  assert.ok(byId.get('process-hero')?.art?.scene);
  for (const id of ['about-crew', 'about-owner']) assert.equal(byId.get(id).stock, null, `${id} never gets stock`);
  // usedOn lists the new URLs only.
  for (const x of images) assert.ok(!/\/portfolio\/|\/quote\//.test(x.usedOn || ''), `${x.id} usedOn uses new URLs`);
  // Unknown slots still render labelled art.
  const unknown = s(picture('no-such-slot'));
  assert.match(unknown, /<img src="\/assets\/art\/no-such-slot\.svg"[^>]*alt=""/);
  assert.match(unknown, /<span class="media__chip" aria-hidden="true">Illustration<\/span>/);
  initImages(images, { offline: true, photos: [] });
});
