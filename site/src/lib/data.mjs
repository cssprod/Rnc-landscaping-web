// @ts-check
/**
 * Data loaders. Each collection is read from the real shared folders
 * (../content, ../brand, ../media) when they contain files; otherwise the
 * matching fixture in site/fixtures/ is used and the fallback is recorded so a
 * production build can refuse to publish fixture content.
 * (Astro port: these become content collections in src/content/config.ts.)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SITE = resolve(new URL('../..', import.meta.url).pathname);
export const ROOT = resolve(SITE, '..');
export const paths = {
  site: SITE,
  content: join(ROOT, 'content'),
  brand: join(ROOT, 'brand'),
  media: join(ROOT, 'media'),
  fixtures: join(SITE, 'fixtures'),
};

/** @type {string[]} */
export const fallbacks = [];

/** @param {string} file */
const readJson = (file) => {
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { throw new Error(`Invalid JSON in ${file}: ${/** @type {Error} */ (e).message}`); }
};

/** @param {string} dir */
const jsonFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []);

/**
 * Load a folder collection. Real files win per slug; fixture files fill gaps.
 * @param {string} name e.g. "services"
 * @returns {Record<string, any>}
 */
function collection(name) {
  const realDir = join(paths.content, name);
  const fixDir = join(paths.fixtures, 'content', name);
  const real = jsonFiles(realDir);
  const useFixture = real.length === 0;
  const dir = useFixture ? fixDir : realDir;
  /** @type {Record<string, any>} */
  const items = {};
  for (const f of useFixture ? jsonFiles(fixDir) : real) {
    const d = readJson(join(dir, f));
    items[d.slug || f.replace(/\.json$/, '')] = d;
  }
  if (useFixture) fallbacks.push(`content/${name}/ (fixtures)`);
  return items;
}

/** @param {string} rel path relative to the brand/media folder root */
export function sharedFile(kind, rel) {
  const real = join(kind === 'brand' ? paths.brand : paths.media, rel);
  if (existsSync(real)) return real;
  const fix = join(paths.fixtures, kind, rel);
  if (existsSync(fix)) { fallbacks.push(`${kind}/${rel}`); return fix; }
  return null;
}

export function loadAll() {
  fallbacks.length = 0;
  const services = collection('services');
  const projects = collection('projects');
  const testimonials = collection('testimonials');
  const areas = collection('areas');
  const resources = collection('resources');
  const pages = collection('pages');
  const imagesFile = sharedFile('media', 'images.json');
  /** @type {any[]} */
  const images = imagesFile ? readJson(imagesFile) : [];
  const tokensJsonFile = sharedFile('brand', 'tokens.json');
  const tokensJson = tokensJsonFile ? readJson(tokensJsonFile) : {};
  return { services, projects, testimonials, areas, resources, pages, images, tokensJson, fallbacks: [...fallbacks] };
}
